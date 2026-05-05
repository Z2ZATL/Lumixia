import React, { useMemo, useState } from 'react';
import {
  cancelDremoTask,
  createDremoTask,
  getDremoTask,
  getDremoTaskEvents,
  startDremoStubSandbox,
  stopDremoStubSandbox,
} from '../lib/dremoApi';
import type { DremoSandboxSession, DremoTask, DremoTaskEvent } from '../types';

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

export const DremoCodeLab: React.FC = () => {
  const [title, setTitle] = useState('Stub task');
  const [prompt, setPrompt] = useState('Create a server-owned Dremo stub task.');
  const [task, setTask] = useState<DremoTask | null>(null);
  const [sandboxSession, setSandboxSession] =
    useState<DremoSandboxSession | null>(null);
  const [events, setEvents] = useState<DremoTaskEvent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isStartingSandbox, setIsStartingSandbox] = useState(false);
  const [isStoppingSandbox, setIsStoppingSandbox] = useState(false);

  const latestSequence = useMemo(
    () => events.reduce((max, event) => Math.max(max, event.sequence), 0),
    [events],
  );
  const sortedEvents = useMemo(() => sortEvents(events), [events]);
  const isBusy =
    isCreating ||
    isRefreshing ||
    isCancelling ||
    isStartingSandbox ||
    isStoppingSandbox;
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
      setEvents(sortEvents(result.events));
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
