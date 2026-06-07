import { cssVar } from '@toeverything/theme';
import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style, styleVariants } from '@vanilla-extract/css';

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
  position: 'relative', // needed for the absolute-positioned flip-book toggle
});

/** Floating book icon that sits in the top-right corner of the journal panel. */
export const flipBookToggleBtn = style({
  position: 'absolute',
  top: 8,
  right: 8,
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px 3px 6px',
  borderRadius: 6,
  border: `1px solid ${cssVar('borderColor')}`,
  background: cssVarV2('layer/background/primary'),
  color: cssVar('iconColor'),
  fontSize: 11,
  fontWeight: 500,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  selectors: {
    '&:hover': {
      background: cssVar('primaryColor'),
      borderColor: cssVar('primaryColor'),
      color: cssVar('pureWhite'),
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    },
  },
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

/**
 * Inline (in-panel) variant: rendered directly inside the sidebar journal
 * panel below the tab icons, instead of a fixed full-viewport overlay.
 */
export const fullCalendarInline = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  // stretch to fill the whole panel height; week rows share it evenly
  flex: '1 1 auto',
  minHeight: 0,
  boxSizing: 'border-box',
  outline: 'none',
  padding: '0 4px 8px',
});

globalStyle(`${fullCalendarInline} ${fullCalendarTitle}`, {
  fontSize: 16,
  lineHeight: '24px',
});

globalStyle(`${fullCalendarInline} ${fullCalendarWeekRow}`, {
  minHeight: 72,
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

export const meetingDropdownContent = style({
  minWidth: 220,
  padding: '4px 0',
});

export const meetingRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 2,
  padding: '2px 4px',
});

export const meetingNavBtn = style({
  flex: 1,
  textAlign: 'left',
  padding: '5px 8px',
  borderRadius: 4,
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  background: 'transparent',
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    '&:hover': {
      background: cssVar('hoverColor'),
    },
  },
});

export const meetingRenameRow = style({
  padding: '4px 12px',
});

export const meetingRenameInput = style({
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${cssVar('borderColor')}`,
  borderRadius: 4,
  padding: '3px 8px',
  fontSize: cssVar('fontSm'),
  color: cssVar('textPrimaryColor'),
  background: 'transparent',
  outline: 'none',
  selectors: {
    '&:focus': {
      borderColor: cssVar('primaryColor'),
    },
  },
});

export const fullCalendarAgendaMore = style({
  fontSize: 11,
  lineHeight: '16px',
  color: cssVar('textSecondaryColor'),
  padding: '1px 4px',
});

// ── 3-D Flip Book ──────────────────────────────────────────────────────────
//
// Transform is driven by inline style (drag angle) + CSS transition for
// snap-back / completion. No keyframe animations — the drag interaction
// updates rotateY in real time via React state.

const flipBookPaperColor = '#faf7ef';
// Text is hardcoded (not CSS vars) because the paper is always light.
const flipBookTextPrimary = '#2c2820';
const flipBookTextMuted = '#7a7060';

export const flipBookOverlay = style({
  width: '100%',
  flex: '1 1 auto',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  padding: '8px 8px 12px',
  boxSizing: 'border-box',
});

export const flipBookHeader = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 4px',
  height: 36,
  marginBottom: 8,
});

export const flipBookTitle = style({
  fontSize: 13,
  fontWeight: 600,
  color: cssVarV2.text.primary,
  letterSpacing: '0.2px',
});

export const flipBookBody = style({
  position: 'relative',
  flex: '1 1 auto',
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  // padding gives room for the 3-D rotateX tilt to breathe without clipping
  padding: '12px 10px',
  // let the transformed book overflow the flex area visually
  overflow: 'visible',
  // size container so the book can scale to the available height via cqh
  // units while keeping its aspect ratio
  containerType: 'size',
});

/**
 * Outer wrapper for the book spread + bottom edge.  Owns the sizing and the
 * slight 3-D tilt so that both the pages and the bottom-face element rotate
 * as a unit. The drop-shadow lives here so it covers both elements.
 */
export const flipBookBookWrap = style({
  position: 'relative',
  flexShrink: 0,
  // Leave room on all sides so the 3-D tilt and drop-shadow are never clipped.
  // Height budget: 100cqh minus header(44) nav(48) body-padding(24) gap(14) = ~70px
  width: ['86%', 'min(88%, calc((100cqh - 130px) * 16 / 11))'],
  // tilt the book toward the viewer, like resting on a table
  transform: 'perspective(1200px) rotateX(-5deg)',
  transformOrigin: 'center bottom',
  filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.28))',
});

/**
 * The book spread container. Uses CSS perspective so that the flip element
 * has a realistic 3-D turn effect.
 *
 * Layout:
 *   [left page (50%)] [spine (4px)] [right page (50%)]
 *
 * The flip element is absolutely positioned and covers either the left or
 * right half depending on the direction.
 */
export const flipBookContainer = style({
  position: 'relative',
  zIndex: 1,
  width: '100%',
  aspectRatio: '16 / 11',
  display: 'flex',
  flexDirection: 'row',
  perspective: '1200px',
  userSelect: 'none',
  // Base font for all page content — scales with container width,
  // clamped so text stays readable at very small or very large sizes.
  fontSize: 'clamp(11px, 3.8cqi, 16px)',
});

/**
 * The visible bottom edge of the book — simulates the stacked page ends.
 * Absolutely positioned just below the container so it shares the wrap's
 * rotateX tilt and appears as a genuine bottom face.
 */
export const flipBookBottomEdge = style({
  position: 'absolute',
  zIndex: 0,
  left: 0,
  right: 0,
  top: 'calc(100% - 1px)',
  height: 16,
  borderRadius: '0 0 4px 4px',
  // Warm page-stack gradient: lighter at top (visible edge), deeper at bottom
  background: `linear-gradient(to bottom, #e4dcc4 0%, #c8bc96 100%)`,
  // Subtle horizontal lines suggesting individual page edges
  backgroundImage: `
    repeating-linear-gradient(
      to bottom,
      transparent 0px, transparent 1.5px,
      rgba(0,0,0,0.04) 1.5px, rgba(0,0,0,0.04) 2px
    ),
    linear-gradient(to bottom, #e4dcc4 0%, #c8bc96 100%)
  `,
  // Spine shadow at center to hint at the book binding
  selectors: {
    '&::after': {
      content: '""',
      position: 'absolute',
      left: 'calc(50% - 2px)',
      width: 4,
      top: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.12)',
    },
  },
});

export const flipBookStaticPage = style({
  flex: '1 1 0',
  minWidth: 0,
  height: '100%',
  overflow: 'hidden',
  background: flipBookPaperColor,
  position: 'relative',
});

export const flipBookStaticLeft = style({
  borderRadius: '4px 0 0 4px',
  boxShadow: '-2px 0 6px rgba(0,0,0,0.06) inset',
});

export const flipBookStaticRight = style({
  borderRadius: '0 4px 4px 0',
  boxShadow: '2px 0 6px rgba(0,0,0,0.06) inset',
});

export const flipBookPageClickable = style({
  cursor: 'pointer',
  selectors: {
    '&:hover::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: 'rgba(0,0,0,0.03)',
      pointerEvents: 'none',
    },
  },
});

export const flipBookSpine = style({
  flexShrink: 0,
  width: 4,
  height: '100%',
  background: `linear-gradient(to right, rgba(0,0,0,0.18), rgba(0,0,0,0.04) 40%, rgba(0,0,0,0.04) 60%, rgba(0,0,0,0.18))`,
  zIndex: 2,
  position: 'relative',
});

/**
 * Base for the flip element. Uses CSS animation (@keyframes) so the turn
 * starts immediately on mount — no two-step state trick needed.
 */
export const flipBookFlipEl = style({
  position: 'absolute',
  top: 0,
  height: '100%',
  width: 'calc(50% - 2px)',
  transformStyle: 'preserve-3d',
  zIndex: 5,
});

/** Forward flip: right page turns left → next journal day. Pivot = book spine. */
export const flipBookFlipElForward = style({
  left: 'calc(50% + 2px)',
  transformOrigin: 'left center',
});

/** Backward flip: left page turns right → previous journal day. Pivot = book spine. */
export const flipBookFlipElBackward = style({
  left: 0,
  transformOrigin: 'right center',
});

/** Front face of the flip element (visible at the start of the turn). */
export const flipBookFlipFront = style({
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  background: flipBookPaperColor,
  overflow: 'hidden',
});

/** Back face of the flip element (visible when fully turned). */
export const flipBookFlipBack = style({
  position: 'absolute',
  inset: 0,
  backfaceVisibility: 'hidden',
  background: flipBookPaperColor,
  overflow: 'hidden',
  transform: 'rotateY(180deg)',
});

// ── Page inner content ─────────────────────────────────────────────────────

export const flipBookPageInner = style({
  width: '100%',
  height: '100%',
  padding: '10px 10px 8px',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
});

export const flipBookPageDateBadge = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
});

export const flipBookPageDayNum = style({
  fontSize: '3.1em',
  fontWeight: 700,
  lineHeight: 1,
  color: flipBookTextPrimary,
  fontVariantNumeric: 'tabular-nums',
  minWidth: 42,
  textAlign: 'center',
  flexShrink: 0,
});

export const flipBookPageDateMeta = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 1,
});

export const flipBookPageMonthYear = style({
  fontSize: '1em',
  fontWeight: 600,
  color: flipBookTextMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  lineHeight: 1.3,
});

export const flipBookPageWeekday = style({
  fontSize: '1em',
  color: flipBookTextMuted,
  lineHeight: 1.3,
});

export const flipBookPageDivider = style({
  flexShrink: 0,
  height: 1,
  background: cssVar('borderColor'),
  marginBottom: 6,
  // Cover lines that would otherwise show at this row
  position: 'relative',
  zIndex: 1,
  backgroundColor: cssVar('borderColor'),
});

export const flipBookPageText = style({
  flex: '1 1 auto',
  fontSize: '1em',
  lineHeight: 1.6,
  color: flipBookTextPrimary,
  overflow: 'hidden',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
});

export const flipBookPageTextarea = style({
  flex: '1 1 auto',
  width: '100%',
  resize: 'none',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '1em',
  lineHeight: 1.6,
  color: flipBookTextPrimary,
  fontFamily: 'inherit',
  padding: 0,
  overflow: 'hidden',
  wordBreak: 'break-word',
  selectors: {
    '&::placeholder': {
      color: flipBookTextMuted,
      fontStyle: 'italic',
    },
  },
});

export const flipBookPageEmpty = style({
  color: flipBookTextMuted,
  fontStyle: 'italic',
  fontSize: '1em',
  lineHeight: 1.6,
});

export const flipBookPageSections = style({
  flex: '1 1 auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  overflow: 'hidden',
});

export const flipBookSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  flex: '1 1 0',
  minHeight: 0,
});

export const flipBookSectionLabel = style({
  fontSize: '1em',
  fontWeight: 600,
  color: flipBookTextMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  lineHeight: 1.5,
  paddingLeft: 5,
  borderLeft: '2.5px solid transparent',
  selectors: {
    '&[data-section="journal"]': {
      borderLeftColor: cssVarV2.calendar.blue,
      color: cssVarV2.calendar.blue,
    },
    '&[data-section="task"]': {
      borderLeftColor: cssVarV2.calendar.teal,
      color: cssVarV2.calendar.teal,
    },
    '&[data-section="meeting"]': {
      borderLeftColor: cssVarV2.calendar.purple,
      color: cssVarV2.calendar.purple,
    },
  },
});

export const flipBookSectionHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0,
});

export const flipBookSectionAddBtn = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.4em',
  height: '1.4em',
  border: 'none',
  borderRadius: '3px',
  background: 'transparent',
  color: flipBookTextMuted,
  fontSize: '1em',
  lineHeight: 1,
  cursor: 'pointer',
  padding: 0,
  selectors: {
    '&:hover': {
      background: 'rgba(0,0,0,0.07)',
      color: flipBookTextPrimary,
    },
  },
});

export const flipBookList = style({
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
});

export const flipBookListItem = style({
  fontSize: '1em',
  lineHeight: 1.6,
  color: flipBookTextPrimary,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  selectors: {
    '&::before': {
      content: '"• "',
      color: flipBookTextMuted,
    },
  },
});

/** Textarea used inside each right-page section (tasks / meeting notes). */
export const flipBookSectionTextarea = style({
  flex: '1 1 0',
  minHeight: 0,
  width: '100%',
  resize: 'none',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '1em',
  lineHeight: 1.6,
  color: flipBookTextPrimary,
  fontFamily: 'inherit',
  padding: 0,
  overflow: 'auto',
  selectors: {
    '&::placeholder': {
      color: flipBookTextMuted,
      fontStyle: 'italic',
    },
  },
});

/** Container for all meeting items on the right page. */
export const flipBookMeetingList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  flex: '1 1 0',
  minHeight: 0,
  overflow: 'auto',
});

/** One meeting: editable name on top, notes textarea below. */
export const flipBookMeetingItem = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minHeight: 0,
});

/** Inline input for the meeting name (the part after "Meeting · "). */
export const flipBookMeetingNameInput = style({
  width: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '1em',
  fontWeight: 600,
  lineHeight: 1.4,
  color: flipBookTextMuted,
  fontFamily: 'inherit',
  padding: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  selectors: {
    '&::placeholder': {
      color: flipBookTextMuted,
    },
  },
});

// ── Per-page sketch layer ──────────────────────────────────────────────────

/** Transparent canvas sitting behind all page content. */
export const flipBookPageCanvas = style({
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  pointerEvents: 'none',
  display: 'block',
});

/** Transparent div that captures draw events when sketch mode is active. */
export const flipBookPageDrawLayer = style({
  position: 'absolute',
  inset: 0,
  zIndex: 2,
  cursor: 'crosshair',
  touchAction: 'none',
});

/** Pen icon button: top-right corner of each page, always above draw layer. */
export const flipBookPenBtn = style({
  position: 'absolute',
  top: 6,
  right: 6,
  zIndex: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 20,
  height: 20,
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: flipBookTextMuted,
  cursor: 'pointer',
  padding: 0,
  opacity: 0.35,
  transition: 'opacity 0.15s, background 0.15s, color 0.15s',
  selectors: {
    [`${flipBookStaticPage}:hover &`]: {
      opacity: 0.7,
    },
    '&:hover': {
      opacity: 1,
      background: 'rgba(0,0,0,0.07)',
      color: flipBookTextPrimary,
    },
    '&[data-active="true"]': {
      opacity: 1,
      background: 'rgba(0,0,0,0.1)',
      color: flipBookTextPrimary,
    },
  },
});

/** Multi-row floating toolbar at the bottom of the page while drawing. */
export const flipBookPageSketchBar = style({
  position: 'absolute',
  bottom: 6,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '5px 7px',
  borderRadius: 8,
  background: 'rgba(250, 247, 239, 0.96)',
  border: '1px solid rgba(0,0,0,0.1)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.16)',
  backdropFilter: 'blur(4px)',
  maxWidth: 'calc(100% - 12px)',
});

/** A single horizontal row inside the toolbar. */
export const flipBookPageSketchRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
});

/** A tightly-grouped cluster of buttons within a row. */
export const flipBookPageSketchGroup = style({
  display: 'flex',
  alignItems: 'center',
  gap: 1,
});

/** 2-row × 8-column colour grid. */
export const flipBookPageSketchColorGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(8, 11px)',
  gap: 2,
});

export const flipBookPageSketchSwatch = style({
  flexShrink: 0,
  width: 11,
  height: 11,
  borderRadius: '50%',
  border: '1px solid rgba(0,0,0,0.15)',
  cursor: 'pointer',
  padding: 0,
  selectors: {
    '&[data-active="true"]': {
      outline: '1.5px solid #2c2820',
      outlineOffset: 1,
    },
  },
});

export const flipBookPageSketchDivider = style({
  flexShrink: 0,
  width: 1,
  height: 11,
  background: 'rgba(0,0,0,0.14)',
  margin: '0 1px',
});

/** Pattern-type selector button (pen / pencil / marker / fountain). */
export const flipBookPageSketchPatternBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: flipBookTextMuted,
  cursor: 'pointer',
  padding: 0,
  selectors: {
    '&:hover': {
      background: 'rgba(0,0,0,0.09)',
      color: flipBookTextPrimary,
    },
    '&[data-active="true"]': {
      background: 'rgba(0,0,0,0.13)',
      color: flipBookTextPrimary,
    },
  },
});

/** Size-preset button — contains a dot or block. */
export const flipBookPageSketchSizeBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: flipBookTextMuted,
  cursor: 'pointer',
  padding: 0,
  selectors: {
    '&:hover': { background: 'rgba(0,0,0,0.09)' },
    '&[data-active="true"]': {
      background: 'rgba(0,0,0,0.13)',
      color: flipBookTextPrimary,
    },
  },
});

/** Circle dot inside a pen-size button. */
export const flipBookPageSketchSizeDot = style({
  display: 'block',
  flexShrink: 0,
  borderRadius: '50%',
  background: 'currentColor',
});

/** Rounded-square inside an eraser-size button. */
export const flipBookPageSketchSizeBlock = style({
  display: 'block',
  flexShrink: 0,
  borderRadius: 2,
  background: 'currentColor',
  opacity: 0.55,
});

/** Drag grip row — sits at the top of the toolbar. */
export const flipBookPageSketchGrip = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'grab',
  padding: '0 1px',
  userSelect: 'none',
  color: 'rgba(0,0,0,0.3)',
  selectors: {
    '&:active': { cursor: 'grabbing' },
  },
});

/** Collapse / expand button inside the grip row. */
export const flipBookPageSketchCollapseBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  borderRadius: 2,
  border: 'none',
  background: 'transparent',
  color: flipBookTextMuted,
  fontSize: 12,
  lineHeight: '1',
  cursor: 'pointer',
  padding: 0,
  fontWeight: 400,
  selectors: {
    '&:hover': {
      background: 'rgba(0,0,0,0.09)',
      color: flipBookTextPrimary,
    },
  },
});

export const flipBookPageSketchBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 18,
  height: 18,
  borderRadius: 3,
  border: 'none',
  background: 'transparent',
  color: flipBookTextMuted,
  fontSize: 10,
  cursor: 'pointer',
  padding: 0,
  selectors: {
    '&:hover': {
      background: 'rgba(0,0,0,0.09)',
      color: flipBookTextPrimary,
    },
    '&[data-active="true"]': {
      background: 'rgba(0,0,0,0.13)',
      color: flipBookTextPrimary,
      fontWeight: 700,
    },
  },
});

// ── Navigation ─────────────────────────────────────────────────────────────

export const flipBookNavRow = style({
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: 340,
  padding: '0 2px',
});

export const flipBookNavBtn = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: '50%',
  border: `1px solid ${cssVar('borderColor')}`,
  background: 'transparent',
  color: cssVar('iconColor'),
  cursor: 'pointer',
  transition: 'all 0.15s',
  flexShrink: 0,
  selectors: {
    '&:hover:not(:disabled)': {
      background: cssVar('primaryColor'),
      borderColor: cssVar('primaryColor'),
      color: cssVar('pureWhite'),
    },
    '&:disabled': {
      opacity: 0.35,
      cursor: 'not-allowed',
    },
  },
});

export const flipBookDateLabel = style({
  fontSize: 12,
  fontWeight: 500,
  color: cssVarV2.text.secondary,
  userSelect: 'none',
});
