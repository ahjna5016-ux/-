import React, { useMemo, useState } from 'react';
import {
  Camera,
  Check,
  Clock,
  Heart,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  ItineraryCategory,
  ItineraryItem,
  ItineraryStatus,
  ProfileSlot,
  RECOMMENDATION_TAGS,
  Traveler,
  TripRoom,
  WALKING_LABELS,
  WalkingLevel,
} from '../types/trip';
import {
  addItineraryItem,
  deleteItineraryItem,
  toggleItineraryLike,
  updateItineraryItem,
} from '../services/tripService';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface ItineraryViewProps {
  trip: TripRoom;
  actorName: string;
  activeProfileSlot: ProfileSlot;
  canEdit: boolean;
  isOwner: boolean;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  onFocusOnMap: (lat: number, lng: number, title: string) => void;
  onCreateDiaryFromSpot: (item: ItineraryItem) => void;
}

export const ItineraryView: React.FC<ItineraryViewProps> = ({
  trip,
  actorName,
  activeProfileSlot,
  canEdit,
  isOwner,
  travelers,
  itinerary,
  onFocusOnMap,
  onCreateDiaryFromSpot,
}) => {
  const currentTravelerId = activeProfileSlot !== 'brother_home' ? activeProfileSlot : 'me';

  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  // Modal Form State
  const [dayIndex, setDayIndex] = useState(1);
  const [date, setDate] = useState(trip.startDate);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [city, setCity] = useState('파리');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItineraryCategory>('landmark');
  const [placeId, setPlaceId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(48.8584);
  const [lng, setLng] = useState(2.2945);
  const [tags, setTags] = useState<string[]>(['모두만족']);
  const [walkingLevel, setWalkingLevel] = useState<WalkingLevel>('low');
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dayNumbers = useMemo(() => {
    const unique = Array.from(new Set(itinerary.map((i) => i.dayIndex))).sort((a, b) => a - b);
    return unique.length > 0 ? unique : [1, 2, 3, 4];
  }, [itinerary]);

  const filteredItems = useMemo(() => {
    return itinerary.filter((item) => {
      if (selectedDay !== 'all' && item.dayIndex !== selectedDay) return false;
      if (selectedTag !== 'all' && !item.tags.includes(selectedTag)) return false;
      return true;
    });
  }, [itinerary, selectedDay, selectedTag]);

  const kidSpotsCount = filteredItems.filter(
    (i) => i.tags.includes('아이취향') || i.tags.includes('모두만족')
  ).length;
  const adultSpotsCount = filteredItems.filter(
    (i) => i.tags.includes('어른감성') || i.tags.includes('모두만족')
  ).length;
  const easyWalkCount = filteredItems.filter((i) => i.walkingLevel === 'low').length;

  const openAddModal = () => {
    setEditingItem(null);
    const defaultDay = selectedDay === 'all' ? 1 : selectedDay;
    const baseDate = new Date(trip.startDate);
    baseDate.setDate(baseDate.getDate() + (defaultDay - 1));
    const dateStr = baseDate.toISOString().slice(0, 10);

    setDayIndex(defaultDay);
    setDate(dateStr);
    setStartTime('10:00');
    setEndTime('12:00');
    setCity('파리');
    setTitle('');
    setCategory('landmark');
    setPlaceId('');
    setAddress('');
    setLat(48.8584);
    setLng(2.2945);
    setTags(['모두만족']);
    setWalkingLevel('low');
    setMemo('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ItineraryItem) => {
    setEditingItem(item);
    setDayIndex(item.dayIndex);
    setDate(item.date);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setCity(item.city);
    setTitle(item.title);
    setCategory(item.category);
    setPlaceId(item.placeId);
    setAddress(item.address);
    setLat(item.lat);
    setLng(item.lng);
    setTags(item.tags);
    setWalkingLevel(item.walkingLevel);
    setMemo(item.memo);
    setIsModalOpen(true);
  };

  const toggleTagInForm = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((t) => t !== tagId);
      if (prev.length >= 8) return prev;
      return [...prev, tagId];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const updaterName = actorName || '가족';
      if (editingItem) {
        await updateItineraryItem(trip.inviteCode, editingItem.id, updaterName, {
          dayIndex,
          date,
          startTime,
          endTime,
          city,
          title,
          category,
          placeId,
          address,
          lat,
          lng,
          tags,
          walkingLevel,
          memo,
        });
      } else {
        await addItineraryItem(trip.inviteCode, updaterName, {
          dayIndex,
          date,
          startTime,
          endTime,
          city,
          title,
          category,
          placeId,
          address,
          lat,
          lng,
          tags,
          walkingLevel,
          memo,
        });
      }
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const cycleStatus = async (item: ItineraryItem) => {
    if (!canEdit) return;
    const order: ItineraryStatus[] = ['planned', 'visited', 'skipped'];
    const nextStatus = order[(order.indexOf(item.status) + 1) % order.length];
    await updateItineraryItem(trip.inviteCode, item.id, actorName || '가족', {
      status: nextStatus,
    });
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">가족 공유 유럽 일정표</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            초5·초6 아이취향 {kidSpotsCount}곳 · 어른감성 {adultSpotsCount}곳 · 도보 여유{' '}
            {easyWalkCount}곳 (실시간 공동 편집)
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openAddModal}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            새 일정 장소 추가
          </button>
        )}
      </div>

      {/* Day Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
        <button
          type="button"
          onClick={() => setSelectedDay('all')}
          className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            selectedDay === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          전체 일정 ({itinerary.length})
        </button>
        {dayNumbers.map((d) => {
          const dayLabel = d === 1 ? '1일차 (오늘)' : d === 2 ? '2일차 (내일)' : `${d}일차`;
          const count = itinerary.filter((i) => i.dayIndex === d).length;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedDay === d
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {dayLabel} · {count}
            </button>
          );
        })}
      </div>

      {/* Kid & Adult Recommendation Tag Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 mb-6">
        <div className="text-xs font-semibold text-slate-500 mb-2.5">
          취향 · 체력 맞춤 추천 태그 필터
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedTag('all')}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedTag === 'all'
                ? 'bg-blue-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            전체 태그
          </button>
          {RECOMMENDATION_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              title={tag.description}
              onClick={() => setSelectedTag(tag.id)}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedTag === tag.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Itinerary List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <p className="text-sm font-semibold text-slate-800 mb-1">
            선택한 조건에 맞는 일정이 없습니다
          </p>
          <p className="text-xs text-slate-500 mb-4">
            다른 태그나 일차를 선택하거나 새 일정을 추가해 보세요.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={openAddModal}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              일정 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isLiked = item.likedBy.includes(currentTravelerId);
            const likedNames = item.likedBy
              .map((id) => travelers.find((t) => t.id === id)?.avatarInitial || id)
              .join(', ');

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono-tabular mb-1.5">
                    <span className="font-semibold text-blue-700">
                      {item.dayIndex === 1
                        ? '1일차 · 오늘'
                        : item.dayIndex === 2
                        ? '2일차 · 내일'
                        : `${item.dayIndex}일차`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.startTime} - {item.endTime}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.city}</span>
                    <span aria-hidden="true">·</span>
                    <span>{CATEGORY_LABELS[item.category]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{WALKING_LABELS[item.walkingLevel]}</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => void cycleStatus(item)}
                      disabled={!canEdit}
                      title="방문 상태 변경 (예정 / 완료 / 건너뜀)"
                      className={`mt-0.5 min-h-[28px] min-w-[28px] rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        item.status === 'visited'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : item.status === 'skipped'
                          ? 'bg-slate-200 border-slate-300 text-slate-600'
                          : 'bg-white border-slate-300 text-transparent hover:border-blue-600'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-base font-bold ${
                          item.status === 'skipped'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      {item.address && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{item.address}</p>
                      )}
                      {item.memo && (
                        <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
                          {item.memo}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">
                          {item.tags.map((t) => `#${t}`).join(' ')}
                        </span>
                        {likedNames && (
                          <span>
                            좋아요 {item.likedBy.length}명 ({likedNames})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => void toggleItineraryLike(trip.inviteCode, item, currentTravelerId)}
                    className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      isLiked
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-600' : ''}`} />
                    <span>{item.likedBy.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onFocusOnMap(item.lat, item.lng, item.title)}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    지도 보기
                  </button>

                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => onCreateDiaryFromSpot(item)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        일기 쓰기
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        title="일정 수정"
                        className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => void deleteItineraryItem(trip.inviteCode, item.id)}
                          title="일정 삭제"
                          className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-red-600 hover:border-red-200 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Itinerary Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                {editingItem ? '일정 수정하기' : '새 유럽 일정 장소 추가'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 hover:text-slate-900 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  장소 검색 (Google Places 자동완성) 또는 직접 입력
                </label>
                <PlaceAutocompleteInput
                  value={title}
                  onChangeText={setTitle}
                  onSelectPlace={(p) => {
                    setTitle(p.placeName);
                    setAddress(p.address);
                    setPlaceId(p.placeId);
                    setLat(p.lat);
                    setLng(p.lng);
                    if (p.city) setCity(p.city);
                  }}
                />
                {address && (
                  <p className="text-[11px] text-emerald-700 mt-1">선택된 주소: {address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    시작 시각
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3.5 pointer-events-none" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                      className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-xl min-h-[44px] font-mono-tabular"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    종료 시각
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    required
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl min-h-[44px] font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ItineraryCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] bg-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    도보 이동 난이도 (엄마·아이 배려)
                  </label>
                  <select
                    value={walkingLevel}
                    onChange={(e) => setWalkingLevel(e.target.value as WalkingLevel)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] bg-white"
                  >
                    {Object.entries(WALKING_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  아이 · 어른 추천 태그 선택 (최대 8개)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RECOMMENDATION_TAGS.map((tag) => {
                    const active = tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTagInForm(tag.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          active
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                  가족 공유 메모 (준비물, 화장실 위치, 예약 번호 등)
                </label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={400}
                  rows={3}
                  placeholder="예: 입장권 QR 저장해둠. 초5·초6 아이들 오디오가이드 한국어 대여 가능."
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !title.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSaving ? '저장 중...' : editingItem ? '수정 완료' : '일정에 저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
