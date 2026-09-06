import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

// Object storage behind an interface, with a filesystem implementation for
// development.
//
// Not abstraction for its own sake: without it, running the app locally would
// require a Cloudflare account and a set of credentials, and every contributor
// would be one misconfigured secret away from a broken signup. The S3 client
// is only constructed when the environment says to use it.
//
// R2 rather than S3 because egress is free. Avatars are read far more often
// than they are written, and S3's ~$0.09/GB egress is the line item that grows
// with traffic while the storage cost stays trivial.

export interface StoredObject {
  key: string;
  url: string;
}

function useR2(): boolean {
  return Boolean(process.env.R2_BUCKET && process.env.R2_ACCOUNT_ID);
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 is configured by bucket but the credentials are missing');
  }

  client = new S3Client({
    // R2 is S3-compatible but has no regions; 'auto' is what it expects.
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

/**
 * The public base for reading objects back.
 *
 * A custom domain in production: the r2.dev hostname is rate limited and is
 * documented as unsuitable for production traffic, and using it would also
 * publish the account id in every avatar URL.
 */
function publicBase(): string {
  return process.env.R2_PUBLIC_URL ?? `${process.env.API_ORIGIN ?? ''}/uploads`;
}

const LOCAL_ROOT = join(process.cwd(), '.uploads');

export async function putObject(
  prefix: string,
  body: Buffer,
  contentType: string
): Promise<StoredObject> {
  // A random key, never anything derived from the user. A predictable key —
  // the user id, an email hash — would let anyone who knows an address fetch
  // that person's photo straight out of a public bucket.
  const key = `${prefix}/${randomUUID()}.webp`;

  if (useR2()) {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Immutable because the key changes on every upload: a replaced avatar
        // is a new object, so nothing downstream ever has to be invalidated.
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
  } else {
    const path = join(LOCAL_ROOT, key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  return { key, url: `${publicBase()}/${key}` };
}

/**
 * Best-effort delete.
 *
 * Resolves rather than throwing when the object is already gone or the bucket
 * is unreachable, because the callers are "the user replaced their photo" and
 * "the user deleted their account". Neither should fail because a bucket is
 * having a bad day — an orphaned object costs a fraction of a penny, while a
 * failed account deletion is a legal right denied.
 */
export async function deleteObject(key: string): Promise<void> {
  try {
    if (useR2()) {
      await s3().send(
        new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })
      );
    } else {
      await rm(join(LOCAL_ROOT, key), { force: true });
    }
  } catch (error) {
    console.error(`Could not delete object ${key}:`, error);
  }
}

export function objectUrl(key: string | null): string | null {
  return key ? `${publicBase()}/${key}` : null;
}

export function storageBackend(): 'r2' | 'filesystem' {
  return useR2() ? 'r2' : 'filesystem';
}

export const LOCAL_UPLOAD_ROOT = LOCAL_ROOT;
