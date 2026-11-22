import { useCallback, useRef, useState } from 'react';

/** Retains the original storage keys and handles consecutive functional updates. */
export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      const value = item === null ? initialValue : JSON.parse(item);
      if (Array.isArray(initialValue))
        return Array.isArray(value) ? value : initialValue;
      if (typeof initialValue === 'boolean')
        return typeof value === 'boolean' ? value : initialValue;
      return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : initialValue;
    } catch {
      return initialValue;
    }
  });
  const latest = useRef(storedValue);
  const [storageError, setStorageError] = useState(null);
  const setValue = useCallback(
    (value) => {
      const next = typeof value === 'function' ? value(latest.current) : value;
      latest.current = next;
      setStoredValue(next);
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
        setStorageError(null);
      } catch {
        setStorageError(
          'Your browser could not save the latest change. Export a backup before closing this tab.'
        );
      }
    },
    [key]
  );
  return [storedValue, setValue, storageError];
}
