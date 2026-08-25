import type { Request, Response } from 'express';
import * as pantryService from '../services/pantryService.ts';
import { AppError } from '../types/index.ts';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function handleError(error: unknown, res: Response, context: string) {
  if (error instanceof AppError) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ error: error.message });
    }
  }
  console.error(`${context}:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Checking the shape before the query matters: Postgres rejects a malformed
// uuid with error 22P02, which would surface as a 500. A bad id is a client
// mistake, not a server fault — and 404 rather than 400 keeps the response
// identical to "this id belongs to someone else".
function readItemId(req: Request, res: Response): string | null {
  const { id } = req.params;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id)) {
    res.status(404).json({ error: 'Pantry item not found' });
    return null;
  }
  return id;
}

export async function list(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const items = await pantryService.listItems(req.user.id);
    return res.status(200).json({ items });
  } catch (error) {
    return handleError(error, res, 'Pantry list error');
  }
}

export async function listExpiring(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const items = await pantryService.listExpiring(req.user.id, req.query.days);
    return res.status(200).json({ items });
  } catch (error) {
    return handleError(error, res, 'Pantry expiring error');
  }
}

export async function create(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  try {
    const item = await pantryService.addItem(req.user.id, req.body);
    return res.status(201).json({ item });
  } catch (error) {
    return handleError(error, res, 'Pantry create error');
  }
}

export async function update(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const id = readItemId(req, res);
  if (!id) return;

  try {
    const item = await pantryService.updateItem(req.user.id, id, req.body);
    return res.status(200).json({ item });
  } catch (error) {
    return handleError(error, res, 'Pantry update error');
  }
}

export async function remove(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const id = readItemId(req, res);
  if (!id) return;

  try {
    await pantryService.removeItem(req.user.id, id);
    return res.status(204).send();
  } catch (error) {
    return handleError(error, res, 'Pantry delete error');
  }
}