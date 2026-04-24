import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ReviewGateProps } from '../types';
import { childVariants, staggerContainer } from '../config/animations';

const TERMS_LINKS = [
  { label: 'Terms of Service', href: '#' },
  { label: 'Privacy Policy', href: '#' },
];

export const ReviewGate: React.FC<ReviewGateProps> = ({
  email,
  onContinue,
  onUseDifferentEmail,
  isSubmitting = false,
  errorMessage = null,
}) => {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasOptedIntoPromos, setHasOptedIntoPromos] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const shakeTimeoutRef = useRef<number | null>(null);

  const emailLabel = useMemo(() => email.trim(), [email]);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        window.clearTimeout(shakeTimeoutRef.current);
      }
    };
  }, []);

  const handleContinue = async () => {
    if (isSubmitting) {
      return;
    }

    if (!hasAcceptedTerms) {
      if (shakeTimeoutRef.current) {
        window.clearTimeout(shakeTimeoutRef.current);
      }

      setShouldShake(true);
      shakeTimeoutRef.current = window.setTimeout(() => {
        setShouldShake(false);
        shakeTimeoutRef.current = null;
      }, 400);
      return;
    }

    await onContinue({ promoOptIn: hasOptedIntoPromos });
  };

  return (
    <motion.div variants={staggerContainer}>
      <motion.div className="mb-8" variants={childVariants}>
        <h1 className="mb-3 text-5xl font-extrabold tracking-tight text-on-surface">
          Let&apos;s create your account
        </h1>
        <p className="text-lg font-medium text-on-surface-variant">
          A few things for you to review
        </p>
      </motion.div>

      <div className="space-y-6">
        <motion.div
          className={`rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm ${
            shouldShake ? 'animate-auth-shake' : ''
          }`}
          variants={childVariants}
        >
          <div className="space-y-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                className="mt-1 h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                checked={hasAcceptedTerms}
                disabled={isSubmitting}
                type="checkbox"
                onChange={(event) => setHasAcceptedTerms(event.target.checked)}
              />
              <span className="text-sm leading-relaxed text-on-surface-variant">
                I agree to Lumixia&apos;s{' '}
                {TERMS_LINKS.map((link, index) => (
                  <React.Fragment key={link.label}>
                    {index > 0 && ' and '}
                    <a
                      className="font-semibold underline hover:text-primary"
                      href={link.href}
                      onClick={(event) => event.preventDefault()}
                    >
                      {link.label}
                    </a>
                  </React.Fragment>
                ))}
                .
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                className="mt-1 h-5 w-5 rounded border-outline-variant text-primary focus:ring-primary"
                checked={hasOptedIntoPromos}
                disabled={isSubmitting}
                type="checkbox"
                onChange={(event) => setHasOptedIntoPromos(event.target.checked)}
              />
              <span className="text-sm leading-relaxed text-on-surface-variant">
                Subscribe to exclusive ecosystem updates and elite promotional
                emails. You can opt out any time.
              </span>
            </label>
          </div>
        </motion.div>

        <motion.button
          className="w-full rounded-xl bg-primary py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          variants={childVariants}
          disabled={isSubmitting}
          type="button"
          onClick={handleContinue}
        >
          {isSubmitting ? 'Creating Elite Account...' : 'Create Elite Account'}
        </motion.button>

        <motion.div className="space-y-2 text-center" variants={childVariants}>
          <p className="text-xs font-medium text-on-surface-variant">
            Email verified as{' '}
            <span className="font-bold text-on-surface">{emailLabel}</span>
          </p>
          <button
            className="text-xs font-bold text-primary transition-all hover:text-primary/80 hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            type="button"
            onClick={onUseDifferentEmail}
          >
            Use a different email
          </button>
        </motion.div>

        {errorMessage && (
          <motion.p
            className="text-center text-sm font-medium text-error"
            role="alert"
            variants={childVariants}
          >
            {errorMessage}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};
