import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Compass,
  LocateFixed,
  Navigation,
  Radio,
  Route as RouteIcon,
  Square,
  Utensils,
} from 'lucide-react';
import {
  DiaryEntry,
  ItineraryItem,
  ProfileSlot,
  Traveler,
  TripRoom,
} from '../types/trip';
import { updateTravelerLocation } from '../services/tripService';

interface FamilyMapViewProps {
  trip: TripRoom;
  travelers: Traveler[];
  itinerary: ItineraryItem[];
  diaryEntries: DiaryEntry[];
  activeProfileSlot: ProfileSlot;
  canEdit: boolean;
  focusedSpot: { lat: number; lng: number; title?: string } | null;
  hasMapsApiKey: boolean;
  onOpenDiaryTab: () => void;
  onOpenItineraryTab: () => void;
  onOpenQuickDiary: (prefill?: {
    city: string;
    placeName: string;
    lat: number;
    lng: number;
    dayIndex: number;
    date: string;
  }) => void;
}

function formatUpdatedTime(ts?: { toDate?: () => Date } | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '방금 전';
  try {
    const d = ts.toDate();
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '방금 전';
  }
}

interface TravelerMarkerProps {
  traveler: Traveler;
  isSelected: boolean;
  onSelect: (traveler: Traveler, marker: google.maps.marker.AdvancedMarkerElement) => void;
}

const TravelerMarker: React.FC<TravelerMarkerProps> = ({ traveler, isSelected, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: traveler.lat, lng: traveler.lng }}
      zIndex={isSelected ? 1000 : 500}
      onClick={() => {
        if (marker) onSelect(traveler, marker);
      }}
      title={`${traveler.name} (${traveler.currentPlaceLabel})`}
    >
      <div className="flex flex-col items-center cursor-pointer select-none group">
        <div
          className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-sm mb-1 whitespace-nowrap"
          style={{ backgroundColor: traveler.markerColor }}
        >
          {traveler.name}
        </div>
        <div
          className={`w-9 h-9 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold transition-transform ${
            isSelected ? 'scale-110 ring-2 ring-slate-900' : 'group-hover:scale-105'
          }`}
          style={{ backgroundColor: traveler.markerColor }}
        >
          {traveler.avatarInitial}
        </div>
      </div>
    </AdvancedMarker>
  );
};

interface SpotMarkerProps {
  item: ItineraryItem;
  indexNumber: number;
  onSelect: (item: ItineraryItem, marker: google.maps.marker.AdvancedMarkerElement) => void;
}

const SpotMarker: React.FC<SpotMarkerProps> = ({ item, indexNumber, onSelect }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: item.lat, lng: item.lng }}
      zIndex={200 + indexNumber}
      onClick={() => {
        if (marker) onSelect(item, marker);
      }}
      title={`${item.dayIndex}일차: ${item.title}`}
    >
      <div className="flex flex-col items-center cursor-pointer select-none">
        <div
          className={`w-7 h-7 rounded-lg border border-white shadow-md flex items-center justify-center text-[11px] font-bold font-mono-tabular ${
            item.status === 'visited'
              ? 'bg-emerald-700 text-white'
              : 'bg-slate-900 text-white'
          }`}
        >
          {indexNumber}
        </div>
      </div>
    </AdvancedMarker>
  );
};

interface MapCameraControllerProps {
  target: { lat: number; lng: number; zoom?: number } | null;
}

const MapCameraController: React.FC<MapCameraControllerProps> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom) {
      map.setZoom(target.zoom);
    }
  }, [map, target]);
  return null;
};

interface DayRouteOverlayProps {
  items: ItineraryItem[];
  enabled: boolean;
}

const DayRouteOverlay: React.FC<DayRouteOverlayProps> = ({ items, enabled }) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!enabled || !map || !routesLib || items.length < 2) return;

    let cancelled = false;
    const origin = { lat: items[0].lat, lng: items[0].lng };
    const destination = { lat: items[items.length - 1].lat, lng: items[items.length - 1].lng };
    const intermediates = items.slice(1, -1).map((spot) => ({
      location: { lat: spot.lat, lng: spot.lng },
    }));

    const compute = async () => {
      try {
        const RouteClass = routesLib.Route as unknown as {
          computeRoutes: (req: Record<string, unknown>) => Promise<{
            routes?: { path?: google.maps.LatLng[]; polyline?: { encodedPolyline?: string } }[];
          }>;
          decode?: (encoded: string) => google.maps.LatLng[];
        };

        const response = await RouteClass.computeRoutes({
          origin,
          destination,
          intermediates: intermediates.length > 0 ? intermediates : undefined,
          travelMode: routesLib.TravelMode.WALKING,
          fields: ['path'],
        });

        if (cancelled) return;
        const route = response.routes?.[0];
        let path: google.maps.LatLng[] | google.maps.LatLngLiteral[] | undefined = route?.path;
        if (!path && route?.polyline?.encodedPolyline && typeof RouteClass.decode === 'function') {
          path = RouteClass.decode(route.polyline.encodedPolyline);
        }

        if (path && path.length > 0) {
          const line = new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#1D4ED8',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map,
          });
          polylineRef.current = line;
        }
      } catch (err) {
        console.warn('Routes API computeRoutes fallback:', err);
        if (!cancelled) {
          const fallbackLine = new google.maps.Polyline({
            path: items.map((s) => ({ lat: s.lat, lng: s.lng })),
            geodesic: true,
            strokeColor: '#1D4ED8',
            strokeOpacity: 0.65,
            strokeWeight: 3,
            map,
          });
          polylineRef.current = fallbackLine;
        }
      }
    };

    void compute();

    return () => {
      cancelled = true;
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [enabled, items, map, routesLib]);

  return null;
};

export const FamilyMapView: React.FC<FamilyMapViewProps> = ({
  trip,
  travelers,
  itinerary,
  diaryEntries,
  activeProfileSlot,
  canEdit,
  focusedSpot,
  hasMapsApiKey,
  onOpenDiaryTab,
  onOpenItineraryTab,
  onOpenQuickDiary,
}) => {
  const defaultTravelerId = activeProfileSlot !== 'brother_home' ? activeProfileSlot : 'me';

  const [activeTravelerId, setActiveTravelerId] = useState<string>(defaultTravelerId);
  const [statusInput, setStatusInput] = useState('');
  const [placeInput, setPlaceInput] = useState('');
  const [isTrackingGps, setIsTrackingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [showRouteLine, setShowRouteLine] = useState(false);

  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(
    null
  );
  const [selectedMarker, setSelectedMarker] = useState<google.maps.marker.AdvancedMarkerElement | null>(
    null
  );
  const [selectedTraveler, setSelectedTraveler] = useState<Traveler | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<ItineraryItem | null>(null);

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeProfileSlot !== 'brother_home') {
      setActiveTravelerId(activeProfileSlot);
    }
  }, [activeProfileSlot]);

  useEffect(() => {
    if (focusedSpot) {
      setCameraTarget({ lat: focusedSpot.lat, lng: focusedSpot.lng, zoom: 15 });
    }
  }, [focusedSpot]);

  const stopGpsTracking = useCallback(async () => {
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTrackingGps(false);

    const target = travelers.find((t) => t.id === activeTravelerId);
    if (target && canEdit) {
      await updateTravelerLocation(trip.inviteCode, target.id, {
        lat: target.lat,
        lng: target.lng,
        accuracyMeters: target.accuracyMeters,
        currentPlaceLabel: target.currentPlaceLabel,
        statusNote: target.statusNote,
        isSharingLocation: false,
      });
    }
  }, [activeTravelerId, canEdit, travelers, trip.inviteCode]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleToggleLiveGps = () => {
    setGpsError(null);
    if (isTrackingGps) {
      void stopGpsTracking();
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError('이 기기에서는 GPS 위치 기능을 지원하지 않습니다.');
      return;
    }

    setIsTrackingGps(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const current = travelers.find((t) => t.id === activeTravelerId);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 20;

        setCameraTarget({ lat, lng, zoom: 15 });
        void updateTravelerLocation(trip.inviteCode, activeTravelerId, {
          lat,
          lng,
          accuracyMeters: acc,
          currentPlaceLabel: placeInput.trim() || current?.currentPlaceLabel || '실시간 GPS 위치',
          statusNote: statusInput.trim() || current?.statusNote || '이동 중',
          isSharingLocation: true,
        });
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.'
            : '현재 GPS 신호를 가져올 수 없습니다. 아래 체크인 버튼으로 위치를 직접 표시할 수 있습니다.'
        );
        setIsTrackingGps(false);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  };

  const handleManualCheckin = async (lat: number, lng: number, label: string) => {
    if (!canEdit) return;
    setGpsError(null);
    const current = travelers.find((t) => t.id === activeTravelerId);
    setCameraTarget({ lat, lng, zoom: 15 });
    await updateTravelerLocation(trip.inviteCode, activeTravelerId, {
      lat,
      lng,
      accuracyMeters: 15,
      currentPlaceLabel: label,
      statusNote: statusInput.trim() || current?.statusNote || '방금 체크인',
      isSharingLocation: true,
    });
  };

  const todayItems = itinerary.filter((item) => item.dayIndex === 1);
  const tomorrowItems = itinerary.filter((item) => item.dayIndex === 2);
  const todayDiaries = diaryEntries.filter((d) => d.dayIndex === 1);
  const latestDiary = diaryEntries[0];

  const defaultCenter =
    travelers.length > 0
      ? { lat: travelers[0].lat, lng: travelers[0].lng }
      : { lat: 48.8584, lng: 2.2945 };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
      <div className="grid lg:grid-cols-12 gap-6 items-stretch">
        {/* Main Interactive Google Map (8 columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            {/* Map Control Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">가족 실시간 위치 지도</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  실시간 공유 {travelers.filter((t) => t.isSharingLocation).length}명 / 전체{' '}
                  {travelers.length}명 · 핀을 눌러 상세 위치 확인
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRouteLine((prev) => !prev)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    showRouteLine
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <RouteIcon className="w-3.5 h-3.5" />
                  1일차 동선
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (travelers[0]) {
                      setCameraTarget({ lat: travelers[0].lat, lng: travelers[0].lng, zoom: 14 });
                    }
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Compass className="w-3.5 h-3.5" />
                  가족 모두 보기
                </button>
              </div>
            </div>

            {/* Map Viewport */}
            <div className="w-full h-[380px] sm:h-[480px] lg:h-[540px] relative bg-slate-100">
              {hasMapsApiKey ? (
                <GoogleMap
                  mapId="DEMO_MAP_ID"
                  defaultCenter={defaultCenter}
                  defaultZoom={14}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                  onClick={() => {
                    setSelectedTraveler(null);
                    setSelectedSpot(null);
                    setSelectedMarker(null);
                  }}
                >
                  <MapCameraController target={cameraTarget} />
                  <DayRouteOverlay items={todayItems} enabled={showRouteLine} />

                  {travelers.map((t) => (
                    <TravelerMarker
                      key={t.id}
                      traveler={t}
                      isSelected={selectedTraveler?.id === t.id}
                      onSelect={(trav, marker) => {
                        setSelectedSpot(null);
                        setSelectedTraveler(trav);
                        setSelectedMarker(marker);
                      }}
                    />
                  ))}

                  {todayItems.map((item, idx) => (
                    <SpotMarker
                      key={item.id}
                      item={item}
                      indexNumber={idx + 1}
                      onSelect={(spot, marker) => {
                        setSelectedTraveler(null);
                        setSelectedSpot(spot);
                        setSelectedMarker(marker);
                      }}
                    />
                  ))}

                  {selectedMarker && selectedTraveler && (
                    <InfoWindow
                      anchor={selectedMarker}
                      onCloseClick={() => {
                        setSelectedTraveler(null);
                        setSelectedMarker(null);
                      }}
                    >
                      <div className="p-1 min-w-[190px] text-slate-900">
                        <div className="font-bold text-sm">{selectedTraveler.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {selectedTraveler.relation} ·{' '}
                          {selectedTraveler.isSharingLocation ? '실시간 공유 중' : '마지막 체크인'}
                        </div>
                        <div className="text-xs font-medium text-slate-800 mt-2">
                          현재 위치: {selectedTraveler.currentPlaceLabel}
                        </div>
                        {selectedTraveler.statusNote && (
                          <div className="text-xs text-blue-700 mt-1">
                            상태: {selectedTraveler.statusNote}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-1.5 font-mono-tabular">
                          업데이트 {formatUpdatedTime(selectedTraveler.updatedAt)}
                        </div>
                      </div>
                    </InfoWindow>
                  )}

                  {selectedMarker && selectedSpot && (
                    <InfoWindow
                      anchor={selectedMarker}
                      onCloseClick={() => {
                        setSelectedSpot(null);
                        setSelectedMarker(null);
                      }}
                    >
                      <div className="p-1 min-w-[200px] text-slate-900">
                        <div className="text-xs text-blue-700 font-semibold">
                          {selectedSpot.dayIndex}일차 · {selectedSpot.startTime}
                        </div>
                        <div className="font-bold text-sm mt-0.5">{selectedSpot.title}</div>
                        <div className="text-xs text-slate-600 mt-1">{selectedSpot.address}</div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenQuickDiary({
                                city: selectedSpot.city,
                                placeName: selectedSpot.title,
                                lat: selectedSpot.lat,
                                lng: selectedSpot.lng,
                                dayIndex: selectedSpot.dayIndex,
                                date: selectedSpot.date,
                              })
                            }
                            className="mt-2 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
                          >
                            이 장소 사진 일기 올리기
                          </button>
                        )}
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-50">
                  <Navigation className="w-10 h-10 text-slate-400 mb-3" />
                  <p className="text-sm font-semibold text-slate-800">
                    Google Maps API 키를 불러오는 중입니다
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    아래 가족별 실시간 위치 목록에서 각 구성원의 현재 위치와 상태를 바로 확인할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Live Family Location Cards & GPS Check-in Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  6명 가족 현재 위치 (누르면 지도 이동)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  나 · 딸(초6) · 조카(초5) · 엄마 · 큰이모 · 작은이모
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleToggleLiveGps}
                  className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    isTrackingGps
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-700 text-white hover:bg-blue-800'
                  }`}
                >
                  {isTrackingGps ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      실시간 GPS 공유 중지
                    </>
                  ) : (
                    <>
                      <Radio className="w-4 h-4" />
                      내 실시간 GPS 위치 켜기
                    </>
                  )}
                </button>
              )}
            </div>

            {gpsError && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {gpsError}
              </div>
            )}

            {/* 6 Family Member Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {travelers.map((t) => {
                const isMeSelected = activeTravelerId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setActiveTravelerId(t.id);
                      setCameraTarget({ lat: t.lat, lng: t.lng, zoom: 16 });
                    }}
                    className={`text-left p-3 rounded-xl border transition-colors min-h-[68px] flex items-start gap-3 ${
                      isMeSelected
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5"
                      style={{ backgroundColor: t.markerColor }}
                    >
                      {t.avatarInitial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{t.name}</span>
                        <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                          {formatUpdatedTime(t.updatedAt)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 truncate mt-0.5">
                        {t.currentPlaceLabel}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {t.isSharingLocation ? '실시간 GPS' : '체크인'} · {t.statusNote}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Status / Place Check-in for Selected Traveler */}
            {canEdit && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={placeInput}
                  onChange={(e) => setPlaceInput(e.target.value)}
                  maxLength={100}
                  placeholder="현재 장소 이름 (예: 에펠탑 매표소 앞)"
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
                />
                <input
                  type="text"
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  maxLength={80}
                  placeholder="상태 메모 (예: 젤라또 먹는 중)"
                  className="flex-1 px-3.5 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const target = travelers.find((t) => t.id === activeTravelerId);
                    const spot = todayItems[0];
                    const lat = target?.lat ?? spot?.lat ?? 48.8584;
                    const lng = target?.lng ?? spot?.lng ?? 2.2945;
                    const label =
                      placeInput.trim() || target?.currentPlaceLabel || '현재 체크인 위치';
                    void handleManualCheckin(lat, lng, label);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  선택한 가족 상태 업데이트
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Briefing Column */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-amber-700" />
                <h3 className="text-sm font-bold text-slate-900">오늘 뭘 먹고 뭘 했는지</h3>
              </div>
              <button
                type="button"
                onClick={onOpenDiaryTab}
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap min-h-[36px] px-1"
              >
                일기장 전체 보기
              </button>
            </div>

            {latestDiary ? (
              <div className="space-y-3">
                <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                  {latestDiary.photoUrl ? (
                    <img
                      src={latestDiary.photoUrl}
                      alt={latestDiary.mealOrActivity}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      사진 없음
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    최신 기록 · {latestDiary.dayIndex}일차 · {latestDiary.timeLabel} · {latestDiary.city}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {latestDiary.mealOrActivity}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">
                    {latestDiary.story}
                  </p>
                </div>
                {todayDiaries.length > 1 && (
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                    오늘 남긴 사진 기록 {todayDiaries.length}건
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">아직 올라온 사진 일기가 없습니다.</p>
              </div>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => onOpenQuickDiary()}
                className="mt-4 w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                방금 찍은 사진 · 먹은 음식 올리기
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">오늘 & 내일 일정</h3>
              </div>
              <button
                type="button"
                onClick={onOpenItineraryTab}
                className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap min-h-[36px] px-1"
              >
                전체 일정 편집
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  오늘 (1일차 · {todayItems[0]?.city || '파리'})
                </div>
                <div className="divide-y divide-slate-100">
                  {todayItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setCameraTarget({ lat: item.lat, lng: item.lng, zoom: 15 })
                      }
                      className="w-full text-left py-2.5 flex items-start gap-2.5 hover:bg-slate-50 rounded-lg px-1.5 transition-colors"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          item.status === 'visited' ? 'text-emerald-600' : 'text-slate-300'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono-tabular mt-0.5">
                          {item.startTime} - {item.endTime} ·{' '}
                          {item.tags.slice(0, 2).map((t) => `#${t}`).join(' ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="text-xs font-semibold text-blue-700 mb-2">
                  내일 (2일차 · {tomorrowItems[0]?.city || '파리'})
                </div>
                {tomorrowItems.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {tomorrowItems.map((item) => (
                      <div key={item.id} className="py-2 flex items-start gap-2.5 px-1.5">
                        <span className="text-[11px] font-mono-tabular font-semibold text-slate-500 mt-0.5 shrink-0">
                          {item.startTime}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {item.tags.slice(0, 3).map((t) => `#${t}`).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">내일 등록된 일정이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
