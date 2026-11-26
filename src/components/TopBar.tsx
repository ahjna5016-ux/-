import React from 'react';
import { BookOpen, CalendarDays, HeartHandshake, MapPin, Plus, Users } from 'lucide-react';

export type ActiveTab = 'map' | 'itinerary' | 'diary' | 'wishlist';

interface TopBarProps {
  tripTitle: string;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenQuickAdd: () => void;
  onOpenFamilyModal: () => void;
  canEdit: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  tripTitle,
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
  onOpenFamilyModal,
  canEdit,
}) => {
  const navItems: { id: ActiveTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    { id: 'map', label: '지도 · 실시간 위치', mobileLabel: '실시간 지도', icon: <MapPin className="w-5 h-5" /> },
    { id: 'itinerary', label: '공유 일정표', mobileLabel: '일정표', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'diary', label: '사진 일기장', mobileLabel: '일기장', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'wishlist', label: '추천 여행지', mobileLabel: '추천 여행지', icon: <HeartHandshake className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Desktop & Mobile Top Navigation (3-zone contract) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('map')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors"
          >
            {tripTitle || '우리 가족 유럽 여행'}
          </button>

          {/* Zone 2: 4 clean single-line text nav links */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isActive
                      ? 'text-blue-700 border-blue-700 font-semibold'
                      : 'text-slate-600 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Family switcher + Primary CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenFamilyModal}
              title="내 역할 변경 및 가족 공유"
              className="min-h-[40px] min-w-[40px] px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">내 역할 · 공유</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={onOpenQuickAdd}
                className="min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>사진 · 일정 추가</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="하단 메뉴"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 h-16"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] transition-colors ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {item.icon}
              <span className="text-[11px] mt-0.5 whitespace-nowrap">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
