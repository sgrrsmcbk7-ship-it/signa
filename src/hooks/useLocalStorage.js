import { useCallback, useEffect, useState } from 'react';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

/** Object state persisted to localStorage (merged with defaults so new keys appear). */
export function useLocalStorage(key, defaults) {
  const [value, setValue] = useState(() => read(key, defaults));
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* private mode / storage blocked — settings just won't persist */
    }
  }, [key, value]);
  const patch = useCallback((p) => setValue((v) => ({ ...v, ...(typeof p === 'function' ? p(v) : p) })), []);
  return [value, patch, setValue];
}
