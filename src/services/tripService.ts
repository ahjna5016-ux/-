import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BLUEPRINT_LIMITS,
  clampString,
  DiaryEntry,
  DiaryEntryType,
  ItineraryCategory,
  ItineraryItem,
  ItineraryStatus,
  JoinedTrip,
  Traveler,
  TripRoom,
  WalkingLevel,
  WishlistCategory,
  WishlistPlace,
} from '../types/trip';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function makeInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'EU';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function formatDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function createDefaultEuropeTrip(
  user: User,
  displayName: string
): Promise<string> {
  const inviteCode = makeInviteCode();
  const safeName = clampString(displayName || user.displayName || '가족', 60);
  const startDate = formatDateOffset(0);
  const day2Date = formatDateOffset(1);
  const day3Date = formatDateOffset(2);
  const endDate = formatDateOffset(3);

  const travelerSeeds: Omit<Traveler, 'updatedAt'>[] = [
    {
      id: 'me',
      name: safeName === '나 (인솔자)' ? '나' : safeName,
      relation: '인솔자 · 여행 기록',
      ageGroup: 'adult',
      markerColor: '#1D4ED8',
      avatarInitial: '나',
      isSharingLocation: false,
      lat: 48.8584,
      lng: 2.2945,
      accuracyMeters: 25,
      currentPlaceLabel: '에펠탑 광장 근처',
      statusNote: '가족 일정 확인 중',
    },
    {
      id: 'daughter_g6',
      name: '내 딸 (초6)',
      relation: '초등 6학년',
      ageGroup: 'kid',
      markerColor: '#E11D48',
      avatarInitial: '딸',
      isSharingLocation: false,
      lat: 48.8592,
      lng: 2.2932,
      accuracyMeters: 25,
      currentPlaceLabel: '에펠탑 앞 잔디광장',
      statusNote: '사진 찍는 중',
    },
    {
      id: 'niece_g5',
      name: '조카 (초5)',
      relation: '형의 딸 · 초5',
      ageGroup: 'kid',
      markerColor: '#D97706',
      avatarInitial: '조카',
      isSharingLocation: false,
      lat: 48.8589,
      lng: 2.2951,
      accuracyMeters: 25,
      currentPlaceLabel: '크레페 가판대 앞',
      statusNote: '간식 고르는 중',
    },
    {
      id: 'mom',
      name: '엄마',
      relation: '어머님',
      ageGroup: 'senior',
      markerColor: '#059669',
      avatarInitial: '엄마',
      isSharingLocation: false,
      lat: 48.8616,
      lng: 2.2893,
      accuracyMeters: 30,
      currentPlaceLabel: '트로카데로 전망대 벤치',
      statusNote: '잠시 앉아 쉬는 중',
    },
    {
      id: 'aunt_1',
      name: '큰이모',
      relation: '이모 1',
      ageGroup: 'adult',
      markerColor: '#7C3AED',
      avatarInitial: '이모1',
      isSharingLocation: false,
      lat: 48.8613,
      lng: 2.2899,
      accuracyMeters: 30,
      currentPlaceLabel: '트로카데로 광장',
      statusNote: '어머니와 함께 풍경 감상',
    },
    {
      id: 'aunt_2',
      name: '작은이모',
      relation: '이모 2',
      ageGroup: 'adult',
      markerColor: '#0891B2',
      avatarInitial: '이모2',
      isSharingLocation: false,
      lat: 48.8578,
      lng: 2.2961,
      accuracyMeters: 30,
      currentPlaceLabel: '세느강 선착장 방향',
      statusNote: '유람선 표 확인 중',
    },
  ];

  const itinerarySeeds: Omit<ItineraryItem, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'item_day1_1',
      dayIndex: 1,
      date: startDate,
      startTime: '09:30',
      endTime: '11:30',
      city: '파리',
      title: '트로카데로 광장 & 에펠탑 아침 산책',
      category: 'landmark',
      placeId: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
      address: 'Champ de Mars, 5 Av. Anatole France, Paris',
      lat: 48.8584,
      lng: 2.2945,
      tags: ['모두만족', '포토스팟', '걷기편한'],
      walkingLevel: 'low',
      memo: '아침 햇살에 가족 단체사진 찍기. 엄마·이모님 쉬실 벤치 많음.',
      status: 'visited',
      likedBy: ['me', 'mom', 'daughter_g6', 'niece_g5'],
      updatedByName: safeName,
    },
    {
      id: 'item_day1_2',
      dayIndex: 1,
      date: startDate,
      startTime: '12:15',
      endTime: '14:00',
      city: '파리',
      title: '세느강 바토무슈 유람선 & 크레페 간식',
      category: 'activity',
      placeId: 'ChIJW3jZ_ilu5kcR4PcOOO6p3I0',
      address: 'Port de la Conférence, 75008 Paris',
      lat: 48.8638,
      lng: 2.3065,
      tags: ['모두만족', '아이취향', '체험액티비티', '걷기편한'],
      walkingLevel: 'low',
      memo: '앉아서 파리 명소를 한 번에 구경! 아이들 누텔라 크레페 먹기.',
      status: 'visited',
      likedBy: ['daughter_g6', 'niece_g5', 'aunt_1', 'aunt_2'],
      updatedByName: safeName,
    },
    {
      id: 'item_day1_3',
      dayIndex: 1,
      date: startDate,
      startTime: '15:30',
      endTime: '17:30',
      city: '파리',
      title: '마레 지구 카페 휴식 & 기념품 샵',
      category: 'cafe',
      placeId: 'ChIJ_marais_paris',
      address: 'Le Marais, 75004 Paris',
      lat: 48.8566,
      lng: 2.3622,
      tags: ['어른감성', '잠시휴식', '디저트간식', '기념품쇼핑'],
      walkingLevel: 'low',
      memo: '어른들은 따뜻한 카페오레, 아이들은 마카롱 고르기.',
      status: 'planned',
      likedBy: ['aunt_1', 'aunt_2', 'daughter_g6'],
      updatedByName: safeName,
    },
    {
      id: 'item_day2_1',
      dayIndex: 2,
      date: day2Date,
      startTime: '10:00',
      endTime: '13:00',
      city: '파리',
      title: '루브르 박물관 핵심 코스 (모나리자·승리의 여신상)',
      category: 'museum',
      placeId: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
      address: 'Rue de Rivoli, 75001 Paris',
      lat: 48.8606,
      lng: 2.3376,
      tags: ['어른감성', '역사스토리', '실내코스'],
      walkingLevel: 'medium',
      memo: '초5·초6 아이들이 지치지 않게 딱 2시간 핵심만 보고 나오기.',
      status: 'planned',
      likedBy: ['mom', 'aunt_1', 'me'],
      updatedByName: safeName,
    },
    {
      id: 'item_day2_2',
      dayIndex: 2,
      date: day2Date,
      startTime: '13:30',
      endTime: '15:00',
      city: '파리',
      title: '튈르리 정원 피크닉 & 회전목마',
      category: 'food',
      placeId: 'ChIJ_tuileries_paris',
      address: 'Place de la Concorde, 75001 Paris',
      lat: 48.8635,
      lng: 2.3275,
      tags: ['모두만족', '아이취향', '잠시휴식'],
      walkingLevel: 'low',
      memo: '바게트 샌드위치와 과일 사서 정원 분수대 앞 의자에서 점심.',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'mom'],
      updatedByName: safeName,
    },
    {
      id: 'item_day3_1',
      dayIndex: 3,
      date: day3Date,
      startTime: '10:30',
      endTime: '14:30',
      city: '인터라켄',
      title: '브리엔츠 호수 유람선 & 알프스 산악열차',
      category: 'activity',
      placeId: 'ChIJ_brienz_swiss',
      address: 'Interlaken Ost, 3800 Interlaken, Switzerland',
      lat: 46.6905,
      lng: 7.8686,
      tags: ['모두만족', '아이취향', '체험액티비티', '걷기편한'],
      walkingLevel: 'low',
      memo: '열차 타고 창밖으로 알프스 설산 감상! 겉옷 챙기기.',
      status: 'planned',
      likedBy: ['me', 'mom', 'aunt_1', 'aunt_2', 'daughter_g6', 'niece_g5'],
      updatedByName: safeName,
    },
    {
      id: 'item_day4_1',
      dayIndex: 4,
      date: endDate,
      startTime: '10:00',
      endTime: '12:30',
      city: '로마',
      title: '콜로세움 외관 & 로마 역사 이야기 투어',
      category: 'landmark',
      placeId: 'ChIJrRMgU7ZhLxMRxAOFkC7I8Sg',
      address: 'Piazza del Colosseo, 1, 00184 Roma RM',
      lat: 41.8902,
      lng: 12.4922,
      tags: ['모두만족', '역사스토리', '포토스팟'],
      walkingLevel: 'medium',
      memo: '검투사 이야기로 초5·초6 아이들 눈높이에 맞춰 구경하기.',
      status: 'planned',
      likedBy: ['niece_g5', 'daughter_g6', 'me'],
      updatedByName: safeName,
    },
    {
      id: 'item_day4_2',
      dayIndex: 4,
      date: endDate,
      startTime: '15:00',
      endTime: '16:15',
      city: '로마',
      title: '지올리띠 수제 젤라또 & 트레비 분수',
      category: 'cafe',
      placeId: 'ChIJ_giolitti_rome',
      address: 'Via degli Uffici del Vicario, 40, Roma',
      lat: 41.9012,
      lng: 12.4785,
      tags: ['아이취향', '디저트간식', '잠시휴식'],
      walkingLevel: 'low',
      memo: '피스타치오·쌀맛·딸기맛 젤라또 1일 1컵 필수!',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'aunt_2'],
      updatedByName: safeName,
    },
  ];

  const diarySeeds: Omit<DiaryEntry, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'diary_sample_1',
      dayIndex: 1,
      date: startDate,
      timeLabel: '12:40',
      city: '파리',
      placeName: '세느강 바토무슈 선착장',
      mealOrActivity: '세느강 유람선 탑승 & 누텔라 바나나 크레페',
      entryType: 'spot',
      story:
        '걸어 다니느라 엄마랑 이모들이 조금 힘들어하셨는데, 유람선 2층에 시원한 바람 맞으며 앉아서 에펠탑이랑 노트르담 대성당을 다 구경했어요. 아이들은 선착장에서 사 먹은 바나나 누텔라 크레페가 최고였대요!',
      photoUrl: '/src/assets/images/sample_diary_seine_1795673595983.jpg',
      lat: 48.8638,
      lng: 2.3065,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['모두만족', '체험액티비티', '걷기편한'],
      authorName: safeName,
    },
    {
      id: 'diary_sample_2',
      dayIndex: 1,
      date: startDate,
      timeLabel: '15:20',
      city: '파리',
      placeName: '에펠탑 근처 골목 젤라또 가게',
      mealOrActivity: '피스타치오 & 산딸기 수제 젤라또',
      entryType: 'meal',
      story:
        '오늘 점심 먹고 디저트로 젤라또 하나씩 손에 들었습니다. 형 딸(초5)은 상큼한 딸기맛, 우리 딸(초6)은 진한 피스타치오맛 골라서 둘이 아주 잘 먹네요. 엄마랑 이모들도 많이 달지 않다고 만족하셨어요.',
      photoUrl: '/src/assets/images/sample_diary_gelato_1795673596018.jpg',
      lat: 48.8576,
      lng: 2.2974,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['아이취향', '디저트간식', '잠시휴식'],
      authorName: safeName,
    },
    {
      id: 'diary_sample_3',
      dayIndex: 3,
      date: day3Date,
      timeLabel: '11:15',
      city: '인터라켄',
      placeName: '브리엔츠 호수 전망 산악열차',
      mealOrActivity: '에메랄드빛 호수 보며 기차 도시락',
      entryType: 'moment',
      story:
        '예정 코스 미리 체크! 스위스 들어가면 산악열차 안에서 창밖 풍경 보면서 쉴 수 있어서 6명 가족 모두 체력 충전하기 좋은 날이 될 것 같아요.',
      photoUrl: '/src/assets/images/sample_diary_alps_1795673597486.jpg',
      lat: 46.7536,
      lng: 8.0372,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['모두만족', '포토스팟', '걷기편한'],
      authorName: safeName,
    },
  ];

  const wishlistSeeds: Omit<WishlistPlace, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'wish_1',
      city: '파리',
      placeName: '메르시(Merci) 편집샵 & 에코백 쇼핑',
      googlePlaceId: 'ChIJ_merci_paris',
      address: '111 Bd Beaumarchais, 75003 Paris',
      lat: 48.8606,
      lng: 2.3666,
      category: 'shopping',
      tags: ['어른감성', '기념품쇼핑', '실내코스'],
      reason: '이모들이 꼭 들르고 싶어 하는 파리 기념품·에코백 매장',
      suggestedBy: 'aunt_1',
      votedBy: ['aunt_1', 'aunt_2', 'mom', 'me'],
    },
    {
      id: 'wish_2',
      city: '파리',
      placeName: '파리 자연사박물관 대진화관',
      googlePlaceId: 'ChIJ_galerie_paris',
      address: '36 Rue Geoffroy-Saint-Hilaire, 75005 Paris',
      lat: 48.8422,
      lng: 2.3563,
      category: 'museum',
      tags: ['아이취향', '체험액티비티', '실내코스'],
      reason: '동물 모형 행렬 전시가 멋져서 초5·초6 아이들이 정말 좋아함',
      suggestedBy: 'daughter_g6',
      votedBy: ['daughter_g6', 'niece_g5', 'me'],
    },
    {
      id: 'wish_3',
      city: '인터라켄',
      placeName: '하더쿨름 전망대 푸니쿨라',
      googlePlaceId: 'ChIJ_harderkulm',
      address: 'Harderstrasse, 3800 Unterseen',
      lat: 46.6976,
      lng: 7.8511,
      category: 'landmark',
      tags: ['모두만족', '포토스팟', '걷기편한'],
      reason: '케이블 열차로 10분 만에 올라가서 안 걸어도 멋진 알프스 뷰!',
      suggestedBy: 'mom',
      votedBy: ['mom', 'aunt_1', 'niece_g5', 'me'],
    },
    {
      id: 'wish_4',
      city: '로마',
      placeName: '타짜도르 에스프레소 & 레몬 슬러시',
      googlePlaceId: 'ChIJ_tazzadoro_rome',
      address: 'Via degli Orfani, 84, 00186 Roma',
      lat: 41.8994,
      lng: 12.4774,
      category: 'cafe',
      tags: ['어른감성', '잠시휴식', '디저트간식'],
      reason: '어른들은 커피 그라니따, 아이들은 시원한 과일 슬러시 한 잔',
      suggestedBy: 'aunt_2',
      votedBy: ['aunt_2', 'mom', 'daughter_g6'],
    },
  ];

  // Create TripRoom + organizer reference
  try {
    await setDoc(doc(db, 'tripRooms', inviteCode), {
      inviteCode,
      title: '우리 가족 유럽 대모험',
      subtitle: '나 · 딸(초6) · 조카(초5) · 엄마 · 이모 2분 — 6인의 실시간 일정 & 사진 일기',
      startDate,
      endDate,
      ownerId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'users', user.uid, 'joinedTrips', inviteCode), {
      inviteCode,
      tripTitle: '우리 가족 유럽 대모험',
      role: 'owner',
      joinedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tripRooms/${inviteCode}`);
  }

  // Seed travelers, itinerary, diary entries, and wishlist
  const batch = writeBatch(db);
  for (const t of travelerSeeds) {
    batch.set(doc(db, 'tripRooms', inviteCode, 'travelers', t.id), {
      ...t,
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of itinerarySeeds) {
    batch.set(doc(db, 'tripRooms', inviteCode, 'itineraryItems', item.id), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const entry of diarySeeds) {
    batch.set(doc(db, 'tripRooms', inviteCode, 'diaryEntries', entry.id), {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const wish of wishlistSeeds) {
    batch.set(doc(db, 'tripRooms', inviteCode, 'wishlistPlaces', wish.id), {
      ...wish,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tripRooms/${inviteCode}/seed`);
  }

  return inviteCode;
}

export async function verifyInviteCode(rawInviteCode: string): Promise<TripRoom> {
  const code = rawInviteCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) {
    throw new Error('초대 코드는 영문 대문자와 숫자 6~12자리여야 합니다.');
  }

  let snap;
  try {
    snap = await getDoc(doc(db, 'tripRooms', code));
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `tripRooms/${code}`);
  }

  if (!snap.exists()) {
    throw new Error('해당 초대 코드의 여행을 찾을 수 없습니다. 코드를 다시 확인해 주세요.');
  }

  return snap.data() as TripRoom;
}

export function subscribeUserJoinedTrips(
  uid: string,
  onData: (trips: JoinedTrip[]) => void
): Unsubscribe {
  const path = `users/${uid}/joinedTrips`;
  return onSnapshot(
    collection(db, 'users', uid, 'joinedTrips'),
    (snap) => {
      onData(snap.docs.map((d) => d.data() as JoinedTrip));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeTripRoom(
  inviteCode: string,
  onData: (trip: TripRoom | null) => void
): Unsubscribe {
  const path = `tripRooms/${inviteCode}`;
  return onSnapshot(
    doc(db, 'tripRooms', inviteCode),
    (snap) => {
      onData(snap.exists() ? (snap.data() as TripRoom) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeTravelers(
  inviteCode: string,
  onData: (travelers: Traveler[]) => void
): Unsubscribe {
  const path = `tripRooms/${inviteCode}/travelers`;
  return onSnapshot(
    collection(db, 'tripRooms', inviteCode, 'travelers'),
    (snap) => {
      const order = ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'];
      const list = snap.docs
        .map((d) => d.data() as Traveler)
        .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeItinerary(
  inviteCode: string,
  onData: (items: ItineraryItem[]) => void
): Unsubscribe {
  const path = `tripRooms/${inviteCode}/itineraryItems`;
  const q = query(
    collection(db, 'tripRooms', inviteCode, 'itineraryItems'),
    orderBy('dayIndex', 'asc'),
    orderBy('startTime', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => d.data() as ItineraryItem));
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
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

export function subscribeDiaryEntries(
  inviteCode: string,
  onData: (entries: DiaryEntry[]) => void
): Unsubscribe {
  const path = `tripRooms/${inviteCode}/diaryEntries`;
  return onSnapshot(
    collection(db, 'tripRooms', inviteCode, 'diaryEntries'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as DiaryEntry)
        .sort((a, b) => {
          const timeDiff = getDiarySortMillis(b) - getDiarySortMillis(a);
          if (timeDiff !== 0) return timeDiff;
          if (b.date !== a.date) return b.date.localeCompare(a.date);
          if (b.dayIndex !== a.dayIndex) return b.dayIndex - a.dayIndex;
          return b.timeLabel.localeCompare(a.timeLabel);
        });
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export function subscribeWishlistPlaces(
  inviteCode: string,
  onData: (places: WishlistPlace[]) => void
): Unsubscribe {
  const path = `tripRooms/${inviteCode}/wishlistPlaces`;
  return onSnapshot(
    collection(db, 'tripRooms', inviteCode, 'wishlistPlaces'),
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as WishlistPlace)
        .sort((a, b) => b.votedBy.length - a.votedBy.length);
      onData(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, path)
  );
}

export async function updateTravelerLocation(
  inviteCode: string,
  travelerId: string,
  payload: {
    lat: number;
    lng: number;
    accuracyMeters: number;
    currentPlaceLabel: string;
    statusNote: string;
    isSharingLocation: boolean;
  }
): Promise<void> {
  const path = `tripRooms/${inviteCode}/travelers/${travelerId}`;
  try {
    await updateDoc(doc(db, 'tripRooms', inviteCode, 'travelers', travelerId), {
      lat: payload.lat,
      lng: payload.lng,
      accuracyMeters: Math.max(0, Math.min(50000, Math.round(payload.accuracyMeters))),
      currentPlaceLabel: clampString(payload.currentPlaceLabel, 100),
      statusNote: clampString(payload.statusNote, BLUEPRINT_LIMITS.STATUS_NOTE_MAX),
      isSharingLocation: payload.isSharingLocation,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addItineraryItem(
  inviteCode: string,
  updatedByName: string,
  input: {
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
  }
): Promise<void> {
  const id = makeId('item');
  const path = `tripRooms/${inviteCode}/itineraryItems/${id}`;
  try {
    await setDoc(doc(db, 'tripRooms', inviteCode, 'itineraryItems', id), {
      id,
      dayIndex: Math.max(1, Math.min(30, input.dayIndex)),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      city: clampString(input.city || '유럽', BLUEPRINT_LIMITS.CITY_MAX),
      title: clampString(input.title, BLUEPRINT_LIMITS.ITEM_TITLE_MAX),
      category: input.category,
      placeId: clampString(input.placeId || '', 160),
      address: clampString(input.address || '', BLUEPRINT_LIMITS.ADDRESS_MAX),
      lat: input.lat,
      lng: input.lng,
      tags: input.tags.slice(0, BLUEPRINT_LIMITS.TAGS_MAX),
      walkingLevel: input.walkingLevel,
      memo: clampString(input.memo || '', BLUEPRINT_LIMITS.MEMO_MAX),
      status: 'planned' as ItineraryStatus,
      likedBy: [],
      updatedByName: clampString(updatedByName || '가족', 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateItineraryItem(
  inviteCode: string,
  itemId: string,
  updatedByName: string,
  updates: Partial<{
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
  }>
): Promise<void> {
  const path = `tripRooms/${inviteCode}/itineraryItems/${itemId}`;
  const cleanUpdates: Record<string, unknown> = {
    updatedByName: clampString(updatedByName || '가족', 60),
    updatedAt: serverTimestamp(),
  };
  if (updates.dayIndex !== undefined) cleanUpdates.dayIndex = Math.max(1, Math.min(30, updates.dayIndex));
  if (updates.date !== undefined) cleanUpdates.date = updates.date;
  if (updates.startTime !== undefined) cleanUpdates.startTime = updates.startTime;
  if (updates.endTime !== undefined) cleanUpdates.endTime = updates.endTime;
  if (updates.city !== undefined) cleanUpdates.city = clampString(updates.city, BLUEPRINT_LIMITS.CITY_MAX);
  if (updates.title !== undefined) cleanUpdates.title = clampString(updates.title, BLUEPRINT_LIMITS.ITEM_TITLE_MAX);
  if (updates.category !== undefined) cleanUpdates.category = updates.category;
  if (updates.placeId !== undefined) cleanUpdates.placeId = clampString(updates.placeId, 160);
  if (updates.address !== undefined) cleanUpdates.address = clampString(updates.address, BLUEPRINT_LIMITS.ADDRESS_MAX);
  if (updates.lat !== undefined) cleanUpdates.lat = updates.lat;
  if (updates.lng !== undefined) cleanUpdates.lng = updates.lng;
  if (updates.tags !== undefined) cleanUpdates.tags = updates.tags.slice(0, BLUEPRINT_LIMITS.TAGS_MAX);
  if (updates.walkingLevel !== undefined) cleanUpdates.walkingLevel = updates.walkingLevel;
  if (updates.memo !== undefined) cleanUpdates.memo = clampString(updates.memo, BLUEPRINT_LIMITS.MEMO_MAX);
  if (updates.status !== undefined) cleanUpdates.status = updates.status;

  try {
    await updateDoc(doc(db, 'tripRooms', inviteCode, 'itineraryItems', itemId), cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleItineraryLike(
  inviteCode: string,
  item: ItineraryItem,
  travelerId: string
): Promise<void> {
  const path = `tripRooms/${inviteCode}/itineraryItems/${item.id}`;
  const exists = item.likedBy.includes(travelerId);
  const nextLikes = exists
    ? item.likedBy.filter((id) => id !== travelerId)
    : [...item.likedBy, travelerId].slice(0, BLUEPRINT_LIMITS.MEMBERS_MAX);

  try {
    await updateDoc(doc(db, 'tripRooms', inviteCode, 'itineraryItems', item.id), {
      likedBy: nextLikes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteItineraryItem(inviteCode: string, itemId: string): Promise<void> {
  const path = `tripRooms/${inviteCode}/itineraryItems/${itemId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', inviteCode, 'itineraryItems', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addDiaryEntry(
  inviteCode: string,
  authorName: string,
  input: {
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
  }
): Promise<void> {
  const id = makeId('diary');
  const path = `tripRooms/${inviteCode}/diaryEntries/${id}`;
  const safePhoto =
    input.photoUrl.length <= BLUEPRINT_LIMITS.PHOTO_MAX_LENGTH
      ? input.photoUrl
      : '';

  try {
    await setDoc(doc(db, 'tripRooms', inviteCode, 'diaryEntries', id), {
      id,
      dayIndex: Math.max(1, Math.min(30, input.dayIndex)),
      date: input.date,
      timeLabel: input.timeLabel,
      city: clampString(input.city || '유럽', BLUEPRINT_LIMITS.CITY_MAX),
      placeName: clampString(input.placeName, BLUEPRINT_LIMITS.PLACE_NAME_MAX),
      mealOrActivity: clampString(input.mealOrActivity, BLUEPRINT_LIMITS.MEAL_ACTIVITY_MAX),
      entryType: input.entryType,
      story: clampString(input.story, BLUEPRINT_LIMITS.STORY_MAX),
      photoUrl: safePhoto,
      lat: input.lat,
      lng: input.lng,
      withTravelers: input.withTravelers.slice(0, BLUEPRINT_LIMITS.MEMBERS_MAX),
      tags: input.tags.slice(0, BLUEPRINT_LIMITS.TAGS_MAX),
      authorName: clampString(authorName || '가족', 60),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteDiaryEntry(inviteCode: string, entryId: string): Promise<void> {
  const path = `tripRooms/${inviteCode}/diaryEntries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', inviteCode, 'diaryEntries', entryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addWishlistPlace(
  inviteCode: string,
  input: {
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
  }
): Promise<void> {
  const id = makeId('wish');
  const path = `tripRooms/${inviteCode}/wishlistPlaces/${id}`;
  try {
    await setDoc(doc(db, 'tripRooms', inviteCode, 'wishlistPlaces', id), {
      id,
      city: clampString(input.city || '유럽', BLUEPRINT_LIMITS.CITY_MAX),
      placeName: clampString(input.placeName, BLUEPRINT_LIMITS.PLACE_NAME_MAX),
      googlePlaceId: clampString(input.googlePlaceId || '', 160),
      address: clampString(input.address || '', BLUEPRINT_LIMITS.ADDRESS_MAX),
      lat: input.lat,
      lng: input.lng,
      category: input.category,
      tags: input.tags.slice(0, BLUEPRINT_LIMITS.TAGS_MAX),
      reason: clampString(input.reason || '', BLUEPRINT_LIMITS.REASON_MAX),
      suggestedBy: clampString(input.suggestedBy || 'me', 40),
      votedBy: [clampString(input.suggestedBy || 'me', 40)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleWishlistVote(
  inviteCode: string,
  place: WishlistPlace,
  travelerId: string
): Promise<void> {
  const path = `tripRooms/${inviteCode}/wishlistPlaces/${place.id}`;
  const exists = place.votedBy.includes(travelerId);
  const nextVotes = exists
    ? place.votedBy.filter((v) => v !== travelerId)
    : [...place.votedBy, travelerId].slice(0, BLUEPRINT_LIMITS.MEMBERS_MAX);

  try {
    await updateDoc(doc(db, 'tripRooms', inviteCode, 'wishlistPlaces', place.id), {
      votedBy: nextVotes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteWishlistPlace(inviteCode: string, placeId: string): Promise<void> {
  const path = `tripRooms/${inviteCode}/wishlistPlaces/${placeId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', inviteCode, 'wishlistPlaces', placeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
