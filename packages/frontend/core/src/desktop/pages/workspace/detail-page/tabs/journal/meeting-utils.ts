/**
 * Shared meeting metadata: the custom-property keys a meeting doc stores its
 * schedule details under, and the video-link generator. Used by the in-calendar
 * meeting editor and by the "AI智慧新增todo及meeting" creation flow so the two
 * stay consistent.
 */

/** Custom-property keys for a meeting doc's scheduling details. */
export const MEETING_PROP = {
  allDay: 'meeting_allDay',
  startDate: 'meeting_startDate',
  endDate: 'meeting_endDate',
  startTime: 'meeting_startTime',
  endTime: 'meeting_endTime',
  repeat: 'meeting_repeat',
  repeatUntil: 'meeting_repeatUntil',
  location: 'meeting_location',
  videoLink: 'meeting_videoLink',
};

// Hostpoint Meet is a free, Swiss-hosted, account-free Jitsi service: visiting
// https://meet.hostpoint.ch/<room> opens (or creates) that room, the link
// doesn't expire, and it can be reopened any time — so a generated link works
// as a real video call whenever it's clicked. We just mint a hard-to-guess
// room name on the client; no API, key, or login needed.
export const VIDEO_MEETING_BASE = 'https://meet.hostpoint.ch';

export const generateMeetingRoomUrl = (title: string) => {
  const slug = title
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .toLowerCase();
  const bytes = new Uint8Array(9);
  (globalThis.crypto ?? window.crypto).getRandomValues(bytes);
  const token = Array.from(bytes, b => b.toString(36))
    .join('')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 12);
  const room = `inote-${slug ? `${slug}-` : ''}${token}`;
  return `${VIDEO_MEETING_BASE}/${room}`;
};
