import React, { useState, useEffect, useMemo } from 'react';
import { LiveMatch, Probabilities, ValueBet, MatchStats, BankrollSettings } from '../types';
import { 
  przelicz_prawdopodobienstwa, 
  wygladz_prawdopodobienstwa, 
  pobierz_i_opisz_staty, 
  przewiduj_kierunek, 
  zbuduj_prompt_panelu,
  oblicz_wartosci_zakladow,
  ocenWynikZalecanegoTypu,
  uzyskaj_pre_match_proby
} from '../utils/bettingCalc';
import { 
  Compass, Activity, Settings, Plus
} from 'lucide-react';
import { MatchControlsPanel } from './MatchControlsPanel';
import { ProbabilityModelPanel } from './ProbabilityModelPanel';
import { EVBetsPanel } from './EVBetsPanel';
import { BankrollPanel } from './BankrollPanel';
import { SettlementPanel } from './SettlementPanel';
import { AIPromptPanel } from './AIPromptPanel';
import { useMatchSimulation } from '../hooks/useMatchSimulation';
import { GoldenTimingPanel } from './GoldenTimingPanel';
import { OddsHistoryTrend } from './OddsHistoryTrend';
import { CashoutRadarPanel } from './CashoutRadarPanel';

interface AnalysisPanelProps {
  match: LiveMatch | null;
  onUpdateMatch: (updated: LiveMatch) => void;
  onTriggerAiAnalysis: (prompt: string) => void;
  aiLoading: boolean;
  bankrollSettings?: BankrollSettings;
  onOpenAddMatchForm?: () => void;
  lastFetched?: string | null;
}

export default function AnalysisPanel({
  match,
  onUpdateMatch,
  onTriggerAiAnalysis,
  aiLoading,
  bankrollSettings,
  onOpenAddMatchForm,
  lastFetched
}: AnalysisPanelProps) {
  const [copied, setCopied] = useState(false);

  // Local string states to allow natural manual typing (decimal dots, clearing values, backspace)
  const [localKurs1, setLocalKurs1] = useState('');
  const [localKursX, setLocalKursX] = useState('');
  const [localKurs2, setLocalKurs2] = useState('');
  const [localStrzaly1, setLocalStrzaly1] = useState('');
  const [localStrzaly2, setLocalStrzaly2] = useState('');
  const [localStrzalyCelne1, setLocalStrzalyCelne1] = useState('');
  const [localStrzalyCelne2, setLocalStrzalyCelne2] = useState('');
  const [finalGospodarz, setFinalGospodarz] = useState('');
  const [finalGosc, setFinalGosc] = useState('');

  // Sync state with selected match on initial load or match change
  useEffect(() => {
    if (match) {
      setLocalKurs1(match.kurs1.toString());
      setLocalKursX(match.kurs_x.toString());
      setLocalKurs2(match.kurs2.toString());
      setLocalStrzaly1(match.strzaly1 !== undefined ? match.strzaly1.toString() : '');
      setLocalStrzaly2(match.strzaly2 !== undefined ? match.strzaly2.toString() : '');
      setLocalStrzalyCelne1(match.strzalyCelne1 !== undefined ? match.strzalyCelne1.toString() : '');
      setLocalStrzalyCelne2(match.strzalyCelne2 !== undefined ? match.strzalyCelne2.toString() : '');
      setFinalGospodarz(match.finalnyGospodarz !== undefined ? match.finalnyGospodarz.toString() : '');
      setFinalGosc(match.finalnyGosc !== undefined ? match.finalnyGosc.toString() : '');
    }
  }, [match?.id]);

  // Sync state if values are updated externally (e.g. simulation), but only if the user is not actively typing/focusing on them
  useEffect(() => {
    if (match) {
      const syncField = (incoming: number | undefined, current: string, setter: (v: string) => void) => {
        const incomingStr = incoming?.toString() || '';
        if (incoming !== undefined && parseFloat(incomingStr) !== parseFloat(current)) {
          setter(incomingStr);
        } else if (incoming === undefined && current !== '') {
          setter('');
        }
      };

      syncField(match.kurs1, localKurs1, setLocalKurs1);
      syncField(match.kurs_x, localKursX, setLocalKursX);
      syncField(match.kurs2, localKurs2, setLocalKurs2);
      syncField(match.strzaly1, localStrzaly1, setLocalStrzaly1);
      syncField(match.strzaly2, localStrzaly2, setLocalStrzaly2);
      syncField(match.strzalyCelne1, localStrzalyCelne1, setLocalStrzalyCelne1);
      syncField(match.strzalyCelne2, localStrzalyCelne2, setLocalStrzalyCelne2);
    }
  }, [
    match?.id, 
    match?.kurs1, 
    match?.kurs_x, 
    match?.kurs2, 
    match?.strzaly1, 
    match?.strzaly2,
    match?.strzalyCelne1,
    match?.strzalyCelne2
  ]);

  // Pomocnicza kalkulacja aktualnego salda bankrollu i sugerowanej stawki przeniesiona do useMemo dla optymalizacji
  const getSuggestedStake = useMemo(() => {
    return (odd: number, ev: number) => {
      if (!bankrollSettings) return { stake: 100, balance: 1000 };
      
      let balance = bankrollSettings.initial;
      try {
        const savedMatchesStr = localStorage.getItem('asystent_live_bet_matches');
        if (savedMatchesStr) {
          const allMatches = JSON.parse(savedMatchesStr) as LiveMatch[];
          const resolvedMatches = allMatches
            .filter(m => m.status !== 'niesprawdzony')
            .sort((a, b) => a.dataDodania.localeCompare(b.dataDodania));
            
          resolvedMatches.forEach(m => {
            const mOdd = m.kursZalecany || 1.8;
            let mStake = 100;
            if (m.betPlaced && m.betPlaced.stake) {
              mStake = m.betPlaced.stake;
            } else {
              if (bankrollSettings.strategy === 'flat') {
                mStake = bankrollSettings.parameter;
              } else if (bankrollSettings.strategy === 'percent') {
                mStake = Math.round((balance * bankrollSettings.parameter / 100) * 100) / 100;
              } else if (bankrollSettings.strategy === 'kelly') {
                const mEv = m.evZalecane !== undefined ? m.evZalecane : 0.05;
                const p = (mEv + 1) / mOdd;
                const q = 1 - p;
                const bRatio = mOdd - 1;
                const kellyFraction = bRatio > 0 ? (p * bRatio - q) / bRatio : 0;
                const safeKelly = Math.max(0, Math.min(1, kellyFraction));
                mStake = Math.round((balance * safeKelly * bankrollSettings.parameter) * 100) / 100;
              }
            }
            if (mStake <= 0) mStake = 10;
            if (mStake > balance) mStake = balance;
            if (m.status === 'wygrany') {
              balance += mStake * (mOdd - 1);
            } else if (m.status === 'przegrany') {
              balance -= mStake;
            }
          });
        }
      } catch (err) {
        console.error("Error calculating balance in getSuggestedStake:", err);
      }
      
      let suggestedStake = 100;
      if (bankrollSettings.strategy === 'flat') {
        suggestedStake = bankrollSettings.parameter;
      } else if (bankrollSettings.strategy === 'percent') {
        suggestedStake = Math.round((balance * bankrollSettings.parameter / 100) * 100) / 100;
      } else if (bankrollSettings.strategy === 'kelly') {
        const p = (ev + 1) / odd;
        const q = 1 - p;
        const bRatio = odd - 1;
        const kellyFraction = bRatio > 0 ? (p * bRatio - q) / bRatio : 0;
        const safeKelly = Math.max(0, Math.min(1, kellyFraction));
        suggestedStake = Math.round((balance * safeKelly * bankrollSettings.parameter) * 100) / 100;
      }
      if (suggestedStake <= 0) suggestedStake = 10;
      if (suggestedStake > balance) suggestedStake = balance;
      return { stake: Math.round(suggestedStake * 100) / 100, balance: Math.round(balance * 100) / 100 };
    };
  }, [match?.id, bankrollSettings]);

  // Obliczenia na żywo na podstawie aktualnego stanu wybranego meczu (zabezpieczone przed null)
  const probsRaw = match ? przelicz_prawdopodobienstwa(match.kurs1, match.kurs_x, match.kurs2) : null;

  const preProbs = match ? uzyskaj_pre_match_proby(match) : null;

  const fairProbs = (match && preProbs && probsRaw) ? {
    ...wygladz_prawdopodobienstwa(
      match.gospodarz,
      match.gosc,
      match.gole1,
      match.gole2,
      match.minuta,
      preProbs.p1,
      preProbs.px,
      preProbs.p2,
      match.czerwoneKartki1,
      match.czerwoneKartki2,
      match.strzaly1,
      match.strzaly2,
      match.strzalyCelne1,
      match.strzalyCelne2,
      match.zolteKartki1,
      match.zolteKartki2
    ),
    p1_surowe: probsRaw.p1_surowe,
    px_surowe: probsRaw.px_surowe,
    p2_surowe: probsRaw.p2_surowe,
  } : null;

  // Obliczenia EV
  const p1_final = fairProbs?.p1 || 0;
  const px_final = fairProbs?.px || 0;
  const p2_final = fairProbs?.p2 || 0;
  
  const evBets = (match && fairProbs) ? oblicz_wartosci_zakladow(
    match.kurs1,
    match.kurs_x,
    match.kurs2,
    p1_final,
    px_final,
    p2_final
  ) : [];

  const stats = (match && fairProbs) ? pobierz_i_opisz_staty(
    match.gospodarz,
    match.gosc,
    match.gole1,
    match.gole2,
    match.minuta,
    fairProbs.p1,
    fairProbs.px,
    fairProbs.p2,
    match.strzaly1,
    match.strzaly2,
    match.strzalyCelne1,
    match.strzalyCelne2,
    match.zolteKartki1,
    match.zolteKartki2
  ) : null;

  // Znajdujemy najlepszy bet o dodatnim EV
  const positiveBets = evBets.filter(b => b.isPositive);
  const bestEvBet = positiveBets.length > 0 
    ? positiveBets.reduce((prev, current) => (prev.ev > current.ev ? prev : current)) 
    : null;

  const pred = (match && fairProbs && stats) ? przewiduj_kierunek(
    match.gospodarz,
    match.gosc,
    match.gole1,
    match.gole2,
    match.minuta,
    fairProbs.p1,
    fairProbs.px,
    fairProbs.p2,
    stats
  ) : null;

  // Pobieranie rekomendacji matematycznej (najwyższe EV, fallback na najwyższe prawdopodobieństwo)
  const getRecommendation = (): ValueBet | null => {
    if (!match || !fairProbs) return null;

    // Tryb MATEMATYCZNY (najwyższe EV)
    const positiveBetsSorted = evBets.filter(b => b.isPositive).sort((a, b) => b.ev - a.ev);
    
    if (positiveBetsSorted.length > 0) {
      return positiveBetsSorted[0];
    }
    
    // Fallback: najwyższe prawdopodobieństwo
    let outcomeKey: '1' | 'X' | '2' = '1';
    let name = 'Gospodarz (1)';
    let odd = match.kurs1;
    let p = fairProbs.p1;

    if (fairProbs.p2 > fairProbs.p1 && fairProbs.p2 > fairProbs.px) {
      outcomeKey = '2';
      name = 'Gość (2)';
      odd = match.kurs2;
      p = fairProbs.p2;
    } else if (fairProbs.px > fairProbs.p1 && fairProbs.px > fairProbs.p2) {
      outcomeKey = 'X';
      name = 'Remis (X)';
      odd = match.kurs_x;
      p = fairProbs.px;
    }

    const ev = odd * p - 1;
    return {
      outcome: outcomeKey,
      name,
      odd,
      fairProb: p,
      ev,
      isPositive: ev > 0
    };
  };

  const rec = getRecommendation();

  const handlePlaceBet = () => {
    if (!match || !rec) return;
    const { stake } = getSuggestedStake(rec.odd, rec.ev);
    onUpdateMatch({
      ...match,
      kursZalecany: rec.odd,
      typZalecany: rec.outcome === '1' ? 'Gospodarz (1)' : rec.outcome === '2' ? 'Gość (2)' : 'Remis (X)',
      evZalecane: rec.ev,
      isLocked: true,
      betPlaced: {
        outcome: rec.outcome,
        odd: rec.odd,
        stake,
        dataPlaced: new Date().toISOString()
      }
    });
  };

  // Budujemy gotowy prompt
  const promptText = (match && pred && stats) ? zbuduj_prompt_panelu(
    match.gospodarz,
    match.gosc,
    match.gole1,
    match.gole2,
    match.minuta,
    pred.kierunek,
    pred.sila,
    pred.pewnosc_procent,
    bestEvBet,
    evBets,
    stats,
    match.strzaly1,
    match.strzaly2,
    match.czerwoneKartki1,
    match.czerwoneKartki2,
    match.notatki,
    match.strzalyCelne1,
    match.strzalyCelne2,
    match.zolteKartki1,
    match.zolteKartki2
  ) : '';

  // Automatycznie aktualizujemy rekomendację meczu w nadrzędnym stanie, jeśli uległa zmianie i nie jest zablokowany
  useEffect(() => {
    if (
      match &&
      rec && 
      !match.isLocked &&
      match.status === 'niesprawdzony'
    ) {
      const targetTyp = rec.outcome === '1' ? 'Gospodarz (1)' : rec.outcome === '2' ? 'Gość (2)' : 'Remis (X)';
      if (
        match.typZalecany !== targetTyp || 
        match.kursZalecany !== rec.odd || 
        match.evZalecane !== rec.ev
      ) {
        onUpdateMatch({
          ...match,
          typZalecany: targetTyp,
          kursZalecany: rec.odd,
          evZalecane: rec.ev
        });
      }
    }
  }, [match?.id, rec?.outcome, rec?.odd, rec?.ev, match?.isLocked, match?.status]);

  // Symulacja telemetryczna Live przy użyciu dedykowanego hooka
  const { isSimulating, setIsSimulating, simLog } = useMatchSimulation(match, onUpdateMatch);

  // Obsługa kopiowania do schowka
  const handleCopy = () => {
    if (!promptText) return;
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handlers zmian parametrów meczu
  const updateField = (field: keyof LiveMatch, value: any) => {
    if (!match) return;
    
    const updated = {
      ...match,
      [field]: value
    };

    // Jeśli edytowano pole kluczowe dla kursów przedmeczowych, resetujemy je
    if (['kurs1', 'kurs_x', 'kurs2', 'minuta', 'gole1', 'gole2', 'isLiveOdds'].includes(field)) {
      delete updated.startingPreMatchProbs;
      updated.startingPreMatchProbs = uzyskaj_pre_match_proby(updated);
    }
    
    onUpdateMatch(updated);
  };

  // Handlers for manual typed value changes - z walidacją zapobiegającą ujemnym lub zerowym kursom (min 1.01)
  const handleKurs1Change = (val: string) => {
    setLocalKurs1(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      updateField('kurs1', Math.max(1.01, parsed));
    }
  };

  const handleKursXChange = (val: string) => {
    setLocalKursX(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      updateField('kurs_x', Math.max(1.01, parsed));
    }
  };

  const handleKurs2Change = (val: string) => {
    setLocalKurs2(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) {
      updateField('kurs2', Math.max(1.01, parsed));
    }
  };

  const handleStrzaly1Change = (val: string) => {
    setLocalStrzaly1(val);
    if (val === '') {
      updateField('strzaly1', undefined);
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateField('strzaly1', parsed);
      }
    }
  };

  const handleStrzaly2Change = (val: string) => {
    setLocalStrzaly2(val);
    if (val === '') {
      updateField('strzaly2', undefined);
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateField('strzaly2', parsed);
      }
    }
  };

  // Handlers for increments & decrements starting from 0 if undefined
  const handleStrzaly1Increment = () => {
    if (!match) return;
    const currentVal = match.strzaly1 !== undefined ? match.strzaly1 : 0;
    const newVal = currentVal + 1;
    setLocalStrzaly1(newVal.toString());
    updateField('strzaly1', newVal);
  };

  const handleStrzaly1Decrement = () => {
    if (!match) return;
    const currentVal = match.strzaly1 !== undefined ? match.strzaly1 : 0;
    const newVal = Math.max(0, currentVal - 1);
    setLocalStrzaly1(newVal.toString());
    updateField('strzaly1', newVal);
  };

  const handleStrzaly2Increment = () => {
    if (!match) return;
    const currentVal = match.strzaly2 !== undefined ? match.strzaly2 : 0;
    const newVal = currentVal + 1;
    setLocalStrzaly2(newVal.toString());
    updateField('strzaly2', newVal);
  };

  const handleStrzaly2Decrement = () => {
    if (!match) return;
    const currentVal = match.strzaly2 !== undefined ? match.strzaly2 : 0;
    const newVal = Math.max(0, currentVal - 1);
    setLocalStrzaly2(newVal.toString());
    updateField('strzaly2', newVal);
  };

  const handleStrzalyCelne1Change = (val: string) => {
    setLocalStrzalyCelne1(val);
    if (val === '') {
      updateField('strzalyCelne1', undefined);
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateField('strzalyCelne1', parsed);
      }
    }
  };

  const handleStrzalyCelne2Change = (val: string) => {
    setLocalStrzalyCelne2(val);
    if (val === '') {
      updateField('strzalyCelne2', undefined);
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        updateField('strzalyCelne2', parsed);
      }
    }
  };

  const handleStrzalyCelne1Increment = () => {
    if (!match) return;
    const currentVal = match.strzalyCelne1 !== undefined ? match.strzalyCelne1 : 0;
    const newVal = currentVal + 1;
    setLocalStrzalyCelne1(newVal.toString());
    updateField('strzalyCelne1', newVal);
  };

  const handleStrzalyCelne1Decrement = () => {
    if (!match) return;
    const currentVal = match.strzalyCelne1 !== undefined ? match.strzalyCelne1 : 0;
    const newVal = Math.max(0, currentVal - 1);
    setLocalStrzalyCelne1(newVal.toString());
    updateField('strzalyCelne1', newVal);
  };

  const handleStrzalyCelne2Increment = () => {
    if (!match) return;
    const currentVal = match.strzalyCelne2 !== undefined ? match.strzalyCelne2 : 0;
    const newVal = currentVal + 1;
    setLocalStrzalyCelne2(newVal.toString());
    updateField('strzalyCelne2', newVal);
  };

  const handleStrzalyCelne2Decrement = () => {
    if (!match) return;
    const currentVal = match.strzalyCelne2 !== undefined ? match.strzalyCelne2 : 0;
    const newVal = Math.max(0, currentVal - 1);
    setLocalStrzalyCelne2(newVal.toString());
    updateField('strzalyCelne2', newVal);
  };

  // Zabezpieczenie przed brakiem zaznaczonego meczu - umieszczone bezpiecznie po zadeklarowaniu wszystkich hooków
  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950 border border-slate-800 rounded-xl min-h-[400px]">
        <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-500 mb-4 animate-pulse">
          <Compass className="w-10 h-10" />
        </div>
        <h3 className="text-base font-display font-semibold text-slate-100">Brak aktywnego meczu</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm font-sans">
          Wybierz mecz z listy po lewej stronie, pobierz mecze z realnego API lub utwórz zupełnie nowy mecz na żywo, aby rozpocząć zaawansowaną analizę probabilistyczną.
        </p>
        {onOpenAddMatchForm && (
          <button
            onClick={onOpenAddMatchForm}
            className="mt-5 flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition duration-150 cursor-pointer shadow-lg shadow-emerald-950/40"
            id="btn-empty-add-match"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj nowy mecz ręcznie</span>
          </button>
        )}
      </div>
    );
  }

  const isArchival = match.status !== 'niesprawdzony' || match.minuta >= 90 || match.isLocked;

  return (
    <div className="space-y-4 w-full">
      {/* Panel Nagłówka Meczu z Informacją o API i Typie Danych */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3.5 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Aktualnie Analizowany Mecz</div>
            <h2 className="text-base font-display font-bold text-slate-100 flex items-center gap-2 flex-wrap">
              {match.gospodarz} <span className="text-slate-600 font-sans font-normal text-xs">vs</span> {match.gosc}
            </h2>
          </div>
        </div>
        
        {/* Wizualne wskaźniki stanu i źródła danych */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ostatnia aktualizacja API */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-3 py-1.5 rounded-lg text-xs font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            <span className="text-slate-400">Pobranie API:</span>
            <strong className="text-blue-400 font-semibold">
              {lastFetched ? `${lastFetched}` : 'Ręczne / Brak'}
            </strong>
          </div>

          {/* Status danych (Bieżące vs Archiwalne) */}
          {isArchival ? (
            <div className="flex items-center gap-1.5 bg-amber-950/50 border border-amber-900/40 px-3 py-1.5 rounded-lg text-xs font-sans text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Dane: <strong>Archiwalne / Statyczne</strong></span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/40 px-3 py-1.5 rounded-lg text-xs font-sans text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Dane: <strong>Bieżące / Live 🟢</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ⚡ ANALIZA TIMINGU, RADAR CASHOUT & TRENDÓW KURSOWYCH ⚡ */}
      {match && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GoldenTimingPanel match={match} />
          <CashoutRadarPanel match={match} />
          <OddsHistoryTrend match={match} onUpdateMatch={onUpdateMatch} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5" id="analysis-workspace-grid">
        {/* Kolumna lewa: Edycja meczu w czasie rzeczywistym */}
        <div className="lg:col-span-5 space-y-4">
          <MatchControlsPanel
            match={match}
            isSimulating={isSimulating}
            setIsSimulating={setIsSimulating}
            updateField={updateField}
            localKurs1={localKurs1}
            handleKurs1Change={handleKurs1Change}
            localKursX={localKursX}
            handleKursXChange={handleKursXChange}
            localKurs2={localKurs2}
            handleKurs2Change={handleKurs2Change}
            localStrzaly1={localStrzaly1}
            handleStrzaly1Change={handleStrzaly1Change}
            localStrzaly2={localStrzaly2}
            handleStrzaly2Change={handleStrzaly2Change}
            localStrzalyCelne1={localStrzalyCelne1}
            handleStrzalyCelne1Change={handleStrzalyCelne1Change}
            localStrzalyCelne2={localStrzalyCelne2}
            handleStrzalyCelne2Change={handleStrzalyCelne2Change}
            handleStrzaly1Increment={handleStrzaly1Increment}
            handleStrzaly1Decrement={handleStrzaly1Decrement}
            handleStrzaly2Increment={handleStrzaly2Increment}
            handleStrzaly2Decrement={handleStrzaly2Decrement}
            handleStrzalyCelne1Increment={handleStrzalyCelne1Increment}
            handleStrzalyCelne1Decrement={handleStrzalyCelne1Decrement}
            handleStrzalyCelne2Increment={handleStrzalyCelne2Increment}
            handleStrzalyCelne2Decrement={handleStrzalyCelne2Decrement}
            isSimulatingActive={isSimulating}
            simLog={simLog}
          />
        </div>

        {/* Kolumna prawa: Matematyka, EV, prompt i analiza */}
        <div className="lg:col-span-7 space-y-4">
          {probsRaw && fairProbs && stats && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4">
              <ProbabilityModelPanel
                match={match}
                fairProbs={fairProbs}
                probsRaw={probsRaw}
                stats={stats}
              />
              <EVBetsPanel evBets={evBets} />
            </div>
          )}

          {/* Panel Sugerowanego Wyniku i Rekomendacji Modelu */}
          {pred && stats && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3.5">
                <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-400" />
                  Sugerowany Wynik & Rekomendacja Modelu
                </h3>
                <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                  pred.sila === 'Silna' ? 'bg-red-950/60 border-red-800/80 text-red-400' :
                  pred.sila === 'Średnia' ? 'bg-amber-950/60 border-amber-800/80 text-amber-400' :
                  'bg-slate-800/60 border-slate-700 text-slate-400'
                }`}>
                  Rekomendacja: {pred.sila}
                </span>
              </div>

              {/* Zamrażanie typu / blokada prognozy */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 border border-slate-850 p-3 rounded-xl mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium font-sans">Status prognozy:</span>
                  {match.isLocked ? (
                    <span className="flex items-center gap-1 text-[10px] bg-sky-950/80 border border-sky-800 text-sky-400 px-2.5 py-1 rounded-lg font-bold font-mono animate-fade-in">
                      ❄️ ZAMROŻONA (STATYCZNA)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-950/80 border border-emerald-800 text-emerald-400 px-2.5 py-1 rounded-lg font-bold font-mono animate-pulse">
                      🔥 DYNAMICZNA (LIVE)
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateMatch({
                      ...match,
                      isLocked: !match.isLocked,
                      ...(match.isLocked && rec ? {
                        typZalecany: rec.outcome === '1' ? 'Gospodarz (1)' : rec.outcome === '2' ? 'Gość (2)' : 'Remis (X)',
                        kursZalecany: rec.odd,
                        evZalecane: rec.ev
                      } : {})
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition duration-150 border ${
                    match.isLocked 
                      ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300' 
                      : 'bg-sky-950 hover:bg-sky-900 border-sky-800 text-sky-400'
                  }`}
                >
                  {match.isLocked ? '🔓 Odblokuj i aktualizuj' : '❄️ Zamroź obecną prognozę'}
                </button>
              </div>

              {(() => {
                const sugerowanyWynik = match.gole1 !== undefined && match.gole2 !== undefined && rec
                  ? (() => {
                      const outcome = rec.name;
                      let g1 = match.gole1;
                      let g2 = match.gole2;
                      if (outcome.includes('1') && g1 <= g2) {
                        g1 = g2 + 1;
                      } else if (outcome.includes('2') && g2 <= g1) {
                        g2 = g1 + 1;
                      } else if (outcome.includes('X') && g1 !== g2) {
                        const maxVal = Math.max(g1, g2);
                        g1 = maxVal;
                        g2 = maxVal;
                      }
                      return { sugerowaneGole1: g1, sugerowaneGole2: g2 };
                    })()
                  : { sugerowaneGole1: match.gole1, sugerowaneGole2: match.gole2 };

                const zalecanyOpis = rec 
                  ? (rec.outcome === '1' ? 'Gospodarz (1)' : rec.outcome === '2' ? 'Gość (2)' : 'Remis (X)') 
                  : (match.typZalecany || 'Brak');
                
                const currentRecOdd = rec ? rec.odd : (match.kursZalecany || 1.0);
                const currentRecEv = rec ? rec.ev : (match.evZalecane || 0);

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                      {/* Sugerowany wynik bramkowy */}
                      <div className="md:col-span-5 bg-slate-950 border border-slate-850 rounded-xl p-4 text-center flex flex-col justify-center items-center shadow-inner">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Sugerowany wynik końcowy</span>
                        <div className="text-3xl font-mono font-black text-emerald-400 tracking-wider my-1 drop-shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                          {sugerowanyWynik.sugerowaneGole1} : {sugerowanyWynik.sugerowaneGole2}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Matematyczna spójność z Valuebet
                        </span>
                      </div>

                      {/* Rekomendowany Kierunek i Pewność */}
                      <div className="md:col-span-7 space-y-3 bg-slate-950/30 p-4 rounded-xl border border-slate-850/40 flex flex-col justify-between">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                              💎 Matematyczny Valuebet (EV)
                            </span>
                            <div className="text-xs font-bold text-white flex items-center gap-1 leading-snug">
                              <span className="text-sky-400">[{zalecanyOpis}]</span>
                              <span className="text-slate-400 text-[9px] font-normal font-mono">
                                @{currentRecOdd.toFixed(2)} (EV: {currentRecEv >= 0 ? '+' : ''}{(currentRecEv * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-bold">
                              📈 Prawdopodobieństwo
                            </span>
                            <div className="text-xs font-bold text-emerald-400 leading-snug">
                              {rec ? (rec.fairProb * 100).toFixed(1) : (match.evZalecane ? 'Obliczanie...' : 'N/A')}%
                            </div>
                          </div>
                        </div>

                        {/* Oryginalny kierunek algorytmu */}
                        {pred && (
                          <div>
                            <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-0.5 font-bold">Typ algorytmu</span>
                            <span className="text-xs text-slate-300 font-medium leading-relaxed">{pred.kierunek}</span>
                          </div>
                        )}

                        {/* Pasek pewności */}
                        {pred && (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>Zaufanie algorytmu:</span>
                              <span className="font-mono font-bold text-emerald-400">{pred.pewnosc_procent}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
                                style={{ width: `${pred.pewnosc_procent}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Uzasadnienie modelu */}
              <div className="mt-3.5 text-[11px] text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-850/80 leading-relaxed italic">
                " {pred.uzasadnienie} "
              </div>

              {/* Moduł Bankroll Management */}
              <BankrollPanel
                match={match}
                rec={rec}
                bankrollSettings={bankrollSettings || null}
                getSuggestedStake={getSuggestedStake}
                handlePlaceBet={handlePlaceBet}
                onUpdateMatch={onUpdateMatch}
              />

              {/* Sekcja: Rozliczenie Końcowe */}
              <SettlementPanel
                match={match}
                rec={rec}
                finalGospodarz={finalGospodarz}
                setFinalGospodarz={setFinalGospodarz}
                finalGosc={finalGosc}
                setFinalGosc={setFinalGosc}
                ocenWynikZalecanegoTypu={ocenWynikZalecanegoTypu}
                onUpdateMatch={onUpdateMatch}
              />
            </div>
          )}

          {/* Panel Generowania Promptu dla Gemini */}
          <AIPromptPanel
            promptText={promptText}
            copied={copied}
            handleCopy={handleCopy}
            onTriggerAiAnalysis={onTriggerAiAnalysis}
            aiLoading={aiLoading}
          />
        </div>
      </div>
    </div>
  );
}
