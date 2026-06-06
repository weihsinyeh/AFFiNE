import { DocsService } from '@affine/core/modules/doc';
import type { DocRecord } from '@affine/core/modules/doc/entities/record';
import { JournalService } from '@affine/core/modules/journal';
import {
  ViewBody,
  ViewHeader,
  ViewIcon,
  ViewTitle,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import { Text } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AllDocSidebarTabs } from '../layouts/all-doc-sidebar-tabs';
import * as styles from './index.css';

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

type TaskItem = { id: string; text: string; checked: boolean };

type RichTask = {
  task: TaskItem;
  docRecord: DocRecord;
  store: any;
  dateLabel: string;
};

const PRIORITY_ORDER: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
  '': 4,
};

const collectTasks = (store: any): TaskItem[] =>
  store
    .getBlocksByFlavour('affine:list')
    .filter((b: any) => b.model.props?.type === 'todo')
    .map((b: any) => ({
      id: b.id,
      text: b.model.props?.text?.toString() ?? '',
      checked: !!b.model.props?.checked,
    }))
    .filter((t: TaskItem) => t.text.trim().length > 0);

// ── One table row per task item ────────────────────────────────────────────

const TaskRow = ({
  task,
  docRecord,
  store,
  dateLabel,
}: {
  task: TaskItem;
  docRecord: DocRecord;
  store: any;
  dateLabel?: string;
}) => {
  const properties = useLiveData(docRecord.properties$) as Record<
    string,
    string | undefined
  >;
  const [isEditing, setIsEditing] = useState(false);
  const [editingText, setEditingText] = useState('');

  const statusKey = `task_${task.id}_status`;
  const priorityKey = `task_${task.id}_priority`;
  const deadlineKey = `task_${task.id}_deadline`;
  const notesKey = `task_${task.id}_notes`;

  const status = properties[`custom:${statusKey}`] ?? '';
  const priority = properties[`custom:${priorityKey}`] ?? '';
  const deadline = properties[`custom:${deadlineKey}`] ?? '';
  const notes = properties[`custom:${notesKey}`] ?? '';

  const toggleTask = useCallback(() => {
    const block = store?.getBlock(task.id);
    if (block) store.updateBlock(block.model, { checked: !task.checked });
  }, [store, task.id, task.checked]);

  const startEdit = useCallback(() => {
    setEditingText(task.text);
    setIsEditing(true);
  }, [task.text]);

  const commitEdit = useCallback(() => {
    const text = editingText.trim();
    if (text) {
      const block = store?.getBlock(task.id);
      if (block) store.updateBlock(block.model, { text: new Text(text) });
    }
    setIsEditing(false);
  }, [store, task.id, editingText]);

  return (
    <tr className={styles.todoRow}>
      <td className={styles.todoCell}>
        <div className={styles.taskItem}>
          <input
            type="checkbox"
            className={styles.taskCheckbox}
            checked={task.checked}
            onChange={toggleTask}
          />
          {isEditing ? (
            <input
              className={styles.taskEditInput}
              value={editingText}
              autoFocus
              onChange={e => setEditingText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                  commitEdit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
            />
          ) : (
            <>
              <span
                className={styles.taskText}
                data-checked={task.checked}
                onClick={startEdit}
                title="Click to edit"
              >
                {task.text}
              </span>
              {dateLabel && (
                <span className={styles.taskDateBadge}>{dateLabel}</span>
              )}
            </>
          )}
        </div>
      </td>
      <td className={styles.statusCell}>
        <select
          className={styles.statusSelect}
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
      </td>
      <td className={styles.priorityCell}>
        <select
          className={styles.prioritySelect}
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
      </td>
      <td className={styles.deadlineCell}>
        <input
          type="date"
          className={styles.dateInput}
          value={deadline}
          onChange={e =>
            docRecord.setCustomProperty(deadlineKey, e.target.value)
          }
        />
      </td>
      <td className={styles.notesCell}>
        <input
          type="text"
          className={styles.notesInput}
          value={notes}
          placeholder="Add notes…"
          onChange={e => docRecord.setCustomProperty(notesKey, e.target.value)}
        />
      </td>
    </tr>
  );
};

// ── All tasks for one todo doc, grouped under a date header ────────────────

const TodoDocSection = ({ doc }: { doc: DocRecord }) => {
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [store, setStore] = useState<any>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const trash = useLiveData(doc.trash$);
  const title = useLiveData(doc.title$);

  useEffect(() => {
    if (trash || !title.startsWith('Todo ·')) return;
    let cleanup: (() => void) | undefined;
    try {
      const { doc: openedDoc, release } = docsService.open(doc.id);
      const s = openedDoc.blockSuiteDoc;
      s.load();
      setStore(s);
      const read = () => setTasks(collectTasks(s));
      read();
      const sub = s.slots.blockUpdated.subscribe(read);
      cleanup = () => {
        sub.unsubscribe();
        release();
        setStore(null);
      };
    } catch {
      setTasks([]);
    }
    return () => cleanup?.();
  }, [doc.id, docsService, trash, title]);

  useEffect(() => {
    if (addingTask) addInputRef.current?.focus();
  }, [addingTask]);

  const openDoc = useCallback(() => {
    workbench.openDoc(doc.id, { at: 'active' });
  }, [workbench, doc.id]);

  const commitAdd = useCallback(() => {
    const text = newTaskText.trim();
    if (text && store) {
      const note = store.getBlocksByFlavour('affine:note')[0];
      if (note) {
        store.addBlock(
          'affine:list',
          { type: 'todo', text: new Text(text) },
          note.id
        );
      }
    }
    setNewTaskText('');
    setAddingTask(false);
  }, [store, newTaskText]);

  if (trash || !title.startsWith('Todo ·')) return null;

  const dateLabel = title.replace(/^Todo · /, '');

  return (
    <>
      <tr className={styles.dateHeaderRow}>
        <td colSpan={5} className={styles.dateHeaderCell}>
          <button className={styles.dateLink} onClick={openDoc} title={title}>
            {dateLabel}
          </button>
        </td>
      </tr>
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} docRecord={doc} store={store} />
      ))}
      {addingTask ? (
        <tr className={styles.todoRow}>
          <td className={styles.todoCell} colSpan={5}>
            <div className={styles.taskItem}>
              <input
                type="checkbox"
                className={styles.taskCheckbox}
                checked={false}
                disabled
                readOnly
              />
              <input
                ref={addInputRef}
                className={styles.taskEditInput}
                value={newTaskText}
                placeholder="New task…"
                onChange={e => setNewTaskText(e.target.value)}
                onBlur={commitAdd}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                    commitAdd();
                  if (e.key === 'Escape') {
                    setNewTaskText('');
                    setAddingTask(false);
                  }
                }}
              />
            </div>
          </td>
        </tr>
      ) : (
        <tr className={styles.addTaskRow}>
          <td colSpan={5} className={styles.addTaskCell}>
            <button
              className={styles.addTaskBtn}
              onClick={() => setAddingTask(true)}
            >
              + Add task
            </button>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Sorted flat task list across all todo docs ─────────────────────────────

const SortedTaskList = ({
  todoDocs,
  sortMode,
}: {
  todoDocs: DocRecord[];
  sortMode: 'deadline' | 'priority';
}) => {
  const docsService = useService(DocsService);
  const [docTasks, setDocTasks] = useState<
    Map<string, { store: any; tasks: TaskItem[] }>
  >(new Map());

  const [docProps, setDocProps] = useState<
    Map<string, Record<string, string | undefined>>
  >(new Map());

  useEffect(() => {
    const taskMap = new Map<string, { store: any; tasks: TaskItem[] }>();
    const cleanups: (() => void)[] = [];
    for (const doc of todoDocs) {
      try {
        const { doc: openedDoc, release } = docsService.open(doc.id);
        const store = openedDoc.blockSuiteDoc;
        store.load();
        taskMap.set(doc.id, { store, tasks: collectTasks(store) });
        const sub = store.slots.blockUpdated.subscribe(() => {
          taskMap.set(doc.id, { store, tasks: collectTasks(store) });
          setDocTasks(new Map(taskMap));
        });
        cleanups.push(() => {
          sub.unsubscribe();
          release();
        });
      } catch {
        // skip unavailable docs
      }
    }
    setDocTasks(new Map(taskMap));
    return () => cleanups.forEach(fn => fn());
  }, [todoDocs, docsService]);

  useEffect(() => {
    const propsMap = new Map<string, Record<string, string | undefined>>();
    const subs: Array<{ unsubscribe(): void }> = [];
    for (const doc of todoDocs) {
      const update = (props: unknown) => {
        propsMap.set(
          doc.id,
          (props ?? {}) as Record<string, string | undefined>
        );
        setDocProps(new Map(propsMap));
      };
      propsMap.set(
        doc.id,
        ((doc.properties$ as any).value ?? {}) as Record<
          string,
          string | undefined
        >
      );
      const sub = (doc.properties$ as any).subscribe(update);
      if (sub?.unsubscribe) subs.push(sub);
    }
    setDocProps(new Map(propsMap));
    return () => subs.forEach(s => s.unsubscribe());
  }, [todoDocs]);

  const sortedTasks = useMemo(() => {
    const all: RichTask[] = [];
    for (const doc of todoDocs) {
      const data = docTasks.get(doc.id);
      if (!data?.store) continue;
      const title = doc.meta$.value.title ?? '';
      const dateLabel = title.replace(/^Todo · /, '');
      for (const task of data.tasks) {
        all.push({ task, docRecord: doc, store: data.store, dateLabel });
      }
    }
    return [...all].sort((a, b) => {
      const ap = docProps.get(a.docRecord.id) ?? {};
      const bp = docProps.get(b.docRecord.id) ?? {};
      const ad = ap[`custom:task_${a.task.id}_deadline`] || 'zzzz';
      const bd = bp[`custom:task_${b.task.id}_deadline`] || 'zzzz';
      const apr =
        PRIORITY_ORDER[ap[`custom:task_${a.task.id}_priority`] ?? ''] ?? 4;
      const bpr =
        PRIORITY_ORDER[bp[`custom:task_${b.task.id}_priority`] ?? ''] ?? 4;
      if (sortMode === 'deadline') {
        return ad !== bd ? (ad < bd ? -1 : 1) : apr - bpr;
      } else {
        return apr !== bpr ? apr - bpr : ad < bd ? -1 : ad > bd ? 1 : 0;
      }
    });
  }, [docTasks, todoDocs, sortMode, docProps]);

  return (
    <>
      {sortedTasks.map(({ task, docRecord, store, dateLabel }) => (
        <TaskRow
          key={task.id}
          task={task}
          docRecord={docRecord}
          store={store}
          dateLabel={dateLabel}
        />
      ))}
    </>
  );
};

// ── Inline new-todo creation row ───────────────────────────────────────────

const NewTodoRow = ({ onClose }: { onClose: () => void }) => {
  const docsService = useService(DocsService);
  const journalService = useService(JournalService);
  const taskInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [taskText, setTaskText] = useState('');

  useEffect(() => {
    taskInputRef.current?.focus();
  }, []);

  const handleCreate = useCallback(() => {
    if (!date) return;
    const day = dayjs(date);
    const dateKey = day.format('YYYY-MM-DD');
    const text = taskText.trim();

    const existing = journalService
      .journalsByDate$(dateKey)
      .value.find(doc => (doc.meta$.value.title ?? '').startsWith('Todo ·'));

    if (existing) {
      // Add the task to the existing todo doc
      if (text) {
        try {
          const { doc: openedDoc, release } = docsService.open(existing.id);
          const store = openedDoc.blockSuiteDoc;
          store.load();
          const note = store.getBlocksByFlavour('affine:note')[0];
          if (note) {
            store.addBlock(
              'affine:list',
              { type: 'todo', text: new Text(text) },
              note.id
            );
          }
          release();
        } catch {
          // doc not yet available — skip adding the task block
        }
      }
    } else {
      const newDoc = docsService.createDoc({
        title: `Todo · ${day.format('MMM D, YYYY')}`,
        docProps: {
          paragraph: { type: 'h3', text: new Text("Today's Tasks") },
          ...(text
            ? {
                onStoreLoad: (store: any, { noteId }: { noteId: string }) => {
                  store.addBlock(
                    'affine:list',
                    { type: 'todo', text: new Text(text) },
                    noteId
                  );
                },
              }
            : {}),
        },
      });
      journalService.setJournalDate(newDoc.id, dateKey);
      journalService.ensureJournalByDate(dateKey);
    }
    onClose();
  }, [date, taskText, docsService, journalService, onClose]);

  return (
    <tr className={styles.newTodoRow}>
      <td colSpan={5} className={styles.newTodoCell}>
        <div className={styles.newTodoForm}>
          <span className={styles.newTodoLabel}>Date</span>
          <input
            type="date"
            className={styles.newTodoDateInput}
            value={date}
            onChange={e => setDate(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
            }}
          />
          <span className={styles.newTodoLabel}>Task</span>
          <input
            ref={taskInputRef}
            type="text"
            className={styles.newTodoTaskInput}
            value={taskText}
            placeholder="Task content…"
            onChange={e => setTaskText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                handleCreate();
              if (e.key === 'Escape') onClose();
            }}
          />
          <button className={styles.newTodoConfirm} onClick={handleCreate}>
            Create
          </button>
          <button className={styles.newTodoCancel} onClick={onClose}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Page ───────────────────────────────────────────────────────────────────

const AllTodosPage = () => {
  const docsService = useService(DocsService);
  const allDocs = useLiveData(docsService.list.docs$);
  const [creating, setCreating] = useState(false);
  const [sortMode, setSortMode] = useState<'deadline' | 'priority' | ''>('');

  const todoDocs = useMemo(
    () =>
      allDocs.filter(
        doc =>
          !doc.meta$.value.trash &&
          (doc.meta$.value.title ?? '').startsWith('Todo ·')
      ),
    [allDocs]
  );

  return (
    <>
      <ViewTitle title="All Todos" />
      <ViewIcon icon="allTodos" />
      <ViewHeader>
        <div className={styles.header}>
          <span className={styles.headerTitle}>All Todos</span>
          <span className={styles.headerCount}>{todoDocs.length}</span>
          <div className={styles.headerSpacer} />
          <select
            className={styles.sortSelector}
            value={sortMode}
            onChange={e =>
              setSortMode(e.target.value as 'deadline' | 'priority' | '')
            }
          >
            <option value="">Sort: Default</option>
            <option value="deadline">Sort: Deadline ↑</option>
            <option value="priority">Sort: Priority ↓</option>
          </select>
          <button
            className={styles.newTodoBtn}
            onClick={() => setCreating(true)}
          >
            + New Todo
          </button>
        </div>
      </ViewHeader>
      <ViewBody>
        <div className={styles.body}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Todo</th>
                  <th className={styles.th}>Status</th>
                  <th className={styles.th}>Priority</th>
                  <th className={styles.th}>Deadline</th>
                  <th className={styles.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {creating && <NewTodoRow onClose={() => setCreating(false)} />}
                {sortMode ? (
                  <SortedTaskList todoDocs={todoDocs} sortMode={sortMode} />
                ) : (
                  todoDocs.map(doc => <TodoDocSection key={doc.id} doc={doc} />)
                )}
              </tbody>
            </table>
            {todoDocs.length === 0 && !creating && (
              <div className={styles.empty}>No todos yet</div>
            )}
          </div>
        </div>
      </ViewBody>
      <AllDocSidebarTabs />
    </>
  );
};

export const Component = () => <AllTodosPage />;
