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
import { useCallback, useEffect, useMemo, useState } from 'react';

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
// BOOK SPREAD (one day = one spread):
//
//  ┌───────────────┬───────────────┐
//  │  LEFT PAGE    │  RIGHT PAGE   │
//  │  (Journal)    │  (Tasks +     │
//  │               │   Meetings)   │
//  │  ← click to  │  click to →   │
//  │  go YESTERDAY │  go TOMORROW  │
//  └───────────────┴───────────────┘
//
// ANIMATION:
//  - Forward (click right): a flip element covering the right half rotates
//    rotateY(0 → -180deg) around its left edge (book spine).
//    Front face = today's right content.
//    Back face  = tomorrow's left content.
//    The static right page pre-loads tomorrow's right content (hidden underneath).
//
//  - Backward (click left): a flip element covering the left half rotates
//    rotateY(0 → 180deg) around its right edge (book spine).
//    Front face = today's left content.
//    Back face  = yesterday's right content.
//    The static left page pre-loads yesterday's left content (hidden underneath).

export const JournalFlipBook = ({
  selectedDate,
  onClose,
  onDateSelect,
}: {
  selectedDate: dayjs.Dayjs;
  onClose: () => void;
  onDateSelect: (date: string) => void;
}) => {
  const [currentDay, setCurrentDay] = useState(
    selectedDate.format('YYYY-MM-DD')
  );
  const [nextDay, setNextDay] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<'forward' | 'backward'>('forward');

  // Keep currentDay in sync when selectedDate changes externally
  useEffect(() => {
    const d = selectedDate.format('YYYY-MM-DD');
    if (!isFlipping) setCurrentDay(d);
  }, [selectedDate, isFlipping]);

  const flipTo = useCallback(
    (targetDay: string, dir: 'forward' | 'backward') => {
      if (isFlipping) return;
      setNextDay(targetDay);
      setFlipDir(dir);
      setIsFlipping(true);
    },
    [isFlipping]
  );

  const handleAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      // Only react to the flip element's own animation, not children
      if (e.target !== e.currentTarget) return;
      if (!nextDay) return;
      const settled = nextDay;
      setCurrentDay(settled);
      setNextDay(null);
      setIsFlipping(false);
      onDateSelect(settled);
    },
    [nextDay, onDateSelect]
  );

  const yesterday = dayjs(currentDay).subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrow = dayjs(currentDay).add(1, 'day').format('YYYY-MM-DD');

  // During animation, pre-load the destination day's content on the static page
  // that will be revealed after the flip.
  // - Forward flip: static right page shows nextDay's right (becomes visible after flip)
  // - Backward flip: static left page shows nextDay's left (becomes visible after flip)
  const staticLeftDay =
    isFlipping && flipDir === 'backward' ? (nextDay ?? currentDay) : currentDay;
  const staticRightDay =
    isFlipping && flipDir === 'forward' ? (nextDay ?? currentDay) : currentDay;

  // Flip element content
  const flipFrontDay = currentDay;
  const flipBackDay = nextDay ?? currentDay;

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
        <div className={styles.flipBookContainer}>
          {/* ── Static left page ─────────────────────────────────── */}
          <div
            className={clsx(
              styles.flipBookStaticPage,
              styles.flipBookStaticLeft,
              !isFlipping && styles.flipBookPageClickable
            )}
            onClick={() => !isFlipping && flipTo(yesterday, 'backward')}
            role="button"
            tabIndex={isFlipping ? -1 : 0}
            aria-label="Go to yesterday"
            onKeyDown={e => {
              if (
                !isFlipping &&
                (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft')
              )
                flipTo(yesterday, 'backward');
            }}
          >
            <LeftPageContent dateKey={staticLeftDay} />
          </div>

          {/* ── Book spine ───────────────────────────────────────── */}
          <div className={styles.flipBookSpine} />

          {/* ── Static right page ────────────────────────────────── */}
          <div
            className={clsx(
              styles.flipBookStaticPage,
              styles.flipBookStaticRight,
              !isFlipping && styles.flipBookPageClickable
            )}
            onClick={() => !isFlipping && flipTo(tomorrow, 'forward')}
            role="button"
            tabIndex={isFlipping ? -1 : 0}
            aria-label="Go to tomorrow"
            onKeyDown={e => {
              if (
                !isFlipping &&
                (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')
              )
                flipTo(tomorrow, 'forward');
            }}
          >
            <RightPageContent dateKey={staticRightDay} />
          </div>

          {/* ── Flip element (only during animation) ─────────────── */}
          {isFlipping && (
            <div
              className={clsx(
                styles.flipBookFlipEl,
                flipDir === 'forward'
                  ? styles.flipBookFlipElForward
                  : styles.flipBookFlipElBackward
              )}
              onAnimationEnd={handleAnimationEnd}
            >
              {/* Front face (visible at start) */}
              <div className={styles.flipBookFlipFront}>
                {flipDir === 'forward' ? (
                  <RightPageContent dateKey={flipFrontDay} />
                ) : (
                  <LeftPageContent dateKey={flipFrontDay} />
                )}
              </div>
              {/* Back face (visible when fully flipped) */}
              <div className={styles.flipBookFlipBack}>
                {flipDir === 'forward' ? (
                  <LeftPageContent dateKey={flipBackDay} />
                ) : (
                  <RightPageContent dateKey={flipBackDay} />
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Navigation row ─────────────────────────────────────── */}
        <div className={styles.flipBookNavRow}>
          <button
            className={styles.flipBookNavBtn}
            disabled={isFlipping}
            onClick={() => flipTo(yesterday, 'backward')}
            aria-label="Previous day"
          >
            <ArrowLeftSmallIcon />
          </button>
          <span className={styles.flipBookDateLabel}>
            {dayjs(currentDay).format('ddd, MMM D')}
          </span>
          <button
            className={styles.flipBookNavBtn}
            disabled={isFlipping}
            onClick={() => flipTo(tomorrow, 'forward')}
            aria-label="Next day"
          >
            <ArrowRightSmallIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
