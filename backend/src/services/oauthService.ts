import * as client from 'openid-client';
import * as identityRepository from '../repositories/identityRepository.ts';
import * as userRepository from '../repositories/userRepository.ts';
import { startSession } from './authService.ts';
import { AppError } from '../types/index.ts';
import type { OAuthProvider, Session, User } from '../types/index.ts';

const GOOGLE_ISSUER = new URL('https://accounts.google.com');

// Discovery is a network round trip to the provider's well-known document.
// Cached per provider so it happens once per process rather than on every
// sign-in, and lazily so the app still boots without OAuth credentials.
const configurations = new Map<OAuthProvider, Promise<client.Configuration>>();

function providerConfig(provider: OAuthProvider): Promise<client.Configuration> {
  const cached = configurations.get(provider);
  if (cached) return cached;

  if (provider !== 'google') {
    throw new AppError(`${provider} sign-in is not enabled yet`, 'OAUTH_ERROR');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new AppError('Google sign-in is not configured', 'OAUTH_ERROR');
  }

  const discovered = client.discovery(GOOGLE_ISSUER, clientId, clientSecret);

  // Cached before it resolves, so ten simultaneous sign-ins share one
  // discovery request rather than each firing their own. A rejected promise is
  // evicted so a transient failure does not poison the process for good.
  configurations.set(provider, discovered);
  discovered.catch(() => configurations.delete(provider));

  return discovered;
}

export function redirectUri(provider: OAuthProvider): string {
  const origin = process.env.API_ORIGIN ?? 'http://localhost:3000';
  // Must match what is registered with the provider byte for byte. Anything
  // else fails as redirect_uri_mismatch, which is the single most common way
  // this integration breaks.
  return `${origin}/api/auth/${provider}/callback`;
}

export interface AuthorizationRequest {
  url: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export async function buildAuthorizationRequest(
  provider: OAuthProvider
): Promise<AuthorizationRequest> {
  const config = await providerConfig(provider);

  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();

  const url = client.buildAuthorizationUrl(config, {
    redirect_uri: redirectUri(provider),
    // The minimum that identifies a person. Every extra scope is another line
    // on the consent screen and another reason to abandon the flow.
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    nonce,
  });

  return { url: url.href, state, nonce, codeVerifier };
}

export interface ProviderIdentity {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
}

export async function exchangeCode(
  provider: OAuthProvider,
  currentUrl: URL,
  checks: { state: string; nonce: string; codeVerifier: string }
): Promise<ProviderIdentity> {
  const config = await providerConfig(provider);

  const tokens = await client.authorizationCodeGrant(config, currentUrl, {
    pkceCodeVerifier: checks.codeVerifier,
    expectedState: checks.state,
    expectedNonce: checks.nonce,
    idTokenExpected: true,
  });

  // Already signature-verified against the provider's JWKS, and checked for
  // issuer, audience, expiry and nonce by the library. Reading claims off an
  // id_token we validated ourselves would be re-implementing that badly.
  const claims = tokens.claims();
  if (!claims) throw new AppError('No id_token returned', 'OAUTH_ERROR');

  const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : null;

  // Apple returns this as the string "true" rather than a boolean, so both
  // shapes are accepted. Anything else is treated as unverified.
  const verifiedClaim = claims.email_verified;
  const emailVerified = verifiedClaim === true || verifiedClaim === 'true';

  return { providerUserId: claims.sub, email, emailVerified };
}

export interface SignInResult {
  user: User;
  session: Session;
  isNewUser: boolean;
}

export async function signInWithProvider(
  provider: OAuthProvider,
  identity: ProviderIdentity
): Promise<SignInResult> {
  // Always resolve by subject first. The email is only ever consulted when no
  // identity row exists yet, because a provider account that we have seen
  // before belongs to exactly one of our users regardless of what address it
  // reports today.
  const existingIdentity = await identityRepository.findByProviderUserId(
    provider,
    identity.providerUserId
  );

  if (existingIdentity) {
    const user = await userRepository.findById(existingIdentity.user_id);
    if (!user) throw new AppError('Linked account no longer exists', 'OAUTH_ERROR');

    await identityRepository.touchLastLogin(existingIdentity.id);
    return { user, session: await startSession(user.id), isNewUser: false };
  }

  if (!identity.email) {
    throw new AppError('The provider returned no email address', 'OAUTH_ERROR');
  }

  const existingUser = await userRepository.findByEmail(identity.email);

  if (existingUser) {
    // Linking on an unverified email would let anyone who can get a provider
    // to assert an address take over the matching password account. The
    // verified flag is the entire basis for treating this as the same person.
    if (!identity.emailVerified) {
      throw new AppError(
        'That email is already registered. Sign in with your password first, then link this account.',
        'OAUTH_ERROR'
      );
    }

    await identityRepository.link({
      userId: existingUser.id,
      provider,
      providerUserId: identity.providerUserId,
      email: identity.email,
    });

    return {
      user: { id: existingUser.id, email: existingUser.email, created_at: existingUser.created_at },
      session: await startSession(existingUser.id),
      isNewUser: false,
    };
  }

  // No password: this account can only ever be reached through the provider
  // until the user sets one.
  const user = await userRepository.create(identity.email, null);
  await identityRepository.link({
    userId: user.id,
    provider,
    providerUserId: identity.providerUserId,
    email: identity.email,
  });

  return { user, session: await startSession(user.id), isNewUser: true };
}
