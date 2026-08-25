import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import app from '../src/app.ts';
import { closeDb, resetDb } from './helpers/db.ts';

interface Actor {
  cookie: string;
  userId: string;
}

const VALID_ITEM = {
  name: 'Spinach',
  category: 'vegetables',
  quantity: 200,
  unit: 'g',
  expires_on: '2026-09-05',
};

// Each test gets its own user so cross-user isolation can be exercised without
// any shared state between cases.
let seq = 0;
async function signIn(): Promise<Actor> {
  seq += 1;
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: `pantry-${seq}@example.com`, password: 'supersecret123' });

  assert.equal(res.status, 201);

  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : [raw];
  const cookie = cookies.find((c) => c?.startsWith('mk_session='));
  assert.ok(cookie, 'signup should return a session cookie');

  return { cookie, userId: res.body.user.id };
}

function asUser(actor: Actor) {
  return {
    get: (path: string) => request(app).get(path).set('Cookie', actor.cookie),
    post: (path: string) => request(app).post(path).set('Cookie', actor.cookie),
    patch: (path: string) => request(app).patch(path).set('Cookie', actor.cookie),
    delete: (path: string) => request(app).delete(path).set('Cookie', actor.cookie),
  };
}

async function createItem(actor: Actor, overrides: Record<string, unknown> = {}) {
  const res = await asUser(actor)
    .post('/api/pantry')
    .send({ ...VALID_ITEM, ...overrides });
  assert.equal(res.status, 201, `create failed: ${JSON.stringify(res.body)}`);
  return res.body.item;
}

beforeEach(async () => {
  await resetDb();
});

after(async () => {
  await closeDb();
});

describe('authentication', () => {
  const paths: Array<[string, string]> = [
    ['get', '/api/pantry'],
    ['get', '/api/pantry/expiring'],
    ['post', '/api/pantry'],
    ['patch', '/api/pantry/00000000-0000-0000-0000-000000000000'],
    ['delete', '/api/pantry/00000000-0000-0000-0000-000000000000'],
  ];

  // router.use(requireAuth) is supposed to cover the whole router; this walks
  // every route so a future addition cannot quietly land outside the guard.
  test('every pantry route rejects an unauthenticated request', async () => {
    for (const [method, path] of paths) {
      const res = await (request(app) as never as Record<string, (p: string) => request.Test>)[
        method
      ]!(path);
      assert.equal(res.status, 401, `${method.toUpperCase()} ${path} was not protected`);
    }
  });
});

describe('POST /api/pantry', () => {
  test('creates an item and echoes the stored row', async () => {
    const actor = await signIn();
    const res = await asUser(actor).post('/api/pantry').send(VALID_ITEM);

    assert.equal(res.status, 201);
    assert.equal(res.body.item.name, 'Spinach');
    assert.equal(res.body.item.category, 'vegetables');
    assert.equal(res.body.item.unit, 'g');
    assert.equal(res.body.item.user_id, actor.userId);
  });

  // Regression test for the DATE parsing bug: node-postgres used to hand back
  // a JS Date built at local midnight, so 2026-09-05 came out as
  // 2026-09-04T23:00:00Z under BST. The date must survive the round trip
  // untouched.
  test('returns the expiry date exactly as it was sent', async () => {
    const actor = await signIn();
    const item = await createItem(actor, { expires_on: '2026-09-05' });

    assert.equal(item.expires_on, '2026-09-05');
  });

  // NUMERIC arrives as a string because its precision can exceed what a JS
  // number holds safely. Writing it down stops anyone "fixing" it later.
  test('returns quantity as a fixed-precision string', async () => {
    const actor = await signIn();
    const item = await createItem(actor, { quantity: 200 });

    assert.equal(item.quantity, '200.00');
  });

  test('rounds quantity to two decimals to match the column', async () => {
    const actor = await signIn();
    const item = await createItem(actor, { quantity: 1.005 });

    assert.equal(item.quantity, '1.01');
  });

  test('accepts an item with no quantity, unit or expiry', async () => {
    const actor = await signIn();
    const res = await asUser(actor)
      .post('/api/pantry')
      .send({ name: 'Assorted spices', category: 'condiments' });

    assert.equal(res.status, 201);
    assert.equal(res.body.item.quantity, null);
    assert.equal(res.body.item.unit, null);
    assert.equal(res.body.item.expires_on, null);
  });

  test('trims whitespace from the name', async () => {
    const actor = await signIn();
    const item = await createItem(actor, { name: '  Bok Choy  ' });

    assert.equal(item.name, 'Bok Choy');
  });

  test('accepts a category in any casing', async () => {
    const actor = await signIn();
    const item = await createItem(actor, { category: 'VEGETABLES' });

    assert.equal(item.category, 'vegetables');
  });

  describe('rejections', () => {
    const cases: Array<[string, Record<string, unknown>, RegExp]> = [
      ['a missing name', { category: 'vegetables' }, /name/],
      ['a blank name', { name: '   ', category: 'vegetables' }, /name/],
      ['an over-long name', { name: 'x'.repeat(101), category: 'vegetables' }, /name/],
      ['an unknown category', { name: 'X', category: 'sweets' }, /category/],
      ['a missing category', { name: 'X' }, /category/],
      ['a negative quantity', { name: 'X', category: 'grains', quantity: -1 }, /quantity/],
      ['a zero quantity', { name: 'X', category: 'grains', quantity: 0 }, /quantity/],
      [
        'a non-numeric quantity',
        { name: 'X', category: 'grains', quantity: '200' },
        /quantity/,
      ],
      [
        'a date that is not YYYY-MM-DD',
        { name: 'X', category: 'grains', expires_on: '05/09/2026' },
        /YYYY-MM-DD/,
      ],
      [
        'a calendar date that does not exist',
        { name: 'X', category: 'grains', expires_on: '2026-02-31' },
        /real date/,
      ],
    ];

    for (const [label, body, messagePattern] of cases) {
      test(`rejects ${label} with 400`, async () => {
        const actor = await signIn();
        const res = await asUser(actor).post('/api/pantry').send(body);

        assert.equal(res.status, 400, JSON.stringify(res.body));
        assert.match(res.body.error, messagePattern);
      });
    }
  });
});

describe('GET /api/pantry', () => {
  test('returns an empty list for a new user', async () => {
    const actor = await signIn();
    const res = await asUser(actor).get('/api/pantry');

    assert.equal(res.status, 200);
    assert.deepEqual(res.body.items, []);
  });

  test('orders by expiry, with undated items last', async () => {
    const actor = await signIn();
    await createItem(actor, { name: 'Later', expires_on: '2026-12-01' });
    await createItem(actor, { name: 'Undated', expires_on: null });
    await createItem(actor, { name: 'Sooner', expires_on: '2026-09-01' });

    const res = await asUser(actor).get('/api/pantry');

    assert.deepEqual(
      res.body.items.map((item: { name: string }) => item.name),
      ['Sooner', 'Later', 'Undated']
    );
  });

  test('shows a user only their own items', async () => {
    const alice = await signIn();
    const bob = await signIn();
    await createItem(alice, { name: 'Alice tofu' });
    await createItem(bob, { name: 'Bob tofu' });

    const res = await asUser(alice).get('/api/pantry');

    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].name, 'Alice tofu');
  });
});

describe('GET /api/pantry/expiring', () => {
  function isoDaysFromNow(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  test('defaults to a seven day window', async () => {
    const actor = await signIn();
    await createItem(actor, { name: 'Soon', expires_on: isoDaysFromNow(3) });
    await createItem(actor, { name: 'Later', expires_on: isoDaysFromNow(30) });

    const res = await asUser(actor).get('/api/pantry/expiring');

    assert.equal(res.status, 200);
    assert.deepEqual(
      res.body.items.map((item: { name: string }) => item.name),
      ['Soon']
    );
  });

  test('honours an explicit window', async () => {
    const actor = await signIn();
    await createItem(actor, { name: 'Later', expires_on: isoDaysFromNow(30) });

    const res = await asUser(actor).get('/api/pantry/expiring?days=45');

    assert.equal(res.body.items.length, 1);
  });

  test('includes items that already expired', async () => {
    const actor = await signIn();
    await createItem(actor, { name: 'Gone off', expires_on: isoDaysFromNow(-5) });

    const res = await asUser(actor).get('/api/pantry/expiring');

    assert.equal(res.body.items.length, 1);
  });

  test('excludes items with no expiry date', async () => {
    const actor = await signIn();
    await createItem(actor, { name: 'Undated', expires_on: null });

    const res = await asUser(actor).get('/api/pantry/expiring?days=365');

    assert.deepEqual(res.body.items, []);
  });

  test('rejects a nonsense window with 400', async () => {
    const actor = await signIn();

    for (const days of ['abc', '-1', '9999', '1.5']) {
      const res = await asUser(actor).get(`/api/pantry/expiring?days=${days}`);
      assert.equal(res.status, 400, `days=${days} should have been rejected`);
    }
  });
});

describe('PATCH /api/pantry/:id', () => {
  test('updates only the fields that were sent', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    const res = await asUser(actor)
      .patch(`/api/pantry/${item.id}`)
      .send({ quantity: 50 });

    assert.equal(res.status, 200);
    assert.equal(res.body.item.quantity, '50.00');
    assert.equal(res.body.item.name, 'Spinach');
    assert.equal(res.body.item.unit, 'g');
    assert.equal(res.body.item.expires_on, '2026-09-05');
  });

  test('moves updated_at forward but leaves created_at alone', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    const res = await asUser(actor).patch(`/api/pantry/${item.id}`).send({ name: 'Kale' });

    assert.equal(res.body.item.created_at, item.created_at);
    assert.ok(
      new Date(res.body.item.updated_at) > new Date(item.updated_at),
      'updated_at should have advanced'
    );
  });

  test('validates patched fields the same way as creation', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    const res = await asUser(actor)
      .patch(`/api/pantry/${item.id}`)
      .send({ category: 'sweets' });

    assert.equal(res.status, 400);
  });

  test('rejects an empty patch with 400', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    const res = await asUser(actor).patch(`/api/pantry/${item.id}`).send({});

    assert.equal(res.status, 400);
  });

  test('returns 404 for an id belonging to another user', async () => {
    const alice = await signIn();
    const bob = await signIn();
    const bobItem = await createItem(bob);

    const res = await asUser(alice)
      .patch(`/api/pantry/${bobItem.id}`)
      .send({ name: 'Stolen' });

    assert.equal(res.status, 404);
  });

  test("leaves the other user's row untouched after a rejected patch", async () => {
    const alice = await signIn();
    const bob = await signIn();
    const bobItem = await createItem(bob, { name: 'Bob tofu' });

    await asUser(alice).patch(`/api/pantry/${bobItem.id}`).send({ name: 'Stolen' });

    const res = await asUser(bob).get('/api/pantry');
    assert.equal(res.body.items[0].name, 'Bob tofu');
  });

  test('returns 404 for an id that does not exist', async () => {
    const actor = await signIn();

    const res = await asUser(actor)
      .patch('/api/pantry/00000000-0000-0000-0000-000000000000')
      .send({ name: 'Ghost' });

    assert.equal(res.status, 404);
  });

  // A malformed uuid would make Postgres raise 22P02 and surface as a 500.
  // It also has to look identical to "not yours", so 404 rather than 400.
  test('returns 404 for a malformed id', async () => {
    const actor = await signIn();

    const res = await asUser(actor).patch('/api/pantry/not-a-uuid').send({ name: 'X' });

    assert.equal(res.status, 404);
  });
});

describe('DELETE /api/pantry/:id', () => {
  test('removes the item and returns 204', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    const res = await asUser(actor).delete(`/api/pantry/${item.id}`);

    assert.equal(res.status, 204);

    const list = await asUser(actor).get('/api/pantry');
    assert.deepEqual(list.body.items, []);
  });

  test('returns 404 on a second delete', async () => {
    const actor = await signIn();
    const item = await createItem(actor);

    await asUser(actor).delete(`/api/pantry/${item.id}`);
    const res = await asUser(actor).delete(`/api/pantry/${item.id}`);

    assert.equal(res.status, 404);
  });

  test("cannot delete another user's item", async () => {
    const alice = await signIn();
    const bob = await signIn();
    const bobItem = await createItem(bob);

    const res = await asUser(alice).delete(`/api/pantry/${bobItem.id}`);

    assert.equal(res.status, 404);

    const list = await asUser(bob).get('/api/pantry');
    assert.equal(list.body.items.length, 1);
  });

  test('returns 404 for a malformed id', async () => {
    const actor = await signIn();

    const res = await asUser(actor).delete('/api/pantry/not-a-uuid');

    assert.equal(res.status, 404);
  });
});
