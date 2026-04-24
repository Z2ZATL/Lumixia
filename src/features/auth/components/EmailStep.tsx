import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { EmailStepProps } from '../types';
import { childVariants, staggerContainer } from '../config/animations';

const SHAKE_DURATION_MS = 300;
const ERROR_STATE_DURATION_MS = 2000;

const GoogleIcon: React.FC = () => (
  <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const EmailStep: React.FC<EmailStepProps> = ({
  onSubmitEmail,
  onGoogleSignIn,
  isDisabled = false,
  isGoogleDisabled = false,
  errorMessage = null,
  googleLabel = 'Continue with Google',
  submitLabel = 'Continue with Email',
}) => {
  const [email, setEmail] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const timeoutsRef = useRef<number[]>([]);
  const activeErrorMessage =
    errorMessage || (hasError ? 'Please enter a valid email address to continue.' : null);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const clearFeedbackTimers = () => {
    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    timeoutsRef.current = [];
  };

  const triggerErrorFeedback = () => {
    clearFeedbackTimers();
    setIsShaking(true);
    setHasError(true);

    timeoutsRef.current.push(window.setTimeout(() => {
      setIsShaking(false);
    }, SHAKE_DURATION_MS));

    timeoutsRef.current.push(window.setTimeout(() => {
      setHasError(false);
    }, ERROR_STATE_DURATION_MS));
  };

  const handleSubmit = () => {
    if (isDisabled) {
      return;
    }

    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      triggerErrorFeedback();
      return;
    }

    clearFeedbackTimers();
    onSubmitEmail(trimmedEmail);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div variants={staggerContainer}>
      <motion.div className="mb-12" variants={childVariants}>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
          Begin Your Experience
        </h1>
        <p className="text-lg text-on-surface-variant">
          Access your intelligent workspace.
        </p>
      </motion.div>

      <div className="space-y-6">
        <motion.button
          className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-lowest py-4 shadow-sm transition-all hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-60"
          variants={childVariants}
          disabled={isDisabled || isGoogleDisabled}
          type="button"
          onClick={() => {
            void onGoogleSignIn?.();
          }}
        >
          <span className="flex items-center justify-center gap-3">
            <GoogleIcon />
            <span className="font-semibold text-on-surface">{googleLabel}</span>
          </span>
        </motion.button>

        <motion.div className="flex items-center gap-4 text-outline/30" variants={childVariants}>
          <div className="h-px w-full bg-outline-variant/50" />
          <span className="whitespace-nowrap text-xs font-bold tracking-widest text-on-surface-variant">
            OR
          </span>
          <div className="h-px w-full bg-outline-variant/50" />
        </motion.div>

        <motion.div className="space-y-4" variants={childVariants}>
          <div>
            <label
              htmlFor="auth-email"
              className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
            >
              Email Address
            </label>
            <div className={isShaking ? 'animate-auth-shake' : undefined}>
              <input
                id="auth-email"
                className={`focus-ring-premium w-full rounded-xl border bg-surface-container-lowest px-4 py-4 text-on-surface shadow-sm transition-all placeholder:text-outline/60 focus:outline-none ${
                  activeErrorMessage ? 'border-error' : 'border-outline-variant/40'
                }`}
                autoComplete="email"
                aria-describedby={activeErrorMessage ? 'auth-email-error' : undefined}
                aria-invalid={Boolean(activeErrorMessage)}
                placeholder="name@lumixia.io"
                type="email"
                value={email}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setEmail(nextValue);

                  if (hasError && validateEmail(nextValue)) {
                    clearFeedbackTimers();
                    setHasError(false);
                    setIsShaking(false);
                  }
                }}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
              />
            </div>
            <p
              id="auth-email-error"
              className={activeErrorMessage ? 'mt-3 px-1 text-sm font-medium text-error' : 'sr-only'}
              role="alert"
            >
              {activeErrorMessage || ''}
            </p>
          </div>

          <motion.button
            className="w-full rounded-xl bg-primary py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isDisabled}
            type="button"
          >
            {submitLabel}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};
