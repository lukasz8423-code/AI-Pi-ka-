import React, { useState } from 'react';
import { LiveMatch, BankrollSettings } from '../types';
import { obliczStawke } from '../utils/bettingCalc';
import { Zap, CheckCircle2, TrendingUp } from 'lucide-react';

interface GoldenBettingHeroProps {
  match: LiveMatch;
  bankrollSettings: BankrollSettings;
  matches: LiveMatch[];
  onUpdateMatch: (updated: LiveMatch) => void;
}

export const GoldenBettingHero: React.FC<GoldenBettingHeroProps> = ({
  match,
  bankrollSettings,
  matches,
  onUpdateMatch,
}) => {
  const [justPlaced, setJustPlaced] = useState(false);

  // Obliczenie aktualnego salda bankrollu
  let currentBalance = bankrollSettings.initial;
  try {
    const resolved = matches.filter(m => m.id !== match.id && (m.status === 'wygrany' || m.status === 'przegrany'));
    resolved.forEach(m => {
      const odd = m.kursZalecany || 1.8;
      const stake = m.betPlaced?.stake ?? 100;
      if (m.status === 'wygrany') {
        currentBalance += stake * (odd - 1);
      } else if (m.status === 'przegrany') {
        currentBalance -= stake;
      }
    });
  } catch (e) {
    console.error('Błąd liczenia salda:', e);
  }

  // Rekomendowany kurs i EV
  const odd = match.kursZalecany ?? match.kurs2 ?? 1.28;
  const ev = match.evZalecane ?? 0.022;
  const evPercent = (ev * 100).toFixed(1);

  // Obliczona stawka (np. 20 PLN)
  const calculatedStake = obliczStawke(
    bankrollSettings.strategy,
    bankrollSettings.parameter,
    currentBalance,
    odd,
    ev,
    match.confidenceDiscount
  );
  const displayStake = calculatedStake > 0 ? calculatedStake : 20;

  // Zalecany typ (np. DNB 2 lub Zwycięstwo)
  const tipTitle = match.typZalecany || 'Remis Bez Zakładu: DNB 2';

  // Analiza tekstowa
  const analysisText = match.notatki ||
    'Lider kontroluje grę, stagnacja przeciwnika wysoka. Przeciwnik nie wykazuje chęci ataku. Ryzyko straty gola znikome.';

  const handlePlaceBet = () => {
    const outcomeVal: '1' | 'X' | '2' = match.gole2 > match.gole1 ? '2' : match.gole1 > match.gole2 ? '1' : 'X';
    const updated: LiveMatch = {
      ...match,
      betPlaced: {
        outcome: outcomeVal,
        odd: odd,
        stake: displayStake,
        dataPlaced: new Date().toISOString()
      },
      typZalecany: tipTitle,
      kursZalecany: odd,
      evZalecane: ev,
      isLocked: true
    };
    onUpdateMatch(updated);
    setJustPlaced(true);
    setTimeout(() => setJustPlaced(false), 3000);
  };

  const isBetPlaced = Boolean(match.betPlaced);

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#142820] to-[#0c1914] border-2 border-amber-400/90 shadow-[0_0_35px_rgba(245,158,11,0.28)] ring-1 ring-amber-400/40 p-5 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Blask w tle */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div>
        {/* Nagłówek Złotego Okna */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-extrabold text-sm sm:text-base tracking-wider uppercase drop-shadow-sm flex items-center gap-1.5">
              ⚡ ZŁOTE OKNO OBSTAWIANIA
            </span>
          </div>
          <span className="text-[10px] text-amber-300/80 font-mono bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded-full">
            MINUTA {match.minuta}'
          </span>
        </div>

        {/* Sugerowany typ + Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs sm:text-sm text-slate-200">
            Sugerowany typ: <strong className="text-white font-bold">{tipTitle}</strong>
          </div>
          <span className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-bold px-2.5 py-0.5 rounded-md shadow-sm">
            <TrendingUp className="w-3 h-3" />
            VALUE BET ({evPercent}% EV)
          </span>
        </div>

        {/* Panel z komentarzem / analizą taktyczną */}
        <div className="bg-[#0b1713]/90 border border-emerald-900/50 rounded-xl p-3.5 mb-4 text-xs text-slate-300 leading-relaxed shadow-inner">
          <p className="line-clamp-3 font-sans">
            <strong className="text-emerald-400 font-semibold">Analiza: </strong>
            {analysisText}
          </p>
        </div>

        {/* Trójkolumna z kursami STS / Live */}
        <div className="grid grid-cols-3 gap-2 bg-[#091310]/80 border border-emerald-950 rounded-xl p-2.5 mb-4 text-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Gospodarz (1)</span>
            <span className="text-xs font-mono font-bold text-slate-200">@{match.kurs1?.toFixed(2) || '3.98'}</span>
          </div>
          <div className="flex flex-col border-x border-slate-800">
            <span className="text-[10px] text-slate-400">Remis (X)</span>
            <span className="text-xs font-mono font-bold text-slate-200">@{match.kurs_x?.toFixed(2) || '3.10'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-emerald-400 font-semibold">Gość (2)</span>
            <span className="text-xs font-mono font-black text-emerald-400">@{odd.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Przycisk akcji: Zatwierdź i Postaw */}
      <div>
        {isBetPlaced ? (
          <div className="w-full py-3 px-4 bg-emerald-950/80 border border-emerald-600 rounded-xl text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zakład zawarty: {match.betPlaced?.stake} PLN @{match.betPlaced?.odd}</span>
          </div>
        ) : (
          <button
            onClick={handlePlaceBet}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-slate-950 fill-slate-950" />
            <span>Zatwierdź i Postaw sugerowany zakład ({displayStake} PLN)</span>
          </button>
        )}

        {justPlaced && (
          <div className="text-center text-[11px] text-emerald-400 mt-2 font-medium animate-fadeIn">
            ✓ Pomyślnie zarejestrowano zakład w bilansie bankrollu!
          </div>
        )}
      </div>
    </div>
  );
};
