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

import type { BlockModel, Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';

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

/**
 * Append parsed template blocks to the end of the doc's first note,
 * inserting a divider first when the doc already has content.
 */
export function appendBlocksToDoc(page: Store, blocks: TemplateBlock[]) {
  const note = page.getBlocksByFlavour('affine:note')[0];
  if (!note) return false;

  const children =
    (
      note.model as unknown as {
        children?: { flavour?: string; text?: { toString: () => string } }[];
      }
    ).children ?? [];
  const hasContent = children.some(child => {
    const text = child.text?.toString().trim() ?? '';
    return text.length > 0 || (child.flavour ?? '') === 'affine:divider';
  });
  if (hasContent) {
    page.addBlock('affine:divider', {}, note.id);
  }

  for (const block of blocks) {
    if (block.flavour === 'affine:paragraph') {
      page.addBlock(
        'affine:paragraph',
        { type: block.type ?? 'text', text: new Text(block.text) },
        note.id
      );
    } else {
      page.addBlock(
        'affine:list',
        { type: block.type, text: new Text(block.text) },
        note.id
      );
    }
  }
  return true;
}

type BodyBlock = BlockModel & {
  flavour: string;
  text?: { toString(): string };
};

type TemplateSegment = {
  /** Position of this template in the bar (lower = higher up after sorting). */
  rank: number;
  /** Original position among segments, used to keep duplicates stable. */
  order: number;
  blocks: BodyBlock[];
};

/**
 * Heading text of a block, only if it's a heading paragraph. Heading type
 * lives on `props.type` — the model has no direct `type` getter (unlike
 * `text`), so reading `block.type` would be undefined.
 */
function paragraphHeadingText(block: BodyBlock): string | null {
  if (block.flavour !== 'affine:paragraph') return null;
  const type = (block as unknown as { props?: { type?: string } }).props?.type;
  if (typeof type !== 'string' || !type.startsWith('h')) return null;
  return block.text?.toString() ?? '';
}

/**
 * Match a heading's text to the template it belongs to. Tolerates user edits
 * that keep the template label as a prefix (e.g. editing "📚 學習日記" into
 * "📚 學習日記 · React") so a renamed entry stays in its category. When
 * several labels match, the longest (most specific) wins.
 */
function resolveTemplateRank(
  headingText: string,
  templates: StoredJournalTemplate[]
): { rank: number; label: string; templateId: string } | undefined {
  const text = headingText.trim();
  let best: { rank: number; label: string; templateId: string } | undefined;
  templates.forEach((template, index) => {
    const label = template.label.trim();
    if (!label) return;
    // startsWith also covers an exact match. Longest matching label wins.
    if (text.startsWith(label) && (!best || label.length > best.label.length)) {
      best = { rank: index, label, templateId: template.id };
    }
  });
  return best;
}

/**
 * Re-group and sort the journal body so template sections are clustered by
 * type and ordered the same way the template bar lists them (學習 → 旅遊 →
 * 美食 → 心情 by default). Each instance keeps its own blocks — including
 * whatever the user has typed into them — and same-type instances are placed
 * next to each other. Free-form text written before the first template stays
 * at the top. Dividers between sections are regenerated.
 *
 * Returns true only when blocks were actually moved, so callers can avoid
 * churn (and notifications) when nothing changed.
 */
export function reorderJournalTemplates(
  page: Store,
  templates: StoredJournalTemplate[]
): boolean {
  const note = page.getBlocksByFlavour('affine:note')[0];
  if (!note) return false;

  const noteModel = note.model as unknown as {
    id: string;
    children?: BodyBlock[];
  };
  const children = noteModel.children ?? [];
  if (children.length === 0) return false;

  const headingRank = (block: BodyBlock): number | null => {
    const headingText = paragraphHeadingText(block);
    if (headingText === null) return null;
    return resolveTemplateRank(headingText, templates)?.rank ?? null;
  };

  // Split the body into a preamble (anything before the first template) and
  // one segment per template instance. Dividers are collected here so they can
  // be dropped and regenerated; we don't re-read the (live) children later.
  const preamble: BodyBlock[] = [];
  const segments: TemplateSegment[] = [];
  const dividers: BodyBlock[] = [];
  let current: TemplateSegment | null = null;
  for (const child of children) {
    if (child.flavour === 'affine:divider') {
      dividers.push(child);
      continue;
    }
    const rank = headingRank(child);
    if (rank !== null) {
      current = { rank, order: segments.length, blocks: [child] };
      segments.push(current);
    } else if (current) {
      current.blocks.push(child);
    } else {
      preamble.push(child);
    }
  }

  // Grouping/sorting only matters with at least two template instances.
  if (segments.length < 2) return false;

  const sorted = [...segments].sort(
    (a, b) => a.rank - b.rank || a.order - b.order
  );
  const alreadyOrdered = sorted.every((seg, i) => seg === segments[i]);
  if (alreadyOrdered) return false;

  // Drop existing dividers, relocate each segment in the new order (moving the
  // real blocks preserves user input), then re-add dividers between sections.
  for (const divider of dividers) {
    page.deleteBlock(divider);
  }
  for (const seg of sorted) {
    page.moveBlocks(seg.blocks, note.model, null);
  }

  const hasPreambleContent = preamble.some(
    b => (b.text?.toString().trim() ?? '').length > 0
  );
  const dividerIndexes: number[] = [];
  let index = preamble.length;
  sorted.forEach((seg, i) => {
    if (i === 0 ? hasPreambleContent : true) dividerIndexes.push(index);
    index += seg.blocks.length;
  });
  // Insert from the highest index downward so earlier inserts don't shift the
  // positions still to be filled.
  for (let i = dividerIndexes.length - 1; i >= 0; i--) {
    page.addBlock('affine:divider', {}, noteModel.id, dividerIndexes[i]);
  }

  return true;
}

/** One journal entry as seen by the flip book: a template instance (or the
 *  free-form preamble) with its heading and body blocks. */
export type JournalSegment = {
  /** Template id this entry belongs to, or null for free-form preamble text. */
  templateId: string | null;
  /** Category label (e.g. "📚 學習日記"); empty for the preamble. */
  label: string;
  /** Heading text shown on hover; empty for the preamble. */
  title: string;
  /** Position used for ordering categories; -1 for the preamble. */
  rank: number;
  /** Block id of the heading paragraph, or null for the preamble. */
  headingBlockId: string | null;
  /** Block ids of the entry body (everything under the heading). */
  bodyBlockIds: string[];
  /** Body text joined by newlines — what the flip book textarea shows. */
  bodyText: string;
};

/**
 * Read-only companion to {@link reorderJournalTemplates}: split the journal
 * body into the same template instances the flip book navigates. Returns the
 * preamble first (if any) followed by each template instance in document
 * order. Heading detection mirrors the reorder logic (`props.type`).
 */
export function splitJournalSegments(
  page: Store,
  templates: StoredJournalTemplate[]
): JournalSegment[] {
  const note = page.getBlocksByFlavour('affine:note')[0];
  if (!note) return [];
  const children =
    (note.model as unknown as { children?: BodyBlock[] }).children ?? [];

  const matchHeading = (block: BodyBlock) => {
    const headingText = paragraphHeadingText(block);
    if (headingText === null) return undefined;
    return resolveTemplateRank(headingText, templates);
  };

  const appendBody = (seg: JournalSegment, block: BodyBlock) => {
    seg.bodyBlockIds.push(block.id);
    const text = block.text?.toString() ?? '';
    seg.bodyText += seg.bodyBlockIds.length > 1 ? `\n${text}` : text;
  };

  let preamble: JournalSegment | null = null;
  let current: JournalSegment | null = null;
  const segments: JournalSegment[] = [];

  for (const child of children) {
    if (child.flavour === 'affine:divider') continue;
    const info = matchHeading(child);
    if (info) {
      current = {
        templateId: info.templateId,
        label: info.label,
        title: child.text?.toString().trim() || info.label,
        rank: info.rank,
        headingBlockId: child.id,
        bodyBlockIds: [],
        bodyText: '',
      };
      segments.push(current);
    } else if (current) {
      appendBody(current, child);
    } else {
      if (!preamble) {
        preamble = {
          templateId: null,
          label: '',
          title: '',
          rank: -1,
          headingBlockId: null,
          bodyBlockIds: [],
          bodyText: '',
        };
      }
      appendBody(preamble, child);
    }
  }

  return preamble ? [preamble, ...segments] : segments;
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
