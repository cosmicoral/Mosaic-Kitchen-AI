import { aiScanMascot } from '../mascots';

// Resolved by glob rather than by five static imports, so a missing
// illustration degrades to the existing mascot instead of breaking the build.
// The alternative would mean the whole app fails to compile until every pose
// has been exported, converted and committed — which blocks testing
// everything else for the sake of an animation.
const files = import.meta.glob<{ default: string }>('./*.webp', {
  eager: true,
});

function pose(name: string): string {
  return files[`./${name}.webp`]?.default ?? aiScanMascot;
}

// One pose per stage the server genuinely performs. There are eight
// illustrations in the set; the other three — chopping, seasoning, stirring a
// pot — are deliberately unused here and held for the flows that will really
// need them. Adding them would mean inventing stages to justify them.
export const chefPlanningTablet = pose('chef-planning-tablet');
export const chefWashing = pose('chef-washing');
export const chefStirFry = pose('chef-stir-fry');
export const chefTasting = pose('chef-tasting');
export const chefPlating = pose('chef-plating');

// True once all five are present, so a caller can tell "the art has landed"
// from "we are falling back". Nothing depends on it yet; it exists so the
// fallback is observable rather than silent.
export const posesInstalled = Object.keys(files).length >= 5;
