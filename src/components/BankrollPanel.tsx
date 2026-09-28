import React from 'react';
import { LiveMatch, ValueBet, BankrollSettings } from '../types';
import { TrendingUp } from 'lucide-react';

interface BankrollPanelProps {
  match: LiveMatch;
  rec: ValueBet | null;
  bankrollSettings: BankrollSettings | null;
  getSuggestedStake: (odd: number, ev: number) => { stake: number; balance: number };
  handlePlaceBet: () => void;
  onUpdateMatch: (m: LiveMatch) => void;
}

export function BankrollPanel({
  match,
  rec,
  bankrollSettings,
  getSuggestedStake,
  handlePlaceBet,
  onUpdateMatch,
}: BankrollPanelProps) {
  if (!bankrollSettings || !rec) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Moduł Bankroll & Stawkowanie
        </span>
        <span className="text-[9px] text-slate-500 font-mono">
          Strategia: {
            bankrollSettings.strategy === 'flat' ? 'Płaska stawka' :
            bankrollSettings.strategy === 'percent' ? `Procentowa (${bankrollSettings.parameter}%)` :
            `Kryterium Kelly'ego (f=${bankrollSettings.parameter})`
          }
        </span>
      </div>

      {match.betPlaced ? (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3.5 flex flex-col gap-3.5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                Aktywny zakład zarejestrowany!
              </div>
              <p className="mt-1">
                Postawiono <strong className="text-white font-mono">{match.betPlaced.stake} PLN</strong> na typ <strong className="text-white">{match.betPlaced.outcome === '1' ? 'Gospodarz (1)' : match.betPlaced.outcome === '2' ? 'Gość (2)' : 'Remis (X)'}</strong> po kursie <strong className="text-white font-mono">@{match.betPlaced.odd.toFixed(2)}</strong>.
              </p>
            </div>
            <button
              onClick={() => {
                onUpdateMatch({
                  ...match,
                  betPlaced: undefined
                });
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-950 transition rounded self-start sm:self-center shrink-0 cursor-pointer"
            >
              Anuluj zakład
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-emerald-950/40 text-xs">
            <div className="bg-slate-950/80 p-2 rounded border border-emerald-900/10">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Zalecana granica kursu</span>
              <span className="font-sans text-slate-300">Warto stawiać od: <strong className="text-emerald-400 font-mono">@{(1 / rec.fairProb).toFixed(2)}</strong></span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-emerald-900/10">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Zysk Netto z wygranej</span>
              <span className="font-sans text-emerald-400 font-bold font-mono">+{(match.betPlaced.stake * (match.betPlaced.odd - 1)).toFixed(2)} PLN</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 flex flex-col gap-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lewa strona: Typ, kurs sprawiedliwy i zalecany kurs */}
            <div className="space-y-2">
              <div className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                Sugerowany typ: 
                <strong className="text-white bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono text-[11px]">
                  {rec.outcome === '1' ? '1' : rec.outcome === '2' ? '2' : 'X'} (@{rec.odd.toFixed(2)})
                </strong>
                {rec.isPositive ? (
                  <span className="bg-emerald-500 text-slate-950 text-[8px] font-bold px-1 rounded uppercase tracking-wider">
                    Value bet ({Math.round(rec.ev * 100)}% EV)
                  </span>
                ) : (
                  <span className="bg-red-950 text-red-400 border border-red-900/40 text-[8px] font-bold px-1 rounded uppercase tracking-wider">
                    Ujemne EV ({Math.round(rec.ev * 100)}% EV)
                  </span>
                )}
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <div>
                  Granica opłacalności: <span className="text-slate-200">obstawiaj tylko przy kursie powyżej <strong className="text-emerald-400 font-mono">@{(1 / rec.fairProb).toFixed(2)}</strong></span>
                </div>
                <div className="text-[10px] text-slate-500 leading-normal">
                  (Każdy kurs powyżej @{(1 / rec.fairProb).toFixed(2)} ma dodatnie EV)
                </div>
              </div>
            </div>

            {/* Prawa strona: Sugerowana kwota w PLN i zysk */}
            <div className="space-y-2 bg-slate-900/50 p-2.5 rounded border border-slate-800/80">
              <div className="text-xs text-slate-400">
                Sugerowana stawka: <strong className="text-emerald-400 font-mono text-sm">{getSuggestedStake(rec.odd, rec.ev).stake} PLN</strong>
                <span className="text-[10px] text-slate-500 block font-mono mt-0.5">(Twój kapitał: {getSuggestedStake(rec.odd, rec.ev).balance} PLN)</span>
              </div>
              <div className="text-xs text-slate-400 border-t border-slate-800/50 pt-1.5">
                Potencjalny zysk netto: <strong className="text-teal-400 font-mono text-sm">{(getSuggestedStake(rec.odd, rec.ev).stake * (rec.odd - 1)).toFixed(2)} PLN</strong>
                <span className="text-[10px] text-slate-500 block mt-0.5">(Łączna wygrana: {(getSuggestedStake(rec.odd, rec.ev).stake * rec.odd).toFixed(2)} PLN)</span>
              </div>
            </div>
          </div>

          <button
            onClick={handlePlaceBet}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded transition shadow-md shadow-emerald-950/20 flex items-center gap-1.5 justify-center cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-white" />
            Zatwierdź i Postaw sugerowany zakład ({getSuggestedStake(rec.odd, rec.ev).stake} PLN)
          </button>
        </div>
      )}
    </div>
  );
}
