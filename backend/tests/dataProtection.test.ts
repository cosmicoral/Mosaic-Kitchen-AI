import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

// Two legal properties, held in place by tests rather than by memory.
//
// Both are the kind of thing that breaks silently. A profile saved without
// consent looks exactly like one saved with it; a re-added postcode field
// looks like a helpful feature. Neither produces an error, and the first
// notice either way would be a complaint to the ICO.
//
// docs/data-protection.md is the reasoning. This is the enforcement.

const root = join(import.meta.dirname, '..');
const web = join(root, '..', 'web', 'src');

function read(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('postcode is gone and stays gone', () => {
  // Article 5(1)(c). It was collected from the first release and read by
  // nothing — not a prompt, not a query, not a feature. A postcode covers a
  // few dozen households, which beside the household composition and dietary
  // restrictions in the same table is what turns a sensitive profile into an
  // identifiable one.
  const FILES = [
    ['backend/src/types/index.ts', join(root, 'src', 'types', 'index.ts')],
    ['backend/src/services/profileService.ts', join(root, 'src', 'services', 'profileService.ts')],
    ['backend/src/repositories/profileRepository.ts', join(root, 'src', 'repositories', 'profileRepository.ts')],
    ['web/src/types/index.ts', join(web, 'types', 'index.ts')],
    ['web/src/lib/profile.ts', join(web, 'lib', 'profile.ts')],
    ['web/src/context/OnboardingContext.tsx', join(web, 'context', 'OnboardingContext.tsx')],
    ['web/src/pages/OnboardingGoalsPage.tsx', join(web, 'pages', 'OnboardingGoalsPage.tsx')],
    ['web/src/pages/ProfilePage.tsx', join(web, 'pages', 'ProfilePage.tsx')],
  ] as const;

  for (const [label, path] of FILES) {
    test(`${label} does not reference a postcode`, () => {
      // Comments stripped: the migration and the docs discuss it at length,
      // and a test that rejects the explanation of a rule is testing prose.
      assert.ok(
        !/postcode/i.test(stripComments(read(path))),
        `${label} still handles a postcode. It was removed because nothing read it; ` +
          'if a feature now needs a location, ask for the coarsest one that works ' +
          'and say what it is for in the privacy notice.'
      );
    });
  }

  test('the column is dropped in a migration', () => {
    const dir = join(root, 'migrations');
    const dropped = readdirSync(dir)
      .filter((name) => name.endsWith('.sql'))
      .some((name) => {
        const up = readFileSync(join(dir, name), 'utf8').split('-- Down Migration')[0] ?? '';
        return /ALTER TABLE user_profiles\s+DROP COLUMN postcode/i.test(up);
      });

    assert.ok(dropped, 'no migration drops user_profiles.postcode');
  });
});

describe('explicit consent for special category data', () => {
  const profileService = read(join(root, 'src', 'services', 'profileService.ts'));

  test('a profile cannot be saved without it', () => {
    // Article 9 prohibits processing health and belief data unless an
    // exemption applies, and explicit consent is the only one available here.
    // Saving anyway and asking later would mean the unlawful processing has
    // already happened.
    assert.match(profileService, /CONSENT_REQUIRED/);
    assert.match(
      profileService,
      /function parseConsent\(/,
      'the consent check has been removed from the profile save path'
    );
  });

  test('consent is read from storage, not from the request', () => {
    // The bypass this forecloses: a client that sends `data_consent: true`
    // for an account that never agreed. Whether consent exists is a fact about
    // the database.
    assert.match(profileService, /profileRepository\.findByUserId\(userId\)/);
    assert.match(
      profileService,
      /parseConsent\(\s*record\.data_consent,\s*existing\?\.data_consent_at/,
      'the previous consent is no longer read from the stored profile'
    );
  });

  test('it is recorded as a timestamp with the notice version', () => {
    // A boolean says nothing about when consent was given or under which
    // wording, and consent that cannot be evidenced is consent you do not
    // have. A revised notice also needs to be distinguishable from the one
    // somebody actually agreed to.
    assert.match(profileService, /data_consent_at:\s*parseConsent\(/);
    assert.match(profileService, /data_consent_version:\s*CONSENT_VERSION/);
    assert.match(profileService, /export const CONSENT_VERSION = '/);
  });

  test('the migration does not backfill existing rows', () => {
    // Nobody was ever asked, so writing now() into existing profiles would be
    // manufacturing a record of something that did not happen — worse than
    // having no record, because it looks like evidence.
    const dir = join(root, 'migrations');
    const file = readdirSync(dir).find((name) => name.includes('consent'));
    assert.ok(file, 'no consent migration found');

    const up = readFileSync(join(dir, file), 'utf8').split('-- Down Migration')[0] ?? '';
    assert.match(up, /ADD COLUMN data_consent_at TIMESTAMPTZ/);
    assert.ok(
      !/UPDATE user_profiles[\s\S]*data_consent_at\s*=/i.test(up),
      'the migration backfills consent onto rows that never gave it'
    );
  });

  test('the checkbox is separate and starts unticked', () => {
    // "Explicit" means specific and affirmative. A consent bundled into a
    // terms acceptance, or pre-ticked, is not evidence that anyone agreed to
    // this particular processing.
    const onboarding = read(join(web, 'pages', 'OnboardingGoalsPage.tsx'));
    const context = read(join(web, 'context', 'OnboardingContext.tsx'));

    assert.match(onboarding, /type="checkbox"/);
    assert.match(onboarding, /checked=\{draft\.data_consent\}/);
    assert.match(
      context,
      /data_consent:\s*false/,
      'the consent checkbox no longer defaults to unticked'
    );
  });

  test('the wording names what makes the data sensitive', () => {
    // Consent is only informed if the person knows what they are agreeing to.
    // "We process your data" does not tell somebody that their cuisine choices
    // and exclusions imply a religion.
    const onboarding = read(join(web, 'pages', 'OnboardingGoalsPage.tsx'));

    assert.match(onboarding, /health conditions and religious beliefs/i);
    assert.match(onboarding, /withdraw/i, 'the right to withdraw is not mentioned');
  });
});
