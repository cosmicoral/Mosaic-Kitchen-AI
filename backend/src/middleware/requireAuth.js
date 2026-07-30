const authService = require('../services/authService');
const { SESSION_COOKIE_NAME } = require('../config/cookies');

// Attaches req.user when the request carries a valid, unexpired session
// cookie. Any route mounted behind this middleware can assume req.user exists.
async function requireAuth(req, res, next) {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    const user = await authService.getSessionUser(sessionId);

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = user;
    req.sessionId = sessionId;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = requireAuth;
