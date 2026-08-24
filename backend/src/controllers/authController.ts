import type { Request, Response } from 'express';
import * as authService from '../services/authService.ts';
import { AppError } from '../types/index.ts';
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  clearCookieOptions,
} from '../config/cookies.ts';

interface Credentials {
  email: string;
  password: string;
}

function readCredentials(req: Request): Credentials | null {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }
  return { email, password };
}

export async function signup(req: Request, res: Response) {
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
    // `error` is typed `unknown`; instanceof narrows it to AppError so .code
    // and .message are safe to read.
    if (error instanceof AppError) {
      if (error.code === 'VALIDATION_ERROR') {
        return res.status(400).json({ error: error.message });
      }
      if (error.code === 'EMAIL_TAKEN') {
        return res.status(409).json({ error: 'Email already registered' });
      }
    }
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
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
    if (error instanceof AppError && error.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function logout(req: Request, res: Response) {
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
export async function me(req: Request, res: Response) {
  return res.status(200).json({ user: req.user });
}
