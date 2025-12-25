import { useEffect, useRef, useState } from 'react';

const IDLE_MS = 10 * 60 * 1000; // 10 minutes
const WARNING_SECONDS = 25;

export function useIdleTimer(onLogout: () => void, enabled = true) {
  const [open, setOpen] = useState(false);
  const [counter, setCounter] = useState(WARNING_SECONDS);
  const timeoutRef = useRef<number>();
  const intervalRef = useRef<number>();
  const openRef = useRef(false);

  const reset = (fromStorage = false) => {
    setOpen(false);
    openRef.current = false;
    setCounter(WARNING_SECONDS);
    window.clearTimeout(timeoutRef.current);
    window.clearInterval(intervalRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setOpen(true);
      openRef.current = true;
      intervalRef.current = window.setInterval(() => {
        setCounter((c) => {
          if (c <= 1) {
            onLogout();
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }, IDLE_MS);
    if (!fromStorage) {
      localStorage.setItem('lastActiveAt', Date.now().toString());
    }
  };

  const handleActivity = () => {
    if (openRef.current || !enabled) return;
    reset();
  };

  useEffect(() => {
    if (!enabled) return;
    reset();
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange'];
    events.forEach((e) => window.addEventListener(e, handleActivity));
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'lastActiveAt') {
        reset(true);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      window.removeEventListener('storage', onStorage);
      window.clearTimeout(timeoutRef.current);
      window.clearInterval(intervalRef.current);
    };
  }, [enabled]);

  const continueSession = () => reset();

  const manualLogout = () => {
    window.clearInterval(intervalRef.current);
    onLogout();
  };

  return { open, counter, continueSession, manualLogout };
}
