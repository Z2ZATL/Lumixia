import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { OnboardingFlowProps } from '../types';

const LOGO_SRC =
  'https://lumixia-ui-assets-prod.s3.ap-southeast-1.amazonaws.com/logo.svg';

const INTRO_ITEMS = [
  {
    icon: 'chat_bubble',
    title: 'Ad-free chats:',
    description:
      "We won't show you ads or let advertisers influence what Lumixia says.",
  },
  {
    icon: 'volunteer_activism',
    title: 'Built to help, not harm:',
    description:
      'Automated safeguards protect your tasks and lifestyle inputs from violence, abuse, and deception.',
  },
];

const screenVariants = {
  initial: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? 100 : -100,
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.7,
      ease: [0.4, 0, 0.2, 1] as const,
      when: 'beforeChildren',
      staggerChildren: 0.12,
    },
  },
  exit: (direction: 'forward' | 'backward') => ({
    opacity: 0,
    x: direction === 'forward' ? -100 : 100,
    transition: {
      duration: 0.45,
      ease: [0.4, 0, 0.2, 1] as const,
      when: 'afterChildren',
      staggerChildren: 0.08,
      staggerDirection: -1 as const,
    },
  }),
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 1, 1] as const,
    },
  },
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  email,
  onComplete,
  isSubmitting = false,
  errorMessage = null,
  initialDisplayName = '',
  initialAllowTraining = true,
}) => {
  const [screen, setScreen] = useState<'intro' | 'name'>('intro');
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [allowTraining, setAllowTraining] = useState(initialAllowTraining);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isPreparingNext, setIsPreparingNext] = useState(false);
  const [hasStartedSubmit, setHasStartedSubmit] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const continueTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (screen === 'name') {
      nameInputRef.current?.focus();
    }
  }, [screen]);

  useEffect(() => {
    return () => {
      if (continueTimeoutRef.current) {
        window.clearTimeout(continueTimeoutRef.current);
      }
    };
  }, []);

  const trimmedName = useMemo(() => displayName.trim(), [displayName]);

  const handleContinue = () => {
    if (isPreparingNext || isSubmitting) {
      return;
    }

    if (continueTimeoutRef.current) {
      window.clearTimeout(continueTimeoutRef.current);
    }

    setIsPreparingNext(true);
    continueTimeoutRef.current = window.setTimeout(() => {
      setDirection('forward');
      setScreen('name');
      setIsPreparingNext(false);
      continueTimeoutRef.current = null;
    }, 700);
  };

  const handleSubmit = async () => {
    if (!trimmedName || isSubmitting) {
      return;
    }

    setHasStartedSubmit(true);
    await onComplete({
      displayName: trimmedName,
      allowTraining,
    });
  };

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-surface px-4 py-10 text-on-surface sm:py-12">
      <div className="pointer-events-none fixed right-[-10%] top-[-10%] h-[50%] w-[50%] rounded-full bg-primary/10 blur-[120px] animate-float-slow" />
      <div className="pointer-events-none fixed bottom-[-5%] left-[5%] h-[40%] w-[40%] rounded-full bg-primary/10 blur-[100px] animate-float-medium" />
      <div className="pointer-events-none fixed left-[10%] top-[20%] h-[150px] w-[150px] rounded-full bg-primary/5 blur-[60px] animate-float-slower" />

      <div className="onboarding-glow relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl flex-col items-center justify-start py-4 sm:min-h-[calc(100vh-6rem)] sm:py-6 lg:justify-center">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {screen === 'intro' ? (
            <motion.div
              key="intro"
              className="flex w-full flex-col items-center"
              custom={direction}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={screenVariants}
            >
              <motion.div className="mb-10 flex flex-col items-center" variants={itemVariants}>
                <div className="mb-4 h-12 w-12 drop-shadow-xl md:h-16 md:w-16">
                  <img
                    alt="Lumixia Logo"
                    className="h-full w-full object-contain"
                    src={LOGO_SRC}
                  />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
                  Lumixia
                </h2>
              </motion.div>

              <motion.div
                className="mb-8 max-w-2xl px-4 text-center md:mb-10"
                variants={itemVariants}
              >
                <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-on-surface md:text-5xl lg:text-6xl">
                  Before we <span className="onboarding-gradient-text">begin</span>
                </h1>
                <p className="text-base font-medium text-on-surface-variant md:text-lg">
                  A few things to know, plus one setting to review.
                </p>
              </motion.div>

              <motion.div
                className="onboarding-glass-card w-full max-w-sm rounded-xl p-6 md:max-w-xl md:p-10 lg:max-w-2xl"
                variants={itemVariants}
              >
                <div className="space-y-6 md:space-y-8">
                  {INTRO_ITEMS.map((item, index) => (
                    <React.Fragment key={item.title}>
                      {index > 0 && <div className="onboarding-divider" />}
                      <div className="flex items-start gap-4 md:gap-6">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm transition-transform duration-300 hover:scale-110 hover:rotate-[5deg] md:h-12 md:w-12">
                          <span className="material-symbols-outlined text-xl text-primary md:text-2xl">
                            {item.icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="mb-1 text-base font-bold leading-tight text-on-surface md:text-lg">
                            {item.title}
                          </h3>
                          <p className="text-sm leading-relaxed text-on-surface-variant md:text-base">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}

                  <div className="onboarding-divider" />

                  <div className="flex items-start gap-4 md:gap-6">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm transition-transform duration-300 hover:scale-110 hover:rotate-[5deg] md:h-12 md:w-12">
                      <span className="material-symbols-outlined text-xl text-primary md:text-2xl">
                        insights
                      </span>
                    </div>

                    <div className="relative flex-1 pr-24 md:pr-32">
                      <h3 className="mb-1 text-base font-bold leading-tight text-on-surface md:text-lg">
                        Help Lumixia improve:
                      </h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant md:text-base">
                        Allow the use of your logs to train Lumixia.{' '}
                        <button
                          className="font-semibold text-primary transition-all hover:underline"
                          type="button"
                        >
                          Learn more
                        </button>
                      </p>

                      <label className="absolute right-0 top-0 flex cursor-pointer select-none items-center gap-3">
                        <input
                          checked={allowTraining}
                          className="sr-only"
                          type="checkbox"
                          onChange={(event) => setAllowTraining(event.target.checked)}
                        />
                        <div
                          className={`relative h-8 w-14 rounded-full transition-colors duration-300 ${
                            allowTraining ? 'bg-primary' : 'bg-surface-variant'
                          }`}
                        >
                          <div
                            className={`absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                              allowTraining ? 'translate-x-6' : 'translate-x-0'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[12px] font-bold text-primary transition-opacity ${
                                allowTraining ? 'opacity-100' : 'opacity-0'
                              }`}
                            >
                              check
                            </span>
                          </div>
                        </div>
                        <span
                          className={`min-w-[44px] rounded-full px-3 py-1 text-center text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                            allowTraining
                              ? 'bg-primary-container text-primary'
                              : 'bg-surface-variant text-on-surface-variant'
                          }`}
                        >
                          {allowTraining ? 'On' : 'Off'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div className="mt-12 flex w-full justify-center" variants={itemVariants}>
                <button
                  className="onboarding-primary-button group relative min-w-[200px] overflow-hidden rounded-xl bg-primary px-12 py-3 text-base font-bold tracking-wide text-white shadow-xl shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-primary/40 active:scale-95 md:min-w-[240px] md:px-16 md:py-4 md:text-lg disabled:cursor-not-allowed disabled:opacity-90"
                  disabled={isPreparingNext || isSubmitting}
                  type="button"
                  onClick={handleContinue}
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    {isPreparingNext && (
                      <svg
                        className="h-5 w-5 animate-spin text-white"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                    {isPreparingNext ? 'Preparing...' : 'Continue'}
                  </span>
                  <div className="onboarding-button-shine pointer-events-none absolute inset-0 h-full w-full" />
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="name"
              className="flex w-full flex-col items-center justify-center px-6"
              custom={direction}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={screenVariants}
            >
              <div className="mx-auto flex max-w-2xl flex-col items-center">
                <motion.div
                  className="mb-16 flex h-40 w-40 items-center justify-center"
                  variants={itemVariants}
                >
                  <div className="relative flex h-24 w-24 items-center justify-center overflow-visible">
                    <img
                      alt="Lumixia Prism"
                      className="h-full w-full object-contain onboarding-logo-spin"
                      src={LOGO_SRC}
                    />
                  </div>
                </motion.div>

                <motion.h1
                  className="mb-12 text-center text-3xl font-extrabold leading-tight tracking-tight text-on-surface md:text-5xl"
                  variants={itemVariants}
                >
                  Before we get started,
                  <br />
                  what should I call you?
                </motion.h1>

                <motion.div
                  className="onboarding-name-input w-full max-w-lg rounded-full border border-transparent p-2 transition-all duration-500 hover:border-primary/30 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10"
                  variants={itemVariants}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center pl-4 text-primary/50">
                      <span className="material-symbols-outlined text-2xl">
                        account_circle
                      </span>
                    </div>

                    <input
                      ref={nameInputRef}
                      className="flex-1 bg-transparent py-3 text-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                      placeholder="Enter your name"
                      type="text"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void handleSubmit();
                        }
                      }}
                    />

                    <button
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                        trimmedName && !isSubmitting
                          ? 'bg-primary text-white shadow-lg shadow-primary/40'
                          : 'bg-surface-container-highest text-on-surface-variant/50'
                      }`}
                      disabled={!trimmedName || isSubmitting}
                      type="button"
                      onClick={() => {
                        void handleSubmit();
                      }}
                    >
                      {isSubmitting ? (
                        <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <span className="material-symbols-outlined text-2xl font-bold">
                          arrow_upward
                        </span>
                      )}
                    </button>
                  </div>
                </motion.div>

                <AnimatePresence initial={false}>
                  {hasStartedSubmit && (
                    <motion.div
                      key="onboarding-feedback"
                      className="mt-8 text-xs font-bold uppercase tracking-widest text-primary"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{
                        duration: 0.28,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      Dashboard Initializing...
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.p
                  className="mt-5 text-sm text-on-surface-variant"
                  variants={itemVariants}
                >
                  Signed in as <span className="font-semibold text-on-surface">{email}</span>
                </motion.p>

                {errorMessage && (
                  <motion.p
                    className="mt-4 text-center text-sm font-medium text-error"
                    role="alert"
                    variants={itemVariants}
                  >
                    {errorMessage}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};
