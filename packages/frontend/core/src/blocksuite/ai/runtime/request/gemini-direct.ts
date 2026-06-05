import {
  DEFAULT_DOC_AI_MODEL_ID,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_DOC_AI_MODEL_STORAGE_KEY,
} from '@affine/core/modules/ai-button/services/models';

import type { AIChatMessage } from '../chat/state';

/**
 * Direct Google Gemini chat support.
 *
 * When the user selects a Gemini model (Settings -> General -> API Key) the
 * chat runtime bypasses the AFFiNE copilot backend entirely and streams the
 * response from the Google Generative Language API in the browser. This keeps
 * the Intelligence chat fully functional without a running AFFiNE server.
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function isGeminiDirectModel(
  modelId: string | null | undefined
): modelId is string {
  return !!modelId?.startsWith('gemini-');
}

/**
 * Read a GlobalState-backed setting directly from localStorage. The AI
 * request service lives outside the DI framework, so this mirrors the web
 * `LocalStorageGlobalState` implementation (`global-state:` prefix with
 * JSON-encoded values).
 */
function readGlobalStateSetting(key: string): string | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  const json = localStorage.getItem(`global-state:${key}`);
  if (!json) return undefined;
  try {
    const value = JSON.parse(json) as unknown;
    return typeof value === 'string' && value ? value : undefined;
  } catch {
    return undefined;
  }
}

export function getStoredGeminiApiKey(): string | undefined {
  return readGlobalStateSetting(GEMINI_API_KEY_STORAGE_KEY);
}

/** The Gemini model configured for in-doc /ai actions. */
export function getDocAiGeminiModelId(): string {
  return (
    readGlobalStateSetting(GEMINI_DOC_AI_MODEL_STORAGE_KEY) ??
    DEFAULT_DOC_AI_MODEL_ID
  );
}

/**
 * Compose a standalone prompt for an in-doc /ai action. The backend
 * normally expands a prompt template identified by `promptName`; the
 * direct Gemini path reproduces a compact instruction instead.
 */
export function buildGeminiActionPrompt(
  actionId: string,
  promptName: string,
  content: string,
  params?: { language?: unknown; tone?: unknown }
): string {
  if (actionId === 'chat') return content;
  let task = promptName;
  if (actionId === 'translate' && typeof params?.language === 'string') {
    task = `Translate to ${params.language}`;
  } else if (actionId === 'changeTone' && typeof params?.tone === 'string') {
    task = `Change tone to ${params.tone}`;
  }
  return `You are a writing assistant inside a note-taking app.
Task: ${task}.
Apply the task to the content below and reply with the result only — no preamble or explanations. Format the result as Markdown. Unless the task says otherwise, reply in the same language as the content.

Content:
${content}`;
}

type GeminiContent = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

/**
 * Convert the runtime chat transcript into Gemini `contents`, dropping the
 * empty assistant placeholder that the runtime appends before streaming.
 */
export function buildGeminiContents(
  messages: AIChatMessage[]
): GeminiContent[] {
  return messages
    .filter(
      message =>
        (message.role === 'user' || message.role === 'assistant') &&
        message.content.trim().length > 0
    )
    .map(message => ({
      role:
        message.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: message.content }],
    }));
}

type StreamGeminiChatOptions = {
  apiKey: string;
  modelId: string;
  contents: GeminiContent[];
  signal?: AbortSignal;
};

type GeminiStreamChunk = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
  error?: { message?: string };
};

function extractChunkText(chunk: GeminiStreamChunk): string {
  return (
    chunk.candidates?.[0]?.content?.parts
      ?.map(part => part.text ?? '')
      .join('') ?? ''
  );
}

type GeminiErrorBody = {
  error?: {
    message?: string;
    status?: string;
    details?: { reason?: string }[];
  };
};

async function toGeminiError(response: Response): Promise<Error> {
  let message = `Gemini API error (${response.status})`;
  let hint = '';
  try {
    const body = (await response.json()) as GeminiErrorBody;
    if (body.error?.message) {
      message = `Gemini: ${body.error.message}`;
    }
    const reason = body.error?.details?.find(d => d.reason)?.reason;
    const status = body.error?.status;
    if (reason === 'API_KEY_INVALID' || reason === 'API_KEY_EXPIRED') {
      hint = 'Check your API key in Settings → General → API Key.';
    } else if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED') {
      hint =
        'Your API key has website restrictions that block this site. Remove the restriction in Google Cloud Console, or create an unrestricted key in Google AI Studio.';
    } else if (
      status === 'PERMISSION_DENIED' ||
      message.includes('denied access')
    ) {
      hint =
        'Your key is valid but Google has blocked its project. This often happens with school/work (Workspace) accounts. Create a new key with a personal Google account at aistudio.google.com/app/apikey.';
    } else if (status === 'RESOURCE_EXHAUSTED') {
      hint = 'Rate limit or quota exceeded — wait a moment and try again.';
    } else if (reason === 'SERVICE_DISABLED') {
      hint =
        'The Generative Language API is disabled for this project. Enable it in Google Cloud Console, or create a key in Google AI Studio instead.';
    }
  } catch {
    // keep the generic message
  }
  return new Error(hint ? `${message} — ${hint}` : message);
}

/**
 * Stream a chat completion from the Gemini API as plain text chunks,
 * via the SSE variant of `streamGenerateContent`.
 */
export async function* streamGeminiChat({
  apiKey,
  modelId,
  contents,
  signal,
}: StreamGeminiChatOptions): AsyncGenerator<string> {
  const url = `${GEMINI_API_BASE}/models/${modelId}:streamGenerateContent?alt=sse`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({ contents }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw await toGeminiError(response);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        let chunk: GeminiStreamChunk;
        try {
          chunk = JSON.parse(data) as GeminiStreamChunk;
        } catch {
          continue;
        }
        if (chunk.error?.message) {
          throw new Error(`Gemini: ${chunk.error.message}`);
        }
        const text = extractChunkText(chunk);
        if (text) {
          yield text;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
