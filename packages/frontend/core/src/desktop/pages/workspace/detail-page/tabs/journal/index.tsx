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
  LiveData,
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
import { generateMeetingRoomUrl, MEETING_PROP } from './meeting-utils';
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

// ── Meeting detail editor ───────────────────────────────────────────────────

/** 00:00 … 23:30 in 30-minute steps for the time-range dropdowns. */
const MEETING_TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  return `${h}:${i % 2 ? '30' : '00'}`;
});

const MEETING_REPEAT_OPTIONS = [
  { value: '', label: '不重複' },
  { value: 'weekly', label: '每週' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
];

/**
 * Does a repeating meeting that starts on `startStr` recur on `dayStr`?
 * weekly = same weekday, monthly = same day-of-month, yearly = same month+day.
 */
const matchesRecurrence = (
  startStr: string,
  dayStr: string,
  repeat: string
) => {
  const s = dayjs(startStr);
  const d = dayjs(dayStr);
  if (!s.isValid() || !d.isValid() || d.isBefore(s, 'day')) return false;
  if (repeat === 'weekly') return d.diff(s, 'day') % 7 === 0;
  if (repeat === 'monthly') return d.date() === s.date();
  if (repeat === 'yearly')
    return d.month() === s.month() && d.date() === s.date();
  return false;
};

/**
 * Editable meeting details, shown when a meeting name is clicked: rename plus
 * all-day toggle, date range, time range (dropdowns), repeat, and location.
 * Everything but the name is stored as custom properties on the meeting doc.
 */
const MeetingEditor = ({
  doc,
  dateKey,
  onDeleted,
}: {
  doc: DocRecord;
  dateKey: string;
  onDeleted?: () => void;
}) => {
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;
  const props = useLiveData(doc.properties$) as Record<
    string,
    string | undefined
  >;
  const get = (key: string) => props[`custom:${key}`] ?? '';
  const set = (key: string, value: string) => doc.setCustomProperty(key, value);

  const cleanTitle = (useLiveData(doc.title$) ?? '').replace(/^Meeting · /, '');
  const [name, setName] = useState(cleanTitle);
  const nameFocused = useRef(false);
  useEffect(() => {
    if (!nameFocused.current) setName(cleanTitle);
  }, [cleanTitle]);

  const commitName = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed) {
      docsService
        .changeDocTitle(doc.id, `Meeting · ${trimmed}`)
        .catch(console.error);
    }
  }, [name, doc.id, docsService]);

  const allDay = get(MEETING_PROP.allDay) === '1';

  return (
    <div
      className={styles.meetingEditor}
      onPointerDown={e => e.stopPropagation()}
    >
      <input
        autoFocus
        className={styles.meetingRenameInput}
        value={name}
        placeholder="會議名稱"
        onChange={e => setName(e.target.value)}
        onFocus={() => {
          nameFocused.current = true;
        }}
        onBlur={() => {
          nameFocused.current = false;
          commitName();
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <div className={styles.meetingEditorField}>
        <span className={styles.meetingEditorLabel}>全天</span>
        <label className={styles.meetingEditorCheck}>
          <input
            type="checkbox"
            className={styles.meetingEditorCheckbox}
            checked={allDay}
            onChange={e =>
              set(MEETING_PROP.allDay, e.target.checked ? '1' : '')
            }
          />
          {allDay ? '是' : '否'}
        </label>
      </div>
      <div className={styles.meetingEditorField}>
        <span className={styles.meetingEditorLabel}>日期</span>
        <div className={styles.meetingEditorRange}>
          <input
            type="date"
            className={styles.meetingEditorControl}
            value={get(MEETING_PROP.startDate) || dateKey}
            onChange={e => set(MEETING_PROP.startDate, e.target.value)}
          />
          <span>–</span>
          <input
            type="date"
            className={styles.meetingEditorControl}
            value={
              get(MEETING_PROP.endDate) ||
              get(MEETING_PROP.startDate) ||
              dateKey
            }
            onChange={e => set(MEETING_PROP.endDate, e.target.value)}
          />
        </div>
      </div>
      {!allDay ? (
        <div className={styles.meetingEditorField}>
          <span className={styles.meetingEditorLabel}>時間</span>
          <div className={styles.meetingEditorRange}>
            <select
              className={styles.meetingEditorControl}
              value={get(MEETING_PROP.startTime)}
              onChange={e => set(MEETING_PROP.startTime, e.target.value)}
            >
              <option value="">--:--</option>
              {MEETING_TIME_OPTIONS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span>–</span>
            <select
              className={styles.meetingEditorControl}
              value={get(MEETING_PROP.endTime)}
              onChange={e => set(MEETING_PROP.endTime, e.target.value)}
            >
              <option value="">--:--</option>
              {MEETING_TIME_OPTIONS.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
      <div className={styles.meetingEditorField}>
        <span className={styles.meetingEditorLabel}>重複</span>
        <select
          className={styles.meetingEditorControl}
          value={get(MEETING_PROP.repeat)}
          onChange={e => set(MEETING_PROP.repeat, e.target.value)}
        >
          {MEETING_REPEAT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {get(MEETING_PROP.repeat) ? (
        <div className={styles.meetingEditorField}>
          <span className={styles.meetingEditorLabel}>期限</span>
          <input
            type="date"
            className={styles.meetingEditorControl}
            value={get(MEETING_PROP.repeatUntil)}
            onChange={e => set(MEETING_PROP.repeatUntil, e.target.value)}
          />
        </div>
      ) : null}
      <div className={styles.meetingEditorField}>
        <span className={styles.meetingEditorLabel}>地點</span>
        <input
          className={styles.meetingEditorControl}
          value={get(MEETING_PROP.location)}
          placeholder="地點…"
          onChange={e => set(MEETING_PROP.location, e.target.value)}
        />
      </div>
      <div className={styles.meetingEditorField}>
        <span className={styles.meetingEditorLabel}>視訊</span>
        {get(MEETING_PROP.videoLink) ? (
          <div className={styles.meetingVideoRow}>
            <a
              className={styles.meetingVideoLink}
              href={get(MEETING_PROP.videoLink)}
              target="_blank"
              rel="noreferrer"
              title={get(MEETING_PROP.videoLink)}
            >
              {get(MEETING_PROP.videoLink).replace(/^https:\/\//, '')}
            </a>
            <button
              className={styles.meetingVideoIconBtn}
              title="複製連結"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(get(MEETING_PROP.videoLink))
                  .then(() => notify.success({ title: '已複製連結' }))
                  .catch(() => {});
              }}
            >
              複製
            </button>
            <button
              className={styles.meetingVideoIconBtn}
              title="移除連結"
              onClick={() => set(MEETING_PROP.videoLink, '')}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className={styles.meetingVideoGenBtn}
            onClick={() =>
              set(MEETING_PROP.videoLink, generateMeetingRoomUrl(cleanTitle))
            }
          >
            🎥 產生視訊會議連結
          </button>
        )}
      </div>
      <div className={styles.meetingEditorActions}>
        <button
          className={styles.meetingEditorOpenBtn}
          onClick={() => workbench.openDoc(doc.id, { at: 'active' })}
        >
          開啟會議筆記
        </button>
        <button
          className={styles.meetingEditorDeleteBtn}
          // moveToTrash is recoverable from the Trash section.
          onClick={() => {
            doc.moveToTrash();
            onDeleted?.();
          }}
        >
          🗑 刪除會議
        </button>
      </div>
    </div>
  );
};

// ── Meeting list dropdown with inline editor ──────────────────────────────

const MeetingDropdown = ({
  docs,
  dateKey,
}: {
  docs: DocRecord[];
  dateKey: string;
}) => {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reactive: re-render when any meeting title changes
  const docTitlesLiveData$ = useMemo(
    () =>
      LiveData.computed(get => {
        const result: Record<string, string> = {};
        for (const doc of docs) {
          const title = get(doc.meta$)?.title ?? '';
          result[doc.id] = title.replace(/^Meeting · /, '') || 'Untitled';
        }
        return result;
      }),
    [docs]
  );
  const docTitles = useLiveData(docTitlesLiveData$) ?? {};

  // Single meeting: the name itself opens the detail editor popover.
  if (docs.length === 1) {
    const doc = docs[0];
    return (
      <Menu
        rootOptions={{ open, onOpenChange: setOpen }}
        items={
          <div className={styles.meetingDropdownContent}>
            <MeetingEditor
              doc={doc}
              dateKey={dateKey}
              onDeleted={() => setOpen(false)}
            />
          </div>
        }
      >
        <span
          className={styles.fullCalendarAgendaItem}
          data-type="meeting"
          onClick={e => e.stopPropagation()}
        >
          {docTitles[doc.id] ?? 'Untitled'}
        </span>
      </Menu>
    );
  }

  // Multiple meetings: list them; clicking a name expands its editor inline.
  return (
    <Menu
      rootOptions={{ open, onOpenChange: setOpen }}
      items={
        <div className={styles.meetingDropdownContent}>
          {docs.map(doc => {
            const title = docTitles[doc.id] ?? 'Untitled';
            const expanded = expandedId === doc.id;
            return (
              <div key={doc.id}>
                <div className={styles.meetingRow}>
                  <button
                    className={styles.meetingNavBtn}
                    onClick={() => setExpandedId(expanded ? null : doc.id)}
                  >
                    {title}
                  </button>
                  <IconButton
                    size={16}
                    onClick={() => setExpandedId(expanded ? null : doc.id)}
                  >
                    <EditIcon />
                  </IconButton>
                </div>
                {expanded ? (
                  <MeetingEditor
                    doc={doc}
                    dateKey={dateKey}
                    onDeleted={() => setExpandedId(null)}
                  />
                ) : null}
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
  const journalsByDate$ = useMemo(
    () => journalService.journalsByDate$(dateKey),
    [dateKey, journalService]
  );

  // The Journal tag should only show when the journal actually has content
  // — creating a todo auto-creates an empty journal doc for navigation,
  // which must not light up the tag by itself.
  const [hasJournalContent, setHasJournalContent] = useState(false);
  const storeHasContent = useCallback((store: Doc['blockSuiteDoc']) => {
    return [
      ...store.getBlocksByFlavour('affine:paragraph'),
      ...store.getBlocksByFlavour('affine:list'),
    ].some((b: any) => (b.model?.text?.toString() ?? '').trim().length > 0);
  }, []);

  // Reactive: re-categorise when any doc's metadata title changes
  const categorizedDocs$ = useMemo(
    () =>
      LiveData.computed(get => {
        const journalDocs: DocRecord[] = [];
        const meetingDocs: DocRecord[] = [];
        let todoDoc: DocRecord | null = null;
        for (const doc of get(journalsByDate$) ?? []) {
          const title = get(doc.meta$)?.title ?? '';
          if (title.startsWith('Meeting ·')) meetingDocs.push(doc);
          else if (title.startsWith('Todo ·')) todoDoc = doc;
          else journalDocs.push(doc);
        }
        return { journalDocs, meetingDocs, todoDoc };
      }),
    [journalsByDate$]
  );
  const { journalDocs, meetingDocs, todoDoc } = useLiveData(
    categorizedDocs$
  ) ?? {
    journalDocs: [],
    meetingDocs: [],
    todoDoc: null,
  };

  // Meetings whose date range (meeting_startDate … meeting_endDate, falling
  // back to the journal date) covers this day — so a multi-day meeting is
  // tagged on every day in its range, not only the first. Used for display;
  // `meetingDocs` (journal-date matched) still drives new-meeting numbering.
  const rangeMeetings$ = useMemo(
    () =>
      LiveData.computed(get => {
        const result: DocRecord[] = [];
        for (const doc of get(docsService.list.docs$)) {
          const title = get(doc.meta$)?.title ?? '';
          if (!title.startsWith('Meeting ·')) continue;
          if (get(doc.trash$)) continue;
          const props = get(doc.properties$);
          const start =
            props['custom:meeting_startDate'] || props['journal'] || '';
          if (!start) continue;
          const end = props['custom:meeting_endDate'] || start;
          // (a) base contiguous range (start … end)
          if (dateKey >= start && dateKey <= end) {
            result.push(doc);
            continue;
          }
          // (b) recurrence: tag each repeat occurrence up to the until date.
          const repeat = props['custom:meeting_repeat'] || '';
          const until = props['custom:meeting_repeatUntil'] || '';
          if (
            repeat &&
            until &&
            dateKey > end &&
            dateKey <= until &&
            matchesRecurrence(start, dateKey, repeat)
          ) {
            result.push(doc);
          }
        }
        return result;
      }),
    [docsService, dateKey]
  );
  const rangeMeetingDocs = useLiveData(rangeMeetings$) ?? [];

  useEffect(() => {
    if (journalDocs.length === 0) {
      setHasJournalContent(false);
      return;
    }
    const stores: Doc['blockSuiteDoc'][] = [];
    const cleanups: (() => void)[] = [];
    const check = () => {
      setHasJournalContent(stores.some(store => storeHasContent(store)));
    };
    for (const record of journalDocs) {
      try {
        const { doc, release } = docsService.open(record.id);
        const store = doc.blockSuiteDoc;
        store.load();
        stores.push(store);
        const subscription = store.slots.blockUpdated.subscribe(check);
        cleanups.push(() => {
          subscription.unsubscribe();
          release();
        });
      } catch {
        // doc not available yet — treated as empty
      }
    }
    check();
    return () => cleanups.forEach(fn => fn());
  }, [journalDocs, docsService, storeHasContent]);

  // Show a "Tasks" tag when a Todo · DATE doc exists for this date
  const hasTodoSection = todoDoc !== null;

  const tagCount =
    (hasJournalContent ? 1 : 0) +
    (hasTodoSection ? 1 : 0) +
    (rangeMeetingDocs.length > 0 ? 1 : 0);
  const maxEvents = Math.max(0, 4 - tagCount);
  const visibleEvents = events.slice(0, maxEvents);
  const hiddenCount = events.length - visibleEvents.length;

  const handleCreateDoc = useCallback(
    (type: 'journal' | 'todo' | 'meeting') => {
      if (type === 'journal') {
        const journalDoc = journalService.ensureJournalByDate(dateKey);
        workbench.openDoc(journalDoc.id, { at: 'active' });
        return;
      }
      if (type === 'todo') {
        const isOnAllTodos =
          workbench.location$.value.pathname === '/all-todos';
        if (todoDoc) {
          if (!isOnAllTodos) workbench.openDoc(todoDoc.id, { at: 'active' });
        } else {
          const newDoc = docsService.createDoc({
            title: `Todo · ${day.format('MMM D, YYYY')}`,
          });
          journalService.setJournalDate(newDoc.id, dateKey);
          if (!isOnAllTodos) workbench.openDoc(newDoc.id, { at: 'active' });
        }
        return;
      }
      // Meeting: always create a new one (multiple allowed per day).
      const baseTitle = `Meeting · ${day.format('MMM D, YYYY')}`;
      const title =
        meetingDocs.length > 0
          ? `${baseTitle} (${meetingDocs.length + 1})`
          : baseTitle;
      const newDoc = docsService.createDoc({
        title,
        docProps: {
          paragraph: { type: 'h3', text: new Text('Meeting Notes') },
          onStoreLoad: (store, { noteId }) => {
            store.addBlock(
              'affine:paragraph',
              { type: 'h6', text: new Text('Location') },
              noteId
            );
            store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
            store.addBlock(
              'affine:paragraph',
              { type: 'h6', text: new Text('Discussion Points') },
              noteId
            );
            store.addBlock('affine:paragraph', { text: new Text('') }, noteId);
          },
        },
      });
      const journalDoc = journalService.ensureJournalByDate(dateKey);
      journalService.setJournalDate(newDoc.id, dateKey);
      docsService.addLinkedDoc(journalDoc.id, newDoc.id).catch(console.error);
      workbench.openDoc(newDoc.id, { at: 'active' });
    },
    [dateKey, day, docsService, journalService, workbench, meetingDocs, todoDoc]
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
                <MenuItem onClick={() => void handleCreateDoc('journal')}>
                  New Journal Entry
                </MenuItem>
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
        {hasJournalContent ? (
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
        {hasTodoSection ? (
          <span
            className={styles.fullCalendarAgendaItem}
            data-type="todo"
            onClick={e => {
              e.stopPropagation();
              if (todoDoc) workbench.openDoc(todoDoc.id, { at: 'active' });
            }}
          >
            Todo
          </span>
        ) : null}
        {rangeMeetingDocs.length > 0 ? (
          <MeetingDropdown docs={rangeMeetingDocs} dateKey={dateKey} />
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
        // desktop: the tagged full-month view lives directly in the panel
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
