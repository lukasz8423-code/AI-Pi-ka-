import { DataQualityTier } from '../types';

export interface HydratedMatchStats {
  strzaly1: number;
  strzaly2: number;
  strzalyCelne1: number;
  strzalyCelne2: number;
  rzutyRozne1?: number;
  rzutyRozne2?: number;
  zolteKartki1: number;
  zolteKartki2: number;
  czerwoneKartki1: number;
  czerwoneKartki2: number;
  posiadaniePilki1?: number; // %
  posiadaniePilki2?: number; // %
  xG1?: number;
  xG2?: number;

  dataQuality: DataQualityTier;
  confidenceDiscount: number; // Mnożnik stawki (1.0 dla Planu A, 0.75 dla B, 0.45 dla C)
  sourceName: string;
}

export interface BaseInputMatch {
  gospodarz: string;
  gosc: string;
  minuta: number;
  gole1: number;
  gole2: number;
  kurs1: number;
  kurs_x: number;
  kurs2: number;
}

export class TeamMatcher {
  public static cleanName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(fc|cf|fk|sk|cd|sc|ac|ii|res|u21|u23|u19|ssa|ks|gks|mks)\b/gi, '')
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  public static similarity(a: string, b: string): number {
    const cleanA = new Set(this.cleanName(a).split(' ').filter(Boolean));
    const cleanB = new Set(this.cleanName(b).split(' ').filter(Boolean));

    const intersection = new Set([...cleanA].filter(x => cleanB.has(x)));
    const union = new Set([...cleanA, ...cleanB]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}

export class MatchHydrationEngine {
  private cache = new Map<string, { data: HydratedMatchStats; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 45 * 1000; // 45 sekund cache'u (mecz na żywo)

  public async hydrateMatch(input: BaseInputMatch): Promise<HydratedMatchStats> {
    const cacheKey = `${TeamMatcher.cleanName(input.gospodarz)}__vs__${TeamMatcher.cleanName(input.gosc)}`;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    let result: HydratedMatchStats;

    // --- PLAN A: Dedykowane źródło statystyk live (API sportowe / Sofascore) ---
    try {
      const planAData = await this.fetchPlanA_DeepStats(input);
      if (planAData) {
        result = planAData;
        this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return result;
      }
    } catch (err) {
      console.warn(`[HydrationEngine] Plan A nie powiódł się dla ${input.gospodarz} - ${input.gosc}:`, err);
    }

    // --- PLAN B: Przeszukiwanie sieci / Relacja tekstowa / Live Ticker ---
    try {
      const planBData = await this.fetchPlanB_WebSearchTicker(input);
      if (planBData) {
        result = planBData;
        this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
        return result;
      }
    } catch (err) {
      console.warn(`[HydrationEngine] Plan B nie powiódł się dla ${input.gospodarz} - ${input.gosc}:`, err);
    }

    // --- PLAN C: Inteligentna Inferencja Matematyczna (Zero-Failure Guarantee) ---
    result = this.generatePlanC_SyntheticInference(input);
    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  // =========================================================================
  // PLAN A: Próba pobrania pełnych danych ze statystykami
  // =========================================================================
  private async fetchPlanA_DeepStats(_input: BaseInputMatch): Promise<HydratedMatchStats | null> {
    // W środowisku produkcyjnym: zapytanie do API z xG, rzutami rożnymi, posiadaniem
    // Jeśli brak pokrycia dla niszowej ligi, zwracamy null, aby płynnie spaść do Planu B
    return null;
  }

  // =========================================================================
  // PLAN B: Wyszukiwarka / Web Scraping wyników tekstowych w locie
  // =========================================================================
  private async fetchPlanB_WebSearchTicker(input: BaseInputMatch): Promise<HydratedMatchStats | null> {
    // Prosta symulacja parsowania tekstowego live tickera
    // Weryfikujemy, czy są dostępne podstawowe metryki
    const min = Math.max(1, Math.min(95, input.minuta));
    if (min < 5) return null; // Zbyt wcześnie na relacje tekstowe

    return null;
  }

  // =========================================================================
  // PLAN C: Matematyczna Inferencja Ukrytych Statystyk (Nigdy nie rzuca błędu)
  // =========================================================================
  public generatePlanC_SyntheticInference(input: BaseInputMatch): HydratedMatchStats {
    const min = Math.max(1, Math.min(95, input.minuta));
    const scoreDiff = input.gole1 - input.gole2;

    // 1. Obliczenie domniemanej siły drużyn z kursów STS (Implied Odds Ratio)
    const rawP1 = 1 / Math.max(1.01, input.kurs1);
    const rawP2 = 1 / Math.max(1.01, input.kurs2);
    const homePowerRatio = rawP1 / ((rawP1 + rawP2) || 1); // 0.0 do 1.0

    // 2. Szacowanie tempa strzałów: średnio 0.26 strzału na minutę w meczu
    const totalGoals = input.gole1 + input.gole2;
    const basePace = 0.25 + totalGoals * 0.03;
    const totalEstimatedShots = Math.round(min * basePace);

    // 3. Efekt "goniącego wynik": drużyna przegrywająca oddaje więcej strzałów
    let homeShotShare = homePowerRatio;
    if (scoreDiff > 0) {
      homeShotShare = Math.max(0.35, homeShotShare - 0.07 * scoreDiff);
    } else if (scoreDiff < 0) {
      homeShotShare = Math.min(0.85, homeShotShare + 0.07 * Math.abs(scoreDiff));
    }

    const s1 = Math.max(input.gole1, Math.round(totalEstimatedShots * homeShotShare));
    const s2 = Math.max(input.gole2, Math.max(0, totalEstimatedShots - s1));

    // Strzały celne: minimum równe zdobytym golom
    const sot1 = Math.max(input.gole1, Math.round(s1 * (0.30 + homePowerRatio * 0.1)));
    const sot2 = Math.max(input.gole2, Math.round(s2 * (0.30 + (1 - homePowerRatio) * 0.1)));

    // Szacowanie kartek na podstawie minuty i napięcia
    const cardIntensity = Math.min(1.0, min / 70);
    const zolte1 = Math.round(cardIntensity * 1.6 * (1 - homePowerRatio));
    const zolte2 = Math.round(cardIntensity * 1.6 * homePowerRatio);

    // Rzuty rożne: korelacja ze strzałami i naporem
    const corners1 = Math.round(s1 * 0.45);
    const corners2 = Math.round(s2 * 0.45);

    // Estymacja xG na bazie wygenerowanych strzałów
    const estXG1 = Number((input.gole1 * 0.65 + sot1 * 0.2 + (s1 - sot1) * 0.04).toFixed(2));
    const estXG2 = Number((input.gole2 * 0.65 + sot2 * 0.2 + (s2 - sot2) * 0.04).toFixed(2));

    return {
      strzaly1: s1,
      strzaly2: s2,
      strzalyCelne1: sot1,
      strzalyCelne2: sot2,
      rzutyRozne1: corners1,
      rzutyRozne2: corners2,
      zolteKartki1: zolte1,
      zolteKartki2: zolte2,
      czerwoneKartki1: 0,
      czerwoneKartki2: 0,
      posiadaniePilki1: Math.round(homePowerRatio * 100),
      posiadaniePilki2: 100 - Math.round(homePowerRatio * 100),
      xG1: estXG1,
      xG2: estXG2,
      dataQuality: 'TIER_C_SYNTHETIC',
      confidenceDiscount: 0.50, // Bezpiecznik: 50% stawki przy braku zewnętrznych statystyk live
      sourceName: 'Model Inferencji Kursowej (Plan C - STS)'
    };
  }
}
