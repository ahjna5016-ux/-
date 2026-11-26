import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import {
  BookmarkCheck,
  BookmarkPlus,
  CalendarDays,
  CalendarPlus,
  Compass,
  ExternalLink,
  Footprints,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Star,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  ItineraryItem,
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
import {
  formatKoreanMonthDay,
  getDateForDayIndex,
  getTripPeriodStatus,
  TRIP_TOTAL_DAYS,
} from '../utils/tripDates';
import { PlaceAutocompleteInput } from './PlaceAutocompleteInput';

interface WishlistViewProps {
  trip: TripRoom;
  actorName: string;
  activeProfileSlot: ProfileSlot;
  canEdit: boolean;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  wishlist: WishlistPlace[];
  onFocusOnMap: (lat: number, lng: number, title: string) => void;
  onPromotedToItinerary: () => void;
}

type NearbyPreferenceMode = 'all' | 'kids' | 'adults' | 'low_stamina';

interface NearbyRecommendation {
  placeId: string;
  placeName: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  category: WishlistCategory;
  tags: string[];
  distanceMeters: number;
  walkMinutes: number;
  staminaSummary: string;
  tasteSummary: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsURI?: string;
}

const HAS_MAPS_KEY = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

const PREFERENCE_MODES: {
  id: NearbyPreferenceMode;
  label: string;
  helper: string;
  includedPrimaryTypes: string[];
  radiusMeters: number;
  rankPreference: 'POPULARITY' | 'DISTANCE';
}[] = [
  {
    id: 'all',
    label: '온가족 균형 추천',
    helper: '아이 · 어른 모두 만족하는 명소·카페·간식',
    includedPrimaryTypes: [
      'tourist_attraction',
      'cafe',
      'bakery',
      'ice_cream_shop',
      'museum',
      'park',
      'restaurant',
      'shopping_mall',
    ],
    radiusMeters: 1500,
    rankPreference: 'POPULARITY',
  },
  {
    id: 'kids',
    label: '아이 취향 (초5·초6)',
    helper: '젤라또·디저트·공원·체험 위주',
    includedPrimaryTypes: [
      'ice_cream_shop',
      'bakery',
      'dessert_shop',
      'park',
      'zoo',
      'aquarium',
      'amusement_center',
      'toy_store',
      'tourist_attraction',
    ],
    radiusMeters: 1600,
    rankPreference: 'POPULARITY',
  },
  {
    id: 'adults',
    label: '어른 감성 (엄마·이모)',
    helper: '로컬 카페·미술관·기념품 편집샵',
    includedPrimaryTypes: [
      'cafe',
      'art_gallery',
      'museum',
      'department_store',
      'gift_shop',
      'book_store',
      'restaurant',
    ],
    radiusMeters: 1500,
    rankPreference: 'POPULARITY',
  },
  {
    id: 'low_stamina',
    label: '체력 여유 · 실내 휴식',
    helper: '도보 10분 이내 가까운 실내 카페·식당·전시',
    includedPrimaryTypes: [
      'cafe',
      'bakery',
      'restaurant',
      'museum',
      'art_gallery',
      'shopping_mall',
      'department_store',
    ],
    radiusMeters: 750,
    rankPreference: 'DISTANCE',
  },
];

function calcDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.max(50, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function classifyNearbyPlace(
  place: google.maps.places.Place,
  anchor: ItineraryItem
): NearbyRecommendation | null {
  const name = place.displayName;
  const loc = place.location;
  if (!name || !loc) return null;

  const lat = loc.lat();
  const lng = loc.lng();
  const distanceMeters = calcDistanceMeters(anchor.lat, anchor.lng, lat, lng);

  // Skip essentially the same spot as the anchor
  if (distanceMeters < 35 && name.toLowerCase().includes(anchor.title.slice(0, 4).toLowerCase())) {
    return null;
  }

  const walkMinutes = Math.max(1, Math.round(distanceMeters / 70));
  const primaryType = place.primaryType || '';
  const allTypes = new Set<string>([primaryType, ...(place.types || [])]);

  let category: WishlistCategory = 'landmark';
  const tags: string[] = [];
  let tasteSummary = '온가족이 가볍게 들르기 좋은 주변 추천 장소';

  const hasAny = (list: string[]) => list.some((t) => allTypes.has(t));

  if (hasAny(['ice_cream_shop', 'bakery', 'dessert_shop', 'candy_store', 'chocolate_shop'])) {
    category = 'cafe';
    tags.push('아이취향', '디저트간식', '잠시휴식');
    tasteSummary = '초5·초6 아이들이 좋아하는 달콤한 간식 휴식 코스';
  } else if (hasAny(['cafe', 'coffee_shop', 'tea_house'])) {
    category = 'cafe';
    tags.push('어른감성', '잠시휴식', '실내코스');
    tasteSummary = '엄마·이모님과 따뜻하게 차 마시며 쉬기 좋은 실내 카페';
  } else if (hasAny(['aquarium', 'zoo', 'amusement_center', 'amusement_park', 'toy_store'])) {
    category = 'activity';
    tags.push('아이취향', '체험액티비티', '모두만족');
    tasteSummary = '초등학생 아이들이 신나게 즐길 수 있는 체험 · 볼거리';
  } else if (hasAny(['museum', 'art_gallery', 'science_museum', 'cultural_center'])) {
    category = 'museum';
    tags.push(
      hasAny(['science_museum']) ? '아이취향' : '어른감성',
      '실내코스',
      '역사스토리'
    );
    tasteSummary = '겨울 추위를 피해 쾌적하게 둘러보는 실내 문화 코스';
  } else if (hasAny(['shopping_mall', 'department_store', 'gift_shop', 'book_store', 'clothing_store'])) {
    category = 'shopping';
    tags.push('기념품쇼핑', '실내코스', '어른감성');
    tasteSummary = '가족 선물·기념품 구경과 따뜻한 실내 휴식을 겸하기 좋은 곳';
  } else if (hasAny(['restaurant', 'bistro', 'italian_restaurant', 'french_restaurant', 'swiss_restaurant'])) {
    category = 'food';
    tags.push('모두만족', '잠시휴식', '실내코스');
    tasteSummary = '일정 동선 중에 온가족이 함께 식사하기 좋은 근처 식당';
  } else if (hasAny(['park', 'garden', 'playground'])) {
    category = 'activity';
    tags.push('아이취향', '모두만족', '포토스팟');
    tasteSummary = '잠시 바깥 공기 마시며 사진 찍기 좋은 산책 스팟';
  } else {
    category = 'landmark';
    tags.push('모두만족', '포토스팟', '역사스토리');
    tasteSummary = '오늘·내일 일정과 이어서 보기 좋은 근처 핵심 명소';
  }

  let staminaSummary = '';
  if (distanceMeters <= 450) {
    if (!tags.includes('걷기편한')) tags.push('걷기편한');
    staminaSummary = `체력 부담 적음 · 도보 약 ${walkMinutes}분 (${formatDistanceLabel(distanceMeters)})`;
  } else if (distanceMeters <= 950) {
    if (!tags.includes('걷기편한')) tags.push('걷기편한');
    staminaSummary = `가볍게 산책 · 도보 약 ${walkMinutes}분 (${formatDistanceLabel(distanceMeters)})`;
  } else {
    if (!tags.includes('잠시휴식') && category === 'cafe') tags.push('잠시휴식');
    staminaSummary = `도보 약 ${walkMinutes}분 (${formatDistanceLabel(distanceMeters)}) · 트램/택시 권장`;
  }

  return {
    placeId: place.id || `${lat}_${lng}`,
    placeName: name,
    address: place.formattedAddress || anchor.city,
    lat,
    lng,
    city: anchor.city,
    category,
    tags: tags.slice(0, 4),
    distanceMeters,
    walkMinutes,
    staminaSummary,
    tasteSummary,
    rating: typeof place.rating === 'number' ? place.rating : undefined,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
    googleMapsURI: place.googleMapsURI || undefined,
  };
}

function getStaminaLabelFromTags(tags: string[]): string {
  const hasLowWalk = tags.includes('걷기편한');
  const hasRest = tags.includes('잠시휴식');
  const hasIndoor = tags.includes('실내코스');
  if (hasLowWalk && hasIndoor) return '체력 여유 · 도보 부담 적고 따뜻한 실내';
  if (hasLowWalk) return '체력 여유 · 걷기 편한 동선';
  if (hasRest || hasIndoor) return '휴식 추천 · 앉아서 쉬기 좋은 실내';
  return '보통 걸음 · 여유 시간대 추천';
}

interface PlacesNearbyRecommenderProps {
  anchorSpot: ItineraryItem;
  mode: NearbyPreferenceMode;
  onResults: (key: string, items: NearbyRecommendation[]) => void;
  onLoadingChange: (loading: boolean) => void;
  onError: (msg: string | null) => void;
}

const PlacesNearbyFetcher: React.FC<PlacesNearbyRecommenderProps> = ({
  anchorSpot,
  mode,
  onResults,
  onLoadingChange,
  onError,
}) => {
  const placesLib = useMapsLibrary('places');
  const lastFetchedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!placesLib || !anchorSpot) return;
    const modeConfig = PREFERENCE_MODES.find((m) => m.id === mode) || PREFERENCE_MODES[0];
    const cacheKey = `${anchorSpot.id}__${mode}`;
    if (lastFetchedKeyRef.current === cacheKey) return;

    let cancelled = false;
    const runSearch = async () => {
      onLoadingChange(true);
      onError(null);
      try {
        const res = await placesLib.Place.searchNearby({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'primaryType',
            'types',
            'rating',
            'userRatingCount',
            'googleMapsURI',
          ],
          locationRestriction: {
            center: { lat: anchorSpot.lat, lng: anchorSpot.lng },
            radius: modeConfig.radiusMeters,
          },
          includedPrimaryTypes: modeConfig.includedPrimaryTypes,
          maxResultCount: 10,
          rankPreference: modeConfig.rankPreference,
          language: 'ko',
          internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio'],
        });

        if (cancelled) return;
        const parsed = (res.places || [])
          .map((p) => classifyNearbyPlace(p, anchorSpot))
          .filter((p): p is NearbyRecommendation => Boolean(p))
          .sort((a, b) =>
            mode === 'low_stamina'
              ? a.distanceMeters - b.distanceMeters
              : (b.rating || 0) - (a.rating || 0)
          );

        lastFetchedKeyRef.current = cacheKey;
        onResults(cacheKey, parsed);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('OVER_QUERY_LIMIT')) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          onError('주변 장소 검색 사용량 한도에 도달했습니다. 아래 가족 추천 여행지를 확인해 주세요.');
        } else {
          console.warn('Nearby search failed:', err);
          onError('주변 장소를 불러오는 중 일시적 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) onLoadingChange(false);
      }
    };

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [placesLib, anchorSpot, mode, onResults, onLoadingChange, onError]);

  return null;
};

export const WishlistView: React.FC<WishlistViewProps> = ({
  trip,
  actorName,
  activeProfileSlot,
  canEdit,
  travelers,
  itinerary,
  wishlist,
  onFocusOnMap,
  onPromotedToItinerary,
}) => {
  const period = useMemo(
    () => getTripPeriodStatus(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const defaultStartDay = useMemo(() => {
    if (period.status === 'during' && period.currentDayIndex) {
      return Math.min(period.currentDayIndex, TRIP_TOTAL_DAYS - 1);
    }
    return 1;
  }, [period]);

  const [windowStartDay, setWindowStartDay] = useState<number>(defaultStartDay);
  const windowEndDay = Math.min(TRIP_TOTAL_DAYS, windowStartDay + 1);

  const todayTomorrowItems = useMemo(() => {
    return itinerary
      .filter((item) => item.dayIndex === windowStartDay || item.dayIndex === windowEndDay)
      .sort((a, b) => a.dayIndex - b.dayIndex || a.startTime.localeCompare(b.startTime));
  }, [itinerary, windowStartDay, windowEndDay]);

  const [selectedAnchorId, setSelectedAnchorId] = useState<string>('');
  const selectedAnchorSpot = useMemo(() => {
    const matched = todayTomorrowItems.find((i) => i.id === selectedAnchorId);
    return matched || todayTomorrowItems[0] || itinerary[0] || null;
  }, [todayTomorrowItems, selectedAnchorId, itinerary]);

  const [nearbyMode, setNearbyMode] = useState<NearbyPreferenceMode>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [nearbyCache, setNearbyCache] = useState<Record<string, NearbyRecommendation[]>>({});
  const [isSearchingNearby, setIsSearchingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [addedBanner, setAddedBanner] = useState<string | null>(null);

  const [voterId, setVoterId] = useState<string>(
    activeProfileSlot !== 'other_family' ? activeProfileSlot : 'niece_g5'
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual add modal form
  const [city, setCity] = useState('파리');
  const [placeName, setPlaceName] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(48.8566);
  const [lng, setLng] = useState(2.3522);
  const [category, setCategory] = useState<WishlistCategory>('activity');
  const [tags, setTags] = useState<string[]>(['아이취향', '모두만족', '걷기편한']);
  const [reason, setReason] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);

  const activeCacheKey = selectedAnchorSpot ? `${selectedAnchorSpot.id}__${nearbyMode}` : '';
  const rawNearbyItems = activeCacheKey ? nearbyCache[activeCacheKey] || [] : [];

  const filteredNearbyItems = useMemo(() => {
    if (tagFilter === 'all') return rawNearbyItems;
    return rawNearbyItems.filter((item) => item.tags.includes(tagFilter));
  }, [rawNearbyItems, tagFilter]);

  // Match saved family wishlist places against today/tomorrow's itinerary spots
  const enrichedWishlist = useMemo(() => {
    const windowCities = new Set(todayTomorrowItems.map((i) => i.city));
    return wishlist
      .map((place) => {
        let nearestSpot: ItineraryItem | null = null;
        let minDistanceMeters = Infinity;
        for (const spot of todayTomorrowItems) {
          const dist = calcDistanceMeters(spot.lat, spot.lng, place.lat, place.lng);
          if (dist < minDistanceMeters) {
            minDistanceMeters = dist;
            nearestSpot = spot;
          }
        }
        const isNearTodayTomorrow =
          minDistanceMeters <= 5000 || windowCities.has(place.city);
        return {
          place,
          nearestSpot,
          distanceMeters: Number.isFinite(minDistanceMeters) ? minDistanceMeters : null,
          isNearTodayTomorrow,
        };
      })
      .filter(({ place }) => tagFilter === 'all' || place.tags.includes(tagFilter))
      .sort((a, b) => {
        if (a.isNearTodayTomorrow !== b.isNearTodayTomorrow) {
          return a.isNearTodayTomorrow ? -1 : 1;
        }
        return b.place.votedBy.length - a.place.votedBy.length;
      });
  }, [wishlist, todayTomorrowItems, tagFilter]);

  const handleToggleTag = (tagId: string) => {
    setTags((prev) => {
      if (prev.includes(tagId)) return prev.filter((t) => t !== tagId);
      if (prev.length >= 8) return prev;
      return [...prev, tagId];
    });
  };

  const handleSaveNearbyToWishlist = async (rec: NearbyRecommendation) => {
    setSavingPlaceId(rec.placeId);
    try {
      await addWishlistPlace(trip.inviteCode, {
        city: rec.city,
        placeName: rec.placeName,
        googlePlaceId: rec.placeId,
        address: rec.address,
        lat: rec.lat,
        lng: rec.lng,
        category: rec.category,
        tags: rec.tags,
        reason: `${selectedAnchorSpot?.title || '일정 장소'} 근처 (${rec.staminaSummary}) · ${rec.tasteSummary}`,
        suggestedBy: voterId,
      });
      setAddedBanner(`"${rec.placeName}"을(를) 가족 추천 여행지에 저장했습니다.`);
    } finally {
      setSavingPlaceId(null);
    }
  };

  const handleAddNearbyToItinerary = async (rec: NearbyRecommendation) => {
    if (!canEdit || !selectedAnchorSpot) return;
    setSavingPlaceId(rec.placeId);
    try {
      await addItineraryItem(trip.inviteCode, actorName || '가족', {
        dayIndex: selectedAnchorSpot.dayIndex,
        date: getDateForDayIndex(trip.startDate, selectedAnchorSpot.dayIndex),
        startTime: '15:30',
        endTime: '17:00',
        city: rec.city,
        title: rec.placeName,
        category: rec.category,
        placeId: rec.placeId,
        address: rec.address,
        lat: rec.lat,
        lng: rec.lng,
        tags: rec.tags,
        walkingLevel: rec.distanceMeters <= 800 ? 'low' : 'medium',
        memo: `${selectedAnchorSpot.title} 근처 추천 · ${rec.staminaSummary}`,
      });
      onPromotedToItinerary();
    } finally {
      setSavingPlaceId(null);
    }
  };

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) return;
    setIsSavingModal(true);
    try {
      await addWishlistPlace(trip.inviteCode, {
        city,
        placeName,
        googlePlaceId,
        address,
        lat,
        lng,
        category,
        tags: tags.length > 0 ? tags : ['모두만족', '걷기편한'],
        reason,
        suggestedBy: voterId,
      });
      setPlaceName('');
      setAddress('');
      setGooglePlaceId('');
      setReason('');
      setIsModalOpen(false);
    } finally {
      setIsSavingModal(false);
    }
  };

  const handlePromoteSaved = async (place: WishlistPlace, nearestSpot: ItineraryItem | null) => {
    if (!canEdit) return;
    const defaultDay = nearestSpot
      ? nearestSpot.dayIndex
      : place.city.includes('로마')
      ? 12
      : place.city.includes('피렌체')
      ? 10
      : place.city.includes('인터라켄') || place.city.includes('스위스')
      ? 7
      : 3;

    await addItineraryItem(trip.inviteCode, actorName || '가족', {
      dayIndex: defaultDay,
      date: getDateForDayIndex(trip.startDate, defaultDay),
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
      {HAS_MAPS_KEY && selectedAnchorSpot && (
        <PlacesNearbyFetcher
          anchorSpot={selectedAnchorSpot}
          mode={nearbyMode}
          onResults={(key, items) =>
            setNearbyCache((prev) => ({
              ...prev,
              [key]: items,
            }))
          }
          onLoadingChange={setIsSearchingNearby}
          onError={setNearbyError}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">추천 여행지</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            공유 일정표의 오늘 · 내일 장소를 기준으로 근처에서 가볼만한 곳을 취향 · 체력 맞춤 태그와 함께 추천해 드려요.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              if (selectedAnchorSpot) setCity(selectedAnchorSpot.city);
              setIsModalOpen(true);
            }}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            추천 장소 직접 추가
          </button>
        )}
      </div>

      {/* Step 1: Today & Tomorrow Itinerary Places */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {period.status === 'during' && windowStartDay === defaultStartDay
                  ? `오늘 · 내일 공유 일정 장소 (${windowStartDay}일차 ~ ${windowEndDay}일차)`
                  : `기준 공유 일정 장소 (${windowStartDay}일차 ~ ${windowEndDay}일차)`}
              </h2>
              <p className="text-xs text-slate-500">
                일정 장소를 누르면 바로 근처에서 가볼만한 곳을 취향 · 체력에 맞춰 찾아드립니다.
              </p>
            </div>
          </div>

          <select
            aria-label="추천 기준 일정 일차 선택"
            value={windowStartDay}
            onChange={(e) => {
              setWindowStartDay(Number(e.target.value));
              setSelectedAnchorId('');
            }}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
          >
            {Array.from({ length: TRIP_TOTAL_DAYS - 1 }, (_, i) => i + 1).map((day) => {
              const isActualToday =
                period.status === 'during' && period.currentDayIndex === day;
              return (
                <option key={day} value={day}>
                  {isActualToday ? '오늘 · 내일: ' : ''}
                  {day}일차({formatKoreanMonthDay(getDateForDayIndex(trip.startDate, day))}) ~{' '}
                  {day + 1}일차({formatKoreanMonthDay(getDateForDayIndex(trip.startDate, day + 1))})
                </option>
              );
            })}
          </select>
        </div>

        {todayTomorrowItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todayTomorrowItems.map((spot) => {
              const isSelected = selectedAnchorSpot?.id === spot.id;
              const isFirstDay = spot.dayIndex === windowStartDay;
              const dayBadge =
                period.status === 'during' && spot.dayIndex === period.currentDayIndex
                  ? `오늘 · ${spot.dayIndex}일차`
                  : period.status === 'during' &&
                    period.currentDayIndex &&
                    spot.dayIndex === period.currentDayIndex + 1
                  ? `내일 · ${spot.dayIndex}일차`
                  : isFirstDay
                  ? `${spot.dayIndex}일차 (${formatKoreanMonthDay(spot.date)})`
                  : `다음날 · ${spot.dayIndex}일차 (${formatKoreanMonthDay(spot.date)})`;

              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setSelectedAnchorId(spot.id)}
                  className={`text-left p-3 rounded-xl border transition-colors min-h-[76px] flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-semibold font-mono-tabular ${
                        isSelected ? 'text-blue-700' : 'text-slate-500'
                      }`}
                    >
                      {dayBadge} · {spot.startTime}
                    </span>
                    <span className="text-[11px] font-medium text-slate-600">{spot.city}</span>
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                    {spot.title}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {spot.tags.slice(0, 3).map((t) => `#${t}`).join(' ')}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500">
            선택한 날짜에 등록된 공유 일정이 없습니다. 위에서 다른 일차를 선택해 주세요.
          </div>
        )}
      </section>

      {/* Step 2: Taste & Stamina Preference Mode + Tag Filter */}
      <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 space-y-4">
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-emerald-700" />
            취향 · 체력 맞춤 추천 기준 선택
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {PREFERENCE_MODES.map((m) => {
              const active = nearbyMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setNearbyMode(m.id)}
                  className={`text-left p-3 rounded-xl border transition-colors min-h-[60px] ${
                    active
                      ? 'border-blue-600 bg-blue-50 text-blue-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-bold">{m.label}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{m.helper}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            추천 태그로 세부 필터링 (취향 · 체력 태그)
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTagFilter('all')}
              className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold ${
                tagFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700'
              }`}
            >
              전체 태그
            </button>
            {RECOMMENDATION_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTagFilter(t.id)}
                title={t.description}
                className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  tagFilter === t.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {addedBanner && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900 flex items-center justify-between gap-2">
          <span>{addedBanner}</span>
          <button
            type="button"
            onClick={() => setAddedBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 font-semibold"
          >
            닫기
          </button>
        </div>
      )}

      {/* Nearby Recommendations Section */}
      <section className="mb-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {selectedAnchorSpot
                ? `'${selectedAnchorSpot.title}' 근처 가볼만한 곳`
                : '일정 장소 근처 추천'}
            </h2>
          </div>
          {selectedAnchorSpot && (
            <span className="text-xs text-slate-500 font-mono-tabular">
              {selectedAnchorSpot.dayIndex}일차 ({formatKoreanMonthDay(selectedAnchorSpot.date)}) ·{' '}
              {selectedAnchorSpot.city} 반경{' '}
              {nearbyMode === 'low_stamina' ? '750m' : '1.5km'} 이내
            </span>
          )}
        </div>

        {!HAS_MAPS_KEY ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-600">
            Google Maps API 키가 설정되면 오늘 · 내일 일정 근처의 실제 장소 추천이 자동으로 표시됩니다. 아래 가족 추천 여행지 목록을 확인해 보세요.
          </div>
        ) : isSearchingNearby ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 flex items-center justify-center gap-2.5 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-blue-700" />
            <span>
              {selectedAnchorSpot?.title} 근처에서 가족 취향 · 체력에 맞는 장소를 찾는 중입니다...
            </span>
          </div>
        ) : nearbyError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
            {nearbyError}
          </div>
        ) : filteredNearbyItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs sm:text-sm text-slate-500">
            선택한 태그 조건에 맞는 근처 장소가 없습니다. &lsquo;전체 태그&rsquo;나 다른 맞춤 모드를 선택해 보세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNearbyItems.map((rec) => {
              const alreadySaved = wishlist.some((w) => w.googlePlaceId === rec.placeId);
              return (
                <div
                  key={rec.placeId}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5">
                      <span className="font-semibold text-blue-700">
                        {rec.city} · {CATEGORY_LABELS[rec.category]}
                      </span>
                      {rec.rating && (
                        <span className="inline-flex items-center gap-1 font-mono-tabular font-semibold text-amber-700">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          {rec.rating.toFixed(1)}
                          {rec.userRatingCount ? ` (${rec.userRatingCount.toLocaleString()})` : ''}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{rec.placeName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{rec.address}</p>

                    <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                        <Footprints className="w-3.5 h-3.5 shrink-0" />
                        <span>{rec.staminaSummary}</span>
                      </div>
                      <p className="text-xs text-slate-700">{rec.tasteSummary}</p>
                    </div>

                    {/* Mandatory Taste & Stamina Tags */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {rec.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                            tag === '걷기편한' || tag === '잠시휴식' || tag === '실내코스'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onFocusOnMap(rec.lat, rec.lng, rec.placeName)}
                        className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        지도
                      </button>
                      {rec.googleMapsURI && (
                        <a
                          href={rec.googleMapsURI}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[40px] px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          상세
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={alreadySaved || savingPlaceId === rec.placeId}
                        onClick={() => void handleSaveNearbyToWishlist(rec)}
                        className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          alreadySaved
                            ? 'bg-slate-100 border-slate-200 text-slate-500'
                            : 'bg-white border-blue-200 text-blue-700 hover:bg-blue-50'
                        }`}
                      >
                        {alreadySaved ? (
                          <>
                            <BookmarkCheck className="w-3.5 h-3.5" />
                            저장됨
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            추천 저장
                          </>
                        )}
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          disabled={savingPlaceId === rec.placeId}
                          onClick={() => void handleAddNearbyToItinerary(rec)}
                          className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          {selectedAnchorSpot?.dayIndex}일차 일정 추가
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Family Recommended Places & Voting Section */}
      <section className="pt-6 border-t border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                우리 가족 저장한 추천 여행지 ({enrichedWishlist.length})
              </h2>
              <p className="text-xs text-slate-500">
                오늘 · 내일 일정 근처 장소가 먼저 표시됩니다. 가족 취향 투표를 누르고 일정표에 반영하세요.
              </p>
            </div>
          </div>
        </div>

        {/* Who is voting selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
          <div className="text-xs font-semibold text-slate-600 mb-2">
            지금 투표 · 저장하는 가족 선택 (아이들 핸드폰이 없어도 대신 눌러줄 수 있어요)
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

        {/* Saved Wishlist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {enrichedWishlist.map(({ place, nearestSpot, distanceMeters, isNearTodayTomorrow }) => {
            const voted = place.votedBy.includes(voterId);
            const voterNames = place.votedBy
              .map((id) => travelers.find((t) => t.id === id)?.avatarInitial || id)
              .join(', ');
            const suggester = travelers.find((t) => t.id === place.suggestedBy)?.name || '가족';

            return (
              <div
                key={place.id}
                className={`bg-white border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                  isNearTodayTomorrow ? 'border-blue-300' : 'border-slate-200'
                }`}
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

                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">{place.placeName}</h3>
                    {isNearTodayTomorrow && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-semibold">
                        기준 일정 근처
                        {distanceMeters !== null && distanceMeters <= 5000
                          ? ` (${formatDistanceLabel(distanceMeters)})`
                          : ''}
                      </span>
                    )}
                  </div>

                  {place.address && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{place.address}</p>
                  )}

                  <div className="mt-2 text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5 shrink-0" />
                    <span>{getStaminaLabelFromTags(place.tags)}</span>
                  </div>

                  {place.reason && (
                    <p className="text-sm text-slate-700 mt-2 leading-relaxed">{place.reason}</p>
                  )}

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {place.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                          tag === '걷기편한' || tag === '잠시휴식' || tag === '실내코스'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {voterNames && (
                    <div className="mt-2 text-xs text-slate-500">찜한 가족: {voterNames}</div>
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
                        onClick={() => void handlePromoteSaved(place, nearestSpot)}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        일정표에 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteWishlistPlace(trip.inviteCode, place.id)}
                        title="삭제"
                        className="min-h-[40px] min-w-[40px] p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Recommended Place Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">추천 여행지 직접 추가</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="p-5 space-y-4">
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
                  취향 · 체력 맞춤 추천 태그 (필수 1개 이상 선택)
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
                  추천 이유 (취향 · 체력 메모)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="예: 루브르 일정 끝나고 걸어서 5분, 엄마랑 이모들이 쉬기 좋은 카페"
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
                  disabled={isSavingModal || !placeName.trim()}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                >
                  {isSavingModal ? '저장 중...' : '추천 여행지에 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
