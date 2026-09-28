import React, { useState } from 'react';
import { LiveMatch, BankrollSettings } from '../types';
import { 
  Percent, TrendingUp, DollarSign, BarChart2, Zap, 
  Settings2, Calendar, Target, Award, ShieldAlert, Sparkles 
} from 'lucide-react';

interface StatsHistoryProps {
  matches: LiveMatch[];
  bankrollSettings: BankrollSettings;
  onUpdateBankrollSettings: (settings: BankrollSettings) => void;
}

export default function StatsHistory({ 
  matches, 
  bankrollSettings, 
  onUpdateBankrollSettings 
}: StatsHistoryProps) {
  const [showConfig, setShowConfig] = useState(false);

  const resolved = matches.filter(m => m.status !== 'niesprawdzony');
  const wins = resolved.filter(m => m.status === 'wygrany').length;
  const losses = resolved.filter(m => m.status === 'przegrany').length;
  const voided = resolved.filter(m => m.status === 'anulowany').length;

  const totalBets = wins + losses;
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;

  // Chronologiczne obliczanie kapitału (Bankroll Management)
  const chronologicalMatches = [...resolved].sort((a, b) => a.dataDodania.localeCompare(b.dataDodania));
  
  let balance = bankrollSettings.initial;
  const balanceHistory: number[] = [balance];
  const betsPlacedLog: Array<{
    matchName: string;
    type: string;
    odd: number;
    stake: number;
    profit: number;
    balanceAfter: number;
    status: string;
  }> = [];

  chronologicalMatches.forEach(m => {
    const odd = m.kursZalecany || 1.8;
    const typ = m.typZalecany || '1';
    
    let stake = 100;
    if (m.betPlaced && m.betPlaced.stake) {
      stake = m.betPlaced.stake;
    } else {
      // Obliczanie stawki według wybranej strategii bankrollu
      if (bankrollSettings.strategy === 'flat') {
        stake = bankrollSettings.parameter;
      } else if (bankrollSettings.strategy === 'percent') {
        stake = Math.round((balance * bankrollSettings.parameter / 100) * 100) / 100;
      } else if (bankrollSettings.strategy === 'kelly') {
        const ev = m.evZalecane !== undefined ? m.evZalecane : 0.05;
        const p = (ev + 1) / odd;
        const q = 1 - p;
        const bRatio = odd - 1;
        const kellyFraction = bRatio > 0 ? (p * bRatio - q) / bRatio : 0;
        const safeKelly = Math.max(0, Math.min(1, kellyFraction));
        const fraction = safeKelly * bankrollSettings.parameter;
        stake = Math.round((balance * fraction) * 100) / 100;
      }
    }
    
    if (stake <= 0) stake = 10; // minimalne zabezpieczenie stawki
    if (stake > balance) stake = balance; // limit do posiadanych środków
    
    let profit = 0;
    if (m.status === 'wygrany') {
      profit = stake * (odd - 1);
      balance += profit;
    } else if (m.status === 'przegrany') {
      profit = -stake;
      balance += profit;
    }
    
    balance = Math.round(balance * 100) / 100;
    balanceHistory.push(balance);
    betsPlacedLog.push({
      matchName: `${m.gospodarz} - ${m.gosc}`,
      type: typ,
      odd,
      stake,
      profit,
      balanceAfter: balance,
      status: m.status
    });
  });

  const totalBankrollProfit = balance - bankrollSettings.initial;
  const yieldPercentage = totalBets > 0 
    ? Number(((totalBankrollProfit / (betsPlacedLog.reduce((acc, curr) => acc + curr.stake, 0) || 1)) * 100).toFixed(1)) 
    : 0.0;

  // Kalkulacja Szczegółowych Statystyk (Module 3)
  // 1. Podział rynkowy (1, X, 2)
  const market1 = resolved.filter(m => (m.typZalecany || '1').includes('1') || (m.typZalecany || '').toLowerCase().includes('gospodarz'));
  const marketX = resolved.filter(m => (m.typZalecany || '1').includes('X') || (m.typZalecany || '').toLowerCase().includes('remis'));
  const market2 = resolved.filter(m => (m.typZalecany || '1').includes('2') || (m.typZalecany || '').toLowerCase().includes('gosc'));

  const m1Total = market1.length;
  const m1Wins = market1.filter(m => m.status === 'wygrany').length;
  const m1Rate = m1Total > 0 ? Math.round((m1Wins / m1Total) * 100) : 0;

  const mxTotal = marketX.length;
  const mxWins = marketX.filter(m => m.status === 'wygrany').length;
  const mxRate = mxTotal > 0 ? Math.round((mxWins / mxTotal) * 100) : 0;

  const m2Total = market2.length;
  const m2Wins = market2.filter(m => m.status === 'wygrany').length;
  const m2Rate = m2Total > 0 ? Math.round((m2Wins / m2Total) * 100) : 0;

  // 2. Podział według zakresów kursów
  const lowOddsBets = resolved.filter(m => (m.kursZalecany || 1.8) < 1.6);
  const midOddsBets = resolved.filter(m => (m.kursZalecany || 1.8) >= 1.6 && (m.kursZalecany || 1.8) <= 2.5);
  const highOddsBets = resolved.filter(m => (m.kursZalecany || 1.8) > 2.5);

  const lowWins = lowOddsBets.filter(m => m.status === 'wygrany').length;
  const lowRate = lowOddsBets.length > 0 ? Math.round((lowWins / lowOddsBets.length) * 100) : 0;

  const midWins = midOddsBets.filter(m => m.status === 'wygrany').length;
  const midRate = midOddsBets.length > 0 ? Math.round((midWins / midOddsBets.length) * 100) : 0;

  const highWins = highOddsBets.filter(m => m.status === 'wygrany').length;
  const highRate = highOddsBets.length > 0 ? Math.round((highWins / highOddsBets.length) * 100) : 0;

  // 3. Średni i maksymalny trafiony kurs
  const winningBets = resolved.filter(m => m.status === 'wygrany');
  const avgWinOdds = winningBets.length > 0 ? (winningBets.reduce((acc, curr) => acc + (curr.kursZalecany || 1.8), 0) / winningBets.length).toFixed(2) : '0.00';
  const maxWinOdds = winningBets.length > 0 ? Math.max(...winningBets.map(m => m.kursZalecany || 1.8)).toFixed(2) : '0.00';

  // Funkcja generująca koordynaty dla SVG wykresu liniowego bankrollu
  const renderSVGChart = () => {
    if (balanceHistory.length <= 1) return null;
    const svgWidth = 500;
    const svgHeight = 110;
    const padX = 15;
    const padY = 15;
    
    const minVal = Math.min(...balanceHistory);
    const maxVal = Math.max(...balanceHistory);
    const range = maxVal - minVal || 1;

    const points = balanceHistory.map((val, idx) => {
      const x = padX + (idx / (balanceHistory.length - 1)) * (svgWidth - 2 * padX);
      const y = svgHeight - padY - ((val - minVal) / range) * (svgHeight - 2 * padY);
      return { x, y, val };
    });

    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const areaPoints = `${padX},${svgHeight - padY} ${polylinePoints} ${svgWidth - padX},${svgHeight - padY}`;

    return (
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 shadow-inner relative overflow-hidden h-[155px]">
        <div className="absolute top-2 left-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">Krzywa wzrostu kapitału (PLN)</div>
        <div className="absolute top-2 right-3 text-[10px] font-mono text-emerald-400 font-bold">
          Max: {Math.round(maxVal)} PLN
        </div>
        <div className="mt-4">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-[115px] overflow-visible">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Siatka pozioma */}
            <line x1={padX} y1={svgHeight - padY} x2={svgWidth - padX} y2={svgHeight - padY} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={padX} y1={svgHeight / 2} x2={svgWidth - padX} y2={svgHeight / 2} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
            <line x1={padX} y1={padY} x2={svgWidth - padX} y2={padY} stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
            
            {/* Obszar pod wykresem */}
            <polygon points={areaPoints} fill="url(#chartGradient)" />
            
            {/* Główna linia wykresu */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={polylinePoints}
              className="drop-shadow-[0_2px_4px_rgba(16,185,129,0.3)]"
            />
            
            {/* Punkty węzłowe */}
            {points.map((p, idx) => (
              <g key={idx} className="group/node cursor-pointer">
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  className="fill-emerald-500 stroke-slate-950 stroke-2 hover:r-6 transition-all duration-150"
                />
                <title>{`Zakład #${idx}: ${p.val} PLN`}</title>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const handleUpdateSetting = (field: keyof BankrollSettings, value: any) => {
    onUpdateBankrollSettings({
      ...bankrollSettings,
      [field]: value
    });
  };

  return (
    <div className="space-y-4" id="stats-history-dashboard">
      {/* Sekcja 1: Główny Grid 4 Kart Podsumowania */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Skuteczność Win Rate */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-900/60 text-emerald-400 shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-medium">Skuteczność (Win Rate)</div>
            <div className="text-base font-display font-bold text-slate-100 mt-0.5">
              {winRate}%
              <span className="text-[10px] text-slate-500 font-mono ml-1">({wins}/{totalBets})</span>
            </div>
          </div>
        </div>

        {/* Kapitał całkowity */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 border ${
            balance >= bankrollSettings.initial 
              ? 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400' 
              : 'bg-red-950/60 border-red-900/60 text-red-400'
          }`}>
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-medium">Stan konta (Bankroll)</div>
            <div className={`text-base font-display font-bold mt-0.5 ${balance >= bankrollSettings.initial ? 'text-emerald-400' : 'text-red-400'}`}>
              {balance.toFixed(2)} PLN
            </div>
          </div>
        </div>

        {/* Zysk netto w walucie */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 border ${
            totalBankrollProfit >= 0 
              ? 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400' 
              : 'bg-red-950/60 border-red-900/60 text-red-400'
          }`}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-medium">Zysk / Strata Netto</div>
            <div className={`text-base font-display font-bold mt-0.5 ${totalBankrollProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalBankrollProfit >= 0 ? '+' : ''}{totalBankrollProfit.toFixed(1)} PLN
            </div>
          </div>
        </div>

        {/* Realny Yield */}
        <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className={`p-2 rounded-lg shrink-0 border ${
            yieldPercentage >= 0 
              ? 'bg-emerald-950/60 border-emerald-900/60 text-emerald-400' 
              : 'bg-red-950/60 border-red-900/60 text-red-400'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-medium">Zwrot z inwestycji (Yield)</div>
            <div className={`text-base font-display font-bold mt-0.5 ${yieldPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {yieldPercentage >= 0 ? '+' : ''}{yieldPercentage}%
            </div>
          </div>
        </div>
      </div>

      {/* Sekcja 2: Zarządzanie Kapitałem (Module 1) oraz Statystyka Typów (Module 3) w układzie bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* PANEL BANKROLLU (Lewa, 7 kolumn) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              Zarządzanie Kapitałem (Bankroll Management)
            </h3>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-2.5 py-1 rounded transition flex items-center gap-1.5"
            >
              Ustawienia strategii
            </button>
          </div>

          {/* Formularz konfiguracji bankrollu */}
          {showConfig && (
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-850 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fadeIn">
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Budżet początkowy (PLN)</label>
                <input
                  type="number"
                  min="100"
                  value={bankrollSettings.initial}
                  onChange={(e) => handleUpdateSetting('initial', Math.max(100, parseFloat(e.target.value) || 100))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Strategia stawkowania</label>
                <select
                  value={bankrollSettings.strategy}
                  onChange={(e) => {
                    const strat = e.target.value as BankrollSettings['strategy'];
                    const defaultParam = strat === 'flat' ? 100 : strat === 'percent' ? 2 : 0.25;
                    onUpdateBankrollSettings({
                      ...bankrollSettings,
                      strategy: strat,
                      parameter: defaultParam
                    });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500"
                >
                  <option value="flat">Płaska stawka (Flat Stake)</option>
                  <option value="percent">Procentowa (% kapitału)</option>
                  <option value="kelly">Kryterium Kelly'ego</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                  {bankrollSettings.strategy === 'flat' ? 'Stawka (PLN)' : 
                   bankrollSettings.strategy === 'percent' ? 'Procent konta (%)' : 
                   'Mnożnik Kelly\'ego (np. 0.25)'}
                </label>
                <input
                  type="number"
                  step={bankrollSettings.strategy === 'kelly' ? '0.05' : '1'}
                  min="0.01"
                  value={bankrollSettings.parameter}
                  onChange={(e) => handleUpdateSetting('parameter', Math.max(0.01, parseFloat(e.target.value) || 1))}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-slate-100 outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Wykres SVG */}
          {balanceHistory.length > 1 ? (
            renderSVGChart()
          ) : (
            <div className="bg-slate-950/60 p-6 text-center rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs flex flex-col items-center justify-center py-8">
              <Calendar className="w-8 h-8 text-slate-700 mb-2" />
              <span>Brak danych wykresu. Rozlicz mecze ze statusem wygrany/przegrany, aby wygenerować wykres kapitału.</span>
            </div>
          )}

          {/* Dziennik ostatnich operacji bankrollu */}
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Ostatnie 3 zakłady (Dziennik konta):</div>
            <div className="space-y-1.5 h-[115px] overflow-y-auto pr-1">
              {betsPlacedLog.length === 0 ? (
                <div className="text-slate-600 text-xs italic text-center py-6">Dziennik jest pusty. Brak rozliczonych zakładów.</div>
              ) : (
                betsPlacedLog.slice(-3).reverse().map((b, idx) => (
                  <div key={idx} className="bg-slate-950 p-2 rounded border border-slate-850 flex justify-between items-center text-xs">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-semibold text-slate-100 block truncate">{b.matchName}</span>
                      <div className="flex gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>Typ: <strong className="text-slate-400">{b.type}</strong></span>
                        <span>Kurs: <strong className="text-slate-400">@{b.odd.toFixed(2)}</strong></span>
                        <span>Stawka: <strong className="text-emerald-400/80">{b.stake} PLN</strong></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono font-bold block ${b.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {b.profit >= 0 ? `+${b.profit.toFixed(2)}` : b.profit.toFixed(2)} PLN
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 block">Saldo: {b.balanceAfter.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* PANEL SZCZEGÓŁOWEJ SKUTECZNOŚCI TYPÓW (Prawa, 5 kolumn) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-400" />
              Historia Skuteczności Typów (Moduł Statystyk)
            </h3>
          </div>

          {/* Podział według rynków */}
          <div className="space-y-2.5">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Skuteczność według rynków (1-X-2):</div>
            
            {/* Market 1 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Zwycięstwo Gospodarzy (1)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{m1Rate}%</strong> ({m1Wins}/{m1Total})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${m1Rate}%` }}
                ></div>
              </div>
            </div>

            {/* Market X */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Remis (X)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{mxRate}%</strong> ({mxWins}/{mxTotal})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300" 
                  style={{ width: `${mxRate}%` }}
                ></div>
              </div>
            </div>

            {/* Market 2 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Zwycięstwo Gości (2)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{m2Rate}%</strong> ({m2Wins}/{m2Total})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300" 
                  style={{ width: `${m2Rate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Skuteczność według przedziałów kursowych */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Skuteczność według wysokości kursów:</div>
            
            {/* Low Odds */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Niskie kursy (&lt; 1.60)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{lowRate}%</strong> ({lowWins}/{lowOddsBets.length})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-teal-500 transition-all duration-300" 
                  style={{ width: `${lowRate}%` }}
                ></div>
              </div>
            </div>

            {/* Mid Odds */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Średnie kursy (1.60 - 2.50)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{midRate}%</strong> ({midWins}/{midOddsBets.length})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300" 
                  style={{ width: `${midRate}%` }}
                ></div>
              </div>
            </div>

            {/* High Odds */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Wysokie kursy (&gt; 2.50)</span>
                <span className="font-mono text-slate-400">
                  <strong className="text-slate-100">{highRate}%</strong> ({highWins}/{highOddsBets.length})
                </span>
              </div>
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden flex">
                <div 
                  className="h-full bg-amber-500 transition-all duration-300" 
                  style={{ width: `${highRate}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Średnie / Maksymalne Kursy */}
          <div className="grid grid-cols-2 gap-2.5 pt-3.5 border-t border-slate-800">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
              <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Średni kurs wygranych</span>
              <div className="text-lg font-mono font-bold text-emerald-400">@{avgWinOdds}</div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-center">
              <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">Maks. trafiony kurs</span>
              <div className="text-lg font-mono font-bold text-teal-400">@{maxWinOdds}</div>
            </div>
          </div>
        </div>

      </div>

      {totalBets === 0 && (
        <p className="text-[10px] text-slate-500 text-center mt-1 italic leading-relaxed">
          💡 Rozliczaj kolejne zakłady przyciskiem "Rozlicz zakład" w liście meczów na żywo. Twój Bankroll, Yield, wykres i statystyki rynkowe zaktualizują się automatycznie w czasie rzeczywistym!
        </p>
      )}
    </div>
  );
}
