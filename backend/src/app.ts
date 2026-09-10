import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pantryRouter from './routes/pantry.ts';
import mealPlanRouter from './routes/mealPlan.ts';
import authRouter from './routes/auth.ts';
import accountRouter from './routes/account.ts';
import glossRouter from './routes/gloss.ts';
import avatarRouter from './routes/avatar.ts';
import { LOCAL_UPLOAD_ROOT, storageBackend } from './services/objectStorage.ts';
import { globalLimiter } from './middleware/rateLimiters.ts';
import profileRouter from './routes/profile.ts';
import shoppingListRouter from './routes/shoppingList.ts';
import billingRouter from './routes/billing.ts';
import * as billingController from './controllers/billingController.ts';

const app = express();

// Rate limiters key on the client IP. Behind a proxy (Railway, Render, Fly,
// nginx) the real IP arrives in X-Forwarded-For, so Express must be told to
// trust it — otherwise every request looks like it comes from the proxy and
// one visitor can exhaust the limit for everyone.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Sets a batch of defensive response headers (nosniff, frameguard, HSTS, ...).
app.use(helmet());

// Cookie auth requires an explicit origin: the spec forbids pairing
// Access-Control-Allow-Credentials with a wildcard origin.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) {
      // Requests with no Origin header (curl, native mobile clients,
      // server-to-server) are not subject to the browser's same-origin policy.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // The origin goes in the message, and it is the whole point of this
      // line. "Not allowed by CORS" plus a stack trace through the cors
      // package tells you what happened and withholds the only fact you need
      // to fix it — which origin, and what the allowlist actually contains at
      // runtime. Both are printed because a mismatch is usually a trailing
      // slash, a www, or a Vercel preview URL nobody thought to add.
      console.warn(
        `Refused a cross-origin request from ${origin}. ` +
          `CORS_ORIGINS currently allows: ${allowedOrigins.join(', ') || '(nothing)'}`
      );
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Mounted before express.json() and outside every router on purpose. Stripe
// signs the exact bytes it sent, so once a JSON parser has consumed and
// re-serialised the body those bytes are gone and verification fails with an
// error that reads like a wrong secret — sending you to look in the wrong
// place. It also sits outside requireAuth: Stripe carries no session, and the
// signature is the authentication.
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  billingController.webhook
);

// Cap the body size so a single large payload cannot exhaust memory.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(globalLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'Mosaic Kitchen API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/account', accountRouter);
app.use('/api/gloss', glossRouter);
app.use('/api/avatar', avatarRouter);

// Development only. Without R2 configured, uploads land on disk and have to be
// readable, or an avatar could be uploaded locally and never seen. In
// production R2 serves them directly and this route does not exist — Express
// is not a CDN and should not be asked to be one.
if (storageBackend() === 'filesystem') {
  app.use(
    '/uploads',
    express.static(LOCAL_UPLOAD_ROOT, {
      // Keys are random and an upload creates a new one, so a cached file can
      // never be stale.
      immutable: true,
      maxAge: '1y',
      // No directory listing, and no falling through to index.html.
      index: false,
      fallthrough: false,
    })
  );
}
app.use('/api/pantry', pantryRouter);
app.use('/api/meal-plan', mealPlanRouter);
app.use('/api/profile', profileRouter);
// Registered ahead of the authenticated billing router so the specific path
// wins: the pricing page has to render for logged-out visitors.
app.get('/api/billing/plans', billingController.plans);
app.use('/api/billing', billingRouter);
app.use('/api/shopping-list', shoppingListRouter);

export default app;
