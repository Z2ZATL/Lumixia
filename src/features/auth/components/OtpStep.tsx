import React, { useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import type { OtpStepProps } from '../types';
import { useOtpInput } from '../hooks/useOtpInput';
import { childVariants, staggerContainer } from '../config/animations';
import { OtpInputGroup } from './OtpInputGroup';
import { Timer } from './Timer';

const ArrowBackIcon: React.FC = () => (
  <span className="material-symbols-outlined text-xl transition-transform group-hover:-translate-x-1">
    arrow_back
  </span>
);

export const OtpStep: React.FC<OtpStepProps> = ({
  email,
  onBack,
  onVerify,
  onResend,
  timerDuration = 60,
  isDisabled = false,
  isResendDisabled = false,
  errorMessage = null,
  statusMessage = null,
  verifyLabel = 'Enter verification code',
  resendLabel = 'Resend email',
}) => {
  const otpLabelId = useId();
  const {
    otp,
    setInputRef,
    handleChange,
    handleKeyDown,
    handlePaste,
    reset: resetOtp,
    isComplete,
    focusInput,
  } = useOtpInput(6);

  useEffect(() => {
    focusInput(0);
  }, [focusInput]);

  const handleVerify = () => {
    if (isDisabled || !isComplete) {
      return;
    }

    onVerify(otp.join(''));
  };

  const handleResend = async () => {
    if (!onResend || isDisabled || isResendDisabled) {
      return false;
    }

    const didResend = await onResend();

    if (didResend !== false) {
      resetOtp();
      focusInput(0);
    }

    return didResend;
  };

  return (
    <motion.div
      className={isDisabled ? 'pointer-events-none' : undefined}
      variants={staggerContainer}
    >
      <motion.button
        className="group mb-8 flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onBack}
        variants={childVariants}
        disabled={isDisabled}
        type="button"
      >
        <ArrowBackIcon />
        <span className="text-sm font-semibold">Use a different email</span>
      </motion.button>

      <motion.div className="mb-10" variants={childVariants}>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-on-surface lg:text-5xl">
          Check your mail
        </h1>
        <p className="text-lg leading-relaxed text-on-surface-variant">
          We've sent a temporary login code to <br className="hidden sm:block" />
          <span className="font-bold text-on-surface">{email}</span>
        </p>
      </motion.div>

      <div className="space-y-8">
        <motion.div variants={childVariants}>
          <label
            id={otpLabelId}
            className="mb-4 block px-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant"
          >
            Verification Code
          </label>
          <OtpInputGroup
            otp={otp}
            labelId={otpLabelId}
            isDisabled={isDisabled}
            setInputRef={setInputRef}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
          />
        </motion.div>

        <motion.div className="space-y-4" variants={childVariants}>
          <button
            className="w-full rounded-xl bg-primary py-4 font-bold text-on-primary shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleVerify}
            disabled={!isComplete || isDisabled}
            type="button"
          >
            {verifyLabel}
          </button>
          <Timer
            duration={timerDuration}
            onResend={handleResend}
            isDisabled={isResendDisabled}
            resendLabel={resendLabel}
          />
          {statusMessage && (
            <p className="text-center text-sm font-medium text-primary" role="status">
              {statusMessage}
            </p>
          )}
          {errorMessage && (
            <p className="text-center text-sm font-medium text-error" role="alert">
              {errorMessage}
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};
