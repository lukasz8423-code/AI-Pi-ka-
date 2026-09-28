/**
 * Typy danych dla asystenta zakładów na żywo
 */

export interface LiveMatch {
  id: string;
  gospodarz: string; // Home team
  gosc: string;      // Away team
  gole1: number;     // Home goals
  gole2: number;     // Away goals
  minuta: number;    // Current match minute (1-90)
  kurs1: number;     // Odds for Home win (1)
  kurs_x: number;    // Odds for Draw (X)
  kurs2: number;     // Odds for Away win (2)
  strzaly1?: number; // Optional manual Home shots
  strzaly2?: number; // Optional manual Away shots
  strzalyCelne1?: number; // Optional manual Home shots on target
  strzalyCelne2?: number; // Optional manual Away shots on target
  czerwoneKartki1?: number; // Optional Home red cards (0, 1, 2...)
  czerwoneKartki2?: number; // Optional Away red cards (0, 1, 2...)
  zolteKartki1?: number;    // Optional Home yellow cards (0, 1, 2...)
  zolteKartki2?: number;    // Optional Away yellow cards (0, 1, 2...)
  notatki?: string;  // Additional game notes (e.g. red cards, heavy rain)
  status: 'niesprawdzony' | 'wygrany' | 'przegrany' | 'anulowany';
  typZalecany?: string;
  kursZalecany?: number;
  evZalecane?: number;
  dataDodania: string;
  ostatniZapisGoli1?: number;
  ostatniZapisGoli2?: number;
  aiAnaliza?: string;
  isLocked?: boolean;
  isLiveOdds?: boolean;
  daneSzacunkowe?: boolean;
  startingPreMatchProbs?: {
    p1: number;
    px: number;
    p2: number;
  };
  finalnyGospodarz?: number;
  finalnyGosc?: number;
  betPlaced?: {
    outcome: '1' | 'X' | '2';
    odd: number;
    stake: number;
    dataPlaced: string;
  };
  entryAssessment?: OptimalEntryAssessment;
  oddsHistory?: OddsHistoryEntry[];
}

export interface OddsHistoryEntry {
  minuta: number;
  kurs1: number;
  kurs_x: number;
  kurs2: number;
  gole1: number;
  gole2: number;
  timestamp: string;
}

export interface OptimalEntryAssessment {
  status: 'IDEALNY' | 'DOBRY' | 'POCZEKAJ' | 'RYZYKOWNY' | 'PRZEKROCZONY';
  rekomendacja: string;
  poziomRyzyka: 'Niskie' | 'Umiarkowane' | 'Wysokie' | 'Krytyczne';
  szansaProcent: number;
  opis: string;
  typSugerowany: string;
  confidenceScore?: number;
}

export interface BankrollSettings {
  initial: number;
  strategy: 'flat' | 'percent' | 'kelly';
  parameter: number; // e.g. 100 for flat stake, 2 for 2% of bankroll, 0.25 for Kelly factor (Quarter Kelly)
}

export interface Probabilities {
  p1_surowe: number;
  px_surowe: number;
  p2_surowe: number;
  p1: number; // Fair Home probability (smoothed/normalized)
  px: number; // Fair Draw probability (smoothed/normalized)
  p2: number; // Fair Away probability (smoothed/normalized)
}

export interface ValueBet {
  outcome: '1' | 'X' | '2';
  name: string;
  odd: number;
  fairProb: number;
  ev: number; // Expected Value (percentage)
  isPositive: boolean;
  kellyStake?: number; // Sugerowana stawka kryterium Kelly'ego (np. w % bankrollu)
}

export interface MatchStats {
  stagnationLine: number; // 0 (extreme pressure) to 10 (total stagnation)
  description: string;
  homeDominance: number;  // percentage (0-100)
  predictedTotalGoals: number;
  hasManualShots?: boolean;
  momentumScore?: number; // Od -100 (dominacja gościa) do +100 (dominacja gospodarza)
  efficiency1?: number;   // Precyzja strzelecka gospodarzy (%)
  efficiency2?: number;   // Precyzja strzelecka gości (%)
}

export interface PredictionResult {
  kierunek: string;       // e.g. "Gospodarz naciska", "Stagnacja / Under"
  sila: 'Słaba' | 'Średnia' | 'Silna';
  pewnosc_procent: number; // 0-100
  uzasadnienie: string;
}
