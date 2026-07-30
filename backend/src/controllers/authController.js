const authService = require('../services/authService');
const {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  clearCookieOptions,
} = require('../config/cookies');

function readCredentials(req) {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  return { email, password };
}

async function signup(req, res) {
  const credentials = readCredentials(req);
  if (!credentials) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { user, session } = await authService.signup(
      credentials.email,
      credentials.password
    );

    res.cookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions);
    return res.status(201).json({ user });
  } catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function login(req, res) {
  const credentials = readCredentials(req);
  if (!credentials) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { user, session } = await authService.login(
      credentials.email,
      credentials.password
    );

    res.cookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions);
    return res.status(200).json({ user });
  } catch (error) {
    // Same generic message whether the email is unknown or the password is
    // wrong, so the response body cannot be used to enumerate accounts.
    if (error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function logout(req, res) {
  try {
    await authService.logout(req.cookies?.[SESSION_COOKIE_NAME]);
    res.clearCookie(SESSION_COOKIE_NAME, clearCookieOptions);
    return res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// requireAuth has already resolved the user by the time this runs.
async function me(req, res) {
  return res.status(200).json({ user: req.user });
}

module.exports = { signup, login, logout, me };
