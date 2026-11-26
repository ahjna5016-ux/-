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
  Traveler,
  TripRoom,
  WalkingLevel,
  WishlistCategory,
  WishlistPlace,
} from '../types/trip';
import {
  getDateForDayIndex,
  getTripPeriodStatus,
  TRIP_END_DATE,
  TRIP_START_DATE,
} from '../utils/tripDates';

export const DEFAULT_FAMILY_TRIP_ID = 'EUROPE202701';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function buildSeedData() {
  const travelerSeeds: Omit<Traveler, 'updatedAt'>[] = [
    {
      id: 'me',
      name: '나',
      relation: '인솔자 · 여행 기록',
      ageGroup: 'adult',
      markerColor: '#1D4ED8',
      avatarInitial: '나',
      isSharingLocation: false,
      lat: 48.8584,
      lng: 2.2945,
      accuracyMeters: 25,
      currentPlaceLabel: '파리 에펠탑 광장 (예정)',
      statusNote: '2027.01.14 출발 준비 중',
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
      currentPlaceLabel: '에펠탑 앞 잔디광장 (예정)',
      statusNote: '유럽 여행 기대 중',
    },
    {
      id: 'niece_g5',
      name: '조카 (초5)',
      relation: '조카 · 초등 5학년',
      ageGroup: 'kid',
      markerColor: '#D97706',
      avatarInitial: '조카',
      isSharingLocation: false,
      lat: 48.8589,
      lng: 2.2951,
      accuracyMeters: 25,
      currentPlaceLabel: '크레페 가판대 앞 (예정)',
      statusNote: '간식 리스트 확인 중',
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
      currentPlaceLabel: '트로카데로 전망대 (예정)',
      statusNote: '도보 여유 일정 확인',
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
      currentPlaceLabel: '트로카데로 광장 (예정)',
      statusNote: '파리 카페 코스를 고르는 중',
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
      currentPlaceLabel: '세느강 선착장 (예정)',
      statusNote: '유람선 시간표 확인 중',
    },
  ];

  const itinerarySeeds: Omit<ItineraryItem, 'createdAt' | 'updatedAt'>[] = [
    // 1일차 (2027-01-14) - 파리 도착
    {
      id: 'item_day01_1',
      dayIndex: 1,
      date: getDateForDayIndex(TRIP_START_DATE, 1),
      startTime: '14:30',
      endTime: '16:30',
      city: '파리',
      title: '파리 샤를 드골 공항 도착 & 가족 숙소 체크인',
      category: 'lodging',
      placeId: 'ChIJ_cdg_paris',
      address: '95700 Roissy-en-France, Paris',
      lat: 48.8566,
      lng: 2.3522,
      tags: ['걷기편한', '잠시휴식', '모두만족'],
      walkingLevel: 'low',
      memo: '전용 밴 이동으로 짐 편하게 옮기고, 따뜻한 물과 간식 챙기며 시차 적응하기.',
      status: 'planned',
      likedBy: ['me', 'mom', 'aunt_1'],
      updatedByName: '나',
    },
    {
      id: 'item_day01_2',
      dayIndex: 1,
      date: getDateForDayIndex(TRIP_START_DATE, 1),
      startTime: '17:30',
      endTime: '19:30',
      city: '파리',
      title: '에펠탑 야경 & 트로카데로 광장 첫 저녁',
      category: 'landmark',
      placeId: 'ChIJLU7jZClu5kcR4PcOOO6p3I0',
      address: 'Champ de Mars, 5 Av. Anatole France, Paris',
      lat: 48.8584,
      lng: 2.2945,
      tags: ['모두만족', '포토스팟', '걷기편한'],
      walkingLevel: 'low',
      memo: '겨울엔 해가 일찍 져서 정각 에펠탑 반짝임 보고 따뜻한 어니언 수프 저녁!',
      status: 'planned',
      likedBy: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      updatedByName: '나',
    },
    // 2일차 (2027-01-15) - 파리
    {
      id: 'item_day02_1',
      dayIndex: 2,
      date: getDateForDayIndex(TRIP_START_DATE, 2),
      startTime: '10:00',
      endTime: '12:30',
      city: '파리',
      title: '루브르 박물관 핵심 코스 (모나리자 · 비너스)',
      category: 'museum',
      placeId: 'ChIJD3uTd9hx5kcR1IQvGfr8dbk',
      address: 'Rue de Rivoli, 75001 Paris',
      lat: 48.8606,
      lng: 2.3376,
      tags: ['어른감성', '역사스토리', '실내코스'],
      walkingLevel: 'medium',
      memo: '1월 겨울 추위 피해 따뜻한 실내 관람! 초5·초6 아이들이 지치지 않게 2시간 핵심만.',
      status: 'planned',
      likedBy: ['mom', 'aunt_1', 'me'],
      updatedByName: '나',
    },
    {
      id: 'item_day02_2',
      dayIndex: 2,
      date: getDateForDayIndex(TRIP_START_DATE, 2),
      startTime: '14:00',
      endTime: '16:00',
      city: '파리',
      title: '세느강 바토무슈 유람선 & 누텔라 크레페',
      category: 'activity',
      placeId: 'ChIJW3jZ_ilu5kcR4PcOOO6p3I0',
      address: 'Port de la Conférence, 75008 Paris',
      lat: 48.8638,
      lng: 2.3065,
      tags: ['모두만족', '아이취향', '체험액티비티', '걷기편한'],
      walkingLevel: 'low',
      memo: '실내 난방 좌석에 앉아 파리 명소 구경. 선착장 앞 크레페 간식 타임.',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'aunt_2'],
      updatedByName: '나',
    },
    // 3일차 (2027-01-16) - 파리
    {
      id: 'item_day03_1',
      dayIndex: 3,
      date: getDateForDayIndex(TRIP_START_DATE, 3),
      startTime: '10:00',
      endTime: '13:30',
      city: '파리',
      title: '파리 자연사박물관 대진화관 & 식물원 산책',
      category: 'museum',
      placeId: 'ChIJ_galerie_paris',
      address: '36 Rue Geoffroy-Saint-Hilaire, 75005 Paris',
      lat: 48.8422,
      lng: 2.3563,
      tags: ['아이취향', '실내코스', '체험액티비티'],
      walkingLevel: 'low',
      memo: '동물 모형 행렬 전시가 멋져서 초5 조카와 초6 딸이 가장 좋아할 실내 코스.',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'me'],
      updatedByName: '나',
    },
    {
      id: 'item_day03_2',
      dayIndex: 3,
      date: getDateForDayIndex(TRIP_START_DATE, 3),
      startTime: '15:00',
      endTime: '17:30',
      city: '파리',
      title: '마레 지구 따뜻한 카페 & 기념품 샵',
      category: 'cafe',
      placeId: 'ChIJ_marais_paris',
      address: 'Le Marais, 75004 Paris',
      lat: 48.8566,
      lng: 2.3622,
      tags: ['어른감성', '잠시휴식', '기념품쇼핑', '디저트간식'],
      walkingLevel: 'low',
      memo: '어른들은 따뜻한 카페오레, 아이들은 핫초코와 마카롱으로 휴식.',
      status: 'planned',
      likedBy: ['aunt_1', 'aunt_2', 'mom'],
      updatedByName: '나',
    },
    // 4일차 (2027-01-17) - 파리
    {
      id: 'item_day04_1',
      dayIndex: 4,
      date: getDateForDayIndex(TRIP_START_DATE, 4),
      startTime: '10:00',
      endTime: '14:00',
      city: '파리',
      title: '베르사유 궁전 거울의 방 투어 (실내 중심)',
      category: 'landmark',
      placeId: 'ChIJdUyx15R95kcRj85ZX8H8OAU',
      address: "Place d'Armes, 78000 Versailles",
      lat: 48.8049,
      lng: 2.1204,
      tags: ['모두만족', '역사스토리', '실내코스', '포토스팟'],
      walkingLevel: 'medium',
      memo: '한국어 오디오가이드 대여해서 왕실 이야기 들으며 관람.',
      status: 'planned',
      likedBy: ['mom', 'aunt_1', 'daughter_g6'],
      updatedByName: '나',
    },
    // 5일차 (2027-01-18) - 파리
    {
      id: 'item_day05_1',
      dayIndex: 5,
      date: getDateForDayIndex(TRIP_START_DATE, 5),
      startTime: '10:30',
      endTime: '13:30',
      city: '파리',
      title: '오르세 미술관 & 몽마르뜨 언덕 케이블카',
      category: 'museum',
      placeId: 'ChIJ_orsay_paris',
      address: "Esplanade Valéry Giscard d'Estaing, 75007 Paris",
      lat: 48.86,
      lng: 2.3266,
      tags: ['어른감성', '실내코스', '걷기편한'],
      walkingLevel: 'low',
      memo: '몽마르뜨는 계단 대신 푸니쿨라(케이블카) 탑승해서 엄마·이모님 체력 보호!',
      status: 'planned',
      likedBy: ['aunt_1', 'aunt_2', 'mom'],
      updatedByName: '나',
    },
    // 6일차 (2027-01-19) - 스위스 이동
    {
      id: 'item_day06_1',
      dayIndex: 6,
      date: getDateForDayIndex(TRIP_START_DATE, 6),
      startTime: '09:20',
      endTime: '14:30',
      city: '인터라켄',
      title: '파리 리옹역 → 스위스 인터라켄 TGV 기차 이동',
      category: 'transit',
      placeId: 'ChIJ_interlaken_ost',
      address: 'Interlaken Ost, 3800 Interlaken, Switzerland',
      lat: 46.6905,
      lng: 7.8686,
      tags: ['모두만족', '걷기편한', '잠시휴식'],
      walkingLevel: 'low',
      memo: '창밖 설경 보며 간식 먹는 기차 여행. 방한 장갑·목도리 꺼내두기.',
      status: 'planned',
      likedBy: ['me', 'mom', 'daughter_g6', 'niece_g5'],
      updatedByName: '나',
    },
    // 7일차 (2027-01-20) - 융프라우
    {
      id: 'item_day07_1',
      dayIndex: 7,
      date: getDateForDayIndex(TRIP_START_DATE, 7),
      startTime: '09:00',
      endTime: '15:00',
      city: '인터라켄',
      title: '아이거 익스프레스 곤돌라 & 융프라우요흐 설산 체험',
      category: 'activity',
      placeId: 'ChIJ_jungfraujoch',
      address: 'Jungfraujoch, 3801 Lauterbrunnen, Switzerland',
      lat: 46.5475,
      lng: 7.9851,
      tags: ['모두만족', '아이취향', '체험액티비티', '포토스팟'],
      walkingLevel: 'low',
      memo: '정상에서 컵라면 먹고 얼음궁전 구경! 고산병 대비 천천히 걷기.',
      status: 'planned',
      likedBy: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      updatedByName: '나',
    },
    // 8일차 (2027-01-21) - 그린델발트 / 피르스트
    {
      id: 'item_day08_1',
      dayIndex: 8,
      date: getDateForDayIndex(TRIP_START_DATE, 8),
      startTime: '10:30',
      endTime: '15:30',
      city: '그린델발트',
      title: '그린델발트 피르스트 케이블카 & 눈썰매 체험',
      category: 'activity',
      placeId: 'ChIJ_grindelwald_first',
      address: 'Dorfstrasse 183, 3818 Grindelwald',
      lat: 46.6242,
      lng: 8.0414,
      tags: ['아이취향', '체험액티비티', '포토스팟'],
      walkingLevel: 'low',
      memo: '아이들은 안전 구간 눈놀이, 엄마·이모님들은 전망 카페에서 핫초코.',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'aunt_2'],
      updatedByName: '나',
    },
    // 9일차 (2027-01-22) - 루체른
    {
      id: 'item_day09_1',
      dayIndex: 9,
      date: getDateForDayIndex(TRIP_START_DATE, 9),
      startTime: '10:00',
      endTime: '15:00',
      city: '루체른',
      title: '루체른 카펠교 산책 & 스위스 치즈 퐁듀 점심',
      category: 'food',
      placeId: 'ChIJ_luzern_chapel',
      address: 'Kapellbrücke, 6002 Luzern, Switzerland',
      lat: 47.0516,
      lng: 8.3075,
      tags: ['모두만족', '어른감성', '걷기편한'],
      walkingLevel: 'low',
      memo: '평지 위주 호숫가 산책 후 따뜻한 실내 레스토랑에서 스위스 전통 식사.',
      status: 'planned',
      likedBy: ['mom', 'aunt_1', 'aunt_2'],
      updatedByName: '나',
    },
    // 10일차 (2027-01-23) - 이탈리아 피렌체 이동
    {
      id: 'item_day10_1',
      dayIndex: 10,
      date: getDateForDayIndex(TRIP_START_DATE, 10),
      startTime: '09:30',
      endTime: '15:00',
      city: '피렌체',
      title: '유로시티 기차로 피렌체 이동 & 두오모 광장 산책',
      category: 'transit',
      placeId: 'ChIJ_firenze_duomo',
      address: 'Piazza del Duomo, 50122 Firenze FI, Italy',
      lat: 43.7731,
      lng: 11.256,
      tags: ['모두만족', '역사스토리', '포토스팟'],
      walkingLevel: 'medium',
      memo: '숙소 체크인 후 저녁엔 티본 스테이크 & 파스타 가족 만찬.',
      status: 'planned',
      likedBy: ['me', 'aunt_1', 'daughter_g6'],
      updatedByName: '나',
    },
    // 11일차 (2027-01-24) - 피렌체
    {
      id: 'item_day11_1',
      dayIndex: 11,
      date: getDateForDayIndex(TRIP_START_DATE, 11),
      startTime: '10:00',
      endTime: '14:30',
      city: '피렌체',
      title: '베키오 다리 · 가죽시장 구경 & 수제 젤라또',
      category: 'shopping',
      placeId: 'ChIJ_ponte_vecchio',
      address: 'Ponte Vecchio, 50125 Firenze FI, Italy',
      lat: 43.768,
      lng: 11.2531,
      tags: ['어른감성', '기념품쇼핑', '디저트간식', '걷기편한'],
      walkingLevel: 'low',
      memo: '이모들과 엄마 가죽 소품 쇼핑, 아이들은 젤라또 두 스쿱!',
      status: 'planned',
      likedBy: ['aunt_1', 'aunt_2', 'mom', 'niece_g5'],
      updatedByName: '나',
    },
    // 12일차 (2027-01-25) - 로마 이동 & 트레비 분수
    {
      id: 'item_day12_1',
      dayIndex: 12,
      date: getDateForDayIndex(TRIP_START_DATE, 12),
      startTime: '10:30',
      endTime: '16:30',
      city: '로마',
      title: '이탈로 고속열차 로마 도착 & 트레비 분수 동전 던지기',
      category: 'landmark',
      placeId: 'ChIJ1U1J_trevi_rome',
      address: 'Piazza di Trevi, 00187 Roma RM, Italy',
      lat: 41.9009,
      lng: 12.4833,
      tags: ['모두만족', '포토스팟', '걷기편한'],
      walkingLevel: 'low',
      memo: '초5·초6 아이들 소원 빌며 동전 던지고 지올리띠 젤라또 들르기.',
      status: 'planned',
      likedBy: ['daughter_g6', 'niece_g5', 'me'],
      updatedByName: '나',
    },
    // 13일차 (2027-01-26) - 콜로세움 & 포로 로마노
    {
      id: 'item_day13_1',
      dayIndex: 13,
      date: getDateForDayIndex(TRIP_START_DATE, 13),
      startTime: '09:30',
      endTime: '13:00',
      city: '로마',
      title: '콜로세움 내부 & 로마 역사 이야기 투어',
      category: 'landmark',
      placeId: 'ChIJrRMgU7ZhLxMRxAOFkC7I8Sg',
      address: 'Piazza del Colosseo, 1, 00184 Roma RM',
      lat: 41.8902,
      lng: 12.4922,
      tags: ['모두만족', '역사스토리', '포토스팟'],
      walkingLevel: 'medium',
      memo: '검투사 이야기로 아이들 눈높이에 맞춰 구경. 엘리베이터 동선 우선 이용.',
      status: 'planned',
      likedBy: ['niece_g5', 'daughter_g6', 'me', 'mom'],
      updatedByName: '나',
    },
    // 14일차 (2027-01-27) - 바티칸 박물관 & 마지막 만찬
    {
      id: 'item_day14_1',
      dayIndex: 14,
      date: getDateForDayIndex(TRIP_START_DATE, 14),
      startTime: '10:00',
      endTime: '14:00',
      city: '로마',
      title: '바티칸 박물관 & 성 베드로 대성당 (실내 코스)',
      category: 'museum',
      placeId: 'ChIJ_vatican_museum',
      address: '00120 Città del Vaticano',
      lat: 41.9065,
      lng: 12.4536,
      tags: ['어른감성', '역사스토리', '실내코스'],
      walkingLevel: 'medium',
      memo: '패스트트랙 예약으로 줄 서지 않고 바로 입장. 저녁엔 화덕피자 송별 만찬!',
      status: 'planned',
      likedBy: ['mom', 'aunt_1', 'aunt_2', 'me'],
      updatedByName: '나',
    },
    // 15일차 (2027-01-28) - 귀국 출발
    {
      id: 'item_day15_1',
      dayIndex: 15,
      date: getDateForDayIndex(TRIP_START_DATE, 15),
      startTime: '10:30',
      endTime: '14:30',
      city: '로마',
      title: '선물 패킹 체크 & 로마 피우미치노 공항 귀국 출발',
      category: 'transit',
      placeId: 'ChIJ_fiumicino_airport',
      address: 'Via dell Aeroporto di Fiumicino, 320, Roma',
      lat: 41.8003,
      lng: 12.2389,
      tags: ['걷기편한', '기념품쇼핑', '잠시휴식'],
      walkingLevel: 'low',
      memo: '여권·텍스리펀 영수증 확인 후 공항 전용 차량으로 편하게 이동!',
      status: 'planned',
      likedBy: ['me', 'mom', 'aunt_1', 'aunt_2', 'daughter_g6', 'niece_g5'],
      updatedByName: '나',
    },
  ];

  const diarySeeds: Omit<DiaryEntry, 'createdAt' | 'updatedAt'>[] = [
    {
      id: 'diary_sample_1',
      dayIndex: 1,
      date: getDateForDayIndex(TRIP_START_DATE, 1),
      timeLabel: '18:00',
      city: '파리',
      placeName: '세느강 바토무슈 선착장',
      mealOrActivity: '유람선 선상 구경 & 누텔라 바나나 크레페 (예정 샘플)',
      entryType: 'spot',
      story:
        '겨울 파리는 추울 수 있어서 따뜻하게 실내 좌석이 있는 세느강 유람선을 타면 엄마랑 이모들도 편하게 에펠탑 야경을 보실 수 있어요. 선착장 앞 크레페는 초5 조카와 초6 딸의 1순위 간식!',
      photoUrl: '/src/assets/images/sample_diary_seine_1795673595983.jpg',
      lat: 48.8638,
      lng: 2.3065,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['모두만족', '체험액티비티', '걷기편한'],
      authorName: '나',
    },
    {
      id: 'diary_sample_2',
      dayIndex: 6,
      date: getDateForDayIndex(TRIP_START_DATE, 6),
      timeLabel: '12:30',
      city: '인터라켄',
      placeName: '알프스 설산 전망 산악열차',
      mealOrActivity: '눈 덮인 알프스 창밖 풍경 & 기차 도시락 (예정 샘플)',
      entryType: 'moment',
      story:
        '1월 19일 파리에서 스위스로 넘어가는 날! 새하얀 설산을 보며 기차 안에서 가족 6명이 도란도란 간식 먹으며 이동하면 체력 충전도 되고 잊지 못할 겨울 추억이 될 거예요.',
      photoUrl: '/src/assets/images/sample_diary_alps_1795673597486.jpg',
      lat: 46.7536,
      lng: 8.0372,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['모두만족', '포토스팟', '걷기편한'],
      authorName: '나',
    },
    {
      id: 'diary_sample_3',
      dayIndex: 12,
      date: getDateForDayIndex(TRIP_START_DATE, 12),
      timeLabel: '15:30',
      city: '로마',
      placeName: '트레비 분수 근처 지올리띠 젤라또',
      mealOrActivity: '피스타치오 & 딸기 수제 젤라또 (예정 샘플)',
      entryType: 'meal',
      story:
        '로마에 도착하는 1월 25일 오후 간식 코스로 미리 저장해둔 곳이에요. 조카(초5)는 상큼한 딸기맛, 딸(초6)은 피스타치오맛, 엄마랑 이모들은 진한 쌀맛 젤라또 추천!',
      photoUrl: '/src/assets/images/sample_diary_gelato_1795673596018.jpg',
      lat: 41.9012,
      lng: 12.4785,
      withTravelers: ['me', 'daughter_g6', 'niece_g5', 'mom', 'aunt_1', 'aunt_2'],
      tags: ['아이취향', '디저트간식', '잠시휴식'],
      authorName: '나',
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
      placeName: '갈레리 라파예트 백화점 전망대 & 쇼핑',
      googlePlaceId: 'ChIJ_lafayette_paris',
      address: '40 Bd Haussmann, 75009 Paris',
      lat: 48.8738,
      lng: 2.332,
      category: 'shopping',
      tags: ['실내코스', '기념품쇼핑', '포토스팟'],
      reason: '겨울에 실내에서 따뜻하게 구경하고 옥상 파리 시내 뷰까지!',
      suggestedBy: 'aunt_2',
      votedBy: ['aunt_2', 'mom', 'daughter_g6'],
    },
    {
      id: 'wish_3',
      city: '인터라켄',
      placeName: '브리엔츠 호수 유람선 겨울 크루즈',
      googlePlaceId: 'ChIJ_brienz_swiss',
      address: 'Interlaken Ost, 3800 Interlaken',
      lat: 46.6976,
      lng: 7.8511,
      category: 'activity',
      tags: ['모두만족', '포토스팟', '걷기편한'],
      reason: '안 걸어도 에메랄드빛 호수와 설산을 함께 감상 가능!',
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
      suggestedBy: 'daughter_g6',
      votedBy: ['daughter_g6', 'niece_g5', 'aunt_2'],
    },
  ];

  return { travelerSeeds, itinerarySeeds, diarySeeds, wishlistSeeds };
}

export async function ensureDefaultFamilyTripRoom(): Promise<TripRoom> {
  const tripId = DEFAULT_FAMILY_TRIP_ID;
  const roomRef = doc(db, 'tripRooms', tripId);

  let snap;
  try {
    snap = await getDoc(roomRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `tripRooms/${tripId}`);
  }

  if (snap.exists()) {
    return snap.data() as TripRoom;
  }

  try {
    await setDoc(roomRef, {
      inviteCode: tripId,
      title: '우리 가족 유럽 대모험',
      subtitle: '2027.01.14 ~ 01.28 (14박 15일) · 나 · 딸(초6) · 조카(초5) · 엄마 · 이모 2분',
      startDate: TRIP_START_DATE,
      endDate: TRIP_END_DATE,
      ownerId: 'family_shared',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tripRooms/${tripId}`);
  }

  const { travelerSeeds, itinerarySeeds, diarySeeds, wishlistSeeds } = buildSeedData();
  const batch = writeBatch(db);
  for (const t of travelerSeeds) {
    batch.set(doc(db, 'tripRooms', tripId, 'travelers', t.id), {
      ...t,
      updatedAt: serverTimestamp(),
    });
  }
  for (const item of itinerarySeeds) {
    batch.set(doc(db, 'tripRooms', tripId, 'itineraryItems', item.id), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const entry of diarySeeds) {
    batch.set(doc(db, 'tripRooms', tripId, 'diaryEntries', entry.id), {
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  for (const wish of wishlistSeeds) {
    batch.set(doc(db, 'tripRooms', tripId, 'wishlistPlaces', wish.id), {
      ...wish,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `tripRooms/${tripId}/seed`);
  }

  const createdSnap = await getDoc(roomRef);
  return createdSnap.data() as TripRoom;
}

export function subscribeTripRoom(
  tripId: string,
  onData: (trip: TripRoom | null) => void
): Unsubscribe {
  const path = `tripRooms/${tripId}`;
  return onSnapshot(
    doc(db, 'tripRooms', tripId),
    (snap) => {
      onData(snap.exists() ? (snap.data() as TripRoom) : null);
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export function subscribeTravelers(
  tripId: string,
  onData: (travelers: Traveler[]) => void
): Unsubscribe {
  const path = `tripRooms/${tripId}/travelers`;
  return onSnapshot(
    collection(db, 'tripRooms', tripId, 'travelers'),
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
  tripId: string,
  onData: (items: ItineraryItem[]) => void
): Unsubscribe {
  const path = `tripRooms/${tripId}/itineraryItems`;
  const q = query(
    collection(db, 'tripRooms', tripId, 'itineraryItems'),
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
  tripId: string,
  onData: (entries: DiaryEntry[]) => void
): Unsubscribe {
  const path = `tripRooms/${tripId}/diaryEntries`;
  return onSnapshot(
    collection(db, 'tripRooms', tripId, 'diaryEntries'),
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
  tripId: string,
  onData: (places: WishlistPlace[]) => void
): Unsubscribe {
  const path = `tripRooms/${tripId}/wishlistPlaces`;
  return onSnapshot(
    collection(db, 'tripRooms', tripId, 'wishlistPlaces'),
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
  tripId: string,
  travelerId: string,
  payload: {
    lat: number;
    lng: number;
    accuracyMeters: number;
    currentPlaceLabel: string;
    statusNote: string;
    isSharingLocation: boolean;
  },
  tripDates?: { startDate: string; endDate: string }
): Promise<void> {
  const path = `tripRooms/${tripId}/travelers/${travelerId}`;
  const period = getTripPeriodStatus(
    tripDates?.startDate || TRIP_START_DATE,
    tripDates?.endDate || TRIP_END_DATE
  );
  const effectiveSharing = period.isGpsAllowed ? payload.isSharingLocation : false;

  try {
    await updateDoc(doc(db, 'tripRooms', tripId, 'travelers', travelerId), {
      lat: payload.lat,
      lng: payload.lng,
      accuracyMeters: Math.max(0, Math.min(50000, Math.round(payload.accuracyMeters))),
      currentPlaceLabel: clampString(payload.currentPlaceLabel, 100),
      statusNote: clampString(payload.statusNote, BLUEPRINT_LIMITS.STATUS_NOTE_MAX),
      isSharingLocation: effectiveSharing,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function addItineraryItem(
  tripId: string,
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
  const path = `tripRooms/${tripId}/itineraryItems/${id}`;
  try {
    await setDoc(doc(db, 'tripRooms', tripId, 'itineraryItems', id), {
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
  tripId: string,
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
  const path = `tripRooms/${tripId}/itineraryItems/${itemId}`;
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
    await updateDoc(doc(db, 'tripRooms', tripId, 'itineraryItems', itemId), cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function toggleItineraryLike(
  tripId: string,
  item: ItineraryItem,
  travelerId: string
): Promise<void> {
  const path = `tripRooms/${tripId}/itineraryItems/${item.id}`;
  const exists = item.likedBy.includes(travelerId);
  const nextLikes = exists
    ? item.likedBy.filter((id) => id !== travelerId)
    : [...item.likedBy, travelerId].slice(0, BLUEPRINT_LIMITS.MEMBERS_MAX);

  try {
    await updateDoc(doc(db, 'tripRooms', tripId, 'itineraryItems', item.id), {
      likedBy: nextLikes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteItineraryItem(tripId: string, itemId: string): Promise<void> {
  const path = `tripRooms/${tripId}/itineraryItems/${itemId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', tripId, 'itineraryItems', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addDiaryEntry(
  tripId: string,
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
  const path = `tripRooms/${tripId}/diaryEntries/${id}`;
  const safePhoto =
    input.photoUrl.length <= BLUEPRINT_LIMITS.PHOTO_MAX_LENGTH ? input.photoUrl : '';

  try {
    await setDoc(doc(db, 'tripRooms', tripId, 'diaryEntries', id), {
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

export async function deleteDiaryEntry(tripId: string, entryId: string): Promise<void> {
  const path = `tripRooms/${tripId}/diaryEntries/${entryId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', tripId, 'diaryEntries', entryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function addWishlistPlace(
  tripId: string,
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
  const path = `tripRooms/${tripId}/wishlistPlaces/${id}`;
  try {
    await setDoc(doc(db, 'tripRooms', tripId, 'wishlistPlaces', id), {
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
  tripId: string,
  place: WishlistPlace,
  travelerId: string
): Promise<void> {
  const path = `tripRooms/${tripId}/wishlistPlaces/${place.id}`;
  const exists = place.votedBy.includes(travelerId);
  const nextVotes = exists
    ? place.votedBy.filter((v) => v !== travelerId)
    : [...place.votedBy, travelerId].slice(0, BLUEPRINT_LIMITS.MEMBERS_MAX);

  try {
    await updateDoc(doc(db, 'tripRooms', tripId, 'wishlistPlaces', place.id), {
      votedBy: nextVotes,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteWishlistPlace(tripId: string, placeId: string): Promise<void> {
  const path = `tripRooms/${tripId}/wishlistPlaces/${placeId}`;
  try {
    await deleteDoc(doc(db, 'tripRooms', tripId, 'wishlistPlaces', placeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
