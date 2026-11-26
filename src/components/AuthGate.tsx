import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Compass,
  KeyRound,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { signInWithGoogle, signOutUser } from '../firebase';
import { GuestSession, PROFILE_SLOT_OPTIONS, ProfileSlot } from '../types/trip';
import { createDefaultEuropeTrip, verifyInviteCode } from '../services/tripService';

interface AuthGateProps {
  user: User | null;
  initialInviteCode?: string;
  initialError?: string | null;
  onEnterGuestRoom: (session: GuestSession) => void;
  onTripCreated: (inviteCode: string, session: GuestSession) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  user,
  initialInviteCode = '',
  initialError = null,
  onEnterGuestRoom,
  onTripCreated,
}) => {
  const [mode, setMode] = useState<'join' | 'create'>(initialInviteCode ? 'join' : 'join');
  const [selectedSlot, setSelectedSlot] = useState<ProfileSlot>(
    initialInviteCode ? 'niece_g5' : 'me'
  );
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [joinCode, setJoinCode] = useState(initialInviteCode.toUpperCase());
  const [verifiedTripTitle, setVerifiedTripTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError);
  const [imgFailed, setImgFailed] = useState(false);

  // If invite code was provided in URL (?code=...), verify its room title automatically
  useEffect(() => {
    const clean = initialInviteCode.trim().toUpperCase();
    if (!clean) return;
    setJoinCode(clean);
    setMode('join');
    let cancelled = false;
    verifyInviteCode(clean)
      .then((room) => {
        if (!cancelled) {
          setVerifiedTripTitle(room.title);
          setErrorMsg(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerifiedTripTitle(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialInviteCode]);

  const resolveDisplayName = (): string => {
    if (displayName.trim()) return displayName.trim();
    const slotOption = PROFILE_SLOT_OPTIONS.find((s) => s.id === selectedSlot);
    return slotOption?.label || '가족';
  };

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('가족에게 받은 초대 코드를 입력해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const room = await verifyInviteCode(cleanCode);
      onEnterGuestRoom({
        inviteCode: room.inviteCode,
        displayName: resolveDisplayName(),
        profileSlot: selectedSlot,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : '초대 코드를 확인하지 못했습니다. 다시 시도해 주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const loggedIn = await signInWithGoogle();
      if (!displayName && loggedIn.displayName) {
        setDisplayName(loggedIn.displayName);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Google 로그인에 실패했습니다. 팝업 차단을 확인해 주세요.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      const nameToUse = resolveDisplayName();
      const inviteCode = await createDefaultEuropeTrip(user, nameToUse);
      onTripCreated(inviteCode, {
        inviteCode,
        displayName: nameToUse,
        profileSlot: selectedSlot,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '새 가족 여행 공간을 만들지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-6 sm:py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl w-full mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden grid lg:grid-cols-12 items-stretch shadow-sm">
        {/* Left editorial hero photo */}
        <div className="lg:col-span-6 relative min-h-[240px] lg:min-h-[620px] bg-slate-900">
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
              나 · 딸(초6) · 조카(초5) · 엄마 · 이모 2분 · 한국에 있는 형까지
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-balance mb-3">
              지금 어디 있는지, 오늘 뭘 먹었는지, 내일 어디 가는지 한눈에
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed max-w-md mb-5">
              초대 코드만 있으면 초등학생 아이들도 로그인 없이 바로 들어와 실시간 가족 위치, 일정표, 사진 일기장을 함께 볼 수 있어요.
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
                <span>취향 일정표</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right interaction panel */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center">
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              가족 여행방 들어가기
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              초대 코드를 받았다면 로그인 없이 바로 입장하세요. 새 여행을 처음 여는 분만 1회 Google 로그인이 필요합니다.
            </p>
          </div>

          {/* Segmented mode switch */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('join');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap ${
                mode === 'join'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              초대 코드로 바로 입장
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('create');
                setErrorMsg(null);
              }}
              className={`py-2.5 px-3 text-xs font-semibold rounded-lg transition-colors min-h-[44px] whitespace-nowrap ${
                mode === 'create'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              새 가족 여행 만들기
            </button>
          </div>

          {mode === 'join' ? (
            <form onSubmit={handleJoinByCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  가족 초대 코드 (로그인 불필요)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setVerifiedTripTitle(null);
                    }}
                    maxLength={12}
                    required
                    placeholder="예: EU84K2M9"
                    className="w-full pl-10 pr-3.5 py-2.5 text-base font-bold font-mono-tabular tracking-wider uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[48px]"
                  />
                </div>
                {verifiedTripTitle && (
                  <p className="text-xs text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    초대 확인됨: {verifiedTripTitle}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  나는 누구인가요? (선택하면 바로 입장해요)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PROFILE_SLOT_OPTIONS.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-colors min-h-[50px] ${
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
                  placeholder="예: 서연(초5), 지우(초6), 큰이모, 한국 형"
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
                disabled={isLoading || !joinCode.trim()}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    로그인 없이 여행방 들어가기
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div>
              {!user ? (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 leading-relaxed">
                    새로운 가족 여행방을 처음 만드는 분(인솔자)만 Google 로그인으로 방을 개설합니다. 개설 후 발급되는 <strong>초대 코드</strong>를 공유하면 나머지 가족과 초등학생 아이들은 로그인 없이 바로 들어올 수 있습니다.
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleGoogleLogin()}
                    disabled={isLoading}
                    className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2.5 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Users className="w-4 h-4" />
                    )}
                    Google 계정으로 로그인하고 여행방 만들기
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateTrip} className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 text-xs text-slate-600">
                    <span>
                      로그인 계정: <strong className="text-slate-900">{user.displayName || user.email}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => void signOutUser()}
                      className="text-slate-500 hover:text-slate-900 underline min-h-[32px] px-1"
                    >
                      로그아웃
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      방장 이름 (호칭)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={60}
                      placeholder="예: 나 (아빠), 인솔자"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px]"
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
                    className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        유럽 4일차 샘플 일정으로 여행방 만들기
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
