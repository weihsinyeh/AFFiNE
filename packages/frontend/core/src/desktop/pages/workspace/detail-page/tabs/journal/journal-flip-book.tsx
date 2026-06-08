import { IconButton } from '@affine/component';
import {
  DEFAULT_JOURNAL_TEMPLATES,
  JOURNAL_TEMPLATES_STORAGE_KEY,
  type JournalSegment,
  splitJournalSegments,
  type StoredJournalTemplate,
} from '@affine/core/blocksuite/block-suite-editor/journal-templates';
import { type DocRecord, DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { GlobalStateService } from '@affine/core/modules/storage';
import { Text } from '@blocksuite/affine/store';
import {
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  ExpandCloseIcon,
} from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
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

// ── Sketch palette & tools ─────────────────────────────────────────────────

type SketchPattern = 'pen' | 'pencil' | 'marker' | 'fountain';

/** 16 colours in a 2×8 grid inside the toolbar. */
const SKETCH_COLORS = [
  '#111111',
  '#5c5c5c',
  '#795548',
  '#c4a46b',
  '#c62828',
  '#e64a19',
  '#f9a825',
  '#558b2f',
  '#1a237e',
  '#1565c0',
  '#00838f',
  '#2e7d32',
  '#6a1b9a',
  '#e91e63',
  '#29b6f6',
  '#fffef5',
];

const PEN_SIZES = [1, 2, 4, 7] as const;
const ERASER_SIZES = [8, 16, 28] as const;
const PEN_DOT_VISUAL = [3, 5, 7, 10] as const;
const ERASER_DOT_VISUAL = [5, 7, 10] as const;

const PATTERNS: { key: SketchPattern; label: string; icon: React.ReactNode }[] =
  [
    {
      key: 'pen',
      label: '鋼筆',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line
            x1="2"
            y1="10"
            x2="10"
            y2="2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
    {
      key: 'pencil',
      label: '鉛筆',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line
            x1="1.5"
            y1="9.5"
            x2="9.5"
            y2="1.5"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.45"
          />
          <line
            x1="2.5"
            y1="10"
            x2="10.5"
            y2="2"
            stroke="currentColor"
            strokeWidth="0.7"
            strokeLinecap="round"
            opacity="0.35"
          />
          <line
            x1="1"
            y1="8.5"
            x2="9"
            y2="0.5"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeLinecap="round"
            opacity="0.3"
          />
        </svg>
      ),
    },
    {
      key: 'marker',
      label: '麥克筆',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <line
            x1="2"
            y1="9"
            x2="10"
            y2="3"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="square"
            opacity="0.45"
          />
        </svg>
      ),
    },
    {
      key: 'fountain',
      label: '毛筆',
      icon: (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 10 C4 8 6.5 5 10 2"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M2 10 C4 8 6.5 5 10 2"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinecap="round"
          />
        </svg>
      ),
    },
  ];

// ── Brush helpers ───────────────────────────────────────────────────────────

type Pt = { x: number; y: number };

function applyPen(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number,
  pt: Pt,
  from?: Pt
) {
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (from) {
    ctx.lineWidth = size;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function applyPencil(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number,
  pt: Pt,
  from?: Pt
) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  const passes = Math.max(3, Math.round(size * 1.5));
  for (let i = 0; i < passes; i++) {
    ctx.globalAlpha = 0.05 + Math.random() * 0.12;
    ctx.lineWidth = Math.max(0.5, size * 0.35);
    const scatter = size * 0.75;
    if (from) {
      ctx.beginPath();
      ctx.moveTo(
        from.x + (Math.random() - 0.5) * scatter,
        from.y + (Math.random() - 0.5) * scatter
      );
      ctx.lineTo(
        pt.x + (Math.random() - 0.5) * scatter,
        pt.y + (Math.random() - 0.5) * scatter
      );
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(
        pt.x + (Math.random() - 0.5) * size * 0.5,
        pt.y + (Math.random() - 0.5) * size * 0.5,
        size * 0.25,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function applyMarker(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number,
  pt: Pt,
  from?: Pt
) {
  ctx.globalAlpha = 0.35;
  const w = size * 4;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (from) {
    ctx.lineWidth = w;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'bevel';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  } else {
    ctx.fillRect(pt.x - w / 2, pt.y - w * 0.25, w, w * 0.5);
  }
  ctx.globalAlpha = 1;
}

function applyFountain(
  ctx: CanvasRenderingContext2D,
  color: string,
  size: number,
  pt: Pt,
  from?: Pt
) {
  let width = size * 1.5;
  if (from) {
    const dx = pt.x - from.x;
    const dy = pt.y - from.y;
    const speed = Math.sqrt(dx * dx + dy * dy);
    // slow strokes → wide; fast strokes → thin
    width = Math.max(size * 0.5, (size * 3) / (1 + speed * 0.15));
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  if (from) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, width / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Inline SVG icons ───────────────────────────────────────────────────────

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

const GripIcon = () => (
  <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
    <circle cx="2" cy="2" r="1" />
    <circle cx="6" cy="2" r="1" />
    <circle cx="2" cy="5" r="1" />
    <circle cx="6" cy="5" r="1" />
    <circle cx="2" cy="8" r="1" />
    <circle cx="6" cy="8" r="1" />
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
  const lastPtRef = useRef<Pt | null>(null);
  const colorRef = useRef(SKETCH_COLORS[0]);
  const eraserRef = useRef(false);
  const penSizeRef = useRef<number>(2);
  const eraserSizeRef = useRef<number>(16);
  const patternRef = useRef<SketchPattern>('pen');

  const [isActive, setIsActive] = useState(false);
  const [color, setColor] = useState(SKETCH_COLORS[0]);
  const [isEraser, setIsEraser] = useState(false);
  const [penSize, setPenSize] = useState<(typeof PEN_SIZES)[number]>(2);
  const [eraserSize, setEraserSize] =
    useState<(typeof ERASER_SIZES)[number]>(16);
  const [pattern, setPattern] = useState<SketchPattern>('pen');

  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    eraserRef.current = isEraser;
  }, [isEraser]);
  useEffect(() => {
    penSizeRef.current = penSize;
  }, [penSize]);
  useEffect(() => {
    eraserSizeRef.current = eraserSize;
  }, [eraserSize]);
  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  // ── Toolbar drag / collapse ──────────────────────────────────────────────
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isDraggingRef = useRef(false);
  const dragOriginRef = useRef<{
    mouseX: number;
    mouseY: number;
    left: number;
    top: number;
  } | null>(null);

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

  // Toolbar drag — document-level move/up so dragging outside the page still works.
  // All mutable state is read via refs so deps are empty (stable across renders).
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current || !dragOriginRef.current) return;
      const toolbar = toolbarRef.current;
      const parent = toolbar?.parentElement;
      if (!toolbar || !parent) return;
      const clientX = 'touches' in e ? (e.touches[0]?.clientX ?? 0) : e.clientX;
      const clientY = 'touches' in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
      const dx = clientX - dragOriginRef.current.mouseX;
      const dy = clientY - dragOriginRef.current.mouseY;
      const newLeft = Math.max(
        0,
        Math.min(
          parent.offsetWidth - toolbar.offsetWidth,
          dragOriginRef.current.left + dx
        )
      );
      const newTop = Math.max(
        0,
        Math.min(
          parent.offsetHeight - toolbar.offsetHeight,
          dragOriginRef.current.top + dy
        )
      );
      setToolbarPos({ x: newLeft, y: newTop });
    };
    const onUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
  }, []);

  const startDrag = (clientX: number, clientY: number) => {
    const toolbar = toolbarRef.current;
    const parent = toolbar?.parentElement;
    if (!toolbar || !parent) return;
    const parentRect = parent.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    isDraggingRef.current = true;
    dragOriginRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      left: toolbarRect.left - parentRect.left,
      top: toolbarRect.top - parentRect.top,
    };
  };

  const onGripMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const onGripTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (!e.touches.length) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

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

  const applyStroke = (pt: Pt, from?: Pt) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (eraserRef.current) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      const sz = eraserSizeRef.current;
      ctx.lineWidth = sz;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
      if (from) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, sz / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    ctx.globalCompositeOperation = 'source-over';
    const col = colorRef.current;
    const sz = penSizeRef.current;
    switch (patternRef.current) {
      case 'pen':
        applyPen(ctx, col, sz, pt, from);
        break;
      case 'pencil':
        applyPencil(ctx, col, sz, pt, from);
        break;
      case 'marker':
        applyMarker(ctx, col, sz, pt, from);
        break;
      case 'fountain':
        applyFountain(ctx, col, sz, pt, from);
        break;
    }
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

      {/* Multi-row toolbar — draggable, collapsible, floats above the canvas */}
      {isActive && (
        <div
          ref={toolbarRef}
          className={styles.flipBookPageSketchBar}
          style={
            toolbarPos
              ? {
                  left: toolbarPos.x,
                  top: toolbarPos.y,
                  bottom: 'auto',
                  transform: 'none',
                }
              : undefined
          }
        >
          {/* Drag grip + collapse toggle */}
          <div
            className={styles.flipBookPageSketchGrip}
            onMouseDown={onGripMouseDown}
            onTouchStart={onGripTouchStart}
          >
            <GripIcon />
            <button
              className={styles.flipBookPageSketchCollapseBtn}
              onClick={e => {
                e.stopPropagation();
                setIsCollapsed(v => !v);
              }}
              onMouseDown={e => e.stopPropagation()}
              title={isCollapsed ? '展開' : '收起'}
            >
              {isCollapsed ? '+' : '−'}
            </button>
          </div>

          {!isCollapsed && (
            <>
              {/* Row 1: pattern selectors | eraser toggle | clear */}
              <div className={styles.flipBookPageSketchRow}>
                <div className={styles.flipBookPageSketchGroup}>
                  {PATTERNS.map(p => (
                    <button
                      key={p.key}
                      className={styles.flipBookPageSketchPatternBtn}
                      data-active={!isEraser && pattern === p.key}
                      title={p.label}
                      onClick={e => {
                        e.stopPropagation();
                        setPattern(p.key);
                        patternRef.current = p.key;
                        setIsEraser(false);
                        eraserRef.current = false;
                      }}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      {p.icon}
                    </button>
                  ))}
                </div>
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
                  title="橡皮擦"
                >
                  E
                </button>
                <div className={styles.flipBookPageSketchDivider} />
                <button
                  className={styles.flipBookPageSketchBtn}
                  onClick={e => {
                    e.stopPropagation();
                    clearCanvas();
                  }}
                  onMouseDown={e => e.stopPropagation()}
                  title="清除全部"
                >
                  ✕
                </button>
              </div>

              {/* Row 2: size presets — pen sizes or eraser sizes depending on mode */}
              <div className={styles.flipBookPageSketchRow}>
                <div className={styles.flipBookPageSketchGroup}>
                  {isEraser
                    ? ERASER_SIZES.map((s, i) => (
                        <button
                          key={s}
                          className={styles.flipBookPageSketchSizeBtn}
                          data-active={eraserSize === s}
                          title={`橡皮擦 ${s}px`}
                          onClick={e => {
                            e.stopPropagation();
                            setEraserSize(s);
                            eraserSizeRef.current = s;
                          }}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <span
                            className={styles.flipBookPageSketchSizeBlock}
                            style={{
                              width: ERASER_DOT_VISUAL[i],
                              height: ERASER_DOT_VISUAL[i],
                            }}
                          />
                        </button>
                      ))
                    : PEN_SIZES.map((s, i) => (
                        <button
                          key={s}
                          className={styles.flipBookPageSketchSizeBtn}
                          data-active={penSize === s}
                          title={`筆粗 ${s}px`}
                          onClick={e => {
                            e.stopPropagation();
                            setPenSize(s);
                            penSizeRef.current = s;
                          }}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <span
                            className={styles.flipBookPageSketchSizeDot}
                            style={{
                              width: PEN_DOT_VISUAL[i],
                              height: PEN_DOT_VISUAL[i],
                            }}
                          />
                        </button>
                      ))}
                </div>
              </div>

              {/* Row 3–4: 16-colour grid (2 rows × 8 columns) */}
              <div className={styles.flipBookPageSketchColorGrid}>
                {SKETCH_COLORS.map(c => (
                  <button
                    key={c}
                    className={styles.flipBookPageSketchSwatch}
                    style={{ background: c }}
                    data-active={!isEraser && color === c}
                    onClick={e => {
                      e.stopPropagation();
                      setColor(c);
                      colorRef.current = c;
                      setIsEraser(false);
                      eraserRef.current = false;
                    }}
                    onMouseDown={e => e.stopPropagation()}
                    title={c}
                  />
                ))}
              </div>
            </>
          )}
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

// ── Left page: journal entries, grouped by template ─────────────────────────

const ALL_CATEGORY = '__all__';

/**
 * Write an entry's edited body text back into its blocks, preserving block
 * structure line-for-line: each line overwrites the matching block in place,
 * removed lines delete their block, added lines append fresh paragraphs after
 * the entry. The heading block is never touched, so categories stay intact.
 */
const writeEntryBody = (store: any, entry: JournalSegment, text: string) => {
  if (!store) return;
  try {
    const note = store.getBlocksByFlavour('affine:note')[0];
    if (!note) return;
    const lines = text.split('\n');
    const blocks = entry.bodyBlockIds
      .map((id: string) => store.getBlock(id)?.model)
      .filter(Boolean);

    for (let i = 0; i < blocks.length; i++) {
      const t = (blocks[i] as { text?: Text }).text;
      if (!t) continue;
      t.delete(0, t.length);
      if (i < lines.length && lines[i]) t.insert(lines[i], 0);
    }
    if (blocks.length > lines.length) {
      for (let i = lines.length; i < blocks.length; i++) {
        store.deleteBlock(blocks[i]);
      }
    } else if (lines.length > blocks.length) {
      const childIds: string[] =
        (note.model as { children?: { id: string }[] }).children?.map(
          c => c.id
        ) ?? [];
      const anchorId = blocks.length
        ? blocks[blocks.length - 1].id
        : entry.headingBlockId;
      let insertAt =
        (anchorId ? childIds.indexOf(anchorId) : childIds.length - 1) + 1;
      for (let i = blocks.length; i < lines.length; i++) {
        store.addBlock(
          'affine:paragraph',
          { text: new Text(lines[i] ?? '') },
          note.id,
          insertAt++
        );
      }
    }
  } catch (e) {
    console.error('flip book entry sync failed', e);
  }
};

/** Overwrite a single block's text (used for the editable entry heading). */
const writeBlockText = (store: any, blockId: string, text: string) => {
  if (!store) return;
  try {
    const t = (store.getBlock(blockId)?.model as { text?: Text } | undefined)
      ?.text;
    if (t) {
      t.delete(0, t.length);
      if (text) t.insert(text, 0);
    }
  } catch (e) {
    console.error('flip book heading sync failed', e);
  }
};

/** One editable entry (a template instance, or the free-form preamble). */
const FlipBookEntry = ({
  store,
  entry,
  isEditingRef,
}: {
  store: any;
  entry: JournalSegment;
  isEditingRef: React.RefObject<boolean>;
}) => {
  const [text, setText] = useState(entry.bodyText);
  const [heading, setHeading] = useState(entry.title);
  const focusedRef = useRef(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Resync from the doc when it changes elsewhere, unless editing here.
  useEffect(() => {
    if (!focusedRef.current) setText(entry.bodyText);
  }, [entry.bodyText]);
  useEffect(() => {
    if (!focusedRef.current) setHeading(entry.title);
  }, [entry.title]);

  // Auto-grow so the outer container — not each textarea — owns the scroll.
  useEffect(() => {
    const el = taRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);

  const onFocus = useCallback(() => {
    focusedRef.current = true;
    isEditingRef.current = true;
  }, [isEditingRef]);

  return (
    <div className={styles.flipBookEntry}>
      {entry.headingBlockId ? (
        <input
          className={styles.flipBookEntryHeading}
          value={heading}
          onChange={e => setHeading(e.target.value)}
          onFocus={onFocus}
          onBlur={e => {
            focusedRef.current = false;
            isEditingRef.current = false;
            // Keep the template label as a prefix so the entry stays grouped.
            if (entry.headingBlockId) {
              writeBlockText(store, entry.headingBlockId, e.target.value);
            }
          }}
          onMouseDown={e => e.stopPropagation()}
          spellCheck={false}
        />
      ) : null}
      <textarea
        ref={taRef}
        className={styles.flipBookEntryTextarea}
        value={text}
        rows={1}
        onChange={e => setText(e.target.value)}
        onFocus={onFocus}
        onBlur={e => {
          focusedRef.current = false;
          isEditingRef.current = false;
          // Write back once, on blur: during editing isEditingRef suppresses
          // re-reads, so the entry's block ids stay valid and we never apply a
          // stale-id write twice (which would duplicate blocks).
          writeEntryBody(store, entry, e.target.value);
        }}
        placeholder="…"
        onMouseDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
        spellCheck={false}
      />
    </div>
  );
};

const LeftPageContent = ({ dateKey }: { dateKey: string }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const globalState = useService(GlobalStateService).globalState;

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
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

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

  const [segments, setSegments] = useState<JournalSegment[]>([]);
  const [emptyContent, setEmptyContent] = useState('');
  const storeRef = useRef<any>(null);
  const isEditingRef = useRef(false);
  const pendingWriteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!journalDoc) {
      setSegments([]);
      setEmptyContent('');
      storeRef.current = null;
      return;
    }
    let cleanup: (() => void) | undefined;
    try {
      const { doc, release } = docsService.open(journalDoc.id);
      const store = doc.blockSuiteDoc;
      storeRef.current = store;
      store.load();

      const pending = pendingWriteRef.current;
      if (pending !== null) {
        pendingWriteRef.current = null;
        if (pending.trim()) {
          try {
            const notes = store.getBlocksByFlavour('affine:note');
            if (notes.length) {
              store.addBlock(
                'affine:paragraph',
                { text: new Text(pending) },
                notes[0].id
              );
            }
          } catch {}
        }
      }

      const read = () => {
        if (isEditingRef.current) return;
        setSegments(splitJournalSegments(store, templatesRef.current));
      };
      read();
      const sub = store.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        storeRef.current = null;
      };
    } catch {
      setSegments([]);
    }
    return () => cleanup?.();
  }, [journalDoc, docsService]);

  // Fallback editor for a day that has no entries yet — typing creates the doc.
  const syncEmpty = useCallback(
    (newContent: string) => {
      const store = storeRef.current;
      if (!store) {
        if (!newContent.trim()) return;
        pendingWriteRef.current = newContent;
        journalService.ensureJournalByDate(dateKey);
        return;
      }
      try {
        const notes = store.getBlocksByFlavour('affine:note');
        if (!notes.length) return;
        const paragraphs = store.getBlocksByFlavour('affine:paragraph');
        if (paragraphs.length > 0) {
          const firstText = (paragraphs[0].model as { text?: Text }).text;
          if (firstText) {
            firstText.delete(0, firstText.length);
            if (newContent) firstText.insert(newContent, 0);
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
  const emptyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Category tabs ──────────────────────────────────────────────────────────
  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY);
  useEffect(() => {
    setActiveCategory(ALL_CATEGORY);
  }, [dateKey]);

  const categories = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; rank: number }>();
    for (const s of segments) {
      if (s.templateId && !seen.has(s.templateId)) {
        seen.set(s.templateId, {
          id: s.templateId,
          label: s.label,
          rank: s.rank,
        });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.rank - b.rank);
  }, [segments]);

  useEffect(() => {
    if (
      activeCategory !== ALL_CATEGORY &&
      !categories.some(c => c.id === activeCategory)
    ) {
      setActiveCategory(ALL_CATEGORY);
    }
  }, [categories, activeCategory]);

  const visibleSegments = useMemo(
    () =>
      activeCategory === ALL_CATEGORY
        ? segments
        : segments.filter(s => s.templateId === activeCategory),
    [segments, activeCategory]
  );

  // ── Vertical bar index → jump to the Nth entry ──────────────────────────────
  // We read the scroll container's children directly instead of keeping a refs
  // array: the entry divs are this container's direct children in order, so
  // `children[i]` is always the i-th entry — robust across re-renders (a stale
  // refs array was making clicks register only once).
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeEntry, setActiveEntry] = useState(0);

  const jumpTo = useCallback((i: number) => {
    const scroller = scrollRef.current;
    const el = scroller?.children[i] as HTMLElement | undefined;
    if (scroller && el) {
      scroller.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
      setActiveEntry(i);
    }
  }, []);

  const onScroll = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let idx = 0;
    Array.from(scroller.children).forEach((el, i) => {
      if ((el as HTMLElement).offsetTop <= scroller.scrollTop + 12) idx = i;
    });
    setActiveEntry(idx);
  }, []);

  // Switching category resets the list to the top and clears the active bar.
  useEffect(() => {
    setActiveEntry(0);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [activeCategory]);

  const d = dayjs(dateKey);
  const showTabs = categories.length > 0;

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

      {showTabs ? (
        <div
          className={styles.flipBookCategoryBar}
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            className={styles.flipBookCategoryTab}
            data-active={activeCategory === ALL_CATEGORY}
            onClick={() => setActiveCategory(ALL_CATEGORY)}
          >
            全部
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={styles.flipBookCategoryTab}
              data-active={activeCategory === c.id}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : (
        <span className={styles.flipBookSectionLabel} data-section="journal">
          Journal
        </span>
      )}

      {segments.length === 0 ? (
        <textarea
          className={styles.flipBookPageTextarea}
          value={emptyContent}
          onChange={e => {
            const val = e.target.value;
            setEmptyContent(val);
            if (emptyTimerRef.current) clearTimeout(emptyTimerRef.current);
            emptyTimerRef.current = setTimeout(() => syncEmpty(val), 300);
          }}
          onFocus={() => {
            isEditingRef.current = true;
          }}
          onBlur={e => {
            isEditingRef.current = false;
            if (emptyTimerRef.current) {
              clearTimeout(emptyTimerRef.current);
              emptyTimerRef.current = null;
            }
            syncEmpty(e.target.value);
          }}
          placeholder="No entry for this day…"
          onMouseDown={e => e.stopPropagation()}
          onTouchStart={e => e.stopPropagation()}
          spellCheck={false}
        />
      ) : (
        <div className={styles.flipBookLeftBody}>
          {visibleSegments.length > 1 ? (
            <div
              className={styles.flipBookBarIndex}
              onMouseDown={e => e.stopPropagation()}
            >
              {visibleSegments.map((s, i) => (
                <button
                  key={s.headingBlockId ?? `pre-${i}`}
                  className={styles.flipBookBar}
                  data-active={i === activeEntry}
                  onClick={() => jumpTo(i)}
                  aria-label={s.title || 'Journal'}
                >
                  <span className={styles.flipBookBarTip}>
                    {s.title || 'Journal'}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <div
            className={styles.flipBookEntries}
            ref={scrollRef}
            onScroll={onScroll}
          >
            {visibleSegments.map((s, i) => (
              <FlipBookEntry
                key={s.headingBlockId ?? `pre-${i}`}
                store={storeRef.current}
                entry={s}
                isEditingRef={isEditingRef}
              />
            ))}
          </div>
        </div>
      )}
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
  const docsService = useService(DocsService);
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
      if (!trimmed) return;
      const newTitle = `Meeting · ${trimmed}`;
      // Let changeDocTitle handle both the BlockSuite root block title (Y.Text)
      // and the workspace metadata atomically.  Calling setMeta here first
      // would trigger RootBlockModel's rootAdded listener to revert the
      // metadata back to the block's old title before the block is updated.
      docsService.changeDocTitle(docRecord.id, newTitle).catch(console.error);
    },
    [docRecord, docsService]
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
  const docsLiveData$ = useMemo(
    () => journalService.journalsByDate$(dateKey),
    [dateKey, journalService]
  );

  // Subscribe to both the journal-date membership list AND each doc's meta$
  // title so that renaming a meeting doc is immediately reflected here.
  const docsTitleLiveData$ = useMemo(
    () =>
      LiveData.computed(get => {
        const docs = get(docsLiveData$);
        const meetingDocs: DocRecord[] = [];
        let journalDoc: DocRecord | null = null;
        let todoDoc: DocRecord | null = null;
        for (const doc of docs) {
          const title = get(doc.meta$)?.title ?? '';
          if (title.startsWith('Meeting ·')) meetingDocs.push(doc);
          else if (title.startsWith('Todo ·')) todoDoc = doc;
          else journalDoc = doc;
        }
        return { meetingDocs, journalDoc, todoDoc };
      }),
    [docsLiveData$]
  );
  const { meetingDocs, todoDoc } = useLiveData(docsTitleLiveData$) ?? {
    meetingDocs: [],
    todoDoc: null,
  };

  // Show Tasks section when a Todo · DATE doc exists for this date
  const hasTodoSection = todoDoc !== null;

  const handleCreateTodo = useCallback(() => {
    const day = dayjs(dateKey);
    const newDoc = docsService.createDoc({
      title: `Todo · ${day.format('MMM D, YYYY')}`,
    });
    journalService.setJournalDate(newDoc.id, dateKey);
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
              ✅ Todo
            </span>
            {!hasTodoSection && (
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
          {hasTodoSection && todoDoc ? (
            <EditableTodoContent docRecord={todoDoc} />
          ) : (
            <span className={styles.flipBookPageEmpty}>No tasks</span>
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
