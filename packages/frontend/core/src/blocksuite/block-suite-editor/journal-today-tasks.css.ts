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

// ── Per-task metadata row ──────────────────────────────────────────────────

export const taskWithMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
});

export const taskMetaRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  paddingLeft: 26,
  paddingBottom: 3,
  flexWrap: 'wrap',
});

export const taskMetaDate = style({
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 10,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  selectors: {
    '&:focus': { borderColor: cssVar('primaryColor') },
    '&::-webkit-calendar-picker-indicator': {
      opacity: 0.5,
      cursor: 'pointer',
      width: 10,
      height: 10,
    },
  },
});

export const taskMetaNotes = style({
  flex: 1,
  minWidth: 50,
  border: `1px solid transparent`,
  borderRadius: 4,
  padding: '1px 4px',
  fontSize: 10,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  selectors: {
    '&::placeholder': { color: cssVar('placeholderColor') },
    '&:hover': { borderColor: cssVar('borderColor') },
    '&:focus': {
      borderColor: cssVar('primaryColor'),
      background: cssVarV2('layer/background/primary'),
    },
  },
});

// ── Metadata fields (Status / Priority / Deadline / Notes) ─────────────────

export const metaSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  marginTop: 8,
  paddingTop: 8,
  borderTop: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
});

export const metaRow = style({
  display: 'flex',
  gap: 8,
});

export const metaField = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: 1,
  minWidth: 0,
});

export const metaLabel = style({
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  color: cssVar('textSecondaryColor'),
});

const metaSelectBase = style({
  appearance: 'none',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 4,
  padding: '2px 18px 2px 6px',
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 5px center',
  backgroundSize: '8px',
  outline: 'none',
  width: '100%',
  selectors: {
    '&:focus': { borderColor: cssVar('primaryColor') },
  },
});

export const metaStatusSelect = style([
  metaSelectBase,
  {
    selectors: {
      '&[data-status=""]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: cssVarV2('layer/background/primary'),
        color: cssVar('textSecondaryColor'),
        borderColor: cssVar('borderColor'),
      },
      '&[data-status="in-progress"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%231d6fca' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(59,130,246,0.10)',
        color: '#1d6fca',
        borderColor: 'rgba(59,130,246,0.35)',
      },
      '&[data-status="blocked"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23c0392b' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(239,68,68,0.10)',
        color: '#c0392b',
        borderColor: 'rgba(239,68,68,0.35)',
      },
      '&[data-status="under-review"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23b45309' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(245,158,11,0.10)',
        color: '#b45309',
        borderColor: 'rgba(245,158,11,0.35)',
      },
      '&[data-status="completed"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23166534' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(34,197,94,0.10)',
        color: '#166534',
        borderColor: 'rgba(34,197,94,0.35)',
      },
    },
  },
]);

export const metaPrioritySelect = style([
  metaSelectBase,
  {
    selectors: {
      '&[data-priority=""]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23888' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: cssVarV2('layer/background/primary'),
        color: cssVar('textSecondaryColor'),
        borderColor: cssVar('borderColor'),
      },
      '&[data-priority="high"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23c0392b' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(239,68,68,0.10)',
        color: '#c0392b',
        borderColor: 'rgba(239,68,68,0.35)',
      },
      '&[data-priority="medium"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23b45309' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(245,158,11,0.10)',
        color: '#b45309',
        borderColor: 'rgba(245,158,11,0.35)',
      },
      '&[data-priority="low"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%231d6fca' stroke-width='1.2' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 5px center`,
        backgroundColor: 'rgba(59,130,246,0.10)',
        color: '#1d6fca',
        borderColor: 'rgba(59,130,246,0.35)',
      },
    },
  },
]);

export const metaDateInput = style({
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  selectors: {
    '&:focus': { borderColor: cssVar('primaryColor') },
    '&::-webkit-calendar-picker-indicator': { opacity: 0.5, cursor: 'pointer' },
  },
});

export const metaNotesInput = style({
  border: `1px solid transparent`,
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 11,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  selectors: {
    '&::placeholder': {
      color: cssVar('placeholderColor'),
      fontStyle: 'italic',
    },
    '&:hover': { borderColor: cssVar('borderColor') },
    '&:focus': {
      borderColor: cssVar('primaryColor'),
      background: cssVarV2('layer/background/primary'),
    },
  },
});
