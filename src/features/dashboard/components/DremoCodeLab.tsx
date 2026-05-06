import React, { useEffect, useMemo, useState } from 'react';
import {
  cancelDremoTask,
  createDremoTask,
  finalizeDremoStubReport,
  getDremoArtifacts,
  getDremoTask,
  getDremoTaskSummary,
  getDremoTaskEvents,
  listDremoTasks,
  requestDremoTool,
  resolveDremoApproval,
  runDremoStubRepoScan,
  startDremoStubSandbox,
  stopDremoStubSandbox,
} from '../lib/dremoApi';
import { DremoPolicyValidationSmoke } from './DremoPolicyValidationSmoke';
import type {
  DremoApproval,
  DremoApprovalDecision,
  DremoArtifact,
  DremoFinalReportStub,
  DremoRepoScanSummary,
  DremoRiskLevel,
  DremoSandboxSession,
  DremoTask,
  DremoTaskEvent,
  DremoTaskSummary,
} from '../types';

function formatDate(value: string) {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

function compactPayloadPreview(payload: Record<string, unknown>) {
  const text = JSON.stringify(payload, null, 2);

  if (text.length <= 420) {
    return text;
  }

  return `${text.slice(0, 420)}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sortEvents(events: DremoTaskEvent[]) {
  return [...events].sort((left, right) => left.sequence - right.sequence);
}

function mergeEvents(
  currentEvents: DremoTaskEvent[],
  incomingEvents: DremoTaskEvent[],
) {
  const byId = new Map(currentEvents.map((event) => [event.id, event]));

  for (const event of incomingEvents) {
    byId.set(event.id, event);
  }

  return sortEvents([...byId.values()]);
}

function mergeApproval(
  currentApprovals: DremoApproval[],
  incomingApproval: DremoApproval,
) {
  const byId = new Map(
    currentApprovals.map((approval) => [approval.id, approval]),
  );
  byId.set(incomingApproval.id, incomingApproval);

  return [...byId.values()].sort((left, right) =>
    right.requestedAt.localeCompare(left.requestedAt),
  );
}

function parseToolInputJson(value: string) {
  if (!value.trim()) {
    return {};
  }

  const parsed = JSON.parse(value) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Tool input must be a JSON object.');
  }

  return parsed as Record<string, unknown>;
}

function reportFromArtifact(
  artifact: DremoArtifact | undefined,
): DremoFinalReportStub | null {
  if (!artifact || !isRecord(artifact.metadata.report)) {
    return null;
  }

  return artifact.metadata.report as unknown as DremoFinalReportStub;
}

function repoScanSummaryFromEvents(
  events: DremoTaskEvent[],
): DremoRepoScanSummary | null {
  const completedRepoScan = [...events]
    .reverse()
    .find((event) => event.eventType === 'repo_scan_completed');
  const summary = completedRepoScan?.payload.summary;

  if (!isRecord(summary)) {
    return null;
  }

  return summary as unknown as DremoRepoScanSummary;
}

function taskToSummary(task: DremoTask): DremoTaskSummary {
  return {
    id: task.id,
    userId: task.userId,
    status: task.status,
    title: task.title,
    repoUrl: task.repoUrl,
    repoBranch: task.repoBranch,
    creditState: task.creditState,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    completedAt: task.completedAt,
    cancelledAt: task.cancelledAt,
    failureReason: task.failureReason,
  };
}

function mergeTaskHistory(
  currentTasks: DremoTaskSummary[],
  incomingTasks: DremoTaskSummary[],
) {
  const byId = new Map(currentTasks.map((historyTask) => [historyTask.id, historyTask]));

  for (const historyTask of incomingTasks) {
    byId.set(historyTask.id, historyTask);
  }

  return [...byId.values()].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function updateActiveTaskUrl(taskId: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);

  if (taskId) {
    url.searchParams.set('taskId', taskId);
  } else {
    url.searchParams.delete('taskId');
  }

  window.history.replaceState(null, '', url);
}

function getInitialTaskIdFromUrl() {
  if (typeof window === 'undefined') {
    return null;
  }

  return new URL(window.location.href).searchParams.get('taskId');
}

export const DremoCodeLab: React.FC = () => {
  const [title, setTitle] = useState('Stub task');
  const [prompt, setPrompt] = useState('Create a server-owned Dremo stub task.');
  const [task, setTask] = useState<DremoTask | null>(null);
  const [sandboxSession, setSandboxSession] =
    useState<DremoSandboxSession | null>(null);
  const [approvals, setApprovals] = useState<DremoApproval[]>([]);
  const [repoScanSummary, setRepoScanSummary] =
    useState<DremoRepoScanSummary | null>(null);
  const [artifacts, setArtifacts] = useState<DremoArtifact[]>([]);
  const [finalReport, setFinalReport] = useState<DremoFinalReportStub | null>(
    null,
  );
  const [finalReportArtifact, setFinalReportArtifact] =
    useState<DremoArtifact | null>(null);
  const [toolName, setToolName] = useState('repo_scan');
  const [riskLevel, setRiskLevel] = useState<DremoRiskLevel>('low');
  const [toolReason, setToolReason] = useState(
    'Validate the Dremo tool permission contract in stub mode.',
  );
  const [toolInput, setToolInput] = useState('{\n  "scope": "metadata_only"\n}');
  const [toolResultMessage, setToolResultMessage] = useState<string | null>(
    null,
  );
  const [events, setEvents] = useState<DremoTaskEvent[]>([]);
  const [taskHistory, setTaskHistory] = useState<DremoTaskSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRestoringTask, setIsRestoringTask] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isStartingSandbox, setIsStartingSandbox] = useState(false);
  const [isStoppingSandbox, setIsStoppingSandbox] = useState(false);
  const [isRunningRepoScan, setIsRunningRepoScan] = useState(false);
  const [isFinalizingReport, setIsFinalizingReport] = useState(false);
  const [isRefreshingArtifacts, setIsRefreshingArtifacts] = useState(false);
  const [isRequestingTool, setIsRequestingTool] = useState(false);
  const [resolvingApprovalId, setResolvingApprovalId] = useState<string | null>(
    null,
  );

  const latestSequence = useMemo(
    () => events.reduce((max, event) => Math.max(max, event.sequence), 0),
    [events],
  );
  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const isBusy =
    isCreating ||
    isRestoringTask ||
    isRefreshing ||
    isCancelling ||
    isStartingSandbox ||
    isStoppingSandbox ||
    isRunningRepoScan ||
    isFinalizingReport ||
    isRefreshingArtifacts ||
    isRequestingTool ||
    Boolean(resolvingApprovalId);
  const canStartSandbox =
    Boolean(task) &&
    task?.status !== 'cancelled' &&
    task?.status !== 'completed' &&
    task?.status !== 'failed' &&
    sandboxSession?.status !== 'ready' &&
    sandboxSession?.status !== 'running' &&
    sandboxSession?.status !== 'starting' &&
    sandboxSession?.status !== 'requested' &&
    sandboxSession?.status !== 'creating';
  const canStopSandbox =
    Boolean(task && sandboxSession) &&
    sandboxSession?.status !== 'stopped' &&
    sandboxSession?.status !== 'failed' &&
    sandboxSession?.status !== 'destroyed' &&
    sandboxSession?.status !== 'quarantined';

  useEffect(() => {
    void initializeDremoLab();
  }, []);

  async function initializeDremoLab() {
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const historyResult = await listDremoTasks({ limit: 20 });
      const initialTaskId = getInitialTaskIdFromUrl();

      setTaskHistory(historyResult.tasks);

      if (initialTaskId) {
        await restoreTask(initialTaskId, { updateUrl: false });
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load Dremo task history.',
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleRefreshHistory() {
    setIsLoadingHistory(true);
    setErrorMessage(null);

    try {
      const result = await listDremoTasks({ limit: 20 });
      setTaskHistory(result.tasks);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh Dremo task history.',
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function restoreTask(
    taskId: string,
    options: { updateUrl?: boolean } = {},
  ) {
    setIsRestoringTask(true);
    setErrorMessage(null);

    try {
      const [summaryResult, eventResult, artifactResult] = await Promise.all([
        getDremoTaskSummary(taskId),
        getDremoTaskEvents(taskId),
        getDremoArtifacts(taskId),
      ]);
      const restoredEvents = sortEvents(
        eventResult.events.length > 0
          ? eventResult.events
          : summaryResult.recentEvents,
      );
      const latestFinalReportArtifact =
        artifactResult.artifacts.find(
          (artifact) => artifact.artifactType === 'final_report',
        ) ??
        summaryResult.latestFinalReportArtifact ??
        null;

      setTask(summaryResult.task);
      setTitle(summaryResult.task.title ?? 'Stub task');
      setPrompt(summaryResult.task.prompt);
      setSandboxSession(summaryResult.sandboxSession);
      setApprovals(summaryResult.approvals);
      setRepoScanSummary(repoScanSummaryFromEvents(restoredEvents));
      setArtifacts(artifactResult.artifacts);
      setFinalReportArtifact(latestFinalReportArtifact);
      setFinalReport(reportFromArtifact(latestFinalReportArtifact ?? undefined));
      setToolResultMessage(null);
      setEvents(restoredEvents);
      setTaskHistory((currentTasks) =>
        mergeTaskHistory(currentTasks, [taskToSummary(summaryResult.task)]),
      );

      if (options.updateUrl !== false) {
        updateActiveTaskUrl(taskId);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to restore the selected Dremo task.',
      );
    } finally {
      setIsRestoringTask(false);
    }
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!prompt.trim()) {
      setErrorMessage('Prompt is required before creating a Dremo stub task.');
      return;
    }

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const result = await createDremoTask({
        title: title.trim() || undefined,
        prompt: prompt.trim(),
        repoBranch: 'main',
      });

      setTask(result.task);
      setSandboxSession(null);
      setApprovals([]);
      setRepoScanSummary(null);
      setArtifacts([]);
      setFinalReport(null);
      setFinalReportArtifact(null);
      setToolResultMessage(null);
      setEvents(sortEvents(result.events));
      setTaskHistory((currentTasks) =>
        mergeTaskHistory(currentTasks, [taskToSummary(result.task)]),
      );
      updateActiveTaskUrl(result.task.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create the Dremo stub task.',
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRefreshEvents() {
    if (!task) {
      return;
    }

    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const [taskResult, eventResult] = await Promise.all([
        getDremoTask(task.id),
        getDremoTaskEvents(task.id, latestSequence),
      ]);

      setTask(taskResult.task);
      setTaskHistory((currentTasks) =>
        mergeTaskHistory(currentTasks, [taskToSummary(taskResult.task)]),
      );
      setEvents((currentEvents) =>
        mergeEvents(currentEvents, eventResult.events),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh Dremo events.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCancelTask() {
    if (!task) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);

    try {
      const result = await cancelDremoTask(task.id);

      setTask(result.task);
      setTaskHistory((currentTasks) =>
        mergeTaskHistory(currentTasks, [taskToSummary(result.task)]),
      );
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to cancel the Dremo stub task.',
      );
    } finally {
      setIsCancelling(false);
    }
  }

  async function handleStartSandbox() {
    if (!task) {
      return;
    }

    setIsStartingSandbox(true);
    setErrorMessage(null);

    try {
      const result = await startDremoStubSandbox(task.id);

      setSandboxSession(result.sandboxSession);
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to start the Dremo stub sandbox lifecycle.',
      );
    } finally {
      setIsStartingSandbox(false);
    }
  }

  async function handleStopSandbox() {
    if (!task) {
      return;
    }

    setIsStoppingSandbox(true);
    setErrorMessage(null);

    try {
      const result = await stopDremoStubSandbox(task.id);

      setSandboxSession(result.sandboxSession);
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to stop the Dremo stub sandbox lifecycle.',
      );
    } finally {
      setIsStoppingSandbox(false);
    }
  }

  async function handleRunRepoScan() {
    if (!task) {
      return;
    }

    setIsRunningRepoScan(true);
    setErrorMessage(null);

    try {
      const result = await runDremoStubRepoScan(task.id, {
        repoBranch: task.repoBranch ?? 'main',
        ...(task.repoUrl ? { repoUrl: task.repoUrl } : {}),
      });

      setRepoScanSummary(result.summary);
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to run the Dremo repo scan stub.',
      );
    } finally {
      setIsRunningRepoScan(false);
    }
  }

  async function handleFinalizeReport() {
    if (!task) {
      return;
    }

    setIsFinalizingReport(true);
    setErrorMessage(null);

    try {
      const result = await finalizeDremoStubReport(task.id);

      setFinalReport(result.report);
      setFinalReportArtifact(result.artifact);
      setArtifacts((currentArtifacts) => {
        const byId = new Map(
          currentArtifacts.map((artifact) => [artifact.id, artifact]),
        );
        byId.set(result.artifact.id, result.artifact);
        return [...byId.values()].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        );
      });
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to finalize the Dremo report stub.',
      );
    } finally {
      setIsFinalizingReport(false);
    }
  }

  async function handleRefreshArtifacts() {
    if (!task) {
      return;
    }

    setIsRefreshingArtifacts(true);
    setErrorMessage(null);

    try {
      const result = await getDremoArtifacts(task.id);
      const latestFinalReportArtifact = result.artifacts.find(
        (artifact) => artifact.artifactType === 'final_report',
      );

      setArtifacts(result.artifacts);
      setFinalReportArtifact(latestFinalReportArtifact ?? null);
      setFinalReport(reportFromArtifact(latestFinalReportArtifact));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to refresh Dremo artifacts.',
      );
    } finally {
      setIsRefreshingArtifacts(false);
    }
  }

  async function submitToolRequest(input: {
    toolName: string;
    riskLevel: DremoRiskLevel;
    reason: string;
    toolInput: Record<string, unknown>;
  }) {
    if (!task) {
      setErrorMessage('Create a Dremo task before requesting a tool stub.');
      return;
    }

    setIsRequestingTool(true);
    setErrorMessage(null);
    setToolResultMessage(null);

    try {
      const result = await requestDremoTool(task.id, {
        toolName: input.toolName,
        riskLevel: input.riskLevel,
        reason: input.reason,
        input: input.toolInput,
      });

      const approval = result.approval;

      if (approval) {
        setApprovals((currentApprovals) =>
          mergeApproval(currentApprovals, approval),
        );
        setToolResultMessage(
          `Approval required for ${approval.approvalType}. No tool execution happened.`,
        );
      } else if (result.toolResult) {
        setToolResultMessage(
          result.toolResult.output ??
            result.toolResult.reason ??
            'Tool request was handled by the stub.',
        );
      }

      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request the Dremo tool stub.',
      );
    } finally {
      setIsRequestingTool(false);
    }
  }

  async function handleToolRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await submitToolRequest({
        toolName: toolName.trim(),
        riskLevel,
        reason: toolReason.trim(),
        toolInput: parseToolInputJson(toolInput),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Tool input must be valid JSON.',
      );
    }
  }

  async function handleSampleToolRequest(sample: {
    toolName: string;
    riskLevel: DremoRiskLevel;
    reason: string;
    toolInput: Record<string, unknown>;
  }) {
    setToolName(sample.toolName);
    setRiskLevel(sample.riskLevel);
    setToolReason(sample.reason);
    setToolInput(JSON.stringify(sample.toolInput, null, 2));
    await submitToolRequest(sample);
  }

  async function handleResolveApproval(
    approval: DremoApproval,
    decision: DremoApprovalDecision,
  ) {
    if (!task || approval.status !== 'pending') {
      return;
    }

    setResolvingApprovalId(approval.id);
    setErrorMessage(null);
    setToolResultMessage(null);

    try {
      const result = await resolveDremoApproval(task.id, approval.id, {
        decision,
        note:
          decision === 'approved'
            ? 'Approved from Dremo Lab stub. Execution remains disabled.'
            : 'Rejected from Dremo Lab stub. No execution should happen.',
      });

      setApprovals((currentApprovals) =>
        mergeApproval(currentApprovals, result.approval),
      );
      setToolResultMessage(result.message);
      setEvents((currentEvents) => mergeEvents(currentEvents, result.events));
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to resolve the Dremo approval.',
      );
    } finally {
      setResolvingApprovalId(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-sky-100 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-primary">
              Internal Stub API Test
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Dremo Code Lab
            </h1>
            <p className="text-sm leading-7 text-slate-600 sm:text-base">
              This lab calls the server-owned Dremo API and renders returned
              task events. It is not real sandbox execution, does not call
              models, and does not replace Code Architect AI.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            Browser writes go only through{' '}
            <span className="font-black">dremo-api</span>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Task History
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Restore server-owned stub tasks
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Recent tasks load through <span className="font-bold">dremo-api</span>.
              Selecting a task restores its owned events, artifacts, latest
              report, approvals, and sandbox status without reading Dremo
              tables directly from the browser.
            </p>
          </div>
          <button
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.16em] text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLoadingHistory || isRestoringTask}
            type="button"
            onClick={() => {
              void handleRefreshHistory();
            }}
          >
            {isLoadingHistory ? 'Loading...' : 'Refresh History'}
          </button>
        </div>

        {task && (
          <div className="mt-4 grid gap-3 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Selected Task
              </p>
              <p className="mt-2 break-all font-mono text-xs text-slate-700">
                {task.id}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Status
              </p>
              <p className="mt-2 font-black uppercase tracking-widest text-slate-900">
                {task.status}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Created
              </p>
              <p className="mt-2 font-semibold text-slate-800">
                {formatDate(task.createdAt)}
              </p>
            </div>
          </div>
        )}

        {taskHistory.length > 0 ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {taskHistory.map((historyTask) => {
              const isSelected = task?.id === historyTask.id;

              return (
                <button
                  className={`min-h-36 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${
                    isSelected
                      ? 'border-primary/40 bg-primary/10 shadow-sm'
                      : 'border-slate-100 bg-slate-50 hover:border-primary/20 hover:bg-white'
                  }`}
                  disabled={isBusy}
                  key={historyTask.id}
                  type="button"
                  onClick={() => {
                    void restoreTask(historyTask.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-950">
                        {historyTask.title ?? 'Untitled Dremo task'}
                      </p>
                      <p className="mt-1 break-all font-mono text-[11px] text-slate-500">
                        {historyTask.id}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">
                      {historyTask.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-xs text-slate-600">
                    <p>
                      Created{' '}
                      <span className="font-semibold">
                        {formatDate(historyTask.createdAt)}
                      </span>
                    </p>
                    <p>
                      Credits{' '}
                      <span className="font-semibold">
                        {historyTask.creditState}
                      </span>
                    </p>
                    <p>
                      Branch{' '}
                      <span className="font-semibold">
                        {historyTask.repoBranch ?? 'Not provided'}
                      </span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {isLoadingHistory
              ? 'Loading Dremo task history...'
              : 'No Dremo tasks yet. Create two stub tasks, refresh the page, and restore either one from this panel.'}
          </p>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form
          className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6"
          onSubmit={(event) => {
            void handleCreateTask(event);
          }}
        >
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Create Stub Task
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Server-owned task creation
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Creates a Dremo task and initial events via Supabase Edge
              Function. No direct database writes happen from this browser.
            </p>
          </div>

          <label className="mt-6 block text-sm font-bold text-slate-700">
            Title
            <input
              className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              maxLength={180}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <label className="mt-4 block text-sm font-bold text-slate-700">
            Prompt
            <textarea
              className="mt-2 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base leading-7 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>

          <button
            className="mt-5 min-h-12 w-full rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={isBusy}
            type="submit"
          >
            {isCreating ? 'Creating...' : 'Create Dremo Stub Task'}
          </button>
        </form>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
                Current Task
              </p>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                {task?.title ?? 'No task created yet'}
              </h2>
            </div>
            {task && (
              <span className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-primary">
                {task.status}
              </span>
            )}
          </div>

          {task ? (
            <div className="mt-5 space-y-4 text-sm text-slate-600">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Task ID
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-700">
                    {task.id}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Credit State
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {task.creditState}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Sandbox Lifecycle
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {sandboxSession
                      ? `${sandboxSession.provider} / ${sandboxSession.status}`
                      : 'not_requested'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Stub only. No shell, filesystem, network, secrets, model
                    calls, or code execution are available in this lifecycle
                    test.
                  </p>
                </div>
              </div>
              <p>
                Created <span className="font-semibold">{formatDate(task.createdAt)}</span>
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="min-h-11 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy}
                  type="button"
                  onClick={() => {
                    void handleRefreshEvents();
                  }}
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Events'}
                </button>
                <button
                  className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isBusy || task.status === 'cancelled'}
                  type="button"
                  onClick={() => {
                    void handleCancelTask();
                  }}
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Stub Task'}
                </button>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    Stub sandbox lifecycle
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Starts/stops a server-owned lifecycle record only. This
                    never runs user code.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="min-h-11 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy || !canStartSandbox}
                    type="button"
                    onClick={() => {
                      void handleStartSandbox();
                    }}
                  >
                    {isStartingSandbox ? 'Starting...' : 'Start Stub Sandbox'}
                  </button>
                  <button
                    className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy || !canStopSandbox}
                    type="button"
                    onClick={() => {
                      void handleStopSandbox();
                    }}
                  >
                    {isStoppingSandbox ? 'Stopping...' : 'Stop Stub Sandbox'}
                  </button>
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Read-only repo scan stub
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Summarizes safe task metadata only. No shell, filesystem,
                      clone, network, model, or billing execution happens.
                    </p>
                  </div>
                  <button
                    className="min-h-11 rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    type="button"
                    onClick={() => {
                      void handleRunRepoScan();
                    }}
                  >
                    {isRunningRepoScan ? 'Scanning...' : 'Run Stub Repo Scan'}
                  </button>
                </div>
                {repoScanSummary && (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-white p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                      Stub scan result
                    </p>
                    <dl className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <dt className="font-black uppercase tracking-widest text-slate-400">
                          Source
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {repoScanSummary.source}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-black uppercase tracking-widest text-slate-400">
                          Branch
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {repoScanSummary.repoBranch ?? 'Not provided'}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-black uppercase tracking-widest text-slate-400">
                          Repo URL
                        </dt>
                        <dd className="mt-1 break-all font-semibold text-slate-800">
                          {repoScanSummary.repoUrl ?? 'Not provided'}
                        </dd>
                      </div>
                    </dl>
                    <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-emerald-50 p-3 text-xs leading-6 text-slate-700">
                      {compactPayloadPreview(
                        repoScanSummary as unknown as Record<string, unknown>,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Create a stub task to verify the Dremo API can write task/events
              from the server and read them back through owner-scoped auth.
            </p>
          )}
        </section>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Tool Approval Stub
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Approval-before-execution contract
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              Request a tool through <span className="font-bold">dremo-api</span>.
              Low-risk requests return a stubbed result. Medium, high, and
              critical requests create an approval card. No command, file,
              network, package install, git operation, or model call is
              executed.
            </p>
          </div>
          <span className="w-fit rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-700">
            No execution
          </span>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
            onSubmit={(event) => {
              void handleToolRequest(event);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Tool name
                <input
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  type="text"
                  value={toolName}
                  onChange={(event) => setToolName(event.target.value)}
                />
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Risk level
                <select
                  className="mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  value={riskLevel}
                  onChange={(event) =>
                    setRiskLevel(event.target.value as DremoRiskLevel)
                  }
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
            </div>

            <label className="block text-sm font-bold text-slate-700">
              Reason
              <textarea
                className="mt-2 min-h-20 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={toolReason}
                onChange={(event) => setToolReason(event.target.value)}
              />
            </label>

            <label className="block text-sm font-bold text-slate-700">
              Input JSON
              <textarea
                className="mt-2 min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-6 text-slate-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                value={toolInput}
                onChange={(event) => setToolInput(event.target.value)}
              />
            </label>

            <button
              className="min-h-12 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              disabled={isBusy || !task}
              type="submit"
            >
              {isRequestingTool ? 'Requesting...' : 'Submit Tool Request'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                className="min-h-11 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy || !task}
                type="button"
                onClick={() => {
                  void handleSampleToolRequest({
                    toolName: 'repo_scan',
                    riskLevel: 'low',
                    reason: 'Stub a safe repo metadata scan.',
                    toolInput: { scope: 'metadata_only' },
                  });
                }}
              >
                Low repo_scan
              </button>
              <button
                className="min-h-11 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy || !task}
                type="button"
                onClick={() => {
                  void handleSampleToolRequest({
                    toolName: 'bash',
                    riskLevel: 'medium',
                    reason: 'Request approval for a future sandbox command.',
                    toolInput: { command: 'npm test', cwd: '/workspace' },
                  });
                }}
              >
                Medium bash
              </button>
              <button
                className="min-h-11 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-red-800 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBusy || !task}
                type="button"
                onClick={() => {
                  void handleSampleToolRequest({
                    toolName: 'package_install',
                    riskLevel: 'high',
                    reason: 'Request approval for a future package install.',
                    toolInput: { manager: 'npm', packageName: 'example' },
                  });
                }}
              >
                High install
              </button>
            </div>

            {toolResultMessage && (
              <p className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm font-semibold leading-6 text-sky-800">
                {toolResultMessage}
              </p>
            )}

            {approvals.length > 0 ? (
              <div className="space-y-3">
                {approvals.map((approval) => (
                  <article
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                    key={approval.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Approval Request
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          {approval.approvalType}
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                          {approval.riskLevel} risk / {approval.status}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-slate-200 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600">
                        {approval.status}
                      </span>
                    </div>
                    <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-3 text-xs leading-6 text-slate-700">
                      {compactPayloadPreview(approval.requestPayload)}
                    </pre>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        className="min-h-10 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          isBusy ||
                          approval.status !== 'pending' ||
                          resolvingApprovalId === approval.id
                        }
                        type="button"
                        onClick={() => {
                          void handleResolveApproval(approval, 'approved');
                        }}
                      >
                        Approve Stub
                      </button>
                      <button
                        className="min-h-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          isBusy ||
                          approval.status !== 'pending' ||
                          resolvingApprovalId === approval.id
                        }
                        type="button"
                        onClick={() => {
                          void handleResolveApproval(approval, 'rejected');
                        }}
                      >
                        Reject Stub
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Medium, high, and critical tool requests will create approval
                cards here. Low-risk requests are stubbed immediately.
              </p>
            )}
          </div>
        </div>
      </section>

      <DremoPolicyValidationSmoke />

      <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Final Report Artifact Stub
            </p>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
              Server-owned report contract
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              This creates database artifact metadata only through{' '}
              <span className="font-bold">dremo-api</span>. It is a stub
              report. No model, sandbox execution, file generation, storage
              upload, or billing happened.
            </p>
          </div>
          <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-700">
            Stub metadata only
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            className="min-h-12 rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            disabled={isBusy || !task}
            type="button"
            onClick={() => {
              void handleFinalizeReport();
            }}
          >
            {isFinalizingReport ? 'Finalizing...' : 'Finalize Stub Report'}
          </button>
          <button
            className="min-h-12 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-slate-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isBusy || !task}
            type="button"
            onClick={() => {
              void handleRefreshArtifacts();
            }}
          >
            {isRefreshingArtifacts ? 'Refreshing...' : 'Refresh Artifacts'}
          </button>
        </div>

        {finalReport && finalReportArtifact && (
          <article className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Final Report Card
                </p>
                <h3 className="mt-1 text-xl font-black text-slate-950">
                  {finalReportArtifact.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Built from {finalReport.eventCounts.total} server-owned
                  events. Repo scan:{' '}
                  {finalReport.signals.hasRepoScanCompleted ? 'yes' : 'no'}.
                  Sandbox lifecycle:{' '}
                  {finalReport.signals.hasSandboxLifecycle ? 'yes' : 'no'}.
                  Approvals:{' '}
                  {finalReport.signals.hasApprovalEvents ? 'yes' : 'no'}.
                </p>
              </div>
              <span className="w-fit rounded-full border border-primary/20 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
                {finalReport.mode}
              </span>
            </div>
            <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs leading-6 text-slate-700">
              {compactPayloadPreview(finalReport as unknown as Record<string, unknown>)}
            </pre>
          </article>
        )}

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
            Artifact Metadata
          </p>
          {artifacts.length > 0 ? (
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {artifacts.map((artifact) => (
                <article
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                  key={artifact.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {artifact.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        {artifact.artifactType}
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-600">
                      {artifact.storagePath ?? 'storage: null'}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    Created {formatDate(artifact.createdAt)}
                  </p>
                  <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-3 text-xs leading-6 text-slate-700">
                    {compactPayloadPreview(artifact.metadata)}
                  </pre>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              No artifacts yet. Finalize a stub report to create server-owned
              artifact metadata.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white/95 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">
              Server-owned Events
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
              Ordered event timeline
            </h2>
          </div>
          <p className="text-sm font-semibold text-slate-500">
            Latest sequence: {latestSequence || 'none'}
          </p>
        </div>

        {sortedEvents.length > 0 ? (
          <div className="mt-5 space-y-3">
            {sortedEvents.map((event) => (
              <article
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                key={event.id}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                        #{event.sequence}
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-900">
                        {event.eventType}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {formatDate(event.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-sky-700">
                      {event.channel}
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-amber-700">
                      {event.severity}
                    </span>
                  </div>
                </div>
                <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-xs leading-6 text-slate-700">
                  {compactPayloadPreview(event.payload)}
                </pre>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            No events yet. Create a task to render the server-owned timeline.
          </p>
        )}
      </section>
    </main>
  );
};
