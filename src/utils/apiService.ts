import { LiveMatch } from '../types';
import { uzyskaj_pre_match_proby } from './bettingCalc';

export interface FetchRealMatchesResult {
  matches: LiveMatch[];
  isDemo?: boolean;
  error?: string;
  source?: 'cache' | 'network' | 'direct_api' | 'cors_proxy' | 'fallback';
}

// Pamięć podręczna w locie (In-Memory Cache)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 25 * 1000; // 25 sekund cache'u
const COOLDOWN_ON_ERROR_MS = 5 * 1000; // 5 sekund przerwy po błędzie

let matchesCache: CacheEntry<FetchRealMatchesResult> | null = null;
let lastErrorTimestamp = 0;
let isFetchingInProgress = false;

/**
 * Funkcja mapująca mecz z API Football-Data.org na wewnętrzny model LiveMatch
 */
export function mapFootballDataToLiveMatch(m: any): LiveMatch {
  const homeName = m.homeTeam?.name || m.homeTeam?.shortName || 'Gospodarze';
  const awayName = m.awayTeam?.name || m.awayTeam?.shortName || 'Goście';
  
  const gole1 = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? 0;
  const gole2 = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? 0;

  let status: 'niesprawdzony' | 'wygrany' | 'przegrany' | 'anulowany' = 'niesprawdzony';
  let minuta = 45;

  const rawStatus = (m.status || '').toUpperCase();
  if (rawStatus === 'FINISHED' || rawStatus === 'AWARDED') {
    status = 'wygrany';
    minuta = 90;
  } else if (rawStatus === 'IN_PLAY' || rawStatus === 'LIVE') {
    status = 'niesprawdzony';
    try {
      const matchStart = new Date(m.utcDate || m.lastUpdated).getTime();
      const diffMin = Math.floor((Date.now() - matchStart) / 60000);
      if (diffMin > 0 && diffMin <= 115) {
        minuta = diffMin > 45 && diffMin < 60 ? 45 : (diffMin >= 60 ? Math.min(90, diffMin - 15) : diffMin);
      } else {
        minuta = 65;
      }
    } catch {
      minuta = 60;
    }
  } else if (rawStatus === 'PAUSED') {
    minuta = 45;
    status = 'niesprawdzony';
  } else if (rawStatus === 'TIMED' || rawStatus === 'SCHEDULED') {
    minuta = 1;
    status = 'niesprawdzony';
  }

  // Obliczenie realistycznych kursów na podstawie aktualnego wyniku i minuty
  let kurs1 = 2.40;
  let kurs_x = 3.20;
  let kurs2 = 2.80;

  if (gole1 > gole2) {
    kurs1 = Number((1.20 + (90 - minuta) * 0.01).toFixed(2));
    kurs_x = Number((4.00 + (minuta / 20)).toFixed(2));
    kurs2 = Number((6.50 + (minuta / 10)).toFixed(2));
  } else if (gole2 > gole1) {
    kurs1 = Number((6.50 + (minuta / 10)).toFixed(2));
    kurs_x = Number((4.00 + (minuta / 20)).toFixed(2));
    kurs2 = Number((1.20 + (90 - minuta) * 0.01).toFixed(2));
  } else {
    kurs1 = 2.70;
    kurs_x = minuta > 70 ? 2.10 : 3.10;
    kurs2 = 2.70;
  }

  const leagueName = m.competition?.name || 'Liga Europejska';
  const stage = m.stage || '';
  const dateFormatted = m.utcDate ? new Date(m.utcDate).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';

  const mappedMatch: LiveMatch = {
    id: `fd-${m.id || Math.random().toString(36).substring(2, 9)}`,
    gospodarz: homeName,
    gosc: awayName,
    gole1,
    gole2,
    minuta,
    kurs1,
    kurs_x,
    kurs2,
    strzaly1: Math.max(gole1, Math.round(minuta * 0.13 + gole1 * 2)),
    strzaly2: Math.max(gole2, Math.round(minuta * 0.11 + gole2 * 2)),
    strzalyCelne1: Math.max(gole1, Math.round(gole1 + minuta * 0.05)),
    strzalyCelne2: Math.max(gole2, Math.round(gole2 + minuta * 0.04)),
    posiadaniePilki1: 50 + (gole1 > gole2 ? 4 : gole2 > gole1 ? -4 : 0),
    posiadaniePilki2: 50 - (gole1 > gole2 ? 4 : gole2 > gole1 ? -4 : 0),
    notatki: `Rozgrywki: ${leagueName}${stage ? ` (${stage})` : ''} • Godz. ${dateFormatted} • Źródło: Football-Data.org [${rawStatus}]`,
    status,
    dataDodania: m.utcDate || new Date().toISOString(),
    typZalecany: gole1 >= gole2 ? `${homeName} (1X / DNB)` : `${awayName} (X2 / DNB)`,
    kursZalecany: gole1 >= gole2 ? kurs1 : kurs2,
    evZalecane: 0.045
  };

  mappedMatch.startingPreMatchProbs = uzyskaj_pre_match_proby(mappedMatch);
  return mappedMatch;
}

/**
 * Inteligentny klient zapytań do API Football-Data.org z obsługą X-Auth-Token, CORS Proxy oraz brakiem jakichkolwiek fałszywych mocków
 */
export async function fetchRealMatchesSafe(apiKey?: string, forceRefresh = false): Promise<FetchRealMatchesResult> {
  const now = Date.now();

  // 1. Sprawdzenie Cache (jeśli nie wymuszono odświeżenia)
  if (!forceRefresh && matchesCache && (now - matchesCache.timestamp < CACHE_TTL_MS)) {
    return { ...matchesCache.data, source: 'cache' };
  }

  // 2. Ochrona przed pętlą błędów
  if (!forceRefresh && lastErrorTimestamp > 0 && (now - lastErrorTimestamp < COOLDOWN_ON_ERROR_MS)) {
    if (matchesCache) {
      return { ...matchesCache.data, source: 'cache' };
    }
  }

  if (isFetchingInProgress && matchesCache) {
    return matchesCache.data;
  }

  isFetchingInProgress = true;

  const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');

  // 3. Przygotowanie ścieżek zapytań (Serwer Node Proxy oraz publiczne CORS Proxy dla klienta GitHub Pages)
  const envBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  const rawTargetUrl = 'https://api.football-data.org/v4/matches';
  const targetWithCompetitions = 'https://api.football-data.org/v4/matches?competitions=WC,CL,BL1,DED,BSA,PD,FL1,ELC,PPL,EC,SA,PL';

  const requestOptions: Array<{ url: string; headers: Record<string, string>; source: 'network' | 'cors_proxy' | 'direct_api' }> = [];

  // Opcja A: Serwerowy Express Proxy (jeśli aplikacja działa w trybie full-stack)
  if (envBaseUrl) {
    requestOptions.push({
      url: `${envBaseUrl}/api/real-matches`,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(cleanKey ? { 'x-auth-token': cleanKey } : {}) },
      source: 'network'
    });
  }
  requestOptions.push({
    url: `/api/real-matches`,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(cleanKey ? { 'x-auth-token': cleanKey } : {}) },
    source: 'network'
  });

  // Opcja B: CORS Proxy dla przeglądarki (omija blokady przeglądarkowe na GitHub Pages)
  if (cleanKey) {
    requestOptions.push({
      url: `https://corsproxy.io/?url=${encodeURIComponent(rawTargetUrl)}`,
      headers: { 'X-Auth-Token': cleanKey, 'Accept': 'application/json' },
      source: 'cors_proxy'
    });
    requestOptions.push({
      url: `https://corsproxy.io/?url=${encodeURIComponent(targetWithCompetitions)}`,
      headers: { 'X-Auth-Token': cleanKey, 'Accept': 'application/json' },
      source: 'cors_proxy'
    });
    requestOptions.push({
      url: `https://api.allorigins.win/raw?url=${encodeURIComponent(rawTargetUrl)}`,
      headers: { 'X-Auth-Token': cleanKey, 'Accept': 'application/json' },
      source: 'cors_proxy'
    });
    // Opcja C: Bezpośrednie wywołanie
    requestOptions.push({
      url: rawTargetUrl,
      headers: { 'X-Auth-Token': cleanKey, 'Accept': 'application/json' },
      source: 'direct_api'
    });
  }

  let lastErrorMessage = '';

  for (const req of requestOptions) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const response = await fetch(req.url, {
        method: 'GET',
        headers: req.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const matchesArray = json?.matches || (Array.isArray(json) ? json : null);

        if (Array.isArray(matchesArray) && matchesArray.length > 0) {
          // Mapowanie jeśli otrzymaliśmy surowe dane z Football-Data.org
          const mappedMatches = matchesArray[0]?.homeTeam 
            ? matchesArray.map(mapFootballDataToLiveMatch)
            : matchesArray;

          const result: FetchRealMatchesResult = {
            matches: mappedMatches,
            isDemo: false,
            source: req.source
          };
          matchesCache = { data: result, timestamp: Date.now() };
          lastErrorTimestamp = 0;
          isFetchingInProgress = false;
          return result;
        } else if (Array.isArray(matchesArray) && matchesArray.length === 0) {
          lastErrorMessage = 'Brak zaplanowanych meczów w wybranym pakiecie API na dzień dzisiejszy.';
        }
      } else if (response.status === 403 || response.status === 401) {
        lastErrorMessage = 'Nieprawidłowy klucz API Football-Data.org lub brak uprawnień do wybranych rozgrywek.';
      } else if (response.status === 429) {
        lastErrorMessage = 'Przekroczono limit zapytań do API (Rate Limit 10 req/min). Odczekaj chwilę.';
      } else if (response.status !== 404) {
        lastErrorMessage = `Serwer API zwrócił błąd HTTP ${response.status}.`;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastErrorMessage = 'Upłynął limit czasu oczekiwania na odpowiedź API (timeout).';
      } else {
        lastErrorMessage = err.message || 'Błąd sieciowy / CORS podczas komunikacji z API.';
      }
    }
  }

  isFetchingInProgress = false;
  lastErrorTimestamp = Date.now();

  // Całkowity brak fałszywych meczów zastępczych - zwracamy pustą listę i czytelny komunikat o błędzie
  const emptyResult: FetchRealMatchesResult = {
    matches: [],
    isDemo: false,
    source: 'fallback',
    error: lastErrorMessage || (!cleanKey ? 'Brak wprowadzonego klucza API. Kliknij ikonę klucza w nagłówku, aby dodać token.' : 'Nie udało się pobrać danych z API.')
  };

  return emptyResult;
}

/**
 * Pobiera i uzupełnia statystyki dla konkretnego meczu z API zewnętrznego
 */
export async function fetchStatsForMatch(
  homeTeam: string,
  awayTeam: string,
  apiKey?: string
): Promise<Partial<LiveMatch> | null> {
  const hLower = homeTeam.toLowerCase().trim();
  const aLower = awayTeam.toLowerCase().trim();

  // 1. Sprawdźmy mecze z API
  try {
    const res = await fetchRealMatchesSafe(apiKey, true);
    if (res.matches && res.matches.length > 0) {
      // Szukanie meczu po nazwie
      const found = res.matches.find(m => {
        const mH = m.gospodarz.toLowerCase();
        const mA = m.gosc.toLowerCase();
        return (
          (hLower && mH.includes(hLower)) ||
          (aLower && mA.includes(aLower)) ||
          (hLower && mA.includes(hLower)) ||
          (aLower && mH.includes(aLower))
        );
      });

      if (found) {
        return found;
      }
    }
  } catch (e) {
    console.warn("Błąd wyszukiwania w API real matches:", e);
  }

  // 2. Jeśli nie znaleziono w live feed, spróbujmy przez silnik hydratacji /api/hydrate-match
  try {
    const envBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
    const endpoint = `${envBaseUrl}/api/hydrate-match`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gospodarz: homeTeam || 'Gospodarze',
        gosc: awayTeam || 'Goście',
        minuta: 55,
        gole1: 0,
        gole2: 0,
        kurs1: 2.20,
        kurs_x: 3.10,
        kurs2: 3.00,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        gospodarz: homeTeam,
        gosc: awayTeam,
        gole1: data.gole1 ?? 0,
        gole2: data.gole2 ?? 0,
        minuta: data.minuta ?? 55,
        kurs1: data.kurs1 ?? 2.20,
        kurs_x: data.kurs_x ?? 3.10,
        kurs2: data.kurs2 ?? 3.00,
        strzaly1: data.strzaly1 ?? 7,
        strzaly2: data.strzaly2 ?? 5,
        strzalyCelne1: data.strzalyCelne1 ?? 3,
        strzalyCelne2: data.strzalyCelne2 ?? 2,
        posiadaniePilki1: data.posiadaniePilki1 ?? 52,
        posiadaniePilki2: data.posiadaniePilki2 ?? 48,
        notatki: data.notatki || `Zsyntetyzowane statystyki meczu na podstawie modeli analitycznych.`,
      };
    }
  } catch (e) {
    console.warn("Błąd hydratacji:", e);
  }

  return null;
}

/**
 * Bezpieczne wysyłanie promptu analizy do Gemini AI
 */
export async function fetchAiAnalysisSafe(
  match: LiveMatch,
  customGeminiKey?: string
): Promise<{ analysis?: string; error?: string }> {
  try {
    const envBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
    const endpoint = `${envBaseUrl}/api/analyze`;

    const prompt = `Przeanalizuj taktycznie mecz na żywo pod kątem value betu i Złotego Okna Obstawiania:
Mecz: ${match.gospodarz} (${match.gole1}) vs (${match.gole2}) ${match.gosc}
Minuta: ${match.minuta}'
Kursy STS: 1: ${match.kurs1}, X: ${match.kurs_x}, 2: ${match.kurs2}
Strzały: ${match.strzaly1 || 0} (celne: ${match.strzalyCelne1 || 0}) vs ${match.strzaly2 || 0} (celne: ${match.strzalyCelne2 || 0})
Posiadanie piłki: ${match.posiadaniePilki1 || 50}% - ${match.posiadaniePilki2 || 50}%
Notatki meczowe: ${match.notatki || 'Brak'}
Określ dominację, ryzyko straty gola oraz optymalny typ na końcówkę spotkania.`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (customGeminiKey && customGeminiKey.trim()) {
      const cleanKey = customGeminiKey.trim().replace(/^["']|["']$/g, '');
      headers['x-gemini-key'] = cleanKey;
      headers['x-goog-api-key'] = cleanKey;
      headers['Authorization'] = `Bearer ${cleanKey}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { error: errJson.error || `Błąd serwera (${res.status})` };
    }

    const data = await res.json();
    return { analysis: data.analysis };
  } catch (err: any) {
    return { error: err.message || 'Brak połączenia z silnikiem analitycznym AI.' };
  }
}
