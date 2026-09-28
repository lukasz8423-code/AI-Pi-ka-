import { LiveMatch } from '../types';
import { INITIAL_MATCHES } from '../data/mockMatches';

export interface FetchRealMatchesResult {
  matches: LiveMatch[];
  isDemo?: boolean;
  error?: string;
  source?: 'cache' | 'network' | 'fallback';
}

// Pamięć podręczna w locie (In-Memory Cache)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 45 * 1000; // 45 sekund cache'u
const COOLDOWN_ON_ERROR_MS = 15 * 1000; // 15 sekund przerwy po błędzie, aby nie zapętlać zapytań

let matchesCache: CacheEntry<FetchRealMatchesResult> | null = null;
let lastErrorTimestamp = 0;
let isFetchingInProgress = false;

/**
 * Inteligentny klient zapytań do API z mechanizmem Cache, Retry i Circuit-Breaker
 */
export async function fetchRealMatchesSafe(apiKey?: string, forceRefresh = false): Promise<FetchRealMatchesResult> {
  const now = Date.now();

  // 1. Sprawdzenie Cache (jeśli nie wymuszono odświeżenia)
  if (!forceRefresh && matchesCache && (now - matchesCache.timestamp < CACHE_TTL_MS)) {
    return { ...matchesCache.data, source: 'cache' };
  }

  // 2. Ochrona przed zapętlonymi błędami (Circuit Breaker Cooldown)
  if (!forceRefresh && lastErrorTimestamp > 0 && (now - lastErrorTimestamp < COOLDOWN_ON_ERROR_MS)) {
    if (matchesCache) {
      return { ...matchesCache.data, source: 'cache' };
    }
    return {
      matches: INITIAL_MATCHES,
      isDemo: true,
      source: 'fallback',
      error: 'Tymczasowa przerwa przed ponowieniem zapytania (ochrona przed pętlą błędów).'
    };
  }

  if (isFetchingInProgress && matchesCache) {
    return matchesCache.data;
  }

  isFetchingInProgress = true;

  // 3. Rozwiązywanie ścieżki bazowej (Base URL resolver)
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

  if (apiKey && apiKey.trim()) {
    const cleanKey = apiKey.trim().replace(/^["']|["']$/g, '');
    headers['x-auth-token'] = cleanKey;
    headers['x-api-key'] = cleanKey;
    headers['Authorization'] = `Bearer ${cleanKey}`;
  }

  let lastError: Error | null = null;
  const maxRetries = 2;

  for (const endpoint of endpointsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 500ms, 1000ms
          await new Promise((r) => setTimeout(r, attempt * 500));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const response = await fetch(endpoint, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          if (json && Array.isArray(json.matches)) {
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
        } else if (response.status === 404) {
          // Sprawdźmy kolejny endpoint lub metodę POST
          break;
        } else {
          lastError = new Error(`Serwer zwrócił status HTTP ${response.status}`);
        }
      } catch (err: any) {
        lastError = err;
        if (err.name === 'AbortError') {
          lastError = new Error('Upłynął limit czasu żądania (timeout 9s).');
        }
      }
    }
  }

  isFetchingInProgress = false;
  lastErrorTimestamp = Date.now();

  console.warn('[APIService] Nie udało się połączyć z API meczy live, aktywowano bezpieczny fallback:', lastError?.message);

  const fallbackResult: FetchRealMatchesResult = {
    matches: matchesCache?.data?.matches || INITIAL_MATCHES,
    isDemo: true,
    source: 'fallback',
    error: lastError?.message || 'Brak połączenia z serwerem API. Wyświetlono mecze z bazy lokalnej.'
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
  } catch (e: any) {
    console.error('[APIService] Błąd komunikacji z modelem AI:', e);
    return { error: e.message || 'Wystąpił problem z połączeniem z silnikiem AI.' };
  }
}
