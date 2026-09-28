import React from 'react';
import { LiveMatch } from '../types';
import { Trash2, Edit3, Radio, Activity, Plus } from 'lucide-react';

interface LivePitchMapProps {
  match: LiveMatch;
  onDeleteMatch?: (id: string) => void;
  onEditMatch?: (match: LiveMatch) => void;
}

export const LivePitchMap: React.FC<LivePitchMapProps> = ({ match, onDeleteMatch, onEditMatch }) => {
  // Sprawdzamy czy mecz posiada rzeczywiste statystyki taktyczne
  const hasRealStats = Boolean(
    (match.strzaly1 !== undefined && match.strzaly1 > 0) ||
    (match.strzaly2 !== undefined && match.strzaly2 > 0) ||
    (match.strzalyCelne1 !== undefined && match.strzalyCelne1 > 0) ||
    (match.strzalyCelne2 !== undefined && match.strzalyCelne2 > 0) ||
    (typeof match.posiadaniePilki1 === 'number' && match.posiadaniePilki1 > 0) ||
    (match.gole1 > 0 || match.gole2 > 0)
  );

  const homeShots = match.strzaly1 ?? 0;
  const awayShots = match.strzaly2 ?? 0;
  const homePossession = match.posiadaniePilki1 ?? 50;
  const awayPossession = match.posiadaniePilki2 ?? (100 - homePossession);

  const isAwayAttacking = awayShots > homeShots || match.gole2 > match.gole1 || awayPossession > homePossession;

  return (
    <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
      {/* Nagłówek sekcji z zabezpieczonym, spójnym layoutem */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-850">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${hasRealStats ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
            <span className={`text-xs font-semibold tracking-wide uppercase ${hasRealStats ? 'text-emerald-400' : 'text-slate-400'}`}>
              {hasRealStats ? 'Live Match Map (Aktywna)' : 'Live Match Map (Standby)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
            {hasRealStats 
              ? 'Wskaźniki naporu taktycznego i kierunku gry w czasie rzeczywistym.' 
              : 'Oczekiwanie na wprowadzenie statystyk lub danych meczowych.'}
          </p>
        </div>

        {/* Bezpieczny kafelek z wynikiem i przyciskami edycji */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 bg-slate-950/90 border border-slate-800 px-3.5 py-2 rounded-xl shrink-0 shadow-sm">
          <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-[120px] text-right">
            {match.gospodarz}
          </span>

          <div className="flex flex-col items-center shrink-0 px-2 min-w-[60px]">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none">LIVE</span>
            <div className="bg-sky-600 text-white font-mono font-black text-xs sm:text-sm px-2 py-0.5 rounded my-0.5 shadow-sm shrink-0">
              {match.gole1} : {match.gole2}
            </div>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">Minuta {match.minuta}'</span>
          </div>

          <span className="text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-[120px] text-left">
            {match.gosc}
          </span>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2 ml-1 shrink-0">
            {onEditMatch && (
              <button
                type="button"
                onClick={() => onEditMatch(match)}
                className="p-1.5 text-sky-400 hover:text-sky-200 hover:bg-sky-950/60 rounded-lg transition-all cursor-pointer border border-sky-800/40"
                title="Edytuj wynik, minutę, kursy i statystyki meczu"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {onDeleteMatch && (
              <button
                type="button"
                onClick={() => onDeleteMatch(match.id)}
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer"
                title="Usuń ten mecz z listy"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wizualizacja boiska piłkarskiego 2D z wektorami taktycznymi lub stan uśpienia */}
      <div className="relative w-full aspect-[2/1] min-h-[220px] max-h-[340px] bg-[#121c28] rounded-xl border border-slate-800/90 overflow-hidden shadow-inner flex items-center justify-center">
        {hasRealStats ? (
          /* AKTYWNA MAPA TAKTYCZNA */
          <svg viewBox="0 0 800 400" className="w-full h-full select-none" preserveAspectRatio="none">
            {/* Tło murawy */}
            <rect x="0" y="0" width="800" height="400" fill="#101924" />
            
            {/* Strefa taktyczna: Środek / Kontrola gry */}
            <rect x="300" y="30" width="180" height="340" fill="#1b2a3d" opacity="0.55" rx="6" />
            
            {/* Strefa taktyczna: Atak / Strefa bramkowa */}
            <rect 
              x={isAwayAttacking ? 520 : 60} 
              y="30" 
              width="250" 
              height="340" 
              fill="#132c22" 
              opacity="0.65" 
              rx="6" 
            />

            {/* Etykieta strefy ATTACK */}
            <rect x={isAwayAttacking ? 580 : 120} y="40" width="80" height="22" rx="4" fill="#1e3a2f" opacity="0.9" />
            <text 
              x={isAwayAttacking ? 620 : 160} 
              y="55" 
              fill="#34d399" 
              fontSize="11" 
              fontWeight="bold" 
              textAnchor="middle" 
              letterSpacing="1"
            >
              ATTACK
            </text>

            {/* Linie boiska */}
            <rect x="30" y="30" width="740" height="340" fill="none" stroke="#475569" strokeWidth="2.5" rx="4" opacity="0.75" />
            <line x1="400" y1="30" x2="400" y2="370" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
            <circle cx="400" cy="200" r="60" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
            <circle cx="400" cy="200" r="3.5" fill="#475569" opacity="0.75" />

            {/* Pole karne po lewej */}
            <rect x="30" y="100" width="110" height="200" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
            <rect x="30" y="145" width="45" height="110" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />
            <circle cx="105" cy="200" r="3" fill="#475569" opacity="0.75" />
            <path d="M 140,150 A 60,60 0 0,1 140,250" fill="none" stroke="#475569" strokeWidth="2.5" opacity="0.75" />

            {/* Pole karne po prawej */}
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
            {/* Formacja gospodarzy */}
            <circle cx="280" cy="160" r="5" fill="#38bdf8" />
            <circle cx="330" cy="180" r="5.5" fill="#38bdf8" />
            <circle cx="310" cy="230" r="5" fill="#38bdf8" />
            <circle cx="360" cy="210" r="5" fill="#38bdf8" />
            
            {/* Formacja gości */}
            <circle cx="450" cy="190" r="6" fill="#4ade80" />
            <circle cx="495" cy="175" r="6" fill="#4ade80" />
            <circle cx="525" cy="220" r="6" fill="#4ade80" />

            {/* Wektor naporu */}
            <g transform={isAwayAttacking ? "translate(555, 140)" : "translate(220, 140)"}>
              <line x1="0" y1="15" x2="0" y2="105" stroke="#22c55e" strokeWidth="3" strokeDasharray="3 3" />
              <polygon points="0,0 -7,15 7,15" fill="#22c55e" />
              <polygon points="0,120 -7,105 7,105" fill="#22c55e" />
            </g>

            {/* Piłka nożna w strefie zagrożenia bramkowego */}
            <g transform={isAwayAttacking ? "translate(680, 195)" : "translate(120, 195)"}>
              <circle cx="0" cy="0" r="14" fill="#22c55e" opacity="0.2" className="animate-ping" />
              <circle cx="0" cy="0" r="9" fill="#10b981" opacity="0.4" />
              <circle cx="0" cy="0" r="6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
              <circle cx="0" cy="0" r="2" fill="#0f172a" />
            </g>
          </svg>
        ) : (
          /* STAN STANDBY (BRAK DANYCH STATYSTYCZNYCH) */
          <div className="absolute inset-0 bg-[#0c141f]/95 flex flex-col items-center justify-center p-6 text-center z-10">
            {/* Zarys boiska w tle */}
            <svg viewBox="0 0 800 400" className="absolute inset-0 w-full h-full opacity-15 pointer-events-none" preserveAspectRatio="none">
              <rect x="30" y="30" width="740" height="340" fill="none" stroke="#94a3b8" strokeWidth="2" rx="4" />
              <line x1="400" y1="30" x2="400" y2="370" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="400" cy="200" r="60" fill="none" stroke="#94a3b8" strokeWidth="2" />
            </svg>

            <div className="relative z-20 max-w-sm space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-lg">
                <Radio className="w-5 h-5 text-sky-400/70 animate-pulse" />
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Radar Taktyczny: Tryb Oczekiwania
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Wizualizacja wektorów ataku i stref boiska aktywuje się automatycznie po wprowadzeniu statystyk meczu (strzały, posiadanie piłki lub bramki).
                </p>
              </div>

              {onEditMatch && (
                <button
                  type="button"
                  onClick={() => onEditMatch(match)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-95 shadow-md"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Wprowadź statystyki / Edytuj mecz</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Etykiety drużyn na murawie */}
        {hasRealStats && (
          <>
            <div className="absolute left-6 bottom-3 text-[10px] text-sky-400/80 font-bold tracking-wider uppercase bg-slate-950/70 px-2 py-0.5 rounded border border-sky-900/40">
              ◀ {match.gospodarz} {homePossession ? `(${homePossession}%)` : ''}
            </div>
            <div className="absolute right-6 bottom-3 text-[10px] text-emerald-400/90 font-bold tracking-wider uppercase bg-slate-950/70 px-2 py-0.5 rounded border border-emerald-900/40">
              {match.gosc} {awayPossession ? `(${awayPossession}%)` : ''} ▶
            </div>
          </>
        )}
      </div>
    </div>
  );
};
