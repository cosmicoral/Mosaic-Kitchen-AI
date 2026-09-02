import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchBillingStatus } from '../lib/billing';
import type { BillingStatus } from '../types';

type Status = 'loading' | 'ready' | 'error';

export function useBilling() {
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);

  // Guards the poll below against setting state after the page has gone.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchBillingStatus();
      if (!mounted.current) return next;
      setBilling(next);
      setStatus('ready');
      return next;
    } catch (caught) {
      if (!mounted.current) return null;
      setError(caught instanceof Error ? caught.message : 'Could not load your plan');
      setStatus('error');
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Stripe redirects the browser back the instant the card is accepted, but
  // the webhook that actually records the subscription is a separate request
  // that can land a second or two later. Reading the status once on arrival
  // would show a paying customer the free tier and a broken-looking upgrade
  // button. Polling briefly is the honest fix; the alternative — trusting the
  // redirect and marking them paid client-side — is trusting a URL anyone can
  // visit.
  const waitForUpgrade = useCallback(
    async (attempts = 6, delayMs = 1500) => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const next = await refresh();
        if (next && next.tier !== 'free') return next;
        if (!mounted.current) return null;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return refresh();
    },
    [refresh]
  );

  return { billing, status, error, refresh, waitForUpgrade };
}
