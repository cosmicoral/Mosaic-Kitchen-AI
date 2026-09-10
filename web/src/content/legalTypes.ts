// The shape shared by the privacy notice and the terms.
//
// Deliberately not written into LocaleContext's `t()` dictionary. That
// dictionary is keyed by the English string itself, which works for buttons
// and headings and falls apart for legal prose: a missing key silently renders
// the English original, and a privacy notice that quietly serves English to a
// Chinese reader is a notice that was not given. Here a missing translation is
// a type error instead.
//
// It also keeps the two languages next to each other in the source, which is
// the only way anyone notices when one is edited and the other is not.

export type LegalBlock =
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'table'; head: [string, string]; rows: Array<[string, string]> }
  // A paragraph the reader must not skim past — used for the allergen warning
  // and the cancellation right, both of which cost someone something real if
  // they are missed.
  | { kind: 'note'; text: string };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  // Shown under the title. Dated rather than versioned for the reader, because
  // "last updated" is what a person checks; the machine-readable version lives
  // in `version`.
  updated: string;
  intro: LegalBlock[];
  sections: LegalSection[];
}

export type BilingualDocument = {
  // Matched against the profile's `data_consent_version` so a change to the
  // notice is detectable rather than silent. Keep in step with
  // backend/src/services/profileService.ts CONSENT_VERSION.
  version: string;
  en: LegalDocument;
  zh: LegalDocument;
};
