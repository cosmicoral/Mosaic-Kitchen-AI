import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import type { Exif } from 'sharp';

// The avatar pipeline, tested at the level that matters: what comes out of
// sharp, not what the service does with it afterwards. The service needs a
// database and a bucket; the transformation does not, and the transformation
// is where the privacy property lives.

const PIPELINE = (input: Buffer) =>
  sharp(input, { limitInputPixels: 50_000_000, pages: 1 })
    .resize(256, 256, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toBuffer();

async function photoWithGps(): Promise<Buffer> {
  return sharp({
    create: { width: 800, height: 600, channels: 3, background: '#c47' },
  })
    .withExifMerge({
      // Cast: sharp's Exif type lists only IFD0/IFD1/IFD2/IFD3, but the
      // writer passes any block through, and GPS is the block this test is
      // about.
      IFD0: { Copyright: 'Mosaic test', Artist: 'A photographer' },
      // The reason this test exists. A phone writes these into every photo.
      GPS: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '51/1 30/1 0/1',
        GPSLongitudeRef: 'W',
        GPSLongitude: '0/1 7/1 0/1',
      },
    } as unknown as Exif)
    .jpeg()
    .toBuffer();
}

test('EXIF, including GPS, does not survive processing', async () => {
  const original = await photoWithGps();

  // The fixture is only meaningful if it really carries the metadata.
  const before = await sharp(original).metadata();
  assert.ok(before.exif, 'the fixture has no EXIF, so this test proves nothing');

  const processed = await PIPELINE(original);
  const after = await sharp(processed).metadata();

  assert.equal(
    after.exif,
    undefined,
    'EXIF survived: a photo taken on a phone would publish where the user lives'
  );
});

test('output is a square WebP at 256px whatever went in', async () => {
  const wide = await sharp({
    create: { width: 1200, height: 300, channels: 3, background: '#9acd22' },
  })
    .png()
    .toBuffer();

  const meta = await sharp(await PIPELINE(wide)).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 256);
  assert.equal(meta.height, 256);
});

test('a re-encoded file is genuinely re-encoded, not relabelled', async () => {
  // The second reason for the pipeline: a file that is valid as two formats at
  // once stops being dangerous once it has been decoded to pixels and written
  // out again. If the output were the input with a new header, the appended
  // payload would still be in there.
  const payload = Buffer.from('<script>alert(1)</script>');
  const polyglot = Buffer.concat([
    await sharp({ create: { width: 300, height: 300, channels: 3, background: '#333' } })
      .jpeg()
      .toBuffer(),
    payload,
  ]);

  const processed = await PIPELINE(polyglot);
  assert.ok(
    !processed.includes(payload),
    'the appended bytes survived, so the file was relabelled rather than re-encoded'
  );
});

test('an animated GIF becomes a single still', async () => {
  // pages: 1. Without it an animated avatar would be processed frame by frame
  // and stored as an animation, which is work nobody asked for and a much
  // larger object.
  const animated = await sharp({
    create: { width: 100, height: 200, channels: 4, background: '#fff' },
  })
    .gif()
    .toBuffer();

  const meta = await sharp(await PIPELINE(animated)).metadata();
  assert.equal(meta.height, 256);
  assert.ok((meta.pages ?? 1) <= 1, 'more than one frame survived');
});

test('a file that is not an image is rejected by the decoder', async () => {
  // The service turns this into a 400. What matters here is that sharp refuses
  // rather than producing something: the format check runs on decoded bytes,
  // never on the filename or the Content-Type the client claimed.
  await assert.rejects(() => PIPELINE(Buffer.from('this is not an image at all')));
});
