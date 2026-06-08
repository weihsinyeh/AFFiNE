import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

// ── Header ───────────────────────────────────────────────────────────────────

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 16px',
  height: '100%',
  flexWrap: 'wrap',
});

export const headerTitle = style({
  fontSize: 15,
  fontWeight: 600,
  color: cssVarV2('text/primary'),
});

export const headerCount = style({
  fontSize: 12,
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
  background: cssVarV2('layer/background/secondary'),
  borderRadius: 10,
  padding: '1px 7px',
});

export const headerSpacer = style({ flex: 1 });

// ── Category filter pills ────────────────────────────────────────────────────

export const catBar = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 6,
});

export const catBtn = style({
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 12px',
  borderRadius: 100,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  background: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  selectors: {
    '&:hover:not([data-active="true"])': {
      background: cssVarV2('layer/background/hoverOverlay'),
      borderColor: cssVar('primaryColor'),
    },
    '&[data-active="true"]': {
      background: cssVar('primaryColor'),
      borderColor: cssVar('primaryColor'),
      color: cssVar('pureWhite'),
      fontWeight: 600,
    },
  },
});

export const catDot = style({
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
});

export const catCount = style({
  fontSize: 11,
  opacity: 0.7,
  fontVariantNumeric: 'tabular-nums',
});

export const sortSelector = style({
  height: 28,
  padding: '0 26px 0 10px',
  borderRadius: 6,
  border: `1px solid ${cssVar('borderColor')}`,
  background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 8px center ${cssVarV2('layer/background/primary')}`,
  color: cssVarV2('text/primary'),
  fontSize: 13,
  cursor: 'pointer',
  appearance: 'none',
  outline: 'none',
  selectors: {
    '&:focus': { borderColor: cssVar('primaryColor') },
  },
});

// ── Body / card grid ─────────────────────────────────────────────────────────

export const body = style({
  width: '100%',
  height: '100%',
  padding: '16px',
  boxSizing: 'border-box',
  overflow: 'auto',
});

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(248px, 1fr))',
  gap: 12,
  alignItems: 'start',
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  minHeight: 132,
  padding: '12px 14px',
  borderRadius: 10,
  border: `1px solid ${cssVar('borderColor')}`,
  borderLeftWidth: 3,
  background: cssVarV2('layer/background/primary'),
  textAlign: 'left',
  transition: 'box-shadow 0.15s, transform 0.1s, border-color 0.15s',
  selectors: {
    '&:hover': {
      boxShadow: cssVar('shadow1'),
      transform: 'translateY(-1px)',
    },
  },
});

export const cardClickable = style({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  cursor: 'pointer',
});

export const cardRating = style({
  marginTop: 'auto',
  paddingTop: 8,
  borderTop: `1px solid ${cssVar('borderColor')}`,
});

export const cardHead = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  justifyContent: 'space-between',
});

export const cardChip = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  maxWidth: '70%',
  padding: '2px 8px',
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
});

export const cardDate = style({
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
  fontVariantNumeric: 'tabular-nums',
});

export const cardTitle = style({
  fontSize: 14,
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const cardPreview = style({
  flex: 1,
  margin: 0,
  fontSize: 12.5,
  lineHeight: 1.5,
  color: cssVar('textSecondaryColor'),
  whiteSpace: 'pre-line',
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 4,
  WebkitBoxOrient: 'vertical',
});

export const cardPreviewEmpty = style({
  flex: 1,
  fontSize: 12.5,
  fontStyle: 'italic',
  color: cssVar('placeholderColor'),
});

export const empty = style({
  padding: '64px 0',
  textAlign: 'center',
  fontSize: 14,
  color: cssVar('textSecondaryColor'),
});
