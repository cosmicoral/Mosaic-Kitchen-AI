import type { PaidTier, Tier } from '../types';

export type Interval = 'month' | 'year';

export interface PlanFeature {
  text: string;
  // Marked, not omitted. Someone deciding whether to pay is entitled to know
  // which lines they can use today and which they are waiting for — an
  // unmarked promise of a feature that does not exist is what refunds and
  // chargebacks are made of.
  // Not "coming soon" — that says only that it is absent. Photographing a
  // fridge is a phone action, so this lives in the iOS app rather than in a
  // browser, and saying so tells the reader whether waiting for it is
  // relevant to them.
  ios?: boolean;
}

export interface PlanCopy {
  tier: Tier;
  name: string;
  tagline: string;
  // Display prices live here rather than being read back from Stripe: a page
  // that cannot render until an API call returns is a page that shows a
  // spinner where its price should be. The amounts here and the amounts in
  // Stripe must be changed together.
  price: Record<Interval, string>;
  cadence: Record<Interval, string>;
  features: PlanFeature[];
  cta: string;
}

export const PLAN_COPY: PlanCopy[] = [
  {
    tier: 'free',
    name: 'Free',
    tagline: 'Enough to see whether it cooks the way you do.',
    price: { month: '£0', year: '£0' },
    cadence: { month: 'forever', year: 'forever' },
    features: [
      { text: '1 household member' },
      { text: '2 AI meal plans a month' },
      { text: 'Up to 7 meals per plan' },
      { text: '3 cook-from-your-pantry suggestions a month' },
      { text: '2 plan translations between English and Chinese a month' },
      { text: 'Unlimited pantry, shopping lists and expiry alerts' },
    ],
    cta: 'Start free',
  },
  {
    tier: 'plus',
    name: 'Plus',
    tagline: 'For two people cooking together.',
    price: { month: '£7.99', year: '£89.99' },
    cadence: { month: 'per month', year: 'per year' },
    features: [
      { text: '2 household members, each with their own restrictions' },
      { text: '10 AI meal plans a month' },
      { text: 'Up to 14 meals per plan' },
      { text: '30 cook-from-your-pantry suggestions a month' },
      { text: '20 plan translations between English and Chinese a month' },
      { text: '30 camera scans a month', ios: true },
    ],
    cta: 'Choose Plus',
  },
  {
    tier: 'pro',
    name: 'Pro',
    tagline: 'For a full household, three meals a day.',
    price: { month: '£12.99', year: '£129.99' },
    cadence: { month: 'per month', year: 'per year' },
    features: [
      { text: '6 household members' },
      { text: '30 AI meal plans a month' },
      { text: 'Up to 21 meals per plan — breakfast, lunch and dinner' },
      { text: '100 cook-from-your-pantry suggestions a month' },
      { text: '60 plan translations between English and Chinese a month' },
      { text: '150 camera scans a month', ios: true },
    ],
    cta: 'Choose Pro',
  },
];

// Two months free, which is why the annual figure is ten times the monthly one
// rather than twelve.
export const ANNUAL_SAVING_LABEL = 'Save 2 months';

export function isPaidTier(tier: Tier): tier is PaidTier {
  return tier !== 'free';
}

export const TIER_LABELS: Record<Tier, string> = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
};
