import * as shelfLifeRepository from '../repositories/shelfLifeRepository.ts';
import type {
  DateKind,
  ShelfLifeClass,
  StorageLocation,
} from '../repositories/shelfLifeRepository.ts';

export interface ShelfLifeEstimate {
  classId: string;
  label: string;
  dateKind: DateKind;
  storage: StorageLocation;
  days: number;
  expiresOn: string;
  note: string | null;
  source: string;
}

function daysFor(entry: ShelfLifeClass, storage: StorageLocation): number | null {
  if (storage === 'fridge') return entry.fridge_days;
  if (storage === 'freezer') return entry.freezer_days;
  return entry.pantry_days;
}

// Falls back to wherever the class actually keeps rather than refusing: a user
// who says "pantry" about fresh fish has mislabelled the storage, not asked an
// unanswerable question, and the fridge figure is the useful answer.
function resolveStorage(
  entry: ShelfLifeClass,
  preferred: StorageLocation
): { storage: StorageLocation; days: number } | null {
  const order: StorageLocation[] = [preferred, 'fridge', 'pantry', 'freezer'];

  for (const storage of order) {
    const days = daysFor(entry, storage);
    if (days !== null) return { storage, days };
  }
  return null;
}

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  // Sliced from the ISO string rather than formatted locally: the column is a
  // DATE, and building it from local parts is how a date drifts by one either
  // side of midnight.
  return date.toISOString().slice(0, 10);
}

export async function estimate(
  classId: string,
  storage: StorageLocation = 'fridge'
): Promise<ShelfLifeEstimate | null> {
  const entry = await shelfLifeRepository.findById(classId);
  if (!entry) return null;

  const resolved = resolveStorage(entry, storage);
  if (!resolved) return null;

  return {
    classId: entry.id,
    label: entry.label,
    dateKind: entry.date_kind,
    storage: resolved.storage,
    days: resolved.days,
    expiresOn: addDays(resolved.days),
    note: entry.note,
    source: entry.source,
  };
}

// The rule that decides whether an item is allowed to alarm anybody.
//
// A best-before estimate never raises an alert. Being wrong about one of those
// costs the user a perfectly good bunch of spring onions, and an app whose
// stated purpose is reducing waste must not be the thing telling people to bin
// food that is merely past its best. Those estimates still earn their keep:
// they order the pantry, which is what steers the meal planner towards using
// things up — and ordering tolerates being wrong in a way alerting does not.
//
// A user-entered date always alerts, whichever class it belongs to. They read
// it off the packet; it is not ours to second-guess.
export function shouldAlert(input: {
  dateKind: DateKind | null;
  isEstimated: boolean;
}): boolean {
  if (!input.isEstimated) return true;
  return input.dateKind === 'use_by';
}
