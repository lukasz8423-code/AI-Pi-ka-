import React from 'react';
import { LiveMatch, ValueBet } from '../types';

interface SettlementPanelProps {
  match: LiveMatch;
  rec: ValueBet | null;
  finalGospodarz: string;
  setFinalGospodarz: (val: string) => void;
  finalGosc: string;
  setFinalGosc: (val: string) => void;
  ocenWynikZalecanegoTypu: (typ: string, fg: number, faway: number) => 'wygrany' | 'przegrany' | 'anulowany';
  onUpdateMatch: (m: LiveMatch) => void;
}

export function SettlementPanel({
  match,
  rec,
  finalGospodarz,
  setFinalGospodarz,
  finalGosc,
  setFinalGosc,
  ocenWynikZalecanegoTypu,
  onUpdateMatch,
}: SettlementPanelProps) {
  const recommendedTyp = match.betPlaced
    ? (match.betPlaced.outcome === '1' ? 'Gospodarz (1)' : match.betPlaced.outcome === '2' ? 'Gość (2)' : 'Remis (X)')
    : (match.typZalecany || (rec ? (rec.outcome === '1' ? 'Gospodarz (1)' : rec.outcome === '2' ? 'Gość (2)' : 'Remis (X)') : ''));

  return (
    <div className="mt-4 pt-4 border-t border-slate-800">
      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Rozliczenie Końcowe (Realny Wynik)
      </span>
      
      {match.status !== 'niesprawdzony' ? (
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850/60 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">
                Status meczu:{' '}
                <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                  match.status === 'wygrany' ? 'bg-emerald-950 text-emerald-400' :
                  match.status === 'przegrany' ? 'bg-red-950 text-red-400' :
                  'bg-slate-900 text-slate-400'
                }`}>
                  {match.status === 'wygrany' ? 'WYGRANY' : match.status === 'przegrany' ? 'PRZEGRANY' : 'ZWROT'}
                </span>
              </div>
              <div className="text-sm font-semibold text-white mt-2">
                Realny wynik końcowy: <span className="font-mono text-emerald-400">{match.finalnyGospodarz ?? match.gole1} : {match.finalnyGosc ?? match.gole2}</span>
              </div>
              {match.typZalecany && (
                <div className="text-[11px] text-slate-400 mt-1">
                  Typ APKI: <strong className="text-slate-200">{match.typZalecany}</strong> po kursie <strong className="text-slate-200">@{match.kursZalecany?.toFixed(2)}</strong>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                onUpdateMatch({
                  ...match,
                  status: 'niesprawdzony'
                });
              }}
              className="px-2.5 py-1.5 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition rounded cursor-pointer self-start sm:self-center"
            >
              Cofnij rozliczenie / Edytuj wynik
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850/60 space-y-3 animate-fadeIn">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mecz się zakończył? Wpisz realny wynik końcowy spotkania, a asystent automatycznie porówna go z rekomendacją i zaktualizuje statystyki bankrollu.
          </p>
          
          <div className="flex items-center gap-3 justify-center py-1 bg-slate-900/40 rounded-lg p-2 max-w-sm mx-auto border border-slate-900">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 mb-1 truncate max-w-[110px]">{match.gospodarz}</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={finalGospodarz}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFinalGospodarz(val);
                }}
                className="w-12 bg-slate-950 text-sm border border-slate-800 rounded p-1 text-center text-white outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
            <span className="text-slate-400 font-bold font-mono mt-4">:</span>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-500 mb-1 truncate max-w-[110px]">{match.gosc}</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={finalGosc}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFinalGosc(val);
                }}
                className="w-12 bg-slate-950 text-sm border border-slate-800 rounded p-1 text-center text-white outline-none focus:border-emerald-500 font-mono font-bold"
              />
            </div>
          </div>

          {/* Podgląd rozliczenia na żywo */}
          {finalGospodarz !== '' && finalGosc !== '' ? (
            <div className={`p-2.5 rounded border text-[11px] text-center ${
              ocenWynikZalecanegoTypu(recommendedTyp, parseInt(finalGospodarz), parseInt(finalGosc)) === 'wygrany' ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 font-semibold' :
              ocenWynikZalecanegoTypu(recommendedTyp, parseInt(finalGospodarz), parseInt(finalGosc)) === 'przegrany' ? 'bg-red-950/40 border-red-500/40 text-red-400 font-semibold' :
              'bg-slate-900 border-slate-800 text-slate-400 font-semibold'
            }`}>
              {ocenWynikZalecanegoTypu(recommendedTyp, parseInt(finalGospodarz), parseInt(finalGosc)) === 'wygrany' ? (
                <span>🟢 Przy wyniku {finalGospodarz}:{finalGosc}, typ APKI (<strong>{recommendedTyp}</strong>) jest <strong>WYGRANY</strong>!</span>
              ) : ocenWynikZalecanegoTypu(recommendedTyp, parseInt(finalGospodarz), parseInt(finalGosc)) === 'przegrany' ? (
                <span>🔴 Przy wyniku {finalGospodarz}:{finalGosc}, typ APKI (<strong>{recommendedTyp}</strong>) jest <strong>PRZEGRANY</strong>.</span>
              ) : (
                <span>⚪ Przy wyniku {finalGospodarz}:{finalGosc}, typ APKI (<strong>{recommendedTyp}</strong>) zostanie rozliczony jako <strong>ZWROT</strong>.</span>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80 text-[11px] text-slate-400 text-center">
              Wpisz wynik powyżej, aby sprawdzić czy typ APKI (<strong>{recommendedTyp || 'Brak'}</strong>) wejdzie!
            </div>
          )}

          <button
            onClick={() => {
              if (finalGospodarz !== '' && finalGosc !== '') {
                const fg = parseInt(finalGospodarz);
                const faway = parseInt(finalGosc);
                const calcStatus = recommendedTyp 
                  ? ocenWynikZalecanegoTypu(recommendedTyp, fg, faway) 
                  : 'anulowany';
                
                onUpdateMatch({
                  ...match,
                  status: calcStatus,
                  finalnyGospodarz: fg,
                  finalnyGosc: faway,
                  ostatniZapisGoli1: match.gole1,
                  ostatniZapisGoli2: match.gole2
                });
              }
            }}
            disabled={finalGospodarz === '' || finalGosc === ''}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded transition flex items-center justify-center gap-1 cursor-pointer"
          >
            Rozlicz i Zapisz Wynik
          </button>
        </div>
      )}
    </div>
  );
}
