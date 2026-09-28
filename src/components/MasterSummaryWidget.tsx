import React, { useState, useEffect } from 'react';
import { LiveMatch, BankrollSettings } from '../types';
import { obliczStawke, pobierz_i_opisz_staty, przelicz_prawdopodobienstwa, wygladz_prawdopodobienstwa, uzyskaj_pre_match_proby } from '../utils/bettingCalc';
import { 
  Zap, TrendingUp, ShieldCheck, DollarSign, 
  Clock, Edit3, Sparkles, CheckCircle2
} from 'lucide-react';

interface MasterSummaryWidgetProps {
  match: LiveMatch;
  bankrollSettings: BankrollSettings;
  matches: LiveMatch[];
  onUpdateMatch: (updated: LiveMatch) => void;
  onOpenEditModal: (match: LiveMatch) => void;
  onTriggerAiAnalysis?: (matchId: string) => void;
  isAiLoading?: boolean;
}

export const MasterSummaryWidget: React.FC<MasterSummaryWidgetProps> = ({
  match,
  bankrollSettings,
  matches,
  onUpdateMatch,
  onOpenEditModal,
  onTriggerAiAnalysis,
  isAiLoading = false,
}) => {
  const {
    gospodarz,
    gosc,
    gole1,
    gole2,
    minuta,
    kurs1,
    kurs_x,
    kurs2,
    typZalecany,
    kursZalecany,
    evZalecane,
    betPlaced,
  } = match;

  // Stany lokalne (string) pozwalające na swobodne pisanie z klawiatury (backspace, przecinek, kropka)
  const [localMinuta, setLocalMinuta] = useState<string>(String(minuta));
  const [localGole1, setLocalGole1] = useState<string>(String(gole1));
  const [localGole2, setLocalGole2] = useState<string>(String(gole2));
  const [localKurs1, setLocalKurs1] = useState<string>(String(kurs1));
  const [localKursX, setLocalKursX] = useState<string>(String(kurs_x));
  const [localKurs2, setLocalKurs2] = useState<string>(String(kurs2));

  // Synchronizacja przy zmianie meczu lub aktualizacji zewnętrznej
  useEffect(() => {
    setLocalMinuta(String(minuta));
    setLocalGole1(String(gole1));
    setLocalGole2(String(gole2));
    setLocalKurs1(String(kurs1));
    setLocalKursX(String(kurs_x));
    setLocalKurs2(String(kurs2));
  }, [match.id, minuta, gole1, gole2, kurs1, kurs_x, kurs2]);

  // 1. OBLICZANIE REALNEGO SALDA KAPITAŁOWEGO (Domyślnie 50 PLN budżet startowy)
  let currentBalance = bankrollSettings.initial || 50.00;
  try {
    const resolved = matches.filter(m => m.id !== match.id && (m.status === 'wygrany' || m.status === 'przegrany'));
    resolved.forEach(m => {
      const odd = m.kursZalecany || 1.8;
      const stake = typeof m.betPlaced?.stake === 'number' && m.betPlaced.stake > 0 
        ? m.betPlaced.stake 
        : Math.min(currentBalance, 5.00);
      if (m.status === 'wygrany') {
        currentBalance += stake * (odd - 1);
      } else if (m.status === 'przegrany') {
        currentBalance -= stake;
      }
    });
  } catch (e) {
    console.error('Błąd wyliczania salda w MasterSummary:', e);
  }
  currentBalance = Math.max(1, Math.round(currentBalance * 100) / 100);

  // 2. REKOMENDOWANY TYP, KURS & STAWKA ZGODNE Z REALNYM KAPITAŁEM 50 PLN
  const bestOdd = kursZalecany || (
    kurs2 < kurs1 ? kurs2 : kurs1
  ) || 2.0;
  const bestEv = evZalecane ?? 0.045;
  const evPercent = (bestEv * 100).toFixed(1);

  // Stawka wyliczona matematycznie
  const calcStake = obliczStawke(
    bankrollSettings.strategy,
    bankrollSettings.parameter,
    currentBalance,
    bestOdd,
    bestEv,
    match.confidenceDiscount
  );
  // Ścisłe ograniczenie stawki do budżetu
  const activeStake = betPlaced?.stake 
    ? betPlaced.stake 
    : Math.min(currentBalance, Math.max(1, calcStake > 0 ? calcStake : Math.round(currentBalance * 0.05 * 100) / 100));

  // 3. LOGICZNA KALKULACJA CASHOUTU W PLN (ŚCIŚLE POWIĄZANA Z 50 PLN BUDŻETEM)
  const entryOdd = betPlaced?.odd || bestOdd;
  const potentialWinPLN = Math.round(activeStake * entryOdd * 100) / 100;

  let isCurrentlyWinning = false;
  const recommendedTitle = typZalecany || (kurs2 < kurs1 ? `${gosc} (DNB / 2)` : `${gospodarz} (DNB / 1)`);

  if (recommendedTitle.includes(gospodarz) && gole1 > gole2) isCurrentlyWinning = true;
  else if (recommendedTitle.includes(gosc) && gole2 > gole1) isCurrentlyWinning = true;
  else if (recommendedTitle.includes('Remis') && gole1 === gole2) isCurrentlyWinning = true;

  const currentLiveOdd = recommendedTitle.includes(gosc) ? kurs2 : recommendedTitle.includes(gospodarz) ? kurs1 : kurs_x;

  let cashoutValuePLN = 0;
  if (isCurrentlyWinning) {
    const timeProgress = Math.min(1, Math.max(0, (minuta - 1) / 89));
    const oddsRatio = Math.min(1.0, entryOdd / Math.max(1.01, currentLiveOdd));
    const winBonus = (potentialWinPLN - activeStake) * (0.45 + 0.50 * timeProgress) * oddsRatio;
    const rawCashout = activeStake + winBonus;
    cashoutValuePLN = Math.min(potentialWinPLN * 0.98, Math.max(activeStake * 0.9, Math.round(rawCashout * 100) / 100));
  } else if (gole1 === gole2) {
    const decay = Math.max(0.15, 0.85 - (minuta / 90) * 0.70);
    cashoutValuePLN = Math.round(activeStake * decay * 100) / 100;
  } else {
    const stopLoss = Math.max(0.05, 0.30 - (minuta / 90) * 0.25);
    cashoutValuePLN = Math.round(activeStake * stopLoss * 100) / 100;
  }

  // 4. OCENA STREFY ZŁOTEGO OKNA I RYZYKA
  const isGoldenWindowActive = minuta >= 60 && minuta <= 78;
  const isGoldenWindowUpcoming = minuta < 60;

  // Statystyki presji
  const preProbs = uzyskaj_pre_match_proby(match);
  const fairProbs = wygladz_prawdopodobienstwa(
    gospodarz, gosc, gole1, gole2, minuta,
    preProbs.p1, preProbs.px, preProbs.p2,
    match.czerwoneKartki1, match.czerwoneKartki2,
    match.strzaly1, match.strzaly2,
    match.strzalyCelne1, match.strzalyCelne2
  );
  const stats = pobierz_i_opisz_staty(
    gospodarz, gosc, gole1, gole2, minuta,
    fairProbs.p1, fairProbs.px, fairProbs.p2,
    match.strzaly1, match.strzaly2,
    match.strzalyCelne1, match.strzalyCelne2
  );

  // Poziom ryzyka
  let riskLevel: 'NISKIE' | 'ŚREDNIE' | 'WYSOKIE' = 'ŚREDNIE';
  let riskBadgeColor = 'bg-amber-950/60 text-amber-300 border-amber-800/80';
  if (stats.stagnationLine < 3.8 && (match.strzalyCelne1 || 0) + (match.strzalyCelne2 || 0) > 3) {
    riskLevel = 'NISKIE';
    riskBadgeColor = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80';
  } else if (minuta > 80 || stats.stagnationLine > 6.5) {
    riskLevel = 'WYSOKIE';
    riskBadgeColor = 'bg-rose-950/60 text-rose-300 border-rose-800/80';
  }

  // --- OBSŁUGA OBSZARÓW SWOBODNEGO WPISYWANIA Z KLAWIATURY ---
  const handleMinuteType = (valStr: string) => {
    setLocalMinuta(valStr);
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 1 && val <= 120) {
      onUpdateMatch({ ...match, minuta: val });
    }
  };

  const handleQuickMinuteDelta = (delta: number) => {
    const newMin = Math.min(120, Math.max(1, minuta + delta));
    setLocalMinuta(String(newMin));
    onUpdateMatch({ ...match, minuta: newMin });
  };

  const handleScoreType = (team: 'gole1' | 'gole2', valStr: string) => {
    if (team === 'gole1') setLocalGole1(valStr);
    else setLocalGole2(valStr);

    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateMatch({ ...match, [team]: val });
    }
  };

  const handleQuickScoreDelta = (team: 'gole1' | 'gole2', delta: number) => {
    const current = team === 'gole1' ? gole1 : gole2;
    const val = Math.max(0, current + delta);
    if (team === 'gole1') setLocalGole1(String(val));
    else setLocalGole2(String(val));
    onUpdateMatch({ ...match, [team]: val });
  };

  const handleOddsType = (field: 'kurs1' | 'kurs_x' | 'kurs2', valStr: string, setter: (v: string) => void) => {
    setter(valStr);
    const normalized = valStr.replace(',', '.');
    const val = parseFloat(normalized);
    if (!isNaN(val) && val >= 1.01) {
      onUpdateMatch({ ...match, [field]: val });
    }
  };

  const handlePlaceBetQuick = () => {
    onUpdateMatch({
      ...match,
      betPlaced: {
        outcome: gole2 > gole1 ? '2' : gole1 > gole2 ? '1' : 'X',
        odd: bestOdd,
        stake: activeStake,
        dataPlaced: new Date().toISOString()
      },
      isLocked: true
    });
  };

  return (
    <div className="bg-gradient-to-br from-[#0c1827] via-[#09121f] to-[#060b13] border-2 border-sky-500/60 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(14,165,233,0.15)] relative overflow-hidden space-y-4">
      {/* Tło ozdobne */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* 1. SEKCJA GŁÓWNEJ REKOMENDACJI GEMINI (MASTER SUMMARY HEADER) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md shadow-sm shrink-0">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30 shrink-0" />
              <span>GŁÓWNA REKOMENDACJA AI</span>
            </span>

            {isGoldenWindowActive ? (
              <span className="bg-emerald-950/80 border border-emerald-500 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse shrink-0">
                ⚡ ZŁOTE OKNO AKTYWNE (65'-75')
              </span>
            ) : isGoldenWindowUpcoming ? (
              <span className="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0">
                ⏳ Oczekiwanie na Złote Okno (65')
              </span>
            ) : (
              <span className="bg-amber-950/60 border border-amber-800/80 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0">
                ⚠️ Końcówka meczu (Late Game)
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-100 flex items-center gap-2 min-w-0 truncate">
              <span className="truncate">{recommendedTitle}</span>
              <span className="text-emerald-400 font-mono font-black text-sm shrink-0">@{bestOdd.toFixed(2)}</span>
            </h2>
            <span className="text-xs text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60 font-mono shrink-0">
              + {evPercent}% EV
            </span>
          </div>
          <p className="text-xs text-slate-400 font-sans">
            Budżet startowy: <strong className="text-slate-200 font-mono">{currentBalance.toFixed(2)} PLN</strong> | Sugerowana stawka: <strong className="text-emerald-300 font-mono">{activeStake.toFixed(2)} PLN</strong>
          </p>
        </div>

        {/* Akcje AI & Zakład */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-auto">
          {betPlaced ? (
            <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-700/80 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <span className="block text-[9px] text-emerald-400 uppercase font-bold">Zakład Postawiony</span>
                <span className="text-xs font-mono font-bold text-white">{betPlaced.stake} PLN @{betPlaced.odd}</span>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePlaceBetQuick}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/60 active:scale-95 shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Postaw {activeStake.toFixed(2)} PLN</span>
            </button>
          )}

          {onTriggerAiAnalysis && (
            <button
              type="button"
              onClick={() => onTriggerAiAnalysis(match.id)}
              disabled={isAiLoading}
              className="px-3.5 py-2 bg-sky-950/80 hover:bg-sky-900 border border-sky-700/80 text-sky-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
            >
              <Sparkles className={`w-3.5 h-3.5 text-sky-400 ${isAiLoading ? 'animate-spin' : ''}`} />
              <span>{isAiLoading ? 'Analizuję...' : 'Analiza AI'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenEditModal(match)}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 rounded-xl transition cursor-pointer shrink-0"
            title="Pełny formularz edycji meczu"
          >
            <Edit3 className="w-4 h-4 text-sky-400" />
          </button>
        </div>
      </div>

      {/* 2. SIATKA KLUCZOWYCH WSKAŹNIKÓW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Poziom Ryzyka</span>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border ${riskBadgeColor}`}>
              {riskLevel}
            </span>
            <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Presja & Momentum</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-sky-400 truncate">
              {stats.description || 'Zbalansowany przebieg'}
            </span>
            <TrendingUp className="w-4 h-4 text-sky-400 shrink-0" />
          </div>
        </div>

        <div className="bg-slate-950/80 border border-emerald-900/50 rounded-xl p-2.5">
          <span className="block text-[10px] text-emerald-400 uppercase font-bold mb-1">Wyliczony Cashout</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-black text-emerald-300">
              {cashoutValuePLN.toFixed(2)} PLN
            </span>
            <span className="text-[9px] font-mono text-slate-400 shrink-0">
              / max {potentialWinPLN.toFixed(2)} zł
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5">
          <span className="block text-[10px] text-slate-400 uppercase font-bold mb-1">Kapitał Użytkownika</span>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400">
              {currentBalance.toFixed(2)} PLN
            </span>
            <DollarSign className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* 3. WBUDOWANA SZYBKA EDYCJA MECZU - SWOBODNE WPISYWANIE MINUTY, WYNIKU I KURSÓW Z KLAWIATURY (BEZ SUWAKÓW) */}
      <div className="bg-[#0b1420] border border-slate-800 rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Szybka edycja na żywo (Ręczne wpisywanie z klawiatury):</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
            Bez suwaków - wpisz minutę / gole / kursy bezpośrednio
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
          {/* Szybki Wynik Gospodarz */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate flex-1 min-w-0" title={gospodarz}>{gospodarz}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickScoreDelta('gole1', -1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="20"
                value={localGole1}
                onChange={(e) => handleScoreType('gole1', e.target.value)}
                className="w-10 bg-slate-900 border border-slate-700 rounded py-0.5 text-center text-xs font-bold font-mono text-emerald-400 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => handleQuickScoreDelta('gole1', 1)}
                className="w-5 h-5 rounded bg-sky-900 hover:bg-sky-800 text-sky-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Swobodna Minuta (Jednolity Input Liczbowy) */}
          <div className="flex items-center justify-between bg-slate-950 border border-emerald-900/60 px-2.5 py-1.5 rounded-lg gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-400">Minuta':</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickMinuteDelta(-1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] flex items-center justify-center cursor-pointer shrink-0"
                title="-1 min"
              >
                -1
              </button>
              <input
                type="number"
                min="1"
                max="120"
                value={localMinuta}
                onChange={(e) => handleMinuteType(e.target.value)}
                className="w-14 bg-slate-900 border border-emerald-500/50 rounded py-0.5 text-center text-xs font-bold font-mono text-emerald-400 outline-none focus:border-emerald-400"
                placeholder="75"
              />
              <button
                type="button"
                onClick={() => handleQuickMinuteDelta(1)}
                className="w-5 h-5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-mono text-[10px] flex items-center justify-center cursor-pointer shrink-0"
                title="+1 min"
              >
                +1
              </button>
            </div>
          </div>

          {/* Szybki Wynik Gość */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-lg gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate flex-1 min-w-0" title={gosc}>{gosc}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickScoreDelta('gole2', -1)}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="20"
                value={localGole2}
                onChange={(e) => handleScoreType('gole2', e.target.value)}
                className="w-10 bg-slate-900 border border-slate-700 rounded py-0.5 text-center text-xs font-bold font-mono text-emerald-400 outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => handleQuickScoreDelta('gole2', 1)}
                className="w-5 h-5 rounded bg-sky-900 hover:bg-sky-800 text-sky-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Szybka edycja kursów 1X2 - STANDARDOWE POLA TEKSTOWE / LICZBOWE BEZ SUWAKÓW */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">Kurs 1:</span>
            <input
              type="text"
              inputMode="decimal"
              value={localKurs1}
              onChange={(e) => handleOddsType('kurs1', e.target.value, setLocalKurs1)}
              placeholder="2.00"
              className="w-16 bg-transparent text-right text-xs font-mono font-bold text-slate-100 outline-none focus:text-sky-400"
            />
          </div>
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">Kurs X:</span>
            <input
              type="text"
              inputMode="decimal"
              value={localKursX}
              onChange={(e) => handleOddsType('kurs_x', e.target.value, setLocalKursX)}
              placeholder="3.10"
              className="w-16 bg-transparent text-right text-xs font-mono font-bold text-slate-100 outline-none focus:text-sky-400"
            />
          </div>
          <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-2 py-1 rounded-md">
            <span className="text-[10px] text-slate-400 font-bold shrink-0">Kurs 2:</span>
            <input
              type="text"
              inputMode="decimal"
              value={localKurs2}
              onChange={(e) => handleOddsType('kurs2', e.target.value, setLocalKurs2)}
              placeholder="3.20"
              className="w-16 bg-transparent text-right text-xs font-mono font-bold text-slate-100 outline-none focus:text-sky-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
