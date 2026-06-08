import { DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import type { Store } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo, useState } from 'react';

import { JournalRatingControls } from './journal-rating';
import * as styles from './journal-rating.css';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  type JournalSegment,
  splitJournalSegments,
  type StoredJournalTemplate,
} from './journal-templates';

/**
 * Per-entry ratings panel shown in the journal doc (below the category
 * filter): one row per templated entry with its heading and the shared star /
 * mood / weather controls. Ratings are stored on the journal doc keyed by the
 * entry's heading block id, so they stay in sync with the All Journals cards.
 */
export const JournalEntryRatings = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const globalState = useService(GlobalStateService).globalState;
  const dateStr = useLiveData(journalService.journalDate$(page.id));
  const docRecord = useLiveData(docsService.list.doc$(page.id));

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
  const templates = useLiveData(templates$) ?? DEFAULT_JOURNAL_TEMPLATES;

  const [segments, setSegments] = useState<JournalSegment[]>([]);
  useEffect(() => {
    const read = () => setSegments(splitJournalSegments(page, templates));
    read();
    const sub = page.slots.blockUpdated.subscribe(read);
    return () => sub.unsubscribe();
  }, [page, templates]);

  const entries = segments.filter(seg => seg.templateId && seg.headingBlockId);

  if (!dateStr || !docRecord || entries.length === 0) return null;

  return (
    <div
      className={styles.entryRatingsContainer}
      data-testid="journal-entry-ratings"
    >
      <div className={styles.entryRatingsBar}>
        {entries.map(seg => (
          <div key={seg.headingBlockId} className={styles.entryRatingRow}>
            <span className={styles.entryRatingLabel} title={seg.title}>
              {seg.title || seg.label}
            </span>
            <JournalRatingControls
              docRecord={docRecord}
              headingId={seg.headingBlockId as string}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
};
