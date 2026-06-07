import { notify } from '@affine/component';
import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import type { Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import * as styles from './journal-template-bar.css';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  parseTemplateContent,
  type StoredJournalTemplate,
} from './journal-templates';

/**
 * A row of journal template buttons shown below the Info table. Each click
 * appends the template's pre-written text to the end of the journal body,
 * separated by a divider — so multiple entries (e.g. several 美食日記) can
 * coexist in one day. Templates are managed via the sidebar "Template"
 * entry and stored in GlobalState.
 */
export const JournalTemplateBar = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const globalState = useService(GlobalStateService).globalState;
  const dateStr = useLiveData(journalService.journalDate$(page.id));

  const templates$ = useMemo(
    () =>
      LiveData.from(
        globalState.watch<StoredJournalTemplate[]>(
          JOURNAL_TEMPLATES_STORAGE_KEY
        ),
        undefined
      ),
    [globalState]
  );
  const storedTemplates = useLiveData(templates$);
  const templates = storedTemplates ?? DEFAULT_JOURNAL_TEMPLATES;

  const applyTemplate = useCallback(
    (template: StoredJournalTemplate) => {
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

      for (const block of parseTemplateContent(template.content)) {
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

  if (!dateStr || templates.length === 0) return null;

  return (
    <div className={styles.container} data-testid="journal-template-bar">
      <div className={styles.bar}>
        <span className={styles.label}>Templates</span>
        {templates.map(template => (
          <button
            key={template.id}
            className={styles.templateButton}
            onClick={() => applyTemplate(template)}
            data-testid={`journal-template-${template.id}`}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
};
