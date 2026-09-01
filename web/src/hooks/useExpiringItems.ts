import { useCallback, useEffect, useState } from 'react';
import { fetchExpiringItems } from '../lib/pantry';
import type { PantryItem } from '../types';

type ExpiryStatus = 'loading' | 'ready' | 'error';

export function useExpiringItems(withinDays = 7) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [status, setStatus] = useState<ExpiryStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setItems(await fetchExpiringItems(withinDays));
      setStatus('ready');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load expiry alerts');
      setStatus('error');
    }
  }, [withinDays]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, status, error, refresh };
}
