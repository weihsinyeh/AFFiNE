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

export type SmartTodoItem = {
  /** YYYY-MM-DD */
  date: string;
  tasks: string[];
};

export type SmartTodoExtraction = {
  reply?: string;
  todos?: SmartTodoItem[];
};

/**
 * Prompt for the "智慧增加todo list" chat mode: extract per-day todo items
 * (resolving relative dates against the current date) plus a short
 * conversational reply.
 */
export function buildSmartTodoPrompt(text: string, now: Date): string {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekday = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][now.getDay()];
  return `你是一個行事曆待辦助理。今天是 ${today}（${weekday}）。
使用者會用自然語言描述想做的事情，可能包含相對日期（例如「明天」「下週三」「這個週末」）。請：
1. 把內容拆解成一條一條具體的待辦任務，並依日期分組。相對日期一律換算成絕對日期（YYYY-MM-DD）。沒提到日期的任務歸到今天。
2. 用一句友善的話回覆使用者（與使用者相同的語言），總結你幫他安排了什麼。

嚴格以標準 JSON 物件回傳，不要包含任何 markdown 標籤。格式範例：
{"reply":"好的，我幫你安排了…","todos":[{"date":"2026-06-08","tasks":["買牛奶","回信給教授"]}]}
如果完全沒有可加入的待辦事項，回傳 {"reply":"...","todos":[]}。

使用者的訊息：
${text}`;
}

export type SmartMeetingItem = {
  /** YYYY-MM-DD */
  date: string;
  title: string;
  notes?: string;
  /** HH:mm, on a 30-minute grid (e.g. 14:00 / 14:30). */
  startTime?: string;
  endTime?: string;
  location?: string;
  /** True when the journal hints it's an online / video meeting. */
  online?: boolean;
};

export type SmartPlanExtraction = {
  reply?: string;
  todos?: SmartTodoItem[];
  meetings?: SmartMeetingItem[];
};

/**
 * Prompt for "AI智慧新增todo及meeting": scan a whole journal entry for hints
 * that imply follow-up todos (possibly on other days) or meetings worth
 * scheduling, resolving relative dates against the journal's own date.
 */
export function buildSmartTodoMeetingPrompt(
  text: string,
  refDate: Date
): string {
  const ref = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(refDate.getDate()).padStart(2, '0')}`;
  const weekday = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ][refDate.getDay()];
  return `你是一個貼心的日記助理。下面是一篇日記的內容，這篇日記的日期是 ${ref}（${weekday}）。
請仔細閱讀整篇內容，找出任何「字裡行間暗示」之後需要做的事，分成兩類：
1. 待辦事項（todo）：使用者提到、答應、或計畫之後要做的具體小事（例如「下週要還書」「明天記得回信」「月底前繳費」）。
2. 會議／約會（meeting）：提到要和某人見面、開會、約訪、聚餐等需要安排的事件（例如「禮拜五跟客戶開會」「下週和朋友吃飯」）。

規則：
- 只挑「真的有暗示要安排」的事，不要硬湊；沒有就回傳空陣列。
- 所有相對日期（明天、下週三、這個週末…）都換算成絕對日期 YYYY-MM-DD，以這篇日記的日期為基準。沒提到日期的，歸到這篇日記的日期 ${ref}。
- meeting 的 title 要簡短（例如「與客戶的專案會議」），notes 放補充細節（對象、議題），沒有就省略。
- 如果有提到時間，填 startTime／endTime，格式為 24 小時制 HH:mm，且**只用整點或半點**（例如 14:00、14:30）；只提到開始時間就只填 startTime；完全沒提到就省略。
- 如果有提到地點（實體地點、地址、店名、會議室…），填 location；沒有就省略。
- 如果有提到是「線上／視訊／遠端」會議（例如 Google Meet、視訊通話、線上開會、Zoom…），把 online 設為 true；否則省略或設 false。
- reply 用一句和日記相同語言的話，溫和地總結你發現了什麼。

嚴格以標準 JSON 物件回傳，不要任何 markdown 標籤或多餘文字。格式範例：
{"reply":"我發現幾件之後要做的事…","todos":[{"date":"${ref}","tasks":["還書給圖書館"]}],"meetings":[{"date":"${ref}","title":"與客戶的專案會議","notes":"討論下一階段需求","startTime":"14:00","endTime":"15:00","location":"台北辦公室 3 樓會議室","online":false}]}
若完全沒有可加入的事項，回傳 {"reply":"...","todos":[],"meetings":[]}。

日記內容：
${text}`;
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
  /** optional system instruction, e.g. attached doc contexts */
  systemText?: string;
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
  systemText,
  signal,
}: StreamGeminiChatOptions): AsyncGenerator<string> {
  const url = `${GEMINI_API_BASE}/models/${modelId}:streamGenerateContent?alt=sse`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents,
      ...(systemText
        ? { systemInstruction: { parts: [{ text: systemText }] } }
        : {}),
    }),
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
