export const TRIP_START_DATE = '2027-01-14';
export const TRIP_END_DATE = '2027-01-28';
export const TRIP_TOTAL_DAYS = 15;

export function getLocalDateString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

export function getDateForDayIndex(startDate: string, dayIndex: number): string {
  const base = parseLocalDate(startDate || TRIP_START_DATE);
  base.setDate(base.getDate() + Math.max(0, dayIndex - 1));
  return getLocalDateString(base);
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function formatKoreanMonthDay(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const d = parseLocalDate(dateStr);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = WEEKDAY_KO[d.getDay()] || '';
  return `${month}/${day}(${weekday})`;
}

export interface TripPeriodStatus {
  status: 'before' | 'during' | 'after';
  isGpsAllowed: boolean;
  todayStr: string;
  currentDayIndex: number | null;
  daysUntilStart: number;
}

export function getTripPeriodStatus(
  startDate: string = TRIP_START_DATE,
  endDate: string = TRIP_END_DATE,
  now: Date = new Date()
): TripPeriodStatus {
  const todayStr = getLocalDateString(now);
  const todayMidnight = parseLocalDate(todayStr);
  const startMidnight = parseLocalDate(startDate || TRIP_START_DATE);
  const endMidnight = parseLocalDate(endDate || TRIP_END_DATE);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffFromStart = Math.round((todayMidnight.getTime() - startMidnight.getTime()) / msPerDay);

  if (todayMidnight.getTime() < startMidnight.getTime()) {
    return {
      status: 'before',
      isGpsAllowed: false,
      todayStr,
      currentDayIndex: null,
      daysUntilStart: Math.max(1, -diffFromStart),
    };
  }

  if (todayMidnight.getTime() > endMidnight.getTime()) {
    return {
      status: 'after',
      isGpsAllowed: false,
      todayStr,
      currentDayIndex: null,
      daysUntilStart: 0,
    };
  }

  return {
    status: 'during',
    isGpsAllowed: true,
    todayStr,
    currentDayIndex: diffFromStart + 1,
    daysUntilStart: 0,
  };
}
