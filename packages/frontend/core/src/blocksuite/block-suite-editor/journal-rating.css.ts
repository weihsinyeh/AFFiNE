import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

// ── Shared clickable star / mood / weather control ───────────────────────────

export const root = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
});

export const compact = style({
  gap: 6,
});

export const stars = style({
  display: 'flex',
  gap: 1,
});

export const star = style({
  border: 'none',
  background: 'none',
  padding: '0 1px',
  margin: 0,
  cursor: 'pointer',
  lineHeight: 1,
  fontSize: 17,
  color: cssVarV2('icon/disable'),
  transition: 'color 0.1s, transform 0.1s',
  selectors: {
    '&[data-filled="true"]': { color: '#f5a623' },
    '&:hover': { transform: 'scale(1.18)' },
  },
});

export const divider = style({
  width: 1,
  height: 14,
  background: cssVar('borderColor'),
  flexShrink: 0,
});

export const picks = style({
  display: 'flex',
  gap: 2,
});

export const pick = style({
  border: '1px solid transparent',
  background: 'none',
  borderRadius: 6,
  padding: '1px 4px',
  margin: 0,
  cursor: 'pointer',
  fontSize: 15,
  lineHeight: 1.2,
  opacity: 0.4,
  filter: 'grayscale(0.6)',
  transition: 'all 0.12s',
  selectors: {
    '&:hover': {
      opacity: 0.85,
      filter: 'none',
      background: cssVarV2('layer/background/hoverOverlay'),
    },
    '&[data-active="true"]': {
      opacity: 1,
      filter: 'none',
      background: cssVarV2('layer/background/secondary'),
      borderColor: cssVar('primaryColor'),
    },
  },
});

// ── In-doc per-entry ratings panel ───────────────────────────────────────────

export const entryRatingsContainer = style({
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
});

export const entryRatingsBar = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  width: '100%',
  maxWidth: cssVar('editorWidth'),
  padding: `2px ${cssVar('editorSidePadding', '24px')} 10px`,
  '@container': {
    [`viewport (width <= 640px)`]: {
      padding: '2px 16px 10px',
    },
  },
});

export const entryRatingRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});

export const entryRatingLabel = style({
  fontSize: cssVar('fontXs'),
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  minWidth: 92,
  maxWidth: 168,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
