import * as Calendar from 'expo-calendar';
import { BillReminder } from '@/types';

const CALENDAR_NAME = 'FinTrack Reminders';

async function requestCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === 'granted';
}

export async function getOrCreateCalendar(): Promise<string | null> {
  const hasPermission = await requestCalendarPermission();
  if (!hasPermission) return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existingCalendar = calendars.find(cal => cal.title === CALENDAR_NAME);

  if (existingCalendar) {
    return existingCalendar.id;
  }

  const defaultCalendarSource = calendars[0];
  if (!defaultCalendarSource?.source) {
    console.warn('No calendar source found');
    return null;
  }

  const newCalendar = await Calendar.createCalendarAsync({
    title: CALENDAR_NAME,
    color: '#00D09C',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultCalendarSource.source.id,
    timeZone: 'Asia/Jakarta',
  });

  return newCalendar;
}

export async function syncBillToCalendar(bill: BillReminder): Promise<string | null> {
  const calendarId = await getOrCreateCalendar();
  if (!calendarId) return null;

  const startDate = new Date(bill.due_date);
  const endDate = new Date(bill.due_date);
  endDate.setHours(endDate.getHours() + 1);

  const eventId = await Calendar.createEventAsync(calendarId, {
    title: `📅 ${bill.name}`,
    startDate,
    endDate,
    allDay: true,
    notes: bill.notes || `Tagihan ${bill.name} - ${bill.amount}`,
    alarms: [{ relativeOffset: -1440 }],
  });

  return eventId;
}

export async function deleteEventFromCalendar(eventId: string): Promise<void> {
  if (!eventId) return;

  try {
    await Calendar.deleteEventAsync(eventId);
  } catch (e) {
    console.warn('Failed to delete calendar event:', e);
  }
}

export async function updateEventInCalendar(oldEventId: string, bill: BillReminder): Promise<string | null> {
  if (oldEventId) {
    await deleteEventFromCalendar(oldEventId);
  }

  return syncBillToCalendar(bill);
}