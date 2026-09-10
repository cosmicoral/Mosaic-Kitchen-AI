import { apiFetch } from './api';
import type { BillingStatus, PlansResponse } from '../types';

export async function fetchPlans(): Promise<PlansResponse> {
  return apiFetch<PlansResponse>('/api/billing/plans');
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  return apiFetch<BillingStatus>('/api/billing/status');
}

// Returns Stripe's hosted URL rather than redirecting here, so the caller can
// keep its button in a loading state right up to the moment the browser
// leaves — otherwise the page looks frozen for the second the call takes.
/**
 * `waiveCancellationRight` is passed explicitly rather than defaulted, and the
 * server rejects the call without it. It is the customer's acknowledgement
 * that their subscription starts immediately and that this costs them the
 * statutory 14-day right to cancel — so the one thing this argument must never
 * be is implicit. `locale` records which of the two translations of that
 * sentence they were actually shown.
 */
export async function startCheckout(
  priceId: string,
  waiveCancellationRight: boolean,
  locale: string
): Promise<string> {
  const data = await apiFetch<{ url: string }>('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({
      price_id: priceId,
      waive_cancellation_right: waiveCancellationRight,
      locale,
    }),
  });
  return data.url;
}

export async function openBillingPortal(): Promise<string> {
  const data = await apiFetch<{ url: string }>('/api/billing/portal', {
    method: 'POST',
  });
  return data.url;
}
