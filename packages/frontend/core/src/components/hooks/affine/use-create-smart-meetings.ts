import type { SmartMeetingItem } from '@affine/core/blocksuite/ai/runtime/request/gemini-direct';
import {
  generateMeetingRoomUrl,
  MEETING_PROP,
} from '@affine/core/desktop/pages/workspace/detail-page/tabs/journal/meeting-utils';
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
        const location = meeting.location?.trim() ?? '';
        const newDoc = docsService.createDoc({
          // Use the AI-extracted name as the meeting title so it shows up in
          // the calendar / meeting editor (still prefixed so it's recognised
          // as a meeting doc).
          title: `Meeting · ${title}`,
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
                { text: new Text(location) },
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

        // Mirror the AI-extracted schedule into the same custom properties the
        // in-calendar meeting editor reads, so name/time/location (and an
        // auto-generated video link for online meetings) show up there too.
        newDoc.setCustomProperty(MEETING_PROP.startDate, dateKey);
        newDoc.setCustomProperty(MEETING_PROP.endDate, dateKey);
        if (meeting.startTime) {
          newDoc.setCustomProperty(MEETING_PROP.startTime, meeting.startTime);
        }
        if (meeting.endTime) {
          newDoc.setCustomProperty(MEETING_PROP.endTime, meeting.endTime);
        }
        if (location) {
          newDoc.setCustomProperty(MEETING_PROP.location, location);
        }
        if (meeting.online) {
          newDoc.setCustomProperty(
            MEETING_PROP.videoLink,
            generateMeetingRoomUrl(title)
          );
        }

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
