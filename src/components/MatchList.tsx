import React, { useState } from 'react';
import { LiveMatch } from '../types';
import { Trash2, Plus, Check, X, AlertTriangle, Play, HelpCircle, Trophy, Globe, RefreshCw, Wifi, AlertCircle, Zap, Pin, PinOff, ChevronDown, ChevronUp, Filter, Settings, SlidersHorizontal } from 'lucide-react';
import { przelicz_prawdopodobienstwa, wygladz_prawdopodobienstwa, oblicz_wartosci_zakladow, pobierz_i_opisz_staty, oblicz_pressure_index, obliczSugerowanyWynikMatematycznie, ocenOptymalneWejscie, uzyskaj_pre_match_proby } from '../utils/bettingCalc';

// Pomocnicza funkcja do sprawdzania, czy mecz ma valuebet
export function checkHasValuebet(m: LiveMatch): { hasValue: boolean; bestOutcome?: '1' | 'X' | '2'; bestEv?: number; bestOdd?: number } {
  try {
    const preProbs = uzyskaj_pre_match_proby(m);
    const fairProbs = wygladz_prawdopodobienstwa(
      m.gospodarz,
      m.gosc,
      m.gole1,
      m.gole2,
      m.minuta,
      preProbs.p1,
      preProbs.px,
      preProbs.p2,
      m.czerwoneKartki1,
      m.czerwoneKartki2,
      m.strzaly1,
      m.strzaly2,
      m.strzalyCelne1,
      m.strzalyCelne2,
      m.zolteKartki1,
      m.zolteKartki2
    );
    const evBets = oblicz_wartosci_zakladow(m.kurs1, m.kurs_x, m.kurs2, fairProbs.p1, fairProbs.px, fairProbs.p2);
    
    // Filtrujemy tylko dodatnie valuebety (> 2%) i sortujemy od najlepszego
    const positiveBets = evBets.filter(b => b.isPositive).sort((a, b) => b.ev - a.ev);
    if (positiveBets.length > 0) {
      return {
        hasValue: true,
        bestOutcome: positiveBets[0].outcome as '1' | 'X' | '2',
        bestEv: Math.round(positiveBets[0].ev * 100),
        bestOdd: positiveBets[0].odd
      };
    }
  } catch (err) {
    console.error("Error in checkHasValuebet:", err);
  }
  return { hasValue: false };
}

interface MatchListProps {
  matches: LiveMatch[];
  apiFetchedMatches: LiveMatch[];
  onAddFromApi: (match: LiveMatch) => void;
  selectedMatchId: string | null;
  pinnedMatchIds: string[];
  onTogglePinMatch: (id: string) => void;
  onSelectMatch: (id: string) => void;
  onAddMatch: (match: Omit<LiveMatch, 'id' | 'dataDodania' | 'status'>) => void;
  onDeleteMatch: (id: string) => void;
  onUpdateStatus: (id: string, status: LiveMatch['status']) => void;
  onFetchRealMatches?: () => void;
  fetchingReal?: boolean;
  fetchError?: { message: string; code?: string } | null;
  footballApiKey?: string;
  onUpdateFootballApiKey?: (key: string) => void;
  showForm?: boolean;
  onShowFormChange?: (show: boolean) => void;
  onClearAllMatches?: () => void;
}

export default function MatchList({
  matches,
  apiFetchedMatches,
  onAddFromApi,
  selectedMatchId,
  pinnedMatchIds,
  onTogglePinMatch,
  onSelectMatch,
  onAddMatch,
  onDeleteMatch,
  onUpdateStatus,
  onFetchRealMatches,
  fetchingReal = false,
  fetchError = null,
  footballApiKey = '',
  onUpdateFootballApiKey = () => {},
  showForm: controlledShowForm,
  onShowFormChange,
  onClearAllMatches,
}: MatchListProps) {
  const [localShowForm, setLocalShowForm] = useState(false);
  
  const showForm = controlledShowForm !== undefined ? controlledShowForm : localShowForm;
  const setShowForm = (val: boolean) => {
    if (onShowFormChange) {
      onShowFormChange(val);
    } else {
      setLocalShowForm(val);
    }
  };
  
  // Stan nowego meczu
  const [gospodarz, setGospodarz] = useState('');
  const [gosc, setGosc] = useState('');
  const [gole1, setGole1] = useState(0);
  const [gole2, setGole2] = useState(0);
  const [minuta, setMinuta] = useState(1);
  const [kurs1, setKurs1] = useState('2.0');
  const [kurs_x, setKursX] = useState('3.2');
  const [kurs2, setKurs2] = useState('3.5');
  const [strzaly1, setStrzaly1] = useState<number | undefined>(undefined);
  const [strzaly2, setStrzaly2] = useState<number | undefined>(undefined);
  const [czerwoneKartki1, setCzerwoneKartki1] = useState(0);
  const [czerwoneKartki2, setCzerwoneKartki2] = useState(0);
  const [zolteKartki1, setZolteKartki1] = useState(0);
  const [zolteKartki2, setZolteKartki2] = useState(0);
  const [notatki, setNotatki] = useState('');
  const [isLiveOdds, setIsLiveOdds] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submit triggered", { gospodarz, gosc, gole1, gole2 });
    if (!gospodarz || !gosc) {
      alert("Proszę uzupełnić nazwy obu drużyn (gospodarz i gość).");
      return;
    }
    const parsedKurs1 = parseFloat(kurs1.replace(',', '.')) || 2.0;
    const parsedKursX = parseFloat(kurs_x.replace(',', '.')) || 3.2;
    const parsedKurs2 = parseFloat(kurs2.replace(',', '.')) || 3.5;

    console.log("Validation passed, calling onAddMatch");
    onAddMatch({
      gospodarz,
      gosc,
      gole1: Number(gole1),
      gole2: Number(gole2),
      minuta: Number(minuta),
      kurs1: parsedKurs1,
      kurs_x: parsedKursX,
      kurs2: parsedKurs2,
      strzaly1: strzaly1 !== undefined ? Number(strzaly1) : undefined,
      strzaly2: strzaly2 !== undefined ? Number(strzaly2) : undefined,
      czerwoneKartki1: Number(czerwoneKartki1),
      czerwoneKartki2: Number(czerwoneKartki2),
      zolteKartki1: Number(zolteKartki1),
      zolteKartki2: Number(zolteKartki2),
      notatki,
      isLiveOdds,
    });
    console.log("onAddMatch called");
    // Reset form
    setGospodarz('');
    setGosc('');
    setGole1(0);
    setGole2(0);
    setMinuta(1);
    setKurs1('2.0');
    setKursX('3.2');
    setKurs2('3.5');
    setStrzaly1(undefined);
    setStrzaly2(undefined);
    setCzerwoneKartki1(0);
    setCzerwoneKartki2(0);
    setZolteKartki1(0);
    setZolteKartki2(0);
    setNotatki('');
    setIsLiveOdds(false);
    setShowForm(false);
  };

  const [filterOnlyValuebets, setFilterOnlyValuebets] = useState(false);
  const [filterOnlyRedCards, setFilterOnlyRedCards] = useState(false);
  const [filterOnlyYellowCards, setFilterOnlyYellowCards] = useState(false);
  
  // Toggles for collapsible layout sections to optimize vertical height
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const activeMatches = matches.filter(m => m.status === 'niesprawdzony');
  
  let filteredActiveMatches = activeMatches;
  if (filterOnlyValuebets) {
    filteredActiveMatches = filteredActiveMatches.filter(m => m.id === selectedMatchId || checkHasValuebet(m).hasValue);
  }
  if (filterOnlyRedCards) {
    filteredActiveMatches = filteredActiveMatches.filter(m => m.id === selectedMatchId || (m.czerwoneKartki1 || 0) > 0 || (m.czerwoneKartki2 || 0) > 0);
  }
  if (filterOnlyYellowCards) {
    filteredActiveMatches = filteredActiveMatches.filter(m => m.id === selectedMatchId || (m.zolteKartki1 || 0) > 0 || (m.zolteKartki2 || 0) > 0);
  }
  const archivedMatches = matches.filter(m => m.status !== 'niesprawdzony');

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800" id="match-list-container">
      {/* Nagłówek */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-display font-semibold text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="truncate">Lista meczów</span>
          </h2>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-400 font-sans truncate">Mecze na żywo i archiwalne</p>
            {onClearAllMatches && matches.length > 0 && (
              <button
                type="button"
                onClick={onClearAllMatches}
                className="text-[9px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 px-1.5 py-0.5 rounded cursor-pointer"
                title="Usuń wszystkie mecze i wyczyść pamięć podręczną"
              >
                <Trash2 className="w-2.5 h-2.5" />
                <span>Wyczyść bazę</span>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition duration-200 shrink-0 shadow-lg shadow-emerald-950/30"
          id="btn-add-match-toggle"
          title="Dodaj nowy mecz ręcznie"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj mecz ręcznie</span>
        </button>
      </div>

      {/* Pasek sterowania: Filtry i Konfiguracja API (Kompaktowy, harmonijkowy panel oszczędzający miejsce) */}
      <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800 flex gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            setShowFilters(!showFilters);
            setShowApiSettings(false);
          }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
            showFilters 
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
              : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filtry {filterOnlyValuebets || filterOnlyRedCards || filterOnlyYellowCards ? '•' : ''}</span>
          {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        
        {onFetchRealMatches && (
          <button
            type="button"
            onClick={() => {
              setShowApiSettings(!showApiSettings);
              setShowFilters(false);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${
              showApiSettings 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                : 'bg-slate-950/20 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Pobierz API</span>
            {showApiSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* 1. Rozwijany Panel Integracji z Realnym API */}
      {onFetchRealMatches && showApiSettings && (
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2.5 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Konfiguracja API Football-Data
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <label className="text-slate-400 font-medium">Twój Klucz API:</label>
              {footballApiKey ? (
                <span className="text-[9px] text-emerald-400 font-bold">ZAPISANO W PRZEGLĄDARCE</span>
              ) : (
                <span className="text-[9px] text-slate-500">Brak (Tryb Demo)</span>
              )}
            </div>
            <div className="flex gap-1.5">
              <input
                type="password"
                placeholder="Wklej klucz z football-data.org..."
                value={footballApiKey}
                onChange={(e) => onUpdateFootballApiKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded px-2.5 py-1.5 text-xs text-slate-200 outline-none font-mono transition-colors"
              />
              {footballApiKey && (
                <button
                  type="button"
                  onClick={() => onUpdateFootballApiKey('')}
                  className="px-2.5 py-1.5 text-[10px] bg-red-950/40 hover:bg-red-950 border border-red-900/40 rounded text-red-400 cursor-pointer transition font-semibold"
                  title="Usuń klucz"
                >
                  Usuń
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onFetchRealMatches}
            disabled={fetchingReal}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-2 transition duration-150 select-none ${
              fetchingReal
                ? 'bg-slate-900 border-slate-850 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500/30 text-white cursor-pointer shadow-md shadow-emerald-950/30'
            }`}
          >
            {fetchingReal ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Pobieranie prawdziwych meczów...
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                Pobierz Prawdziwe Mecze
              </>
            )}
          </button>

          {fetchError && (
            fetchError.code === "DEMO_MODE" ? (
              <div className="p-2.5 rounded-lg bg-emerald-950/45 border border-emerald-900/35 text-[10px] text-emerald-300 leading-normal space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Tryb demonstracyjny</span>
                </div>
                <p className="text-slate-300">{fetchError.message}</p>
                <div className="pt-1.5 border-t border-emerald-900/20 text-slate-400 leading-relaxed">
                  Aby zasilanie meczami było automatyczne, dodaj klucz <span className="font-bold text-white bg-slate-900 px-1 rounded font-mono">FOOTBALL_API_KEY</span> w <span className="font-bold text-white">AI Studio &gt; Settings &gt; Secrets</span>.
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-900/40 text-[10px] text-red-400 leading-normal space-y-2">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span>Błąd integracji z API</span>
                </div>
                <p className="text-slate-300">{fetchError.message}</p>
                
                {footballApiKey && (
                  <button
                    type="button"
                    onClick={() => onUpdateFootballApiKey('')}
                    className="w-full py-1.5 bg-red-950/60 hover:bg-red-900/45 border border-red-900/60 hover:border-red-600 text-red-300 rounded font-semibold text-[10px] transition cursor-pointer"
                  >
                    Wyczyść błędny klucz i włącz Tryb Demo
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* 2. Rozwijany Panel Filtry i Smart Alerts */}
      {showFilters && (
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-2.5 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-1.5">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
              Filtry i Smart Alerts
            </span>
            {activeMatches.filter(m => checkHasValuebet(m).hasValue).length > 0 && (
              <span className="text-[9px] text-amber-400 font-bold bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Okazje: {activeMatches.filter(m => checkHasValuebet(m).hasValue).length} 🔥
              </span>
            )}
          </div>

          {/* 1. Valuebets */}
          <div className="flex items-center justify-between text-[11px] py-0.5">
            <span className="text-slate-300 font-medium flex items-center gap-1">🔥 Pokaż tylko okazje EV &gt; 2%</span>
            <button
              type="button"
              onClick={() => setFilterOnlyValuebets(!filterOnlyValuebets)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filterOnlyValuebets ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filterOnlyValuebets ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Red Cards */}
          <div className="flex items-center justify-between text-[11px] py-0.5">
            <span className="text-slate-300 font-medium flex items-center gap-1">🟥 Pokaż tylko z czerwoną kartką</span>
            <button
              type="button"
              onClick={() => setFilterOnlyRedCards(!filterOnlyRedCards)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filterOnlyRedCards ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filterOnlyRedCards ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3. Yellow Cards */}
          <div className="flex items-center justify-between text-[11px] py-0.5">
            <span className="text-slate-300 font-medium flex items-center gap-1">🟨 Pokaż tylko z żółtą kartką</span>
            <button
              type="button"
              onClick={() => setFilterOnlyYellowCards(!filterOnlyYellowCards)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                filterOnlyYellowCards ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  filterOnlyYellowCards ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Informacyjny pasek aktywnych filtrów (widoczny tylko gdy cokolwiek filtrujemy) */}
      {(filterOnlyValuebets || filterOnlyRedCards || filterOnlyYellowCards) && (
        <div className="bg-amber-950/80 border-b border-amber-900/50 px-4 py-1.5 flex items-center justify-between text-[10px] text-amber-300 shrink-0">
          <span className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            Mecze są filtrowane
          </span>
          <button
            type="button"
            onClick={() => {
              setFilterOnlyValuebets(false);
              setFilterOnlyRedCards(false);
              setFilterOnlyYellowCards(false);
            }}
            className="text-[10px] font-bold underline text-amber-400 hover:text-amber-200 cursor-pointer"
          >
            Pokaż wszystkie ({matches.filter(m => m.status === 'niesprawdzony').length})
          </button>
        </div>
      )}

      {/* Przewijalna lista meczów */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 overscroll-y-contain scrollbar-thin" id="scrollable-matches-list">

        {/* Sekcja: Mecze na żywo */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2 pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Pobrane z API ({apiFetchedMatches.length})
            </span>
          </div>
          <div className="space-y-1.5 mb-4">
             {apiFetchedMatches.map(m => {
               const alreadyAdded = matches.some(match => match.id === m.id);
               const isSelected = m.id === selectedMatchId;
               return (
                   <div 
                     key={m.id} 
                     onClick={() => {
                       if (alreadyAdded) {
                         onSelectMatch(m.id);
                       } else {
                         onAddFromApi(m);
                       }
                     }}
                     className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all duration-200 ${
                       isSelected 
                         ? 'bg-slate-800 border-emerald-500/60 shadow-md shadow-emerald-950/20 text-slate-100 font-bold' 
                         : 'bg-slate-950 hover:bg-slate-900 border-slate-850 hover:border-slate-700 text-slate-300'
                     }`}
                   >
                     <span className="truncate font-medium pr-2">{m.gospodarz} - {m.gosc}</span>
                     <div className="flex items-center gap-1">
                       {alreadyAdded && (
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             onTogglePinMatch(m.id);
                           }}
                           className={`p-1 rounded transition ${
                             pinnedMatchIds.includes(m.id) ? 'text-amber-400 bg-amber-950/50' : 'text-slate-500 hover:text-slate-300'
                           }`}
                           title={pinnedMatchIds.includes(m.id) ? 'Odpinij mecz' : 'Przypnij mecz'}
                         >
                           {pinnedMatchIds.includes(m.id) ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                         </button>
                       )}
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (!alreadyAdded) onAddFromApi(m);
                         }} 
                         className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition shrink-0 ${
                           alreadyAdded 
                             ? 'bg-slate-800 text-slate-500 cursor-default' 
                             : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-400'
                         }`}
                         disabled={alreadyAdded}
                       >
                         {alreadyAdded ? <><Check className="w-3 h-3" /> Zapisano</> : <><Plus className="w-3 h-3" /> Dodaj do listy</>}
                       </button>
                     </div>
                   </div>
               );
             })}
          </div>

          {/* Sekcja: Przypięte mecze */}
          {pinnedMatchIds.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  Przypięte mecze ({pinnedMatchIds.filter(id => matches.some(m => m.id === id)).length})
                </span>
              </div>
              <div className="space-y-2">
                {matches
                  .filter(m => pinnedMatchIds.includes(m.id))
                  .map((m) => {
                    const isSelected = m.id === selectedMatchId;
                    const pressure = oblicz_pressure_index(m);
                    return (
                      <div
                        key={`pinned-${m.id}`}
                        id={`pinned-card-${m.id}`}
                        onClick={() => onSelectMatch(m.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 group relative ${
                          isSelected
                            ? pressure.isHot
                              ? 'bg-slate-800 border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/30'
                              : 'bg-slate-800 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/20'
                            : pressure.isHot
                              ? 'bg-red-950/20 border-red-900/60 hover:bg-red-950/35 hover:border-red-500 shadow-sm shadow-red-950/25 ring-1 ring-red-500/10'
                              : 'bg-slate-950 border-slate-850 hover:bg-slate-800/60 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-display font-medium text-[10px] text-amber-400 flex items-center gap-1.5 flex-wrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                            Minuta {m.minuta}'
                            <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded flex items-center gap-0.5 font-mono ${
                              pressure.isHot 
                                ? 'bg-red-900/40 text-red-400 border border-red-850/40 animate-pulse' 
                                : pressure.value >= 60 
                                ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20' 
                                : 'bg-slate-900 text-slate-500'
                            }`} title={`Pressure Index: ${pressure.value}%`}>
                              🔥 {pressure.value}%
                            </span>
                            {(() => {
                              const assessment = ocenOptymalneWejscie(m);
                              if (assessment.status === 'IDEALNY') {
                                return (
                                  <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.2 rounded tracking-wider flex items-center gap-0.5 animate-pulse">
                                    ⏱️ ZAGRAJ TERAZ 🔥
                                  </span>
                                );
                              }
                              if (assessment.status === 'DOBRY') {
                                return (
                                  <span className="bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[8px] font-bold px-1.5 py-0.2 rounded tracking-wider flex items-center gap-0.5">
                                    ⏱️ DOBRY MOMENT
                                  </span>
                                );
                              }
                              if (assessment.status === 'POCZEKAJ') {
                                return (
                                  <span className="bg-amber-950/35 border border-amber-500/20 text-amber-500 text-[8px] font-medium px-1.5 py-0.2 rounded tracking-wider">
                                    ⏱️ CZEKAJ DO 65'
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onTogglePinMatch(m.id);
                              }}
                              className="p-1 rounded transition text-amber-400 bg-amber-950/50 hover:bg-slate-850 hover:text-slate-300"
                              title="Odpinij mecz"
                            >
                              <PinOff className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center my-1.5">
                          <div className="text-xs font-semibold truncate text-slate-100 max-w-[110px]">{m.gospodarz}</div>
                          <div className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px] font-mono font-bold text-amber-400 mx-2 flex flex-col items-center justify-center min-w-[45px]">
                            <span>{m.gole1} : {m.gole2}</span>
                          </div>
                          <div className="text-xs font-semibold truncate text-slate-100 max-w-[110px] text-right">{m.gosc}</div>
                        </div>

                        {m.typZalecany && (
                          <div className="mt-2 text-[10px] bg-amber-950/15 border border-amber-500/10 rounded-lg p-1.5 text-amber-200/90 text-center font-medium flex items-center justify-center gap-1">
                            <span>Sugerowany:</span>
                            <strong className="text-white font-bold bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/30 text-[10px]">{m.typZalecany}</strong>
                            {m.evZalecane !== undefined && (
                              m.evZalecane > 0 ? (
                                <span className="text-amber-400 font-mono text-[9px] bg-amber-900/20 px-1 rounded">
                                  EV: +{Math.round(m.evZalecane * 100)}%
                                </span>
                              ) : (
                                <span className="text-sky-400 font-sans text-[8px] font-bold bg-sky-900/20 px-1 rounded border border-sky-800/20 uppercase tracking-wide">
                                  SPORT
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <div className="border-b border-slate-800/80 my-4"></div>
            </div>
          )}

          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Na Żywo ({filteredActiveMatches.length}) {filterOnlyValuebets && "(Okazje)"}
            </span>
          </div>

          {filteredActiveMatches.length === 0 ? (
            <div className="p-4 text-center rounded-lg border border-dashed border-slate-800 text-slate-500 text-xs py-6">
              {filterOnlyValuebets 
                ? "Brak aktywnych okazji o dodatnim EV w tej chwili."
                : "Brak meczów na żywo. Dodaj mecz przyciskiem \"+\" u góry."}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredActiveMatches.map((m) => {
                const isSelected = m.id === selectedMatchId;
                const pressure = oblicz_pressure_index(m);
                return (
                  <div
                    key={m.id}
                    id={`match-card-${m.id}`}
                    onClick={() => onSelectMatch(m.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 group relative ${
                      isSelected
                        ? pressure.isHot
                          ? 'bg-slate-800 border-red-500/80 shadow-lg shadow-red-950/40 ring-1 ring-red-500/30'
                          : 'bg-slate-800 border-emerald-500/60 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20'
                        : pressure.isHot
                          ? 'bg-red-950/20 border-red-900/60 hover:bg-red-950/35 hover:border-red-500 shadow-sm shadow-red-950/25 ring-1 ring-red-500/10'
                          : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800/80 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-display font-medium text-xs text-slate-400 flex items-center gap-1.5 flex-wrap">
                        <Play className="w-2.5 h-2.5 text-red-500 animate-pulse fill-red-500" />
                        Minuta {m.minuta}'
                        <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          pressure.isHot 
                            ? 'bg-red-900/30 text-red-400 border border-red-800/50 animate-pulse' 
                            : pressure.value >= 60 
                            ? 'bg-amber-950/50 text-amber-400 border border-amber-900/30' 
                            : 'bg-slate-950 text-slate-500'
                        }`} title={`Wskaźnik Tempa (Pressure Index): ${pressure.value}%`}>
                          🔥 {pressure.value}%
                        </span>
                        {(() => {
                          const assessment = ocenOptymalneWejscie(m);
                          if (assessment.status === 'IDEALNY') {
                            return (
                              <span className="bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5 animate-pulse">
                                ⏱️ ZAGRAJ TERAZ 🔥
                              </span>
                            );
                          }
                          if (assessment.status === 'DOBRY') {
                            return (
                              <span className="bg-cyan-950 border border-cyan-500/30 text-cyan-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider flex items-center gap-0.5">
                                ⏱️ DOBRY MOMENT
                              </span>
                            );
                          }
                          if (assessment.status === 'POCZEKAJ') {
                            return (
                              <span className="bg-amber-950/35 border border-amber-500/20 text-amber-500 text-[8px] font-medium px-1.5 py-0.5 rounded tracking-wider">
                                ⏱️ CZEKAJ DO 65'
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {((m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0)) > 0 && (
                          <span className="bg-red-950/80 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5" title={`Czerwone kartki: ${(m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0)}`}>
                            🟥 {(m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0)}
                          </span>
                        )}
                        {((m.zolteKartki1 || 0) + (m.zolteKartki2 || 0)) > 0 && (
                          <span className="bg-amber-950/80 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5" title={`Żółte kartki: ${(m.zolteKartki1 || 0) + (m.zolteKartki2 || 0)}`}>
                            🟨 {(m.zolteKartki1 || 0) + (m.zolteKartki2 || 0)}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinMatch(m.id);
                          }}
                          className={`p-1.5 rounded transition ${
                            pinnedMatchIds.includes(m.id) ? 'text-amber-400 bg-amber-950/50' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                          }`}
                          title={pinnedMatchIds.includes(m.id) ? 'Odpinij mecz' : 'Przypnij mecz'}
                        >
                          {pinnedMatchIds.includes(m.id) ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        {(() => {
                          const valueInfo = checkHasValuebet(m);
                          return valueInfo.hasValue && (
                            <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping"></span>
                              OKAZJA 🔥
                            </span>
                          );
                        })()}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteMatch(m.id);
                          }}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-slate-700 transition duration-150"
                          title="Usuń mecz"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center my-1.5">
                      <div className="text-sm font-semibold truncate text-slate-100 max-w-[130px]">{m.gospodarz}</div>
                      <div className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-xs font-mono font-bold text-emerald-400 mx-2 flex flex-col items-center justify-center min-w-[50px]">
                        <span>{m.gole1} : {m.gole2}</span>
                        {(() => {
                           const { sugerowaneGole1, sugerowaneGole2 } = obliczSugerowanyWynikMatematycznie(
                             m.gole1,
                             m.gole2,
                             m.typZalecany
                           );
                           return <span className="text-[9px] text-slate-500 font-normal">({sugerowaneGole1}:{sugerowaneGole2})</span>;
                        })()}
                      </div>
                      <div className="text-sm font-semibold truncate text-slate-100 max-w-[130px] text-right">{m.gosc}</div>
                    </div>

                    {/* AI Prediction Section */}
                    {m.typZalecany && (
                      <div className="mt-3 text-[11px] bg-emerald-900/10 border border-emerald-500/20 rounded-lg p-2.5 text-emerald-100 font-medium text-center flex items-center justify-center gap-2 shadow-inner">
                        <span className="text-emerald-500 font-bold tracking-wider uppercase text-[10px]">AI Typ:</span>
                        <span className="text-white font-bold text-sm bg-emerald-950/50 px-2 py-0.5 rounded">{m.typZalecany}</span>
                        {m.evZalecane !== undefined && (
                          m.evZalecane > 0 ? (
                            <span className="text-emerald-400 font-mono text-[10px] bg-emerald-900/30 px-1.5 py-0.5 rounded">
                              EV: +{Math.round(m.evZalecane * 100)}%
                            </span>
                          ) : (
                            <span className="text-sky-400 font-sans text-[9px] font-bold bg-sky-900/20 px-1.5 py-0.5 rounded border border-sky-800/20 uppercase tracking-wide">
                              SPORT
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* Szybkie decyzje / rozliczenie zakładu */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Rozlicz zakład:</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(m.id, 'wygrany');
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 hover:bg-emerald-800 hover:text-white transition text-[9px] font-bold"
                          title="Zakład WYGRANY"
                        >
                          WYGRANA
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(m.id, 'przegrany');
                          }}
                          className="px-2 py-0.5 rounded bg-red-950 border border-red-800 text-red-400 hover:bg-red-800 hover:text-white transition text-[9px] font-bold"
                          title="Zakład PRZEGRANY"
                        >
                          PRZEGRANA
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(m.id, 'anulowany');
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition text-[9px] font-medium"
                          title="Zakład ZWROT"
                        >
                          ZWROT
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sekcja: Archiwum / Rozliczone */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2 pt-2 border-t border-slate-800">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              Rozliczone ({archivedMatches.length})
            </span>
          </div>

          {archivedMatches.length === 0 ? (
            <div className="p-3 text-center rounded-lg border border-dashed border-slate-900 text-slate-600 text-[11px] py-4">
              Brak rozliczonych meczów.
            </div>
          ) : (
            <div className="space-y-1.5">
              {archivedMatches.map((m) => {
                const isSelected = m.id === selectedMatchId;
                const isWin = m.status === 'wygrany';
                const isLoss = m.status === 'przegrany';
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMatch(m.id)}
                    className={`p-2 rounded border cursor-pointer text-xs transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800 border-slate-700'
                        : 'bg-slate-950/40 border-slate-900 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isWin && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                      {isLoss && <X className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      {m.status === 'anulowany' && <AlertTriangle className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                      <div className="truncate text-slate-300 min-w-0">
                        <span className="font-medium">{m.gospodarz} - {m.gosc}</span>
                        <span className="text-[10px] font-mono block text-slate-500 mt-0.5">
                          Wynik końcowy: {m.finalnyGospodarz !== undefined ? `${m.finalnyGospodarz}:${m.finalnyGosc}` : `${m.gole1}:${m.gole2}`}
                          {m.finalnyGospodarz !== undefined && ` (Stan live: ${m.gole1}:${m.gole2})`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-2">
                      <span className={`font-mono text-[10px] font-semibold px-1 rounded ${
                        isWin ? 'bg-emerald-950 text-emerald-400' : isLoss ? 'bg-red-950 text-red-400' : 'bg-slate-900 text-slate-400'
                      }`}>
                        {m.status.toUpperCase()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMatch(m.id);
                        }}
                        className="text-slate-600 hover:text-red-400 p-0.5 rounded transition"
                        title="Usuń mecz z archiwum"
                      >
                        <Trash2 className="w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FIXED OVERLAY MODAL: Formularz dodawania nowego meczu ręcznie (zabezpieczony przed przesunięciami na telefonach) */}
      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn" id="add-match-modal-overlay">
          {/* Backdrop click to close */}
          <div className="absolute inset-0 cursor-default" onClick={() => setShowForm(false)}></div>
          
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 z-[160] max-h-[90vh] overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200" id="add-match-modal-container">
            {/* Przycisk zamknięcia */}
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition cursor-pointer"
              title="Zamknij"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSubmit} className="space-y-4" id="add-match-form">
              <div className="border-b border-slate-800 pb-3 mb-2">
                <h3 className="text-base font-display font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-400" />
                  <span>Dodaj mecz ręcznie</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Wprowadź dane na żywo lub przedmeczowe, aby natychmiast wygenerować prognozę probabilistyczną.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Gospodarz (1)</label>
                  <input
                    type="text"
                    placeholder="np. Real Madryt"
                    value={gospodarz}
                    onChange={(e) => setGospodarz(e.target.value)}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-slate-100 placeholder-slate-600 outline-none font-sans transition-colors"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Gość (2)</label>
                  <input
                    type="text"
                    placeholder="np. FC Barcelona"
                    value={gosc}
                    onChange={(e) => setGosc(e.target.value)}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-slate-100 placeholder-slate-600 outline-none font-sans transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Gole (1)</label>
                  <input
                    type="number"
                    min="0"
                    value={gole1}
                    onChange={(e) => setGole1(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Gole (2)</label>
                  <input
                    type="number"
                    min="0"
                    value={gole2}
                    onChange={(e) => setGole2(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Minuta</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={minuta}
                    onChange={(e) => setMinuta(Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-3.5 bg-red-600 rounded-[2px] shadow-sm shadow-red-950"></span>
                    Czerwone kartki (Gospodarz)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={czerwoneKartki1}
                    onChange={(e) => setCzerwoneKartki1(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-3.5 bg-red-600 rounded-[2px] shadow-sm shadow-red-950"></span>
                    Czerwone kartki (Gość)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={czerwoneKartki2}
                    onChange={(e) => setCzerwoneKartki2(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-3.5 bg-yellow-500 rounded-[2px] shadow-sm shadow-yellow-950"></span>
                    Żółte kartki (Gospodarz)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={zolteKartki1}
                    onChange={(e) => setZolteKartki1(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-3.5 bg-yellow-500 rounded-[2px] shadow-sm shadow-yellow-950"></span>
                    Żółte kartki (Gość)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={zolteKartki2}
                    onChange={(e) => setZolteKartki2(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Kurs [1]</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kurs1}
                    onChange={(e) => setKurs1(e.target.value)}
                    placeholder="2.00"
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Kurs [X]</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kurs_x}
                    onChange={(e) => setKursX(e.target.value)}
                    placeholder="3.20"
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase">Kurs [2]</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kurs2}
                    onChange={(e) => setKurs2(e.target.value)}
                    placeholder="3.50"
                    className="w-full bg-slate-950 text-sm border border-slate-800 focus:border-emerald-500 rounded-lg p-3 text-center text-slate-100 outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Przełącznik: Kursy LIVE */}
              <div className="flex items-center justify-between bg-slate-950/40 p-2.5 px-3.5 rounded-lg border border-slate-800/60 text-xs">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isLiveOdds ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></span>
                  Wprowadzane kursy to: <strong className={isLiveOdds ? "text-red-400" : "text-sky-400"}>{isLiveOdds ? "Kursy LIVE na żywo" : "Kursy Przedmeczowe"}</strong>
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isLiveOdds} 
                    onChange={(e) => setIsLiveOdds(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 font-semibold transition duration-150 cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  onMouseDown={(e) => e.preventDefault()}
                  className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm text-white font-bold transition duration-150 cursor-pointer shadow-lg shadow-emerald-950/50"
                  id="btn-submit-new-match"
                >
                  Dodaj Mecz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
