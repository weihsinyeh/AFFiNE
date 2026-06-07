import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  display: 'flex',
  width: '100%',
  justifyContent: 'center',
});

export const bar = style({
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 8,
  width: '100%',
  maxWidth: cssVar('editorWidth'),
  padding: `6px ${cssVar('editorSidePadding', '24px')}`,
  '@container': {
    [`viewport (width <= 640px)`]: {
      padding: '6px 16px',
    },
  },
});

export const label = style({
  fontSize: cssVar('fontXs'),
  fontWeight: 600,
  color: cssVarV2('text/secondary'),
  marginRight: 2,
});

export const templateButton = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 10px',
  borderRadius: 100,
  border: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  background: cssVarV2('layer/background/secondary'),
  color: cssVarV2('text/primary'),
  fontSize: cssVar('fontXs'),
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  selectors: {
    '&:hover': {
      background: cssVarV2('layer/background/hoverOverlay'),
      borderColor: cssVar('primaryColor'),
    },
  },
});
