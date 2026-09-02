import type { Request, Response } from 'express';
import * as oauthService from '../services/oauthService.ts';
import { AppError, OAUTH_PROVIDERS } from '../types/index.ts';
import type { OAuthProvider } from '../types/index.ts';
import {
  OAUTH_TX_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  clearOauthTxCookieOptions,
  oauthTxCookieOptions,
  sessionCookieOptions,
} from '../config/cookies.ts';

interface OAuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
}

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:5173';
}

function apiOrigin(): string {
  return process.env.API_ORIGIN ?? 'http://localhost:3000';
}

// Takes unknown rather than string because Express 5 types a route parameter
// as string | string[] — a repeated parameter is possible — and narrowing it
// here keeps that shape out of the rest of the file.
function isProvider(value: unknown): value is OAuthProvider {
  return typeof value === 'string' && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

// Errors are carried back to the frontend as a redirect with a query
// parameter, not as JSON: the browser arrived here by following a redirect
// from the provider, so there is nothing to render a JSON body into.
function failTo(res: Response, reason: string) {
  const target = new URL('/login', appUrl());
  target.searchParams.set('error', reason);
  return res.redirect(target.href);
}

function readTransaction(req: Request): OAuthTransaction | null {
  const raw = req.cookies?.[OAUTH_TX_COOKIE_NAME];
  if (typeof raw !== 'string') return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OAuthTransaction>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.nonce !== 'string' ||
      typeof parsed.codeVerifier !== 'string'
    ) {
      return null;
    }
    return { state: parsed.state, nonce: parsed.nonce, codeVerifier: parsed.codeVerifier };
  } catch {
    // A tampered or truncated cookie is indistinguishable from an absent one
    // as far as this flow is concerned: either way there is nothing to verify
    // the callback against, so it must be rejected.
    return null;
  }
}

export async function start(req: Request, res: Response) {
  const provider = req.params.provider;
  if (!isProvider(provider)) {
    return failTo(res, 'unsupported_provider');
  }

  try {
    const request = await oauthService.buildAuthorizationRequest(provider);

    res.cookie(
      OAUTH_TX_COOKIE_NAME,
      JSON.stringify({
        state: request.state,
        nonce: request.nonce,
        codeVerifier: request.codeVerifier,
      }),
      oauthTxCookieOptions
    );

    return res.redirect(request.url);
  } catch (error) {
    if (error instanceof AppError) return failTo(res, 'provider_unavailable');
    console.error('OAuth start error:', error);
    return failTo(res, 'provider_unavailable');
  }
}

export async function callback(req: Request, res: Response) {
  const provider = req.params.provider;
  if (!isProvider(provider)) {
    return failTo(res, 'unsupported_provider');
  }

  const transaction = readTransaction(req);
  res.clearCookie(OAUTH_TX_COOKIE_NAME, clearOauthTxCookieOptions);

  // No transaction means no state to compare and no PKCE verifier to prove
  // this browser started the flow — which is precisely what a CSRF or code
  // injection attempt looks like.
  if (!transaction) return failTo(res, 'session_expired');

  try {
    // Rebuilt from the configured origin rather than from the Host header,
    // which a client controls. The library compares this against the
    // registered redirect_uri, so trusting the header would let a forwarded
    // request pass a check it should fail.
    const currentUrl = new URL(req.originalUrl, apiOrigin());

    const identity = await oauthService.exchangeCode(provider, currentUrl, transaction);
    const { user, session } = await oauthService.signInWithProvider(provider, identity);

    res.cookie(SESSION_COOKIE_NAME, session.id, sessionCookieOptions);
    return res.redirect(new URL('/dashboard', appUrl()).href);
  } catch (error) {
    if (error instanceof AppError && error.code === 'OAUTH_ERROR') {
      // Safe to surface: these messages describe what the user has to do next
      // and reveal nothing about whether an account exists that they did not
      // already prove they control.
      const target = new URL('/login', appUrl());
      target.searchParams.set('error', 'oauth_failed');
      target.searchParams.set('message', error.message);
      return res.redirect(target.href);
    }

    console.error('OAuth callback error:', error);
    return failTo(res, 'oauth_failed');
  }
}
