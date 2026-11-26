import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Camera,
  Compass,
  Loader2,
  MapPin,
} from 'lucide-react';
import { GuestSession, PROFILE_SLOT_OPTIONS, ProfileSlot } from '../types/trip';
import { DEFAULT_FAMILY_TRIP_ID, ensureDefaultFamilyTripRoom } from '../services/tripService';

interface AuthGateProps {
  initialError?: string | null;
  onEnterFamilyRoom: (session: GuestSession) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  initialError = null,
  onEnterFamilyRoom,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<ProfileSlot>('me');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [imgFailed, setImgFailed] = useState(false);

  const resolveDisplayName = (): string => {
    if (displayName.trim()) return displayName.trim();
    const slotOption = PROFILE_SLOT_OPTIONS.find((s) => s.id === selectedSlot);
    return slotOption?.label || '가족';
  };

  const handleEnterRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await ensureDefaultFamilyTripRoom();
      onEnterFamilyRoom({
        tripId: DEFAULT_FAMILY_TRIP_ID,
        displayName: resolveDisplayName(),
        profileSlot: selectedSlot,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '가족 여행방을 불러오지 못했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-6 sm:py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl w-full mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden grid lg:grid-cols-12 items-stretch shadow-sm">
        {/* Left editorial hero photo */}
        <div className="lg:col-span-6 relative min-h-[250px] lg:min-h-[600px] bg-slate-900">
          {!imgFailed ? (
            <img
              src="/src/assets/images/europe_trip_cover_1795673595747.jpg"
              alt="파리 에펠탑과 유럽 아침 발코니 풍경"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-800 to-slate-950 text-white">
              <Compass className="w-12 h-12 mb-3 text-blue-300" />
              <p className="text-lg font-semibold">우리 가족 유럽 여행</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-6 sm:p-10 text-white">
            <p className="text-xs font-medium tracking-wide text-blue-200 mb-2">
              2027년 1월 14일(목) ~ 1월 28일(목) · 14박 15일 · 나 · 딸(초6) · 조카(초5) · 엄마 · 이모 2분 · 다른 가족
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-balance mb-3">
              지금 어디 있는지, 오늘 뭘 먹었는지, 내일 어디 가는지 한눈에
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-md mb-5">
              로그인 없이 가족 중 누구로 참여하는지만 선택하면, 1월 14일부터 28일까지의 유럽 일정표와 사진 일기장, 실시간 위치를 바로 함께 볼 수 있어요.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/15 text-xs text-slate-200">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-300 shrink-0" />
                <span>실시간 지도</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-300 shrink-0" />
                <span>사진 일기장</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>15일 일정표</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right interaction panel: direct family member selector */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <div className="text-xs font-semibold text-blue-700 font-mono-tabular mb-1">
              2027.01.14(목) ~ 2027.01.28(목)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              누구로 들어가시나요?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              별도의 로그인 절차 없이 내 역할만 고르면 바로 입장합니다.
            </p>
          </div>

          <form onSubmit={handleEnterRoom} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                가족 구성원 선택
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROFILE_SLOT_OPTIONS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-colors min-h-[54px] ${
                      selectedSlot === slot.id
                        ? 'border-blue-600 bg-blue-50/70 text-blue-950 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="truncate">{slot.label}</div>
                    <div className="text-[11px] text-slate-500 font-normal truncate mt-0.5">
                      {slot.sublabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                표시할 이름 (비워두면 선택한 역할 이름으로 표시)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={60}
                placeholder="예: 서연(초5), 지우(초6), 큰이모, 다른 가족"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[44px]"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  우리 가족 유럽 여행 들어가기
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
