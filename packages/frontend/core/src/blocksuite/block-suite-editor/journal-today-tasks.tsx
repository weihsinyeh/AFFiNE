import { Checkbox } from '@affine/component';
import { DocsService } from '@affine/core/modules/doc';
import type { DocRecord } from '@affine/core/modules/doc/entities/record';
import { JournalService } from '@affine/core/modules/journal';
import type { Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as styles from './journal-today-tasks.css';

type TaskItem = {
  id: string;
  text: string;
  checked: boolean;
};

const collectTasks = (store: any): TaskItem[] => {
  return store
    .getBlocksByFlavour('affine:list')
    .filter((block: any) => block.model?.props?.type === 'todo')
    .map((block: any) => ({
      id: block.id,
      text: block.model?.props?.text?.toString() ?? '',
      checked: !!block.model?.props?.checked,
    }))
    .filter((task: TaskItem) => task.text.trim().length > 0);
};

const STATUS_OPTIONS = [
  { value: '', label: 'Not Started' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'completed', label: 'Completed' },
] as const;

const PRIORITY_OPTIONS = [
  { value: '', label: 'Not Set' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

// ── Per-task metadata (Status / Priority / Deadline / Notes) ──────────────

const TaskWithMeta = ({
  task,
  docRecord,
  onToggle,
}: {
  task: TaskItem;
  docRecord: DocRecord;
  onToggle: () => void;
}) => {
  const properties = useLiveData(docRecord.properties$) as Record<
    string,
    string | undefined
  >;

  const statusKey = `task_${task.id}_status`;
  const priorityKey = `task_${task.id}_priority`;
  const deadlineKey = `task_${task.id}_deadline`;
  const notesKey = `task_${task.id}_notes`;

  const status = properties[`custom:${statusKey}`] ?? '';
  const priority = properties[`custom:${priorityKey}`] ?? '';
  const deadline = properties[`custom:${deadlineKey}`] ?? '';
  const notes = properties[`custom:${notesKey}`] ?? '';

  const handleToggle = useCallback(() => {
    onToggle();
    if (!task.checked) {
      docRecord.setCustomProperty(statusKey, 'completed');
    } else if (status === 'completed') {
      docRecord.setCustomProperty(statusKey, '');
    }
  }, [onToggle, task.checked, docRecord, statusKey, status]);

  return (
    <div className={styles.taskWithMeta}>
      <label className={styles.taskRow}>
        <Checkbox checked={task.checked} onChange={handleToggle} />
        <span className={styles.taskText} data-checked={task.checked}>
          {task.text}
        </span>
      </label>
      <div className={styles.taskMetaRow}>
        <select
          className={styles.metaStatusSelect}
          data-status={status}
          value={status}
          onChange={e => docRecord.setCustomProperty(statusKey, e.target.value)}
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className={styles.metaPrioritySelect}
          data-priority={priority}
          value={priority}
          onChange={e =>
            docRecord.setCustomProperty(priorityKey, e.target.value)
          }
        >
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={styles.taskMetaDate}
          value={deadline}
          onChange={e =>
            docRecord.setCustomProperty(deadlineKey, e.target.value)
          }
        />
        <input
          type="text"
          className={styles.taskMetaNotes}
          value={notes}
          placeholder="Notes…"
          onChange={e => docRecord.setCustomProperty(notesKey, e.target.value)}
        />
      </div>
    </div>
  );
};

/**
 * "Today's Tasks" section shown on journal docs above the editor body.
 * Tasks are stored in the shared `Todo · DATE` doc so they stay in sync
 * with the All Todos page.
 */
export const JournalTodayTasks = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);

  const dateStr = useLiveData(journalService.journalDate$(page.id));

  // DocRecord for this journal — used only to detect meeting docs
  const docRecordLiveData$ = useMemo(
    () => docsService.list.doc$(page.id),
    [docsService, page.id]
  );

  const isMeetingDocLiveData$ = useMemo(
    () =>
      LiveData.computed(get => {
        const record = get(docRecordLiveData$);
        if (!record) return false;
        return (get(record.meta$)?.title ?? '').startsWith('Meeting · ');
      }),
    [docRecordLiveData$]
  );
  const isMeetingDoc = useLiveData(isMeetingDocLiveData$) ?? false;

  // Find the Todo · DATE doc for this journal date (shared with All Todos).
  // Computed inside LiveData so the result is a stable DocRecord reference.
  const todoDocRecord$ = useMemo(
    () =>
      LiveData.computed(get => {
        if (!dateStr) return null;
        const docs = get(journalService.journalsByDate$(dateStr)) ?? [];
        return (
          docs.find(doc =>
            (get(doc.meta$)?.title ?? '').startsWith('Todo ·')
          ) ?? null
        );
      }),
    [journalService, dateStr]
  );
  const todoDocRecord = useLiveData(todoDocRecord$);

  // Open the Todo doc's store and listen for block changes
  const [todoStore, setTodoStore] = useState<any>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    if (!todoDocRecord) {
      setTodoStore(null);
      setTasks([]);
      return;
    }
    let cleanup: (() => void) | undefined;
    try {
      const { doc: openedDoc, release } = docsService.open(todoDocRecord.id);
      const s = openedDoc.blockSuiteDoc;
      s.load();
      setTodoStore(s);
      const read = () => setTasks(collectTasks(s));
      read();
      const sub = s.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        setTodoStore(null);
      };
    } catch {
      setTasks([]);
    }
    return () => cleanup?.();
  }, [todoDocRecord, docsService]);

  const toggleTask = useCallback(
    (task: TaskItem) => {
      if (!todoStore) return;
      const block = todoStore.getBlock(task.id);
      if (!block) return;
      todoStore.updateBlock(block.model, { checked: !task.checked });
    },
    [todoStore]
  );

  const [draft, setDraft] = useState('');
  const addTask = useCallback(() => {
    const text = draft.trim();
    if (!text || !dateStr) return;
    setDraft('');

    if (todoStore) {
      const note = todoStore.getBlocksByFlavour('affine:note')[0];
      if (note) {
        todoStore.addBlock(
          'affine:list',
          { type: 'todo', text: new Text(text) },
          note.id
        );
      }
    } else {
      // No Todo doc yet — create one (same format as All Todos page)
      const day = dayjs(dateStr);
      const newDoc = docsService.createDoc({
        title: `Todo · ${day.format('MMM D, YYYY')}`,
        docProps: {
          onStoreLoad: (store: any, { noteId }: { noteId: string }) => {
            store.addBlock(
              'affine:list',
              { type: 'todo', text: new Text(text) },
              noteId
            );
          },
        },
      });
      journalService.setJournalDate(newDoc.id, dateStr);
      journalService.ensureJournalByDate(dateStr);
    }
  }, [draft, dateStr, todoStore, docsService, journalService]);

  if (!dateStr || isMeetingDoc) return null;

  return (
    <div className={styles.container} data-testid="journal-today-tasks">
      <div className={styles.section}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.title}>Today&apos;s Todo</span>
          </div>
          {tasks.map(task =>
            todoDocRecord ? (
              <TaskWithMeta
                key={task.id}
                task={task}
                docRecord={todoDocRecord}
                onToggle={() => toggleTask(task)}
              />
            ) : (
              <label key={task.id} className={styles.taskRow}>
                <Checkbox
                  checked={task.checked}
                  onChange={() => toggleTask(task)}
                />
                <span className={styles.taskText} data-checked={task.checked}>
                  {task.text}
                </span>
              </label>
            )
          )}
          <div className={styles.addRow}>
            <Checkbox checked={false} disabled />
            <input
              className={styles.addInput}
              placeholder="新增待辦事項，按 Enter 加入..."
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  addTask();
                }
              }}
              data-testid="journal-today-tasks-input"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
