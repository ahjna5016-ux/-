import React, { useEffect, useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Check, Link2, LogOut, Users, X } from 'lucide-react';
import {
  DiaryEntry,
  GuestSession,
  ItineraryItem,
  PROFILE_SLOT_OPTIONS,
  ProfileSlot,
  Traveler,
  TripRoom,
  WishlistPlace,
} from './types/trip';
import {
  DEFAULT_FAMILY_TRIP_ID,
  ensureDefaultFamilyTripRoom,
  subscribeDiaryEntries,
  subscribeItinerary,
  subscribeTravelers,
  subscribeTripRoom,
  subscribeWishlistPlaces,
} from './services/tripService';
import { formatKoreanMonthDay } from './utils/tripDates';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { ActiveTab, TopBar } from './components/TopBar';
import { FamilyMapView } from './components/FamilyMapView';
import { ItineraryView } from './components/ItineraryView';
import { DiaryPrefill, DiaryView } from './components/DiaryView';
import { WishlistView } from './components/WishlistView';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const FAMILY_SESSION_STORAGE_KEY = 'europe_2027_family_session';

function loadStoredSession(): GuestSession | null {
  try {
    const raw = window.localStorage.getItem(FAMILY_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (
      parsed.tripId === DEFAULT_FAMILY_TRIP_ID &&
      typeof parsed.displayName === 'string' &&
      typeof parsed.profileSlot === 'string'
    ) {
      const validSlot = PROFILE_SLOT_OPTIONS.some((o) => o.id === parsed.profileSlot);
      return {
        tripId: DEFAULT_FAMILY_TRIP_ID,
        displayName: parsed.displayName,
        profileSlot: validSlot ? (parsed.profileSlot as ProfileSlot) : 'other_family',
      };
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: GuestSession | null): void {
  try {
    if (!session) {
      window.localStorage.removeItem(FAMILY_SESSION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(FAMILY_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage errors
  }
}

function TravelWorkspace() {
  const [session, setSession] = useState<GuestSession | null>(() => loadStoredSession());
  const [trip, setTrip] = useState<TripRoom | null>(null);
  const [tripReady, setTripReady] = useState(false);
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
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Listen to Google Maps Platform quota event
  useEffect(() => {
    const handleQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Ensure the shared 2027-01-14 ~ 2027-01-28 trip room exists when a saved session resumes
  useEffect(() => {
    if (!session) {
      setTrip(null);
      setTripReady(true);
      return;
    }

    let cancelled = false;
    setTripReady(false);
    setRoomError(null);

    ensureDefaultFamilyTripRoom()
      .then((room) => {
        if (!cancelled) {
          setTrip(room);
          setTripReady(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRoomError(err instanceof Error ? err.message : '여행 정보를 불러오지 못했습니다.');
          saveStoredSession(null);
          setSession(null);
          setTripReady(true);
        }
      });

    const unsubTrip = subscribeTripRoom(DEFAULT_FAMILY_TRIP_ID, (room) => {
      if (!cancelled && room) {
        setTrip(room);
        setTripReady(true);
      }
    });
    const unsubTravelers = subscribeTravelers(DEFAULT_FAMILY_TRIP_ID, setTravelers);
    const unsubItinerary = subscribeItinerary(DEFAULT_FAMILY_TRIP_ID, setItinerary);
    const unsubDiary = subscribeDiaryEntries(DEFAULT_FAMILY_TRIP_ID, setDiaryEntries);
    const unsubWishlist = subscribeWishlistPlaces(DEFAULT_FAMILY_TRIP_ID, setWishlist);

    return () => {
      cancelled = true;
      unsubTrip();
      unsubTravelers();
      unsubItinerary();
      unsubDiary();
      unsubWishlist();
    };
  }, [session?.tripId]);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'diary') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleEnterFamilyRoom = (nextSession: GuestSession) => {
    saveStoredSession(nextSession);
    setRoomError(null);
    setSession(nextSession);
  };

  const handleSwitchProfileSlot = (slot: ProfileSlot) => {
    const option = PROFILE_SLOT_OPTIONS.find((s) => s.id === slot);
    const nextSession: GuestSession = {
      tripId: DEFAULT_FAMILY_TRIP_ID,
      displayName: option?.label || session?.displayName || '가족',
      profileSlot: slot,
    };
    saveStoredSession(nextSession);
    setSession(nextSession);
  };

  const handleResetToRolePicker = () => {
    saveStoredSession(null);
    setSession(null);
    setTrip(null);
    setIsFamilyModalOpen(false);
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

  const handleCopyAppLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(false);
    }
  };

  const activeProfileSlot: ProfileSlot = session?.profileSlot || 'me';
  const actorName =
    session?.displayName ||
    PROFILE_SLOT_OPTIONS.find((s) => s.id === activeProfileSlot)?.label ||
    '가족';
  const canEdit = activeProfileSlot !== 'other_family';

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

      {!tripReady ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-sm font-medium text-slate-600">
            우리 가족 유럽 여행 정보를 불러오는 중입니다...
          </div>
        </div>
      ) : !session || !trip ? (
        <AuthGate initialError={roomError} onEnterFamilyRoom={handleEnterFamilyRoom} />
      ) : (
        <>
          <TopBar
            tripTitle={trip.title}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            onOpenQuickAdd={() => handleOpenQuickDiary()}
            onOpenFamilyModal={() => setIsFamilyModalOpen(true)}
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
                travelers={travelers}
                itinerary={itinerary}
                wishlist={wishlist}
                onFocusOnMap={handleFocusOnMap}
                onPromotedToItinerary={() => handleSelectTab('itinerary')}
              />
            )}
          </main>

          {/* Family Role & Share Modal (No Invite Code, No Login) */}
          {isFamilyModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-700" />
                    <h2 className="text-base font-bold text-slate-900">내 역할 변경 · 가족 공유</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsFamilyModalOpen(false)}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-500 rounded-xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-5 space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-500">유럽 여행 일정</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono-tabular">
                      2027.{formatKoreanMonthDay(trip.startDate)} ~ {formatKoreanMonthDay(trip.endDate)} (14박 15일)
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCopyAppLink()}
                    className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        가족에게 보낼 앱 주소가 복사되었습니다
                      </>
                    ) : (
                      <>
                        <Link2 className="w-4 h-4" />
                        가족에게 앱 주소 공유하기 (코드 없이 바로 입장)
                      </>
                    )}
                  </button>

                  {/* Quick role switcher */}
                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-2">
                      현재 접속 역할 ({actorName})
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {PROFILE_SLOT_OPTIONS.map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => handleSwitchProfileSlot(slot.id)}
                          className={`text-left px-3 py-2 rounded-xl border text-xs transition-colors min-h-[42px] ${
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

                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetToRolePicker}
                      className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      처음 화면으로 돌아가기
                    </button>
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
