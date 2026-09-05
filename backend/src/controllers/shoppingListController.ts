import type { Request, Response } from 'express';
import * as shoppingListService from '../services/shoppingListService.ts';
import { AppError } from '../types/index.ts';
import { readLocale } from '../utils/locale.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function handleError(error: unknown, res: Response, context: string) {
  if (error instanceof AppError) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message, code: error.code });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message, code: error.code });
    }
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

function readItemId(req: Request, res: Response): string | null {
  const { id } = req.params;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    res.status(404).json({ error: 'Item not found' });
    return null;
  }
  return id;
}

export async function list(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  try {
    return res.status(200).json({ items: await shoppingListService.getList(req.user.id) });
  } catch (error) {
    return handleError(error, res, 'Shopping list fetch error');
  }
}

export async function generate(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  try {
    const items = await shoppingListService.generateFromLatestPlan(
      req.user.id,
      readLocale(req.headers['accept-language'])
    );
    return res.status(200).json({ items });
  } catch (error) {
    return handleError(error, res, 'Shopping list generation error');
  }
}

export async function addItem(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  try {
    const item = await shoppingListService.addManualItem(req.user.id, req.body);
    return res.status(201).json({ item });
  } catch (error) {
    return handleError(error, res, 'Shopping list add error');
  }
}

export async function updateItem(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const id = readItemId(req, res);
  if (!id) return;

  try {
    const item = await shoppingListService.updateItem(req.user.id, id, req.body);
    return res.status(200).json({ item });
  } catch (error) {
    return handleError(error, res, 'Shopping list update error');
  }
}

export async function removeItem(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const id = readItemId(req, res);
  if (!id) return;

  try {
    await shoppingListService.removeItem(req.user.id, id);
    return res.status(204).send();
  } catch (error) {
    return handleError(error, res, 'Shopping list delete error');
  }
}

export async function clearChecked(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  try {
    const removed = await shoppingListService.clearChecked(req.user.id);
    return res.status(200).json({ removed });
  } catch (error) {
    return handleError(error, res, 'Shopping list clear error');
  }
}