import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Camera,
  Image as ImageIcon,
  MapPin,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import {
  DiaryEntry,
  DiaryEntryType,
  ENTRY_TYPE_LABELS,
  ItineraryItem,
  RECOMMENDATION_TAGS,
  Traveler,
  TripRoom,
} from '../types/trip';
import { addDiaryEntry, deleteDiaryEntry } from '../services/tripService';
import { compressImageForDiary } from '../utils/imageCompress';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

export interface DiaryPrefill {
  city: string;
  placeName: string;
  lat: number;
  lng: number;
  dayIndex: number;
  date: string;
}

interface DiaryViewProps {
  trip: TripRoom;
  actorName: string;
  canEdit: boolean;
  isOwner: boolean;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  diaryEntries: DiaryEntry[];
  externalOpenNonce: number;
  prefill: DiaryPrefill | null;
  onFocusOnMap: (lat: number, lng: number, title: string) => void;
}

function getDiarySortMillis(entry: DiaryEntry): number {
  const ts = entry.createdAt as unknown as
    | { toMillis?: () => number; seconds?: number }
    | null
    | undefined;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.seconds === 'number') return ts.seconds * 1000;
  return Date.now();
}

export const DiaryView: React.FC<DiaryViewProps> = ({
  trip,
  actorName,
  canEdit,
  isOwner,
  travelers,
  itinerary,
  diaryEntries,
  externalOpenNonce,
  prefill,
  onFocusOnMap,
}) => {
  const [typeFilter, setTypeFilter] = useState<DiaryEntryType | 'all'>('all');
  const [dayFilter, setDayFilter] = useState<number | 'all'>('all');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Composer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dayIndex, setDayIndex] = useState(1);
  const [date, setDate] = useState(trip.startDate);
  const [timeLabel, setTimeLabel] = useState('12:30');
  const [city, setCity] = useState('파리');
  const [placeName, setPlaceName] = useState('');
  const [mealOrActivity, setMealOrActivity] = useState('');
  const [entryType, setEntryType] = useState<DiaryEntryType>('meal');
  const [story, setStory] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [lat, setLat] = useState(48.8584);
  const [lng, setLng] = useState(2.2945);
  const [withTravelers, setWithTravelers] = useState<string[]>([
    'me',
    'daughter_g6',
    'niece_g5',
    'mom',
    'aunt_1',
    'aunt_2',
  ]);
  const [tags, setTags] = useState<string[]>(['모두만족']);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (externalOpenNonce > 0 && canEdit) {
      if (prefill) {
        setDayIndex(prefill.dayIndex);
        setDate(prefill.date);
        setCity(prefill.city);
        setPlaceName(prefill.placeName);
        setLat(prefill.lat);
        setLng(prefill.lng);
      } else {
        const now = new Date();
        setTimeLabel(
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        );
      }
      setIsModalOpen(true);
    }
  }, [externalOpenNonce, prefill, canEdit]);

  // Always sort newest diary entry first (latest createdAt -> date -> dayIndex -> timeLabel)
  const filteredEntries = useMemo(() => {
    return diaryEntries
      .filter((entry) => {
        if (typeFilter !== 'all' && entry.entryType !== typeFilter) return false;
        if (dayFilter !== 'all' && entry.dayIndex !== dayFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const timeDiff = getDiarySortMillis(b) - getDiarySortMillis(a);
        if (timeDiff !== 0) return timeDiff;
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        if (b.dayIndex !== a.dayIndex) return b.dayIndex - a.dayIndex;
        return b.timeLabel.localeCompare(a.timeLabel);
      });
  }, [diaryEntries, typeFilter, dayFilter]);

  const tomorrowPlan = useMemo(
    () => itinerary.filter((item) => item.dayIndex === 2),
    [itinerary]
  );

  const dayNumbers = useMemo(() => {
    const nums = Array.from(new Set(diaryEntries.map((d) => d.dayIndex))).sort((a, b) => a - b);
    return nums.length > 0 ? nums : [1];
  }, [diaryEntries]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsCompressing(true);
    try {
      const compressed = await compressImageForDiary(file);
      setPhotoUrl(compressed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '사진을 처리하지 못했습니다.');
    } finally {
      setIsCompressing(false);
    }
  };

  const toggleTraveler = (id: string) => {
    setWithTravelers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleTag = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((t) => t !== tagId);
      if (prev.length >= 8) return prev;
      return [...prev, tagId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim() || !mealOrActivity.trim() || !story.trim()) return;
    setIsSaving(true);
    try {
      await addDiaryEntry(trip.inviteCode, actorName || '가족', {
        dayIndex,
        date,
        timeLabel,
        city,
        placeName,
        mealOrActivity,
        entryType,
        story,
        photoUrl,
        lat,
        lng,
        withTravelers,
        tags,
      });
      setPlaceName('');
      setMealOrActivity('');
      setStory('');
      setPhotoUrl('');
      setTypeFilter('all');
      setDayFilter('all');
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            유럽 여행 사진 일기장
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            가장 최근에 올린 일기가 맨 앞에 표시됩니다. 오늘 먹은 음식과 내일 일정을 가족 모두가 함께 봅니다.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            사진 일기 올리기
          </button>
        )}
      </div>

      {/* Tomorrow Plan Banner for Family & Brother at Home */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              내일(2일차) 우리가 갈 곳 미리보기
            </h2>
            {tomorrowPlan.length > 0 ? (
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {tomorrowPlan.map((p) => `${p.startTime} ${p.title}`).join('  ·  ')}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">
                내일 일정이 아직 등록되지 않았습니다.
              </p>
            )}
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono-tabular shrink-0">
          최신순 정렬 · 전체 기록 {diaryEntries.length}건
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
            }`}
          >
            전체 기록
          </button>
          {(Object.entries(ENTRY_TYPE_LABELS) as [DiaryEntryType, string][]).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTypeFilter(k)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                typeFilter === k ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setDayFilter('all')}
            className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap ${
              dayFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200'
            }`}
          >
            모든 날짜
          </button>
          {dayNumbers.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDayFilter(d)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap ${
                dayFilter === d
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {d === 1 ? '1일차 (오늘)' : `${d}일차`}
            </button>
          ))}
        </div>
      </div>

      {/* Diary Grid */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-800 mb-1">
            아직 등록된 여행 일기가 없습니다
          </p>
          <p className="text-xs text-slate-500 mb-4">
            방금 먹은 맛있는 음식이나 가족 사진을 올려 일기장을 채워보세요.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700"
            >
              첫 번째 사진 일기 쓰기
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEntries.map((entry, idx) => {
            const withNames = entry.withTravelers
              .map((id) => travelers.find((t) => t.id === id)?.name || id)
              .join(' · ');

            return (
              <article
                key={entry.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
              >
                {/* 4:3 Travel Photo with resilient fallback */}
                <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
                  {entry.photoUrl && !brokenImages[entry.id] ? (
                    <img
                      src={entry.photoUrl}
                      alt={`${entry.placeName} - ${entry.mealOrActivity}`}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [entry.id]: true }))
                      }
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                      <ImageIcon className="w-8 h-8 mb-2 text-slate-400" />
                      <span className="text-xs font-medium text-center">{entry.placeName}</span>
                    </div>
                  )}
                </div>

                {/* Journal Content */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Unboxed quiet metadata */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono-tabular mb-2">
                    <span>
                      {idx === 0 ? '최신 일기 · ' : ''}
                      {entry.dayIndex === 1 ? '1일차 · 오늘' : `${entry.dayIndex}일차`} ·{' '}
                      {entry.timeLabel} · {entry.city}
                    </span>
                    <span className="text-amber-700 font-sans font-semibold shrink-0">
                      {ENTRY_TYPE_LABELS[entry.entryType]}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {entry.mealOrActivity}
                  </h3>
                  <div className="text-xs font-medium text-slate-600 mt-1 flex items-center gap-1">
                    {entry.entryType === 'meal' ? (
                      <Utensils className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    )}
                    <span className="truncate">{entry.placeName}</span>
                  </div>

                  <p className="text-sm text-slate-700 mt-3 leading-relaxed flex-1">
                    {entry.story}
                  </p>

                  {withNames && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                      함께한 가족: <span className="text-slate-700 font-medium">{withNames}</span>
                      {entry.authorName ? ` · 작성: ${entry.authorName}` : ''}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => onFocusOnMap(entry.lat, entry.lng, entry.placeName)}
                      className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1 min-h-[36px]"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      지도에서 위치 보기
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void deleteDiaryEntry(trip.inviteCode, entry.id)}
                        title="일기 삭제"
                        className="min-h-[36px] min-w-[36px] p-1.5 text-slate-400 hover:text-red-600 rounded-lg flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Upload Photo Diary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-base font-bold text-slate-900">오늘의 여행 일기 올리기</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Photo file upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  찍은 사진 올리기 (자동 최적화)
                </label>
                <label className="block cursor-pointer border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-4 text-center transition-colors bg-slate-50/70">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handlePhotoUpload(e)}
                    className="hidden"
                  />
                  {photoUrl ? (
                    <div className="space-y-2">
                      <img
                        src={photoUrl}
                        alt="미리보기"
                        className="max-h-52 mx-auto rounded-xl object-cover"
                      />
                      <span className="inline-block text-xs font-semibold text-blue-700">
                        다른 사진으로 바꾸기
                      </span>
                    </div>
                  ) : (
                    <div className="py-4">
                      <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        {isCompressing
                          ? '사진을 알맞은 크기로 줄이는 중...'
                          : '눌러서 음식이나 가족 사진을 선택하세요'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        형과 가족들이 바로 볼 수 있게 빠르게 저장됩니다.
                      </p>
                    </div>
                  )}
                </label>
                {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
              </div>

              {/* Entry Type */}
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(ENTRY_TYPE_LABELS) as [DiaryEntryType, string][]).map(
                  ([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setEntryType(k)}
                      className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                        entryType === k
                          ? 'border-amber-600 bg-amber-50 text-amber-900'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>

              {/* Quick pick from itinerary */}
              {itinerary.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    일정표 장소에서 빠르게 선택
                  </label>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {itinerary.slice(0, 6).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setPlaceName(item.title);
                          setCity(item.city);
                          setDayIndex(item.dayIndex);
                          setDate(item.date);
                          setLat(item.lat);
                          setLng(item.lng);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 whitespace-nowrap shrink-0"
                      >
                        {item.dayIndex}일차 · {item.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  뭘 먹었는지 / 뭘 했는지 (제목)
                </label>
                <input
                  type="text"
                  value={mealOrActivity}
                  onChange={(e) => setMealOrActivity(e.target.value)}
                  maxLength={120}
                  required
                  placeholder="예: 바게트 샌드위치랑 에스프레소, 세느강 유람선"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  어디서 찍었나요? (장소 검색 또는 입력)
                </label>
                <PlaceAutocompleteInput
                  value={placeName}
                  onChangeText={setPlaceName}
                  onSelectPlace={(p) => {
                    setPlaceName(p.placeName);
                    setLat(p.lat);
                    setLng(p.lng);
                    if (p.city) setCity(p.city);
                  }}
                  placeholder="예: 에펠탑 근처 카페, 지올리띠 젤라또"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">일차</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={dayIndex}
                    onChange={(e) => setDayIndex(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">시각</label>
                  <input
                    type="time"
                    value={timeLabel}
                    onChange={(e) => setTimeLabel(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">도시</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={50}
                    required
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  함께한 가족 선택
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {travelers.map((t) => {
                    const active = withTravelers.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTraveler(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  태그 선택
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RECOMMENDATION_TAGS.slice(0, 6).map((tag) => {
                    const active = tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  일기장 이야기 (형과 가족들이 읽는 오늘의 기록)
                </label>
                <textarea
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  maxLength={800}
                  required
                  rows={3}
                  placeholder="예: 조카(초5)랑 딸(초6)이 크레페를 너무 맛있게 먹었어요. 엄마랑 이모들도 많이 안 걷고 즐거워하십니다!"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    isCompressing ||
                    !placeName.trim() ||
                    !mealOrActivity.trim() ||
                    !story.trim()
                  }
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isSaving ? '올리는 중...' : '일기장에 올리기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
