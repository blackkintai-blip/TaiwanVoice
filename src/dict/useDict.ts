import { useCallback, useEffect, useState } from 'react';

export function useDict() {
  const [dict, setDict] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);

  const reload = useCallback(() => setGeneration((g) => g + 1), []);

  useEffect(() => {
    let cancelled = false;
    setDict(null);
    setError(false);
    fetch('/dict/zhuyin-dict.json')
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setDict(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [generation]);

  return { dict, error, reload };
}
