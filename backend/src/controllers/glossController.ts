import type { Request, Response } from 'express';
import * as glossService from '../services/glossService.ts';
import { readLocale } from '../utils/locale.ts';

// Annotations for ingredient names the interface cannot translate itself.
// Deliberately a POST: the list of names is the request body, and a household
// pantry does not belong in a URL that ends up in an access log.
export async function gloss(req: Request, res: Response) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });

  const names = (req.body as { names?: unknown } | undefined)?.names;
  if (!Array.isArray(names) || names.some((name) => typeof name !== 'string')) {
    return res.status(400).json({ error: 'names must be an array of strings' });
  }

  try {
    const glosses = await glossService.glossIngredients(
      names as string[],
      readLocale(req.headers['accept-language']),
      req.user.id
    );
    return res.status(200).json({ glosses });
  } catch (error) {
    // The page shows the original names either way; a failed annotation is not
    // worth an error state.
    console.error('Could not gloss ingredients:', error);
    return res.status(200).json({ glosses: [] });
  }
}
