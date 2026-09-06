import * as groceryRepository from '../repositories/groceryRepository.ts';

// "Can this be bought where the household shops?"
//
// A fact, so it is answered by a table rather than by retrieval. Vector search
// returns the nearest thing, which is the wrong shape of answer to a yes/no
// question: a shopping list needs to know whether 香椿 is on a shelf in
// Sheffield, not what is most similar to it.
//
// STATUS: the catalogue is empty. Every function here returns "unknown", and
// the generation path does not call them yet. See docs/rag.md.

export type Availability = 'common' | 'seasonal' | 'specialist';

export interface AvailabilityVerdict {
  name: string;
  // 'unknown' is a first-class outcome, and it is NOT 'unavailable'. An empty
  // catalogue must not conclude that nothing in Britain can be bought.
  status: Availability | 'unknown';
  storeClass: string | null;
  substitutes: Array<{ name: string; closeness: number; note: string | null }>;
}

const DEFAULT_REGION = 'uk';

export function catalogueRegion(): string {
  return process.env.GROCERY_REGION ?? DEFAULT_REGION;
}

/**
 * Looks each ingredient up in the catalogue.
 *
 * Fails OPEN: an ingredient the catalogue has never heard of comes back
 * `unknown`, and callers must treat that as permitted. The alternative — an
 * empty catalogue rejecting every plan — would be a compliance check that
 * blocks the product until somebody has finished a data-entry task, which is
 * how a half-built feature takes a working one down with it.
 *
 * The direction is the opposite of the allergen check, and deliberately so.
 * An unrecognised allergen must fail closed because the cost of being wrong is
 * somebody's health; an unrecognised vegetable fails open because the cost is
 * a slightly awkward shopping trip.
 */
export async function checkAvailability(
  names: readonly string[],
  region: string = catalogueRegion()
): Promise<AvailabilityVerdict[]> {
  if (names.length === 0) return [];

  const found = await groceryRepository.findAvailability(names, region);

  return names.map((name) => {
    const match = found.get(name.trim().toLowerCase());
    if (!match) {
      return { name, status: 'unknown' as const, storeClass: null, substitutes: [] };
    }
    return {
      name,
      status: match.availability,
      storeClass: match.store_class_id,
      substitutes: match.substitutes,
    };
  });
}

/**
 * The ingredients a plan asks for that the catalogue positively knows are hard
 * to get. Only 'specialist' counts: 'seasonal' is a timing problem rather than
 * an availability one, and 'unknown' is not evidence of anything.
 *
 * Intended as a post-generation check alongside the allergen and budget ones,
 * producing a retry that names the ingredient — not as a prompt instruction,
 * for the same reason as everywhere else in this codebase.
 */
export async function findHardToBuy(
  names: readonly string[],
  region: string = catalogueRegion()
): Promise<AvailabilityVerdict[]> {
  const verdicts = await checkAvailability(names, region);
  return verdicts.filter((verdict) => verdict.status === 'specialist');
}

export async function catalogueStatus(): Promise<{
  region: string;
  items: number;
  availabilityRows: number;
  substitutions: number;
}> {
  const [items, availabilityRows, substitutions] = await Promise.all([
    groceryRepository.countItems(),
    groceryRepository.countAvailability(),
    groceryRepository.countSubstitutions(),
  ]);

  return { region: catalogueRegion(), items, availabilityRows, substitutions };
}
