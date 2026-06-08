import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

import { container } from './bi-directional-link-panel.css';

export const root = style([
  container,
  {
    paddingBottom: 6,
    display: 'flex',
    gap: 8,
    alignItems: 'center',

    fontSize: 12,
    fontWeight: 400,
    lineHeight: '20px',
    color: cssVarV2.text.primary,
  },
]);

export const badges = style({
  display: 'flex',
  gap: 12,
  alignItems: 'center',
});

export const badge = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 8px',
  borderRadius: 40,
  backgroundColor: cssVarV2.layer.background.secondary,
  cursor: 'pointer',
  userSelect: 'none',
  position: 'relative',

  ':before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,.04)',
    borderRadius: 'inherit',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  },

  selectors: {
    '&:hover:before': {
      opacity: 1,
    },
    '&[data-active="true"]:before': {
      opacity: 1,
    },
  },
});

export const badgeIcon = style({
  fontSize: 20,
  lineHeight: 0,
  color: cssVarV2.icon.primary,
});

export const aiIcon = style({
  color: cssVarV2.icon.activated,
});

export const badgeText = style({
  fontSize: 15,
  lineHeight: '24px',
  whiteSpace: 'nowrap',
});

// ── "AI智慧新增todo及meeting" suggestion dialog ───────────────────────────────

export const dialogReply = style({
  fontSize: 14,
  lineHeight: 1.6,
  color: cssVarV2.text.primary,
  marginBottom: 12,
  whiteSpace: 'pre-line',
});

export const suggestEmpty = style({
  padding: '24px 0',
  textAlign: 'center',
  fontSize: 14,
  color: cssVarV2.text.secondary,
});

export const suggestList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  maxHeight: '52vh',
  overflow: 'auto',
});

export const suggestItem = style({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2.layer.insideBorder.border}`,
  background: cssVarV2.layer.background.secondary,
});

export const suggestMain = style({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const suggestTop = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

export const kindChip = style({
  flexShrink: 0,
  padding: '1px 8px',
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

export const kindTodo = style({
  background: 'rgba(59,130,246,0.13)',
  color: '#1d6fca',
});

export const kindMeeting = style({
  background: 'rgba(245,158,11,0.16)',
  color: '#b45309',
});

export const suggestDate = style({
  fontSize: 11,
  fontWeight: 500,
  color: cssVarV2.text.secondary,
  fontVariantNumeric: 'tabular-nums',
});

export const suggestText = style({
  fontSize: 13.5,
  lineHeight: 1.5,
  color: cssVarV2.text.primary,
  wordBreak: 'break-word',
});

export const suggestNotes = style({
  fontSize: 12,
  lineHeight: 1.5,
  color: cssVarV2.text.secondary,
  wordBreak: 'break-word',
});

const addBtnBase = style({
  flexShrink: 0,
  alignSelf: 'center',
  height: 28,
  padding: '0 14px',
  borderRadius: 6,
  border: '1px solid transparent',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'opacity 0.15s',
  selectors: {
    '&:hover': { opacity: 0.85 },
  },
});

export const addTodo = style([
  addBtnBase,
  {
    background: 'rgba(59,130,246,0.13)',
    borderColor: 'rgba(59,130,246,0.4)',
    color: '#1d6fca',
  },
]);

export const addMeeting = style([
  addBtnBase,
  {
    background: 'rgba(245,158,11,0.16)',
    borderColor: 'rgba(245,158,11,0.45)',
    color: '#b45309',
  },
]);

export const addedTag = style({
  flexShrink: 0,
  alignSelf: 'center',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 28,
  padding: '0 12px',
  fontSize: 13,
  fontWeight: 500,
  color: cssVarV2.status.success,
});
