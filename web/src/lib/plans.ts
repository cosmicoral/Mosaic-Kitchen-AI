import type { PaidTier, Tier } from '../types';

export type Interval = 'month' | 'year';

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
  features: string[];
  cta: string;
}

export const PLAN_COPY: PlanCopy[] = [
  {
    tier: 'free',
    name: 'Free',
    tagline: 'Enough to cook from, for one person.',
    price: { month: '£0', year: '£0' },
    cadence: { month: 'forever', year: 'forever' },
    features: [
      '1 household member',
      '2 AI meal plans a month',
      '3 camera scans a month',
      'Unlimited pantry, shopping lists and expiry alerts',
    ],
    cta: 'Start free',
  },
  {
    tier: 'plus',
    name: 'Plus',
    tagline: 'For two people cooking together.',
    price: { month: '£6.99', year: '£69.99' },
    cadence: { month: 'per month', year: 'per year' },
    features: [
      '2 household members, each with their own restrictions',
      '10 AI meal plans a month',
      'Up to 14 meals per plan',
      '30 camera scans a month',
    ],
    cta: 'Choose Plus',
  },
  {
    tier: 'pro',
    name: 'Pro',
    tagline: 'For a full household, three meals a day.',
    price: { month: '£11.99', year: '£119.99' },
    cadence: { month: 'per month', year: 'per year' },
    features: [
      '6 household members',
      '30 AI meal plans a month',
      'Up to 21 meals per plan — breakfast, lunch and dinner',
      '150 camera scans a month',
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
