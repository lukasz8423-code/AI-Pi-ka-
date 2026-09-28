import React from 'react';
import { 
  LayoutDashboard, 
  SlidersHorizontal, 
  Clock, 
  BarChart3, 
  FileText, 
  Settings, 
  CreditCard,
  Zap
} from 'lucide-react';

interface AppSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  balance: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
  balance,
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'filtry', label: 'Filtry', icon: SlidersHorizontal },
    { id: 'morning', label: 'Morning', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'exports', label: 'Exports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-full lg:w-64 bg-[#090f17] border-r border-slate-850 p-4 flex flex-col justify-between select-none">
      <div className="space-y-5">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Zap className="w-5 h-5 text-slate-950 fill-slate-950 font-black" />
          </div>
          <div className="font-display font-black text-lg tracking-tight text-white flex items-center gap-1">
            <span>BET</span><span className="text-sky-400">PITCH</span>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-[#0e1724] border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
            <span>Balance</span>
            <CreditCard className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-black font-mono text-slate-100 flex items-baseline gap-1">
            {balance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-xs font-normal text-slate-400 font-sans">PLN</span>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#152336] text-sky-400 border border-sky-500/30 shadow-md shadow-sky-950/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="text-[10px] text-slate-600 px-2 pt-4 border-t border-slate-850">
        AI High-End Live Bet v2.4
      </div>
    </aside>
  );
};
