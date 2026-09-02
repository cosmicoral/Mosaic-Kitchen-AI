import 'dotenv/config';
import Stripe from 'stripe';

// Constructed lazily so importing this module — which the test suite does
// transitively through the route table — does not require Stripe credentials
// to be present. Only code that actually talks to Stripe needs them.
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set');

  client = new Stripe(secretKey, {
    // No apiVersion pinned here on purpose. The SDK ships pinned to the
    // version its own types were generated against; overriding that with a
    // string the types do not match produces a client that compiles but
    // returns fields the code does not expect. Pin the account default in the
    // Dashboard instead, and move it by upgrading the SDK.
    maxNetworkRetries: 2,
    timeout: 20_000,
  });

  return client;
}

export function webhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}
