import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { style, styleVariants } from '@vanilla-extract/css';

const interactive = style({
  position: 'relative',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: cssVar('hoverColor'),
    },
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      opacity: 0,
      borderRadius: 'inherit',
      boxShadow: `0 0 0 3px ${cssVar('primaryColor')}`,
      pointerEvents: 'none',
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      boxShadow: `0 0 0 0px ${cssVar('primaryColor')}`,
      pointerEvents: 'none',
    },
    '&:focus-visible::before': {
      opacity: 0.2,
    },
    '&:focus-visible::after': {
      boxShadow: `0 0 0 1px ${cssVar('primaryColor')}`,
    },
  },
});
export const calendar = style({
  position: 'relative',
  padding: '16px',
  paddingBottom: 0,
  marginBottom: 10,
  selectors: {
    '&[data-mobile=true]': {
      padding: '8px 16px',
      marginBottom: 0,
    },
  },
});
export const calendarActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  height: 24,
  marginBottom: 4,
});

export const calendarExpandButton = style({
  color: cssVar('iconColor'),
});

export const calendarExpandedOverlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  width: '100vw',
  height: '100vh',
  padding: '18px 22px 22px',
  boxSizing: 'border-box',
  background: cssVarV2('layer/background/primary'),
});

export const calendarExpandedHeader = style({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 40,
  marginBottom: 12,
});

export const calendarExpandedTitle = style({
  fontSize: 20,
  fontWeight: 600,
  lineHeight: '28px',
  color: cssVarV2.text.primary,
});

export const calendarExpandedBody = style({
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'auto',
});

export const journalPanel = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  overflow: 'hidden',
});
export const dailyCount = style({
  height: 0,
  flexGrow: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});
export const dailyCountHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 16px',
  gap: 8,
});
export const dailyCountNav = style([
  interactive,
  {
    height: 28,
    width: 0,
    flex: 1,
    fontWeight: 500,
    fontSize: 14,
    padding: '4px 8px',
    whiteSpace: 'nowrap',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: cssVar('textSecondaryColor'),
    transition: 'all .3s',
    selectors: {
      '&[aria-selected="true"]': {
        backgroundColor: cssVar('backgroundTertiaryColor'),
        color: cssVar('textPrimaryColor'),
      },
    },
  },
]);
export const dailyCountContainer = style({
  height: 0,
  flexGrow: 1,
  display: 'flex',
  width: `calc(var(--item-count) * 100%)`,
  transition: 'transform .15s ease',
  transform:
    'translateX(calc(var(--active-index) * 100% / var(--item-count) * -1))',
});
export const dailyCountItem = style({
  width: 'calc(100% / var(--item-count))',
  height: '100%',
});
export const dailyCountContent = style({
  padding: '8px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
});
export const dailyCountEmpty = style({
  width: '100%',
  height: '100%',
  maxHeight: 220,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '24px',
  fontSize: 15,
  color: cssVar('textSecondaryColor'),
  textAlign: 'center',
  padding: '0 70px',
  fontWeight: 400,
});

// page item
export const pageItem = style([
  interactive,
  {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
    padding: '0 4px',
    gap: 8,
    height: 30,
    selectors: {
      '&[aria-selected="true"]': {
        backgroundColor: cssVar('hoverColor'),
      },
    },
  },
]);
export const pageItemIcon = style({
  width: 20,
  height: 20,
  color: cssVar('iconColor'),
});
export const pageItemShareBtn = style({
  opacity: 0,
  transition: 'opacity 0.15s',
  flexShrink: 0,
  color: cssVar('iconColor'),
  selectors: {
    [`${pageItem}:hover &`]: {
      opacity: 1,
    },
  },
});

// share day popover
export const shareDayBtn = style({
  flexShrink: 0,
  color: cssVar('iconColor'),
});
export const shareDayMenuContent = style({
  width: 300,
  padding: 16,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
});
export const shareDayTitle = style({
  fontSize: cssVar('fontSm'),
  fontWeight: 600,
  color: cssVar('textPrimaryColor'),
});
export const shareDaySearchArea = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4,
  padding: '6px 10px',
  border: `1px solid ${cssVarV2('input/border/default')}`,
  borderRadius: 8,
  minHeight: 36,
  alignItems: 'center',
  selectors: {
    '&:focus-within': {
      borderColor: cssVar('primaryColor'),
    },
  },
});
export const shareDayInput = style({
  flex: 1,
  minWidth: 80,
  border: 'none',
  outline: 'none',
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  background: 'transparent',
  selectors: {
    '&::placeholder': {
      color: cssVar('textSecondaryColor'),
    },
  },
});
export const shareDayChip = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 6px 2px 8px',
  borderRadius: 100,
  background: cssVarV2('layer/background/hoverOverlay'),
  fontSize: cssVar('fontXs'),
  color: cssVar('textPrimaryColor'),
  whiteSpace: 'nowrap',
});
export const shareDayChipRemove = style({
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1,
  color: cssVar('textSecondaryColor'),
  selectors: {
    '&:hover': {
      color: cssVar('textPrimaryColor'),
    },
  },
});
export const shareDayResults = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  maxHeight: 180,
  overflowY: 'auto',
});
export const shareDayResult = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '6px 10px',
  borderRadius: 6,
  cursor: 'pointer',
  textAlign: 'left',
  background: 'transparent',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});
export const shareDayResultName = style({
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  fontWeight: 500,
});
export const shareDayResultEmail = style({
  fontSize: cssVar('fontXs'),
  color: cssVar('textSecondaryColor'),
});
export const shareDayRoleRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: cssVar('fontSm'),
  color: cssVar('textSecondaryColor'),
});
export const shareDayRoleBtn = style({
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  cursor: 'pointer',
  padding: '2px 8px',
  borderRadius: 4,
  background: 'transparent',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});
export const shareDaySubmit = style({
  width: '100%',
  padding: '8px',
  borderRadius: 8,
  fontSize: cssVar('fontSm'),
  fontWeight: 500,
  cursor: 'pointer',
  background: cssVar('primaryColor'),
  color: 'white',
  selectors: {
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    '&:not(:disabled):hover': {
      opacity: 0.9,
    },
  },
});

export const pageItemLabel = style({
  width: 0,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: 500,
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  textAlign: 'left',
  selectors: {
    '[aria-selected="true"] &': {
      // TODO(@catsjuice): wait for design
      color: cssVar('primaryColor'),
    },
  },
  display: 'flex',
  gap: 6,
  alignItems: 'center',
});

// conflict
export const journalConflictBlock = style({
  padding: '0 16px 16px 16px',
});
export const journalConflictWrapper = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
  rowGap: 4,
  columnGap: 8,
});
export const journalConflictMoreTrigger = style([
  interactive,
  {
    color: cssVar('textSecondaryColor'),
    height: 30,
    borderRadius: 4,
    padding: '0px 8px',
    fontSize: cssVar('fontSm'),
    display: 'flex',
    alignItems: 'center',
  },
]);
export const duplicateTag = style({
  padding: '0 8px',
  border: `1px solid ${cssVarV2('database/border')}`,
  background: cssVarV2('layer/background/error'),
  color: cssVarV2('toast/iconState/error'),
  borderRadius: 4,
  fontSize: cssVar('fontXs'),
  lineHeight: '20px',
  fontWeight: 400,
});

// customize date-picker cell
export const journalDateCell = style([
  interactive,
  {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    fontSize: cssVar('fontSm'),
    color: cssVar('textPrimaryColor'),
    fontWeight: 400,
    position: 'relative',

    selectors: {
      '&[data-is-today="true"]': {
        fontWeight: 600,
        color: cssVar('brandColor'),
      },
      '&[data-not-current-month="true"]': {
        color: cssVar('black10'),
      },
      '&[data-selected="true"]': {
        backgroundColor: cssVar('brandColor'),
        fontWeight: 500,
        color: cssVar('pureWhite'),
      },
      '&[data-is-journal="false"][data-selected="true"]': {
        backgroundColor: 'transparent',
        color: 'var(--affine-text-primary-color)',
        fontWeight: 500,
        border: `1px solid ${cssVar('primaryColor')}`,
      },

      '&[data-mobile=true]': {
        width: 34,
        height: 34,
        fontSize: 15,
        fontWeight: 400,
      },
      '&[data-expanded=true]': {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        gap: 6,
        padding: 8,
        borderRadius: 0,
        overflow: 'hidden',
        fontSize: 13,
        lineHeight: '18px',
        textAlign: 'left',
      },
      '&[data-expanded=true][data-selected=true]': {
        backgroundColor: 'transparent',
        color: cssVarV2.text.primary,
        boxShadow: `inset 0 0 0 1px ${cssVar('brandColor')}`,
      },
      '&[data-expanded=true][data-is-today=true]': {
        color: cssVar('brandColor'),
      },
    },
  },
]);
export const journalDateCellLabel = style({
  flex: '0 0 auto',
});

export const journalDateCellAgenda = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  width: '100%',
  minHeight: 0,
  overflow: 'hidden',
});

export const journalDateCellAgendaItem = style({
  display: 'block',
  width: '100%',
  minHeight: 18,
  padding: '1px 5px',
  borderLeft: '3px solid transparent',
  borderRadius: 4,
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: '16px',
  color: cssVarV2.text.primary,
  background: cssVarV2.layer.background.hoverOverlay,
  textAlign: 'left',
  selectors: {
    '&[data-type="journal"]': {
      borderLeftColor: cssVarV2.calendar.blue,
      fontWeight: 500,
    },
    '&[data-type="todo"]': {
      borderLeftColor: cssVarV2.calendar.teal,
      fontWeight: 500,
    },
    '&[data-type="meeting"]': {
      borderLeftColor: cssVarV2.calendar.purple,
      fontWeight: 500,
    },
  },
});

export const journalDateCellAgendaMore = style({
  display: 'block',
  width: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: '16px',
  color: cssVarV2.text.secondary,
  textAlign: 'left',
});

export const journalDateCellDotContainer = style({
  display: 'flex',
  gap: 4,
  justifyContent: 'center',
  marginTop: 4,
});
export const journalDateCellDot = style({
  width: 4,
  height: 4,
  borderRadius: '50%',
});
export const journalDateCellDotType = styleVariants({
  journal: {
    backgroundColor: cssVarV2.calendar.blue,
  },
  event: {
    backgroundColor: cssVarV2.calendar.green,
  },
  activity: {
    backgroundColor: cssVarV2.calendar.red,
  },
});

// ── Full-page Google-Calendar-like monthly view ────────────────────────────

export const fullCalendarOverlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  background: cssVarV2('layer/background/primary'),
  padding: '18px 24px 0',
  boxSizing: 'border-box',
  outline: 'none',
});

export const fullCalendarHeader = style({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingBottom: 12,
});

export const fullCalendarTitle = style({
  fontSize: 22,
  fontWeight: 600,
  lineHeight: '28px',
  color: cssVarV2.text.primary,
});

export const fullCalendarHeaderActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
});

export const fullCalendarTodayBtn = style({
  height: 28,
  padding: '0 12px',
  borderRadius: 6,
  border: `1px solid ${cssVar('borderColor')}`,
  background: 'transparent',
  color: cssVar('textPrimaryColor'),
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});

export const fullCalendarWeekdayRow = style({
  flex: '0 0 auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  borderTop: `1px solid ${cssVar('borderColor')}`,
  borderLeft: `1px solid ${cssVar('borderColor')}`,
});

export const fullCalendarWeekdayHeader = style({
  padding: '6px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: cssVar('textSecondaryColor'),
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderRight: `1px solid ${cssVar('borderColor')}`,
});

export const fullCalendarBody = style({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'auto',
  borderLeft: `1px solid ${cssVar('borderColor')}`,
});

export const fullCalendarWeekRow = style({
  flex: '1 1 0',
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  minHeight: 100,
  borderBottom: `1px solid ${cssVar('borderColor')}`,
});

export const fullCalendarDayCell = style([
  interactive,
  {
    display: 'flex',
    flexDirection: 'column',
    padding: '6px 8px',
    borderRight: `1px solid ${cssVar('borderColor')}`,
    overflow: 'hidden',
    cursor: 'pointer',
    textAlign: 'left',
    alignItems: 'stretch',
    borderRadius: 0,
    selectors: {
      '&[data-outside="true"]': {
        background: `color-mix(in srgb, ${cssVar('backgroundSecondaryColor')} 60%, transparent)`,
      },
      '&[data-today="true"]': {
        background: `color-mix(in srgb, ${cssVar('brandColor')} 6%, ${cssVarV2('layer/background/primary')})`,
      },
      '&[data-selected="true"]': {
        boxShadow: `inset 0 0 0 1.5px ${cssVar('brandColor')}`,
      },
      '&[data-outside="true"][data-selected="true"]': {
        boxShadow: `inset 0 0 0 1.5px ${cssVar('brandColor')}`,
      },
    },
  },
]);

export const fullCalendarDayCellHeader = style({
  flex: '0 0 auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 4,
  gap: 2,
});

export const fullCalendarAddBtn = style({
  opacity: 0,
  transition: 'opacity 0.15s',
  selectors: {
    [`${fullCalendarDayCell}:hover &`]: {
      opacity: 1,
    },
  },
});

export const fullCalendarDayNumber = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: '50%',
  fontSize: 13,
  fontWeight: 400,
  color: cssVar('textPrimaryColor'),
  flex: '0 0 auto',
  selectors: {
    '[data-outside="true"] &': {
      color: `color-mix(in srgb, ${cssVar('textSecondaryColor')} 50%, transparent)`,
    },
    '&[data-today="true"]': {
      background: cssVar('brandColor'),
      color: cssVar('pureWhite'),
      fontWeight: 600,
    },
  },
});

export const fullCalendarDayAgenda = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  flex: '1 1 auto',
  minHeight: 0,
  overflow: 'hidden',
});

export const fullCalendarAgendaItem = style({
  display: 'block',
  width: '100%',
  padding: '2px 5px',
  borderLeft: '3px solid transparent',
  borderRadius: 4,
  boxSizing: 'border-box',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
  lineHeight: '16px',
  color: cssVarV2.text.primary,
  background: cssVarV2.layer.background.hoverOverlay,
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: cssVarV2.layer.background.secondary,
    },
    '&[data-type="journal"]': {
      borderLeftColor: cssVarV2.calendar.blue,
      fontWeight: 500,
    },
    '&[data-type="todo"]': {
      borderLeftColor: cssVarV2.calendar.teal,
      fontWeight: 500,
    },
    '&[data-type="meeting"]': {
      borderLeftColor: cssVarV2.calendar.purple,
      fontWeight: 500,
    },
  },
});

export const fullCalendarAgendaMore = style({
  fontSize: 11,
  lineHeight: '16px',
  color: cssVar('textSecondaryColor'),
  padding: '1px 4px',
});
