import React from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { AuthFlow } from '../features/auth/components/AuthFlow';
import { OnboardingFlow } from '../features/auth/components/OnboardingFlow';
import { ReviewGate } from '../features/auth/components/ReviewGate';
import { DashboardShell } from '../features/dashboard/components/DashboardShell';
import { DashboardProvider } from '../features/dashboard/context/DashboardContext';
import { DashboardHomePage } from '../features/dashboard/pages/DashboardHomePage';
import { LockedRoutePage } from '../features/dashboard/components/LockedRoutePage';
import { TerminalWorkspace } from '../features/dashboard/components/TerminalWorkspace';
import { useAppSession } from './AppSessionContext';
import { isSupabaseConfigured } from '../lib/supabase';

const routeVariants = {
  initial: {
    opacity: 0,
    x: 24,
    scale: 0.985,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    x: -18,
    scale: 0.992,
    transition: {
      duration: 0.22,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

const RouteTransition: React.FC<{ children: React.ReactNode; routeKey: string }> = ({
  children,
  routeKey,
}) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.div
      key={routeKey}
      className="hardware-accelerated h-full"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={routeVariants}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

const ConfigurationState: React.FC<{ errorMessage?: string | null }> = ({
  errorMessage = null,
}) => (
  <div className="space-y-6">
    <div className="space-y-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
        Connect Supabase
      </h1>
      <p className="text-lg leading-relaxed text-on-surface-variant">
        Add your Supabase project values to the local environment so Lumixia can
        send and verify secure login codes.
      </p>
    </div>

    <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Required Variables
      </p>
      <div className="space-y-3 text-sm text-on-surface-variant">
        <p>
          <code className="font-semibold text-on-surface">
            VITE_SUPABASE_URL
          </code>{' '}
          and{' '}
          <code className="font-semibold text-on-surface">
            VITE_SUPABASE_PUBLISHABLE_KEY
          </code>{' '}
          must be present before the auth flow can run.
        </p>
        <p>
          Copy <code className="font-semibold text-on-surface">.env.example</code>{' '}
          into a local env file and add your Supabase project values before
          launching Lumixia.
        </p>
      </div>
    </div>

    {errorMessage && (
      <p className="text-sm font-medium text-error" role="alert">
        {errorMessage}
      </p>
    )}
  </div>
);

const ProfileErrorState: React.FC<{
  errorMessage?: string | null;
  onRetry?: () => void;
}> = ({
  errorMessage = null,
  onRetry,
}) => (
  <div className="space-y-6">
    <div className="space-y-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
        We couldn&apos;t load your profile
      </h1>
      <p className="text-lg leading-relaxed text-on-surface-variant">
        Lumixia restored your authenticated session, but the app profile record
        is missing or does not match the expected database structure yet.
      </p>
    </div>

    {errorMessage && (
      <p className="text-sm font-medium text-error" role="alert">
        {errorMessage}
      </p>
    )}

    {onRetry && (
      <button
        className="rounded-xl bg-primary px-5 py-3 font-semibold text-white transition-transform hover:-translate-y-0.5"
        type="button"
        onClick={onRetry}
      >
        Retry Profile Sync
      </button>
    )}
  </div>
);

const LoadingState: React.FC<{ message: string }> = ({ message }) => (
  <div className="space-y-4">
    <h1 className="text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
      Preparing Lumixia
    </h1>
    <p className="text-lg text-on-surface-variant">{message}</p>
  </div>
);

const AuthPage: React.FC = () => (
  <AuthLayout>
    <AuthFlow />
  </AuthLayout>
);

const ReviewPage: React.FC = () => {
  const {
    session,
    isCreatingAccount,
    isSigningOut,
    reviewGateError,
    signOutError,
    handleReviewGateContinue,
    handleSignOut,
  } = useAppSession();

  if (!session?.user.email) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <AuthLayout>
      <ReviewGate
        email={session.user.email}
        onContinue={handleReviewGateContinue}
        onUseDifferentEmail={handleSignOut}
        isSubmitting={isCreatingAccount || isSigningOut}
        errorMessage={reviewGateError || signOutError}
      />
    </AuthLayout>
  );
};

const OnboardingPage: React.FC = () => {
  const {
    session,
    displayName,
    allowTraining,
    isCompletingOnboarding,
    onboardingError,
    handleOnboardingComplete,
  } = useAppSession();

  if (!session?.user.email) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <OnboardingFlow
      email={session.user.email}
      onComplete={handleOnboardingComplete}
      isSubmitting={isCompletingOnboarding}
      errorMessage={onboardingError}
      initialDisplayName={displayName}
      initialAllowTraining={allowTraining}
    />
  );
};

const RootRedirect: React.FC = () => {
  const { session, hasAcceptedReviewGate, hasCompletedOnboarding } =
    useAppSession();

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAcceptedReviewGate) {
    return <Navigate to="/review" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const SessionAwareRedirect: React.FC<{ targetForGuests: string }> = ({
  targetForGuests,
}) => {
  const { session, hasAcceptedReviewGate, hasCompletedOnboarding } =
    useAppSession();

  if (!session) {
    return <Navigate to={targetForGuests} replace />;
  }

  if (!hasAcceptedReviewGate) {
    return <Navigate to="/review" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
};

const UnauthenticatedOnly: React.FC = () => {
  const { session, hasAcceptedReviewGate, hasCompletedOnboarding } =
    useAppSession();

  if (!session) {
    return <Outlet />;
  }

  if (!hasAcceptedReviewGate) {
    return <Navigate to="/review" replace />;
  }

  if (!hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const ReviewGuard: React.FC = () => {
  const { session, hasAcceptedReviewGate, hasCompletedOnboarding } =
    useAppSession();

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (hasAcceptedReviewGate && !hasCompletedOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  if (hasAcceptedReviewGate && hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const OnboardingGuard: React.FC = () => {
  const { session, hasAcceptedReviewGate, hasCompletedOnboarding } =
    useAppSession();

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasAcceptedReviewGate) {
    return <Navigate to="/review" replace />;
  }

  if (hasCompletedOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const DashboardRoutes: React.FC = () => {
  const { session } = useAppSession();

  if (!session?.user.id) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <DashboardProvider userId={session.user.id}>
      <Routes>
        <Route element={<DashboardShell />}>
          <Route index element={<DashboardHomePage />} />
          <Route
            path="workspace/:agentSlug"
            element={<TerminalWorkspace />}
          />
          <Route
            path="discover"
            element={
              <LockedRoutePage
                title="Discover"
                message="Curated discovery is unlocking in the next Lumixia phase."
              />
            }
          />
          <Route
            path="studio"
            element={
              <LockedRoutePage
                title="Studio"
                message="Studio workspaces are reserved for the next rollout."
              />
            }
          />
          <Route
            path="split-pay"
            element={
              <LockedRoutePage
                title="Split & Pay"
                message="Intelligent shared billing will arrive in a future release."
              />
            }
          />
          <Route
            path="settings"
            element={
              <LockedRoutePage
                title="Settings"
                message="Advanced Lumixia settings are still being refined."
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </DashboardProvider>
  );
};

const AppRouteContent: React.FC = () => {
  const {
    session,
    isBootstrapping,
    isHydratingProfile,
    bootstrapError,
    refreshProfile,
  } = useAppSession();
  const location = useLocation();

  if (!isSupabaseConfigured) {
    return (
      <AuthLayout>
        <ConfigurationState errorMessage={bootstrapError} />
      </AuthLayout>
    );
  }

  if (bootstrapError && session) {
    return (
      <AuthLayout>
        <ProfileErrorState
          errorMessage={bootstrapError}
          onRetry={() => {
            void refreshProfile();
          }}
        />
      </AuthLayout>
    );
  }

  if (isBootstrapping || isHydratingProfile) {
    return (
      <AuthLayout>
        <LoadingState
          message={
            isHydratingProfile
              ? 'Syncing your profile and dashboard state...'
              : 'Restoring your secure session...'
          }
        />
      </AuthLayout>
    );
  }

  return (
    <RouteTransition routeKey={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<RootRedirect />} />
        <Route element={<UnauthenticatedOnly />}>
          <Route path="/auth" element={<AuthPage />} />
        </Route>
        <Route element={<ReviewGuard />}>
          <Route path="/review" element={<ReviewPage />} />
        </Route>
        <Route element={<OnboardingGuard />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
        <Route element={<SessionAwareRedirect targetForGuests="/auth" />}>
          <Route path="/dashboard/*" element={<DashboardRoutes />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteTransition>
  );
};

export const AppRoutes: React.FC = () => (
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AppRouteContent />
  </BrowserRouter>
);
