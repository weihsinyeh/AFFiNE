import { Checkbox } from '@affine/component';
import { DocsService } from '@affine/core/modules/doc';
import type { DocRecord } from '@affine/core/modules/doc/entities/record';
import { JournalService } from '@affine/core/modules/journal';
import { WorkbenchService } from '@affine/core/modules/workbench';
import type { Store } from '@blocksuite/affine/store';
import { Text } from '@blocksuite/affine/store';
import { ExpandFullIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as styles from './journal-today-tasks.css';

type TaskItem = {
  id: string;
  text: string;
  checked: boolean;
};

const collectTasks = (store: Store): TaskItem[] => {
  return (
    store
      .getBlocksByFlavour('affine:list')
      .filter(block => {
        const model = block.model as unknown as {
          props?: { type?: string };
        };
        return model.props?.type === 'todo';
      })
      .map(block => {
        const model = block.model as unknown as {
          props?: { text?: { toString: () => string }; checked?: boolean };
        };
        return {
          id: block.id,
          text: model.props?.text?.toString() ?? '',
          checked: !!model.props?.checked,
        };
      })
      // hide empty placeholder items (e.g. from previously created todo docs)
      .filter(task => task.text.trim().length > 0)
  );
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

// ── Synced metadata fields (Status / Priority / Deadline / Notes) ──────────

const TodoMeta = ({ docRecord }: { docRecord: DocRecord }) => {
  const properties = useLiveData(docRecord.properties$) as Record<
    string,
    string | undefined
  >;
  const status = properties['custom:todo_status'] ?? '';
  const priority = properties['custom:todo_priority'] ?? '';
  const deadline = properties['custom:todo_deadline'] ?? '';
  const notes = properties['custom:todo_notes'] ?? '';

  return (
    <div className={styles.metaSection}>
      <div className={styles.metaRow}>
        <div className={styles.metaField}>
          <span className={styles.metaLabel}>Status</span>
          <select
            className={styles.metaStatusSelect}
            data-status={status}
            value={status}
            onChange={e =>
              docRecord.setCustomProperty('todo_status', e.target.value)
            }
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.metaField}>
          <span className={styles.metaLabel}>Priority</span>
          <select
            className={styles.metaPrioritySelect}
            data-priority={priority}
            value={priority}
            onChange={e =>
              docRecord.setCustomProperty('todo_priority', e.target.value)
            }
          >
            {PRIORITY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.metaRow}>
        <div className={styles.metaField}>
          <span className={styles.metaLabel}>Deadline</span>
          <input
            type="date"
            className={styles.metaDateInput}
            value={deadline}
            onChange={e =>
              docRecord.setCustomProperty('todo_deadline', e.target.value)
            }
          />
        </div>
        <div className={styles.metaField}>
          <span className={styles.metaLabel}>Notes</span>
          <input
            type="text"
            className={styles.metaNotesInput}
            value={notes}
            placeholder="Add notes…"
            onChange={e =>
              docRecord.setCustomProperty('todo_notes', e.target.value)
            }
          />
        </div>
      </div>
    </div>
  );
};

/**
 * "Today's Tasks" section shown on every journal doc, between the date
 * title and the Info table. It surfaces the day's `Todo · <date>` doc
 * (the same docs created by the calendar "New Todo" and the
 * "智慧增加todo list" chat mode): tasks can be checked off or added
 * inline, and the doc is created on first add when missing.
 */
export const JournalTodayTasks = ({ page }: { page: Store }) => {
  const journalService = useService(JournalService);
  const docsService = useService(DocsService);
  const workbench = useService(WorkbenchService).workbench;

  const dateStr = useLiveData(journalService.journalDate$(page.id));
  const journalsByDate$ = useMemo(
    () => journalService.journalsByDate$(dateStr ?? ''),
    [journalService, dateStr]
  );
  const docRecords = useLiveData(journalsByDate$);

  const todoDocId = useMemo(() => {
    return docRecords?.find(record =>
      (record.meta$.value.title || '').startsWith('Todo ·')
    )?.id;
  }, [docRecords]);

  // Todo/Meeting docs are journal-dated too (setJournalDate), but the
  // section belongs on the actual journal doc only — a Todo doc already IS
  // the task list, so rendering the section there would show it twice.
  const isAuxiliaryDoc = useMemo(() => {
    const record = docRecords?.find(r => r.id === page.id);
    const title = record?.meta$.value.title || '';
    return title.startsWith('Todo ·') || title.startsWith('Meeting ·');
  }, [docRecords, page.id]);

  // DocRecord for the todo doc — used for metadata fields
  const todoDocRecord = useLiveData(
    useMemo(
      () => docsService.list.doc$(todoDocId ?? ''),
      [docsService, todoDocId]
    )
  );

  const [todoStore, setTodoStore] = useState<Store | null>(null);
  useEffect(() => {
    if (!todoDocId) {
      setTodoStore(null);
      return;
    }
    try {
      const { doc, release } = docsService.open(todoDocId);
      const store = doc.blockSuiteDoc;
      store.load();
      setTodoStore(store);
      return () => {
        setTodoStore(null);
        release();
      };
    } catch {
      setTodoStore(null);
      return;
    }
  }, [todoDocId, docsService]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  useEffect(() => {
    if (!todoStore) {
      setTasks([]);
      return;
    }
    const read = () => setTasks(collectTasks(todoStore));
    read();
    const subscription = todoStore.slots.blockUpdated.subscribe(read);
    return () => subscription.unsubscribe();
  }, [todoStore]);

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
      if (!note) return;
      todoStore.addBlock(
        'affine:list',
        { type: 'todo', text: new Text(text) },
        note.id
      );
      return;
    }
    // no Todo doc for this day yet — create one, mirroring the calendar's
    // "New Todo" flow so it shows up as a Todo tag on the day cell
    const day = dayjs(dateStr);
    const newDoc = docsService.createDoc({
      title: `Todo · ${day.format('MMM D, YYYY')}`,
      docProps: {
        paragraph: { type: 'h3', text: new Text("Today's Tasks") },
        onStoreLoad: (store, { noteId }) => {
          store.addBlock(
            'affine:list',
            { type: 'todo', text: new Text(text) },
            noteId
          );
        },
      },
    });
    // connected via setJournalDate only — this section already surfaces
    // the todo, so no linked-doc paragraph is inserted into the body
    journalService.setJournalDate(newDoc.id, dateStr);
  }, [draft, dateStr, todoStore, docsService, journalService]);

  const openTodoDoc = useCallback(() => {
    if (todoDocId) {
      workbench.openDoc(todoDocId, { at: 'active' });
    }
  }, [todoDocId, workbench]);

  if (!dateStr || isAuxiliaryDoc) return null;

  return (
    <div className={styles.container} data-testid="journal-today-tasks">
      <div className={styles.section}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.title}>Today&apos;s Tasks</span>
            {todoDocId ? (
              <div
                className={styles.openButton}
                onClick={openTodoDoc}
                data-testid="journal-today-tasks-open"
              >
                <ExpandFullIcon width={16} height={16} />
              </div>
            ) : null}
          </div>
          {tasks.map(task => (
            <label key={task.id} className={styles.taskRow}>
              <Checkbox
                checked={task.checked}
                onChange={() => toggleTask(task)}
              />
              <span className={styles.taskText} data-checked={task.checked}>
                {task.text}
              </span>
            </label>
          ))}
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
          {todoDocRecord && <TodoMeta docRecord={todoDocRecord} />}
        </div>
      </div>
    </div>
  );
};
