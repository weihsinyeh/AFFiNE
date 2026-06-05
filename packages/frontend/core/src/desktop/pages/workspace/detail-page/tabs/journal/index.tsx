import type { DateCell } from '@affine/component';
import {
  DatePicker,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  Scrollable,
  useConfirmModal,
} from '@affine/component';
import { Guard } from '@affine/core/components/guard';
import { MoveToTrash } from '@affine/core/components/page-list';
import { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  type DocRecord,
  DocService,
  DocsService,
} from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { IntegrationService } from '@affine/core/modules/integration';
import { JournalService } from '@affine/core/modules/journal';
import {
  ViewService,
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import { Text } from '@blocksuite/affine/store';
import {
  ArrowLeftSmallIcon,
  ArrowRightSmallIcon,
  CalendarXmarkIcon,
  EditIcon,
  ExpandCloseIcon,
  ExpandFullIcon,
  PlusIcon,
} from '@blocksuite/icons/rc';
import {
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type {
  HTMLAttributes,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { CalendarEvents } from './calendar-events';
import * as styles from './journal.css';
import { JournalTemplateOnboarding } from './template-onboarding';
import { JournalTemplateSetting } from './template-setting';

/**
 * @internal
 */
const CountDisplay = ({
  count,
  max = 99,
  ...attrs
}: { count: number; max?: number } & HTMLAttributes<HTMLSpanElement>) => {
  return <span {...attrs}>{count > max ? `${max}+` : count}</span>;
};
interface PageItemProps extends Omit<
  HTMLAttributes<HTMLAnchorElement>,
  'onClick'
> {
  docId: string;
  right?: ReactNode;
  duplicate?: boolean;
}
const PageItem = ({
  docId,
  right,
  duplicate,
  className,
  ...attrs
}: PageItemProps) => {
  const i18n = useI18n();
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const Icon = useLiveData(docDisplayMetaService.icon$(docId));
  const title = useLiveData(docDisplayMetaService.title$(docId));

  return (
    <WorkbenchLink
      data-testid="journal-conflict-item"
      aria-label={title}
      to={`/${docId}`}
      className={clsx(className, styles.pageItem)}
      {...attrs}
    >
      <div className={styles.pageItemIcon}>
        <Icon width={20} height={20} />
      </div>
      <div className={styles.pageItemLabel}>
        {title}
        {duplicate ? (
          <div className={styles.duplicateTag}>
            {i18n['com.affine.page-properties.property.journal-duplicated']()}
          </div>
        ) : null}
      </div>
      {right}
    </WorkbenchLink>
  );
};

type NavItemName = 'createdToday' | 'updatedToday';
interface NavItem {
  name: NavItemName;
  label: string;
  count: number;
}
interface JournalBlockProps {
  date: dayjs.Dayjs;
}

type DateDotType = 'journal' | 'event' | 'activity';

const mobile = environment.isMobile;

interface JournalCalendarDateCellProps {
  cell: DateCell;
  dateKey: string;
  dotTypes: DateDotType[];
  expanded: boolean;
  hasJournal: boolean;
  isJournal: boolean;
}

const JournalCalendarDateCell = ({
  cell,
  dateKey,
  dotTypes,
  expanded,
  hasJournal,
  isJournal,
}: JournalCalendarDateCellProps) => {
  const t = useI18n();
  const calendar = useService(IntegrationService).calendar;
  const journalService = useService(JournalService);
  const events = useLiveData(
    useMemo(() => calendar.eventsByDate$(cell.date), [calendar, cell.date])
  );
  const journals = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateKey),
      [dateKey, journalService]
    )
  );
  const agendaLimit = hasJournal ? 3 : 4;
  const visibleEvents = events.slice(0, agendaLimit);
  const hiddenCount = events.length - visibleEvents.length;

  return (
    <button
      className={styles.journalDateCell}
      data-is-date-cell
      tabIndex={cell.focused ? 0 : -1}
      data-is-today={cell.isToday}
      data-not-current-month={cell.notCurrentMonth}
      data-selected={cell.selected}
      data-is-journal={isJournal}
      data-has-journal={hasJournal}
      data-expanded={expanded}
      data-mobile={mobile}
    >
      <span className={styles.journalDateCellLabel}>{cell.label}</span>
      {expanded ? (
        <span className={styles.journalDateCellAgenda}>
          {journals.length ? (
            <span
              className={styles.journalDateCellAgendaItem}
              data-type="journal"
            >
              {journals.length > 1 ? `${journals.length} Journals` : 'Journal'}
            </span>
          ) : null}
          {visibleEvents.map(event => (
            <span
              key={event.id}
              className={styles.journalDateCellAgendaItem}
              data-type="event"
              style={{
                borderLeftColor: event.calendarColor || cssVarV2.button.primary,
              }}
            >
              {event.title || t['Untitled']()}
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span
              className={styles.journalDateCellAgendaMore}
            >{`+${hiddenCount} more`}</span>
          ) : null}
        </span>
      ) : !cell.selected && dotTypes.length ? (
        <span className={styles.journalDateCellDotContainer}>
          {dotTypes.map(dotType => (
            <span
              key={dotType}
              className={clsx(
                styles.journalDateCellDot,
                styles.journalDateCellDotType[dotType]
              )}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
};

// ── Full-page Google-Calendar-style monthly view ─────────────────────────

interface FullCalendarDayCellProps {
  day: dayjs.Dayjs;
  isCurrentMonth: boolean;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
}

const FullCalendarDayCell = ({
  day,
  isCurrentMonth,
  isSelected,
  onSelect,
}: FullCalendarDayCellProps) => {
  const t = useI18n();
  const calendar = useService(IntegrationService).calendar;
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;
  const dateKey = day.format('YYYY-MM-DD');
  const isToday = day.isSame(dayjs(), 'day');

  const events = useLiveData(
    useMemo(() => calendar.eventsByDate$(day), [calendar, day])
  );
  const journals = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateKey),
      [dateKey, journalService]
    )
  );

  // Categorise journals for this day by title prefix so todo/meeting docs
  // (tagged with setJournalDate at creation) render as distinct tags.
  const { journalDocs, todoDocs, meetingDocs } = useMemo(() => {
    const journalDocs = [];
    const todoDocs = [];
    const meetingDocs = [];
    for (const doc of journals) {
      const title = doc.meta$.value.title || '';
      if (title.startsWith('Todo ·')) {
        todoDocs.push(doc);
      } else if (title.startsWith('Meeting ·')) {
        meetingDocs.push(doc);
      } else {
        journalDocs.push(doc);
      }
    }
    return { journalDocs, todoDocs, meetingDocs };
  }, [journals]);

  const tagCount =
    (journalDocs.length > 0 ? 1 : 0) +
    (todoDocs.length > 0 ? 1 : 0) +
    (meetingDocs.length > 0 ? 1 : 0);
  const maxEvents = Math.max(0, 4 - tagCount);
  const visibleEvents = events.slice(0, maxEvents);
  const hiddenCount = events.length - visibleEvents.length;

  const handleCreateDoc = useCallback(
    (type: 'todo' | 'meeting') => {
      const prefix = type === 'todo' ? 'Todo' : 'Meeting';
      const title = `${prefix} · ${day.format('MMM D, YYYY')}`;
      // createDoc sets the title synchronously, so setJournalDate (called below)
      // will see the correct title in journalsByDate$ immediately — no "2 journals" flash.
      const newDoc = docsService.createDoc({
        title,
        docProps:
          type === 'todo'
            ? {
                paragraph: { type: 'h3', text: new Text("Today's Tasks") },
                onStoreLoad: (store, { noteId }) => {
                  store.addBlock(
                    'affine:list',
                    { type: 'todo', text: new Text('') },
                    noteId
                  );
                  store.addBlock(
                    'affine:list',
                    { type: 'todo', text: new Text('') },
                    noteId
                  );
                  store.addBlock(
                    'affine:list',
                    { type: 'todo', text: new Text('') },
                    noteId
                  );
                },
              }
            : {
                paragraph: { type: 'h3', text: new Text('Meeting Notes') },
                onStoreLoad: (store, { noteId }) => {
                  store.addBlock(
                    'affine:paragraph',
                    { type: 'h6', text: new Text('Location') },
                    noteId
                  );
                  store.addBlock(
                    'affine:paragraph',
                    { text: new Text('') },
                    noteId
                  );
                  store.addBlock(
                    'affine:paragraph',
                    { type: 'h6', text: new Text('Discussion Points') },
                    noteId
                  );
                  store.addBlock(
                    'affine:paragraph',
                    { text: new Text('') },
                    noteId
                  );
                },
              },
      });
      const journalDoc = journalService.ensureJournalByDate(dateKey);
      journalService.setJournalDate(newDoc.id, dateKey);
      docsService.addLinkedDoc(journalDoc.id, newDoc.id).catch(console.error);
      workbench.openDoc(newDoc.id, { at: 'active' });
    },
    [dateKey, day, docsService, journalService, workbench]
  );

  return (
    <div
      className={styles.fullCalendarDayCell}
      data-today={isToday}
      data-outside={!isCurrentMonth}
      data-selected={isSelected}
      tabIndex={0}
      role="button"
      onClick={() => onSelect(dateKey)}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(dateKey);
      }}
    >
      <div className={styles.fullCalendarDayCellHeader}>
        <span className={styles.fullCalendarDayNumber} data-today={isToday}>
          {day.date()}
        </span>
        <div
          className={styles.fullCalendarAddBtn}
          onClick={e => e.stopPropagation()}
        >
          <Menu
            items={
              <>
                <MenuItem onClick={() => void handleCreateDoc('todo')}>
                  New Todo
                </MenuItem>
                <MenuItem onClick={() => void handleCreateDoc('meeting')}>
                  New Meeting Note
                </MenuItem>
              </>
            }
          >
            <IconButton style={{ width: 20, height: 20 }}>
              <PlusIcon />
            </IconButton>
          </Menu>
        </div>
      </div>
      <div className={styles.fullCalendarDayAgenda}>
        {journalDocs.length > 0 ? (
          <span className={styles.fullCalendarAgendaItem} data-type="journal">
            {journalDocs.length > 1
              ? `${journalDocs.length} Journals`
              : 'Journal'}
          </span>
        ) : null}
        {todoDocs.length > 0 ? (
          <span className={styles.fullCalendarAgendaItem} data-type="todo">
            {todoDocs.length > 1 ? `${todoDocs.length} Todos` : 'Todo'}
          </span>
        ) : null}
        {meetingDocs.length > 0 ? (
          <span className={styles.fullCalendarAgendaItem} data-type="meeting">
            {meetingDocs.length > 1
              ? `${meetingDocs.length} Meetings`
              : 'Meeting'}
          </span>
        ) : null}
        {visibleEvents.map(event => (
          <span
            key={event.id}
            className={styles.fullCalendarAgendaItem}
            data-type="event"
            style={{
              borderLeftColor: event.calendarColor || cssVarV2.button.primary,
            }}
          >
            {event.allDay ? null : `${event.startAt.format('HH:mm')} `}
            {event.title || t['Untitled']()}
          </span>
        ))}
        {hiddenCount > 0 ? (
          <span className={styles.fullCalendarAgendaMore}>
            +{hiddenCount} more
          </span>
        ) : null}
      </div>
    </div>
  );
};

interface FullMonthCalendarViewProps {
  selectedDate: dayjs.Dayjs;
  cursor: dayjs.Dayjs;
  onCursorChange: (d: dayjs.Dayjs) => void;
  onDateSelect: (dateKey: string) => void;
  onClose: () => void;
}

const FullMonthCalendarView = ({
  selectedDate,
  cursor,
  onCursorChange,
  onDateSelect,
  onClose,
}: FullMonthCalendarViewProps) => {
  const t = useI18n();
  const overlayRef = useRef<HTMLDivElement>(null);
  const monthNamesStr: string =
    t['com.affine.calendar-date-picker.month-names']();
  const weekDaysStr: string = t['com.affine.calendar-date-picker.week-days']();
  const todayLabel: string = t['com.affine.calendar-date-picker.today']();
  const monthNames = useMemo(
    () => monthNamesStr.split(/[,،]/),
    [monthNamesStr]
  );
  const weekDays = useMemo(() => weekDaysStr.split(/[,،]/), [weekDaysStr]);

  useEffect(() => {
    overlayRef.current?.focus();
  }, []);

  const weeks = useMemo<dayjs.Dayjs[][]>(() => {
    const start = cursor.startOf('month').startOf('week');
    const end = cursor.endOf('month').endOf('week');
    const result: dayjs.Dayjs[][] = [];
    let cur = start;
    while (cur.isBefore(end) || cur.isSame(end, 'day')) {
      const week: dayjs.Dayjs[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cur);
        cur = cur.add(1, 'day');
      }
      result.push(week);
    }
    return result;
  }, [cursor]);

  const isCurrentMonth = cursor.isSame(dayjs(), 'month');
  const titleStr = `${monthNames[cursor.month()]} ${cursor.year()}`;

  return (
    <div
      ref={overlayRef}
      className={styles.fullCalendarOverlay}
      role="dialog"
      aria-modal="true"
      aria-label={titleStr}
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowLeft') onCursorChange(cursor.subtract(1, 'month'));
        if (e.key === 'ArrowRight') onCursorChange(cursor.add(1, 'month'));
      }}
    >
      <div className={styles.fullCalendarHeader}>
        <div className={styles.fullCalendarTitle}>{titleStr}</div>
        <div className={styles.fullCalendarHeaderActions}>
          {!isCurrentMonth ? (
            <button
              className={styles.fullCalendarTodayBtn}
              onClick={() => onCursorChange(dayjs())}
            >
              {todayLabel}
            </button>
          ) : null}
          <IconButton
            aria-label="Previous month"
            onClick={() => onCursorChange(cursor.subtract(1, 'month'))}
          >
            <ArrowLeftSmallIcon />
          </IconButton>
          <IconButton
            aria-label="Next month"
            onClick={() => onCursorChange(cursor.add(1, 'month'))}
          >
            <ArrowRightSmallIcon />
          </IconButton>
          <IconButton aria-label="Close full page calendar" onClick={onClose}>
            <ExpandCloseIcon />
          </IconButton>
        </div>
      </div>

      <div className={styles.fullCalendarWeekdayRow}>
        {weekDays.map((label, i) => (
          <div key={i} className={styles.fullCalendarWeekdayHeader}>
            {label}
          </div>
        ))}
      </div>

      <div className={styles.fullCalendarBody}>
        {weeks.map((week, wi) => (
          <div key={wi} className={styles.fullCalendarWeekRow}>
            {week.map(day => (
              <FullCalendarDayCell
                key={day.format('YYYY-MM-DD')}
                day={day}
                isCurrentMonth={day.isSame(cursor, 'month')}
                isSelected={day.isSame(selectedDate, 'day')}
                onSelect={onDateSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const EditorJournalPanel = () => {
  const t = useI18n();
  const doc = useServiceOptional(DocService)?.doc;
  const workbench = useService(WorkbenchService).workbench;
  const viewService = useService(ViewService);
  const journalService = useService(JournalService);
  const calendar = useService(IntegrationService).calendar;
  const workspaceServerService = useService(WorkspaceServerService);
  const server = useLiveData(workspaceServerService.server$);
  const location = useLiveData(viewService.view.location$);
  const journalDateStr = useLiveData(
    doc ? journalService.journalDate$(doc.id) : null
  );
  const journalDate = journalDateStr ? dayjs(journalDateStr) : null;
  const isJournal = !!journalDate;
  const routeDate = useMemo(() => {
    if (!location.pathname.startsWith('/journals')) return null;
    const searchParams = new URLSearchParams(location.search);
    const rawDate = searchParams.get('date');
    return rawDate ? dayjs(rawDate) : dayjs();
  }, [location.pathname, location.search]);
  const [selectedDate, setSelectedDate] = useState(() => {
    return journalDate ?? routeDate ?? dayjs();
  });
  const [calendarCursor, setCalendarCursor] = useState(selectedDate);
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const calendarCursorMonthKey = useMemo(() => {
    return calendarCursor.format('YYYY-MM');
  }, [calendarCursor]);
  const calendarCursorMonthStart = useMemo(() => {
    return dayjs(`${calendarCursorMonthKey}-01`);
  }, [calendarCursorMonthKey]);
  const calendarCursorMonthEnd = useMemo(() => {
    return dayjs(`${calendarCursorMonthKey}-01`).endOf('month');
  }, [calendarCursorMonthKey]);
  const docRecords = useLiveData(useService(DocsService).list.docs$);
  const allJournalDates = useLiveData(journalService.allJournalDates$);
  const eventDates = useLiveData(calendar.eventDates$);
  const workspaceCalendars = useLiveData(calendar.workspaceCalendars$);
  const workspaceCalendarId = workspaceCalendars[0]?.id;

  useEffect(() => {
    if (journalDate && !journalDate.isSame(selectedDate, 'day')) {
      setSelectedDate(journalDate);
    }
  }, [journalDate, selectedDate]);

  useEffect(() => {
    if (journalDate || !routeDate) return;
    if (!routeDate.isSame(selectedDate, 'day')) {
      setSelectedDate(routeDate);
    }
  }, [journalDate, routeDate, selectedDate]);

  useEffect(() => {
    setCalendarCursor(selectedDate);
  }, [selectedDate]);

  const openJournal = useCallback(
    (date: string) => {
      const docs = journalService.journalsByDate$(date).value;
      if (docs.length > 0) {
        workbench.openDoc(docs[0].id, { at: 'active' });
      } else {
        workbench.open(`/journals?date=${date}`, { at: 'active' });
      }
    },
    [journalService, workbench]
  );

  const onDateSelect = useCallback(
    (date: string) => {
      if (dayjs(date).isSame(selectedDate, 'day')) return;
      setSelectedDate(dayjs(date));
      openJournal(date);
    },
    [openJournal, selectedDate]
  );

  const docActivityDates = useMemo(() => {
    const dates = new Set<string>();
    for (const docRecord of docRecords) {
      const meta = docRecord.meta$.value;
      if (meta.trash) continue;
      if (meta.createDate) {
        dates.add(dayjs(meta.createDate).format('YYYY-MM-DD'));
      }
      if (meta.updatedDate) {
        dates.add(dayjs(meta.updatedDate).format('YYYY-MM-DD'));
      }
    }
    return dates;
  }, [docRecords]);

  useEffect(() => {
    calendar.revalidateWorkspaceCalendars().catch(() => undefined);
    calendar.loadAccountCalendars().catch(() => undefined);
  }, [calendar, server]);

  useEffect(() => {
    const update = () => {
      calendar
        .revalidateEventsRange(calendarCursorMonthStart, calendarCursorMonthEnd)
        .catch(() => undefined);
    };
    update();
    const interval = setInterval(update, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [
    calendar,
    calendarCursorMonthEnd,
    calendarCursorMonthStart,
    workspaceCalendarId,
  ]);

  const getDotType = useCallback(
    (dateKey: string): DateDotType[] => {
      const dotTypes: DateDotType[] = [];
      if (allJournalDates.has(dateKey)) {
        dotTypes.push('journal');
      }
      if (eventDates.has(dateKey)) {
        dotTypes.push('event');
      }
      if (docActivityDates.has(dateKey)) {
        dotTypes.push('activity');
      }
      return dotTypes;
    },
    [allJournalDates, docActivityDates, eventDates]
  );

  const renderDateCell = useCallback(
    (cell: DateCell, expanded: boolean) => {
      const dateKey = cell.date.format('YYYY-MM-DD');
      return (
        <JournalCalendarDateCell
          cell={cell}
          dateKey={dateKey}
          dotTypes={getDotType(dateKey)}
          expanded={expanded}
          hasJournal={allJournalDates.has(dateKey)}
          isJournal={isJournal}
        />
      );
    },
    [allJournalDates, getDotType, isJournal]
  );

  const customDayRenderer = useCallback(
    (cell: DateCell) => renderDateCell(cell, false),
    [renderDateCell]
  );

  return (
    <div
      className={styles.journalPanel}
      data-is-journal={isJournal}
      data-testid="sidebar-journal-panel"
    >
      <div data-mobile={mobile} className={styles.calendar}>
        <div className={styles.calendarActions}>
          <IconButton
            className={styles.calendarExpandButton}
            aria-label="Open full page calendar"
            onClick={() => setCalendarExpanded(true)}
          >
            <ExpandFullIcon />
          </IconButton>
        </div>
        <DatePicker
          weekDays={t['com.affine.calendar-date-picker.week-days']()}
          monthNames={t['com.affine.calendar-date-picker.month-names']()}
          todayLabel={t['com.affine.calendar-date-picker.today']()}
          customDayRenderer={customDayRenderer}
          value={selectedDate.format('YYYY-MM-DD')}
          onChange={onDateSelect}
          onCursorChange={setCalendarCursor}
          cellSize={34}
        />
      </div>
      {calendarExpanded ? (
        <FullMonthCalendarView
          selectedDate={selectedDate}
          cursor={calendarCursor}
          onCursorChange={setCalendarCursor}
          onDateSelect={onDateSelect}
          onClose={() => setCalendarExpanded(false)}
        />
      ) : null}
      <JournalTemplateOnboarding />
      <JournalConflictBlock date={selectedDate} />
      <CalendarEvents date={selectedDate} />
      <JournalDailyCountBlock date={selectedDate} />
      <JournalTemplateSetting />
    </div>
  );
};

export const sortPagesByDate = (
  docs: DocRecord[],
  field: 'updatedDate' | 'createDate',
  order: 'asc' | 'desc' = 'desc'
) => {
  return [...docs].sort((a, b) => {
    return (
      (order === 'asc' ? 1 : -1) *
      dayjs(b.meta$.value[field]).diff(dayjs(a.meta$.value[field]))
    );
  });
};

const DailyCountEmptyFallback = ({ name }: { name: NavItemName }) => {
  const t = useI18n();

  return (
    <div className={styles.dailyCountEmpty}>
      {name === 'createdToday'
        ? t['com.affine.journal.daily-count-created-empty-tips']()
        : t['com.affine.journal.daily-count-updated-empty-tips']()}
    </div>
  );
};
const JournalDailyCountBlock = ({ date }: JournalBlockProps) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const t = useI18n();
  const [activeItem, setActiveItem] = useState<NavItemName>('createdToday');
  const docRecords = useLiveData(useService(DocsService).list.docs$);

  const getTodaysPages = useCallback(
    (field: 'createDate' | 'updatedDate') => {
      return sortPagesByDate(
        docRecords.filter(docRecord => {
          const meta = docRecord.meta$.value;
          if (meta.trash) return false;
          return meta[field] && dayjs(meta[field]).isSame(date, 'day');
        }),
        field
      );
    },
    [date, docRecords]
  );

  const createdToday = useMemo(
    () => getTodaysPages('createDate'),
    [getTodaysPages]
  );
  const updatedToday = useMemo(
    () => getTodaysPages('updatedDate'),
    [getTodaysPages]
  );

  const headerItems = useMemo<NavItem[]>(
    () => [
      {
        name: 'createdToday',
        label: t['com.affine.journal.created-today'](),
        count: createdToday.length,
      },
      {
        name: 'updatedToday',
        label: t['com.affine.journal.updated-today'](),
        count: updatedToday.length,
      },
    ],
    [createdToday.length, t, updatedToday.length]
  );

  const activeIndex = headerItems.findIndex(({ name }) => name === activeItem);

  const vars = assignInlineVars({
    '--active-index': String(activeIndex),
    '--item-count': String(headerItems.length),
  });

  return (
    <div className={styles.dailyCount} style={vars}>
      <header className={styles.dailyCountHeader}>
        {headerItems.map(({ label, count, name }, index) => {
          return (
            <button
              onClick={() => setActiveItem(name)}
              aria-selected={activeItem === name}
              className={styles.dailyCountNav}
              key={index}
            >
              {label}
              &nbsp;
              <CountDisplay count={count} />
            </button>
          );
        })}
      </header>

      <main className={styles.dailyCountContainer} data-active={activeItem}>
        {headerItems.map(({ name }) => {
          const renderList =
            name === 'createdToday' ? createdToday : updatedToday;
          if (renderList.length === 0)
            return (
              <div key={name} className={styles.dailyCountItem}>
                <DailyCountEmptyFallback name={name} />
              </div>
            );
          return (
            <Scrollable.Root key={name} className={styles.dailyCountItem}>
              <Scrollable.Scrollbar />
              <Scrollable.Viewport>
                <div className={styles.dailyCountContent} ref={nodeRef}>
                  {renderList.map((pageRecord, index) => (
                    <PageItem
                      tabIndex={name === activeItem ? 0 : -1}
                      key={index}
                      docId={pageRecord.id}
                    />
                  ))}
                </div>
              </Scrollable.Viewport>
            </Scrollable.Root>
          );
        })}
      </main>
    </div>
  );
};

const MAX_CONFLICT_COUNT = 5;
interface ConflictListProps
  extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  docRecords: DocRecord[];
}
const ConflictList = ({
  docRecords,
  children,
  className,
  ...attrs
}: ConflictListProps) => {
  const t = useI18n();
  const currentDocId = useServiceOptional(DocService)?.doc.id;
  const journalService = useService(JournalService);
  const { openConfirmModal } = useConfirmModal();

  const handleOpenTrashModal = useCallback(
    (docRecord: DocRecord) => {
      openConfirmModal({
        title: t['com.affine.moveToTrash.confirmModal.title'](),
        description: t['com.affine.moveToTrash.confirmModal.description']({
          title: docRecord.title$.value || t['Untitled'](),
        }),
        cancelText: t['com.affine.confirmModal.button.cancel'](),
        confirmButtonOptions: {
          variant: 'error',
        },
        confirmText: t.Delete(),
        onConfirm: () => {
          docRecord.moveToTrash();
        },
      });
    },
    [openConfirmModal, t]
  );
  const handleRemoveJournalMark = useCallback(
    (docId: string) => {
      journalService.removeJournalDate(docId);
    },
    [journalService]
  );

  return (
    <div
      data-testid="journal-conflict-list"
      className={clsx(styles.journalConflictWrapper, className)}
      {...attrs}
    >
      {docRecords.map(docRecord => {
        const isCurrent = currentDocId ? docRecord.id === currentDocId : false;
        return (
          <PageItem
            aria-selected={isCurrent}
            docId={docRecord.id}
            key={docRecord.id}
            duplicate
            right={
              <Menu
                contentOptions={{
                  style: { width: 237, maxWidth: '100%' },
                  align: 'end',
                  alignOffset: -4,
                  sideOffset: 8,
                }}
                items={
                  <>
                    <Guard docId={docRecord.id} permission="Doc_Update">
                      {canEdit => (
                        <MenuItem
                          prefixIcon={<CalendarXmarkIcon />}
                          onClick={(e: MouseEvent) => {
                            e.stopPropagation();
                            handleRemoveJournalMark(docRecord.id);
                          }}
                          data-testid="journal-conflict-remove-mark"
                          disabled={!canEdit}
                        >
                          {t[
                            'com.affine.page-properties.property.journal-remove'
                          ]()}
                        </MenuItem>
                      )}
                    </Guard>
                    <MenuSeparator />
                    <Guard docId={docRecord.id} permission="Doc_Trash">
                      {canTrash => (
                        <MoveToTrash
                          onSelect={() => handleOpenTrashModal(docRecord)}
                          disabled={!canTrash}
                        />
                      )}
                    </Guard>
                  </>
                }
              >
                <IconButton
                  data-testid="journal-conflict-edit"
                  icon={<EditIcon />}
                />
              </Menu>
            }
          />
        );
      })}
      {children}
    </div>
  );
};
const JournalConflictBlock = ({ date }: JournalBlockProps) => {
  const t = useI18n();
  const docRecordList = useService(DocsService).list;
  const journalService = useService(JournalService);
  const dateString = date.format('YYYY-MM-DD');
  const docs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateString),
      [dateString, journalService]
    )
  );
  const docRecords = useLiveData(
    docRecordList.docs$.map(records =>
      records.filter(v => {
        return docs.some(doc => doc.id === v.id);
      })
    )
  );

  if (docs.length <= 1) return null;

  return (
    <ConflictList
      className={styles.journalConflictBlock}
      docRecords={docRecords.slice(0, MAX_CONFLICT_COUNT)}
    >
      {docs.length > MAX_CONFLICT_COUNT ? (
        <Menu
          items={
            <ConflictList docRecords={docRecords.slice(MAX_CONFLICT_COUNT)} />
          }
        >
          <div className={styles.journalConflictMoreTrigger}>
            {t['com.affine.journal.conflict-show-more']({
              count: (docRecords.length - MAX_CONFLICT_COUNT).toFixed(0),
            })}
          </div>
        </Menu>
      ) : null}
    </ConflictList>
  );
};
