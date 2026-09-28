import React from 'react';
import { LiveMatch } from '../types';

interface MatchPitchStatsProps {
  match: LiveMatch;
}

export const MatchPitchStats: React.FC<MatchPitchStatsProps> = ({ match }) => {
  const hasPossession = typeof match.posiadaniePilki1 === 'number' || typeof match.posiadaniePilki2 === 'number';
  const possessionAway = typeof match.posiadaniePilki2 === 'number' ? match.posiadaniePilki2 : (typeof match.posiadaniePilki1 === 'number' ? 100 - match.posiadaniePilki1 : null);
  const possessionHome = typeof match.posiadaniePilki1 === 'number' ? match.posiadaniePilki1 : (possessionAway !== null ? 100 - possessionAway : null);

  const shotsOnHome = match.strzalyCelne1 ?? 0;
  const shotsOnAway = match.strzalyCelne2 ?? 0;
  const shotsTotalHome = match.strzaly1 ?? 0;
  const shotsTotalAway = match.strzaly2 ?? 0;

  // Pressure Index (szacowany na korzyść drużyny z wyższą liczbą goli/strzałów)
  const isHomeDominant = match.gole1 > match.gole2 || (shotsTotalHome > shotsTotalAway);
  const dominantTeam = isHomeDominant ? match.gospodarz : match.gosc;
  const pressureVal = Math.min(95, Math.max(45, 50 + (match.gole1 - match.gole2) * 12 + (shotsTotalHome - shotsTotalAway) * 2));

  // Line of stagnation (np. 1.1 / 10)
  const stagnationVal = 1.1;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* 1. Possession (Pierścień kołowy) */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <span className="text-[11px] font-medium text-slate-400">Possession</span>
        <div className="flex items-center gap-3 my-1">
          {/* Circular Donut */}
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              {hasPossession && possessionAway !== null && (
                <path
                  className="text-sky-400"
                  strokeDasharray={`${possessionAway}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              )}
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-200 font-mono">
              {hasPossession && possessionAway !== null ? `${possessionAway}%` : '--'}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-100 font-display">
              {hasPossession && possessionAway !== null ? `${possessionAway}%` : 'Brak'}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {hasPossession ? dominantTeam : 'Brak danych'}
            </div>
          </div>
        </div>
      </div>


      {/* 2. Pressure Index (Okrągły wskaźnik) */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <span className="text-[11px] font-medium text-slate-400">Pressure Index</span>
        <div className="flex items-center gap-3 my-1">
          {/* Circular Gauge */}
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-400"
                strokeDasharray={`${pressureVal}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-emerald-300 font-mono">
              {pressureVal}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-emerald-400 font-display">{pressureVal}</div>
            <div className="text-[10px] text-slate-400 truncate">{dominantTeam}</div>
          </div>
        </div>
      </div>

      {/* 3. Shots on/off Target */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <span className="text-[11px] font-medium text-slate-400">Shots on/off Target</span>
        <div className="space-y-1.5 my-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300">{shotsTotalHome}</span>
            <span className="text-[10px] text-emerald-400 font-sans font-medium flex items-center gap-1">
              ⚽ {dominantTeam.split(' ')[0]}
            </span>
            <span className="text-emerald-400 font-bold">{shotsTotalAway}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-850/80 pt-1">
            <span>{shotsOnHome} - {shotsTotalHome}</span>
            <span className="text-[9px] text-slate-500 font-sans">Celne / Wszystkie</span>
            <span className="text-slate-300">{shotsOnAway}</span>
          </div>
        </div>
      </div>

      {/* 4. Line of Stagnation */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-xl p-3.5 flex flex-col justify-between shadow-md">
        <span className="text-[11px] font-medium text-slate-400">Line of Stagnation</span>
        <div className="my-1">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-sky-400 mb-1.5">
            <span>{stagnationVal}/10</span>
            <span className="text-[10px] font-sans text-slate-500">Niski opór</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${(stagnationVal / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Wykres falowy Presji w czasie (Pressure Index Wave) - pełna szerokość pod kafelkami */}
      <div className="col-span-2 md:col-span-4 bg-[#0b131e] border border-slate-850 rounded-xl p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-400">Pressure Index Timeline</span>
          <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Momentum Peak 74'
          </span>
        </div>
        <div className="h-16 w-full relative">
          <svg viewBox="0 0 500 80" className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Siatka pozioma */}
            <line x1="0" y1="40" x2="500" y2="40" stroke="#1e293b" strokeDasharray="3 3" strokeWidth="1" />
            
            {/* Wypełnienie pod wykresem */}
            <path
              d="M 0,65 Q 60,70 120,55 T 240,60 T 340,30 T 420,20 T 500,25 L 500,80 L 0,80 Z"
              fill="url(#pressureGrad)"
            />
            
            {/* Linia fali */}
            <path
              d="M 0,65 Q 60,70 120,55 T 240,60 T 340,30 T 420,20 T 500,25"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            {/* Aktywny punkt live */}
            <line x1="420" y1="10" x2="420" y2="75" stroke="#38bdf8" strokeDasharray="2 2" strokeWidth="1" opacity="0.6" />
            <circle cx="420" cy="20" r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
};
