import React from 'react';
import { LiveMatch } from '../types';
import { ocenOptymalneWejscie } from '../utils/bettingCalc';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Flame, ArrowRight } from 'lucide-react';

interface GoldenTimingPanelProps {
  match: LiveMatch;
}

export function GoldenTimingPanel({ match }: GoldenTimingPanelProps) {
  const assessment = ocenOptymalneWejscie(match);

  // Styling helper based on status
  const getStatusStyles = () => {
    switch (assessment.status) {
      case 'IDEALNY':
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/30',
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          text: 'text-emerald-400',
          iconColor: 'text-emerald-400',
          pulse: 'bg-emerald-500',
          progressBg: 'bg-emerald-500',
          accentBorder: 'border-l-4 border-l-emerald-500'
        };
      case 'DOBRY':
        return {
          bg: 'bg-cyan-950/30 border-cyan-500/20',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          text: 'text-cyan-400',
          iconColor: 'text-cyan-400',
          pulse: 'bg-cyan-500',
          progressBg: 'bg-cyan-500',
          accentBorder: 'border-l-4 border-l-cyan-500'
        };
      case 'POCZEKAJ':
        return {
          bg: 'bg-amber-950/20 border-amber-500/20',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          text: 'text-amber-400',
          iconColor: 'text-amber-400',
          pulse: 'bg-amber-500',
          progressBg: 'bg-amber-500',
          accentBorder: 'border-l-4 border-l-amber-500'
        };
      case 'RYZYKOWNY':
        return {
          bg: 'bg-orange-950/25 border-orange-500/20',
          badge: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          text: 'text-orange-400',
          iconColor: 'text-orange-400',
          pulse: 'bg-orange-500',
          progressBg: 'bg-orange-500',
          accentBorder: 'border-l-4 border-l-orange-500'
        };
      case 'PRZEKROCZONY':
      default:
        return {
          bg: 'bg-slate-900 border-slate-800',
          badge: 'bg-slate-800 border-slate-700 text-slate-400',
          text: 'text-slate-300',
          iconColor: 'text-slate-400',
          pulse: 'bg-slate-600',
          progressBg: 'bg-slate-500',
          accentBorder: 'border-l-4 border-l-slate-700'
        };
    }
  };

  const styles = getStatusStyles();

  // Color helper for risk label
  const getRiskColor = (risk: string) => {
    if (risk === 'Niskie') return 'text-emerald-400 font-bold';
    if (risk === 'Umiarkowane') return 'text-amber-400 font-bold';
    return 'text-red-400 font-bold';
  };

  return (
    <div className={`rounded-xl border ${styles.bg} ${styles.accentBorder} p-4 sm:p-5 transition-all duration-300 shadow-md flex flex-col gap-4 min-w-0`} id={`timing-panel-${match.id}`}>
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <Clock className={`w-5 h-5 ${styles.iconColor}`} />
            {assessment.status === 'IDEALNY' && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${styles.pulse}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${styles.pulse}`}></span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Złote Okno Obstawiania</h3>
            <p className="text-[10px] text-slate-500 truncate">Analiza optymalnego czasu wejścia (65' - 75' minuty)</p>
          </div>
        </div>
        
        <span className={`text-[10px] sm:text-xs font-bold uppercase px-3 py-1 rounded-full border tracking-wide select-none ${styles.badge} flex items-center gap-1.5 shrink-0`}>
          {assessment.status === 'IDEALNY' && <Flame className="w-3.5 h-3.5 animate-bounce text-emerald-400" />}
          {assessment.rekomendacja}
        </span>
      </div>

      {/* Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
        {/* Lewa strona: Komunikat i opis (7 kolumn) */}
        <div className="lg:col-span-7 space-y-2.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold font-sans">Sugerowana akcja:</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-extrabold ${styles.text} flex items-center gap-1`}>
                {assessment.typSugerowany}
              </span>
            </div>
          </div>
          
          <p className="text-xs text-slate-300 leading-relaxed font-sans pr-1 sm:pr-2 break-words">
            {assessment.opis}
          </p>
        </div>

        {/* Prawa strona: Mini-Wskaźniki (5 kolumn) */}
        <div className="lg:col-span-5 bg-slate-950/50 rounded-xl p-3 border border-slate-800/40 flex flex-col gap-2.5 min-w-0">
          {/* Szansa Powodzenia */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Szansa powodzenia:</span>
              <strong className={`font-mono text-sm ${styles.text}`}>{assessment.szansaProcent}%</strong>
            </div>
            {/* Custom progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full ${styles.progressBg} transition-all duration-500`}
                style={{ width: `${assessment.szansaProcent}%` }}
              />
            </div>
          </div>

          {/* Wskaźnik Pewności (Confidence Score: Odds vs Fair Prob) */}
          {assessment.confidenceScore !== undefined && (
            <div className="space-y-1 border-t border-slate-850 pt-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <span>Wskaźnik Pewności (Edge):</span>
                </span>
                <strong className="font-mono text-xs text-emerald-400 font-bold">
                  {assessment.confidenceScore}%
                </strong>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${assessment.confidenceScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Profil Ryzyka */}
          <div className="flex justify-between items-center text-[11px] border-t border-slate-850 pt-2">
            <span className="text-slate-400 font-medium">Poziom Ryzyka:</span>
            <span className={getRiskColor(assessment.poziomRyzyka)}>{assessment.poziomRyzyka}</span>
          </div>

          {/* Strefa Czasu */}
          <div className="flex justify-between items-center text-[11px] border-t border-slate-850 pt-2">
            <span className="text-slate-400 font-medium">Bieżący czas meczu:</span>
            <span className="text-slate-300 font-mono font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              {match.minuta}' minuta
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Tip */}
      <div className="bg-slate-950/20 border border-slate-850 rounded-lg px-3 py-2 flex items-start gap-2 text-[10px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-normal font-sans">
          <strong>Dlaczego to działa?</strong> System analizuje tempo (stagnację), strzały i stan bramkowy. W przedziale <strong>65'-75' minuty</strong> ryzyko wpadki gwałtownie spada w meczach zablokowanych (wysoki under), a w meczach dynamicznych (wysoka presja) kursy na faworytów osiągają najlepsze możliwe EV.
        </p>
      </div>
    </div>
  );
}
