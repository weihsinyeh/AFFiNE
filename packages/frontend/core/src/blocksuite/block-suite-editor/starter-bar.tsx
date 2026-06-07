import { Menu, MenuItem, notify } from '@affine/component';
import { streamGeminiChat } from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import { useEnableAI } from '@affine/core/components/hooks/affine/use-enable-ai';
import {
  DEFAULT_RECOMMEND_CITY,
  DEFAULT_RECOMMEND_DISTRICT,
  DEFAULT_RECOMMEND_MODEL_ID,
  FOOD_RECOMMEND_CITY_KEY,
  FOOD_RECOMMEND_DISTRICT_KEY,
  GEMINI_API_KEY_STORAGE_KEY,
  GEMINI_RECOMMEND_MODEL_STORAGE_KEY,
  TRAVEL_RECOMMEND_CITY_KEY,
  TRAVEL_RECOMMEND_DISTRICT_KEY,
} from '@affine/core/modules/ai-button/services/models';
import { GlobalStateService } from '@affine/core/modules/storage';
import { TemplateDocService } from '@affine/core/modules/template-doc';
import type { Store } from '@blocksuite/affine/store';
import { AiIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
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
        const city =
          globalState.get<string>(
            kind === 'travel'
              ? TRAVEL_RECOMMEND_CITY_KEY
              : FOOD_RECOMMEND_CITY_KEY
          ) ?? DEFAULT_RECOMMEND_CITY;
        const district =
          globalState.get<string>(
            kind === 'travel'
              ? TRAVEL_RECOMMEND_DISTRICT_KEY
              : FOOD_RECOMMEND_DISTRICT_KEY
          ) ?? DEFAULT_RECOMMEND_DISTRICT;

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
