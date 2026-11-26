import { Timestamp } from 'firebase/firestore';

export type ProfileSlot =
  | 'me'
  | 'daughter_g6'
  | 'mom'
  | 'aunt_1'
  | 'aunt_2'
  | 'niece_g5'
  | 'other_family';

export type MemberRole = 'owner' | 'editor' | 'viewer';
export type AgeGroup = 'kid' | 'adult' | 'senior';
export type ItineraryCategory =
  | 'landmark'
  | 'food'
  | 'cafe'
  | 'museum'
  | 'activity'
  | 'shopping'
  | 'transit'
  | 'lodging';

export type WishlistCategory =
  | 'landmark'
  | 'food'
  | 'cafe'
  | 'museum'
  | 'activity'
  | 'shopping';

export type WalkingLevel = 'low' | 'medium' | 'high';
export type ItineraryStatus = 'planned' | 'visited' | 'skipped';
export type DiaryEntryType = 'meal' | 'spot' | 'moment';

export interface GuestSession {
  tripId: string;
  displayName: string;
  profileSlot: ProfileSlot;
}

export interface TripRoom {
  inviteCode: string;
  title: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JoinedTrip {
  inviteCode: string;
  tripTitle: string;
  role: MemberRole;
  joinedAt: Timestamp;
}

export interface Traveler {
  id: string;
  name: string;
  relation: string;
  ageGroup: AgeGroup;
  markerColor: string;
  avatarInitial: string;
  isSharingLocation: boolean;
  lat: number;
  lng: number;
  accuracyMeters: number;
  currentPlaceLabel: string;
  statusNote: string;
  updatedAt: Timestamp;
}

export interface ItineraryItem {
  id: string;
  dayIndex: number;
  date: string;
  startTime: string;
  endTime: string;
  city: string;
  title: string;
  category: ItineraryCategory;
  placeId: string;
  address: string;
  lat: number;
  lng: number;
  tags: string[];
  walkingLevel: WalkingLevel;
  memo: string;
  status: ItineraryStatus;
  likedBy: string[];
  updatedByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DiaryEntry {
  id: string;
  dayIndex: number;
  date: string;
  timeLabel: string;
  city: string;
  placeName: string;
  mealOrActivity: string;
  entryType: DiaryEntryType;
  story: string;
  photoUrl: string;
  lat: number;
  lng: number;
  withTravelers: string[];
  tags: string[];
  authorName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WishlistPlace {
  id: string;
  city: string;
  placeName: string;
  googlePlaceId: string;
  address: string;
  lat: number;
  lng: number;
  category: WishlistCategory;
  tags: string[];
  reason: string;
  suggestedBy: string;
  votedBy: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RecommendationTag {
  id: string;
  label: string;
  group: 'audience' | 'comfort' | 'theme';
  description: string;
}

export const RECOMMENDATION_TAGS: RecommendationTag[] = [
  { id: '모두만족', label: '#모두만족', group: 'audience', description: '초5·초6 아이들과 어른 모두 즐거운 핵심 코스' },
  { id: '아이취향', label: '#아이취향', group: 'audience', description: '체험, 디저트, 캐릭터/굿즈 등 초등학생 선호' },
  { id: '어른감성', label: '#어른감성', group: 'audience', description: '미술관, 로컬 카페, 전망·야경 등 어른 선호' },
  { id: '걷기편한', label: '#걷기편한', group: 'comfort', description: '평지 위주 또는 이동 부담이 적은 코스' },
  { id: '잠시휴식', label: '#잠시휴식', group: 'comfort', description: '화장실·벤치·카페가 가까워 쉬기 좋은 곳' },
  { id: '실내코스', label: '#실내코스', group: 'comfort', description: '겨울 추위나 비를 피해 쾌적한 실내 공간' },
  { id: '체험액티비티', label: '#체험액티비티', group: 'theme', description: '유람선, 케이블카, 산악열차 등 탈거리·체험' },
  { id: '포토스팟', label: '#포토스팟', group: 'theme', description: '가족 단체사진 남기기 좋은 명소' },
  { id: '디저트간식', label: '#디저트간식', group: 'theme', description: '젤라또, 크레페, 마카롱 등 간식 맛집' },
  { id: '역사스토리', label: '#역사스토리', group: 'theme', description: '교과서·세계사 이야기와 연결되는 곳' },
  { id: '기념품쇼핑', label: '#기념품쇼핑', group: 'theme', description: '가족·친구 선물 고르기 좋은 상점가' },
];

export const PROFILE_SLOT_OPTIONS: {
  id: ProfileSlot;
  label: string;
  sublabel: string;
}[] = [
  { id: 'me', label: '나 (인솔자)', sublabel: '여행 일정 & 사진 기록' },
  { id: 'daughter_g6', label: '내 딸 (초6)', sublabel: '초등 6학년' },
  { id: 'niece_g5', label: '조카 (초5)', sublabel: '초등 5학년' },
  { id: 'mom', label: '엄마', sublabel: '어머님' },
  { id: 'aunt_1', label: '큰이모', sublabel: '이모 1' },
  { id: 'aunt_2', label: '작은이모', sublabel: '이모 2' },
  { id: 'other_family', label: '다른 가족', sublabel: '일정 & 사진 일기 함께 보기' },
];

export const CATEGORY_LABELS: Record<ItineraryCategory, string> = {
  landmark: '명소',
  food: '식사',
  cafe: '카페·디저트',
  museum: '박물관·미술관',
  activity: '체험·투어',
  shopping: '쇼핑',
  transit: '이동',
  lodging: '숙소',
};

export const WALKING_LABELS: Record<WalkingLevel, string> = {
  low: '도보 여유',
  medium: '보통 걸음',
  high: '많이 걸음',
};

export const ENTRY_TYPE_LABELS: Record<DiaryEntryType, string> = {
  meal: '오늘 먹은 것',
  spot: '다녀온 곳',
  moment: '가족 추억',
};

// Validation constants synchronized with firebase-blueprint.json
export const BLUEPRINT_LIMITS = {
  TRIP_TITLE_MAX: 100,
  TRIP_SUBTITLE_MAX: 160,
  CITY_MAX: 50,
  ITEM_TITLE_MAX: 100,
  ADDRESS_MAX: 200,
  MEMO_MAX: 400,
  STORY_MAX: 800,
  MEAL_ACTIVITY_MAX: 120,
  PLACE_NAME_MAX: 100,
  STATUS_NOTE_MAX: 80,
  REASON_MAX: 300,
  PHOTO_MAX_LENGTH: 250000,
  TAGS_MAX: 8,
  MEMBERS_MAX: 10,
};

export function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}
