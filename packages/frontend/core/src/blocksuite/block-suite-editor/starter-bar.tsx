import { Menu, MenuItem, Modal, notify } from '@affine/component';
import {
  buildSmartTodoMeetingPrompt,
  type SmartPlanExtraction,
  streamGeminiChat,
} from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import { useCreateSmartMeetings } from '@affine/core/components/hooks/affine/use-create-smart-meetings';
import { useCreateSmartTodos } from '@affine/core/components/hooks/affine/use-create-smart-todos';
import { useEnableAI } from '@affine/core/components/hooks/affine/use-enable-ai';
import {
  DEFAULT_RECOMMEND_CITY,
  DEFAULT_RECOMMEND_DISTRICT,
  DEFAULT_RECOMMEND_MODEL_ID,
  DEFAULT_TODO_MEETING_MODEL_ID,
  FOOD_RECOMMEND_CITY_KEY,
  FOOD_RECOMMEND_DISTRICT_KEY,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_RECOMMEND_MODEL_STORAGE_KEY,
  GEMINI_TODO_MEETING_MODEL_STORAGE_KEY,
  resolveRecommendLocation,
  TRAVEL_RECOMMEND_CITY_KEY,
  TRAVEL_RECOMMEND_DISTRICT_KEY,
} from '@affine/core/modules/ai-button/services/models';
import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import { TemplateDocService } from '@affine/core/modules/template-doc';
import type { Store } from '@blocksuite/affine/store';
import { AiIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import dayjs from 'dayjs';
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { appendBlocksToDoc, parseTemplateContent } from './journal-templates';
import * as styles from './starter-bar.css';

const Badge = forwardRef<
  HTMLLIElement,
  HTMLAttributes<HTMLLIElement> & {
    icon: React.ReactNode;
    text: string;
    active?: boolean;
  }
>(function Badge({ icon, text, className, active, ...attrs }, ref) {
  return (
    <li
      data-active={active}
      className={clsx(styles.badge, className)}
      ref={ref}
      {...attrs}
    >
      <span className={styles.badgeText}>{text}</span>
      <span className={styles.badgeIcon}>{icon}</span>
    </li>
  );
});

const buildRecommendPrompt = (
  kind: 'travel' | 'food',
  city: string,
  district: string
) => {
  const seed = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const common = `（隨機種子：${seed}。每次推薦都要不一樣，避免老是推薦最熱門的同一個地方，帶點驚喜感，但必須是真實存在的地點。）
請「嚴格」用以下純文字格式回覆，每行一個區塊，行首符號規則：「# 」大標題、「## 」小標題、「- 」圓點、「[] 」待辦方框，其他行為一般段落。不要輸出任何其他說明或 markdown 語法。`;

  if (kind === 'travel') {
    return `你是台灣在地旅遊達人。請隨機推薦一個「${city}${district}」或鄰近地區的今日輕旅行行程，適合臨時起意出門的人。${common}
格式範例：
# ✈️ 旅遊日記（AI 推薦）
## 今日推薦：(地點名稱)
(一兩句話介紹這個地方和推薦理由)
## 行程規劃
- 上午：(具體地點與活動)
- 下午：(具體地點與活動)
- 晚上：(具體地點與活動)
## 交通建議
(怎麼去)
## 小提醒
[] 出發前查一下天氣
[] (其他提醒)
## 今日心得
`;
  }
  return `你是台灣在地美食達人。請隨機推薦「${city}${district}」或鄰近地區的美食，適合不知道今天要吃什麼的人。推薦 2 家真實存在的店。${common}
格式範例：
# 🍜 美食日記（AI 推薦）
## 今日推薦店家
- (店名一)：(類型、必點菜色、大約價位)
- (店名二)：(類型、必點菜色、大約價位)
## 為什麼推薦
(一兩句話)
## 用餐筆記
店名：
點了什麼：
好吃程度（⭐1～5）：
心得：
`;
};

type BlockLike = {
  text?: { toString(): string };
  children?: BlockLike[];
};

/** Flatten a doc's note body into newline-joined plain text for the AI. */
const getDocPlainText = (doc: Store): string => {
  const note = doc.getBlocksByFlavour('affine:note')[0];
  const root =
    (note?.model as unknown as { children?: BlockLike[] })?.children ?? [];
  const lines: string[] = [];
  const walk = (blocks: BlockLike[]) => {
    for (const block of blocks) {
      const text = block.text?.toString().trim() ?? '';
      if (text) lines.push(text);
      if (block.children?.length) walk(block.children);
    }
  };
  walk(root);
  return lines.join('\n');
};

type Suggestion =
  | { id: string; kind: 'todo'; date: string; text: string; added: boolean }
  | {
      id: string;
      kind: 'meeting';
      date: string;
      title: string;
      notes?: string;
      added: boolean;
    };

/**
 * "end with" row: a single AI button that reads the whole journal entry,
 * asks Gemini whether anything in it hints at follow-up todos (possibly on
 * other days) or meetings worth scheduling, and shows the suggestions in a
 * dialog. The user adds each one individually — todos and meetings get
 * distinctly coloured "加入" buttons — and accepting one creates the matching
 * Todo / Meeting doc on the journal calendar.
 */
const JournalSmartPlan = ({ doc }: { doc: Store }) => {
  const globalState = useService(GlobalStateService).globalState;
  const journalService = useService(JournalService);
  const journalDate = useLiveData(journalService.journalDate$(doc.id));
  const createTodos = useCreateSmartTodos();
  const createMeetings = useCreateSmartMeetings();

  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const analyze = useCallback(async () => {
    if (analyzing) return;
    const apiKey = globalState.get<string>(GEMINI_API_KEY_STORAGE_KEY);
    if (!apiKey) {
      notify.error({
        title: '尚未設定 Gemini API key',
        message: '請先到 Settings → General → API Key 設定。',
      });
      return;
    }
    const text = getDocPlainText(doc);
    if (!text.trim()) {
      notify.error({ title: '這篇日記沒有內容可以分析' });
      return;
    }
    setAnalyzing(true);
    try {
      const modelId =
        globalState.get<string>(GEMINI_TODO_MEETING_MODEL_STORAGE_KEY) ??
        DEFAULT_TODO_MEETING_MODEL_ID;
      const refDate = journalDate ? dayjs(journalDate).toDate() : new Date();
      const prompt = buildSmartTodoMeetingPrompt(text, refDate);
      let result = '';
      for await (const chunk of streamGeminiChat({
        apiKey,
        modelId,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      })) {
        result += chunk;
      }
      const match = result.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error(`無法解析 AI 回應：${result.slice(0, 200)}`);
      }
      const parsed = JSON.parse(match[0]) as SmartPlanExtraction;
      const next: Suggestion[] = [];
      (parsed.todos ?? []).forEach((todo, ti) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(todo?.date ?? '')) return;
        (todo.tasks ?? []).forEach((task, taskIdx) => {
          const value = task?.trim();
          if (value) {
            next.push({
              id: `todo-${ti}-${taskIdx}`,
              kind: 'todo',
              date: todo.date,
              text: value,
              added: false,
            });
          }
        });
      });
      (parsed.meetings ?? []).forEach((meeting, mi) => {
        const title = meeting?.title?.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(meeting?.date ?? '') || !title) return;
        next.push({
          id: `meeting-${mi}`,
          kind: 'meeting',
          date: meeting.date,
          title,
          notes: meeting.notes?.trim() || undefined,
          added: false,
        });
      });
      setReply(parsed.reply ?? '');
      setSuggestions(next);
      setOpen(true);
    } catch (error) {
      console.error('AI智慧新增todo及meeting失敗:', error);
      notify.error({
        title: 'AI 分析失敗',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setAnalyzing(false);
    }
  }, [analyzing, doc, globalState, journalDate]);

  const addSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      try {
        if (suggestion.kind === 'todo') {
          await createTodos([
            { date: suggestion.date, tasks: [suggestion.text] },
          ]);
        } else {
          await createMeetings([
            {
              date: suggestion.date,
              title: suggestion.title,
              notes: suggestion.notes,
            },
          ]);
        }
        setSuggestions(prev =>
          prev.map(item =>
            item.id === suggestion.id ? { ...item, added: true } : item
          )
        );
        notify.success({
          title:
            suggestion.kind === 'todo'
              ? `已加入待辦 · ${suggestion.date}`
              : `已加入會議 · ${suggestion.date}`,
        });
      } catch (error) {
        notify.error({
          title: '加入失敗',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [createTodos, createMeetings]
  );

  return (
    <>
      <div className={styles.root} data-testid="journal-smart-plan-bar">
        end with
        <ul className={styles.badges}>
          <Badge
            data-testid="smart-plan-badge"
            icon={<AiIcon className={styles.aiIcon} />}
            text={analyzing ? 'AI 分析中...' : 'AI智慧新增todo及meeting'}
            active={analyzing}
            onClick={() => void analyze()}
          />
        </ul>
      </div>
      <Modal open={open} onOpenChange={setOpen} width={460} title="AI 建議">
        {reply ? <div className={styles.dialogReply}>{reply}</div> : null}
        {suggestions.length === 0 ? (
          <div className={styles.suggestEmpty}>
            AI 沒有發現可加入的待辦或會議。
          </div>
        ) : (
          <div className={styles.suggestList}>
            {suggestions.map(suggestion => (
              <div
                key={suggestion.id}
                className={styles.suggestItem}
                data-testid="smart-plan-suggestion"
                data-kind={suggestion.kind}
              >
                <div className={styles.suggestMain}>
                  <div className={styles.suggestTop}>
                    <span
                      className={clsx(
                        styles.kindChip,
                        suggestion.kind === 'todo'
                          ? styles.kindTodo
                          : styles.kindMeeting
                      )}
                    >
                      {suggestion.kind === 'todo' ? '待辦' : '會議'}
                    </span>
                    <span className={styles.suggestDate}>
                      {suggestion.date}
                    </span>
                  </div>
                  <span className={styles.suggestText}>
                    {suggestion.kind === 'todo'
                      ? suggestion.text
                      : suggestion.title}
                  </span>
                  {suggestion.kind === 'meeting' && suggestion.notes ? (
                    <span className={styles.suggestNotes}>
                      {suggestion.notes}
                    </span>
                  ) : null}
                </div>
                {suggestion.added ? (
                  <span className={styles.addedTag}>✓ 已加入</span>
                ) : (
                  <button
                    className={
                      suggestion.kind === 'todo'
                        ? styles.addTodo
                        : styles.addMeeting
                    }
                    onClick={() => void addSuggestion(suggestion)}
                    data-testid="smart-plan-add"
                  >
                    加入{suggestion.kind === 'todo' ? '待辦' : '會議'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
};

const StarterBarNotEmpty = ({ doc }: { doc: Store }) => {
  const globalState = useService(GlobalStateService).globalState;
  const enableAI = useEnableAI();
  const [generating, setGenerating] = useState(false);

  const generateRecommend = useCallback(
    async (kind: 'travel' | 'food') => {
      if (generating) return;
      const apiKey = globalState.get<string>(GEMINI_API_KEY_STORAGE_KEY);
      if (!apiKey) {
        notify.error({
          title: '尚未設定 Gemini API key',
          message: '請先到 Settings → General → API Key 設定。',
        });
        return;
      }
      setGenerating(true);
      try {
        const modelId =
          globalState.get<string>(GEMINI_RECOMMEND_MODEL_STORAGE_KEY) ??
          DEFAULT_RECOMMEND_MODEL_ID;
        // resolve 隨機 city/district into a concrete location
        const { city, district } = resolveRecommendLocation(
          globalState.get<string>(
            kind === 'travel'
              ? TRAVEL_RECOMMEND_CITY_KEY
              : FOOD_RECOMMEND_CITY_KEY
          ) ?? DEFAULT_RECOMMEND_CITY,
          globalState.get<string>(
            kind === 'travel'
              ? TRAVEL_RECOMMEND_DISTRICT_KEY
              : FOOD_RECOMMEND_DISTRICT_KEY
          ) ?? DEFAULT_RECOMMEND_DISTRICT
        );

        const prompt = buildRecommendPrompt(kind, city, district);
        let result = '';
        for await (const chunk of streamGeminiChat({
          apiKey,
          modelId,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        })) {
          result += chunk;
        }
        const blocks = parseTemplateContent(result.trim());
        if (blocks.length === 0) {
          throw new Error('AI 回應為空');
        }
        appendBlocksToDoc(doc, blocks);
        notify.success({
          title:
            kind === 'travel'
              ? `已為你推薦${city}${district}的行程！`
              : `已為你推薦${city}${district}的美食！`,
        });
      } catch (error) {
        console.error('AI 智慧推薦失敗:', error);
        notify.error({
          title: 'AI 智慧推薦失敗',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setGenerating(false);
      }
    },
    [doc, generating, globalState]
  );

  if (!enableAI) {
    return null;
  }

  return (
    <>
      <div className={styles.root} data-testid="starter-bar">
        Start with
        <ul className={styles.badges}>
          <Menu
            items={
              <>
                <MenuItem
                  onSelect={() => void generateRecommend('travel')}
                  data-testid="ai-recommend-travel"
                >
                  ✈️ 旅遊日記（隨機推薦去處）
                </MenuItem>
                <MenuItem
                  onSelect={() => void generateRecommend('food')}
                  data-testid="ai-recommend-food"
                >
                  🍜 美食日記（隨機推薦吃的）
                </MenuItem>
              </>
            }
          >
            <Badge
              data-testid="start-with-ai-badge"
              icon={<AiIcon className={styles.aiIcon} />}
              text={generating ? 'AI 推薦生成中...' : 'AI智慧推薦'}
              active={generating}
            />
          </Menu>
        </ul>
      </div>
      <JournalSmartPlan doc={doc} />
    </>
  );
};

export const StarterBar = ({ doc }: { doc: Store }) => {
  const templateDocService = useService(TemplateDocService);

  const isTemplate = useLiveData(
    useMemo(
      () => templateDocService.list.isTemplate$(doc.id),
      [doc.id, templateDocService.list]
    )
  );

  // always visible (not only on empty docs): generated recommendations are
  // appended after the existing content with a divider
  if (isTemplate) return null;

  return <StarterBarNotEmpty doc={doc} />;
};
