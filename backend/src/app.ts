import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pantryRouter from './routes/pantry.ts';
import mealPlanRouter from './routes/mealPlan.ts';
import authRouter from './routes/auth.ts';
import { globalLimiter } from './middleware/rateLimiters.ts';
import profileRouter from './routes/profile.ts';

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
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Cap the body size so a single large payload cannot exhaust memory.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use(globalLimiter);

app.get('/', (req, res) => {
  res.json({ message: 'Mosaic Kitchen API is running' });
});

app.use('/api/auth', authRouter);
app.use('/api/pantry', pantryRouter);
app.use('/api/meal-plan', mealPlanRouter);
app.use('/api/profile', profileRouter);

export default app;
