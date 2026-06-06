import { IconButton } from '@affine/component';
import { type DocRecord, DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import {
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  ExpandCloseIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as styles from './journal.css';

// ── Inline SVG book icon ────────────────────────────────────────────────────

export const BookOpenSvgIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Left page: journal text ────────────────────────────────────────────────

const LeftPageContent = ({ dateKey }: { dateKey: string }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);

  const allDocs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateKey),
      [dateKey, journalService]
    )
  );
  const journalDoc = useMemo(
    () => allDocs.find(d => (d.meta$.value.title ?? '') === dateKey),
    [allDocs, dateKey]
  );

  const [content, setContent] = useState('');

  useEffect(() => {
    if (!journalDoc) {
      setContent('');
      return;
    }
    let cleanup: (() => void) | undefined;
    try {
      const { doc, release } = docsService.open(journalDoc.id);
      const store = doc.blockSuiteDoc;
      store.load();
      const read = () => {
        const blocks = [
          ...store.getBlocksByFlavour('affine:paragraph'),
          ...store.getBlocksByFlavour('affine:list'),
        ];
        const text = blocks
          .map(
            b =>
              (b.model as { text?: { toString(): string } })?.text
                ?.toString()
                .trim() ?? ''
          )
          .filter(Boolean)
          .join('\n');
        setContent(text);
      };
      read();
      const sub = store.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
      };
    } catch {
      setContent('');
    }
    return () => cleanup?.();
  }, [journalDoc, docsService]);

  const d = dayjs(dateKey);

  return (
    <div className={styles.flipBookPageInner} data-side="left">
      <div className={styles.flipBookPageDateBadge}>
        <span className={styles.flipBookPageDayNum}>{d.format('DD')}</span>
        <div className={styles.flipBookPageDateMeta}>
          <span className={styles.flipBookPageMonthYear}>
            {d.format('MMM YYYY')}
          </span>
          <span className={styles.flipBookPageWeekday}>{d.format('dddd')}</span>
        </div>
      </div>
      <div className={styles.flipBookPageDivider} />
      <div className={styles.flipBookPageText}>
        {content ? (
          content
        ) : (
          <span className={styles.flipBookPageEmpty}>
            No entry for this day…
          </span>
        )}
      </div>
    </div>
  );
};

// ── Right page: todo + meeting ─────────────────────────────────────────────

const RightPageContent = ({ dateKey }: { dateKey: string }) => {
  const journalService = useService(JournalService);
  const allDocs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateKey),
      [dateKey, journalService]
    )
  );

  const { todoDocs, meetingDocs } = useMemo(() => {
    const todoDocs: DocRecord[] = [];
    const meetingDocs: DocRecord[] = [];
    for (const doc of allDocs) {
      const title = doc.meta$.value.title || '';
      if (title.startsWith('Todo ·')) todoDocs.push(doc);
      else if (title.startsWith('Meeting ·')) meetingDocs.push(doc);
    }
    return { todoDocs, meetingDocs };
  }, [allDocs]);

  const d = dayjs(dateKey);

  return (
    <div className={styles.flipBookPageInner} data-side="right">
      <div className={styles.flipBookPageDateBadge}>
        <span className={styles.flipBookPageDayNum}>{d.format('DD')}</span>
        <div className={styles.flipBookPageDateMeta}>
          <span className={styles.flipBookPageMonthYear}>
            {d.format('MMM YYYY')}
          </span>
          <span className={styles.flipBookPageWeekday}>{d.format('dddd')}</span>
        </div>
      </div>
      <div className={styles.flipBookPageDivider} />
      <div className={styles.flipBookPageSections}>
        <div className={styles.flipBookSection}>
          <span className={styles.flipBookSectionLabel}>✅ Tasks</span>
          {todoDocs.length === 0 ? (
            <span className={styles.flipBookPageEmpty}>No tasks</span>
          ) : (
            <ul className={styles.flipBookList}>
              {todoDocs.map(doc => (
                <li key={doc.id} className={styles.flipBookListItem}>
                  {(doc.meta$.value.title || 'Untitled').replace(
                    /^Todo · /,
                    ''
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.flipBookSection}>
          <span className={styles.flipBookSectionLabel}>📅 Meetings</span>
          {meetingDocs.length === 0 ? (
            <span className={styles.flipBookPageEmpty}>No meetings</span>
          ) : (
            <ul className={styles.flipBookList}>
              {meetingDocs.map(doc => (
                <li key={doc.id} className={styles.flipBookListItem}>
                  {(doc.meta$.value.title || 'Untitled').replace(
                    /^Meeting · /,
                    ''
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main flip book component ───────────────────────────────────────────────
//
// BOOK SPREAD — drag interaction:
//
//  ┌───────────────┬───────────────┐
//  │  LEFT PAGE    │  RIGHT PAGE   │
//  │  (Journal)    │  (Tasks +     │
//  │               │   Meetings)   │
//  │  drag →       │  ← drag       │
//  │  prev journal │  next journal │
//  └───────────────┴───────────────┘
//
// Drag LEFT page rightward  → backward flip to previous journal day.
// Drag RIGHT page leftward  → forward flip to next journal day.
// Release past 50% → completes; release before 50% → snaps back.

type FlipState = {
  dir: 'forward' | 'backward';
  angle: number; // 0–180
  target: string;
  phase: 'dragging' | 'completing' | 'snapping';
};

export const JournalFlipBook = ({
  selectedDate,
  onClose,
  onDateSelect,
}: {
  selectedDate: dayjs.Dayjs;
  onClose: () => void;
  onDateSelect: (date: string) => void;
}) => {
  const journalService = useService(JournalService);
  const allJournalDates = useLiveData(journalService.allJournalDates$);

  const [currentDay, setCurrentDay] = useState(
    selectedDate.format('YYYY-MM-DD')
  );
  const [flipState, setFlipState] = useState<FlipState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);

  // Keep currentDay in sync when selectedDate changes externally
  useEffect(() => {
    if (!flipState) setCurrentDay(selectedDate.format('YYYY-MM-DD'));
  }, [selectedDate, flipState]);

  // Nearest journal days
  const prevJournalDay = useMemo(() => {
    const sorted = Array.from(allJournalDates).sort((a, b) =>
      a.localeCompare(b)
    );
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] < currentDay) return sorted[i];
    }
    return null;
  }, [allJournalDates, currentDay]);

  const nextJournalDay = useMemo(() => {
    const sorted = Array.from(allJournalDates).sort((a, b) =>
      a.localeCompare(b)
    );
    for (const date of sorted) {
      if (date > currentDay) return date;
    }
    return null;
  }, [allJournalDates, currentDay]);

  // ── Mouse/touch drag handlers ──────────────────────────────────────────
  const handleLeftMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!prevJournalDay || flipState) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartXRef.current = clientX;
      setFlipState({
        dir: 'backward',
        angle: 0,
        target: prevJournalDay,
        phase: 'dragging',
      });
    },
    [flipState, prevJournalDay]
  );

  const handleRightMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!nextJournalDay || flipState) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      dragStartXRef.current = clientX;
      setFlipState({
        dir: 'forward',
        angle: 0,
        target: nextJournalDay,
        phase: 'dragging',
      });
    },
    [flipState, nextJournalDay]
  );

  // Attach document-level move/up listeners while dragging
  useEffect(() => {
    if (!flipState || flipState.phase !== 'dragging') return;
    const { dir } = flipState;

    const update = (clientX: number) => {
      const halfWidth = (containerRef.current?.offsetWidth ?? 400) / 2;
      const rawDelta =
        dir === 'backward'
          ? clientX - dragStartXRef.current
          : dragStartXRef.current - clientX;
      const angle = Math.max(0, Math.min(180, (rawDelta / halfWidth) * 180));
      setFlipState(s => (s && s.phase === 'dragging' ? { ...s, angle } : s));
    };

    const release = (currentAngle: number) => {
      const completing = currentAngle >= 90;
      setFlipState(s => {
        if (!s || s.phase !== 'dragging') return s;
        return {
          ...s,
          phase: completing ? 'completing' : 'snapping',
          angle: completing ? 180 : 0,
        };
      });
    };

    const onMouseMove = (e: MouseEvent) => update(e.clientX);
    const onMouseUp = (e: MouseEvent) => {
      const halfWidth = (containerRef.current?.offsetWidth ?? 400) / 2;
      const rawDelta =
        dir === 'backward'
          ? e.clientX - dragStartXRef.current
          : dragStartXRef.current - e.clientX;
      const angle = Math.max(0, Math.min(180, (rawDelta / halfWidth) * 180));
      release(angle);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      update(e.touches[0].clientX);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const halfWidth = (containerRef.current?.offsetWidth ?? 400) / 2;
      const rawDelta =
        dir === 'backward'
          ? e.changedTouches[0].clientX - dragStartXRef.current
          : dragStartXRef.current - e.changedTouches[0].clientX;
      const angle = Math.max(0, Math.min(180, (rawDelta / halfWidth) * 180));
      release(angle);
    };

    // Show grabbing cursor on body during drag
    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [flipState]);

  // After snap/complete: wait for the CSS transition then commit
  useEffect(() => {
    if (!flipState || flipState.phase === 'dragging') return;
    const { phase, target } = flipState;
    const timeout = setTimeout(() => {
      if (phase === 'completing') {
        setCurrentDay(target);
        onDateSelect(target);
      }
      setFlipState(null);
    }, 380);
    return () => clearTimeout(timeout);
  }, [flipState, onDateSelect]);

  // Immediate flip for ← → nav buttons (no drag)
  const flipImmediate = useCallback(
    (dir: 'forward' | 'backward') => {
      const target = dir === 'backward' ? prevJournalDay : nextJournalDay;
      if (!target || flipState) return;
      setFlipState({ dir, angle: 0, target, phase: 'completing' });
      requestAnimationFrame(() => {
        setFlipState(s =>
          s && s.phase === 'completing' ? { ...s, angle: 180 } : s
        );
      });
    },
    [flipState, prevJournalDay, nextJournalDay]
  );

  // ── Derived display values ─────────────────────────────────────────────
  const staticLeftDay =
    flipState?.dir === 'backward' ? flipState.target : currentDay;
  const staticRightDay =
    flipState?.dir === 'forward' ? flipState.target : currentDay;

  const flipRotateY = flipState
    ? flipState.dir === 'backward'
      ? flipState.angle
      : -flipState.angle
    : 0;

  const flipElementStyle: React.CSSProperties | undefined = flipState
    ? {
        transform: `rotateY(${flipRotateY}deg)`,
        transition:
          flipState.phase !== 'dragging'
            ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            : 'none',
      }
    : undefined;

  return (
    <div className={styles.flipBookOverlay}>
      <div className={styles.flipBookHeader}>
        <span className={styles.flipBookTitle}>
          {dayjs(currentDay).format('MMMM YYYY')}
        </span>
        <IconButton size="small" aria-label="Close flip book" onClick={onClose}>
          <ExpandCloseIcon />
        </IconButton>
      </div>

      <div className={styles.flipBookBody}>
        <div ref={containerRef} className={styles.flipBookContainer}>
          {/* ── Static left page — drag rightward to go back ─────── */}
          <div
            className={clsx(
              styles.flipBookStaticPage,
              styles.flipBookStaticLeft,
              !flipState && prevJournalDay && styles.flipBookPageClickable
            )}
            style={{
              cursor: !flipState && prevJournalDay ? 'grab' : 'default',
            }}
            onMouseDown={handleLeftMouseDown}
            onTouchStart={handleLeftMouseDown}
            aria-label="Drag right to go to previous journal day"
            aria-disabled={!prevJournalDay}
          >
            <LeftPageContent dateKey={staticLeftDay} />
          </div>

          {/* ── Book spine ───────────────────────────────────────── */}
          <div className={styles.flipBookSpine} />

          {/* ── Static right page — drag leftward to go forward ──── */}
          <div
            className={clsx(
              styles.flipBookStaticPage,
              styles.flipBookStaticRight,
              !flipState && nextJournalDay && styles.flipBookPageClickable
            )}
            style={{
              cursor: !flipState && nextJournalDay ? 'grab' : 'default',
            }}
            onMouseDown={handleRightMouseDown}
            onTouchStart={handleRightMouseDown}
            aria-label="Drag left to go to next journal day"
            aria-disabled={!nextJournalDay}
          >
            <RightPageContent dateKey={staticRightDay} />
          </div>

          {/* ── Flip element (mounted while dragging / animating) ─── */}
          {flipState && (
            <div
              className={clsx(
                styles.flipBookFlipEl,
                flipState.dir === 'forward'
                  ? styles.flipBookFlipElForward
                  : styles.flipBookFlipElBackward
              )}
              style={flipElementStyle}
            >
              <div className={styles.flipBookFlipFront}>
                {flipState.dir === 'forward' ? (
                  <RightPageContent dateKey={currentDay} />
                ) : (
                  <LeftPageContent dateKey={currentDay} />
                )}
              </div>
              <div className={styles.flipBookFlipBack}>
                {flipState.dir === 'forward' ? (
                  <LeftPageContent dateKey={flipState.target} />
                ) : (
                  <RightPageContent dateKey={flipState.target} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation row ─────────────────────────────────────── */}
        <div className={styles.flipBookNavRow}>
          <button
            className={styles.flipBookNavBtn}
            disabled={!!flipState || !prevJournalDay}
            onClick={() => flipImmediate('backward')}
            aria-label="Previous journal day"
          >
            <ArrowLeftSmallIcon />
          </button>
          <span className={styles.flipBookDateLabel}>
            {dayjs(currentDay).format('ddd, MMM D')}
          </span>
          <button
            className={styles.flipBookNavBtn}
            disabled={!!flipState || !nextJournalDay}
            onClick={() => flipImmediate('forward')}
            aria-label="Next journal day"
          >
            <ArrowRightSmallIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
