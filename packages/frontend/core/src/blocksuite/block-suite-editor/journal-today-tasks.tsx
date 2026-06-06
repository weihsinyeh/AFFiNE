import { Checkbox } from '@affine/component';
import { DocsService } from '@affine/core/modules/doc';
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
        </div>
      </div>
    </div>
  );
};
