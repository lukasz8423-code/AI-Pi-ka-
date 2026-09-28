import React from 'react';
import { LiveMatch, Probabilities, MatchStats } from '../types';
import { Activity, Zap, AlertTriangle, AlertCircle, ShieldAlert, Timer, Compass } from 'lucide-react';
import { oblicz_pressure_index, obliczIndeksSpiec, wykryjEksplozjeKartek, analizujReakcjeBukmachera } from '../utils/bettingCalc';

interface ProbabilityModelPanelProps {
  match: LiveMatch;
  fairProbs: Probabilities;
  probsRaw: Probabilities;
  stats: MatchStats;
}

export function ProbabilityModelPanel({
  match,
  fairProbs,
  probsRaw,
  stats,
}: ProbabilityModelPanelProps) {
  const pressure = oblicz_pressure_index(match);

  return (
    <>
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
        <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          Model Probabilistyczny & Zakłady EV
        </h3>
        <span className="text-[10px] text-slate-400 font-mono">Rozkład 100%</span>
      </div>

      {/* Porównanie prawdopodobieństw */}
      <div className="space-y-3.5">
        {/* Wygrana Gospodarza */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-300">1. {match.gospodarz}</span>
            <span className="font-mono text-slate-400">
              Model: <strong className="text-slate-100">{Math.round(fairProbs.p1 * 100)}%</strong> 
              <span className="mx-1.5">|</span> 
              Bukmacher: <span className="text-slate-500">{Math.round((probsRaw.p1_surowe / (probsRaw.p1_surowe + probsRaw.px_surowe + probsRaw.p2_surowe)) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300" 
              style={{ width: `${fairProbs.p1 * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Remis */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-300">X. Remis</span>
            <span className="font-mono text-slate-400">
              Model: <strong className="text-slate-100">{Math.round(fairProbs.px * 100)}%</strong> 
              <span className="mx-1.5">|</span> 
              Bukmacher: <span className="text-slate-500">{Math.round((probsRaw.px_surowe / (probsRaw.p1_surowe + probsRaw.px_surowe + probsRaw.p2_surowe)) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${fairProbs.px * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Wygrana Gościa */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-slate-300">2. {match.gosc}</span>
            <span className="font-mono text-slate-400">
              Model: <strong className="text-slate-100">{Math.round(fairProbs.p2 * 100)}%</strong> 
              <span className="mx-1.5">|</span> 
              Bukmacher: <span className="text-slate-500">{Math.round((probsRaw.p2_surowe / (probsRaw.p1_surowe + probsRaw.px_surowe + probsRaw.p2_surowe)) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-indigo-500 transition-all duration-300" 
              style={{ width: `${fairProbs.p2 * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Stagnacja, Dominacja i Pressure Index */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800">
        {/* Wskaźnik Tempa i Presji (Pressure Index) */}
        <div className={`p-2.5 rounded-lg border transition-all duration-300 ${
          pressure.isHot 
            ? 'bg-red-950/20 border-red-500/40 shadow-inner shadow-red-950/30' 
            : 'bg-slate-950 border-slate-800/80'
        }`}>
          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5 font-semibold">
            <span className={`inline-block w-2 h-2 rounded-full ${pressure.isHot ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></span>
            Pressure Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-base font-mono font-extrabold ${
              pressure.isHot ? 'text-red-500 text-lg' : pressure.value >= 60 ? 'text-amber-400' : 'text-slate-300'
            }`}>{pressure.value}%</span>
            <span className="text-[10px] text-slate-500">tempo</span>
          </div>
          <span className={`text-[10px] block mt-1 leading-snug font-semibold truncate ${
            pressure.isHot ? 'text-red-400' : 'text-slate-400'
          }`}>
            {pressure.label}
          </span>
        </div>

        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Linia Stagnacji (0-10)</span>
            {stats.hasManualShots ? (
              <span className="text-[8px] font-mono font-bold px-1 bg-amber-950/60 text-amber-400 border border-amber-800/40 rounded scale-90 origin-right">RĘCZNE</span>
            ) : (
              <span className="text-[8px] font-mono font-bold px-1 bg-sky-950/60 text-sky-400 border border-sky-800/40 rounded scale-90 origin-right">AUTO</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-mono font-bold text-amber-400">{stats.stagnationLine}</span>
            <span className="text-[10px] text-slate-400">/ 10</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 leading-snug truncate">
            {stats.stagnationLine >= 7 ? 'Niska dynamika goli' : stats.stagnationLine <= 3.5 ? 'Wysoki potencjał bramkowy' : 'Średnie tempo gry'}
          </span>
        </div>
        
        <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Dominacja ({match.gospodarz})</span>
            {stats.hasManualShots ? (
              <span className="text-[8px] font-mono font-bold px-1 bg-amber-950/60 text-amber-400 border border-amber-800/40 rounded scale-90 origin-right">RĘCZNE</span>
            ) : (
              <span className="text-[8px] font-mono font-bold px-1 bg-sky-950/60 text-sky-400 border border-sky-800/40 rounded scale-90 origin-right">AUTO</span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-mono font-bold text-emerald-400">{stats.homeDominance}%</span>
            <span className="text-[10px] text-slate-400">naporu</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-1 leading-snug truncate">
            Goście: {100 - stats.homeDominance}% naporu {stats.hasManualShots && `(${match.strzaly1}:${match.strzaly2})`}
          </span>
        </div>
      </div>

      {/* Live Momentum Shift i Precyzja Ataku */}
      <div className="mt-4 p-3 bg-slate-950 border border-slate-800/80 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Wskaźnik Momentum Ataku</span>
            {!stats.hasManualShots && (
              <span className="text-[7px] font-mono font-bold px-1 bg-sky-950 text-sky-400 border border-sky-900/60 rounded">SZACUNEK AUTO</span>
            )}
          </div>
          <span className={`text-[10px] font-mono font-bold ${
            (stats.momentumScore || 0) > 20 ? 'text-emerald-400' :
            (stats.momentumScore || 0) < -20 ? 'text-indigo-400' :
            'text-slate-400'
          }`}>
            {(stats.momentumScore || 0) > 0 ? `+${stats.momentumScore}%` : `${stats.momentumScore || 0}%`}
          </span>
        </div>
        
        {/* Pasek Momentum od -100% (wyjazd) do +100% (gospodarz) */}
        <div className="h-3.5 bg-slate-900 rounded-full overflow-hidden flex relative items-center justify-center border border-slate-800">
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-slate-700 z-10"></div> {/* Środek */}
          <div 
            className={`h-full transition-all duration-500 ${
              (stats.momentumScore || 0) >= 0 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-l from-indigo-600 to-indigo-400'
            }`}
            style={{ 
              width: `${Math.abs(stats.momentumScore || 0) / 2}%`,
              marginLeft: (stats.momentumScore || 0) >= 0 ? '50%' : 'auto',
              marginRight: (stats.momentumScore || 0) < 0 ? '50%' : 'auto'
            }}
          ></div>
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-400 mt-1 font-mono gap-1">
          <span className="truncate max-w-[38%] text-left" title={`${match.gosc} (Goście)`}>◀ {match.gosc}</span>
          <span className="text-[8px] text-slate-500 shrink-0 px-1">0% (Środek)</span>
          <span className="truncate max-w-[38%] text-right" title={`${match.gospodarz} (Gospodarz)`}>{match.gospodarz} ▶</span>
        </div>

        {/* Precyzja strzelecka */}
        <div className="grid grid-cols-2 gap-3 mt-3 pt-2.5 border-t border-slate-900">
          <div className="min-w-0">
            <div className="flex justify-between text-[9px] mb-1 gap-1">
              <span className="text-slate-400 truncate flex-1" title={match.gospodarz}>
                Celność: {match.gospodarz}
              </span>
              <span className="font-mono text-emerald-400 font-bold shrink-0">{stats.efficiency1}%</span>
            </div>
            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.efficiency1}%` }}
              ></div>
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex justify-between text-[9px] mb-1 gap-1">
              <span className="text-slate-400 truncate flex-1" title={match.gosc}>
                Celność: {match.gosc}
              </span>
              <span className="font-mono text-indigo-400 font-bold shrink-0">{stats.efficiency2}%</span>
            </div>
            <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.efficiency2}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* STRATEGIE LIVE, EKSPLOZJA KARTEK I REAKCJA BUKMACHERA */}
      <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-display font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
            <Compass className="w-4 h-4 text-emerald-400" />
            Upgrade Strategii Live & Anomalie
          </h4>
          {stats.hasManualShots ? (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded-full">
              TRYB PEŁNY (TELEMETRIA)
            </span>
          ) : (
            <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-900 rounded-full animate-pulse" title="Brak statystyk strzałów bukmachera. Algorytm opiera analizę wyłącznie na minucie, wyniku i kartkach.">
              TRYB FALLBACK (OPCJA STRZAŁY OFF)
            </span>
          )}
        </div>

        {/* Fallback info card */}
        {!stats.hasManualShots && (
          <div className="bg-amber-950/20 border border-amber-900/40 rounded-lg p-2.5 text-[11px] text-amber-300 leading-relaxed">
            <div className="flex gap-1.5 items-start">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Aktywny Fallback:</strong> Brak manualnych statystyk strzałów. Analiza prawdopodobieństw i valuebetów została automatycznie oparta na minucie meczu, aktualnym wyniku i dyscyplinie (kartkach). System działa bez zakłóceń.
              </div>
            </div>
          </div>
        )}

        {/* Trzy kluczowe wskaźniki w gridzie */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* 1. Indeks Spięć & Presja Końcówki */}
          {(() => {
            const tensionInfo = obliczIndeksSpiec(match);
            const isLatePressure = match.minuta >= 75 && (match.gole1 === match.gole2 || Math.abs(match.gole1 - match.gole2) === 1);
            
            return (
              <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                isLatePressure 
                  ? 'bg-red-950/20 border-red-500/30 shadow-sm shadow-red-950/30' 
                  : tensionInfo.value >= 45 
                  ? 'bg-amber-950/10 border-amber-500/20' 
                  : 'bg-slate-950 border-slate-900'
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Indeks Spięć</span>
                    <span className={`text-[9px] font-bold px-1.5 rounded ${
                      tensionInfo.level === 'Ekstremalny' ? 'bg-red-950 text-red-400 border border-red-900' :
                      tensionInfo.level === 'Wysoki' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                      tensionInfo.level === 'Umiarkowany' ? 'bg-blue-950 text-blue-400 border border-blue-900' :
                      'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {tensionInfo.level}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className={`text-base font-mono font-extrabold ${
                      tensionInfo.value >= 75 ? 'text-red-500' : tensionInfo.value >= 45 ? 'text-amber-400' : 'text-slate-200'
                    }`}>{tensionInfo.value}%</span>
                    <span className="text-[9px] text-slate-500">napięcia</span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        tensionInfo.value >= 75 ? 'bg-red-500' : tensionInfo.value >= 45 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${tensionInfo.value}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-450 leading-snug">
                  <p>{tensionInfo.description}</p>
                  {isLatePressure && (
                    <strong className="block text-red-400 mt-1">⚠️ Presja końcówki (75+ min): Podwyższone ryzyko bramki z rzutu karnego lub błędu obrony!</strong>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. Eksplozja Kartek */}
          {(() => {
            const explosionInfo = wykryjEksplozjeKartek(match);
            
            return (
              <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                explosionInfo.isExplosion 
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-950/30' 
                  : 'bg-slate-950 border-slate-900'
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kontrola Sędziego</span>
                    {explosionInfo.isExplosion && (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className={`text-sm font-mono font-extrabold ${
                      explosionInfo.strength === 'Krytyczna' ? 'text-red-500' : explosionInfo.strength === 'Średnia' ? 'text-amber-400' : 'text-slate-200'
                    }`}>
                      {explosionInfo.isExplosion ? 'EKSPLOZJA KARTEK' : 'KONTROLOWANA'}
                    </span>
                    <span className="text-[9px] text-slate-500 ml-1">
                      {explosionInfo.isExplosion ? `(${explosionInfo.strength})` : 'sędzia'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  <p className="text-[10px] text-slate-400 leading-snug font-semibold text-amber-300">
                    {explosionInfo.cardOverTip}
                  </p>
                  {explosionInfo.reasons.length > 0 && (
                    <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1">
                      {explosionInfo.reasons[0]}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Reakcja Bukmachera / Dynamiczne Kursy */}
          {(() => {
            const reactionInfo = analizujReakcjeBukmachera(match);
            
            return (
              <div className={`p-3 rounded-lg border flex flex-col justify-between ${
                reactionInfo.deviationLevel.includes('Value') 
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm shadow-emerald-950/30' 
                  : reactionInfo.deviationLevel.includes('Nadreakcja')
                  ? 'bg-indigo-950/20 border-indigo-500/40'
                  : 'bg-slate-950 border-slate-900'
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Odchylenie Kursów</span>
                    <span className={`text-[9px] font-bold px-1.5 rounded ${
                      reactionInfo.deviationLevel.includes('Value') ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                      reactionInfo.deviationLevel.includes('Nadreakcja') ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' :
                      'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}>
                      {reactionInfo.deviationLevel}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className={`text-base font-mono font-extrabold ${
                      reactionInfo.deviationLevel.includes('Value') ? 'text-emerald-400' : reactionInfo.deviationLevel.includes('Nadreakcja') ? 'text-indigo-400' : 'text-slate-200'
                    }`}>
                      {reactionInfo.efficiencyScore}%
                    </span>
                    <span className="text-[9px] text-slate-500">odchyłu</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-snug">
                  <p>{reactionInfo.description}</p>
                  {reactionInfo.valueOutcome && (
                    <strong className="block text-emerald-400 mt-1">
                      Sugerowany kierunek: {
                        reactionInfo.valueOutcome === '1' ? `Wygrana ${match.gospodarz} (1)` : 
                        reactionInfo.valueOutcome === '2' ? `Wygrana ${match.gosc} (2)` : 
                        'Remis (X)'
                      }
                    </strong>
                  )}
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </>
  );
}
