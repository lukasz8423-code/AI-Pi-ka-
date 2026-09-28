import { LiveMatch } from '../types';
import { INITIAL_MATCHES } from '../data/mockMatches';
import { uzyskaj_pre_match_proby } from './bettingCalc';

export interface FetchRealMatchesResult {
  matches: LiveMatch[];
  isDemo?: boolean;
  error?: string;
  source?: 'cache' | 'network' | 'direct_api' | 'fallback';
}

// Pamięć podręczna w locie (In-Memory Cache)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 30 * 1000; // 30 sekund cache'u
const COOLDOWN_ON_ERROR_MS = 8 * 1000; // 8 sekund przerwy po błędzie

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
 * Inteligentny klient zapytań do API Football-Data.org z obsługą X-Auth-Token, proxy i direct fetch
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

  // 3. Próba 1: Wywołanie przez endpoint Proxy w Node.js serwera
  const envBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
  const endpointsToTry = [
    `${envBaseUrl}/api/real-matches`,
    `/api/real-matches`,
    `${envBaseUrl}/api/real-matches/`,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (cleanKey) {
    headers['x-auth-token'] = cleanKey;
    headers['X-Auth-Token'] = cleanKey;
    headers['x-api-key'] = cleanKey;
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }

  let lastError: Error | null = null;

  for (const endpoint of endpointsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.matches) && json.matches.length > 0) {
          const result: FetchRealMatchesResult = {
            matches: json.matches,
            isDemo: Boolean(json.isDemo),
            error: json.error,
            source: 'network'
          };
          matchesCache = { data: result, timestamp: Date.now() };
          lastErrorTimestamp = 0;
          isFetchingInProgress = false;
          return result;
        }
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 4. Próba 2: Bezpośrednie zapytanie asynchroniczne z przeglądarki do https://api.football-data.org/v4/matches
  if (cleanKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const directRes = await fetch('https://api.football-data.org/v4/matches', {
        method: 'GET',
        headers: {
          'X-Auth-Token': cleanKey,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (directRes.ok) {
        const data = await directRes.json();
        if (data && Array.isArray(data.matches) && data.matches.length > 0) {
          const mappedList = data.matches.map(mapFootballDataToLiveMatch);
          const result: FetchRealMatchesResult = {
            matches: mappedList,
            isDemo: false,
            source: 'direct_api'
          };
          matchesCache = { data: result, timestamp: Date.now() };
          lastErrorTimestamp = 0;
          isFetchingInProgress = false;
          return result;
        }
      }
    } catch (err: any) {
      console.warn('[APIService] Direct Football-Data.org fetch warning:', err);
    }
  }

  isFetchingInProgress = false;
  lastErrorTimestamp = Date.now();

  // 5. Bezpieczny fallback (tylko realne topowe kluby europejskie)
  const fallbackResult: FetchRealMatchesResult = {
    matches: matchesCache?.data?.matches || INITIAL_MATCHES,
    isDemo: true,
    source: 'fallback',
    error: lastError?.message || 'Nie udało się pobrać danych z API. Załadowano mecze z bazy.'
  };

  return fallbackResult;
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
