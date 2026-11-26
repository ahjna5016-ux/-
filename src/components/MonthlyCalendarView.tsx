import React, { useMemo } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { ItineraryItem } from '../types/trip';
import { CountryCode, getCountryAndCityInfo } from '../utils/europeLocations';
import {
  formatKoreanMonthDay,
  getDateForDayIndex,
  getLocalDateString,
  TRIP_TOTAL_DAYS,
} from '../utils/tripDates';
import { CountryFlagIcon } from './EuropeLocationVisuals';

interface MonthlyCalendarViewProps {
  startDate: string;
  itinerary: ItineraryItem[];
  filteredItinerary: ItineraryItem[];
  selectedDay: number;
  currentDayIndex: number | null;
  selectedTag: string;
  canEdit: boolean;
  onSelectDay: (dayIndex: number) => void;
  onAddForDay: (dayIndex: number) => void;
}

interface CalendarCell {
  dateStr: string;
  dayOfMonth: number;
  inTargetMonth: boolean;
  weekdayIdx: number; // 0 = Sun ... 6 = Sat
  tripDayIndex: number | null;
}

const WEEKDAY_HEADERS = ['일', '월', '화', '수', '목', '금', '토'];

function getFallbackLocationForDay(dayIndex: number): { city: string; countryCode: CountryCode; country: string } {
  if (dayIndex <= 5) return { city: '파리', countryCode: 'FR', country: '프랑스' };
  if (dayIndex <= 9) return { city: '인터라켄', countryCode: 'CH', country: '스위스' };
  if (dayIndex <= 11) return { city: '피렌체', countryCode: 'IT', country: '이탈리아' };
  return { city: '로마', countryCode: 'IT', country: '이탈리아' };
}

function getCountryAccentClasses(countryCode: CountryCode, isSelected: boolean): string {
  if (isSelected) {
    return 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/25';
  }
  switch (countryCode) {
    case 'FR':
      return 'bg-sky-50/55 border-sky-200/80 hover:border-sky-400 hover:bg-sky-50';
    case 'CH':
      return 'bg-rose-50/50 border-rose-200/80 hover:border-rose-400 hover:bg-rose-50';
    case 'IT':
    case 'VA':
      return 'bg-emerald-50/50 border-emerald-200/80 hover:border-emerald-400 hover:bg-emerald-50';
    default:
      return 'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50';
  }
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  startDate,
  itinerary,
  filteredItinerary,
  selectedDay,
  currentDayIndex,
  selectedTag,
  canEdit,
  onSelectDay,
  onAddForDay,
}) => {
  // Parse target month from trip startDate (e.g. 2027-01-14 -> Jan 2027)
  const { targetYear, targetMonthIdx } = useMemo(() => {
    const [y, m] = (startDate || '2027-01-14').split('-').map(Number);
    return {
      targetYear: y || 2027,
      targetMonthIdx: (m || 1) - 1,
    };
  }, [startDate]);

  // Map YYYY-MM-DD -> tripDayIndex (1..TRIP_TOTAL_DAYS)
  const tripDateToDayIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (let d = 1; d <= TRIP_TOTAL_DAYS; d++) {
      map.set(getDateForDayIndex(startDate, d), d);
    }
    return map;
  }, [startDate]);

  // Group all items and filtered items by dayIndex
  const allItemsByDay = useMemo(() => {
    const map = new Map<number, ItineraryItem[]>();
    for (const item of itinerary) {
      const list = map.get(item.dayIndex) || [];
      list.push(item);
      map.set(item.dayIndex, list);
    }
    return map;
  }, [itinerary]);

  const filteredItemsByDay = useMemo(() => {
    const map = new Map<number, ItineraryItem[]>();
    for (const item of filteredItinerary) {
      const list = map.get(item.dayIndex) || [];
      list.push(item);
      map.set(item.dayIndex, list);
    }
    return map;
  }, [filteredItinerary]);

  // Build 42-cell Sunday-start calendar grid for Jan 2027
  const cells = useMemo<CalendarCell[]>(() => {
    const firstOfMonth = new Date(targetYear, targetMonthIdx, 1, 0, 0, 0, 0);
    const leadingDays = firstOfMonth.getDay(); // 5 for 2027-01-01 (Friday)
    const gridStart = new Date(targetYear, targetMonthIdx, 1 - leadingDays, 0, 0, 0, 0);

    const lastOfMonth = new Date(targetYear, targetMonthIdx + 1, 0, 0, 0, 0, 0);
    const totalVisible = Math.ceil((leadingDays + lastOfMonth.getDate()) / 7) * 7;

    return Array.from({ length: totalVisible }, (_, idx) => {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + idx,
        0,
        0,
        0,
        0
      );
      const dateStr = getLocalDateString(cellDate);
      return {
        dateStr,
        dayOfMonth: cellDate.getDate(),
        inTargetMonth: cellDate.getMonth() === targetMonthIdx && cellDate.getFullYear() === targetYear,
        weekdayIdx: cellDate.getDay(),
        tripDayIndex: tripDateToDayIndex.get(dateStr) ?? null,
      };
    });
  }, [targetYear, targetMonthIdx, tripDateToDayIndex]);

  const selectedDayDateStr = getDateForDayIndex(startDate, selectedDay);
  const selectedDayAllItems = allItemsByDay.get(selectedDay) || [];
  const selectedDayLocation = selectedDayAllItems[0]
    ? getCountryAndCityInfo(selectedDayAllItems[0].city, selectedDayAllItems[0].address)
    : getFallbackLocationForDay(selectedDay);

  return (
    <div className="space-y-4">
      {/* Calendar Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {/* Calendar Top Header & Country Legend */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
              <CalendarDays className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 font-mono-tabular">
                {targetYear}년 {targetMonthIdx + 1}월 전체 일정 달력
              </h2>
              <p className="text-xs text-slate-500">
                1월 14일(1일차) ~ 1월 28일(15일차) · 날짜를 누르면 아래에서 세부 일정을 확인·수정할 수 있어요
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-900">
              <CountryFlagIcon code="FR" className="w-[15px] h-[10px]" label="프랑스" />
              프랑스 (14~18일)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
              <CountryFlagIcon code="CH" className="w-[15px] h-[10px]" label="스위스" />
              스위스 (19~22일)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
              <CountryFlagIcon code="IT" className="w-[15px] h-[10px]" label="이탈리아" />
              이탈리아 (23~28일)
            </span>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {WEEKDAY_HEADERS.map((label, idx) => (
            <div
              key={label}
              className={`py-2 text-center text-xs font-bold ${
                idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-blue-600' : 'text-slate-600'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 p-1.5 sm:p-2.5 bg-slate-100/60">
          {cells.map((cell) => {
            const tripDay = cell.tripDayIndex;
            if (!tripDay) {
              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[62px] sm:min-h-[104px] rounded-xl p-1.5 sm:p-2 border ${
                    cell.inTargetMonth
                      ? 'bg-white/60 border-slate-200/70 text-slate-400'
                      : 'bg-slate-50/40 border-transparent text-slate-300'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold font-mono-tabular ${
                      !cell.inTargetMonth
                        ? 'text-slate-300'
                        : cell.weekdayIdx === 0
                        ? 'text-rose-300'
                        : cell.weekdayIdx === 6
                        ? 'text-blue-300'
                        : 'text-slate-400'
                    }`}
                  >
                    {cell.dayOfMonth}
                  </div>
                </div>
              );
            }

            const allDayItems = allItemsByDay.get(tripDay) || [];
            const visibleItems = filteredItemsByDay.get(tripDay) || [];
            const firstItem = visibleItems[0] || allDayItems[0];
            const loc = firstItem
              ? getCountryAndCityInfo(firstItem.city, firstItem.address)
              : getFallbackLocationForDay(tripDay);
            const isSelected = selectedDay === tripDay;
            const isToday = currentDayIndex === tripDay;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => onSelectDay(tripDay)}
                className={`min-h-[76px] sm:min-h-[116px] rounded-xl p-1.5 sm:p-2 border text-left transition-all flex flex-col justify-between overflow-hidden ${getCountryAccentClasses(
                  loc.countryCode,
                  isSelected
                )}`}
              >
                {/* Top row: Day number + Day index + Flag */}
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span
                        className={`text-xs sm:text-sm font-bold font-mono-tabular ${
                          isSelected
                            ? 'text-blue-700'
                            : cell.weekdayIdx === 0
                            ? 'text-rose-600'
                            : cell.weekdayIdx === 6
                            ? 'text-blue-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {cell.dayOfMonth}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1 py-0.5 rounded font-mono-tabular leading-none ${
                          isSelected
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-900/10 text-slate-700'
                        }`}
                      >
                        {tripDay}일
                      </span>
                    </div>

                    <CountryFlagIcon
                      code={loc.countryCode}
                      className="w-[14px] h-[10px] sm:w-[16px] sm:h-[11px] shrink-0"
                      label={loc.country}
                    />
                  </div>

                  {/* City & Today badge */}
                  <div className="mt-1 flex items-center justify-between gap-1">
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 truncate">
                      {loc.city}
                    </span>
                    {isToday && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-600 text-white leading-none shrink-0">
                        오늘
                      </span>
                    )}
                  </div>

                  {/* Desktop/Tablet Compact Schedule Items */}
                  <div className="hidden md:block mt-1.5 space-y-1">
                    {visibleItems.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-1 text-[11px] leading-tight rounded px-1 py-0.5 ${
                          item.status === 'skipped'
                            ? 'text-slate-400 line-through bg-slate-100/80'
                            : item.status === 'visited'
                            ? 'text-emerald-900 bg-emerald-100/70'
                            : 'text-slate-800 bg-white/85'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.status === 'visited'
                              ? 'bg-emerald-600'
                              : item.status === 'skipped'
                              ? 'bg-slate-400'
                              : 'bg-blue-600'
                          }`}
                        />
                        <span className="font-mono-tabular text-[10px] text-slate-500 shrink-0">
                          {item.startTime}
                        </span>
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                    ))}
                    {visibleItems.length > 3 && (
                      <div className="text-[10px] font-semibold text-blue-700 pl-1">
                        +{visibleItems.length - 3}개 더보기
                      </div>
                    )}
                    {visibleItems.length === 0 && (
                      <div className="text-[10px] text-slate-400 pl-0.5">
                        {selectedTag === 'all' ? '일정 없음' : '태그 일치 없음'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile count indicator */}
                <div className="md:hidden mt-1.5 flex items-center justify-between">
                  {visibleItems.length > 0 ? (
                    <span className="text-[10px] font-bold text-blue-800 bg-white/90 border border-blue-200/80 rounded px-1.5 py-0.5 font-mono-tabular">
                      {visibleItems.length}건
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">-</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Header Bar for the Detail List Below */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <CountryFlagIcon
            code={selectedDayLocation.countryCode}
            className="w-[22px] h-[15px]"
            label={selectedDayLocation.country}
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 font-mono-tabular">
                {selectedDay}일차 · {formatKoreanMonthDay(selectedDayDateStr)}
              </h3>
              {currentDayIndex === selectedDay && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                  오늘 일정
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              {selectedDayLocation.country} · {selectedDayLocation.city} · 등록된 일정 {selectedDayAllItems.length}건
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => onAddForDay(selectedDay)}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {selectedDay}일차 일정 추가
          </button>
        )}
      </div>
    </div>
  );
};
