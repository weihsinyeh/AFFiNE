import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const header = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 16px',
  height: '100%',
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

export const newTodoBtn = style({
  display: 'flex',
  alignItems: 'center',
  height: 28,
  padding: '0 12px',
  borderRadius: 6,
  border: `1px solid ${cssVar('borderColor')}`,
  background: 'transparent',
  color: cssVarV2('text/primary'),
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  selectors: {
    '&:hover': {
      background: cssVar('primaryColor'),
      borderColor: cssVar('primaryColor'),
      color: cssVar('pureWhite'),
    },
  },
});

// ── New-todo creation row ──────────────────────────────────────────────────

export const newTodoRow = style({
  background: cssVarV2('layer/background/hoverOverlay'),
});

export const newTodoCell = style({
  padding: '10px 12px',
});

export const newTodoForm = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

export const newTodoLabel = style({
  fontSize: 12,
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
  whiteSpace: 'nowrap',
});

export const newTodoDateInput = style({
  border: `1px solid ${cssVar('primaryColor')}`,
  borderRadius: 5,
  padding: '4px 8px',
  fontSize: 13,
  color: cssVarV2('text/primary'),
  background: cssVarV2('layer/background/primary'),
  outline: 'none',
  selectors: {
    '&::-webkit-calendar-picker-indicator': { opacity: 0.6, cursor: 'pointer' },
  },
});

export const newTodoTaskInput = style({
  flex: 1,
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 5,
  padding: '4px 8px',
  fontSize: 13,
  color: cssVarV2('text/primary'),
  background: cssVarV2('layer/background/primary'),
  outline: 'none',
  minWidth: 0,
  selectors: {
    '&::placeholder': { color: cssVar('placeholderColor') },
    '&:focus': { borderColor: cssVar('primaryColor') },
  },
});

export const newTodoConfirm = style({
  height: 28,
  padding: '0 12px',
  borderRadius: 5,
  border: 'none',
  background: cssVar('primaryColor'),
  color: cssVar('pureWhite'),
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  selectors: {
    '&:hover': { opacity: 0.88 },
  },
});

export const newTodoCancel = style({
  height: 28,
  padding: '0 10px',
  borderRadius: 5,
  border: `1px solid ${cssVar('borderColor')}`,
  background: 'transparent',
  color: cssVar('textSecondaryColor'),
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      color: cssVarV2('text/primary'),
      borderColor: cssVar('textPrimaryColor'),
    },
  },
});

export const body = style({
  width: '100%',
  height: '100%',
  padding: '0 16px 24px',
  boxSizing: 'border-box',
  overflow: 'auto',
});

export const tableWrapper = style({
  minWidth: 640,
});

export const table = style({
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
});

export const th = style({
  position: 'sticky',
  top: 0,
  padding: '10px 12px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  background: cssVarV2('layer/background/primary'),
  borderBottom: `1px solid ${cssVar('borderColor')}`,
  zIndex: 1,
  selectors: {
    '&:first-child': { width: '28%' },
    '&:nth-child(2)': { width: '16%' },
    '&:nth-child(3)': { width: '13%' },
    '&:nth-child(4)': { width: '14%' },
    '&:last-child': { width: 'auto' },
  },
});

export const todoRow = style({
  selectors: {
    '&:hover': {
      background: cssVarV2('layer/background/hoverOverlay'),
    },
  },
});

globalStyle(`${todoRow}:not(:last-child) td`, {
  borderBottom: `1px solid ${cssVar('borderColor')}`,
});

export const todoCell = style({
  padding: '8px 12px',
  verticalAlign: 'top',
});

export const statusCell = style({
  padding: '8px 12px',
  verticalAlign: 'top',
});

export const priorityCell = style({
  padding: '8px 12px',
  verticalAlign: 'top',
});

export const deadlineCell = style({
  padding: '8px 12px',
  verticalAlign: 'top',
});

export const notesCell = style({
  padding: '8px 12px',
  verticalAlign: 'top',
});

// ── Task list cell ──────────────────────────────────────────────────────────

export const taskListCell = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});

export const dateLink = style({
  display: 'inline-block',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: 0,
  marginBottom: 2,
  fontSize: 11,
  fontWeight: 500,
  color: cssVar('textSecondaryColor'),
  cursor: 'pointer',
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  selectors: {
    '&:hover': {
      color: cssVar('primaryColor'),
      textDecoration: 'underline',
    },
  },
});

export const taskList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
});

export const taskItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: 6,
});

export const taskCheckbox = style({
  flexShrink: 0,
  width: 14,
  height: 14,
  margin: 0,
  cursor: 'pointer',
  accentColor: cssVar('primaryColor'),
});

export const taskText = style({
  fontSize: 13,
  lineHeight: 1.5,
  color: cssVarV2('text/primary'),
  selectors: {
    '&[data-checked="true"]': {
      textDecoration: 'line-through',
      color: cssVar('textSecondaryColor'),
    },
  },
});

export const taskEmpty = style({
  fontSize: 12,
  color: cssVar('placeholderColor'),
  fontStyle: 'italic',
});

export const todoLink = style({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  padding: 0,
  fontSize: 13,
  fontWeight: 500,
  color: cssVarV2('text/primary'),
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover': {
      color: cssVar('primaryColor'),
      textDecoration: 'underline',
    },
  },
});

// Base style for both selects
const selectBase = style({
  appearance: 'none',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 5,
  padding: '3px 22px 3px 8px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 6px center',
  backgroundSize: '10px',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const select = selectBase;

export const statusSelect = style([
  selectBase,
  {
    selectors: {
      '&[data-status=""]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: cssVarV2('layer/background/secondary'),
        color: cssVar('textSecondaryColor'),
        borderColor: cssVar('borderColor'),
      },
      '&[data-status="in-progress"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231d6fca' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(59,130,246,0.10)',
        color: '#1d6fca',
        borderColor: 'rgba(59,130,246,0.35)',
      },
      '&[data-status="blocked"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23c0392b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(239,68,68,0.10)',
        color: '#c0392b',
        borderColor: 'rgba(239,68,68,0.35)',
      },
      '&[data-status="under-review"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23b45309' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(245,158,11,0.10)',
        color: '#b45309',
        borderColor: 'rgba(245,158,11,0.35)',
      },
      '&[data-status="completed"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23166534' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(34,197,94,0.10)',
        color: '#166534',
        borderColor: 'rgba(34,197,94,0.35)',
      },
    },
  },
]);

export const prioritySelect = style([
  selectBase,
  {
    selectors: {
      '&[data-priority=""]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: cssVarV2('layer/background/secondary'),
        color: cssVar('textSecondaryColor'),
        borderColor: cssVar('borderColor'),
      },
      '&[data-priority="high"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23c0392b' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(239,68,68,0.10)',
        color: '#c0392b',
        borderColor: 'rgba(239,68,68,0.35)',
      },
      '&[data-priority="medium"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23b45309' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(245,158,11,0.10)',
        color: '#b45309',
        borderColor: 'rgba(245,158,11,0.35)',
      },
      '&[data-priority="low"]': {
        background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%231d6fca' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 6px center`,
        backgroundColor: 'rgba(59,130,246,0.10)',
        color: '#1d6fca',
        borderColor: 'rgba(59,130,246,0.35)',
      },
    },
  },
]);

export const dateInput = style({
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 5,
  padding: '3px 8px',
  fontSize: 12,
  color: cssVarV2('text/primary'),
  background: 'transparent',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
    '&::-webkit-calendar-picker-indicator': {
      opacity: 0.5,
      cursor: 'pointer',
    },
  },
});

export const notesInput = style({
  border: `1px solid transparent`,
  borderRadius: 5,
  padding: '3px 8px',
  fontSize: 12,
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
    '&:hover': {
      borderColor: cssVar('borderColor'),
    },
    '&:focus': {
      borderColor: cssVar('primaryColor'),
      background: cssVarV2('layer/background/secondary'),
    },
  },
});

export const empty = style({
  padding: '48px 0',
  textAlign: 'center',
  fontSize: 14,
  color: cssVar('textSecondaryColor'),
});
