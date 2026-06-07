import { IconButton } from '@affine/component';
import { type DocRecord, DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { Text } from '@blocksuite/affine/store';
import {
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  ExpandCloseIcon,
} from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import * as styles from './journal.css';

// ── Sketch colors ──────────────────────────────────────────────────────────

const SKETCH_COLORS = [
  { value: '#1a1615', label: 'Ink' },
  { value: '#b33030', label: 'Red' },
  { value: '#2563a8', label: 'Blue' },
  { value: '#2a7a3b', label: 'Green' },
  { value: '#7b4fa6', label: 'Purple' },
];

// ── Inline SVG pen icon ─────────────────────────────────────────────────────

const PenSketchIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ── Per-page sketch canvas ─────────────────────────────────────────────────
//
// Renders a transparent canvas as the page background (z-index 0) so
// handwriting appears BEHIND the text content. A separate transparent div
// (z-index 2) captures drawing events when active, leaving the text layer
// (z-index 1) untouched visually. The pen button and colour toolbar sit at
// z-index 3 and remain clickable at all times.

const PageSketchCanvas = ({
  dateKey,
  side,
}: {
  dateKey: string;
  side: 'left' | 'right';
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const colorRef = useRef(SKETCH_COLORS[0].value);
  const eraserRef = useRef(false);

  const [isActive, setIsActive] = useState(false);
  const [color, setColor] = useState(SKETCH_COLORS[0].value);
  const [isEraser, setIsEraser] = useState(false);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    eraserRef.current = isEraser;
  }, [isEraser]);

  const storageKey = `journal-sketch-${side}-${dateKey}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Observe the parent so that setting canvas.width/height (which changes
    // the canvas's intrinsic size) never re-triggers the observer.
    const parent = canvas.parentElement;
    if (!parent) return;

    let pendingImg: HTMLImageElement | null = null;
    let cancelled = false;

    const loadSketch = () => {
      // Cancel any in-flight image load to prevent stale draws.
      if (pendingImg) {
        pendingImg.onload = null;
        pendingImg = null;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      const img = new Image();
      pendingImg = img;
      img.onload = () => {
        if (cancelled || img !== pendingImg) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = saved;
    };

    // Use offsetWidth/offsetHeight (layout dimensions, unaffected by the
    // ancestor rotateX(-5deg) transform) instead of getBoundingClientRect()
    // which returns the projected visual size and can be ~1/3 too small.
    const sizeAndLoad = (forceLoad: boolean) => {
      const w = parent.offsetWidth;
      const h = parent.offsetHeight;
      if (!w || !h) return;
      const sizeChanged = canvas.width !== w || canvas.height !== h;
      if (sizeChanged) {
        canvas.width = w;
        canvas.height = h;
      }
      if (sizeChanged || forceLoad) loadSketch();
    };

    sizeAndLoad(true); // always load on storageKey change
    const ro = new ResizeObserver(() => sizeAndLoad(false));
    ro.observe(parent);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (pendingImg) pendingImg.onload = null;
    };
  }, [storageKey]);

  // ESC exits draw mode
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsActive(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isActive]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ('touches' in e) {
      if (!e.touches.length) return null;
      const t = e.touches[0];
      return {
        x: (t.clientX - rect.left) * sx,
        y: (t.clientY - rect.top) * sy,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * sx,
      y: ((e as React.MouseEvent).clientY - rect.top) * sy,
    };
  };

  const saveSketch = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) localStorage.setItem(storageKey, canvas.toDataURL());
  }, [storageKey]);

  const applyStroke = (
    pt: { x: number; y: number },
    from?: { x: number; y: number }
  ) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const sz = eraserRef.current ? 12 : 2;
    if (eraserRef.current) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    if (from) {
      ctx.lineWidth = sz;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = eraserRef.current ? 'rgba(0,0,0,1)' : colorRef.current;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, sz / 2, 0, Math.PI * 2);
      ctx.fillStyle = eraserRef.current ? 'rgba(0,0,0,1)' : colorRef.current;
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const onDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pt = getPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;
    lastPtRef.current = pt;
    applyStroke(pt);
  };

  const onMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const pt = getPoint(e);
    if (!pt) return;
    applyStroke(pt, lastPtRef.current ?? undefined);
    lastPtRef.current = pt;
  };

  const onUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPtRef.current = null;
    saveSketch();
  }, [saveSketch]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return (
    <>
      {/* Background canvas — always behind text content */}
      <canvas ref={canvasRef} className={styles.flipBookPageCanvas} />

      {/* Transparent draw-capture layer — only mounted in draw mode */}
      {isActive && (
        <div
          className={styles.flipBookPageDrawLayer}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onTouchStart={onDown}
          onTouchMove={onMove}
          onTouchEnd={onUp}
        />
      )}

      {/* Pen toggle button */}
      <button
        className={styles.flipBookPenBtn}
        data-active={isActive}
        onClick={e => {
          e.stopPropagation();
          setIsActive(v => !v);
        }}
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        title={isActive ? '關閉手寫 (ESC)' : '手寫筆記'}
      >
        <PenSketchIcon />
      </button>

      {/* Mini colour toolbar — floats at the bottom of the page */}
      {isActive && (
        <div className={styles.flipBookPageSketchBar}>
          {SKETCH_COLORS.map(c => (
            <button
              key={c.value}
              className={styles.flipBookPageSketchSwatch}
              style={{ background: c.value }}
              data-active={!isEraser && color === c.value}
              onClick={e => {
                e.stopPropagation();
                setColor(c.value);
                colorRef.current = c.value;
                setIsEraser(false);
                eraserRef.current = false;
              }}
              onMouseDown={e => e.stopPropagation()}
              title={c.label}
            />
          ))}
          <div className={styles.flipBookPageSketchDivider} />
          <button
            className={styles.flipBookPageSketchBtn}
            data-active={isEraser}
            onClick={e => {
              e.stopPropagation();
              const next = !isEraser;
              setIsEraser(next);
              eraserRef.current = next;
            }}
            onMouseDown={e => e.stopPropagation()}
            title="Eraser"
          >
            E
          </button>
          <button
            className={styles.flipBookPageSketchBtn}
            onClick={e => {
              e.stopPropagation();
              clearCanvas();
            }}
            onMouseDown={e => e.stopPropagation()}
            title="Clear"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

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

const makeReadFn = (
  store: any,
  isEditingRef: React.RefObject<boolean>,
  setContent: (text: string) => void
) => {
  return () => {
    if (isEditingRef.current) return;
    const blocks = [
      ...store.getBlocksByFlavour('affine:paragraph'),
      ...store.getBlocksByFlavour('affine:list'),
    ];
    const text = blocks
      .map(
        (b: any) =>
          (b.model as { text?: { toString(): string } })?.text
            ?.toString()
            .trim() ?? ''
      )
      .filter(Boolean)
      .join('\n');
    setContent(text);
  };
};

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
  const storeRef = useRef<any>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!journalDoc) {
      setContent('');
      storeRef.current = null;
      return;
    }
    let cleanup: (() => void) | undefined;
    try {
      const { doc, release } = docsService.open(journalDoc.id);
      const store = doc.blockSuiteDoc;
      storeRef.current = store;
      store.load();
      const read = makeReadFn(store, isEditingRef, setContent);
      read();
      const sub = store.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        storeRef.current = null;
      };
    } catch {
      setContent('');
    }
    return () => cleanup?.();
  }, [journalDoc, docsService]);

  const syncContent = useCallback(
    (newContent: string) => {
      const store = storeRef.current;
      if (!store) {
        // Journal doc doesn't exist yet; create it if user typed something
        if (newContent.trim()) journalService.ensureJournalByDate(dateKey);
        return;
      }
      try {
        const paragraphs = store.getBlocksByFlavour('affine:paragraph');
        const notes = store.getBlocksByFlavour('affine:note');
        if (!notes.length) return;

        if (paragraphs.length > 0) {
          // Write all content into the first paragraph, clear the rest
          const firstText = (paragraphs[0].model as { text?: Text }).text;
          if (firstText) {
            firstText.delete(0, firstText.length);
            if (newContent) firstText.insert(newContent, 0);
          }
          for (let i = 1; i < paragraphs.length; i++) {
            const t = (paragraphs[i].model as { text?: Text }).text;
            if (t) t.delete(0, t.length);
          }
        } else if (newContent.trim()) {
          store.addBlock(
            'affine:paragraph',
            { text: new Text(newContent) },
            notes[0].id
          );
        }
      } catch (e) {
        console.error('flip book sync failed', e);
      }
    },
    [journalService, dateKey]
  );

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
      <span className={styles.flipBookSectionLabel} data-section="journal">
        Journal
      </span>
      <textarea
        className={styles.flipBookPageTextarea}
        value={content}
        onChange={e => setContent(e.target.value)}
        onFocus={() => {
          isEditingRef.current = true;
        }}
        onBlur={e => {
          isEditingRef.current = false;
          syncContent(e.target.value);
        }}
        placeholder="No entry for this day…"
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        spellCheck={false}
      />
    </div>
  );
};

// ── Shared: editable textarea backed by a DocRecord's BlockSuite store ──────

const EditableDocContent = ({
  docRecord,
  placeholder,
}: {
  docRecord: DocRecord;
  placeholder: string;
}) => {
  const docsService = useService(DocsService);
  const storeRef = useRef<any>(null);
  const isEditingRef = useRef(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      const { doc, release } = docsService.open(docRecord.id);
      const store = doc.blockSuiteDoc;
      storeRef.current = store;
      store.load();
      const read = makeReadFn(store, isEditingRef, setContent);
      read();
      const sub = store.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        storeRef.current = null;
      };
    } catch {
      setContent('');
    }
    return () => cleanup?.();
  }, [docRecord.id, docsService]);

  const syncContent = useCallback((newContent: string) => {
    const store = storeRef.current;
    if (!store) return;
    try {
      const paragraphs = store.getBlocksByFlavour('affine:paragraph');
      const notes = store.getBlocksByFlavour('affine:note');
      if (!notes.length) return;
      if (paragraphs.length > 0) {
        const firstText = (paragraphs[0].model as { text?: Text }).text;
        if (firstText) {
          firstText.delete(0, firstText.length);
          if (newContent) firstText.insert(newContent, 0);
        }
        for (let i = 1; i < paragraphs.length; i++) {
          const t = (paragraphs[i].model as { text?: Text }).text;
          if (t) t.delete(0, t.length);
        }
      } else if (newContent.trim()) {
        store.addBlock(
          'affine:paragraph',
          { text: new Text(newContent) },
          notes[0].id
        );
      }
    } catch (e) {
      console.error('flip book doc sync failed', e);
    }
  }, []);

  return (
    <textarea
      className={styles.flipBookSectionTextarea}
      value={content}
      onChange={e => setContent(e.target.value)}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={e => {
        isEditingRef.current = false;
        syncContent(e.target.value);
      }}
      placeholder={placeholder}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      spellCheck={false}
    />
  );
};

// ── Shared: editable meeting name input ──────────────────────────────────────

const EditableMeetingName = ({ docRecord }: { docRecord: DocRecord }) => {
  const meta = useLiveData(docRecord.meta$);
  const displayName = (meta.title ?? '').replace(/^Meeting · /, '');
  const [name, setName] = useState(displayName);
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) setName(displayName);
  }, [displayName]);

  const commitRename = useCallback(
    (val: string) => {
      const trimmed = val.trim();
      if (trimmed) docRecord.setMeta({ title: `Meeting · ${trimmed}` });
    },
    [docRecord]
  );

  return (
    <input
      className={styles.flipBookMeetingNameInput}
      value={name}
      onChange={e => setName(e.target.value)}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={e => {
        isEditingRef.current = false;
        commitRename(e.target.value);
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      spellCheck={false}
    />
  );
};

// ── Specialized: editable todo-list textarea ─────────────────────────────────
//
// Reads/writes the affine:list { type:'todo' } blocks inside the TODO doc —
// the same blocks that JournalTodayTasks reads, so edits appear instantly in
// the journal's "Today's Tasks" section.

const EditableTodoContent = ({ docRecord }: { docRecord: DocRecord }) => {
  const docsService = useService(DocsService);
  const storeRef = useRef<any>(null);
  const isEditingRef = useRef(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      const { doc, release } = docsService.open(docRecord.id);
      const store = doc.blockSuiteDoc;
      storeRef.current = store;
      store.load();
      const read = () => {
        if (isEditingRef.current) return;
        const items = store
          .getBlocksByFlavour('affine:list')
          .filter((b: any) => b.model.props?.type === 'todo');
        const text = items
          .map((b: any) => b.model.props?.text?.toString().trim() ?? '')
          .filter(Boolean)
          .join('\n');
        setContent(text);
      };
      read();
      const sub = store.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        storeRef.current = null;
      };
    } catch {
      setContent('');
    }
    return () => cleanup?.();
  }, [docRecord.id, docsService]);

  const syncContent = useCallback((newContent: string) => {
    const store = storeRef.current;
    if (!store) return;
    try {
      const notes = store.getBlocksByFlavour('affine:note');
      if (!notes.length) return;
      const existingItems = store
        .getBlocksByFlavour('affine:list')
        .filter((b: any) => b.model.props?.type === 'todo');
      const lines = newContent.split('\n').filter(l => l.trim());

      // Update / add / clear to match lines
      for (let i = 0; i < Math.max(lines.length, existingItems.length); i++) {
        if (i < lines.length && i < existingItems.length) {
          store.updateBlock(existingItems[i].model, {
            text: new Text(lines[i]),
          });
        } else if (i < lines.length) {
          store.addBlock(
            'affine:list',
            { type: 'todo', text: new Text(lines[i]) },
            notes[0].id
          );
        } else {
          // clear so collectTasks filters it out (text.trim().length === 0)
          store.updateBlock(existingItems[i].model, { text: new Text('') });
        }
      }
    } catch (e) {
      console.error('flip book todo sync failed', e);
    }
  }, []);

  return (
    <textarea
      className={styles.flipBookSectionTextarea}
      value={content}
      onChange={e => setContent(e.target.value)}
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onBlur={e => {
        isEditingRef.current = false;
        syncContent(e.target.value);
      }}
      placeholder="Add tasks…"
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      spellCheck={false}
    />
  );
};

// ── Right page: todo + meeting ─────────────────────────────────────────────

const RightPageContent = ({ dateKey }: { dateKey: string }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
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

  const handleCreateTodo = useCallback(() => {
    const title = `Todo · ${dayjs(dateKey).format('MMM D, YYYY')}`;
    const newDoc = docsService.createDoc({
      title,
      docProps: {
        paragraph: { type: 'h3', text: new Text("Today's Tasks") },
      },
    });
    journalService.setJournalDate(newDoc.id, dateKey);
    // Todos surface via the journal's "Today's Tasks" section, not as a
    // linked-doc paragraph — so we only ensure the journal exists, no link.
    journalService.ensureJournalByDate(dateKey);
  }, [dateKey, docsService, journalService]);

  const handleCreateMeeting = useCallback(() => {
    const baseTitle = `Meeting · ${dayjs(dateKey).format('MMM D, YYYY')}`;
    const title =
      meetingDocs.length > 0
        ? `${baseTitle} (${meetingDocs.length + 1})`
        : baseTitle;
    const newDoc = docsService.createDoc({
      title,
      docProps: {
        paragraph: { type: 'h3', text: new Text('Meeting Notes') },
        onStoreLoad: (store: any, { noteId }: { noteId: string }) => {
          store.addBlock(
            'affine:paragraph',
            { type: 'h6', text: new Text('Location') },
            noteId
          );
          store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
          store.addBlock(
            'affine:paragraph',
            { type: 'h6', text: new Text('Discussion Points') },
            noteId
          );
          store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
        },
      },
    });
    journalService.setJournalDate(newDoc.id, dateKey);
    const journalDoc = journalService.ensureJournalByDate(dateKey);
    docsService.addLinkedDoc(journalDoc.id, newDoc.id).catch(console.error);
  }, [dateKey, docsService, journalService, meetingDocs.length]);

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
          <div className={styles.flipBookSectionHeader}>
            <span className={styles.flipBookSectionLabel} data-section="task">
              ✅ Tasks
            </span>
            {todoDocs.length === 0 && (
              <button
                className={styles.flipBookSectionAddBtn}
                onClick={e => {
                  e.stopPropagation();
                  handleCreateTodo();
                }}
                title="Add todo"
                onMouseDown={e => e.stopPropagation()}
              >
                +
              </button>
            )}
          </div>
          {todoDocs.length === 0 ? (
            <span className={styles.flipBookPageEmpty}>No tasks</span>
          ) : (
            <EditableTodoContent docRecord={todoDocs[0]} />
          )}
        </div>

        <div className={styles.flipBookSection}>
          <div className={styles.flipBookSectionHeader}>
            <span
              className={styles.flipBookSectionLabel}
              data-section="meeting"
            >
              📅 Meetings
            </span>
            <button
              className={styles.flipBookSectionAddBtn}
              onClick={e => {
                e.stopPropagation();
                handleCreateMeeting();
              }}
              title="Add meeting"
              onMouseDown={e => e.stopPropagation()}
            >
              +
            </button>
          </div>
          {meetingDocs.length === 0 ? (
            <span className={styles.flipBookPageEmpty}>No meetings</span>
          ) : (
            <div className={styles.flipBookMeetingList}>
              {meetingDocs.map(doc => (
                <div key={doc.id} className={styles.flipBookMeetingItem}>
                  <EditableMeetingName docRecord={doc} />
                  <EditableDocContent
                    docRecord={doc}
                    placeholder="Meeting notes…"
                  />
                </div>
              ))}
            </div>
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
    const sorted = Array.from(allJournalDates)
      .filter((d): d is string => !!d)
      .sort((a, b) => a.localeCompare(b));
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] < currentDay) return sorted[i];
    }
    return null;
  }, [allJournalDates, currentDay]);

  const nextJournalDay = useMemo(() => {
    const sorted = Array.from(allJournalDates)
      .filter((d): d is string => !!d)
      .sort((a, b) => a.localeCompare(b));
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
        <div className={styles.flipBookBookWrap}>
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
              <PageSketchCanvas dateKey={staticLeftDay} side="left" />
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
              <PageSketchCanvas dateKey={staticRightDay} side="right" />
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
          <div className={styles.flipBookBottomEdge} />
        </div>
        {/* flipBookBookWrap */}

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
