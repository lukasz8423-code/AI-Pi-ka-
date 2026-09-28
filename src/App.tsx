import React, { useState, useEffect, useMemo } from 'react';
import { LiveMatch, BankrollSettings, OddsHistoryEntry } from './types';
import { INITIAL_MATCHES } from './data/mockMatches';
import { uzyskaj_pre_match_proby } from './utils/bettingCalc';
import { STORAGE_KEY, API_KEY_STORAGE_KEY } from './utils/constants';

import { AppSidebar } from './components/AppSidebar';
import { AppTopHeader } from './components/AppTopHeader';
import { LivePitchMap } from './components/LivePitchMap';
import { MatchPitchStats } from './components/MatchPitchStats';
import { GoldenBettingHero } from './components/GoldenBettingHero';
import { CompactMatchListView } from './components/CompactMatchListView';

import AnalysisPanel from './components/AnalysisPanel';
import StatsHistory from './components/StatsHistory';
import AiAnalysisView from './components/AiAnalysisView';
import IntelligentNotifications from './components/IntelligentNotifications';
import { AddMatchModal } from './components/AddMatchModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { UserProfileModal } from './components/UserProfileModal';
import { fetchRealMatchesSafe, fetchAiAnalysisSafe } from './utils/apiService';
import { Key, X, Plus, ShieldCheck, Sparkles, SlidersHorizontal, BarChart3, Radio } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Wczytywanie stanu meczów z LocalStorage lub mocków
  const [matches, setMatches] = useState<LiveMatch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: LiveMatch) => {
            if (!m.startingPreMatchProbs) {
              return {
                ...m,
                startingPreMatchProbs: uzyskaj_pre_match_proby(m)
              };
            }
            return m;
          });
        }
      } catch (e) {
        console.error("Błąd parsowania meczów z localStorage:", e);
      }
    }
    
    return INITIAL_MATCHES.map(m => {
      if (!m.startingPreMatchProbs) {
        return {
          ...m,
          startingPreMatchProbs: uzyskaj_pre_match_proby(m)
        };
      }
      return m;
    });
  });

  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>(() => {
    const defaultBankroll: BankrollSettings = {
      initial: 1000,
      strategy: 'percent',
      parameter: 2,
    };
    const saved = localStorage.getItem('asystent_live_bet_bankroll');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            initial: parsed.initial || 1000,
            strategy: parsed.strategy || 'percent',
            parameter: parsed.parameter || 2
          };
        }
      } catch (e) {
        console.error("Błąd parsowania bankrollu:", e);
      }
    }
    return defaultBankroll;
  });

  useEffect(() => {
    localStorage.setItem('asystent_live_bet_bankroll', JSON.stringify(bankrollSettings));
  }, [bankrollSettings]);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(() => {
    return matches[0]?.id || null;
  });

  const [pinnedMatchIds, setPinnedMatchIds] = useState<string[]>([]);
  const [analyzingMatchId, setAnalyzingMatchId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAddMatchModal, setShowAddMatchModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Real API integration
  const [fetchingReal, setFetchingReal] = useState(false);
  const [apiFetchedMatches, setApiFetchedMatches] = useState<LiveMatch[]>([]);
  const [lastFetched, setLastFetched] = useState<string | null>(() => {
    return localStorage.getItem('asystent_live_bet_last_fetched') || null;
  });
  const [footballApiKey, setFootballApiKey] = useState<string>(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  });
  const [showApiModal, setShowApiModal] = useState(false);

  useEffect(() => {
    localStorage.setItem(API_KEY_STORAGE_KEY, footballApiKey);
  }, [footballApiKey]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  }, [matches]);

  const handleAddCustomMatch = (newMatch: LiveMatch) => {
    setMatches(prev => [newMatch, ...prev]);
    setSelectedMatchId(newMatch.id);
  };

  // Pobranie bieżącego salda
  const currentBalance = useMemo(() => {
    let bal = bankrollSettings.initial;
    try {
      const resolved = matches.filter(m => m.status === 'wygrany' || m.status === 'przegrany');
      resolved.forEach(m => {
        const odd = m.kursZalecany || 1.8;
        const stake = m.betPlaced?.stake ?? 100;
        if (m.status === 'wygrany') {
          bal += stake * (odd - 1);
        } else if (m.status === 'przegrany') {
          bal -= stake;
        }
      });
    } catch (e) {
      console.error("Błąd salda:", e);
    }
    return Math.round(bal * 100) / 100;
  }, [bankrollSettings.initial, matches]);

  // Aktualnie wybrany mecz
  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) return matches[0] || null;
    return matches.find(m => m.id === selectedMatchId) || matches[0] || null;
  }, [matches, selectedMatchId]);

  // Filtrowanie meczów przez wyszukiwarkę
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const q = searchQuery.toLowerCase();
    return matches.filter(m => 
      m.gospodarz.toLowerCase().includes(q) || 
      m.gosc.toLowerCase().includes(q) ||
      m.notatki?.toLowerCase().includes(q)
    );
  }, [matches, searchQuery]);

  const handleSelectMatch = (id: string) => {
    setSelectedMatchId(id);
    setAiError(null);
  };

  const handleUpdateMatch = (updated: LiveMatch) => {
    setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleFetchRealMatches = async () => {
    if (fetchingReal) return;
    setFetchingReal(true);
    try {
      const result = await fetchRealMatchesSafe(footballApiKey, true);
      if (result.matches && result.matches.length > 0) {
        setApiFetchedMatches(result.matches);
        setMatches(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newOnes = result.matches.filter((m: LiveMatch) => !ids.has(m.id));
          return [...newOnes, ...prev];
        });
        const timeStr = new Date().toLocaleTimeString('pl-PL');
        setLastFetched(timeStr);
        localStorage.setItem('asystent_live_bet_last_fetched', timeStr);
      }
    } catch (err) {
      console.warn("Informacja o pobieraniu meczy:", err);
    } finally {
      setFetchingReal(false);
    }
  };

  const handleTriggerAiAnalysis = async (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;
    setAnalyzingMatchId(matchId);
    setAiError(null);
    try {
      const { analysis, error } = await fetchAiAnalysisSafe(targetMatch);
      if (error) {
        setAiError(error);
      } else if (analysis) {
        handleUpdateMatch({
          ...targetMatch,
          aiAnaliza: analysis
        });
      }
    } catch (e: any) {
      setAiError(e.message || "Błąd generowania analizy AI");
    } finally {
      setAnalyzingMatchId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b11] text-slate-100 flex flex-col lg:flex-row antialiased font-sans">
      {/* 1. WĄSKI PANEL BOCZNY (Lewa kolumna) */}
      <AppSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        balance={currentBalance}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* 2. GŁÓWNA PRZESTRZEŃ APLIKACJI */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Górny Header */}
        <AppTopHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSettings={() => setShowApiModal(true)}
          onOpenNotifications={() => setShowNotificationsModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
          isApiActive={true}
          activeNotificationsCount={3}
        />

        {/* Zawartość zależna od wybranej zakładki */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {/* Inteligentne Powiadomienia w tle */}
          <IntelligentNotifications
            matches={matches}
            onSelectMatch={handleSelectMatch}
            selectedMatchId={selectedMatchId}
          />

          {currentTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Główny układ Dashboardu z podziałem na Main Match View i Złote Okno Obstawiania */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* SEKCJA ANALIZY MECZU (Środek / Lewo w Gridzie: 7 kolumn) */}
                <div className="xl:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold font-display text-slate-100 flex items-center gap-2">
                      <span>Main Match View</span>
                    </h2>

                    {selectedMatch && (
                      <button
                        onClick={() => handleTriggerAiAnalysis(selectedMatch.id)}
                        disabled={analyzingMatchId === selectedMatch.id}
                        className="flex items-center gap-1.5 bg-sky-950/70 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-xs px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <Sparkles className={`w-3.5 h-3.5 text-sky-400 ${analyzingMatchId === selectedMatch.id ? 'animate-spin' : ''}`} />
                        <span>{analyzingMatchId === selectedMatch.id ? 'Generowanie...' : 'Analiza AI Gemini'}</span>
                      </button>
                    )}
                  </div>

                  {selectedMatch ? (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Live Match Map - 2D Boisko piłkarskie ze strefami taktycznymi */}
                      <LivePitchMap match={selectedMatch} />

                      {/* Miniatura statystyk (Possession, Pressure Index, Shots, Line of Stagnation, Wave Timeline) */}
                      <MatchPitchStats match={selectedMatch} />
                    </div>
                  ) : (
                    <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-12 text-center text-slate-400">
                      Wybierz mecz z listy, aby wyświetlić analizę na żywo.
                    </div>
                  )}
                </div>

                {/* PRAWA STRONA: ZŁOTE OKNO OBSTAWIANIA + KOMPAKTOWA LISTA MECZÓW (5 kolumn) */}
                <div className="xl:col-span-5 space-y-4">
                  {selectedMatch && (
                    <GoldenBettingHero
                      match={selectedMatch}
                      bankrollSettings={bankrollSettings}
                      matches={matches}
                      onUpdateMatch={handleUpdateMatch}
                    />
                  )}

                  {/* Zwarty podgląd listy meczów i filtrów API */}
                  <CompactMatchListView
                    matches={filteredMatches}
                    apiFetchedMatches={apiFetchedMatches}
                    selectedMatchId={selectedMatchId}
                    pinnedMatchIds={pinnedMatchIds}
                    onSelectMatch={handleSelectMatch}
                    onFetchRealMatches={handleFetchRealMatches}
                    fetchingReal={fetchingReal}
                    onOpenAddMatchModal={() => setShowAddMatchModal(true)}
                  />
                </div>
              </div>

              {/* Dodatkowe raporty AI dla wybranego meczu, jeśli wygenerowano */}
              {selectedMatch && selectedMatch.aiAnaliza && (
                <div className="mt-6">
                  <AiAnalysisView
                    analysis={selectedMatch.aiAnaliza}
                    loading={analyzingMatchId === selectedMatch.id}
                    error={analyzingMatchId === selectedMatch.id ? aiError : null}
                    matchName={`${selectedMatch.gospodarz} - ${selectedMatch.gosc}`}
                    match={selectedMatch}
                  />
                </div>
              )}
            </div>
          )}

          {/* Zakładka: Analytics & Zaawansowane Modele */}
          {currentTab === 'analytics' && selectedMatch && (
            <div className="animate-fadeIn">
              <AnalysisPanel
                match={selectedMatch}
                matches={matches}
                onUpdateMatch={handleUpdateMatch}
                onTriggerAiAnalysis={handleTriggerAiAnalysis}
                aiLoading={analyzingMatchId === selectedMatch.id}
                bankrollSettings={bankrollSettings}
                onOpenAddMatchForm={() => setShowAddMatchModal(true)}
                lastFetched={lastFetched}
              />
            </div>
          )}

          {/* Zakładka: Exports & Historia Zakładów */}
          {currentTab === 'exports' && (
            <div className="animate-fadeIn">
              <StatsHistory
                matches={matches}
                bankrollSettings={bankrollSettings}
                onUpdateBankrollSettings={setBankrollSettings}
              />
            </div>
          )}

          {/* Zakładka: Filtry / Wszystkie mecze */}
          {currentTab === 'filtry' && (
            <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-6 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-sky-400" />
                  Zarządzanie Meczami i Filtrami
                </h2>
                <button
                  onClick={handleFetchRealMatches}
                  disabled={fetchingReal}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {fetchingReal ? 'Pobieranie...' : 'Pobierz mecze z API'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {matches.map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMatchId(m.id);
                      setCurrentTab('dashboard');
                    }}
                    className="bg-[#0e1724] border border-slate-800 hover:border-sky-500 p-4 rounded-xl cursor-pointer transition shadow-md"
                  >
                    <div className="flex justify-between text-xs text-slate-400 mb-2 font-mono">
                      <span className="text-emerald-400 font-bold">Minuta {m.minuta}'</span>
                      <span>@{m.kursZalecany || m.kurs1}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-100">{m.gospodarz} {m.gole1} : {m.gole2} {m.gosc}</div>
                    <div className="text-xs text-slate-400 mt-2 line-clamp-2">{m.notatki || 'Brak notatek'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zakładka: Morning / Live Monitoring */}
          {currentTab === 'morning' && (
            <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-6 space-y-4 animate-fadeIn">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                Live Match Tracker & Monitoring Poranny
              </h2>
              <p className="text-xs text-slate-400">
                Wszystkie aktywne spotkania monitorowane w czasie rzeczywistym przez algorytm wykrywania Złotych Okien.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.filter(m => m.status === 'niesprawdzony').map(m => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMatchId(m.id);
                      setCurrentTab('dashboard');
                    }}
                    className="p-4 rounded-xl bg-[#0e1724] border border-slate-800 hover:border-emerald-500/70 transition cursor-pointer"
                  >
                    <div className="flex justify-between text-xs text-emerald-400 font-bold mb-2">
                      <span>LIVE {m.minuta}'</span>
                      <span className="text-slate-300">EV: {((m.evZalecane || 0.05) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="text-sm font-bold text-slate-200">{m.gospodarz} vs {m.gosc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Zakładka: Settings / Bankroll & Config */}
          {currentTab === 'settings' && (
            <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-6 space-y-6 animate-fadeIn max-w-2xl">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                Ustawienia Bankrollu & Strategii Stawek
              </h2>

              <div className="space-y-4 bg-[#0e1724] p-5 rounded-xl border border-slate-800">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Kapitał początkowy (PLN):</label>
                  <input
                    type="number"
                    value={bankrollSettings.initial}
                    onChange={(e) => setBankrollSettings(prev => ({ ...prev, initial: Math.max(10, parseFloat(e.target.value) || 1000) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Strategia doboru stawki:</label>
                  <select
                    value={bankrollSettings.strategy}
                    onChange={(e) => setBankrollSettings(prev => ({ ...prev, strategy: e.target.value as any }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500"
                  >
                    <option value="percent">Procent kapitału (%)</option>
                    <option value="kelly">Kryterium Kelly'ego (Fractional)</option>
                    <option value="flat">Stała stawka kwotowa (PLN)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">
                    {bankrollSettings.strategy === 'percent' ? 'Procent bankrollu na zakład (%)' : bankrollSettings.strategy === 'kelly' ? 'Mnożnik ułamkowy Kelly (np. 0.5 lub 1)' : 'Stała stawka (PLN)'}:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={bankrollSettings.parameter}
                    onChange={(e) => setBankrollSettings(prev => ({ ...prev, parameter: Math.max(0.1, parseFloat(e.target.value) || 2) }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal konfiguracji klucza API */}
      {showApiModal && (
        <div 
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setShowApiModal(false)}
        >
          <div 
            className="bg-[#0b131e] border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Konfiguracja API Meczów Live
              </h3>
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Wprowadź swój darmowy klucz API (np. z Football-Data.org lub API-Football), aby pobierać mecze z całego świata w czasie rzeczywistym.
              </p>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Klucz API (X-Auth-Token / X-API-Key):
                </label>
                <input
                  type="text"
                  value={footballApiKey}
                  onChange={(e) => setFootballApiKey(e.target.value)}
                  placeholder="Wklej swój klucz API..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal dodawania nowego meczu */}
      <AddMatchModal
        isOpen={showAddMatchModal}
        onClose={() => setShowAddMatchModal(false)}
        onAddMatch={handleAddCustomMatch}
      />

      {/* Centrum Powiadomień Live (Dzwonek / Czerwona 3) */}
      <NotificationCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        matches={matches}
        onSelectMatch={handleSelectMatch}
        selectedMatchId={selectedMatchId}
      />

      {/* Modal profilu typera i zarządzania saldem bankrollu */}
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        bankrollSettings={bankrollSettings}
        onUpdateBankrollSettings={setBankrollSettings}
        matches={matches}
        currentBalance={currentBalance}
      />
    </div>
  );
}
