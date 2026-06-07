import { DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { i18nTime, useI18n } from '@affine/i18n';
import type { Store } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';

import * as styles from './styles.css';

const MeetingDocTitle = ({
  docId,
  meetingName,
  readonly,
}: {
  docId: string;
  meetingName: string;
  readonly?: boolean;
}) => {
  const docsService = useService(DocsService);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = useCallback(() => {
    if (readonly) return;
    setDraft(meetingName);
    setEditing(true);
  }, [meetingName, readonly]);

  const commit = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== meetingName) {
      docsService
        .changeDocTitle(docId, `Meeting · ${trimmed}`)
        .catch(console.error);
    }
    setEditing(false);
  }, [draft, docId, docsService, meetingName]);

  if (editing) {
    return (
      <div className="doc-title-container" data-testid="meeting-title">
        <input
          autoFocus
          className={styles.meetingTitleInput}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="doc-title-container"
      data-testid="meeting-title"
      onClick={startEdit}
      style={readonly ? undefined : { cursor: 'text' }}
    >
      <span>{meetingName || 'Untitled Meeting'}</span>
    </div>
  );
};

export const BlocksuiteEditorJournalDocTitle = ({
  page,
  readonly,
}: {
  page: Store;
  readonly?: boolean;
}) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const journalDateStr = useLiveData(journalService.journalDate$(page.id));

  const docRecordLiveData$ = useMemo(
    () => docsService.list.doc$(page.id),
    [docsService, page.id]
  );
  const titleLiveData$ = useMemo(
    () =>
      LiveData.computed(get => {
        const record = get(docRecordLiveData$);
        if (!record) return '';
        return get(record.meta$)?.title ?? '';
      }),
    [docRecordLiveData$]
  );
  const title = useLiveData(titleLiveData$) ?? '';

  if (title.startsWith('Meeting · ')) {
    return (
      <MeetingDocTitle
        docId={page.id}
        meetingName={title.replace(/^Meeting · /, '')}
        readonly={readonly}
      />
    );
  }

  return <BlocksuiteEditorJournalDocTitleUI date={journalDateStr} />;
};

export const BlocksuiteEditorJournalDocTitleUI = ({
  date: dateStr,
  overrideClassName,
}: {
  date?: string;
  /**
   * The `doc-title-container` class style is defined in editor,
   * which means if we use this component outside editor, the style will not work,
   * so we provide a className to override
   */
  overrideClassName?: string;
}) => {
  const localizedJournalDate = i18nTime(dateStr, {
    absolute: { accuracy: 'day' },
  });
  const t = useI18n();

  // TODO(catsjuice): i18n
  const today = dayjs();
  const date = dayjs(dateStr);
  const day = dayjs(date).format('dddd') ?? null;
  const isToday = date.isSame(today, 'day');

  return (
    <div
      className={overrideClassName ?? 'doc-title-container'}
      data-testid="journal-title"
    >
      <span data-testid="date">{localizedJournalDate}</span>
      {isToday ? (
        <span className={styles.titleTodayTag} data-testid="date-today-label">
          {t['com.affine.today']()}
        </span>
      ) : (
        <span className={styles.titleDayTag}>{day}</span>
      )}
    </div>
  );
};
