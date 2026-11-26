import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  MapPin,
  Plus,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  ProfileSlot,
  RECOMMENDATION_TAGS,
  Traveler,
  TripRoom,
  WishlistCategory,
  WishlistPlace,
} from '../types/trip';
import {
  addItineraryItem,
  addWishlistPlace,
  deleteWishlistPlace,
  toggleWishlistVote,
} from '../services/tripService';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface WishlistViewProps {
  trip: TripRoom;
  actorName: string;
  activeProfileSlot: ProfileSlot;
  canEdit: boolean;
  isOwner: boolean;
  travelers: Traveler[];
  wishlist: WishlistPlace[];
  onFocusOnMap: (lat: number, lng: number, title: string) => void;
  onPromotedToItinerary: () => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  trip,
  actorName,
  activeProfileSlot,
  canEdit,
  isOwner,
  travelers,
  wishlist,
  onFocusOnMap,
  onPromotedToItinerary,
}) => {
  const [voterId, setVoterId] = useState<string>(
    activeProfileSlot !== 'brother_home' ? activeProfileSlot : 'niece_g5'
  );
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add wishlist form
  const [city, setCity] = useState('파리');
  const [placeName, setPlaceName] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(48.8566);
  const [lng, setLng] = useState(2.3522);
  const [category, setCategory] = useState<WishlistCategory>('activity');
  const [tags, setTags] = useState<string[]>(['아이취향', '모두만족']);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredWishlist = useMemo(() => {
    if (tagFilter === 'all') return wishlist;
    return wishlist.filter((w) => w.tags.includes(tagFilter));
  }, [wishlist, tagFilter]);

  const handleToggleTag = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((t) => t !== tagId);
      if (prev.length >= 8) return prev;
      return [...prev, tagId];
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    setIsSaving(true);
    try {
      await addWishlistPlace(trip.inviteCode, {
        city,
        placeName,
        googlePlaceId,
        address,
        lat,
        lng,
        category,
        tags,
        reason,
        suggestedBy: voterId,
      });
      setPlaceName('');
      setAddress('');
      setGooglePlaceId('');
      setReason('');
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromote = async (place: WishlistPlace) => {
    if (!canEdit) return;
    await addItineraryItem(trip.inviteCode, actorName || '가족', {
      dayIndex: 2,
      date: trip.startDate,
      startTime: '15:30',
      endTime: '17:00',
      city: place.city,
      title: place.placeName,
      category: place.category,
      placeId: place.googlePlaceId,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      tags: place.tags,
      walkingLevel: place.tags.includes('걷기편한') ? 'low' : 'medium',
      memo: place.reason,
    });
    onPromotedToItinerary();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            가족 가고 싶은 곳 · 취향 투표
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            초5 조카, 초6 딸, 엄마, 이모들이 가고 싶은 곳을 고르고 투표해 일정표에 반영하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          후보 장소 제안하기
        </button>
      </div>

      {/* Who is voting selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
        <div className="text-xs font-semibold text-slate-600 mb-2">
          지금 투표 · 제안하는 가족 선택 (아이들 핸드폰이 없어도 대신 눌러줄 수 있어요)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {travelers.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setVoterId(t.id)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                voterId === t.id
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        <button
          type="button"
          onClick={() => setTagFilter('all')}
          className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold ${
            tagFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'
          }`}
        >
          전체 ({wishlist.length})
        </button>
        {RECOMMENDATION_TAGS.slice(0, 7).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTagFilter(t.id)}
            className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold ${
              tagFilter === t.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredWishlist.map((place) => {
          const voted = place.votedBy.includes(voterId);
          const voterNames = place.votedBy
            .map((id) => travelers.find((t) => t.id === id)?.avatarInitial || id)
            .join(', ');
          const suggester = travelers.find((t) => t.id === place.suggestedBy)?.name || '가족';

          return (
            <div
              key={place.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                  <span>
                    {place.city} · {CATEGORY_LABELS[place.category]} · 추천: {suggester}
                  </span>
                  <span className="font-mono-tabular font-semibold text-blue-700">
                    {place.votedBy.length}표
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{place.placeName}</h3>
                {place.address && (
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{place.address}</p>
                )}
                {place.reason && (
                  <p className="text-sm text-slate-700 mt-2 leading-relaxed">{place.reason}</p>
                )}
                <div className="mt-2.5 text-xs text-slate-600 font-medium">
                  {place.tags.map((t) => `#${t}`).join(' ')}
                </div>
                {voterNames && (
                  <div className="mt-1.5 text-xs text-slate-500">
                    찜한 가족: {voterNames}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleWishlistVote(trip.inviteCode, place, voterId)}
                    className={`min-h-[40px] px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      voted
                        ? 'bg-blue-700 border-blue-700 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    {voted ? '투표 완료' : '가고 싶어요'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFocusOnMap(place.lat, place.lng, place.placeName)}
                    className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    지도
                  </button>
                </div>

                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handlePromote(place)}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      일정표에 추가
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void deleteWishlistPlace(trip.inviteCode, place.id)}
                        title="삭제"
                        className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Wishlist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">가고 싶은 곳 제안하기</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  장소 이름 (Google Places 검색)
                </label>
                <PlaceAutocompleteInput
                  value={placeName}
                  onChangeText={setPlaceName}
                  onSelectPlace={(p) => {
                    setPlaceName(p.placeName);
                    setAddress(p.address);
                    setGooglePlaceId(p.placeId);
                    setLat(p.lat);
                    setLng(p.lng);
                    if (p.city) setCity(p.city);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                    카테고리
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WishlistCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px] bg-white"
                  >
                    {(
                      ['landmark', 'food', 'cafe', 'museum', 'activity', 'shopping'] as WishlistCategory[]
                    ).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  추천 태그
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RECOMMENDATION_TAGS.map((tag) => {
                    const active = tags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
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
                  가고 싶은 이유 (한 줄 메모)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="예: 조카가 여기서 기념품 사고 싶다고 했어요"
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
                  disabled={isSaving || !placeName.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSaving ? '저장 중...' : '찜 목록에 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
