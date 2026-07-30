const crypto = require('crypto');
const bcrypt = require('bcrypt');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');

const SALT_ROUNDS = 12;
const SESSION_TTL_DAYS = 30;
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

function validationError(message) {
  const error = new Error(message);
  error.code = 'VALIDATION_ERROR';
  return error;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function assertValidCredentials(email, password) {
  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(normalizedEmail)) {
    throw validationError('A valid email address is required');
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw validationError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // bcrypt silently truncates beyond 72 bytes; reject long input outright
  // rather than accept a password whose tail is ignored.
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw validationError(`Password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }

  return normalizedEmail;
}

function generateSessionId() {
  // 32 bytes = 256 bits of entropy, hex-encoded to 64 characters.
  return crypto.randomBytes(32).toString('hex');
}

function sessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
}

async function startSession(userId) {
  const id = generateSessionId();
  const expiresAt = sessionExpiry();
  await sessionRepository.create(id, userId, expiresAt);
  return { id, expiresAt };
}

async function signup(email, password) {
  const normalizedEmail = assertValidCredentials(email, password);

  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) {
    const error = new Error('Email already registered');
    error.code = 'EMAIL_TAKEN';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create(normalizedEmail, passwordHash);
  const session = await startSession(user.id);

  return { user, session };
}

async function login(email, password) {
  const normalizedEmail = normalizeEmail(email);
  const user = await userRepository.findByEmail(normalizedEmail);

  // Always run a comparison, even when the user does not exist, so both
  // branches take the same amount of time.
  const passwordMatches = await bcrypt.compare(
    password,
    user ? user.password_hash : DUMMY_HASH
  );

  if (!user || !passwordMatches) {
    const error = new Error('Invalid email or password');
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const session = await startSession(user.id);

  return {
    user: { id: user.id, email: user.email, created_at: user.created_at },
    session,
  };
}

async function logout(sessionId) {
  if (!sessionId) return;
  await sessionRepository.deleteById(sessionId);
}

async function getSessionUser(sessionId) {
  if (!sessionId) return null;

  const row = await sessionRepository.findActiveWithUser(sessionId);
  if (!row) return null;

  return {
    id: row.user_id,
    email: row.email,
    created_at: row.user_created_at,
  };
}

module.exports = {
  signup,
  login,
  logout,
  getSessionUser,
  SESSION_TTL_DAYS,
};
