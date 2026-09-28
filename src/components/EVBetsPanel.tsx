import React from 'react';
import { ValueBet } from '../types';

interface EVBetsPanelProps {
  evBets: ValueBet[];
}

export function EVBetsPanel({ evBets }: EVBetsPanelProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-800">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Ocena Opłacalności (Expected Value):
      </span>
      <div className="grid grid-cols-3 gap-2">
        {evBets.map((b) => {
          const isVal = b.isPositive;
          
          // Określamy podświetlenie kafelka
          let cardClass = 'bg-slate-950/60 border-slate-900 opacity-60';
          if (isVal) {
            cardClass = 'bg-emerald-950/40 border-emerald-500 shadow-sm shadow-emerald-950/40 ring-1 ring-emerald-500/20';
          }

          return (
            <div 
              key={b.outcome}
              className={`p-2 rounded-lg border text-center transition flex flex-col justify-between ${cardClass}`}
            >
              <div>
                <div className="text-[10px] text-slate-400 font-medium">{b.name}</div>
                <div className="text-sm font-mono font-bold text-slate-100 mt-1">@{b.odd.toFixed(2)}</div>
                <div className={`text-[10px] font-mono mt-0.5 font-bold ${b.ev > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                  EV: {b.ev > 0 ? '+' : ''}{Math.round(b.ev * 100)}%
                </div>
              </div>

              {isVal && (
                <div className="mt-2 pt-1 border-t border-emerald-900/30">
                  <span className="inline-block bg-emerald-600 text-white font-sans text-[8px] font-bold px-1 rounded uppercase">
                    VALUE BET
                  </span>
                  {b.kellyStake !== undefined && b.kellyStake > 0 && (
                    <div className="text-[9px] font-mono font-extrabold text-emerald-300 mt-0.5 leading-none">
                      Stawka: {b.kellyStake}%
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Kelly sizing disclaimer info block */}
      <div className="mt-2 text-[9px] text-slate-500 leading-normal bg-slate-950 p-2 rounded border border-slate-900">
        💡 <strong className="text-slate-400">Kryterium Kelly'ego (Ćwierć Kelly'ego):</strong> Sugerowana stawka określa jaki procent Twojego kapitału (bankrollu) powinienems postawić, aby zoptymalizować matematyczny wzrost zysku i zminimalizować ryzyko bankructwa. Maksymalna zalecana stawka to bezpieczne 20%.
      </div>
    </div>
  );
}
