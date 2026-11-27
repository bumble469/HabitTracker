import { useEffect, useState } from 'react';
import { dateKeyInTimezone } from '../utils/dates';

export default function useLocalDate(timezone = 'UTC') {
  const [today, setToday] = useState(() => dateKeyInTimezone(new Date(), timezone));
  useEffect(() => {
    const refresh = () => {
      setToday(dateKeyInTimezone(new Date(), timezone));
    };
    refresh();
    // A short interval also handles account midnight and daylight saving
    // changes without calculating offsets from the browser's timezone.
    const timer = setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [timezone]);
  return today;
}
