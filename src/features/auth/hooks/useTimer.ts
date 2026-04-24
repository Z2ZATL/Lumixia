import { useCallback, useEffect, useState } from 'react';

interface UseTimerReturn {
  timeLeft: number;
  isActive: boolean;
  isExpired: boolean;
  progress: number;
  reset: () => void;
}

const getNow = () => Date.now();

export function useTimer(duration: number = 60): UseTimerReturn {
  const [deadline, setDeadline] = useState<number>(() => getNow() + duration * 1000);
  const [now, setNow] = useState<number>(() => getNow());

  const remainingMs = Math.max(deadline - now, 0);
  const timeLeft = Math.ceil(remainingMs / 1000);
  const progress = Math.max((remainingMs / (duration * 1000)) * 100, 0);
  const isExpired = remainingMs <= 0;

  useEffect(() => {
    const nextNow = getNow();
    setNow(nextNow);
    setDeadline(nextNow + duration * 1000);
  }, [duration]);

  useEffect(() => {
    if (isExpired) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(getNow());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [deadline, isExpired]);

  const reset = useCallback(() => {
    const nextNow = getNow();
    setNow(nextNow);
    setDeadline(nextNow + duration * 1000);
  }, [duration]);

  return { timeLeft, isActive: !isExpired, isExpired, progress, reset };
}
