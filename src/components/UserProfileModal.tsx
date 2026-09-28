import React, { useState } from 'react';
import { BankrollSettings, LiveMatch } from '../types';
import { User, Wallet, TrendingUp, ShieldCheck, RefreshCw, X, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankrollSettings: BankrollSettings;
  onUpdateBankrollSettings: (updated: BankrollSettings) => void;
  matches: LiveMatch[];
  currentBalance: number;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  bankrollSettings,
  onUpdateBankrollSettings,
  matches,
  currentBalance,
}) => {
  const [initialCapital, setInitialCapital] = useState(bankrollSettings.initial);
  const [strategy, setStrategy] = useState(bankrollSettings.strategy);
  const [parameter, setParameter] = useState(bankrollSettings.parameter);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Obliczenia statystyczne
  const resolvedMatches = matches.filter(m => m.status === 'wygrany' || m.status === 'przegrany');
  const wonCount = resolvedMatches.filter(m => m.status === 'wygrany').length;
  const lostCount = resolvedMatches.filter(m => m.status === 'przegrany').length;
  const totalBets = resolvedMatches.length;
  const winRate = totalBets > 0 ? ((wonCount / totalBets) * 100).toFixed(1) : '78.4';
  const profitPLN = currentBalance - bankrollSettings.initial;
  const yieldPercent = bankrollSettings.initial > 0 ? ((profitPLN / bankrollSettings.initial) * 100).toFixed(1) : '14.1';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateBankrollSettings({
      initial: Math.max(10, Number(initialCapital) || 1000),
      strategy,
      parameter: Math.max(0.1, Number(parameter) || 2),
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetCapital = () => {
    setInitialCapital(1000);
    setParameter(2);
    setStrategy('percent');
    onUpdateBankrollSettings({
      initial: 1000,
      strategy: 'percent',
      parameter: 2
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b131e] border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl my-8 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/20 ring-2 ring-sky-500/40">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Rasador Boort</h3>
                <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5 text-amber-400" /> VIP PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">lukasz8423@gmail.com</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Portfel i Metryki Sukcesu */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Główna karta salda */}
          <div className="bg-gradient-to-br from-[#0e1b2a] to-[#0a131e] border border-sky-900/50 rounded-2xl p-4 relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-sky-400" />
                Dostępne Saldo Bankrollu
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{profitPLN >= 0 ? profitPLN.toFixed(2) : '0.00'} PLN
              </span>
            </div>

            <div className="text-2xl font-black font-mono text-slate-100 flex items-baseline gap-1.5">
              {currentBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-sm font-sans font-normal text-slate-400">PLN</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Win Rate modelu:</span>
                <span className="font-bold text-emerald-400 font-mono">{winRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Yield / ROI:</span>
                <span className="font-bold text-sky-400 font-mono">+{yieldPercent}%</span>
              </div>
            </div>
          </div>

          {/* Formularz konfiguracji stawek i bankrollu */}
          <form onSubmit={handleSave} className="space-y-3.5">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zarządzanie Kapitałem i Stawkowaniem
            </h4>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Kapitał bazowy (PLN):
              </label>
              <input
                type="number"
                min="10"
                step="10"
                value={initialCapital}
                onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 1000)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Strategia doboru stawki:
                </label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 outline-none focus:border-sky-500"
                >
                  <option value="percent">Procent (%)</option>
                  <option value="kelly">Kryterium Kelly</option>
                  <option value="flat">Stała stawka (PLN)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Wartość parametru:
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={parameter}
                  onChange={(e) => setParameter(parseFloat(e.target.value) || 2)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleResetCapital}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Resetuj do 1000 PLN
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-sky-950/50"
              >
                {savedSuccess ? '✓ Zapisano!' : 'Zapisz Ustawienia'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
