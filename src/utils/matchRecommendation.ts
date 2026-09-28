import { LiveMatch } from '../types';
import {
  uzyskaj_pre_match_proby,
  wygladz_prawdopodobienstwa,
  oblicz_wartosci_zakladow
} from './bettingCalc';

export interface MatchRecommendationResult {
  typZalecany: string;
  kursZalecany: number;
  evZalecane: number;
  confidenceScore: number;
}

export function recalculateMatchRecommendation(m: LiveMatch): MatchRecommendationResult {
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
  
  // Algorytm oceny pewności (Confidence Score) na podstawie rozbieżności kursów bukmachera a wyliczonych fair-probability
  const impliedP1 = 1 / Math.max(1.01, m.kurs1);
  const impliedPX = 1 / Math.max(1.01, m.kurs_x);
  const impliedP2 = 1 / Math.max(1.01, m.kurs2);
  const marginSum = impliedP1 + impliedPX + impliedP2;

  const cleanImplied1 = impliedP1 / (marginSum || 1);
  const cleanImpliedX = impliedPX / (marginSum || 1);
  const cleanImplied2 = impliedP2 / (marginSum || 1);

  // Wartościowa rozbieżność (discrepancy / edge)
  const disc1 = fairProbs.p1 - cleanImplied1;
  const discX = fairProbs.px - cleanImpliedX;
  const disc2 = fairProbs.p2 - cleanImplied2;
  const maxDiscrepancy = Math.max(disc1, discX, disc2);

  // Wyliczenie wskaźnika pewności rekomendacji (40% - 95%) - oparte na realnych fundamentach statystycznych i bezpieczeństwie bankrollu
  let baseConfidence = 65;
  if (m.strzaly1 !== undefined) {
    baseConfidence += 10; // Wyższy poziom pewności przy wprowadzonych manualnych strzałach live
  }
  baseConfidence += Math.round((m.minuta / 90) * 12); // Im bliżej końca meczu, tym większa przewidywalność

  let discrepancyFactor = 0;
  if (maxDiscrepancy > 0.02 && maxDiscrepancy <= 0.10) {
    // Słodki punkt (sweet spot) wartościowej przewagi: stabilna i bezpieczna przewaga
    discrepancyFactor = Math.round(maxDiscrepancy * 120);
  } else if (maxDiscrepancy > 0.10) {
    // Podejrzanie duża przewaga: może wskazywać na błąd modelu, niepełne dane live lub anomalie rynkowe. Maleje przy skrajnych odchyłach!
    discrepancyFactor = Math.round(12 - (maxDiscrepancy - 0.10) * 80);
  } else {
    discrepancyFactor = -5; // Słaba lub brak wartościowej przewagi
  }

  let confidence = baseConfidence + discrepancyFactor;
  if (m.oddsHistory && m.oddsHistory.length >= 2) {
    confidence += 5; // Bonus za śledzenie trendu kursowego w czasie rzeczywistym
  }
  const confidenceScore = Math.min(95, Math.max(40, Math.round(confidence)));

  const evBets = oblicz_wartosci_zakladow(m.kurs1, m.kurs_x, m.kurs2, fairProbs.p1, fairProbs.px, fairProbs.p2);

  // Tryb MATEMATYCZNY (najwyższe EV)
  const positiveBetsSorted = evBets.filter(b => b.isPositive).sort((a, b) => b.ev - a.ev);
  
  if (positiveBetsSorted.length > 0) {
    const best = positiveBetsSorted[0];
    const targetTyp = best.outcome === '1' ? 'Gospodarz (1)' : best.outcome === '2' ? 'Gość (2)' : 'Remis (X)';
    return {
      typZalecany: targetTyp,
      kursZalecany: best.odd,
      evZalecane: best.ev,
      confidenceScore
    };
  }
  
  // Fallback: najwyższe prawdopodobieństwo
  let name = 'Gospodarz (1)';
  let odd = m.kurs1;
  let p = fairProbs.p1;
  let ev = odd * p - 1;

  if (fairProbs.p2 > fairProbs.p1 && fairProbs.p2 > fairProbs.px) {
    name = 'Gość (2)';
    odd = m.kurs2;
    p = fairProbs.p2;
    ev = odd * p - 1;
  } else if (fairProbs.px > fairProbs.p1 && fairProbs.px > fairProbs.p2) {
    name = 'Remis (X)';
    odd = m.kurs_x;
    p = fairProbs.px;
    ev = odd * p - 1;
  }

  return {
    typZalecany: name,
    kursZalecany: odd,
    evZalecane: ev,
    confidenceScore
  };
}
