import * as subscriptionRepository from '../repositories/subscriptionRepository.ts';
import * as userRepository from '../repositories/userRepository.ts';
import { stripe, webhookSecret } from './stripe.ts';
import { entitlementsFor, isKnownPriceId, tierFor } from './entitlements.ts';
import { AppError } from '../types/index.ts';
import type { Entitlements, Tier } from './entitlements.ts';
import type Stripe from 'stripe';

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:5173';
}

export interface BillingStatus {
  tier: Tier;
  entitlements: Entitlements;
  status: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}

export async function getStatus(userId: string): Promise<BillingStatus> {
  const subscription = await subscriptionRepository.findActiveByUser(userId);
  const tier = tierFor(
    subscription?.status ?? null,
    subscription?.stripe_price_id ?? null
  );

  return {
    tier,
    entitlements: entitlementsFor(tier),
    status: subscription?.status ?? null,
    current_period_end: subscription?.current_period_end ?? null,
    cancel_at_period_end: subscription?.cancel_at_period_end ?? false,
  };
}

export async function getTier(userId: string): Promise<Tier> {
  const subscription = await subscriptionRepository.findActiveByUser(userId);
  return tierFor(subscription?.status ?? null, subscription?.stripe_price_id ?? null);
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string
): Promise<string> {
  // The price id arrives from the browser. Without this check anyone could
  // post the id of a 1p test price — or of a price belonging to a different
  // Stripe account — and subscribe at that rate.
  if (!isKnownPriceId(priceId)) {
    throw new AppError('Unknown plan', 'VALIDATION_ERROR');
  }

  const existing = await subscriptionRepository.findActiveByUser(userId);
  if (existing) {
    // Sending them through Checkout again would create a second subscription
    // and bill them twice. Changing plans is the customer portal's job.
    throw new AppError('You already have a subscription', 'ALREADY_SUBSCRIBED');
  }

  const customerId = await userRepository.findStripeCustomerId(userId);

  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],

    // Reuse the customer when we have one, so a returning user keeps a single
    // billing history instead of accumulating duplicate Stripe customers.
    ...(customerId ? { customer: customerId } : { customer_email: email }),

    // The only link between a Stripe customer and our user the first time
    // round. Set in two places because checkout sessions and subscriptions are
    // separate objects and the webhooks we handle arrive on both.
    client_reference_id: userId,
    subscription_data: { metadata: { user_id: userId } },

    billing_address_collection: 'required',
    allow_promotion_codes: true,

    // Both land on the same page. The query flag only tells it to wait for the
    // webhook rather than trusting the redirect, which anyone can visit.
    success_url: `${appUrl()}/subscription?checkout=success`,
    cancel_url: `${appUrl()}/subscription?checkout=cancelled`,
  });

  if (!session.url) throw new AppError('Could not start checkout', 'BILLING_ERROR');
  return session.url;
}

export async function createPortalSession(userId: string): Promise<string> {
  const customerId = await userRepository.findStripeCustomerId(userId);
  if (!customerId) throw new AppError('No billing account yet', 'NOT_FOUND');

  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl()}/subscription`,
  });
  return session.url;
}

// Stripe moved current_period_end from the subscription onto its items in the
// 2025-03-31 API version. Reading the item first and falling back to the top
// level keeps this correct across both, instead of silently writing an epoch
// date that would read as an expired subscription.
function periodEndOf(subscription: Stripe.Subscription): Date {
  const item = subscription.items.data[0] as
    | { current_period_end?: number }
    | undefined;

  const seconds =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end;

  if (typeof seconds !== 'number') {
    throw new Error(`No period end on subscription ${subscription.id}`);
  }
  return new Date(seconds * 1000);
}

// The webhook tells us *that* something changed; the API tells us what the
// state now is. Re-fetching rather than trusting the event payload makes
// out-of-order delivery harmless: two events arriving backwards both write the
// same current truth, instead of the older one overwriting the newer.
async function syncFromStripe(stripeSubscriptionId: string): Promise<void> {
  const subscription = await stripe().subscriptions.retrieve(stripeSubscriptionId);

  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

  const existingUser = await userRepository.findByStripeCustomerId(customerId);

  // First time through, the customer id is not on the user row yet. Recover
  // the user from the metadata set at checkout, then attach it so every later
  // webhook resolves by customer id alone.
  let userId = existingUser?.id;
  if (!userId) {
    const fromMetadata = subscription.metadata.user_id;
    if (!fromMetadata) {
      console.error(`Subscription ${subscription.id} has no user_id metadata`);
      return;
    }
    userId = fromMetadata;
    await userRepository.setStripeCustomerId(userId, customerId);
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error(`Subscription ${subscription.id} has no price`);
    return;
  }

  await subscriptionRepository.upsert({
    userId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    status: subscription.status,
    currentPeriodEnd: periodEndOf(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  // Throws on a bad signature, which is exactly right: an unsigned request is
  // not from Stripe and must never reach a handler. The signature is the only
  // authentication this endpoint has.
  const event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret());

  const isNew = await subscriptionRepository.recordEventIfNew(event.id, event.type);
  if (!isNew) return;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      if (typeof session.subscription === 'string') {
        await syncFromStripe(session.subscription);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await syncFromStripe(event.data.object.id);
      break;
    }

    case 'invoice.payment_failed': {
      // Nothing to revoke here: Stripe retries a failed card for about two
      // weeks on its own, and if it ultimately gives up the status change
      // arrives as a customer.subscription.updated.
      console.warn('Stripe payment failed for customer', event.data.object.customer);
      break;
    }

    default:
      break;
  }
}
