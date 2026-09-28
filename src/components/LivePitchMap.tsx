import React from 'react';
import { LiveMatch } from '../types';

interface LivePitchMapProps {
  match: LiveMatch;
}

export const LivePitchMap: React.FC<LivePitchMapProps> = ({ match }) => {
  const possessionAway = match.posiadaniePilki2 ?? (match.posiadaniePilki1 ? 100 - match.posiadaniePilki1 : 53);
  const isAwayLeading = match.gole2 > match.gole1;
  const isHomeLeading = match.gole1 > match.gole2;

  return (
    <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
      {/* Nagłówek sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Live Match map</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            Real-time attack-momentum indicators.
          </p>
        </div>

        {/* Wynik na żywo - Centrum tablicy */}
        <div className="flex items-center gap-3 bg-slate-950/70 border border-slate-800/80 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[150px]">
            {match.gospodarz}
          </span>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none">LIVE SCORE</span>
            <div className="bg-sky-600/90 text-white font-mono font-black text-sm px-2.5 py-0.5 rounded my-0.5 shadow-sm">
              {match.gole1} : {match.gole2}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Minuta {match.minuta}'</span>
          </div>
          <span className="text-xs font-bold text-slate-200 truncate max-w-[120px] sm:max-w-[150px]">
            {match.gosc}
          </span>
        </div>
      </div>

      {/* Wizualizacja boiska piłkarskiego 2D z wektorami taktycznymi */}
      <div className="relative w-full aspect-[2/1] min-h-[220px] max-h-[340px] bg-[#121c28] rounded-xl border border-slate-800/90 overflow-hidden shadow-inner flex items-center justify-center">
        {/* SVG Boiska Piłkarskiego z liniami i strefami */}
        <svg viewBox="0 0 800 400" className="w-full h-full select-none" preserveAspectRatio="none">
          {/* Tło murawy */}
          <rect x="0" y="0" width="800" height="400" fill="#101924" />
          
          {/* Strefa taktyczna: Środek / Kontrola gry (Niebieska) */}
          <rect x="300" y="30" width="180" height="340" fill="#1b2a3d" opacity="0.55" rx="6" />
          
          {/* Strefa taktyczna: Atak / Pole karne przeciwnika (Ciemnozielona) */}
          <rect x="520" y="30" width="250" height="340" fill="#132c22" opacity="0.65" rx="6" />

          {/* Etykieta strefy ATTACK */}
          <rect x="580" y="40" width="80" height="22" rx="4" fill="#1e3a2f" opacity="0.9" />
          <text x="620" y="55" fill="#34d399" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="1">ATTACK</text>

          {/* Linie boiska - białe / szare półprzezroczyste */}
          {/* Zewnętrzna obwódka */}
          <rect x="30" y="30" width="740" height="340" fill="none" stroke="#475569" strokeWidth="2.5" rx="4" opacity="0.75" />
          
          {/* Linia środkowa */}
          <line x1="400" y1="30" x2="400" y2="370" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          
          {/* Koło środkowe */}
          <circle cx="400" cy="200" r="60" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          <circle cx="400" cy="200" r="3.5" fill="#475569" opacity="0.75" />

          {/* Pole karne po lewej (Gospodarze) */}
          <rect x="30" y="100" width="110" height="200" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          <rect x="30" y="145" width="45" height="110" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          <circle cx="105" cy="200" r="3" fill="#475569" opacity="0.75" />
          <path d="M 140,150 A 60,60 0 0,1 140,250" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />

          {/* Pole karne po prawej (Goście / Strefa atakowana) */}
          <rect x="660" y="100" width="110" height="200" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          <rect x="725" y="145" width="45" height="110" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
          <circle cx="695" cy="200" r="3" fill="#475569" opacity="0.75" />
          <path d="M 660,150 A 60,60 0 0,0 660,250" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />

          {/* Łuki narożne */}
          <path d="M 30,45 A 15,15 0 0,0 45,30" fill="none" stroke="#475569" strokeWidth="2" opacity="0.7" />
          <path d="M 30,355 A 15,15 0 0,1 45,370" fill="none" stroke="#475569" strokeWidth="2" opacity="0.7" />
          <path d="M 770,45 A 15,15 0 0,1 755,30" fill="none" stroke="#475569" strokeWidth="2" opacity="0.7" />
          <path d="M 770,355 A 15,15 0 0,0 755,370" fill="none" stroke="#475569" strokeWidth="2" opacity="0.7" />

          {/* PUNKTY ZAWODNIKÓW NA ŻYWO (Tactical Nodes) */}
          {/* Formacja niebieska (Obrońcy / Pomocnicy) */}
          <circle cx="340" cy="180" r="5" fill="#38bdf8" />
          <circle cx="370" cy="170" r="5.5" fill="#38bdf8" />
          <circle cx="355" cy="210" r="5" fill="#38bdf8" />
          <circle cx="380" cy="235" r="5" fill="#38bdf8" />
          
          {/* Formacja zielona (Atakujący lider) */}
          <circle cx="430" cy="195" r="6" fill="#4ade80" />
          <circle cx="485" cy="180" r="6" fill="#4ade80" />
          <circle cx="510" cy="215" r="6" fill="#4ade80" />

          {/* Wektor naporu i szerokości akcji: Podwójna zielona strzałka wertykalna */}
          <g transform="translate(550, 140)">
            <line x1="0" y1="15" x2="0" y2="105" stroke="#22c55e" strokeWidth="3" strokeDasharray="3 3" />
            <polygon points="0,0 -7,15 7,15" fill="#22c55e" />
            <polygon points="0,120 -7,105 7,105" fill="#22c55e" />
          </g>

          {/* Piłka nożna z pulsującą aureolą w strefie bramkowej */}
          <g transform="translate(680, 195)">
            <circle cx="0" cy="0" r="14" fill="#22c55e" opacity="0.2" className="animate-ping" />
            <circle cx="0" cy="0" r="9" fill="#10b981" opacity="0.4" />
            <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="2" fill="#0f172a" />
          </g>
        </svg>

        {/* Etykiety drużyn na murawie */}
        <div className="absolute left-6 bottom-3 text-[10px] text-sky-400/80 font-bold tracking-wider uppercase bg-slate-950/60 px-2 py-0.5 rounded border border-sky-900/40">
          ◀ {match.gospodarz}
        </div>
        <div className="absolute right-6 bottom-3 text-[10px] text-emerald-400/90 font-bold tracking-wider uppercase bg-slate-950/60 px-2 py-0.5 rounded border border-emerald-900/40">
          {match.gosc} (Atak) ▶
        </div>
      </div>
    </div>
  );
};
