import pool from '../db/pool.ts';

// SQL for the knowledge corpus. The tables exist and are empty; these queries
// are written and tested now so that populating the corpus is a data task
// rather than a data task plus a code task.

export interface KnowledgeDocumentInput {
  kind: string;
  title: string;
  body: string;
  cuisine?: string | null;
  region?: string | null;
  locale?: 'en' | 'zh';
  source?: string | null;
  sourceUrl?: string | null;
  licence?: string | null;
}

export async function createDocument(
  input: KnowledgeDocumentInput
): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO knowledge_documents
       (kind, title, body, cuisine, region, locale, source, source_url, licence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      input.kind,
      input.title,
      input.body,
      input.cuisine ?? null,
      input.region ?? null,
      input.locale ?? 'en',
      input.source ?? null,
      input.sourceUrl ?? null,
      input.licence ?? null,
    ]
  );

  const row = result.rows[0];
  if (!row) throw new Error('INSERT ... RETURNING returned no row');
  return row;
}

// Replaces every chunk for a document in one transaction. Chunking strategies
// change; a partial rewrite would leave a document indexed under two of them
// at once, and the retrieval results would be quietly incoherent rather than
// obviously broken.
export async function replaceChunks(
  documentId: string,
  chunks: readonly string[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [documentId]);

    for (const [index, content] of chunks.entries()) {
      await client.query(
        `INSERT INTO knowledge_chunks (document_id, chunk_index, content)
         VALUES ($1, $2, $3)`,
        [documentId, index, content]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface UnembeddedChunk {
  id: string;
  content: string;
}

// The indexing job's work queue. Ordered by id so a crashed run resumes in the
// same order rather than re-walking whatever the planner happens to return.
export async function findUnembeddedChunks(limit: number): Promise<UnembeddedChunk[]> {
  const result = await pool.query<UnembeddedChunk>(
    `SELECT id, content
       FROM knowledge_chunks
      WHERE embedding IS NULL
      ORDER BY id
      LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// pgvector accepts a bracketed string; the model name is stored alongside
// because embeddings from two models are not comparable, and a row that does
// not say which model produced it cannot be invalidated when the model changes.
export async function setEmbedding(
  chunkId: string,
  embedding: readonly number[],
  model: string
): Promise<void> {
  await pool.query(
    `UPDATE knowledge_chunks
        SET embedding = $2::vector, embedding_model = $3, embedded_at = now()
      WHERE id = $1`,
    [chunkId, `[${embedding.join(',')}]`, model]
  );
}

export interface ChunkMatch {
  document_id: string;
  title: string;
  content: string;
  distance: number;
  source: string | null;
}

/**
 * Scoped nearest-neighbour search.
 *
 * The scope is applied in the WHERE clause, before the ordering — narrowing
 * first and ranking second. Ranking first and filtering afterwards is the
 * classic way to return six documents about the wrong cuisine and then discard
 * five of them.
 *
 * `<=>` is pgvector's cosine distance operator and is what the HNSW index is
 * built for; using any other operator here would silently fall back to a
 * sequential scan.
 */
export async function searchChunks(
  embedding: readonly number[],
  scope: { cuisines?: readonly string[]; regions?: readonly string[]; locale?: string },
  limit: number
): Promise<ChunkMatch[]> {
  const result = await pool.query<ChunkMatch>(
    `SELECT d.id AS document_id,
            d.title,
            c.content,
            c.embedding <=> $1::vector AS distance,
            d.source
       FROM knowledge_chunks c
       JOIN knowledge_documents d ON d.id = c.document_id
      WHERE c.embedding IS NOT NULL
        AND ($2::text[] IS NULL OR d.cuisine = ANY($2))
        AND ($3::text[] IS NULL OR d.region  = ANY($3))
        AND ($4::text IS NULL OR d.locale = $4)
      ORDER BY c.embedding <=> $1::vector
      LIMIT $5`,
    [
      `[${embedding.join(',')}]`,
      scope.cuisines?.length ? scope.cuisines : null,
      scope.regions?.length ? scope.regions : null,
      scope.locale ?? null,
      limit,
    ]
  );
  return result.rows;
}

export async function countDocuments(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM knowledge_documents'
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countChunks(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM knowledge_chunks'
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function countEmbeddedChunks(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*) FROM knowledge_chunks WHERE embedding IS NOT NULL'
  );
  return Number(result.rows[0]?.count ?? 0);
}
