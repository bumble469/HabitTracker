import { useEffect, useState } from 'react';
import { getRisk } from '../services/habitApi';

export default function usePredictions({
  token,
  habits,
  enabled,
  active = true,
  revision = 0,
}) {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    if (!enabled || !active || !token || !habits.length) {
      setResults({});
      setLoading(false);
      setError(null);
      return () => controller.abort();
    }

    let activeRequest = true;
    setResults({});
    setLoading(true);
    setError(null);
    getRisk(token, controller.signal)
      .then((risk) => {
        if (!activeRequest) return;
        setResults(
          Object.fromEntries(
            risk.map((item) => [
              item.habit_id,
              item.risk === null
                ? {
                    unavailable: true,
                    level: item.level,
                    reason:
                      item.reasons.join('; ') ||
                      'This habit needs about two weeks of history before it can be scored.',
                  }
                : {
                    probability: item.risk,
                    level: item.level,
                    reason:
                      item.reasons.join('; ') ||
                      'The model found no elevated risk signals.',
                  },
            ])
          )
        );
      })
      .catch((requestError) => {
        if (activeRequest && requestError.name !== 'AbortError')
          setError(requestError.message);
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });

    return () => {
      activeRequest = false;
      controller.abort();
    };
  }, [token, habits, enabled, active, revision, retryToken]);

  return {
    results,
    loading,
    error,
    retry: () => setRetryToken((value) => value + 1),
  };
}
