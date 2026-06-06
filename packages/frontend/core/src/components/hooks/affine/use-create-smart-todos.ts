import type { SmartTodoItem } from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import { DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { Text } from '@blocksuite/affine/store';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback } from 'react';

/**
 * Create per-day "Todo · <date>" docs on the journal calendar from items
 * extracted by the "智慧增加todo list" chat mode. Mirrors the calendar's
 * "New Todo" creation flow (title prefix + setJournalDate + journal link)
 * so the docs show up as Todo tags on the day cells.
 */
export const useCreateSmartTodos = () => {
  const docsService = useService(DocsService);
  const journalService = useService(JournalService);

  return useCallback(
    async (todos: SmartTodoItem[]) => {
      const created: { date: string; count: number }[] = [];
      for (const todo of todos) {
        const day = dayjs(todo.date);
        const tasks = todo.tasks.filter(task => task.trim().length > 0);
        if (!day.isValid() || tasks.length === 0) continue;
        const dateKey = day.format('YYYY-MM-DD');
        const title = `Todo · ${day.format('MMM D, YYYY')}`;
        const newDoc = docsService.createDoc({
          title,
          docProps: {
            paragraph: { type: 'h3', text: new Text("Today's Tasks") },
            onStoreLoad: (store, { noteId }) => {
              for (const task of tasks) {
                store.addBlock(
                  'affine:list',
                  { type: 'todo', text: new Text(task) },
                  noteId
                );
              }
            },
          },
        });
        // ensure the day's journal exists; the todo connects to it via
        // setJournalDate only — the journal's "Today's Tasks" section
        // surfaces it, so no linked-doc paragraph is inserted into the body
        journalService.ensureJournalByDate(dateKey);
        journalService.setJournalDate(newDoc.id, dateKey);
        created.push({ date: dateKey, count: tasks.length });
      }
      return created;
    },
    [docsService, journalService]
  );
};
