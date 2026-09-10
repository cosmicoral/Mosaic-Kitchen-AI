import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

// The consent checkbox in onboarding has linked to /privacy since the Article 9
// work landed. The route did not exist, so it rendered a link to a 404 —
// underneath a sentence asking the reader to consent to health and religious
// data being processed. The notice being missing was the compliance failure;
// the link advertising a notice that was missing was the honesty one.
//
// These tests hold the pieces together: routes that exist, links that resolve,
// both languages present, and the facts in the notice matching what the code
// actually does.

const root = join(import.meta.dirname, '..');
const web = join(root, '..', 'web', 'src');

function read(...parts: string[]): string {
  return readFileSync(join(...parts), 'utf8');
}

describe('the routes exist', () => {
  const app = read(web, 'App.tsx');

  for (const path of ['/privacy', '/terms']) {
    test(`${path} is routed`, () => {
      assert.match(
        app,
        new RegExp(`path="${path}"`),
        `${path} has no route. Everything that links to it renders a 404, and the ` +
          'notice is not "given" under Articles 13 and 14 if it cannot be reached.'
      );
    });
  }

  test('both are public', () => {
    // A guard here would bounce a reader who clicked the consent link during
    // onboarding — before they have a profile — and would put the notice
    // behind the very account whose creation it is meant to inform.
    for (const path of ['/privacy', '/terms']) {
      const route = app.slice(app.indexOf(`path="${path}"`));
      const element = route.slice(0, route.indexOf('/>'));
      assert.ok(
        !element.includes('RequireAuth'),
        `${path} sits behind RequireAuth. The notice has to be readable before ` +
          'there is an account, not after.'
      );
    }
  });
});

describe('everything that promises a legal page links to one', () => {
  // Each of these had, or has, a place where the words appear. A span styled
  // like a link is not a link, and this is the check that says so.
  const LINKED = [
    ['web/src/pages/LandingPage.tsx', 'LandingPage.tsx', ['/privacy', '/terms']],
    ['web/src/pages/SignupPage.tsx', 'SignupPage.tsx', ['/privacy', '/terms']],
    ['web/src/pages/OnboardingGoalsPage.tsx', 'OnboardingGoalsPage.tsx', ['/privacy']],
    ['web/src/pages/ProfilePage.tsx', 'ProfilePage.tsx', ['/privacy']],
    ['web/src/pages/PricingPage.tsx', 'PricingPage.tsx', ['/terms']],
  ] as const;

  for (const [label, file, targets] of LINKED) {
    for (const target of targets) {
      test(`${label} links to ${target}`, () => {
        const source = read(web, 'pages', file);
        assert.match(
          source,
          new RegExp(`to="${target}"`),
          `${label} mentions the document but does not link to ${target}.`
        );
      });
    }
  }
});

describe('both documents exist in both languages', () => {
  const DOCUMENTS = [
    ['privacy notice', 'privacy.ts', 'privacyNotice'],
    ['terms', 'terms.ts', 'termsDocument'],
  ] as const;

  for (const [label, file, marker] of DOCUMENTS) {
    const source = read(web, 'content', file);

    test(`the ${label} has an English and a Chinese version`, () => {
      assert.match(source, /^\s{2}en: \{/m, `${marker} has no English version`);
      assert.match(source, /^\s{2}zh: \{/m, `${marker} has no Chinese version`);
    });

    test(`the ${label} has the same sections in both languages`, () => {
      // A count rather than a comparison, because the headings are supposed to
      // differ — they are translations. What must not differ is how many there
      // are: a section written in one language and not the other is a reader
      // being told less because of the language they read in.
      const english = source.slice(source.indexOf('  en: {'), source.indexOf('  zh: {'));
      const chinese = source.slice(source.indexOf('  zh: {'));

      const count = (text: string) => (text.match(/^\s+heading:/gm) ?? []).length;

      assert.equal(
        count(english),
        count(chinese),
        `The ${label} has ${count(english)} sections in English and ` +
          `${count(chinese)} in Chinese.`
      );
    });
  }
});

describe('the notice describes what the code actually does', () => {
  const notice = read(web, 'content', 'privacy.ts');

  test('it names Hetzner', () => {
    // The API moved onto a Hetzner VPS in Helsinki during deployment. Every
    // request now passes through a machine in another country, and a processor
    // the notice does not list is a processor the reader was not told about.
    assert.match(
      notice,
      /Hetzner/,
      'The privacy notice does not mention Hetzner, which is where the API runs ' +
        'and therefore where every request is processed.'
    );
  });

  test('it does not mention a postcode', () => {
    // Dropped in migration 1790200000000. A notice that still describes
    // collecting one is describing a different application.
    assert.ok(
      !/postcode/i.test(notice),
      'The privacy notice still describes collecting a postcode, which the ' +
        'application stopped doing.'
    );
  });

  test('its version matches the consent version recorded against profiles', () => {
    const consent = read(root, 'src', 'services', 'profileService.ts');
    const recorded = /CONSENT_VERSION = '([^']+)'/.exec(consent);
    const published = /^\s*version: '([^']+)'/m.exec(notice);

    assert.ok(recorded, 'CONSENT_VERSION was not found in profileService.ts');
    assert.ok(published, 'no version was found in privacy.ts');
    assert.equal(
      published[1],
      recorded[1],
      'The published notice and the version stored with each consent have ' +
        'drifted apart. Consent is evidenced against a version; if that version ' +
        'does not name a document we can produce, it evidences nothing.'
    );
  });
});

describe('the terms carry the warnings that cost someone something', () => {
  const terms = read(web, 'content', 'terms.ts');

  test('an allergen warning is present in both languages', () => {
    // The product asks for the ingredients a household avoids and then has a
    // language model write recipes around them. The model is wrong sometimes.
    // Of everything in these terms, this is the paragraph with a physical
    // consequence attached.
    assert.match(terms, /allerg/i, 'the English terms no longer warn about allergens');
    assert.match(terms, /过敏/, 'the Chinese terms no longer warn about allergens');
  });

  test('the 14-day right is explained, not just waived', () => {
    assert.match(terms, /14 days/, 'the English terms do not explain the 14-day right');
    assert.match(terms, /14 天/, 'the Chinese terms do not explain the 14-day right');
  });

  test('nothing claims a delayed start the code cannot do', () => {
    // An earlier draft offered "leave it unticked and your subscription starts
    // after 14 days". Nothing schedules that — the webhook grants the plan the
    // moment payment succeeds — so it was a feature promised in a contract and
    // absent from the software.
    assert.ok(
      !/starts after the 14-day period/i.test(terms),
      'The terms promise a subscription that starts after the cancellation ' +
        'period. No code path does that; the plan is active as soon as the ' +
        'webhook lands.'
    );
  });
});

describe('the published contact address is one somebody owns', () => {
  test('nothing points at mosaickitchen.ai', () => {
    // support@mosaickitchen.ai was hard-coded on the password-reset screen —
    // the one page whose entire content is "email us, there is no other way" —
    // and the domain was never registered.
    for (const file of [
      ['pages', 'ForgotPasswordPage.tsx'],
      ['content', 'privacy.ts'],
      ['content', 'terms.ts'],
    ] as const) {
      // Comments stripped, as in dataProtection.test.ts: the note explaining
      // why the address was replaced necessarily contains the address, and a
      // test that forbids its own explanation is testing prose.
      const source = read(web, ...file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');

      assert.ok(
        !/mosaickitchen\.ai/i.test(source),
        `${file.join('/')} points at mosaickitchen.ai, a domain that does not exist.`
      );
    }
  });
});
