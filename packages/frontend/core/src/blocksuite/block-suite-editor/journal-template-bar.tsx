import { notify } from '@affine/component';
import { JournalService } from '@affine/core/modules/journal';
import type { Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback } from 'react';

import * as styles from './journal-template-bar.css';

type TemplateBlock =
  | { flavour: 'affine:paragraph'; type?: string; text: string }
  | {
      flavour: 'affine:list';
      type: 'bulleted' | 'numbered' | 'todo';
      text: string;
    };

type JournalTemplate = {
  key: string;
  label: string;
  blocks: TemplateBlock[];
};

const p = (text: string, type?: string): TemplateBlock => ({
  flavour: 'affine:paragraph',
  type,
  text,
});
const todo = (text = ''): TemplateBlock => ({
  flavour: 'affine:list',
  type: 'todo',
  text,
});
const bullet = (text = ''): TemplateBlock => ({
  flavour: 'affine:list',
  type: 'bulleted',
  text,
});

/**
 * Pre-written journal sections. Applying a template only appends text
 * blocks to the journal body — nothing else on the page is touched, and
 * templates can be stacked multiple times per day.
 */
const JOURNAL_TEMPLATES: JournalTemplate[] = [
  {
    key: 'study',
    label: '📚 學習日記',
    blocks: [
      p('📚 學習日記', 'h2'),
      p('課程／主題：', 'h6'),
      p(''),
      p('今天學到的三個重點', 'h6'),
      bullet('重點一：'),
      bullet('重點二：'),
      bullet('重點三：'),
      p('還不太懂的地方（下次要問或查的）', 'h6'),
      bullet(''),
      p('課後行動', 'h6'),
      todo('複習今天的筆記'),
      todo('完成相關作業／練習'),
      p('一句話總結今天的收穫', 'h6'),
      p(''),
    ],
  },
  {
    key: 'travel',
    label: '✈️ 旅遊日記',
    blocks: [
      p('✈️ 旅遊日記', 'h2'),
      p('日期與目的地：', 'h6'),
      p(''),
      p('行程規劃', 'h6'),
      bullet('上午：'),
      bullet('下午：'),
      bullet('晚上：'),
      p('交通與住宿備註', 'h6'),
      p(''),
      p('想吃的店／想去的點／想買的東西', 'h6'),
      todo(''),
      todo(''),
      p('今日亮點與心得', 'h6'),
      p(''),
    ],
  },
  {
    key: 'food',
    label: '🍜 美食日記',
    blocks: [
      p('🍜 美食日記', 'h2'),
      p('店名：'),
      p('地點：'),
      p('和誰一起：'),
      p('點了什麼：'),
      p('好吃程度（⭐1～5）：'),
      p('吃飯時的心情：'),
      p('心得（推薦的理由／雷點）：'),
      p('下次還會再來嗎：'),
    ],
  },
  {
    key: 'mood',
    label: '📝 心情日記',
    blocks: [
      p('📝 心情日記', 'h2'),
      p('今日天氣：'),
      p('今日心情：'),
      p('今天發生的事', 'h6'),
      p(''),
      p('最感謝的一件事：'),
      p('今天的總結', 'h6'),
      p(''),
    ],
  },
];

/**
 * A row of journal template buttons shown below the Info table. Each click
 * appends the template's pre-written text to the end of the journal body,
 * separated by a divider — so multiple entries (e.g. several 美食日記) can
 * coexist in one day.
 */
export const JournalTemplateBar = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const dateStr = useLiveData(journalService.journalDate$(page.id));

  const applyTemplate = useCallback(
    (template: JournalTemplate) => {
      const note = page.getBlocksByFlavour('affine:note')[0];
      if (!note) return;

      // separate from existing content with a divider
      const children =
        (
          note.model as unknown as {
            children?: {
              flavour?: string;
              text?: { toString: () => string };
            }[];
          }
        ).children ?? [];
      const hasContent = children.some(child => {
        const text = child.text?.toString().trim() ?? '';
        return text.length > 0 || (child.flavour ?? '') === 'affine:divider';
      });
      if (hasContent) {
        page.addBlock('affine:divider', {}, note.id);
      }

      for (const block of template.blocks) {
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
      notify.success({ title: `已加入${template.label}模板` });
    },
    [page]
  );

  if (!dateStr) return null;

  return (
    <div className={styles.container} data-testid="journal-template-bar">
      <div className={styles.bar}>
        <span className={styles.label}>Templates</span>
        {JOURNAL_TEMPLATES.map(template => (
          <button
            key={template.key}
            className={styles.templateButton}
            onClick={() => applyTemplate(template)}
            data-testid={`journal-template-${template.key}`}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
};
