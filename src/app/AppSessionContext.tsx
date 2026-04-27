import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import type {
  OnboardingSubmission,
  ReviewGateSubmission,
} from '../features/auth/types';
import {
  getCurrentSession,
  onAuthStateChange,
  signOut,
} from '../features/auth/lib/auth';
import {
  fetchCreditAccount,
  type CreditAccount,
  type CreditAccountStatus,
  type CreditState,
} from '../features/auth/lib/credits';
import {
  fetchProfile,
  type ProfilePatch,
  type ProfileRecord,
  upsertProfile,
} from '../features/auth/lib/profile';
import { isSupabaseConfigured } from '../lib/supabase';

const REVIEW_GATE_STORAGE_PREFIX = 'lumixia-review-accepted:';
const ONBOARDING_STORAGE_PREFIX = 'lumixia-onboarding:';
const CURRENT_TERMS_VERSION = '2026-04-23';
const CURRENT_PRIVACY_VERSION = '2026-04-23';

interface AppSessionContextValue {
  session: Session | null;
  profile: ProfileRecord | null;
  isBootstrapping: boolean;
  isHydratingProfile: boolean;
  bootstrapError: string | null;
  signOutError: string | null;
  reviewGateError: string | null;
  onboardingError: string | null;
  isSigningOut: boolean;
  isCreatingAccount: boolean;
  isCompletingOnboarding: boolean;
  hasAcceptedReviewGate: boolean;
  hasCompletedOnboarding: boolean;
  displayName: string;
  allowTraining: boolean;
  creditBalance: number | null;
  creditState: CreditState;
  creditAccountStatus: CreditAccountStatus | null;
  creditError: string | null;
  refreshProfile: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  saveProfilePatch: (patch: ProfilePatch) => Promise<ProfileRecord>;
  handleSignOut: () => Promise<void>;
  handleReviewGateContinue: (
    submission: ReviewGateSubmission,
  ) => Promise<void>;
  handleOnboardingComplete: (
    submission: OnboardingSubmission,
  ) => Promise<void>;
}

const AppSessionContext = createContext<AppSessionContextValue | null>(null);

function getReviewGateStorageKey(email: string) {
  return `${REVIEW_GATE_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function getOnboardingStorageKey(email: string) {
  return `${ONBOARDING_STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function clearLegacyReviewGateAcceptance(email: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getReviewGateStorageKey(email));
}

function clearLegacyOnboardingState(email: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(getOnboardingStorageKey(email));
}

export const AppSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [creditAccount, setCreditAccount] = useState<CreditAccount | null>(null);
  const [creditState, setCreditState] = useState<CreditState>(
    isSupabaseConfigured ? 'loading' : 'unavailable',
  );
  const [creditError, setCreditError] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(isSupabaseConfigured);
  const [isHydratingProfile, setIsHydratingProfile] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [reviewGateError, setReviewGateError] = useState<string | null>(null);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isCompletingOnboarding, setIsCompletingOnboarding] = useState(false);
  const sessionRef = useRef<Session | null>(null);
  const profileRef = useRef<ProfileRecord | null>(null);
  const hydrationRef = useRef<{
    promise: Promise<void> | null;
    userId: string | null;
  }>({
    promise: null,
    userId: null,
  });

  const hydrateCredits = useCallback(async (currentUserId: string) => {
    setCreditState('loading');
    setCreditError(null);

    try {
      const nextCreditAccount = await fetchCreditAccount(currentUserId);

      if (nextCreditAccount) {
        setCreditAccount(nextCreditAccount);
        setCreditState('ready');
        return;
      }

      setCreditAccount(null);
      setCreditState('unavailable');
    } catch (error) {
      setCreditAccount(null);
      setCreditState('unavailable');
      setCreditError(
        error instanceof Error
          ? error.message
          : 'We could not load your Lumixia credit account.',
      );
    }
  }, []);

  const hydrateProfile = useCallback(async (currentSession: Session) => {
    const currentUserId = currentSession.user.id;
    const currentEmail = currentSession.user.email;

    if (
      hydrationRef.current.promise &&
      hydrationRef.current.userId === currentUserId
    ) {
      return hydrationRef.current.promise;
    }

    if (!currentEmail) {
      setProfile(null);
      setCreditAccount(null);
      setCreditState('unavailable');
      setCreditError(null);
      return;
    }

    const task = (async () => {
      setIsHydratingProfile(true);

      try {
        let nextProfile = await fetchProfile(currentUserId);

        if (!nextProfile) {
          nextProfile = await upsertProfile(currentUserId);
        }

        setProfile(nextProfile);
        await hydrateCredits(currentUserId);
        setBootstrapError(null);
        setReviewGateError(null);
        setOnboardingError(null);
        clearLegacyReviewGateAcceptance(currentEmail);
        clearLegacyOnboardingState(currentEmail);
      } catch (error) {
        setBootstrapError(
          error instanceof Error
            ? error.message
            : 'We could not load your Lumixia profile.',
        );
        setCreditAccount(null);
        setCreditState('unavailable');
      } finally {
        setIsHydratingProfile(false);
      }
    })();

    hydrationRef.current = {
      promise: task,
      userId: currentUserId,
    };

    try {
      await task;
    } finally {
      if (hydrationRef.current.promise === task) {
        hydrationRef.current = {
          promise: null,
          userId: null,
        };
      }
    }
  }, [hydrateCredits]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsBootstrapping(false);
      return;
    }

    let isMounted = true;

    void getCurrentSession()
      .then(async (currentSession) => {
        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        setBootstrapError(null);

        if (currentSession) {
          await hydrateProfile(currentSession);
        } else {
          setProfile(null);
          setCreditAccount(null);
          setCreditState('unavailable');
          setCreditError(null);
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setBootstrapError(
          error instanceof Error
            ? error.message
            : 'We could not restore the current session.',
        );
      })
      .finally(() => {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      });

    const {
      data: { subscription },
    } = onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setBootstrapError(null);
      setSignOutError(null);

      if (nextSession) {
        const currentSession = sessionRef.current;
        const currentProfile = profileRef.current;
        const isSameUser = currentSession?.user.id === nextSession.user.id;
        const hasHydratedCurrentUser = currentProfile?.id === nextSession.user.id;

        if (
          hasHydratedCurrentUser &&
          isSameUser &&
          (event === 'SIGNED_IN' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED')
        ) {
          return;
        }

        void hydrateProfile(nextSession);
      } else {
        hydrationRef.current = {
          promise: null,
          userId: null,
        };
        setProfile(null);
        setCreditAccount(null);
        setCreditState('unavailable');
        setCreditError(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateProfile]);

  const refreshProfile = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setCreditAccount(null);
      setCreditState('unavailable');
      setCreditError(null);
      return;
    }

    await hydrateProfile(session);
  }, [hydrateProfile, session]);

  const refreshCredits = useCallback(async () => {
    if (!session?.user.id) {
      setCreditAccount(null);
      setCreditState('unavailable');
      setCreditError(null);
      return;
    }

    await hydrateCredits(session.user.id);
  }, [hydrateCredits, session?.user.id]);

  const saveProfilePatch = useCallback(
    async (patch: ProfilePatch) => {
      if (!session?.user.id) {
        throw new Error('We could not find an authenticated profile to update.');
      }

      const nextProfile = await upsertProfile(session.user.id, patch);
      setProfile(nextProfile);
      return nextProfile;
    },
    [session?.user.id],
  );

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    setReviewGateError(null);
    setOnboardingError(null);

    try {
      await signOut();
    } catch (error) {
      setSignOutError(
        error instanceof Error
          ? error.message
          : 'We could not sign you out right now.',
      );
    } finally {
      setIsSigningOut(false);
    }
  }, []);

  const handleReviewGateContinue = useCallback(
    async (submission: ReviewGateSubmission) => {
      const currentUserId = session?.user.id;
      const currentEmail = session?.user.email;

      if (!currentUserId || !currentEmail) {
        setReviewGateError(
          'We could not find an authenticated email to continue.',
        );
        return;
      }

      setIsCreatingAccount(true);
      setReviewGateError(null);

      try {
        const acceptedAt = new Date().toISOString();

        const nextProfile = await upsertProfile(currentUserId, {
          marketing_opt_in: submission.promoOptIn,
          privacy_accepted_at: acceptedAt,
          privacy_version: CURRENT_PRIVACY_VERSION,
          terms_accepted_at: acceptedAt,
          terms_version: CURRENT_TERMS_VERSION,
        });

        setProfile(nextProfile);
        clearLegacyReviewGateAcceptance(currentEmail);
      } catch (error) {
        setReviewGateError(
          error instanceof Error
            ? error.message
            : 'We could not save your review preferences right now.',
        );
      } finally {
        setIsCreatingAccount(false);
      }
    },
    [session?.user.email, session?.user.id],
  );

  const handleOnboardingComplete = useCallback(
    async (submission: OnboardingSubmission) => {
      const currentUserId = session?.user.id;
      const currentEmail = session?.user.email;

      if (!currentUserId || !currentEmail) {
        setOnboardingError(
          'We could not find an authenticated email to continue.',
        );
        return;
      }

      setIsCompletingOnboarding(true);
      setOnboardingError(null);

      try {
        const nextProfile = await upsertProfile(currentUserId, {
          allow_training: submission.allowTraining,
          display_name: submission.displayName,
          onboarding_completed_at: new Date().toISOString(),
        });

        setProfile(nextProfile);
        clearLegacyOnboardingState(currentEmail);
      } catch (error) {
        setOnboardingError(
          error instanceof Error
            ? error.message
            : 'We could not save your onboarding preferences right now.',
        );
      } finally {
        setIsCompletingOnboarding(false);
      }
    },
    [session?.user.email, session?.user.id],
  );

  const value = useMemo<AppSessionContextValue>(() => {
    const hasAcceptedReviewGate = Boolean(
      profile?.terms_accepted_at && profile?.privacy_accepted_at,
    );
    const hasCompletedOnboarding = Boolean(profile?.onboarding_completed_at);

    return {
      session,
      profile,
      isBootstrapping,
      isHydratingProfile,
      bootstrapError,
      signOutError,
      reviewGateError,
      onboardingError,
      isSigningOut,
      isCreatingAccount,
      isCompletingOnboarding,
      hasAcceptedReviewGate,
      hasCompletedOnboarding,
      displayName: profile?.display_name ?? '',
      allowTraining: profile?.allow_training ?? true,
      creditBalance: creditAccount?.available_balance ?? null,
      creditState,
      creditAccountStatus: creditAccount?.status ?? null,
      creditError,
      refreshProfile,
      refreshCredits,
      saveProfilePatch,
      handleSignOut,
      handleReviewGateContinue,
      handleOnboardingComplete,
    };
  }, [
    bootstrapError,
    creditAccount,
    creditError,
    creditState,
    handleOnboardingComplete,
    handleReviewGateContinue,
    handleSignOut,
    isBootstrapping,
    isCompletingOnboarding,
    isCreatingAccount,
    isHydratingProfile,
    isSigningOut,
    onboardingError,
    profile,
    refreshCredits,
    refreshProfile,
    reviewGateError,
    saveProfilePatch,
    session,
    signOutError,
  ]);

  return (
    <AppSessionContext.Provider value={value}>
      {children}
    </AppSessionContext.Provider>
  );
};

export function useAppSession() {
  const context = useContext(AppSessionContext);

  if (!context) {
    throw new Error('useAppSession must be used within AppSessionProvider.');
  }

  return context;
}
