import React, { useState } from 'react';
import { LiveMatch, OddsHistoryEntry } from '../types';
import { TrendingUp, HelpCircle, Trash2, Plus, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';
import { ocenOptymalneWejscie } from '../utils/bettingCalc';

interface OddsHistoryTrendProps {
  match: LiveMatch;
  onUpdateMatch: (updated: LiveMatch) => void;
}

export function OddsHistoryTrend({ match, onUpdateMatch }: OddsHistoryTrendProps) {
  const history = match.oddsHistory || [];
  const [hoveredPoint, setHoveredPoint] = useState<OddsHistoryEntry | null>(null);

  // Zapisz aktualny kurs do historii
  const handleAddSnapshot = () => {
    const newEntry: OddsHistoryEntry = {
      minuta: match.minuta,
      kurs1: match.kurs1,
      kurs_x: match.kurs_x,
      kurs2: match.kurs2,
      gole1: match.gole1,
      gole2: match.gole2,
      timestamp: new Date().toISOString()
    };

    const currentHistory = match.oddsHistory ? [...match.oddsHistory] : [];
    
    // Sprawdź czy nie dublujemy dokładnie tego samego wpisu na samej minucie i kursach
    const isDuplicate = currentHistory.some(h => 
      h.minuta === newEntry.minuta && 
      h.kurs1 === newEntry.kurs1 && 
      h.kurs_x === newEntry.kurs_x && 
      h.kurs2 === newEntry.kurs2 &&
      h.gole1 === newEntry.gole1 &&
      h.gole2 === newEntry.gole2
    );

    if (isDuplicate) return;

    const updatedHistory = [...currentHistory, newEntry].sort((a, b) => a.minuta - b.minuta);

    onUpdateMatch({
      ...match,
      oddsHistory: updatedHistory
    });
  };

  // Usuń konkretny punkt historii
  const handleDeletePoint = (indexToDelete: number) => {
    if (!match.oddsHistory) return;
    const updatedHistory = match.oddsHistory.filter((_, idx) => idx !== indexToDelete);
    onUpdateMatch({
      ...match,
      oddsHistory: updatedHistory
    });
  };

  // Wyczyść całą historię
  const handleClearHistory = () => {
    // Pozostawiamy jeden początkowy punkt referencyjny, aby nie zgubić punktu wyjścia
    const initialEntry: OddsHistoryEntry = {
      minuta: match.minuta,
      kurs1: match.kurs1,
      kurs_x: match.kurs_x,
      kurs2: match.kurs2,
      gole1: match.gole1,
      gole2: match.gole2,
      timestamp: new Date().toISOString()
    };

    onUpdateMatch({
      ...match,
      oddsHistory: [initialEntry]
    });
  };

  // Obliczenia dla wykresu SVG
  const width = 500;
  const height = 200;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Znajdujemy zakresy wartości
  const minutes = history.map(h => h.minuta);
  const minMin = minutes.length > 0 ? Math.min(...minutes) : 0;
  const maxMin = minutes.length > 0 ? Math.max(...minutes) : 90;
  const spanMin = maxMin - minMin === 0 ? 1 : maxMin - minMin;

  const allOdds = history.flatMap(h => [h.kurs1, h.kurs_x, h.kurs2]);
  const maxOdds = allOdds.length > 0 ? Math.max(...allOdds, 4) : 5;
  const minOdds = 1.0; // Minimalny możliwy kurs u bukmachera
  const spanOdds = maxOdds - minOdds === 0 ? 1 : maxOdds - minOdds;

  // Funkcje mapujące wartości na współrzędne SVG
  const getX = (min: number) => {
    return paddingLeft + ((min - minMin) / spanMin) * chartWidth;
  };

  const getY = (odds: number) => {
    return paddingTop + chartHeight - ((odds - minOdds) / spanOdds) * chartHeight;
  };

  // Tworzenie ścieżek dla linii wykresu
  const getPathData = (key: 'kurs1' | 'kurs_x' | 'kurs2') => {
    if (history.length < 2) return '';
    return history.map((h, idx) => {
      const x = getX(h.minuta);
      const y = getY(h[key]);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const path1 = getPathData('kurs1');
  const pathX = getPathData('kurs_x');
  const path2 = getPathData('kurs2');

  const assessment = ocenOptymalneWejscie(match);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-4 min-w-0" id={`odds-trend-panel-${match.id}`}>
      {/* Nagłówek sekcji */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-850 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-emerald-400 shrink-0">
            <TrendingUp className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-display font-semibold text-slate-100 truncate">
              Monitor Trendów STS (Live)
            </h3>
            <p className="text-[10px] text-slate-400 leading-normal font-sans truncate">
              Skoki kursów STS w czasie rzeczywistym
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAddSnapshot}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition duration-150 cursor-pointer shadow-md"
            title="Dodaj obecny kurs jako punkt odniesienia do analizy trendu"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Zapisz punkt</span>
          </button>
          
          {history.length > 1 && (
            <button
              type="button"
              onClick={handleClearHistory}
              className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-slate-200 text-xs transition duration-150 cursor-pointer"
              title="Resetuj historię kursów do stanu początkowego"
            >
              Resetuj
            </button>
          )}
        </div>
      </div>

      {/* Wykres SVG */}
      <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-3 relative shadow-inner">
        {history.length < 2 ? (
          <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
            <div className="p-3 bg-slate-900 rounded-full text-slate-500 mb-2.5 border border-slate-800 animate-pulse">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-300 font-sans font-medium">Brak punktów historycznych do rysowania trendu</p>
            <p className="text-[10px] text-slate-500 max-w-[280px] mt-1 font-sans">
              Klikaj <strong>"Zapisz punkt"</strong> podczas zmian kursu STS, albo uruchom <strong>Symulację Live</strong>, która automatycznie loguje skoki kursów co minutę.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Wykres Responsive SVG */}
            <div className="w-full h-[200px]">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
                {/* Grid Lines pionowe (minuty) */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const mVal = Math.round(minMin + (spanMin * i) / 4);
                  const x = getX(mVal);
                  return (
                    <g key={`v-grid-${i}`}>
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={paddingTop + chartHeight}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={height - 10}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {mVal}'
                      </text>
                    </g>
                  );
                })}

                {/* Grid Lines poziome (kursy) */}
                {Array.from({ length: 4 }).map((_, i) => {
                  const oVal = Number((minOdds + (spanOdds * i) / 3).toFixed(1));
                  const y = getY(oVal);
                  return (
                    <g key={`h-grid-${i}`}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={width - paddingRight}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="end"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {oVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Linie trendu */}
                <path d={path1} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d={pathX} fill="none" stroke="#64748b" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" />
                <path d={path2} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Interaktywne punkty historyczne */}
                {history.map((h, idx) => {
                  const x = getX(h.minuta);
                  const y1 = getY(h.kurs1);
                  const yX = getY(h.kurs_x);
                  const y2 = getY(h.kurs2);

                  return (
                    <g key={`points-${idx}`}>
                      {/* Hover Area / Invisible Target bar */}
                      <rect
                        x={x - 8}
                        y={paddingTop}
                        width="16"
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredPoint(h)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />

                      {/* Dot dla Gospodarza (Zielony) */}
                      <circle
                        cx={x}
                        cy={y1}
                        r={hoveredPoint?.minuta === h.minuta ? "5" : "3.5"}
                        fill="#022c22"
                        stroke="#10b981"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />

                      {/* Dot dla Remisu (Slate) */}
                      <circle
                        cx={x}
                        cy={yX}
                        r={hoveredPoint?.minuta === h.minuta ? "4.5" : "3"}
                        fill="#0f172a"
                        stroke="#64748b"
                        strokeWidth="1.5"
                        className="transition-all duration-150"
                      />

                      {/* Dot dla Gościa (Niebieski) */}
                      <circle
                        cx={x}
                        cy={y2}
                        r={hoveredPoint?.minuta === h.minuta ? "5" : "3.5"}
                        fill="#0c4a6e"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        className="transition-all duration-150"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Legenda wykresu */}
            <div className="flex items-center justify-center gap-5 text-[10px] text-slate-400 font-medium font-sans pt-1 border-t border-slate-900">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                Gospodarz (1)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></span>
                Remis (X)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]"></span>
                Gość (2)
              </span>
            </div>
          </div>
        )}

        {/* Dynamiczny dymek tooltipu z hoverem */}
        {hoveredPoint && (
          <div className="absolute top-4 right-4 bg-slate-950/95 border border-slate-800 rounded-lg p-2.5 shadow-xl text-[10px] text-slate-300 font-mono space-y-1 z-10 animate-fadeIn min-w-[140px]">
            <div className="text-slate-400 border-b border-slate-900 pb-1 flex justify-between font-bold">
              <span>⏱️ Minuta: {hoveredPoint.minuta}'</span>
              <span className="text-emerald-400">{hoveredPoint.gole1}:{hoveredPoint.gole2}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gospodarz (1):</span>
              <strong className="text-emerald-400">{hoveredPoint.kurs1.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Remis (X):</span>
              <strong className="text-slate-400">{hoveredPoint.kurs_x.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Gość (2):</span>
              <strong className="text-sky-400">{hoveredPoint.kurs2.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Aktualny komunikat trendu */}
      {history.length >= 2 && (
        <div className={`rounded-xl border p-3.5 transition-all duration-300 ${
          assessment.status === 'IDEALNY' && assessment.rekomendacja.includes('TREND')
            ? 'bg-emerald-950/45 border-emerald-500/40 text-emerald-300 animate-pulse'
            : 'bg-slate-950/50 border-slate-850 text-slate-300'
        }`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className={`w-4 h-4 ${
              assessment.status === 'IDEALNY' && assessment.rekomendacja.includes('TREND') ? 'text-emerald-400 animate-bounce' : 'text-slate-400'
            }`} />
            <span className="text-xs font-bold uppercase tracking-wider">Wynik Analizy Trendu STS</span>
          </div>
          <p className="text-xs leading-relaxed font-sans">
            {assessment.status === 'IDEALNY' && assessment.rekomendacja.includes('TREND') ? (
              assessment.opis
            ) : (
              `Zarejestrowano ${history.length} skoków kursowych. Obecnie kursy faworyta nie wykazują wystarczającego skoku spadkowego połączonego ze stagnacją, aby wygenerować alert wejścia o ultra-niskim ryzyku. Kontynuuj monitorowanie meczu.`
            )}
          </p>
        </div>
      )}

      {/* Tabela historyczna */}
      {history.length > 0 && (
        <div className="border border-slate-850/60 rounded-xl overflow-hidden bg-slate-950/30">
          <div className="p-2.5 bg-slate-950 border-b border-slate-850/80 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Zarejestrowane Skoki Kursowe ({history.length})
          </div>
          <div className="max-h-[160px] overflow-y-auto divide-y divide-slate-850/50 font-mono text-[11px]">
            {history.map((h, idx) => (
              <div key={`hist-row-${idx}`} className="p-2.5 hover:bg-slate-900/40 flex items-center justify-between gap-2 transition duration-150">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9.5px] font-bold">
                    {h.minuta}'
                  </span>
                  <span className="text-slate-500">Wynik:</span>
                  <span className="text-slate-300 font-bold">{h.gole1}:{h.gole2}</span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-emerald-500 font-semibold">{h.kurs1.toFixed(2)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-slate-400">{h.kurs_x.toFixed(2)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-sky-500 font-semibold">{h.kurs2.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePoint(idx)}
                    className="p-1 hover:bg-red-950/40 rounded text-slate-500 hover:text-red-400 transition cursor-pointer"
                    title="Usuń ten punkt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
