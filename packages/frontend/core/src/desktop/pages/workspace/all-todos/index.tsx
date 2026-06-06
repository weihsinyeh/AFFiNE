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
}: {
  task: TaskItem;
  docRecord: DocRecord;
  store: any;
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
            <span
              className={styles.taskText}
              data-checked={task.checked}
              onClick={startEdit}
              title="Click to edit"
            >
              {task.text}
            </span>
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
                {todoDocs.map(doc => (
                  <TodoDocSection key={doc.id} doc={doc} />
                ))}
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
