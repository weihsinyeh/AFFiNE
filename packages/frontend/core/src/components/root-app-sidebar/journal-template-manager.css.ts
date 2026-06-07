import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  maxHeight: '60vh',
  overflowY: 'auto',
  paddingRight: 4,
});

export const hint = style({
  fontSize: cssVar('fontXs'),
  color: cssVarV2('text/secondary'),
  lineHeight: '18px',
  padding: '8px 10px',
  borderRadius: 6,
  background: cssVarV2('layer/background/secondary'),
});

export const templateCard = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: 10,
  borderRadius: 8,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const cardHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const labelInput = style({
  flex: 1,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: cssVar('fontSm'),
  fontWeight: 600,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  ':focus': {
    borderColor: cssVar('primaryColor'),
  },
});

export const contentTextarea = style({
  width: '100%',
  minHeight: 120,
  resize: 'vertical',
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: cssVar('fontXs'),
  lineHeight: '20px',
  fontFamily: 'monospace',
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  boxSizing: 'border-box',
  ':focus': {
    borderColor: cssVar('primaryColor'),
  },
});

export const footer = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 12,
});
