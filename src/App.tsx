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
import { MasterSummaryWidget } from './components/MasterSummaryWidget';
import { EditMatchModal } from './components/EditMatchModal';

import AnalysisPanel from './components/AnalysisPanel';
import StatsHistory from './components/StatsHistory';
import AiAnalysisView from './components/AiAnalysisView';
import IntelligentNotifications from './components/IntelligentNotifications';
import { AddMatchModal } from './components/AddMatchModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { UserProfileModal } from './components/UserProfileModal';
import { fetchRealMatchesSafe, fetchAiAnalysisSafe } from './utils/apiService';
import { generateMatchAlerts } from './utils/notificationUtils';
import { Key, X, Plus, ShieldCheck, Sparkles, SlidersHorizontal, BarChart3, Radio, Trash2, RotateCcw } from 'lucide-react';


export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Wczytywanie stanu meczów z LocalStorage (czysta lista na starcie, brak wymuszonego autoloadu)
  const [matches, setMatches] = useState<LiveMatch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Usunięcie starych zaślepek
          const filtered = parsed.filter((m: LiveMatch) => m.id !== 'montevideo-match-74' && !m.id?.includes('montevideo'));
          if (filtered.length > 0) {
            return filtered.map((m: LiveMatch) => ({
              ...m,
              startingPreMatchProbs: m.startingPreMatchProbs || uzyskaj_pre_match_proby(m)
            }));
          }
        }
      } catch (e) {
        console.error("Błąd parsowania meczów z localStorage:", e);
      }
    }
    // Domyślnie czysta, pusta lista bez losowych zaślepek
    return [];
  });

  const [bankrollSettings, setBankrollSettings] = useState<BankrollSettings>(() => {
    const defaultBankroll: BankrollSettings = {
      initial: 50.00,
      strategy: 'percent',
      parameter: 2,
    };
    const saved = localStorage.getItem('asystent_live_bet_bankroll');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Reset / sanitacja starych wartości
          const isOldOrInvalid = !parsed.initial || parsed.initial === 1000 || parsed.initial >= 10000;
          return {
            initial: isOldOrInvalid ? 50.00 : Number(parsed.initial),
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
  const [editingMatch, setEditingMatch] = useState<LiveMatch | null>(null);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Real API integration
  const [fetchingReal, setFetchingReal] = useState(false);
  const [fetchApiError, setFetchApiError] = useState<string | null>(null);
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
    let bal = bankrollSettings.initial || 50.00;
    try {
      const resolved = matches.filter(m => m.status === 'wygrany' || m.status === 'przegrany');
      resolved.forEach(m => {
        const odd = m.kursZalecany || 1.8;
        let stake = m.betPlaced?.stake;
        if (typeof stake !== 'number' || stake <= 0) {
          stake = bankrollSettings.strategy === 'flat' 
            ? Math.min(bal, bankrollSettings.parameter) 
            : Math.max(1, Math.round(bal * (bankrollSettings.parameter / 100) * 100) / 100);
        }
        if (stake > bal) stake = bal;
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
  }, [bankrollSettings, matches]);

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

  const handleDeleteMatch = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMatches(prev => {
      const updated = prev.filter(m => m.id !== id);
      if (selectedMatchId === id) {
        setSelectedMatchId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  };

  const handleFetchRealMatches = async () => {
    setFetchingReal(true);
    setFetchApiError(null);
    try {
      const res = await fetchRealMatchesSafe(footballApiKey);
      if (res.error) {
        setFetchApiError(res.error);
      }
      if (res.matches && res.matches.length > 0) {
        setApiFetchedMatches(res.matches);
        setMatches(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newToAdd = res.matches.filter(m => !existingIds.has(m.id));
          const combined = [...prev, ...newToAdd];
          return combined;
        });
        if (!selectedMatchId && res.matches.length > 0) {
          setSelectedMatchId(res.matches[0].id);
        }
        const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLastFetched(nowStr);
        localStorage.setItem('asystent_live_bet_last_fetched', nowStr);
      }
    } catch (e: any) {
      setFetchApiError(e.message || "Błąd pobierania danych z API");
    } finally {
      setFetchingReal(false);
    }
  };

  const handleTriggerAiAnalysis = async (matchId: string) => {
    const m = matches.find(item => item.id === matchId);
    if (!m) return;

    setAnalyzingMatchId(matchId);
    setAiError(null);

    try {
      const analysis = await fetchAiAnalysisSafe(m, footballApiKey);
      const textResult = analysis.analysis || analysis.error || 'Brak analizy AI';
      setMatches(prev => prev.map(item => {
        if (item.id === matchId) {
          return {
            ...item,
            aiAnaliza: textResult
          };
        }
        return item;
      }));
    } catch (err: any) {
      setAiError(err.message || 'Błąd generowania analizy Gemini AI.');
    } finally {
      setAnalyzingMatchId(null);
    }
  };

  const activeAlerts = useMemo(() => generateMatchAlerts(matches), [matches]);
  const activeNotificationsCount = activeAlerts.length;

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
          activeNotificationsCount={activeNotificationsCount}
          balance={currentBalance}
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
              {/* GŁÓWNY PANEL PODSUMOWUJĄCY (MASTER SUMMARY WIDGET) NA SAMEJ GÓRZE DASHBOARDU */}
              {selectedMatch && (
                <MasterSummaryWidget
                  match={selectedMatch}
                  bankrollSettings={bankrollSettings}
                  matches={matches}
                  onUpdateMatch={handleUpdateMatch}
                  onOpenEditModal={(m) => setEditingMatch(m)}
                  onTriggerAiAnalysis={handleTriggerAiAnalysis}
                  isAiLoading={analyzingMatchId === selectedMatch.id}
                />
              )}

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
                      <LivePitchMap 
                        match={selectedMatch} 
                        onDeleteMatch={handleDeleteMatch}
                        onEditMatch={(m) => setEditingMatch(m)}
                      />

                      {/* Miniatura statystyk (Possession, Pressure Index, Shots, Line of Stagnation, Wave Timeline) */}
                      <MatchPitchStats match={selectedMatch} />
                    </div>
                  ) : (
                    <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-8 sm:p-12 text-center text-slate-400 space-y-4 shadow-xl">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-2">
                        <Radio className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Brak Aktywnych Meczów w Panelu</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                          Dodaj nowy mecz ręcznie z formularza lub pobierz bieżące spotkania z zewnętrznego API piłkarskiego.
                        </p>
                      </div>

                      {fetchApiError && (
                        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center justify-center gap-2 max-w-lg mx-auto">
                          <span>{fetchApiError}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                        <button
                          onClick={() => setShowAddMatchModal(true)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Dodaj mecz ręcznie</span>
                        </button>
                        <button
                          onClick={handleFetchRealMatches}
                          disabled={fetchingReal}
                          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-sky-950/40 disabled:opacity-50"
                        >
                          {fetchingReal ? (
                            <>
                              <RotateCcw className="w-4 h-4 animate-spin text-sky-200" />
                              <span>Pobieranie z API...</span>
                            </>
                          ) : (
                            <>
                              <Radio className="w-4 h-4 text-sky-200" />
                              <span>Pobierz mecze z API</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setShowApiModal(true)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                        >
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>Klucz API Football-Data</span>
                        </button>
                      </div>
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
                    onDeleteMatch={handleDeleteMatch}
                    onEditMatch={(m) => setEditingMatch(m)}
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
          {currentTab === 'analytics' && (
            <div className="animate-fadeIn">
              {selectedMatch ? (
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
              ) : (
                <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                  <p>Wybierz lub dodaj mecz, aby wyświetlić zaawansowane modele matematyczne.</p>
                  <button
                    onClick={() => setShowAddMatchModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Dodaj nowy mecz
                  </button>
                </div>
              )}
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

        </main>
      </div>

      {/* MODAL EDYCYJNY KLUCZA API */}
      {showApiModal && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-[#0b131e] border border-slate-850 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-850 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">Klucz API Football-Data.org</h3>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Wprowadź darmowy klucz z serwisów piłkarskich (np. football-data.org) aby pobierać rzeczywiste mecze na żywo.
              </p>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Twój Klucz API:</label>
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
                onClick={() => {
                  setShowApiModal(false);
                  handleFetchRealMatches();
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center gap-1.5"
              >
                <span>Zapisz i Pobierz Mecze</span>
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
        apiKey={footballApiKey}
      />

      {/* Modal edycji istniejącego meczu */}
      <EditMatchModal
        isOpen={Boolean(editingMatch)}
        match={editingMatch}
        onClose={() => setEditingMatch(null)}
        onUpdateMatch={handleUpdateMatch}
      />

      {/* Centrum Powiadomień Live */}
      <NotificationCenterModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        matches={matches}
        onSelectMatch={handleSelectMatch}
        selectedMatchId={selectedMatchId}
      />

      {/* Modal profilu typera */}
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
