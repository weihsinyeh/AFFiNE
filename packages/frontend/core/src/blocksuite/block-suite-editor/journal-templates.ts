/**
 * Shared store for the journal templates: used by the template bar on
 * journal docs (apply) and by the sidebar Template manager (edit/add).
 *
 * Template content is plain text, one block per line:
 *   `# text`  → big heading (h2)
 *   `## text` → small heading (h6)
 *   `- text`  → bulleted list item
 *   `[] text` → todo checkbox
 *   anything else → paragraph (empty line = empty paragraph)
 */

export const JOURNAL_TEMPLATES_STORAGE_KEY = 'JournalTemplates';

export type StoredJournalTemplate = {
  id: string;
  label: string;
  content: string;
};

export type TemplateBlock =
  | { flavour: 'affine:paragraph'; type?: string; text: string }
  | {
      flavour: 'affine:list';
      type: 'bulleted' | 'numbered' | 'todo';
      text: string;
    };

export function parseTemplateContent(content: string): TemplateBlock[] {
  return content
    .replace(/\n+$/, '')
    .split('\n')
    .map((line): TemplateBlock => {
      if (line.startsWith('# ')) {
        return { flavour: 'affine:paragraph', type: 'h2', text: line.slice(2) };
      }
      if (line.startsWith('## ')) {
        return { flavour: 'affine:paragraph', type: 'h6', text: line.slice(3) };
      }
      if (line.startsWith('- ') || line === '-') {
        return {
          flavour: 'affine:list',
          type: 'bulleted',
          text: line.slice(2),
        };
      }
      if (line.startsWith('[] ') || line === '[]') {
        return { flavour: 'affine:list', type: 'todo', text: line.slice(3) };
      }
      return { flavour: 'affine:paragraph', text: line };
    });
}

export const DEFAULT_JOURNAL_TEMPLATES: StoredJournalTemplate[] = [
  {
    id: 'study',
    label: '📚 學習日記',
    content: `# 📚 學習日記
## 課程／主題：

## 今天學到的三個重點
- 重點一：
- 重點二：
- 重點三：
## 還不太懂的地方（下次要問或查的）
-
## 課後行動
[] 複習今天的筆記
[] 完成相關作業／練習
## 一句話總結今天的收穫
`,
  },
  {
    id: 'travel',
    label: '✈️ 旅遊日記',
    content: `# ✈️ 旅遊日記
## 日期與目的地：

## 行程規劃
- 上午：
- 下午：
- 晚上：
## 交通與住宿備註

## 想吃的店／想去的點／想買的東西
[]
[]
## 今日亮點與心得
`,
  },
  {
    id: 'food',
    label: '🍜 美食日記',
    content: `# 🍜 美食日記
店名：
地點：
和誰一起：
點了什麼：
好吃程度（⭐1～5）：
吃飯時的心情：
心得（推薦的理由／雷點）：
下次還會再來嗎：`,
  },
  {
    id: 'mood',
    label: '📝 心情日記',
    content: `# 📝 心情日記
今日天氣：
今日心情：
## 今天發生的事

最感謝的一件事：
## 今天的總結
`,
  },
];
