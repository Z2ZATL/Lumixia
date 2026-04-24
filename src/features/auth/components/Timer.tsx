import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { TimerProps } from '../types';
import { useTimer } from '../hooks/useTimer';

export const Timer: React.FC<TimerProps> = ({
  duration = 60,
  onResend,
  isDisabled = false,
  resendLabel = 'Resend email',
}) => {
  const { timeLeft, isActive, progress, reset } = useTimer(duration);

  const handleResend = async () => {
    if (isDisabled) {
      return;
    }

    const didResend = await onResend?.();

    if (didResend === false) {
      return;
    }

    reset();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence mode="wait" initial={false}>
        {isActive ? (
          <motion.div
            key="timer"
            className="w-full"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary"
                animate={{ width: `${progress}%` }}
                initial={false}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm font-medium">
              <span className="text-on-surface-variant">Resend in {formatTime(timeLeft)}</span>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="resend"
            className="text-sm font-bold text-primary transition-colors hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={handleResend}
            disabled={isDisabled}
            type="button"
          >
            {resendLabel}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
