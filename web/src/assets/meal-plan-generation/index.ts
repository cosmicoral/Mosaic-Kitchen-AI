import { aiScanMascot } from '../mascots';
import type { GenerationStage } from '../../lib/mealPlanStream';

// Resolved by glob rather than by static imports, so a missing illustration
// degrades to the existing mascot instead of breaking the build.
const files = import.meta.glob<{ default: string }>('./*.webp', {
  eager: true,
});

function pose(name: string): string {
  return files[`./${name}.webp`]?.default ?? aiScanMascot;
}

export const chefPlanningTablet = pose('chef-planning-tablet');
export const chefWashing = pose('chef-washing');
export const chefChopping = pose('chef-chopping');
export const chefStirFry = pose('chef-stir-fry');
export const chefStirringPot = pose('chef-stirring-pot');
export const chefSeasoning = pose('chef-seasoning');
export const chefTasting = pose('chef-tasting');
export const chefPlating = pose('chef-plating');

export const ALL_POSES = [
  chefPlanningTablet,
  chefWashing,
  chefChopping,
  chefStirFry,
  chefStirringPot,
  chefSeasoning,
  chefTasting,
  chefPlating,
];

export type GenerationVariant = 'weekly' | 'pantry';

export interface PoseSet {
  stages: Record<GenerationStage, string>;
  // Cycled inside the one long stage rather than mapped to stages of their
  // own. The model call is a single operation running for twenty to sixty
  // seconds, so showing two poses during it is the same as a spinner having
  // more than one frame. What would be a lie is giving each pose its own
  // timeline row and status line, because that asserts steps that do not
  // happen.
  cookingLoop: string[];
}

// The two flows answer different questions, so they get different pictures at
// the two moments where they actually differ. Planning a week starts from
// preferences and an empty worktop — the chef washes produce and simmers.
// Cooking from the pantry starts from a handful of things you already picked
// — the chef goes straight to the board and seasons what is there.
//
// The shared poses are shared on purpose: reading preferences, tasting to
// check, and plating up are the same act in both flows, and giving them
// different art would imply a difference that is not there.
const POSE_SETS: Record<GenerationVariant, PoseSet> = {
  weekly: {
    stages: {
      analysing_profile: chefPlanningTablet,
      checking_pantry: chefWashing,
      building_meals: chefStirringPot,
      reviewing: chefTasting,
      finalising: chefPlating,
    },
    cookingLoop: [chefStirringPot, chefStirFry],
  },
  pantry: {
    stages: {
      analysing_profile: chefPlanningTablet,
      checking_pantry: chefChopping,
      building_meals: chefStirFry,
      reviewing: chefTasting,
      finalising: chefPlating,
    },
    cookingLoop: [chefStirFry, chefSeasoning],
  },
};

export function poseSet(variant: GenerationVariant): PoseSet {
  return POSE_SETS[variant];
}

export const posesInstalled = Object.keys(files).length >= 8;
