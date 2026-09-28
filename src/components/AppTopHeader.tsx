import React from 'react';
import { Search, Bell, LayoutGrid, Settings, User } from 'lucide-react';

interface AppTopHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenSettings: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  isApiActive: boolean;
  activeNotificationsCount?: number;
}

export const AppTopHeader: React.FC<AppTopHeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenSettings,
  onOpenNotifications,
  onOpenProfile,
  isApiActive,
  activeNotificationsCount = 3,
}) => {
  return (
    <header className="h-16 bg-[#090f17] border-b border-slate-850 px-4 sm:px-6 flex items-center justify-between gap-4 select-none relative z-30">
      {/* Tytuł Dashboardu */}
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold font-display text-slate-100">Dashboard</h1>
      </div>

      {/* Pasek Wyszukiwania w stylu załączonego obrazu */}
      <div className="flex-1 max-w-md hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Wyszukaj mecz lub drużynę..."
            className="w-full bg-[#101926] border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 transition-all font-sans"
          />
        </div>
      </div>

      {/* Prawa strona nagłówka: Powiadomienia, Profil użytkownika, API status */}
      <div className="flex items-center gap-3">
        {/* Wskaźnik API ACTIVE */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 bg-[#0e1724] border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-full text-xs font-mono text-slate-300 transition cursor-pointer"
          title="Konfiguracja API i parametrów"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-bold text-slate-200">API ACTIVE</span>
          <Settings className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>

        {/* Siatka ikon aplikacji */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-xl transition cursor-pointer"
          title="Ustawienia systemowe"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>

        {/* Dzwonek powiadomień z czerwoną plakietką */}
        <div className="relative">
          <button
            type="button"
            onClick={onOpenNotifications}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-xl transition cursor-pointer active:scale-95"
            title="Otwórz centrum powiadomień"
          >
            <Bell className="w-4 h-4" />
          </button>
          {activeNotificationsCount > 0 && (
            <span
              onClick={onOpenNotifications}
              className="absolute top-1 right-1 w-4 h-4 bg-rose-500 hover:bg-rose-400 text-white font-mono font-bold text-[9px] rounded-full flex items-center justify-center ring-2 ring-[#090f17] cursor-pointer"
            >
              {activeNotificationsCount}
            </span>
          )}
        </div>

        {/* Profil typera: Avatar + Rasador Boort + Balans */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-2.5 border-l border-slate-800 hover:opacity-90 transition cursor-pointer group"
          title="Zarządzanie profilem i bankrollem"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800 group-hover:ring-sky-500/50 transition">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-200 leading-tight group-hover:text-sky-300 transition">Rasador Boort</span>
            <span className="text-[10px] font-mono font-semibold text-emerald-400 leading-tight">+14,110.00 PLN</span>
          </div>
        </button>
      </div>
    </header>
  );
};

