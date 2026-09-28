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

  // Znajdujemy początkowy kurs zakupu z historii lub zarejestrowanego zakłądu
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
    const rawRatio = (initialOdd / Math.max(1.01, currentLiveOdd)) * 0.90;
    const timeProgress = Math.min(1, minuta / 90);
    const timeMultiplier = 0.5 + (timeProgress * 0.5);
    estimatedCashoutPct = Math.min(98, Math.max(10, Math.round(rawRatio * timeMultiplier * 100)));
  } else {
    const ratio = (initialOdd / Math.max(currentLiveOdd, initialOdd * 1.5));
    estimatedCashoutPct = Math.min(45, Math.max(5, Math.round(ratio * 35)));
  }

  const stake = betPlaced?.stake || 100;
  const maxPayout = Math.round(stake * initialOdd);
  const cashoutValuePLN = Math.round((maxPayout * estimatedCashoutPct) / 100);

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
        recReason = `Gwarantowany zysk wynoszący ok. ${estimatedCashoutPct}% wygranej (${cashoutValuePLN} PLN)! Ze względu na rosnącą dynamikę w ${minuta}'. minucie, zamknij kupon i wyeliminuj ryzyko utraty wygranej w doliczonym czasie.`;
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
      recReason = `Wynik meczu (${gole1}:${gole2}) jest niekorzystny. Zamiast czekać na całkowitą stratę stawki, rozważ odzyskanie części środków (Cashout ${cashoutValuePLN} PLN).`;
    }
  }

  // --- OBLICZENIA DLA MANUALEGO KALKULATORA "CASHOUT ROŚNIE" ---
  const stakeVal = manualStake === '' ? 0 : manualStake;
  const payoutVal = manualPayout === '' ? 0 : manualPayout;
  const cashoutVal = manualCashout === '' ? 0 : manualCashout;

  const manualProfitPLN = Math.round(cashoutVal - stakeVal);
  const manualProfitPct = stakeVal > 0 ? Math.round((manualProfitPLN / stakeVal) * 100) : 0;
  const manualCoveragePct = payoutVal > 0 ? Math.round((cashoutVal / payoutVal) * 100) : 0;

  // Matematyczna ocena opłacalności zamknięcia na żywo
  const currentWinProb = typZalecany?.includes('Gospodarz') ? fairProbs.p1 : typZalecany?.includes('Gość') ? fairProbs.p2 : fairProbs.px;
  const expectedHoldValue = Math.round(payoutVal * currentWinProb);
  const holdVsCashoutDiff = cashoutVal - expectedHoldValue;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-display font-bold text-slate-100 flex items-center gap-1.5">
              <span>Radar Cashout & Zamrażania Zysku</span>
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono">
                Auto + STS
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-sans">
              Dynamiczny asystent automatycznie śledzi wzrost Cashoutu lub pozwala sprawdzić ofertę bukmachera.
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400 block">Status Kuponu</span>
          <span className={`text-xs font-bold font-mono ${isCurrentlyWinning ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isCurrentlyWinning ? 'WYGRYWA 🟢' : 'NIESPRZYJAJĄCY 🟡'}
          </span>
        </div>
      </div>

      {/* Przycisk: CASHOUT ROŚNIE (STS) */}
      <button
        onClick={() => setShowManualCalc(!showManualCalc)}
        className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-between shadow-md transition-all border border-emerald-400/30 active:scale-[0.99]"
      >
        <span className="flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Zauważyłeś, że Cashout rośnie na STS? Sprawdź opłacalność!</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] bg-black/30 px-2 py-0.5 rounded font-mono">
          <Calculator className="w-3.5 h-3.5" />
          {showManualCalc ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* FORMULARZ MANUALNEGO KALKULATORA "CASHOUT ROŚNIE" */}
      {showManualCalc && (
        <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-display">
              <Calculator className="w-4 h-4" />
              <span>Kalkulator Ofert Cashout (STS / Fortuna / Betclic)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Minuta: {minuta}'</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">
                Stawka Kuponu (PLN)
              </label>
              <input
                type="number"
                value={manualStake}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualStake(val === '' ? '' : Math.max(0, Number(val)));
                }}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                placeholder="100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1">
                Maks. Wygrana (PLN)
              </label>
              <input
                type="number"
                value={manualPayout}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualPayout(val === '' ? '' : Math.max(0, Number(val)));
                }}
                className="w-full bg-slate-900 border border-slate-750 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                placeholder="300"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-medium block mb-1 text-emerald-400 font-bold">
                Obecny Cashout STS (PLN)
              </label>
              <input
                type="number"
                value={manualCashout}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualCashout(val === '' ? '' : Math.max(0, Number(val)));
                }}
                className="w-full bg-emerald-950/60 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 font-mono font-bold focus:border-emerald-400 focus:outline-none"
                placeholder="220"
              />
            </div>
          </div>

          {/* Podsumowanie Analityczne ze Wskaźnikami */}
          <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Gwarantowany Zysk</span>
              <strong className={`font-mono text-xs font-bold ${manualProfitPLN >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {manualProfitPLN >= 0 ? `+${manualProfitPLN} PLN` : `${manualProfitPLN} PLN`} ({manualProfitPct}%)
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Pokrycie Wygranej</span>
              <strong className="font-mono text-xs text-cyan-300 font-bold">
                {manualCoveragePct}% wygranej
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">EV Mat. Kuponu</span>
              <strong className="font-mono text-xs text-amber-300 font-bold">
                {expectedHoldValue} PLN
              </strong>
            </div>
          </div>

          {/* Rekomendacja z Decyzją */}
          <div className={`p-2.5 rounded-lg border text-xs font-sans space-y-1 ${
            holdVsCashoutDiff >= -15 || (minuta >= 70 && manualCoveragePct >= 75)
              ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
              : 'bg-blue-950/40 border-blue-500/40 text-blue-200'
          }`}>
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>
                {manualCoveragePct >= 75 && minuta >= 70
                  ? 'ZAMKNIJ CASH OUT NOW! 🔒 (Zabezpiecz Zysk)'
                  : manualProfitPLN > 0
                  ? 'Gwarantowany Zysk! (Sprawdź presję rywala przed decyzją)'
                  : 'Czekaj na wyższą kwotę Cashout'}
              </span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              {manualCoveragePct >= 75
                ? `Obecna oferta STS zaspokaja aż ${manualCoveragePct}% maksymalnej wygranej (${manualCashout} PLN z ${manualPayout} PLN). W ${minuta}'. minucie zamrożenie zysku eliminuję ryzyko bramki w doliczonym czasie!`
                : `Oferta daje ${manualProfitPLN >= 0 ? `+${manualProfitPLN} PLN zysku` : 'częściowy zwrot'}. Prawdopodobieństwo powodzenia typu wynosi obecnie ${Math.round(currentWinProb * 100)}%.`}
            </p>
          </div>
        </div>
      )}

      {/* Wskaźniki Szacunkowego Cashoutu Automatycznego */}
      <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-2.5 rounded-lg border border-slate-850">
        <div>
          <span className="text-[10px] text-slate-400 font-sans block">Kurs Wejścia</span>
          <strong className="text-xs font-mono text-slate-200">{initialOdd.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-sans block">Kurs Live</span>
          <strong className="text-xs font-mono text-emerald-400">{currentLiveOdd.toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-sans block">Szacowany Cashout</span>
          <strong className="text-xs font-mono text-emerald-300">{estimatedCashoutPct}% ({cashoutValuePLN} PLN)</strong>
        </div>
      </div>

      {/* Pasek postępu Cashoutu */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span>Stosunek Zysku Cashoutu:</span>
          <span className="font-mono text-emerald-400 font-bold">{cashoutValuePLN} z {maxPayout} PLN max</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div 
            className={`h-full transition-all duration-500 ${isCurrentlyWinning ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-amber-500'}`}
            style={{ width: `${Math.max(5, estimatedCashoutPct)}%` }}
          />
        </div>
      </div>

      {/* Box rekomendacji Cashout */}
      <div className={`p-3 rounded-lg border text-xs space-y-1 ${recColor}`}>
        <div className="font-bold font-display flex items-center gap-1.5">
          {recommendation === 'LOCK_PROFIT' && <Lock className="w-4 h-4 text-emerald-400 animate-bounce" />}
          {recommendation === 'HOLD' && <TrendingUp className="w-4 h-4 text-blue-400" />}
          {recommendation === 'STOP_LOSS' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
          {recommendation === 'WAIT' && <RefreshCw className="w-4 h-4 text-slate-400" />}
          <span>{recTitle}</span>
        </div>
        <p className="text-[11px] font-sans leading-relaxed opacity-90">
          {recReason}
        </p>
      </div>
    </div>
  );
};

