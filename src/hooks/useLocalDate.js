import { useEffect, useState } from 'react';
import { toDateKey } from '../utils/insights';

export default function useLocalDate() {
  const [today, setToday] = useState(() => toDateKey());
  useEffect(() => {
    let timer;
    const refresh = () => {
      setToday(toDateKey());
      clearTimeout(timer);
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 25);
    };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
