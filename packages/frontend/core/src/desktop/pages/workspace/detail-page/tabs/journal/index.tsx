import type { DateCell } from '@affine/component';
import {
  DatePicker,
  IconButton,
  Menu,
  MenuItem,
  MenuSeparator,
  notify,
  Scrollable,
  useConfirmModal,
} from '@affine/component';
import { Guard } from '@affine/core/components/guard';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { MoveToTrash } from '@affine/core/components/page-list';
import { WorkspaceServerService } from '@affine/core/modules/cloud';
import {
  type Doc,
  type DocRecord,
  DocService,
  DocsService,
} from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import { IntegrationService } from '@affine/core/modules/integration';
import { JournalService } from '@affine/core/modules/journal';
import {
  DocGrantedUsersService,
  type Member,
  MemberSearchService,
} from '@affine/core/modules/permissions';
import { ShareMenuContent } from '@affine/core/modules/share-menu';
import {
  ViewService,
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { WorkspaceService } from '@affine/core/modules/workspace';
import { UserFriendlyError } from '@affine/error';
import { DocRole, WorkspaceMemberStatus } from '@affine/graphql';
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
  ShareIcon,
} from '@blocksuite/icons/rc';
import {
  FrameworkScope,
  useLiveData,
  useService,
  useServiceOptional,
} from '@toeverything/infra';
import { cssVarV2 } from '@toeverything/theme/v2';
import { assignInlineVars } from '@vanilla-extract/dynamic';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type {
  ChangeEvent,
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

const DocShareMenuTrigger = ({ docId }: { docId: string }) => {
  const docsService = useService(DocsService);
  const workspaceService = useService(WorkspaceService);
  const [openedDoc, setOpenedDoc] = useState<Doc | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        try {
          const { doc, release } = docsService.open(docId);
          releaseRef.current = release;
          setOpenedDoc(doc);
        } catch {
          // doc not yet in collection
        }
      } else {
        releaseRef.current?.();
        releaseRef.current = null;
        setOpenedDoc(null);
      }
    },
    [docId, docsService]
  );

  useEffect(() => {
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  return (
    <div onClick={e => e.stopPropagation()}>
      <Menu
        rootOptions={{ onOpenChange: handleOpenChange }}
        contentOptions={{ align: 'end', sideOffset: 4 }}
        items={
          openedDoc ? (
            <FrameworkScope scope={openedDoc.scope}>
              <ShareMenuContent
                workspaceMetadata={workspaceService.workspace.meta}
                currentPage={openedDoc.blockSuiteDoc}
                onEnableAffineCloud={() => {}}
              />
            </FrameworkScope>
          ) : null
        }
      >
        <IconButton
          size={16}
          className={styles.pageItemShareBtn}
          aria-label="Share this doc"
        >
          <ShareIcon />
        </IconButton>
      </Menu>
    </div>
  );
};

const ShareDayContent = ({
  date,
  docIds,
  onClose,
}: {
  date: dayjs.Dayjs;
  docIds: string[];
  onClose: () => void;
}) => {
  const docsService = useService(DocsService);
  const memberSearchService = useService(MemberSearchService);
  const [selectedMembers, setSelectedMembers] = useState<Member[]>([]);
  const [role, setRole] = useState<DocRole>(DocRole.Reader);
  const [searchText, setSearchText] = useState('');
  const searchResults = useLiveData(memberSearchService.result$);

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchText(val);
      if (val.trim()) {
        memberSearchService.search(val.trim());
      } else {
        memberSearchService.reset();
      }
    },
    [memberSearchService]
  );

  const handleSelectMember = useCallback(
    (member: Member) => {
      setSelectedMembers(prev => {
        if (prev.some(m => m.id === member.id)) return prev;
        return [...prev, member];
      });
      setSearchText('');
      memberSearchService.reset();
    },
    [memberSearchService]
  );

  const handleRemoveMember = useCallback((memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  }, []);

  const handleShare = useAsyncCallback(async () => {
    const userIds = selectedMembers.map(m => m.id);
    try {
      for (const docId of docIds) {
        const { doc, release } = docsService.open(docId);
        try {
          const grantService = doc.scope.get(DocGrantedUsersService);
          await grantService.grantUsersRole(userIds, role);
        } finally {
          release();
        }
      }
      notify.success({ title: 'Shared successfully' });
      onClose();
    } catch (e) {
      const err = UserFriendlyError.fromAny(e);
      notify.error({ title: err.message || 'Failed to share' });
    }
  }, [docsService, docIds, selectedMembers, role, onClose]);

  const filteredResults = useMemo(
    () =>
      searchResults
        .filter(m => m.status === WorkspaceMemberStatus.Accepted)
        .filter(m => !selectedMembers.some(s => s.id === m.id))
        .slice(0, 6),
    [searchResults, selectedMembers]
  );

  return (
    <div className={styles.shareDayMenuContent}>
      <div className={styles.shareDayTitle}>
        Share {date.format('MMM D')}&apos;s notes
      </div>
      <div className={styles.shareDaySearchArea}>
        {selectedMembers.map(member => (
          <span key={member.id} className={styles.shareDayChip}>
            {member.name || member.email}
            <button
              className={styles.shareDayChipRemove}
              onClick={() => handleRemoveMember(member.id)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className={styles.shareDayInput}
          placeholder={selectedMembers.length ? '' : '@ Add people...'}
          value={searchText}
          onChange={handleSearchChange}
          autoFocus
        />
      </div>
      {filteredResults.length > 0 && (
        <div className={styles.shareDayResults}>
          {filteredResults.map(member => (
            <button
              key={member.id}
              className={styles.shareDayResult}
              onClick={() => handleSelectMember(member)}
            >
              <span className={styles.shareDayResultName}>
                {member.name || member.email}
              </span>
              {member.name && member.email && (
                <span className={styles.shareDayResultEmail}>
                  {member.email}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className={styles.shareDayRoleRow}>
        <span>Access:</span>
        <Menu
          items={
            <>
              <MenuItem
                onSelect={() => setRole(DocRole.Reader)}
                selected={role === DocRole.Reader}
              >
                Can view
              </MenuItem>
              <MenuItem
                onSelect={() => setRole(DocRole.Editor)}
                selected={role === DocRole.Editor}
              >
                Can edit
              </MenuItem>
            </>
          }
        >
          <button className={styles.shareDayRoleBtn}>
            {role === DocRole.Reader ? 'Can view' : 'Can edit'} ▾
          </button>
        </Menu>
      </div>
      <button
        className={styles.shareDaySubmit}
        disabled={selectedMembers.length === 0}
        onClick={handleShare}
      >
        Share with {selectedMembers.length || 0}{' '}
        {selectedMembers.length === 1 ? 'person' : 'people'}
      </button>
    </div>
  );
};

const ShareDayDialog = ({
  date,
  docIds,
}: {
  date: dayjs.Dayjs;
  docIds: string[];
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Menu
      rootOptions={{ open, onOpenChange: setOpen }}
      contentOptions={{ align: 'end', sideOffset: 4 }}
      items={
        open ? (
          <ShareDayContent
            date={date}
            docIds={docIds}
            onClose={() => setOpen(false)}
          />
        ) : null
      }
    >
      <IconButton
        size={16}
        className={styles.shareDayBtn}
        aria-label="Share this day's notes"
      >
        <ShareIcon />
      </IconButton>
    </Menu>
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
  const allDateDocs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateKey),
      [dateKey, journalService]
    )
  );
  // Only count actual journal docs (title === 'YYYY-MM-DD'), not linked todo/meeting docs.
  const journals = useMemo(
    () => allDateDocs.filter(doc => (doc.meta$.value.title ?? '') === dateKey),
    [allDateDocs, dateKey]
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

// ── Meeting list dropdown with inline rename ──────────────────────────────

const MeetingDropdown = ({ docs }: { docs: DocRecord[] }) => {
  const workbench = useService(WorkbenchService).workbench;
  const [open, setOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const handleStartRename = useCallback((doc: DocRecord) => {
    setRenamingId(doc.id);
    setDraft(doc.meta$.value.title || '');
  }, []);

  const handleCommitRename = useCallback(
    (doc: DocRecord) => {
      const trimmed = draft.trim();
      if (trimmed) doc.setMeta({ title: trimmed });
      setRenamingId(null);
    },
    [draft]
  );

  if (docs.length === 1) {
    return (
      <span
        className={styles.fullCalendarAgendaItem}
        data-type="meeting"
        onClick={e => {
          e.stopPropagation();
          workbench.openDoc(docs[0].id, { at: 'active' });
        }}
      >
        Meeting
      </span>
    );
  }

  return (
    <Menu
      rootOptions={{ open, onOpenChange: setOpen }}
      items={
        <div className={styles.meetingDropdownContent}>
          {docs.map(doc => {
            const title = doc.meta$.value.title || 'Untitled';
            if (renamingId === doc.id) {
              return (
                <div
                  key={doc.id}
                  className={styles.meetingRenameRow}
                  onPointerDown={e => e.stopPropagation()}
                >
                  <input
                    autoFocus
                    className={styles.meetingRenameInput}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => handleCommitRename(doc)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleCommitRename(doc);
                      if (e.key === 'Escape') {
                        e.stopPropagation(); // keep dropdown open
                        setRenamingId(null);
                      }
                    }}
                  />
                </div>
              );
            }
            return (
              <div key={doc.id} className={styles.meetingRow}>
                <button
                  className={styles.meetingNavBtn}
                  onClick={() => {
                    workbench.openDoc(doc.id, { at: 'active' });
                    setOpen(false);
                  }}
                >
                  {title}
                </button>
                <IconButton size={16} onClick={() => handleStartRename(doc)}>
                  <EditIcon />
                </IconButton>
              </div>
            );
          })}
        </div>
      }
    >
      <span
        className={styles.fullCalendarAgendaItem}
        data-type="meeting"
        onClick={e => e.stopPropagation()}
      >
        {docs.length} Meetings
      </span>
    </Menu>
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
      // Todo: one per day — if it already exists, go to the day's journal
      // where the "Today's Tasks" section surfaces it.
      if (type === 'todo' && todoDocs.length > 0) {
        const journalDoc = journalService.ensureJournalByDate(dateKey);
        workbench.openDoc(journalDoc.id, { at: 'active' });
        return;
      }
      // Meeting: multiple allowed — always create a new one with a sequence number.

      const prefix = type === 'todo' ? 'Todo' : 'Meeting';
      const baseTitle = `${prefix} · ${day.format('MMM D, YYYY')}`;
      const count = meetingDocs.length;
      const title =
        type === 'meeting' && count > 0
          ? `${baseTitle} (${count + 1})`
          : baseTitle;
      const newDoc = docsService.createDoc({
        title,
        docProps:
          type === 'todo'
            ? {
                // tasks are added from the journal's "Today's Tasks"
                // section — start with no placeholder items
                paragraph: { type: 'h3', text: new Text("Today's Tasks") },
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
      if (type === 'todo') {
        // todos surface in the journal's "Today's Tasks" section — open the
        // journal instead of the raw todo doc, and don't insert a
        // linked-doc paragraph into the journal body
        workbench.openDoc(journalDoc.id, { at: 'active' });
      } else {
        docsService.addLinkedDoc(journalDoc.id, newDoc.id).catch(console.error);
        workbench.openDoc(newDoc.id, { at: 'active' });
      }
    },
    [
      dateKey,
      day,
      docsService,
      journalService,
      workbench,
      todoDocs,
      meetingDocs,
    ]
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
          <span
            className={styles.fullCalendarAgendaItem}
            data-type="journal"
            onClick={e => {
              e.stopPropagation();
              workbench.openDoc(journalDocs[0].id, { at: 'active' });
            }}
          >
            {journalDocs.length > 1
              ? `${journalDocs.length} Journals`
              : 'Journal'}
          </span>
        ) : null}
        {todoDocs.length > 0 ? (
          <span
            className={styles.fullCalendarAgendaItem}
            data-type="todo"
            onClick={e => {
              e.stopPropagation();
              workbench.openDoc(todoDocs[0].id, { at: 'active' });
            }}
          >
            {todoDocs.length > 1 ? `${todoDocs.length} Todos` : 'Todo'}
          </span>
        ) : null}
        {meetingDocs.length > 0 ? <MeetingDropdown docs={meetingDocs} /> : null}
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
  /** render inside the panel instead of as a full-viewport overlay */
  inline?: boolean;
  onClose?: () => void;
}

const FullMonthCalendarView = ({
  selectedDate,
  cursor,
  onCursorChange,
  onDateSelect,
  inline,
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
    if (!inline) {
      overlayRef.current?.focus();
    }
  }, [inline]);

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
      className={
        inline ? styles.fullCalendarInline : styles.fullCalendarOverlay
      }
      role={inline ? undefined : 'dialog'}
      aria-modal={inline ? undefined : 'true'}
      aria-label={titleStr}
      tabIndex={-1}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose?.();
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
          {onClose ? (
            <IconButton aria-label="Close full page calendar" onClick={onClose}>
              <ExpandCloseIcon />
            </IconButton>
          ) : null}
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
  // mobile-only overlay toggle; desktop always renders the inline full view
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
      // Find the actual journal doc (title === 'YYYY-MM-DD'), not linked
      // todo/meeting docs that share the same journal date property.
      const journalDoc = docs.find(
        doc => (doc.meta$.value.title ?? '') === date
      );
      if (journalDoc) {
        workbench.openDoc(journalDoc.id, { at: 'active' });
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
      {mobile ? (
        // mobile keeps the compact picker with an expandable overlay
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
      ) : (
        // desktop: the tagged full-month view lives directly in the panel,
        // below the sidebar tab icons — no expand/collapse
        <FullMonthCalendarView
          inline
          selectedDate={selectedDate}
          cursor={calendarCursor}
          onCursorChange={setCalendarCursor}
          onDateSelect={onDateSelect}
        />
      )}
      {mobile && calendarExpanded ? (
        <FullMonthCalendarView
          selectedDate={selectedDate}
          cursor={calendarCursor}
          onCursorChange={setCalendarCursor}
          onDateSelect={onDateSelect}
          onClose={() => setCalendarExpanded(false)}
        />
      ) : null}
      {mobile ? (
        // desktop shows only the full-month calendar; these auxiliary
        // blocks remain on mobile's compact layout
        <>
          <JournalTemplateOnboarding />
          <JournalConflictBlock date={selectedDate} />
          <CalendarEvents date={selectedDate} />
          <JournalDailyCountBlock date={selectedDate} />
          <JournalTemplateSetting />
        </>
      ) : null}
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

  const allDocIds = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const doc of [...createdToday, ...updatedToday]) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        ids.push(doc.id);
      }
    }
    return ids;
  }, [createdToday, updatedToday]);

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
        <ShareDayDialog date={date} docIds={allDocIds} />
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
                      right={<DocShareMenuTrigger docId={pageRecord.id} />}
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
  const allDocs = useLiveData(
    useMemo(
      () => journalService.journalsByDate$(dateString),
      [dateString, journalService]
    )
  );
  // Only count actual journal docs (title === 'YYYY-MM-DD'), not linked todo/meeting docs.
  const docs = useMemo(
    () => allDocs.filter(doc => (doc.meta$.value.title ?? '') === dateString),
    [allDocs, dateString]
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
