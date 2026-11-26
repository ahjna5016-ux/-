import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Check, Copy, Link2, LogIn, LogOut, Users, X } from 'lucide-react';
import { auth, signInWithGoogle, signOutUser } from './firebase';
import {
  DiaryEntry,
  GuestSession,
  ItineraryItem,
  JoinedTrip,
  PROFILE_SLOT_OPTIONS,
  ProfileSlot,
  Traveler,
  TripRoom,
  WishlistPlace,
} from './types/trip';
import {
  subscribeDiaryEntries,
  subscribeItinerary,
  subscribeTravelers,
  subscribeTripRoom,
  subscribeUserJoinedTrips,
  subscribeWishlistPlaces,
} from './services/tripService';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { ActiveTab, TopBar } from './components/TopBar';
import { FamilyMapView } from './components/FamilyMapView';
import { ItineraryView } from './components/ItineraryView';
import { DiaryPrefill, DiaryView } from './components/DiaryView';
import { WishlistView } from './components/WishlistView';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const GUEST_SESSION_STORAGE_KEY = 'europe_trip_guest_session';

function loadStoredGuestSession(): GuestSession | null {
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (
      typeof parsed.inviteCode === 'string' &&
      /^[A-Z0-9]{6,12}$/.test(parsed.inviteCode) &&
      typeof parsed.displayName === 'string' &&
      typeof parsed.profileSlot === 'string'
    ) {
      return parsed as GuestSession;
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredGuestSession(session: GuestSession | null): void {
  try {
    if (!session) {
      window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

function getInviteCodeFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.trim().toUpperCase() || '';
    return /^[A-Z0-9]{6,12}$/.test(code) ? code : '';
  } catch {
    return '';
  }
}

function TravelWorkspace() {
  const [urlInviteCode] = useState<string>(() => getInviteCodeFromUrl());
  const [guestSession, setGuestSession] = useState<GuestSession | null>(() => {
    const stored = loadStoredGuestSession();
    if (urlInviteCode && stored && stored.inviteCode !== urlInviteCode) {
      return null;
    }
    return stored;
  });

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [joinedTrips, setJoinedTrips] = useState<JoinedTrip[]>([]);
  const [tripsLoaded, setTripsLoaded] = useState(false);
  const [activeInviteCode, setActiveInviteCode] = useState<string | null>(
    () => guestSession?.inviteCode || null
  );

  const [trip, setTrip] = useState<TripRoom | null>(null);
  const [tripLoaded, setTripLoaded] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishlistPlace[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [focusedSpot, setFocusedSpot] = useState<{
    lat: number;
    lng: number;
    title?: string;
  } | null>(null);

  const [diaryModalNonce, setDiaryModalNonce] = useState(0);
  const [diaryPrefill, setDiaryPrefill] = useState<DiaryPrefill | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Listen to Google Maps Platform quota event
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Auth listener (optional for guests; used for room creators/owners)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (!currentUser) {
        setJoinedTrips([]);
        setTripsLoaded(true);
      } else {
        setTripsLoaded(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe organizer's created/joined trips if signed in
  useEffect(() => {
    if (!authReady || !user) return;
    const unsub = subscribeUserJoinedTrips(user.uid, (list) => {
      setJoinedTrips(list);
      setTripsLoaded(true);
      if (list.length > 0 && !activeInviteCode && !urlInviteCode) {
        setActiveInviteCode(list[0].inviteCode);
      }
    });
    return () => unsub();
  }, [authReady, user, activeInviteCode, urlInviteCode]);

  // Subscribe active TripRoom and all subcollections using only inviteCode (login-free!)
  useEffect(() => {
    if (!activeInviteCode) {
      setTrip(null);
      setTripLoaded(true);
      return;
    }

    setTripLoaded(false);
    setRoomError(null);

    const unsubTrip = subscribeTripRoom(activeInviteCode, (room) => {
      setTrip(room);
      setTripLoaded(true);
      if (!room) {
        setRoomError('해당 초대 코드의 여행방을 찾을 수 없습니다. 초대 코드를 다시 확인해 주세요.');
        saveStoredGuestSession(null);
        setGuestSession(null);
        setActiveInviteCode(null);
      }
    });
    const unsubTravelers = subscribeTravelers(activeInviteCode, setTravelers);
    const unsubItinerary = subscribeItinerary(activeInviteCode, setItinerary);
    const unsubDiary = subscribeDiaryEntries(activeInviteCode, setDiaryEntries);
    const unsubWishlist = subscribeWishlistPlaces(activeInviteCode, setWishlist);

    return () => {
      unsubTrip();
      unsubTravelers();
      unsubItinerary();
      unsubDiary();
      unsubWishlist();
    };
  }, [activeInviteCode]);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'diary') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEnterGuestRoom = (session: GuestSession) => {
    saveStoredGuestSession(session);
    setGuestSession(session);
    setRoomError(null);
    setActiveInviteCode(session.inviteCode);
  };

  const handleTripCreated = (inviteCode: string, session: GuestSession) => {
    saveStoredGuestSession(session);
    setGuestSession(session);
    setRoomError(null);
    setActiveInviteCode(inviteCode);
  };

  const handleLeaveRoom = () => {
    saveStoredGuestSession(null);
    setGuestSession(null);
    setActiveInviteCode(null);
    setTrip(null);
    setIsShareModalOpen(false);
  };

  const handleSwitchProfileSlot = (slot: ProfileSlot) => {
    if (!trip) return;
    const option = PROFILE_SLOT_OPTIONS.find((s) => s.id === slot);
    const nextSession: GuestSession = {
      inviteCode: trip.inviteCode,
      displayName: option?.label || guestSession?.displayName || user?.displayName || '가족',
      profileSlot: slot,
    };
    saveStoredGuestSession(nextSession);
    setGuestSession(nextSession);
  };

  const handleFocusOnMap = (lat: number, lng: number, title: string) => {
    setFocusedSpot({ lat, lng, title });
    setActiveTab('map');
  };

  const handleOpenQuickDiary = (prefill?: DiaryPrefill) => {
    setDiaryPrefill(prefill || null);
    setActiveTab('diary');
    setDiaryModalNonce((n) => n + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyInviteCode = async () => {
    if (!trip?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(trip.inviteCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleCopyInviteLink = async () => {
    if (!trip?.inviteCode) return;
    try {
      const shareUrl = `${window.location.origin}/?code=${trip.inviteCode}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const isOwner = Boolean(user && trip && trip.ownerId === user.uid);
  const activeProfileSlot: ProfileSlot = guestSession?.profileSlot || (isOwner ? 'me' : 'me');
  const actorName =
    guestSession?.displayName ||
    user?.displayName ||
    PROFILE_SLOT_OPTIONS.find((s) => s.id === activeProfileSlot)?.label ||
    '가족';
  const canEdit = activeProfileSlot !== 'brother_home';

  const isWaitingForInitialRoom =
    !authReady || (Boolean(user) && !tripsLoaded && !activeInviteCode) || (Boolean(activeInviteCode) && !tripLoaded);

  const content = (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {isWaitingForInitialRoom ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-sm font-medium text-slate-600">
            가족 여행 정보를 불러오는 중입니다...
          </div>
        </div>
      ) : !activeInviteCode || !trip ? (
        <AuthGate
          user={user}
          initialInviteCode={urlInviteCode}
          initialError={roomError}
          onEnterGuestRoom={handleEnterGuestRoom}
          onTripCreated={handleTripCreated}
        />
      ) : (
        <>
          <TopBar
            tripTitle={trip.title}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenQuickAdd={() => handleOpenQuickDiary()}
            onOpenFamilyShare={() => setIsShareModalOpen(true)}
            canEdit={canEdit}
          />

          <main className="flex-1">
            {activeTab === 'map' && (
              <FamilyMapView
                trip={trip}
                travelers={travelers}
                itinerary={itinerary}
                diaryEntries={diaryEntries}
                activeProfileSlot={activeProfileSlot}
                canEdit={canEdit}
                focusedSpot={focusedSpot}
                hasMapsApiKey={Boolean(GOOGLE_MAPS_API_KEY)}
                onOpenDiaryTab={() => handleSelectTab('diary')}
                onOpenItineraryTab={() => handleSelectTab('itinerary')}
                onOpenQuickDiary={(p) => handleOpenQuickDiary(p)}
              />
            )}

            {activeTab === 'itinerary' && (
              <ItineraryView
                trip={trip}
                actorName={actorName}
                activeProfileSlot={activeProfileSlot}
                canEdit={canEdit}
                isOwner={isOwner}
                travelers={travelers}
                itinerary={itinerary}
                onFocusOnMap={handleFocusOnMap}
                onCreateDiaryFromSpot={(item) =>
                  handleOpenQuickDiary({
                    city: item.city,
                    placeName: item.title,
                    lat: item.lat,
                    lng: item.lng,
                    dayIndex: item.dayIndex,
                    date: item.date,
                  })
                }
              />
            )}

            {activeTab === 'diary' && (
              <DiaryView
                trip={trip}
                actorName={actorName}
                canEdit={canEdit}
                isOwner={isOwner}
                travelers={travelers}
                itinerary={itinerary}
                diaryEntries={diaryEntries}
                externalOpenNonce={diaryModalNonce}
                prefill={diaryPrefill}
                onFocusOnMap={handleFocusOnMap}
              />
            )}

            {activeTab === 'wishlist' && (
              <WishlistView
                trip={trip}
                actorName={actorName}
                activeProfileSlot={activeProfileSlot}
                canEdit={canEdit}
                isOwner={isOwner}
                travelers={travelers}
                wishlist={wishlist}
                onFocusOnMap={handleFocusOnMap}
                onPromotedToItinerary={() => handleSelectTab('itinerary')}
              />
            )}
          </main>

          {/* Family Invite & Role Switch Modal */}
          {isShareModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-700" />
                    <h2 className="text-base font-bold text-slate-900">가족 초대 & 내 역할 설정</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-5 space-y-4">
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    초대 코드나 링크를 카톡으로 보내면 <strong>로그인 없이</strong> 초등학생 조카·딸과 형, 엄마, 이모 모두 바로 들어와 볼 수 있습니다.
                  </p>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">가족 초대 코드</div>
                        <div className="text-2xl font-bold font-mono-tabular tracking-wider text-slate-900 mt-0.5">
                          {trip.inviteCode}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopyInviteCode()}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-4 h-4" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            코드 복사
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleCopyInviteLink()}
                      className="w-full min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold hover:bg-slate-100 flex items-center justify-center gap-1.5"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-600" />
                          초대 링크 복사 완료 (바로 누르면 입장!)
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 text-blue-700" />
                          초대 링크 복사하기 (코드 입력 없이 바로 입장)
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick role switcher */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      현재 내 역할 변경 ({actorName})
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROFILE_SLOT_OPTIONS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSwitchProfileSlot(slot.id)}
                          className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors min-h-[40px] ${
                            activeProfileSlot === slot.id
                              ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {joinedTrips.length > 1 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1.5">
                        내가 만든 다른 여행으로 전환
                      </div>
                      <div className="space-y-1.5">
                        {joinedTrips.map((jt) => (
                          <button
                            key={jt.inviteCode}
                            type="button"
                            onClick={() => {
                              setActiveInviteCode(jt.inviteCode);
                              setIsShareModalOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-medium ${
                              jt.inviteCode === trip.inviteCode
                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {jt.tripTitle} ({jt.inviteCode})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleLeaveRoom}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      다른 초대 코드로 입장
                    </button>

                    {user ? (
                      <button
                        type="button"
                        onClick={() => {
                          void signOutUser();
                        }}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        방장 로그아웃
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        방장 Google 로그인
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!GOOGLE_MAPS_API_KEY) {
    return content;
  }

  return (
    <APIProvider
      apiKey={GOOGLE_MAPS_API_KEY}
      libraries={['marker', 'places', 'routes']}
      language="ko"
      region="FR"
    >
      {content}
    </APIProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TravelWorkspace />
    </ErrorBoundary>
  );
}
