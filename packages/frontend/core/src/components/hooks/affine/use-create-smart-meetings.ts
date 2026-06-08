import type { SmartMeetingItem } from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import { DocsService } from '@affine/core/modules/doc';
import { JournalService } from '@affine/core/modules/journal';
import { Text } from '@blocksuite/affine/store';
import { useService } from '@toeverything/infra';
import dayjs from 'dayjs';
import { useCallback } from 'react';

/**
 * Create per-day "Meeting · <date>" docs on the journal calendar from items
 * extracted by "AI智慧新增todo及meeting". Mirrors the calendar's
 * "New Meeting Note" creation flow (title prefix + Meeting Notes heading +
 * Location / Discussion Points sections, setJournalDate + linked doc) so the
 * meetings show up on the day cells and the journal's meeting list.
 */
export const useCreateSmartMeetings = () => {
  const docsService = useService(DocsService);
  const journalService = useService(JournalService);

  return useCallback(
    async (meetings: SmartMeetingItem[]) => {
      const created: { date: string; title: string }[] = [];
      for (const meeting of meetings) {
        const day = dayjs(meeting.date);
        const title = meeting.title?.trim();
        if (!day.isValid() || !title) continue;
        const dateKey = day.format('YYYY-MM-DD');
        const notes = meeting.notes?.trim() ?? '';
        const newDoc = docsService.createDoc({
          title: `Meeting · ${day.format('MMM D, YYYY')}`,
          docProps: {
            paragraph: { type: 'h3', text: new Text(title) },
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
                { text: new Text(notes) },
                noteId
              );
            },
          },
        });
        const journalDoc = journalService.ensureJournalByDate(dateKey);
        journalService.setJournalDate(newDoc.id, dateKey);
        docsService.addLinkedDoc(journalDoc.id, newDoc.id).catch(console.error);
        created.push({ date: dateKey, title });
      }
      return created;
    },
    [docsService, journalService]
  );
};
