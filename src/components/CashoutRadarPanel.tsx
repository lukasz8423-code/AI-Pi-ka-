import React, { useState } from 'react';
import { LiveMatch } from '../types';
import { DollarSign, TrendingUp, Lock, AlertTriangle, RefreshCw, Calculator, ChevronDown, ChevronUp, CheckCircle, Flame } from 'lucide-react';
import { pobierz_i_opisz_staty, przelicz_prawdopodobienstwa, wygladz_prawdopodobienstwa, uzyskaj_pre_match_proby } from '../utils/bettingCalc';

interface CashoutRadarPanelProps {
  match: LiveMatch;
}

export const CashoutRadarPanel: React.FC<CashoutRadarPanelProps> = ({ match }) => {
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
    betPlaced,
    oddsHistory
  } = match;

  // Stany dla interaktywnego kalkulatora manualnego "Cashout Rośnie"
  const [showManualCalc, setShowManualCalc] = useState<boolean>(false);
  const [manualStake, setManualStake] = useState<number | ''>('');
  const [manualPayout, setManualPayout] = useState<number | ''>('');
  const [manualCashout, setManualCashout] = useState<number | ''>('');

  // Znajdujemy początkowy kurs zakupu z historii lub zarejestrowanego zakładu
  const initialEntry = oddsHistory && oddsHistory.length > 0 ? oddsHistory[0] : null;
  const initialOdd = betPlaced?.odd || kursZalecany || (
    typZalecany?.includes('Gospodarz') ? (initialEntry?.kurs1 || kurs1) :
    typZalecany?.includes('Gość') ? (initialEntry?.kurs2 || kurs2) :
    (initialEntry?.kurs_x || kurs_x)
  );

  // Określamy aktualny kurs live na ten sam typ
  const currentLiveOdd = 
    typZalecany?.includes('Gospodarz') ? kurs1 :
    typZalecany?.includes('Gość') ? kurs2 :
    kurs_x;

  // Czy typ obecnie "wchodzi" w danym momencie meczu?
  let isCurrentlyWinning = false;
  if (typZalecany?.includes('Gospodarz') && gole1 > gole2) isCurrentlyWinning = true;
  else if (typZalecany?.includes('Gość') && gole2 > gole1) isCurrentlyWinning = true;
  else if (typZalecany?.includes('Remis') && gole1 === gole2) isCurrentlyWinning = true;

  // Statystyki presji do oceny ryzyka late-goal
  const preProbs = uzyskaj_pre_match_proby(match);
  const fairProbs = wygladz_prawdopodobienstwa(
    gospodarz, gosc, gole1, gole2, minuta,
    preProbs.p1, preProbs.px, preProbs.p2,
    match.czerwoneKartki1, match.czerwoneKartki2,
    match.strzaly1, match.strzaly2,
    match.strzalyCelne1, match.strzalyCelne2,
    match.zolteKartki1, match.zolteKartki2
  );
  const stats = pobierz_i_opisz_staty(
    gospodarz, gosc, gole1, gole2, minuta,
    fairProbs.p1, fairProbs.px, fairProbs.p2,
    match.strzaly1, match.strzaly2,
    match.strzalyCelne1, match.strzalyCelne2,
    match.zolteKartki1, match.zolteKartki2
  );

  // Kalkulacja Szacowanej Wartości Cashoutu (% pierwotnej wygranej)
  let estimatedCashoutPct = 0;
  if (isCurrentlyWinning && currentLiveOdd > 0) {
    const rawRatio = (initialOdd / Math.max(1.01, currentLiveOdd)) * 0.92;
    const timeProgress = Math.min(1, minuta / 90);
    const timeMultiplier = 0.5 + (timeProgress * 0.5);
    estimatedCashoutPct = Math.min(98, Math.max(10, Math.round(rawRatio * timeMultiplier * 100)));
  } else {
    const ratio = (initialOdd / Math.max(currentLiveOdd, initialOdd * 1.5));
    estimatedCashoutPct = Math.min(45, Math.max(5, Math.round(ratio * 35)));
  }

  // Realistyczna stawka dostosowana do budżetu 50 PLN (domyślnie 5 PLN zamiast 100 PLN!)
  const stake = betPlaced?.stake || 5.00;
  const maxPayout = Math.round(stake * initialOdd * 100) / 100;
  const cashoutValuePLN = Math.min(maxPayout * 0.98, Math.round((maxPayout * estimatedCashoutPct) / 100 * 100) / 100);

  // Rekomendacja Cashoutu dla automatycznego radaru
  let recommendation: 'LOCK_PROFIT' | 'HOLD' | 'STOP_LOSS' | 'WAIT' = 'WAIT';
  let recTitle = 'Obserwuj sytuację';
  let recColor = 'border-slate-800 bg-slate-900/60 text-slate-300';
  let recReason = 'Wynik jeszcze się waży lub minęło zbyt mało czasu.';

  if (isCurrentlyWinning) {
    if (minuta >= 70 && estimatedCashoutPct >= 75) {
      if (stats.stagnationLine < 4.5) {
        recommendation = 'LOCK_PROFIT';
        recTitle = 'ZAMKNIJ ZAKŁAD NOW! (Zamroź Zysk 🔒)';
        recColor = 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-lg shadow-emerald-950/50';
        recReason = `Gwarantowany zysk wynoszący ok. ${estimatedCashoutPct}% wygranej (${cashoutValuePLN.toFixed(2)} PLN z postawionych ${stake.toFixed(2)} PLN)! Ze względu na rosnącą dynamikę w ${minuta}'. minucie, zamknij kupon i wyeliminuj ryzyko utraty wygranej.`;
      } else {
        recommendation = 'HOLD';
        recTitle = 'TRZYMAJ ZAKŁAD (Czekaj na wyższy Cashout)';
        recColor = 'border-blue-500/50 bg-blue-950/40 text-blue-300';
        recReason = `Gra jest uspokojona (stagnacja ${stats.stagnationLine}/10). Kurs nadal spada. Warto poczekać do 82'-85' minuty, by odebrać pełniejsze 90%+ wygranej.`;
      }
    } else if (minuta >= 45) {
      recommendation = 'HOLD';
      recTitle = 'KUPON WYGRYWA (Cashout rośnie 📈)';
      recColor = 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300';
      recReason = `Mecz w toku (${minuta}'). Kurs spada zgodnie z przewidywaniem. Oferty Cashout będą dynamicznie rosnąć z każdą minutą.`;
    }
  } else {
    if (minuta >= 60 && estimatedCashoutPct < 25) {
      recommendation = 'STOP_LOSS';
      recTitle = 'EWAKUACJA / STOP LOSS ⚠️';
      recColor = 'border-rose-500/50 bg-rose-950/40 text-rose-300';
      recReason = `Wynik meczu (${gole1}:${gole2}) jest niekorzystny. Zamiast czekać na całkowitą stratę stawki, rozważ odzyskanie części środków (Cashout ${cashoutValuePLN.toFixed(2)} PLN).`;
    }
  }

  // --- OBLICZENIA DLA MANUALEGO KALKULATORA "CASHOUT ROŚNIE" ---
  const calcStakeNum = typeof manualStake === 'number' ? manualStake : (stake || 10);
  const calcPayoutNum = typeof manualPayout === 'number' ? manualPayout : (maxPayout || 20);
  const calcCashoutNum = typeof manualCashout === 'number' ? manualCashout : (cashoutValuePLN || 12);

  const profitIfCashout = calcCashoutNum - calcStakeNum;
  const profitIfFullWin = calcPayoutNum - calcStakeNum;
  const cashoutVsFullPct = calcPayoutNum > 0 ? Math.round((calcCashoutNum / calcPayoutNum) * 100) : 0;

  return (
    <div className="bg-[#0b131e] border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Nagłówek Radar Cashoutu */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4 font-bold" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Radar Cashoutu & Zamrażanie Zysku</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Analiza optymalnego momentu wyjścia z zakładu (Stop Loss / Lock Profit)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowManualCalc(!showManualCalc)}
          className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 transition cursor-pointer bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-lg"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>{showManualCalc ? 'Ukryj kalkulator' : 'Kalkulator własny'}</span>
        </button>
      </div>

      {/* 1. Glówna Rekomendacja Radaru */}
      <div className={`p-4 rounded-xl border ${recColor} space-y-2 transition-all`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-xs font-bold uppercase tracking-wider">{recTitle}</h4>
          </div>
          <span className="text-[11px] font-mono font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700">
            Szacowany Cashout: {estimatedCashoutPct}% Wygranej
          </span>
        </div>
        <p className="text-xs leading-relaxed font-sans opacity-90">{recReason}</p>
      </div>

      {/* 2. Podsumowanie Wskaźników Finansowych (Na żywo) */}
      <div className="grid grid-cols-3 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-850 text-center">
        <div>
          <span className="block text-[10px] text-slate-400 uppercase font-bold">Stawka Kuponu</span>
          <span className="text-xs font-mono font-bold text-slate-200">{stake.toFixed(2)} PLN</span>
        </div>
        <div className="border-x border-slate-800">
          <span className="block text-[10px] text-slate-400 uppercase font-bold">Max Wygrana</span>
          <span className="text-xs font-mono font-bold text-slate-200">{maxPayout.toFixed(2)} PLN</span>
        </div>
        <div>
          <span className="block text-[10px] text-emerald-400 uppercase font-bold">Oferta Cashout</span>
          <span className="text-xs font-mono font-black text-emerald-400">{cashoutValuePLN.toFixed(2)} PLN</span>
        </div>
      </div>

      {/* 3. Interaktywny Kalkulator Manualny (Rośnie Cashout) */}
      {showManualCalc && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 animate-fadeIn">
          <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-sky-400" />
            <span>Kalkulator własnego kuponu / Innego bukmachera</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1">Twoja Stawka (PLN)</label>
              <input
                type="number"
                min="1"
                value={manualStake}
                onChange={(e) => setManualStake(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="np. 10"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1">Ewentualna Wygrana (PLN)</label>
              <input
                type="number"
                min="1"
                value={manualPayout}
                onChange={(e) => setManualPayout(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="np. 25"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[10px] text-emerald-400 font-bold mb-1">Obecna Oferta Cashout</label>
              <input
                type="number"
                min="0"
                value={manualCashout}
                onChange={(e) => setManualCashout(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="np. 18"
                className="w-full bg-slate-900 border border-emerald-900/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800/80 flex flex-wrap justify-between items-center gap-2 text-xs">
            <div>
              <span className="text-slate-400 font-sans">Zysk z Cashoutu: </span>
              <strong className={profitIfCashout >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                {profitIfCashout >= 0 ? `+${profitIfCashout.toFixed(2)} PLN` : `${profitIfCashout.toFixed(2)} PLN`}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 font-sans">Odbierasz: </span>
              <strong className="text-sky-300 font-mono">{cashoutVsFullPct}% pełnej wygranej</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
