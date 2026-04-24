import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDashboard } from '../context/DashboardContext';
import type { ExecutionLogRecord, ExecutionSessionRecord } from '../types';
import { LockedRoutePage } from './LockedRoutePage';

export const TerminalWorkspace: React.FC = () => {
  const { agentSlug } = useParams<{ agentSlug: string }>();
  const {
    creditsMode,
    createWorkspaceSession,
    executeWorkspaceAction,
    getAgentBySlug,
    isLoading,
    errorMessage: dashboardErrorMessage,
  } = useDashboard();
  const [session, setSession] = useState<ExecutionSessionRecord | null>(null);
  const [logs, setLogs] = useState<ExecutionLogRecord[]>([]);
  const [workspaceTitle, setWorkspaceTitle] = useState('Code Architect AI');
  const [workspaceSubtitle, setWorkspaceSubtitle] = useState('Session Active');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initializedSlugRef = useRef<string | null>(null);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const agent = useMemo(
    () => (agentSlug ? getAgentBySlug(agentSlug) : undefined),
    [agentSlug, getAgentBySlug],
  );

  const initializeWorkspace = React.useCallback(async () => {
    if (!agent) {
      return;
    }

    setSession(null);
    setLogs([]);
    setWorkspaceTitle(agent.workspaceTitle ?? 'Code Architect AI');
    setWorkspaceSubtitle(agent.workspaceSubtitle ?? 'Session Active');
    setIsInitializing(true);
    setErrorMessage(null);

    try {
      const nextWorkspace = await createWorkspaceSession(agent.slug);
      setSession(nextWorkspace.session);
      setLogs(nextWorkspace.logs);
      setWorkspaceTitle(nextWorkspace.providerSession.title);
      setWorkspaceSubtitle(nextWorkspace.providerSession.subtitle);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not start this workspace session.',
      );
    } finally {
      setIsInitializing(false);
    }
  }, [agent, createWorkspaceSession]);

  useEffect(() => {
    if (!agent) {
      return;
    }

    if (initializedSlugRef.current === agent.slug) {
      return;
    }

    initializedSlugRef.current = agent.slug;
    void initializeWorkspace();
  }, [agent, initializeWorkspace]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <div className="dashboard-glass-panel w-full max-w-2xl rounded-[2rem] border border-white/20 p-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
            Workspace
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            Preparing your workspace
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Loading the agent definition and execution context...
          </p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <LockedRoutePage
        title="Workspace not found"
        message={
          dashboardErrorMessage ||
          'We could not find that agent workspace. Try returning to Home and launching it again.'
        }
      />
    );
  }

  if (agent.launchMode !== 'workspace') {
    return (
      <LockedRoutePage
        title={agent.name}
        message={agent.lockedMessage || 'This workspace is still locked.'}
      />
    );
  }

  const handleExecute = async () => {
    if (!session || isExecuting) {
      return;
    }

    setIsExecuting(true);
    setErrorMessage(null);

    try {
      const nextState = await executeWorkspaceAction(session.id, agent.slug);
      setSession(nextState.session);
      setLogs(nextState.logs);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not execute this workspace action.',
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="terminal-bg relative flex h-full min-h-0 flex-col overflow-hidden text-slate-300">
      <div className="terminal-scanline" />

      <header className="relative z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-slate-900/50 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-4">
          <Link
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            to="/dashboard"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/20 text-sky-400">
              <span className="material-symbols-outlined text-sm">code</span>
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
                {workspaceTitle}
                <span className="rounded border border-sky-500/20 bg-sky-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-sky-300">
                  {session?.providerMode || 'mock'}
                </span>
              </h2>
              <p className="font-mono text-[10px] text-slate-500">
                {workspaceSubtitle}
              </p>
            </div>
          </div>
        </div>

        <button
          className="flex h-9 items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/20 px-4 font-mono text-xs text-sky-300 shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isInitializing || isExecuting || !session}
          type="button"
          onClick={handleExecute}
        >
          <span className="material-symbols-outlined text-sm">
            {isExecuting ? 'progress_activity' : 'play_arrow'}
          </span>
          {isExecuting
            ? 'Executing...'
            : creditsMode === 'live'
              ? `Execute Code - ${agent.executionCost} Credits`
              : 'Run Demo Workspace'}
        </button>
      </header>

      {errorMessage && !session && !isInitializing && (
        <div className="relative z-30 border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 md:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{errorMessage}</span>
            <button
              className="rounded-lg border border-red-300/30 bg-white/5 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-white/10"
              type="button"
              onClick={() => {
                void initializeWorkspace();
              }}
            >
              Retry Session Boot
            </button>
          </div>
        </div>
      )}

      <div className="relative z-30 flex min-h-0 flex-1 flex-col overflow-hidden xl:flex-row">
        <div className="flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-900/30 backdrop-blur-sm xl:w-[250px] xl:border-b-0 xl:border-r">
          <div className="border-b border-white/10 p-4">
            <h3 className="mb-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Macro Context
            </h3>
            <p className="text-[11px] text-slate-500">Project Architecture</p>
          </div>
          <div className="terminal-scroll space-y-1 overflow-y-auto p-4 font-mono text-xs">
            <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sky-300 hover:bg-white/5">
              <span className="material-symbols-outlined text-[14px]">
                folder_open
              </span>
              <span>neural_engine/</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 pl-6 text-slate-400 hover:bg-white/5">
              <span className="material-symbols-outlined text-[14px]">
                description
              </span>
              <span>router.ts</span>
            </div>
            <div className="flex items-center gap-2 rounded border-l-2 border-sky-500 bg-white/5 px-2 py-1 pl-6 text-white">
              <span className="material-symbols-outlined text-[14px] text-sky-400">
                code
              </span>
              <span>executor.ts</span>
            </div>
            <div className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 pl-6 text-slate-400 hover:bg-white/5">
              <span className="material-symbols-outlined text-[14px]">
                description
              </span>
              <span>types.d.ts</span>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col bg-slate-950/40">
          <div className="terminal-scroll flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed text-slate-400">
            <div className="mb-4 text-slate-600">
              // executor.ts - Neural routing implementation
            </div>
            {agent.previewCode ? (
              <pre className="whitespace-pre-wrap">{agent.previewCode}</pre>
            ) : (
              <>
                <div>
                  <span className="text-purple-400">import</span> {'{'} NeuralRouter {'}'}
                  <span className="text-purple-400"> from </span>
                  <span className="text-green-400">'./router'</span>;
                </div>
                <div className="mt-4">
                  <span className="text-sky-400">export class</span>{' '}
                  <span className="text-yellow-200">ExecutionEngine</span> {'{'}
                </div>
                <div className="pl-4">
                  <span className="text-sky-400">private</span> router:{' '}
                  <span className="text-yellow-200">NeuralRouter</span>;
                </div>
                <div className="mt-2 pl-4">
                  <span className="text-sky-400">constructor</span>() {'{'}
                </div>
                <div className="pl-8">
                  <span className="text-blue-400">this</span>.router ={' '}
                  <span className="text-sky-400">new</span>{' '}
                  <span className="text-yellow-200">NeuralRouter</span>();
                </div>
                <div className="pl-4">{'}'}</div>
              </>
            )}
            <div className="ml-1 inline-block h-4 w-2 animate-pulse bg-sky-400 align-middle" />
          </div>

          <div className="relative flex h-48 flex-col border-t border-white/10 bg-slate-900/80 p-4 font-mono">
            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                AG-UI Execution Stream
              </span>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-500 shadow-[0_0_5px_rgba(14,165,233,0.8)]" />
                <span className="text-[9px] text-sky-400">LIVE</span>
              </div>
            </div>

            <div
              ref={logContainerRef}
              className="terminal-scroll flex-1 space-y-1.5 overflow-y-auto text-xs"
            >
              {isInitializing && (
                <div className="text-slate-500">
                  <span className="text-sky-400">-&gt;</span>{' '}
                  Preparing secure execution environment...
                </div>
              )}

              {logs.map((log) => (
                <div
                  key={log.id}
                  className={
                    log.kind === 'success'
                      ? 'text-green-400'
                      : log.kind === 'error'
                        ? 'text-red-400'
                        : log.kind === 'progress'
                          ? 'text-sky-400'
                          : 'text-slate-400'
                  }
                >
                  {log.message}
                </div>
              ))}

              {errorMessage && (
                <div className="text-red-400">[ERROR] {errorMessage}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
