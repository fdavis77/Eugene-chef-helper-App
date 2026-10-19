import { useState, useEffect, useRef, Dispatch, SetStateAction } from 'react';
import { loadFromSupabase, saveToSupabase } from '../utils/supabase';

export function usePersistentState<T>(key: string, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      return storedValue ? JSON.parse(storedValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const isInitialized = useRef(false);

  // On first mount, fetch from Supabase and merge if newer than localStorage
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    loadFromSupabase<T>(key).then((remoteValue) => {
      if (remoteValue !== null) {
        setState(remoteValue);
        try {
          window.localStorage.setItem(key, JSON.stringify(remoteValue));
        } catch {}
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Write-through: localStorage is fast, Supabase is async best-effort
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {}
    saveToSupabase(key, state);
  }, [key, state]);

  return [state, setState];
}
