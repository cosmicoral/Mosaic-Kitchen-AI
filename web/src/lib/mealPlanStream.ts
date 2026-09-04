import { ApiError } from './api';
import { getStoredLocale } from '../context/LocaleContext';
import type { MealPlanRecord } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const GENERATION_STAGES = [
  'profile',
  'pantry',
  'generating',
  'checking',
  'retrying',
  'saving',
] as const;

export type GenerationStage = (typeof GENERATION_STAGES)[number];

export interface StageEvent {
  stage: GenerationStage;
  attempt: number;
  detail?: string;
}

// EventSource is not usable here: it only issues GET requests, and this call
// both spends money and needs the session cookie on a cross-origin request in
// production. fetch gives us POST, credentials and a readable body; the cost
// is parsing the wire format by hand, which is four lines.
function parseEvents(chunk: string): Array<{ event: string; data: string }> {
  return chunk
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block.length > 0 && !block.startsWith(':'))
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim() ?? 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      return { event, data };
    });
}

export async function streamMealPlan(
  onStage: (event: StageEvent) => void
): Promise<MealPlanRecord> {
  const response = await fetch(`${API_URL}/api/meal-plan/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept-Language': getStoredLocale() === 'zh' ? 'zh-CN' : 'en-GB',
    },
  });

  // Anything that fails before the stream opens — auth, rate limit — still
  // arrives as an ordinary status code, so it is handled the ordinary way.
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };
    throw new ApiError(
      body.error ?? `Request failed (${response.status})`,
      response.status,
      body.code ?? null
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  // Events do not arrive aligned to chunk boundaries, so anything after the
  // last blank line is an incomplete event and has to wait for more bytes.
  let buffer = '';
  let result: MealPlanRecord | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lastBreak = buffer.lastIndexOf('\n\n');
    if (lastBreak === -1) continue;

    const complete = buffer.slice(0, lastBreak);
    buffer = buffer.slice(lastBreak + 2);

    for (const { event, data } of parseEvents(complete)) {
      if (event === 'stage') {
        onStage(JSON.parse(data) as StageEvent);
      } else if (event === 'done') {
        result = (JSON.parse(data) as { mealPlan: MealPlanRecord }).mealPlan;
      } else if (event === 'failed') {
        const payload = JSON.parse(data) as { error: string; code: string | null };
        // 500 as a stand-in status: the real one was spent on the 200 that
        // opened the stream, and callers only ever read .code.
        throw new ApiError(payload.error, 500, payload.code);
      }
    }
  }

  if (!result) {
    // The stream ended without a verdict, which usually means the connection
    // dropped mid-generation. The plan may well have been saved — refetching
    // the latest plan is the honest recovery, not a second paid attempt.
    throw new ApiError('The connection dropped while your plan was being built', 500, 'STREAM_INCOMPLETE');
  }

  return result;
}
