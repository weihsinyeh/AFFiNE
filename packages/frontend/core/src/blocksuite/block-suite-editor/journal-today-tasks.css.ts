import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
});

export const section = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  width: '100%',
  maxWidth: cssVar('editorWidth'),
  padding: `0 ${cssVar('editorSidePadding', '24px')}`,
  marginTop: 8,
  '@container': {
    [`viewport (width <= 640px)`]: {
      padding: '0 16px',
    },
  },
});

export const card = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  padding: '8px 12px',
  borderRadius: 8,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  backgroundColor: cssVarV2('layer/background/secondary'),
});

export const header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
});

export const title = style({
  fontSize: cssVar('fontSm'),
  fontWeight: 600,
  color: cssVarV2('text/primary'),
});

export const taskRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '2px 0',
  fontSize: cssVar('fontSm'),
  color: cssVarV2('text/primary'),
});

export const taskText = style({
  selectors: {
    '&[data-checked="true"]': {
      textDecoration: 'line-through',
      color: cssVarV2('text/disable'),
    },
  },
});

export const addRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginTop: 2,
});

export const addInput = style({
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: cssVar('fontSm'),
  color: cssVarV2('text/primary'),
  padding: '2px 0',
  '::placeholder': {
    color: cssVarV2('text/placeholder'),
  },
});

export const openButton = style({
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  color: cssVarV2('icon/secondary'),
  borderRadius: 4,
  padding: 2,
  ':hover': {
    backgroundColor: cssVarV2('layer/background/hoverOverlay'),
    color: cssVarV2('icon/primary'),
  },
});
