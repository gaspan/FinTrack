import dayjs, { Dayjs } from 'dayjs';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export function addRecurrence(date: Dayjs, frequency: RecurrenceFrequency, anchorDay = date.date()): Dayjs {
  if (frequency === 'daily') return date.add(1, 'day');
  if (frequency === 'weekly') return date.add(1, 'week');

  const months = frequency === 'yearly' ? 12 : frequency === 'quarterly' ? 3 : 1;
  const targetMonth = date.startOf('month').add(months, 'month');
  return targetMonth.date(Math.min(anchorDay, targetMonth.daysInMonth())).startOf('day');
}

export function expandRecurrence(
  startDate: string,
  frequency: RecurrenceFrequency,
  rangeStart: string,
  rangeEnd: string
): string[] {
  let occurrence = dayjs(startDate).startOf('day');
  const start = dayjs(rangeStart).startOf('day');
  const end = dayjs(rangeEnd).startOf('day');
  if (!occurrence.isValid() || !start.isValid() || !end.isValid() || end.isBefore(start, 'day')) return [];

  const anchorDay = occurrence.date();
  let guard = 0;
  while (occurrence.isBefore(start, 'day') && guard < 2000) {
    occurrence = addRecurrence(occurrence, frequency, anchorDay);
    guard++;
  }

  const dates: string[] = [];
  while (!occurrence.isAfter(end, 'day') && guard < 4000) {
    dates.push(occurrence.format('YYYY-MM-DD'));
    occurrence = addRecurrence(occurrence, frequency, anchorDay);
    guard++;
  }
  return dates;
}

export function remainingDaysInclusive(start: Dayjs, end: Dayjs): number {
  return Math.max(0, end.startOf('day').diff(start.startOf('day'), 'day') + 1);
}
