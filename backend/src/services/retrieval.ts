import * as knowledgeRepository from '../repositories/knowledgeRepository.ts';
import type { SupportedLocale } from '../utils/locale.ts';

// Retrieval over the curated knowledge base.
//
// STATUS: the schema exists, the corpus is empty, and no generation path calls
// this. It is landed early because the shape of the data is the hard part and
// an empty table is easier to argue about than one somebody has already filled
// in the wrong shape.
//
// The flag defaults to OFF and is checked at call time, so turning it on is a
// deployment decision rather than a code change — and so that a half-populated
// corpus cannot start influencing plans by accident.

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

export function retrievalEnabled(): boolean {
  return process.env.RETRIEVAL_ENABLED === 'true';
}

export interface RetrievalScope {
  // Narrowed BEFORE similarity is considered. A household that cooks Hunan and
  // Jeolla should not be shown a Neapolitan document because its embedding
  // happens to sit nearby — nearest-neighbour has no notion of relevance, only
  // of distance.
  cuisines?: readonly string[];
  regions?: readonly string[];
  locale?: SupportedLocale;
}

export interface RetrievedChunk {
  documentId: string;
  title: string;
  content: string;
  // Cosine distance: 0 is identical, 2 is opposite. Returned rather than
  // hidden so a caller can apply its own threshold, and so a bad match is
  // visible in a log rather than silently used.
  distance: number;
  source: string | null;
}

/**
 * Returns nothing until the corpus is populated and RETRIEVAL_ENABLED is set.
 *
 * Empty is a valid answer, not a failure: generation must work identically
 * with and without retrieval, or the corpus becomes a load-bearing dependency
 * that nobody can turn off.
 */
export async function retrieve(
  _query: string,
  _scope: RetrievalScope = {},
  limit = 6
): Promise<RetrievedChunk[]> {
  if (!retrievalEnabled()) return [];

  // Guard against a flag switched on before anything is indexed, which would
  // otherwise mean a similarity search across zero rows on every generation.
  const indexed = await knowledgeRepository.countEmbeddedChunks();
  if (indexed === 0) {
    console.warn('RETRIEVAL_ENABLED is set but no chunks are embedded; skipping retrieval.');
    return [];
  }

  // Deliberately unimplemented. The query embedding, the scoped ANN search and
  // the reranking all belong here, and writing them against an empty corpus
  // would be writing them against guesses about data that does not exist yet.
  // knowledgeRepository.searchChunks() holds the SQL and is tested; this is
  // the orchestration that is still missing.
  throw new Error(
    'Retrieval is enabled but not implemented. See docs/rag.md; unset RETRIEVAL_ENABLED.'
  );
}

/**
 * What the corpus currently holds. Exposed so the state is inspectable rather
 * than something to be inferred from behaviour — the whole failure mode of a
 * half-built retrieval layer is that it looks like it is working.
 */
export async function corpusStatus(): Promise<{
  enabled: boolean;
  documents: number;
  chunks: number;
  embedded: number;
  model: string;
}> {
  const [documents, chunks, embedded] = await Promise.all([
    knowledgeRepository.countDocuments(),
    knowledgeRepository.countChunks(),
    knowledgeRepository.countEmbeddedChunks(),
  ]);

  return {
    enabled: retrievalEnabled(),
    documents,
    chunks,
    embedded,
    model: EMBEDDING_MODEL,
  };
}
