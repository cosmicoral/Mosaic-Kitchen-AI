import type { Request, Response } from 'express';
import * as billingService from '../services/billingService.ts';
import { AppError } from '../types/index.ts';

export async function status(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    return res.status(200).json(await billingService.getStatus(req.user.id));
  } catch (error) {
    console.error('Billing status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function checkout(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const priceId = (req.body as { price_id?: unknown } | undefined)?.price_id;
  if (typeof priceId !== 'string') {
    return res.status(400).json({ error: 'price_id is required' });
  }

  try {
    const url = await billingService.createCheckoutSession(
      req.user.id,
      req.user.email,
      priceId
    );
    // Returned as JSON rather than a 302, so the frontend can show a spinner
    // and surface errors. A fetch cannot inspect a redirect it followed.
    return res.status(200).json({ url });
  } catch (error) {
    if (error instanceof AppError) {
      const statusCode = error.code === 'ALREADY_SUBSCRIBED' ? 409 : 400;
      return res.status(statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function portal(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const url = await billingService.createPortalSession(req.user.id);
    return res.status(200).json({ url });
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message, code: error.code });
    }
    console.error('Portal error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function webhook(req: Request, res: Response) {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    await billingService.handleWebhook(req.body as Buffer, signature);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);

    // The status code is an instruction to Stripe. A 4xx means "do not retry",
    // which is right for a forged signature and wrong for a bug of ours — that
    // needs a 5xx so the event is redelivered once we have fixed it.
    const isSignatureFailure =
      error instanceof Error && /signature/i.test(error.message);

    return res
      .status(isSignatureFailure ? 400 : 500)
      .json({ error: 'Webhook processing failed' });
  }
}
