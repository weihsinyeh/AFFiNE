import {
  JournalRatingControls,
  ratingSortValue,
} from '@affine/core/blocksuite/block-suite-editor/journal-rating';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  type JournalSegment,
  splitJournalSegments,
  type StoredJournalTemplate,
} from '@affine/core/blocksuite/block-suite-editor/journal-templates';
import { DocsService } from '@affine/core/modules/doc';
import type { DocRecord } from '@affine/core/modules/doc/entities/record';
import { GlobalStateService } from '@affine/core/modules/storage';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewService,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';

import { AllDocSidebarTabs } from '../layouts/all-doc-sidebar-tabs';
import * as styles from './index.css';

const ALL = 'all';
// Journal docs are titled with their date (YYYY-MM-DD); linked todo / meeting
// docs share the journal-date property but have other titles, so the title
// shape is what tells the real journal doc apart.
const JOURNAL_TITLE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Soft background / readable foreground per category, picked by the template's
// position in the bar so the four defaults (學習/旅遊/美食/心情) each get a
// distinct, consistent colour.
const PALETTE = [
  { bg: 'rgba(59,130,246,0.13)', fg: '#1d6fca' },
  { bg: 'rgba(34,197,94,0.14)', fg: '#15803d' },
  { bg: 'rgba(245,158,11,0.16)', fg: '#b45309' },
  { bg: 'rgba(236,72,153,0.13)', fg: '#be185d' },
  { bg: 'rgba(139,92,246,0.13)', fg: '#6d28d9' },
];

type SortField = 'date' | 'stars' | 'mood' | 'weather';
type SortMode = `${SortField}-desc` | `${SortField}-asc`;

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'date-desc', label: '排序：日期 ↓' },
  { value: 'date-asc', label: '排序：日期 ↑' },
  { value: 'stars-desc', label: '排序：星等 ↓' },
  { value: 'stars-asc', label: '排序：星等 ↑' },
  { value: 'mood-desc', label: '排序：心情 ↓' },
  { value: 'mood-asc', label: '排序：心情 ↑' },
  { value: 'weather-desc', label: '排序：天氣 ↓' },
  { value: 'weather-asc', label: '排序：天氣 ↑' },
];

type JournalEntry = {
  key: string;
  docId: string;
  docRecord: DocRecord;
  headingId: string;
  date: string;
  templateId: string;
  label: string;
  title: string;
  preview: string;
};

const previewOf = (seg: JournalSegment) =>
  seg.bodyText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');

// ── One journal entry card ───────────────────────────────────────────────────

const EntryCard = ({
  entry,
  color,
}: {
  entry: JournalEntry;
  color: { bg: string; fg: string };
}) => {
  const workbench = useService(WorkbenchService).workbench;
  const day = dayjs(entry.date);
  return (
    <div
      className={styles.card}
      style={{ borderLeftColor: color.fg }}
      data-testid="journal-entry-card"
      data-template={entry.templateId}
    >
      <div
        className={styles.cardClickable}
        role="button"
        tabIndex={0}
        onClick={() => workbench.openDoc(entry.docId, { at: 'active' })}
      >
        <div className={styles.cardHead}>
          <span
            className={styles.cardChip}
            style={{ background: color.bg, color: color.fg }}
          >
            {entry.label}
          </span>
          <span className={styles.cardDate}>
            {day.isValid() ? day.format('MMM D, YYYY') : entry.date}
          </span>
        </div>
        <div className={styles.cardTitle} title={entry.title}>
          {entry.title}
        </div>
        {entry.preview ? (
          <p className={styles.cardPreview}>{entry.preview}</p>
        ) : (
          <span className={styles.cardPreviewEmpty}>尚無內容</span>
        )}
      </div>
      <div className={styles.cardRating}>
        <JournalRatingControls
          docRecord={entry.docRecord}
          headingId={entry.headingId}
          compact
        />
      </div>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const isSortMode = (value: string | null): value is SortMode =>
  !!value && SORT_OPTIONS.some(option => option.value === value);

const AllJournalsPage = () => {
  const docsService = useService(DocsService);
  const globalState = useService(GlobalStateService).globalState;
  const allDocs = useLiveData(docsService.list.docs$);
  const view = useService(ViewService).view;
  const location = useLiveData(view.location$);

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

  // Seed the category filter / sort from the URL query
  // (`?category=travel&sort=stars-desc`) so "過往經驗參考" can deep-link here.
  const [selectedId, setSelectedId] = useState<string>(
    () =>
      new URLSearchParams(view.location$.value.search).get('category') || ALL
  );
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const sort = new URLSearchParams(view.location$.value.search).get('sort');
    return isSortMode(sort) ? sort : 'date-desc';
  });

  // Re-apply when navigated here again with new params while already mounted.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get('category');
    const sort = params.get('sort');
    if (category) setSelectedId(category);
    if (isSortMode(sort)) setSortMode(sort);
  }, [location.search]);

  const journalDocs = useMemo(
    () =>
      allDocs.filter(
        doc =>
          !doc.meta$.value.trash &&
          JOURNAL_TITLE_RE.test(doc.meta$.value.title ?? '')
      ),
    [allDocs]
  );

  // Open every journal doc, split it into template entries, and keep them in
  // sync as the docs change. Mirrors the all-todos page's multi-doc reader.
  const [docSegments, setDocSegments] = useState<Map<string, JournalSegment[]>>(
    new Map()
  );
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  useEffect(() => {
    const map = new Map<string, JournalSegment[]>();
    const cleanups: (() => void)[] = [];
    for (const doc of journalDocs) {
      try {
        const { doc: openedDoc, release } = docsService.open(doc.id);
        const store = openedDoc.blockSuiteDoc;
        store.load();
        const read = () => {
          map.set(doc.id, splitJournalSegments(store, templatesRef.current));
          setDocSegments(new Map(map));
        };
        read();
        const sub = store.slots.blockUpdated.subscribe(read);
        cleanups.push(() => {
          sub.unsubscribe();
          release();
        });
      } catch {
        // skip unavailable docs
      }
    }
    setDocSegments(new Map(map));
    return () => cleanups.forEach(fn => fn());
  }, [journalDocs, docsService, templates]);

  // Subscribe to each journal doc's properties so star / mood / weather sorting
  // reacts when a rating changes. (The cards read their own values directly.)
  const [docProps, setDocProps] = useState<
    Map<string, Record<string, string | undefined>>
  >(new Map());
  useEffect(() => {
    const map = new Map<string, Record<string, string | undefined>>();
    const subs: Array<{ unsubscribe(): void }> = [];
    for (const doc of journalDocs) {
      const update = (props: unknown) => {
        map.set(doc.id, (props ?? {}) as Record<string, string | undefined>);
        setDocProps(new Map(map));
      };
      map.set(
        doc.id,
        (doc.properties$.value ?? {}) as Record<string, string | undefined>
      );
      const sub = doc.properties$.subscribe(update);
      if (sub?.unsubscribe) subs.push(sub);
    }
    setDocProps(new Map(map));
    return () => subs.forEach(sub => sub.unsubscribe());
  }, [journalDocs]);

  const colorFor = useMemo(() => {
    const index = new Map(templates.map((t, i) => [t.id, i]));
    return (templateId: string) =>
      PALETTE[(index.get(templateId) ?? 0) % PALETTE.length];
  }, [templates]);

  const entries = useMemo(() => {
    const known = new Set(templates.map(t => t.id));
    const list: JournalEntry[] = [];
    for (const doc of journalDocs) {
      const date = doc.meta$.value.title ?? '';
      const segs = docSegments.get(doc.id) ?? [];
      for (const seg of segs) {
        // Only categorised template entries with a heading block (the rating
        // key); free-form preamble is skipped.
        if (
          !seg.templateId ||
          !known.has(seg.templateId) ||
          !seg.headingBlockId
        )
          continue;
        list.push({
          key: `${doc.id}:${seg.headingBlockId}`,
          docId: doc.id,
          docRecord: doc,
          headingId: seg.headingBlockId,
          date,
          templateId: seg.templateId,
          label: seg.label,
          title: seg.title || seg.label,
          preview: previewOf(seg),
        });
      }
    }
    return list;
  }, [journalDocs, docSegments, templates]);

  const countByTemplate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      counts.set(entry.templateId, (counts.get(entry.templateId) ?? 0) + 1);
    }
    return counts;
  }, [entries]);

  const visibleEntries = useMemo(() => {
    const filtered =
      selectedId === ALL
        ? entries
        : entries.filter(entry => entry.templateId === selectedId);
    const dashIndex = sortMode.lastIndexOf('-');
    const field = sortMode.slice(0, dashIndex) as SortField;
    const dir = sortMode.slice(dashIndex + 1) as 'asc' | 'desc';
    const dateCmp = (a: JournalEntry, b: JournalEntry) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    return [...filtered].sort((a, b) => {
      const primary =
        field === 'date'
          ? dateCmp(a, b)
          : ratingSortValue(docProps.get(a.docId), a.headingId, field) -
            ratingSortValue(docProps.get(b.docId), b.headingId, field);
      const signed = dir === 'asc' ? primary : -primary;
      if (signed !== 0) return signed;
      // Tie-break: newest first, regardless of direction.
      return -dateCmp(a, b);
    });
  }, [entries, selectedId, sortMode, docProps]);

  return (
    <>
      <ViewTitle title="All Journals" />
      <ViewIcon icon="journal" />
      <ViewHeader>
        <div className={styles.header}>
          <span className={styles.headerTitle}>All Journals</span>
          <span className={styles.headerCount}>{visibleEntries.length}</span>
          <div className={styles.catBar}>
            <button
              className={styles.catBtn}
              data-active={selectedId === ALL}
              onClick={() => setSelectedId(ALL)}
              data-testid="all-journals-category-all"
            >
              全部
              <span className={styles.catCount}>{entries.length}</span>
            </button>
            {templates.map(template => (
              <button
                key={template.id}
                className={styles.catBtn}
                data-active={selectedId === template.id}
                onClick={() => setSelectedId(template.id)}
                data-testid={`all-journals-category-${template.id}`}
              >
                <span
                  className={styles.catDot}
                  style={{ background: colorFor(template.id).fg }}
                />
                {template.label}
                <span className={styles.catCount}>
                  {countByTemplate.get(template.id) ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className={styles.headerSpacer} />
          <select
            className={styles.sortSelector}
            value={sortMode}
            onChange={e => setSortMode(e.target.value as SortMode)}
            data-testid="all-journals-sort"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.body}>
          {visibleEntries.length > 0 ? (
            <div className={styles.grid}>
              {visibleEntries.map(entry => (
                <EntryCard
                  key={entry.key}
                  entry={entry}
                  color={colorFor(entry.templateId)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>沒有日記</div>
          )}
        </div>
      </ViewBody>
      <AllDocSidebarTabs />
    </>
  );
};

export const Component = () => <AllJournalsPage />;
