import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';
import * as userRepository from '../repositories/userRepository.ts';
import { AppError } from '../types/index.ts';
import { deleteObject, objectUrl, putObject } from './objectStorage.ts';

// Avatar upload.
//
// The processing step is not an optimisation. A photo taken on a phone carries
// EXIF metadata including GPS coordinates, and storing that on a public bucket
// would publish where the user lives alongside their face. sharp's pipeline
// drops all metadata unless explicitly asked to keep it, and re-encoding to
// WebP guarantees it: the output is a new file built from pixels, not the
// original with a header edited.
//
// Re-encoding also neutralises a second problem. A file whose bytes are not
// what its extension claims — a polyglot that is valid JPEG and valid HTML —
// stops being dangerous once it has been decoded and written out again.

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const OUTPUT_SIZE = 256;

// Decoded from the bytes, never from the filename or the Content-Type header.
// Both are supplied by the client and neither is evidence of anything.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);

export interface AvatarResult {
  avatarUrl: string;
}

export async function uploadAvatar(
  userId: string,
  file: Buffer
): Promise<AvatarResult> {
  if (file.length === 0) {
    throw new AppError('No image was uploaded', 'VALIDATION_ERROR');
  }
  if (file.length > MAX_UPLOAD_BYTES) {
    throw new AppError('Images must be under 5 MB', 'VALIDATION_ERROR');
  }

  let pipeline: Sharp;
  let metadata: Metadata;

  try {
    pipeline = sharp(file, {
      // A modest cap on decoded pixels. Without it a small file that expands to
      // an enormous bitmap — a decompression bomb — allocates until the process
      // dies, and the request that did it looks like an ordinary upload.
      limitInputPixels: 50_000_000,
      // Only the first frame of an animated GIF or WebP. An avatar is a still,
      // and processing every frame is work nobody asked for.
      pages: 1,
    });
    metadata = await pipeline.metadata();
  } catch {
    throw new AppError('That file is not an image we can read', 'VALIDATION_ERROR');
  }

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new AppError('Upload a JPEG, PNG, WebP, GIF or AVIF image', 'VALIDATION_ERROR');
  }

  const processed = await pipeline
    // Square, centred, from the middle of the frame. Faces sit in the middle
    // of a photograph far more often than not, and an avatar is round.
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    // No .withMetadata(): omitting it is what drops EXIF, including GPS.
    .toBuffer();

  const stored = await putObject(`avatars/${userId}`, processed, 'image/webp');

  const previous = await userRepository.findAvatarKey(userId);
  await userRepository.setAvatarKey(userId, stored.key);

  // After the pointer moves, so a failure here orphans an object rather than
  // leaving the row pointing at something that no longer exists.
  if (previous) await deleteObject(previous);

  return { avatarUrl: stored.url };
}

/**
 * Clears the avatar and removes the object.
 *
 * The row is updated first for the same reason as above: a user who asked to
 * remove their photo must stop seeing it even if the bucket is unreachable.
 */
export async function removeAvatar(userId: string): Promise<void> {
  const key = await userRepository.findAvatarKey(userId);
  await userRepository.setAvatarKey(userId, null);
  if (key) await deleteObject(key);
}

export function avatarUrlFor(key: string | null): string | null {
  return objectUrl(key);
}
