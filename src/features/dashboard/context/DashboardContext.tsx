import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAppSession } from '../../../app/AppSessionContext';
import {
  consumeAgentCredits,
  getCreditsMode,
  refundAgentCredits,
} from '../../auth/lib/credits';
import {
  appendExecutionLogs,
  createExecutionSessionRecord,
  ensureUserDashboardState,
  fetchDashboardContent,
  fetchExecutionLogs,
  fetchUserDashboardPreferences,
  fetchUserLifestyleEvents,
  updateExecutionSessionRecord,
  upsertUserDashboardPreferences,
} from '../lib/dashboard';
import { attemptAutoReload } from '../../billing/lib/billing';
import { getExecutionProvider } from '../lib/execution';
import type {
  DashboardContentBundle,
  DashboardContextValue,
  DashboardProviderProps,
  ExecutionSessionStatus,
  UserDashboardPreferences,
} from '../types';

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  userId,
  children,
}) => {
  const { creditBalance, creditState, displayName, refreshCredits } =
    useAppSession();
  const [content, setContent] = useState<DashboardContentBundle>({
    agents: [],
    sections: [],
    trendingSearches: [],
  });
  const [lifestyleEvents, setLifestyleEvents] = useState<
    DashboardContextValue['lifestyleEvents']
  >([]);
  const [preferences, setPreferences] =
    useState<UserDashboardPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const lastSyncedRouteRef = useRef<string | null>(null);
  const executionProvider = useMemo(() => getExecutionProvider(), []);
  const creditsMode = useMemo(() => getCreditsMode(), []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);

    try {
      await ensureUserDashboardState(userId);

      const [nextContent, nextPreferences, nextEvents] = await Promise.all([
        fetchDashboardContent(),
        fetchUserDashboardPreferences(userId),
        fetchUserLifestyleEvents(userId),
      ]);

      setContent(nextContent);
      setPreferences(nextPreferences);
      setLifestyleEvents(nextEvents);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not load your dashboard content.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const openPopup = useCallback((message: string) => {
    setPopupMessage(message);
  }, []);

  const closePopup = useCallback(() => {
    setPopupMessage(null);
  }, []);

  const getAgentBySlug = useCallback(
    (slug: string) => content.agents.find((agent) => agent.slug === slug),
    [content.agents],
  );

  const syncLastRoute = useCallback(
    async (route: string) => {
      if (lastSyncedRouteRef.current === route) {
        return;
      }

      try {
        const nextPreferences = await upsertUserDashboardPreferences(userId, {
          lastRoute: route,
        });
        lastSyncedRouteRef.current = route;
        setPreferences(nextPreferences);
      } catch {
        // Keep route sync non-blocking so transient preference failures
        // do not collapse the entire dashboard into a fatal error state.
      }
    },
    [userId],
  );

  const setRightRailCollapsed = useCallback(
    async (value: boolean) => {
      if (preferences?.rightRailCollapsed === value) {
        return;
      }

      try {
        const nextPreferences = await upsertUserDashboardPreferences(userId, {
          rightRailCollapsed: value,
        });
        setPreferences(nextPreferences);
      } catch {
        // Keep layout preference updates non-blocking for the dashboard UI.
      }
    },
    [preferences?.rightRailCollapsed, userId],
  );

  const createWorkspaceSession = useCallback(
    async (agentSlug: string) => {
      const agent = getAgentBySlug(agentSlug);

      if (!agent) {
        throw new Error('We could not find that workspace agent.');
      }

      const providerSession = await executionProvider.createSession({
        agent,
        userId,
      });
      const session = await createExecutionSessionRecord({
        agentSlug: agent.slug,
        agentName: agent.name,
        executionCost: providerSession.executionCost,
        providerMode: providerSession.providerMode,
        status: providerSession.status,
        userId,
      });
      const bootLogs = await executionProvider.listLogs({
        agent,
        sessionId: session.id,
        userId,
      });
      await appendExecutionLogs({
        logs: bootLogs,
        sessionId: session.id,
        userId,
      });
      const hydratedSession = await updateExecutionSessionRecord(session.id, {
        status: 'idle',
      });
      const logs = await fetchExecutionLogs(session.id);

      return {
        session: hydratedSession,
        logs,
        providerSession,
      };
    },
    [executionProvider, getAgentBySlug, userId],
  );

  const executeWorkspaceAction = useCallback(
    async (sessionId: string, agentSlug: string) => {
      const agent = getAgentBySlug(agentSlug);

      if (!agent) {
        throw new Error('We could not find that workspace agent.');
      }

      const executionAttemptId = crypto.randomUUID();
      let consumedLiveCredits = false;

      if (creditsMode === 'live') {
        await consumeAgentCredits({
          agentSlug: agent.slug,
          executionSessionId: sessionId,
          idempotencyKey: `usage:${sessionId}:${executionAttemptId}`,
        });
        consumedLiveCredits = true;
        await refreshCredits();
      }

      await updateExecutionSessionRecord(sessionId, { status: 'running' });
      try {
        const executionResult = await executionProvider.execute({
          agent,
          sessionId,
          userId,
        });

        await appendExecutionLogs({
          logs: executionResult.logs,
          sessionId,
          userId,
        });

        const nextStatus: ExecutionSessionStatus =
          executionResult.status === 'failed' ? 'failed' : 'completed';
        const nextSession = await updateExecutionSessionRecord(sessionId, {
          status: nextStatus,
        });

        if (creditsMode === 'live') {
          if (executionResult.status === 'failed') {
            await refundAgentCredits({
              executionSessionId: sessionId,
              idempotencyKey: `usage-refund:${sessionId}:${executionAttemptId}`,
              reason: 'execution_failed',
            });
          }

          await refreshCredits();
          void attemptAutoReload().catch(() => undefined);
        }

        const logs = await fetchExecutionLogs(sessionId);

        return {
          session: nextSession,
          logs,
        };
      } catch (error) {
        if (creditsMode === 'live' && consumedLiveCredits) {
          await refundAgentCredits({
            executionSessionId: sessionId,
            idempotencyKey: `usage-refund:${sessionId}:${executionAttemptId}:catch`,
            reason: 'execution_failed',
          }).catch(() => undefined);
          await refreshCredits();
        }

        throw error;
      }
    },
    [
      creditsMode,
      executionProvider,
      getAgentBySlug,
      refreshCredits,
      userId,
    ],
  );

  const value = useMemo<DashboardContextValue>(
    () => ({
      userId,
      displayName,
      creditBalance,
      creditState,
      creditsMode,
      content,
      lifestyleEvents,
      preferences,
      isLoading,
      errorMessage,
      popupMessage,
      openPopup,
      closePopup,
      refreshDashboard: loadDashboard,
      getAgentBySlug,
      syncLastRoute,
      setRightRailCollapsed,
      createWorkspaceSession,
      executeWorkspaceAction,
    }),
    [
      closePopup,
      content,
      creditBalance,
      creditState,
      createWorkspaceSession,
      creditsMode,
      displayName,
      errorMessage,
      executeWorkspaceAction,
      getAgentBySlug,
      isLoading,
      lifestyleEvents,
      loadDashboard,
      openPopup,
      popupMessage,
      preferences,
      setRightRailCollapsed,
      syncLastRoute,
      userId,
    ],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export function useDashboard() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider.');
  }

  return context;
}
