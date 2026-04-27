import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useCallback, useRef, useState } from 'react';

interface UseOtpInputReturn {
  otp: string[];
  setInputRef: (index: number) => (element: HTMLInputElement | null) => void;
  handleChange: (index: number, value: string) => void;
  handleKeyDown: (index: number, event: KeyboardEvent<HTMLInputElement>) => void;
  handlePaste: (index: number, event: ClipboardEvent<HTMLInputElement>) => void;
  reset: () => void;
  isComplete: boolean;
  focusInput: (index: number) => void;
}

export function useOtpInput(length: number = 6): UseOtpInputReturn {
  const [otp, setOtp] = useState<string[]>(Array.from({ length }, () => ''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isComplete = otp.every((digit) => digit.length === 1);

  const setInputRef = useCallback(
    (index: number) => (element: HTMLInputElement | null) => {
      otpRefs.current[index] = element;
    },
    [],
  );

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      window.requestAnimationFrame(() => {
        otpRefs.current[index]?.focus();
        otpRefs.current[index]?.select();
      });
    }
  }, [length]);

  const fillDigitsFromIndex = useCallback((index: number, rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, length - index).split('');

    if (digits.length === 0) {
      return;
    }

    setOtp((prev) => {
      const nextOtp = [...prev];

      digits.forEach((digit, offset) => {
        nextOtp[index + offset] = digit;
      });

      return nextOtp;
    });

    const nextFocusIndex = Math.min(index + digits.length, length - 1);
    focusInput(nextFocusIndex);
  }, [focusInput, length]);

  const handleChange = useCallback((index: number, value: string) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length === 0) {
      setOtp((prev) => {
        if (!prev[index]) {
          return prev;
        }

        const nextOtp = [...prev];
        nextOtp[index] = '';
        return nextOtp;
      });
      return;
    }

    if (digits.length > 1) {
      fillDigitsFromIndex(index, digits);
      return;
    }

    setOtp((prev) => {
      const nextOtp = [...prev];
      nextOtp[index] = digits;
      return nextOtp;
    });

    if (index < length - 1) {
      focusInput(index + 1);
    }
  }, [fillDigitsFromIndex, focusInput, length]);

  const handleKeyDown = useCallback((index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault();

      if (otp[index]) {
        setOtp((prev) => {
          const nextOtp = [...prev];
          nextOtp[index] = '';
          return nextOtp;
        });
        return;
      }

      if (index > 0) {
        setOtp((prev) => {
          const nextOtp = [...prev];
          nextOtp[index - 1] = '';
          return nextOtp;
        });
        focusInput(index - 1);
      }

      return;
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
      return;
    }

    if (
      event.key.length === 1 &&
      !/^\d$/.test(event.key) &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
    }
  }, [focusInput, length, otp]);

  const handlePaste = useCallback((index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fillDigitsFromIndex(index, event.clipboardData.getData('text'));
  }, [fillDigitsFromIndex]);

  const reset = useCallback(() => {
    setOtp(Array.from({ length }, () => ''));
    focusInput(0);
  }, [focusInput, length]);

  return {
    otp,
    setInputRef,
    handleChange,
    handleKeyDown,
    handlePaste,
    reset,
    isComplete,
    focusInput,
  };
}
