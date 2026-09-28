import React, { useState, useEffect } from 'react';
import { LiveMatch, BankrollSettings, OddsHistoryEntry } from './types';
import { INITIAL_MATCHES } from './data/mockMatches';
import MatchList, { checkHasValuebet } from './components/MatchList';
import StatsHistory from './components/StatsHistory';
import AnalysisPanel from './components/AnalysisPanel';
import AiAnalysisView from './components/AiAnalysisView';
import IntelligentNotifications from './components/IntelligentNotifications';
import { recalculateMatchRecommendation } from './utils/matchRecommendation';
import { uzyskaj_pre_match_proby } from './utils/bettingCalc';
import QRCodeDisplay from './components/QRCodeDisplay';
import { Trophy, Sparkles, Activity, ShieldCheck, Heart, Zap, Key, X, Sun, Moon } from 'lucide-react';
import { STORAGE_KEY, API_KEY_STORAGE_KEY } from './utils/constants';

export default function App() {
  // Stan motywu: ciemny (domyślny) / jasny
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('asystent_live_bet_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark'; // domyślnie ciemny
  });

  useEffect(() => {
    localStorage.setItem('asystent_live_bet_theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Wczytywanie początkowego stanu z LocalStorage lub mocków z automatycznym sprzątaniem
  const [matches, setMatches] = useState<LiveMatch[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          // Usuwamy mecze starsze niż 72h, a te starsze niż 12h na żywo przenosimy do rozliczonych (jako anulowany)
          const cleaned = parsed
            .filter((m: any) => {
              if (!m || typeof m !== 'object') return false;
              if (!m.dataDodania) return true;
              const addedTime = new Date(m.dataDodania).getTime();
              return (now - addedTime) < 72 * 60 * 60 * 1000; // 3 dni max
            })
            .map((m: LiveMatch) => {
              let copy = { ...m };
              if (copy.status === 'niesprawdzony' && copy.dataDodania) {
                const addedTime = new Date(copy.dataDodania).getTime();
                if (now - addedTime > 12 * 60 * 60 * 1000) { // 12 godzin max na żywo
                  copy = { ...copy, status: 'anulowany' as const };
                }
              }
              if (!copy.startingPreMatchProbs) {
                copy = {
                  ...copy,
                  startingPreMatchProbs: uzyskaj_pre_match_proby(copy)
                };
              }
              return copy;
            });
          return cleaned;
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
      parameter: 2, // Domyślnie 2% kapitału
    };
    const saved = localStorage.getItem('asystent_live_bet_bankroll');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          typeof parsed === 'object' &&
          typeof parsed.initial === 'number' &&
          !isNaN(parsed.initial) &&
          ['flat', 'percent', 'kelly'].includes(parsed.strategy) &&
          typeof parsed.parameter === 'number' &&
          !isNaN(parsed.parameter)
        ) {
          return {
            initial: parsed.initial,
            strategy: parsed.strategy,
            parameter: parsed.parameter
          };
        }
      } catch (e) {
        console.error("Błąd parsowania bankrollu z localStorage:", e);
      }
    }
    return defaultBankroll;
  });

  // Zapisywanie bankrollSettings do LocalStorage
  useEffect(() => {
    localStorage.setItem('asystent_live_bet_bankroll', JSON.stringify(bankrollSettings));
  }, [bankrollSettings]);

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [pinnedMatchIds, setPinnedMatchIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('asystent_live_bet_pinned');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string');
        }
      } catch (e) {
        console.error("Błąd parsowania przypiętych meczów:", e);
      }
    }
    return [];
  });
  const [analyzingMatchId, setAnalyzingMatchId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Stany integracji z realnym API i klucz użytkownika
  const [fetchingReal, setFetchingReal] = useState(false);
  const [fetchError, setFetchError] = useState<{ message: string; code?: string } | null>(null);
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
    localStorage.setItem('asystent_live_bet_pinned', JSON.stringify(pinnedMatchIds));
  }, [pinnedMatchIds]);

  // Zapisywanie meczów do LocalStorage na każdą zmianę stanu
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matches));
  }, [matches]);

  // Ustawienie domyślnie wybranego meczu przy starcie
  useEffect(() => {
    if (!selectedMatchId && matches.length > 0) {
      const active = matches.filter(m => m.status === 'niesprawdzony');
      if (active.length > 0) {
        setSelectedMatchId(active[0].id);
      } else {
        setSelectedMatchId(matches[0].id);
      }
    }
  }, [matches, selectedMatchId]);

  // Pobranie aktualnie wybranego obiektu meczu
  // Wybrany mecz przez kliknięcie użytkownika ma najwyższy priorytet
  const selectedMatch = matches.find(m => m.id === selectedMatchId) || null;

  // Handlery modyfikacji danych
  const handleSelectMatch = (id: string) => {
    setSelectedMatchId(id);
    setAiError(null);
    // Jeśli meczu nie ma w głównej liście roboczej (jest tylko w API), dodajmy go
    if (!matches.some(m => m.id === id)) {
      const apiMatch = apiFetchedMatches.find(m => m.id === id);
      if (apiMatch) {
        setMatches(prev => [apiMatch, ...prev]);
      }
    }
  };
  
  const togglePinMatch = (id: string) => {
    const isPinned = pinnedMatchIds.includes(id);
    if (!isPinned) {
      // Przy przypinaniu upewnij się, że mecz jest w głównej liście roboczej
      if (!matches.some(m => m.id === id)) {
        const apiMatch = apiFetchedMatches.find(m => m.id === id);
        if (apiMatch) {
          setMatches(prev => [apiMatch, ...prev]);
        }
      }
    }
    setPinnedMatchIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const handleAddMatch = (matchData: Omit<LiveMatch, 'id' | 'dataDodania' | 'status'>) => {
    const initialEntry: OddsHistoryEntry = {
      minuta: matchData.minuta,
      kurs1: matchData.kurs1,
      kurs_x: matchData.kurs_x,
      kurs2: matchData.kurs2,
      gole1: matchData.gole1,
      gole2: matchData.gole2,
      timestamp: new Date().toISOString()
    };

    const newMatch: LiveMatch = {
      ...matchData,
      id: Math.random().toString(36).substring(2, 11),
      dataDodania: new Date().toISOString(),
      status: 'niesprawdzony',
      oddsHistory: matchData.oddsHistory && matchData.oddsHistory.length > 0 
        ? matchData.oddsHistory 
        : [initialEntry]
    };
    setMatches(prev => [newMatch, ...prev]);
    setSelectedMatchId(newMatch.id);
  };

  const handleAddFromApi = (match: LiveMatch) => {
    const initialEntry: OddsHistoryEntry = {
      minuta: match.minuta,
      kurs1: match.kurs1,
      kurs_x: match.kurs_x,
      kurs2: match.kurs2,
      gole1: match.gole1,
      gole2: match.gole2,
      timestamp: new Date().toISOString()
    };

    const matchWithHistory: LiveMatch = {
      ...match,
      oddsHistory: match.oddsHistory && match.oddsHistory.length > 0 ? match.oddsHistory : [initialEntry]
    };

    setMatches(prev => {
      if (prev.find(m => m.id === match.id)) return prev;
      return [matchWithHistory, ...prev];
    });
    setSelectedMatchId(match.id);
  };

  const handleUpdateMatch = (updatedMatch: LiveMatch) => {
    setMatches(prev => prev.map(m => {
      if (m.id !== updatedMatch.id) return m;

      const minuteChanged = m.minuta !== updatedMatch.minuta;
      const scoreChanged = m.gole1 !== updatedMatch.gole1 || m.gole2 !== updatedMatch.gole2;
      const oddsChanged = m.kurs1 !== updatedMatch.kurs1 || m.kurs_x !== updatedMatch.kurs_x || m.kurs2 !== updatedMatch.kurs2;

      let newHistory = updatedMatch.oddsHistory ? [...updatedMatch.oddsHistory] : (m.oddsHistory ? [...m.oddsHistory] : []);

      if (newHistory.length === 0) {
        newHistory.push({
          minuta: m.minuta,
          kurs1: m.kurs1,
          kurs_x: m.kurs_x,
          kurs2: m.kurs2,
          gole1: m.gole1,
          gole2: m.gole2,
          timestamp: new Date().toISOString()
        });
      } else if (minuteChanged || scoreChanged || oddsChanged) {
        const lastEntry = newHistory[newHistory.length - 1];
        // Prosta weryfikacja: jeśli ta sama minuta, nadpisujemy ostatni wpis; jeśli zmieniła się minuta lub wynik, dodajemy nowy wpis.
        if (lastEntry.minuta === updatedMatch.minuta) {
          newHistory[newHistory.length - 1] = {
            minuta: updatedMatch.minuta,
            kurs1: updatedMatch.kurs1,
            kurs_x: updatedMatch.kurs_x,
            kurs2: updatedMatch.kurs2,
            gole1: updatedMatch.gole1,
            gole2: updatedMatch.gole2,
            timestamp: new Date().toISOString()
          };
        } else {
          newHistory.push({
            minuta: updatedMatch.minuta,
            kurs1: updatedMatch.kurs1,
            kurs_x: updatedMatch.kurs_x,
            kurs2: updatedMatch.kurs2,
            gole1: updatedMatch.gole1,
            gole2: updatedMatch.gole2,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Ograniczamy historię kursów do ostatnich 80 wpisów (ochrona pamięci i localStorage)
      if (newHistory.length > 80) {
        newHistory = newHistory.slice(-80);
      }

      return {
        ...updatedMatch,
        oddsHistory: newHistory
      };
    }));
  };

  const handleUpdateStatus = (id: string, status: LiveMatch['status']) => {
    setMatches(prev => prev.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status,
          ostatniZapisGoli1: m.gole1,
          ostatniZapisGoli2: m.gole2
        };
      }
      return m;
    }));
  };

  const handleDeleteMatch = (id: string) => {
    setMatches(prev => prev.filter(m => m.id !== id));
    if (selectedMatchId === id) {
      setSelectedMatchId(null);
    }
  };

  const handleClearAllMatches = () => {
    // Zachowaj tylko mecze, które są przypięte (ich ID znajduje się w pinnedMatchIds)
    setMatches(prev => prev.filter(m => pinnedMatchIds.includes(m.id)));
    // Jeśli aktualnie wybrany mecz nie jest przypięty (zostanie usunięty), odznacz go
    if (selectedMatchId && !pinnedMatchIds.includes(selectedMatchId)) {
      setSelectedMatchId(null);
    }
  };

  // Obsługa zapytania do Gemini AI za pośrednictwem serwera Express
  const handleTriggerAiAnalysis = async (prompt: string) => {
    if (!selectedMatchId) return;
    const targetMatchId = selectedMatchId;
    setAnalyzingMatchId(targetMatchId);
    setAiError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
      const response = await fetch(`${baseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Serwer zwrócił kod błędu podczas analizy.');
      }

      // Aktualizacja pola aiAnaliza w wybranym meczu
      setMatches(prev => prev.map(m => {
        if (m.id === targetMatchId) {
          return {
            ...m,
            aiAnaliza: data.analysis
          };
        }
        return m;
      }));
    } catch (err: any) {
      console.error("AI Analysis integration error:", err);
      setAiError(err.message || 'Nie udało się połączyć z serwerem analizy Gemini.');
    } finally {
      setAnalyzingMatchId(null);
    }
  };

  // Funkcja pobierania realnych meczów ze strony football-data.org za pomocą serwera
  const handleFetchRealMatches = async () => {
    setFetchingReal(true);
    setFetchError(null);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
      const response = await fetch(`${baseUrl}/api/real-matches`, {
        headers: {
          'X-API-Key': footballApiKey
        }
      });
      
      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        throw { message: `Błąd serwera: Serwer zwrócił nieprawidłowy format odpowiedzi (status ${response.status}).` };
      }
      
      if (!response.ok) {
        const errorMsg = data.details 
          ? `${data.error} - Szczegóły: ${data.details}`
          : (data.error || 'Nie udało się pobrać prawdziwych meczów.');
        throw { message: errorMsg, code: data.code };
      }

      const realMatches: LiveMatch[] = data.matches;
      if (!realMatches || realMatches.length === 0) {
        throw { message: 'Brak dostępnych meczów z dzisiejszego dnia w darmowej strefie.' };
      }

      // Połącz z obecnymi meczami unikając duplikatów po ID
      setApiFetchedMatches(realMatches);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastFetched(timeStr);
      localStorage.setItem('asystent_live_bet_last_fetched', timeStr);

      // Jeśli to były mecze demonstracyjne, dajemy użytkownikowi informację w stanie
      if (data.isDemo) {
        const isKeyProvided = Boolean(footballApiKey && footballApiKey.trim().length > 0);
        setFetchError({
          message: isKeyProvided && data.error
            ? `Błąd zewnętrznych API: ${data.error}`
            : "Pobrano mecze demonstracyjne (brak klucza FOOTBALL_API_KEY).",
          code: "DEMO_MODE"
        });
      }
    } catch (err: any) {
      console.error("Error fetching real matches:", err);
      setFetchError({
        message: err.message || 'Nieznany błąd podczas pobierania realnych meczów.',
        code: err.code
      });
    } finally {
      setFetchingReal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app-root-wrapper">
      {/* Pasek nawigacji u samej góry */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 md:px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Logo i Tytuł */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold tracking-tight text-slate-100 flex items-center gap-2">
                Asystent Live Bet AI
                <span className="text-[10px] bg-emerald-950/50 border border-emerald-800/50 text-emerald-400 font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                  v2.0 PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-sans">
                Profesjonalny kalkulator EV zasilany Gemini AI
              </p>
            </div>
          </div>

          {/* Status Systemu */}
          <div className="flex items-center gap-2 text-xs flex-wrap justify-center sm:justify-end">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-full p-2 text-slate-300 hover:text-emerald-400 cursor-pointer transition-all duration-300 flex items-center justify-center shadow-sm"
              title={theme === 'dark' ? 'Przełącz na tryb jasny (stadionowy)' : 'Przełącz na tryb ciemny (nocny)'}
              id="theme-toggle-btn"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-600" />
              )}
            </button>
            <button
              onClick={() => setShowApiModal(true)}
              className="bg-slate-950 border border-slate-800 hover:border-emerald-500/50 rounded-full px-4 py-1.5 text-slate-300 font-mono flex items-center gap-2 cursor-pointer transition-all duration-300"
              title="Konfiguruj klucz API do pobierania prawdziwych meczów"
            >
              <Key className={`w-3.5 h-3.5 ${footballApiKey ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span>{footballApiKey ? 'API AKTYWNE' : 'API KONFIGURUJ'}</span>
            </button>
            <div className="bg-slate-950 border border-slate-800 rounded-full px-4 py-1.5 text-slate-400 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              AI: ONLINE
            </div>
          </div>
        </div>
      </header>

      {/* Główna sekcja robocza */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Widget globalnych statystyk portfela zakładów */}
        <StatsHistory 
          matches={matches} 
          bankrollSettings={bankrollSettings}
          onUpdateBankrollSettings={setBankrollSettings}
        />

        {/* Inteligentne Powiadomienia o Sygnałach Live */}
        <IntelligentNotifications 
          matches={matches}
          onSelectMatch={handleSelectMatch}
          selectedMatchId={selectedMatchId}
        />

        {/* Sekcja: Sidebar meczów + Panel Roboczy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Kolumna Lewa: Lista meczów i sterowanie listą */}
          <div className="lg:col-span-4 xl:col-span-3 min-w-0 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg h-[520px] sm:h-[600px] lg:h-[800px] lg:sticky lg:top-[85px] flex flex-col">
            <MatchList
              matches={matches}
              apiFetchedMatches={apiFetchedMatches}
              onAddFromApi={handleAddFromApi}
              selectedMatchId={selectedMatchId}
              pinnedMatchIds={pinnedMatchIds}
              onTogglePinMatch={togglePinMatch}
              onSelectMatch={handleSelectMatch}
              onAddMatch={handleAddMatch}
              onDeleteMatch={handleDeleteMatch}
              onUpdateStatus={handleUpdateStatus}
              onFetchRealMatches={handleFetchRealMatches}
              fetchingReal={fetchingReal}
              fetchError={fetchError}
              footballApiKey={footballApiKey}
              onUpdateFootballApiKey={setFootballApiKey}
              showForm={showAddForm}
              onShowFormChange={setShowAddForm}
              onClearAllMatches={handleClearAllMatches}
            />
          </div>
 
          {/* Kolumna Prawa: Formularz kontroli, rozkład matematyczny i analizy AI */}
          <div className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-6">
            {selectedMatch ? (
              <div key={selectedMatch.id} className="space-y-6 animate-fadeIn">
                {/* 1. Panel Analizy Probabilistycznej i Kursów */}
                <AnalysisPanel
                  match={selectedMatch}
                  matches={matches}
                  onUpdateMatch={handleUpdateMatch}
                  onTriggerAiAnalysis={handleTriggerAiAnalysis}
                  aiLoading={analyzingMatchId === selectedMatch.id}
                  bankrollSettings={bankrollSettings}
                  onOpenAddMatchForm={() => setShowAddForm(true)}
                  lastFetched={lastFetched}
                />

                {/* 2. Dedykowany podgląd szczegółowego raportu AI */}
                <AiAnalysisView
                  analysis={selectedMatch.aiAnaliza}
                  loading={analyzingMatchId === selectedMatch.id}
                  error={analyzingMatchId === selectedMatch.id ? aiError : null}
                  matchName={`${selectedMatch.gospodarz} - ${selectedMatch.gosc}`}
                  match={selectedMatch}
                />
              </div>
            ) : (
              <div className="text-center py-12 px-6 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <p className="text-slate-400 font-medium">Wybierz mecz z listy po lewej stronie, aby wyświetlić konsolę analityczną.</p>
                <p className="text-xs text-slate-500">Możesz też przypiąć mecze pinezką, aby zawsze były widoczne na samej górze.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Stopka */}
      <footer className="border-t border-slate-850 bg-slate-900/40 py-5 px-4 mt-12 text-center text-xs text-slate-500 font-sans">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Asystent matematyczno-probabilistyczny. Hazard wiąże się z ryzykiem uzależnienia i utraty kapitału. Graj rozważnie.</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center gap-1 justify-center">
              <span>Stworzone przy użyciu</span>
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
              <span>dla typerów zakładów na żywo</span>
            </div>
            <QRCodeDisplay />
          </div>
        </div>
      </footer>

      {/* Modal konfiguracji klucza API */}
      {showApiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Konfiguracja klucza Football-Data.org
              </h3>
              <button
                onClick={() => setShowApiModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Asystent pozwala na pobieranie rzeczywistych dzisiejszych meczów piłkarskich bezpośrednio z zewnętrznej bazy danych. Wymagany jest darmowy klucz API.
              </p>
              
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-100 mb-1 text-[11px] uppercase tracking-wide">Jak zdobyć klucz?</p>
                <p>1. Wejdź na stronę <a href="https://www.football-data.org/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">football-data.org</a></p>
                <p>2. Zarejestruj darmowe konto (trwa to 30 sekund)</p>
                <p>3. Otrzymany klucz API wklej poniżej</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Twój klucz API (X-Auth-Token):
                </label>
                <input
                  type="text"
                  value={footballApiKey}
                  onChange={(e) => setFootballApiKey(e.target.value)}
                  placeholder="np. a1b2c3d4e5f6..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>
            </div>
            <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setFootballApiKey('');
                  setShowApiModal(false);
                }}
                className="px-3.5 py-1.5 text-xs text-red-400 hover:text-red-300 font-medium transition cursor-pointer"
              >
                Wyczyść klucz
              </button>
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition shadow-md shadow-emerald-950/20 cursor-pointer"
              >
                Zapisz i zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
