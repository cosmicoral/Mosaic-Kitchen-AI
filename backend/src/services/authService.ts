import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import * as userRepository from '../repositories/userRepository.ts';
import * as sessionRepository from '../repositories/sessionRepository.ts';
import { AppError } from '../types/index.ts';
import type { Session, User } from '../types/index.ts';

const SALT_ROUNDS = 12;
export const SESSION_TTL_DAYS = 30;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 upper bound

// Deliberately simple: catches obvious typos without rejecting valid but
// unusual addresses. Real deliverability is proven by a verification email,
// not by a regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Pre-computed hash of a value nobody can log in with. Used to keep the
// "user does not exist" path as slow as the "wrong password" path, so response
// timing cannot be used to enumerate which emails are registered.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidCredentials(email: string, password: string): string {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw new AppError('A valid email address is required', 'VALIDATION_ERROR');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      'VALIDATION_ERROR'
    );
  }

  // bcrypt silently truncates beyond 72 bytes; reject long input outright
  // rather than accept a password whose tail is ignored.
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new AppError(
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      'VALIDATION_ERROR'
    );
  }

  if (!/[a-z]/.test(password)) {
    throw new AppError('Password must include a lowercase letter', 'VALIDATION_ERROR');
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError('Password must include an uppercase letter', 'VALIDATION_ERROR');
  }
  if (!/\d/.test(password)) {
    throw new AppError('Password must include a number', 'VALIDATION_ERROR');
  }
  if (!/[^A-Za-z0-9\s]/.test(password)) {
    throw new AppError('Password must include a special character', 'VALIDATION_ERROR');
  }

  return normalizedEmail;
}

function generateSessionId(): string {
  // 32 bytes = 256 bits of entropy, hex-encoded to 64 characters.
  return crypto.randomBytes(32).toString('hex');
}

function sessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function startSession(userId: string): Promise<Session> {
  const id = generateSessionId();
  const expiresAt = sessionExpiry();
  return sessionRepository.create(id, userId, expiresAt);
}

export interface AuthResult {
  user: User;
  session: Session;
}

export async function signup(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = assertValidCredentials(email, password);

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    throw new AppError('Email already registered', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create(normalizedEmail, passwordHash);
  const session = await startSession(user.id);

  return { user, session };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  // Always run a comparison, even when the user does not exist, so both
  // branches take the same amount of time.
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !passwordMatches) {
    throw new AppError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const session = await startSession(user.id);

  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    session,
  };
}

export async function logout(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  await sessionRepository.deleteById(sessionId);
}

export async function getSessionUser(sessionId: string | undefined): Promise<User | null> {
  if (!sessionId) return null;

  const row = await sessionRepository.findActiveWithUser(sessionId);
  if (!row) return null;

  return {
    id: row.user_id,
    email: row.email,
    created_at: row.user_created_at,
  };
}
