import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import type { Store } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';

import * as styles from './journal-category-filter.css';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  splitJournalSegments,
  type StoredJournalTemplate,
} from './journal-templates';

const ALL = 'all';

/**
 * A row of category filter buttons shown below {@link JournalTemplateBar}.
 * "全部" plus one button per template (學習／旅遊／美食／心情 by default) — five
 * buttons in total. Selecting a category non-destructively hides every journal
 * entry that doesn't belong to it: we split the body into the same template
 * instances the flip book uses and inject a `<style>` rule that `display:none`s
 * the block ids outside the chosen category. "全部" clears the filter.
 */
export const JournalCategoryFilter = ({ page }: { page: Store }) => {
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

  const [selectedId, setSelectedId] = useState<string>(ALL);
  // Bumped on every doc change so the hide rule recomputes as entries are
  // added, removed, or their headings edited.
  const [revision, setRevision] = useState(0);

  // Reset the filter when navigating to another day's journal.
  useEffect(() => {
    setSelectedId(ALL);
  }, [page.id]);

  // If the selected template gets deleted from the manager, fall back to 全部
  // so the body never ends up filtered against a category with no button.
  useEffect(() => {
    if (selectedId !== ALL && !templates.some(t => t.id === selectedId)) {
      setSelectedId(ALL);
    }
  }, [templates, selectedId]);

  useEffect(() => {
    const sub = page.slots.blockUpdated.subscribe(() =>
      setRevision(r => r + 1)
    );
    return () => sub.unsubscribe();
  }, [page]);

  const hideCss = useMemo(() => {
    if (selectedId === ALL) return '';
    void revision; // recompute when the doc changes
    const note = page.getBlocksByFlavour('affine:note')[0];
    if (!note) return '';
    const noteId = note.id;
    const allChildIds = (
      (note.model as unknown as { children?: { id: string }[] }).children ?? []
    ).map(child => child.id);

    const showIds = new Set<string>();
    for (const seg of splitJournalSegments(page, templates)) {
      if (seg.templateId !== selectedId) continue;
      if (seg.headingBlockId) showIds.add(seg.headingBlockId);
      seg.bodyBlockIds.forEach(id => showIds.add(id));
    }

    const hideIds = allChildIds.filter(id => !showIds.has(id));
    if (hideIds.length === 0) return '';
    return (
      hideIds
        .map(id => `[data-block-id="${noteId}"] [data-block-id="${id}"]`)
        .join(',') + '{display:none!important}'
    );
  }, [page, templates, selectedId, revision]);

  if (!dateStr || templates.length === 0) return null;

  return (
    <div className={styles.container} data-testid="journal-category-filter">
      <div className={styles.bar}>
        <span className={styles.label}>分類</span>
        <button
          className={clsx(
            styles.filterButton,
            selectedId === ALL && styles.active
          )}
          onClick={() => setSelectedId(ALL)}
          data-testid="journal-category-all"
        >
          全部
        </button>
        {templates.map(template => (
          <button
            key={template.id}
            className={clsx(
              styles.filterButton,
              selectedId === template.id && styles.active
            )}
            onClick={() => setSelectedId(template.id)}
            data-testid={`journal-category-${template.id}`}
          >
            {template.label}
          </button>
        ))}
      </div>
      {hideCss ? <style>{hideCss}</style> : null}
    </div>
  );
};
