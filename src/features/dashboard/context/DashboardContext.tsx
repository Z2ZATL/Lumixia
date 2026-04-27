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
import { getCreditsMode } from '../../auth/lib/credits';
import {
  ensureUserDashboardState,
  fetchDashboardContent,
  fetchUserDashboardPreferences,
  fetchUserLifestyleEvents,
  upsertUserDashboardPreferences,
} from '../lib/dashboard';
import { attemptAutoReload } from '../../billing/lib/billing';
import { resolveExecutionProvider } from '../lib/execution';
import type {
  DashboardContentBundle,
  DashboardContextValue,
  DashboardProviderProps,
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
  const executionProviderConfig = useMemo(() => resolveExecutionProvider(), []);
  const executionProvider = executionProviderConfig.provider;
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

      return executionProvider.createSession({
        agent,
        userId,
      });
    },
    [executionProvider, getAgentBySlug, userId],
  );

  const executeWorkspaceAction = useCallback(
    async (sessionId: string, agentSlug: string) => {
      const agent = getAgentBySlug(agentSlug);

      if (!agent) {
        throw new Error('We could not find that workspace agent.');
      }

      if (creditsMode === 'live' && executionProviderConfig.mode !== 'api') {
        throw new Error(
          'Live credit execution requires the secure Lumixia execution API. Demo workspaces cannot debit credits.',
        );
      }

      try {
        const executionResult = await executionProvider.execute({
          agent,
          sessionId,
          userId,
        });

        if (creditsMode === 'live') {
          if (executionResult.session.status === 'failed') {
            openPopup(
              'The workspace run did not complete. Any execution-credit refund is handled by the secure server-side execution path.',
            );
          }

          await refreshCredits();
          void attemptAutoReload().catch(() => undefined);
        }

        return {
          session: executionResult.session,
          logs: executionResult.logs,
        };
      } catch (error) {
        if (creditsMode === 'live') {
          await refreshCredits();
          openPopup(
            'The workspace run did not complete. Any execution-credit refund is handled by the secure server-side execution path.',
          );
        }

        throw error;
      }
    },
    [
      creditsMode,
      executionProvider,
      executionProviderConfig.mode,
      getAgentBySlug,
      openPopup,
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
      executionProviderNotice: executionProviderConfig.configurationError,
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
      executionProviderConfig.configurationError,
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
