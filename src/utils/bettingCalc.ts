import { Probabilities, ValueBet, MatchStats, PredictionResult, LiveMatch, OptimalEntryAssessment } from '../types';

/**
 * Oblicza sugerowaną stawkę na podstawie wybranej strategii zarządzania kapitałem (bankroll management).
 */
export function obliczStawke(
  strategy: 'flat' | 'percent' | 'kelly',
  parameter: number,
  balance: number,
  odd: number,
  ev: number
): number {
  if (balance <= 0) return 0;

  let stawka = 0;
  if (strategy === 'flat') {
    stawka = parameter;
    if (stawka <= 0) stawka = 10;
  } else if (strategy === 'percent') {
    stawka = (balance * parameter) / 100;
    if (stawka <= 0) stawka = 10;
  } else if (strategy === 'kelly') {
    const p = (ev + 1) / odd;
    const q = 1 - p;
    const b = odd - 1;
    const kellyFraction = b > 0 ? (p * b - q) / b : 0;
    // Fractional Kelly: zabezpieczenie przed nadmierną wariancją live
    const f = Math.max(0, Math.min(0.5, kellyFraction));
    if (f <= 0) {
      return 0;
    }
    stawka = balance * f * parameter;
    if (stawka <= 0) {
      return 0;
    }
  }

  // Sztywny bufor bezpieczeństwa (Safety Cap): maksymalnie 10% bieżącego bankrollu na pojedynczy zakład
  const maxSafeSingleBet = balance * 0.10;
  if (stawka > maxSafeSingleBet) {
    stawka = maxSafeSingleBet;
  }

  if (stawka > balance) {
    stawka = balance;
  }

  return Math.round(stawka * 100) / 100;
}

/**
 * Przelicza kursy bukmacherskie na surowe i czyste prawdopodobieństwa (po odjęciu marży).
 */
export function przelicz_prawdopodobienstwa(
  kurs1: number,
  kurs_x: number,
  kurs2: number
): Probabilities {
  // Unikamy dzielenia przez zero przy pustych lub niepoprawnych kursach
  const k1 = kurs1 > 1 ? kurs1 : 1.01;
  const kx = kurs_x > 1 ? kurs_x : 1.01;
  const k2 = kurs2 > 1 ? kurs2 : 1.01;

  const p1_surowe = 1 / k1;
  const px_surowe = 1 / kx;
  const p2_surowe = 1 / k2;

  const suma = p1_surowe + px_surowe + p2_surowe;

  // Czyste prawdopodobieństwa bez marży bukmachera
  const p1 = p1_surowe / suma;
  const px = px_surowe / suma;
  const p2 = p2_surowe / suma;

  return {
    p1_surowe,
    px_surowe,
    p2_surowe,
    p1,
    px,
    p2,
  };
}

/**
 * Rekonstruuje prawdopodobieństwa przedmeczowe (pre-match) na podstawie kursów na żywo (live),
 * minuty meczu oraz bieżącego wyniku bramkowego.
 * Pozwala to na stworzenie stabilnego punktu odniesienia do dalszych kalkulacji i symulacji.
 */
export function rekonstruuj_pre_match_z_live(
  minuta: number,
  gole1: number,
  gole2: number,
  p1_live: number,
  px_live: number,
  p2_live: number
): { p1: number; px: number; p2: number } {
  const min = Math.max(1, Math.min(98, minuta));
  const t = Math.max(0.015, (95 - min) / 95); // Pozostały czas uwzględniający doliczony czas gry
  const roznica_bramek = gole1 - gole2;

  let p1_pre = 0.38;
  let px_pre = 0.28;
  let p2_pre = 0.34;

  if (roznica_bramek === 0) {
    // 1. Remis
    const t_factor = Math.max(0.12, Math.pow(t, 0.65));
    px_pre = Math.max(0.05, Math.min(0.90, 1 - (1 - px_live) / t_factor));
    
    const pozostala_szansa_pre = 1 - px_pre;
    const pozostala_szansa_live = 1 - px_live;
    
    if (pozostala_szansa_live > 0) {
      p1_pre = pozostala_szansa_pre * (p1_live / pozostala_szansa_live);
      p2_pre = pozostala_szansa_pre * (p2_live / pozostala_szansa_live);
    } else {
      p1_pre = pozostala_szansa_pre * 0.5;
      p2_pre = pozostala_szansa_pre * 0.5;
    }
  } else if (roznica_bramek === 1) {
    // 2. Gospodarz prowadzi 1 bramką
    const t_factor = Math.max(0.12, Math.pow(t, 0.8));
    p1_pre = Math.max(0.05, Math.min(0.90, 1 - (1 - p1_live) / t_factor));
    px_pre = Math.max(0.05, Math.min(0.90, px_live / (t_factor * 1.2 || 1)));
    p2_pre = Math.max(0.05, Math.min(0.90, p2_live / (Math.max(0.12, Math.pow(t, 1.4)) * 0.5 || 1)));
  } else if (roznica_bramek === 2) {
    // 3. Gospodarz prowadzi 2 bramkami
    const t_factor = Math.max(0.12, Math.pow(t, 1.3));
    p1_pre = Math.max(0.05, Math.min(0.95, 1 - (1 - p1_live) / t_factor));
    px_pre = Math.max(0.05, Math.min(0.90, px_live / (Math.max(0.12, Math.pow(t, 1.5)) * 0.4 || 1)));
    p2_pre = Math.max(0.05, Math.min(0.90, p2_live / (Math.max(0.12, Math.pow(t, 2.0)) * 0.1 || 1)));
  } else if (roznica_bramek >= 3) {
    // 4. Gospodarz prowadzi 3+ bramkami
    p1_pre = 0.65;
    px_pre = 0.20;
    p2_pre = 0.15;
  } else if (roznica_bramek === -1) {
    // 5. Gość prowadzi 1 bramką
    const t_factor = Math.max(0.12, Math.pow(t, 0.8));
    p2_pre = Math.max(0.05, Math.min(0.90, 1 - (1 - p2_live) / t_factor));
    px_pre = Math.max(0.05, Math.min(0.90, px_live / (t_factor * 1.2 || 1)));
    p1_pre = Math.max(0.05, Math.min(0.90, p1_live / (Math.max(0.12, Math.pow(t, 1.4)) * 0.5 || 1)));
  } else if (roznica_bramek === -2) {
    // 6. Gość prowadzi 2 bramkami
    const t_factor = Math.max(0.12, Math.pow(t, 1.3));
    p2_pre = Math.max(0.05, Math.min(0.95, 1 - (1 - p2_live) / t_factor));
    px_pre = Math.max(0.05, Math.min(0.90, px_live / (Math.max(0.12, Math.pow(t, 1.5)) * 0.4 || 1)));
    p1_pre = Math.max(0.05, Math.min(0.90, p1_live / (Math.max(0.12, Math.pow(t, 2.0)) * 0.1 || 1)));
  } else {
    // 7. Gość prowadzi 3+ bramkami
    p1_pre = 0.15;
    px_pre = 0.20;
    p2_pre = 0.65;
  }

  // Normalizacja do 100%
  const suma = p1_pre + px_pre + p2_pre;
  return {
    p1: p1_pre / (suma || 1),
    px: px_pre / (suma || 1),
    p2: p2_pre / (suma || 1)
  };
}

/**
 * Pobiera stabilne prawdopodobieństwa przedmeczowe (pre-match) dla danego meczu.
 * Zapobiega to wielokrotnemu rozjeżdżaniu się kursów (exponential double-decay) przy symulacji
 * oraz pozwala na prawidłowe liczenie wpływu statystyk na żywo.
 */
export function uzyskaj_pre_match_proby(m: LiveMatch): { p1: number; px: number; p2: number } {
  if (m.startingPreMatchProbs) {
    return m.startingPreMatchProbs;
  }

  const raw = przelicz_prawdopodobienstwa(m.kurs1, m.kurs_x, m.kurs2);

  if (m.isLiveOdds) {
    return rekonstruuj_pre_match_z_live(
      m.minuta,
      m.gole1,
      m.gole2,
      raw.p1,
      raw.px,
      raw.p2
    );
  } else {
    return {
      p1: raw.p1,
      px: raw.px,
      p2: raw.p2
    };
  }
}

/**
 * Automatycznie szacuje statystyki strzałów na podstawie minuty, wyniku bramkowego i siły drużyn (pre-match).
 */
export function szacuj_statystyki_z_kursow(
  minuta: number,
  gole1: number,
  gole2: number,
  p1_pre: number,
  p2_pre: number
): { s1: number; s2: number; sot1: number; sot2: number } {
  const min = Math.max(1, Math.min(90, minuta));
  
  // Stosunek sił gospodarz / gość na bazie ich czystych szans przedmeczowych
  const total_pre = p1_pre + p2_pre;
  const home_strength = total_pre > 0 ? p1_pre / total_pre : 0.5;

  // Średnie tempo strzałów: ok 0.28 strzału dla obu drużyn łącznie na minutę gry
  const base_tempo = 0.26 + (gole1 + gole2) * 0.02;
  const total_shots = Math.round(min * base_tempo);

  // Rozkład strzałów w zależności od siły i wyniku (goniący wynik oddają więcej strzałów)
  const goal_diff = gole1 - gole2;
  let home_shot_ratio = home_strength;

  if (goal_diff > 0) {
    // Gospodarz prowadzi, goście muszą atakować
    home_shot_ratio = Math.max(0.35, home_shot_ratio - 0.08 * goal_diff);
  } else if (goal_diff < 0) {
    // Goście prowadzą, gospodarz goni wynik
    home_shot_ratio = Math.min(0.85, home_shot_ratio + 0.08 * Math.abs(goal_diff));
  }

  const s1 = Math.max(0, Math.round(total_shots * home_shot_ratio));
  const s2 = Math.max(0, total_shots - s1);

  // Strzały celne: średnio 30% - 40% strzałów jest celnych (wyższa precyzja u silniejszej drużyny)
  const s1_acc = 0.28 + home_strength * 0.12;
  const s2_acc = 0.28 + (1 - home_strength) * 0.12;

  const sot1 = Math.max(0, Math.round(s1 * s1_acc));
  const sot2 = Math.max(0, Math.round(s2 * s2_acc));

  return { s1, s2, sot1, sot2 };
}

/**
 * Wygładza i adaptuje prawdopodobieństwa do aktualnej minuty meczu oraz stanu bramkowego.
 * Tworzy realistyczny model prawdopodobieństw na żywo (live) w oparciu o upływający czas i wynik.
 */
export function wygladz_prawdopodobienstwa(
  gospodarz: string,
  gosc: string,
  gole1: number,
  gole2: number,
  minuta: number,
  p1_surowe: number,
  px_surowe: number,
  p2_surowe: number,
  czerwoneKartki1?: number,
  czerwoneKartki2?: number,
  strzaly1?: number,
  strzaly2?: number,
  strzalyCelne1?: number,
  strzalyCelne2?: number,
  zolteKartki1?: number,
  zolteKartki2?: number
): { p1: number; px: number; p2: number } {
  const min = Math.max(1, Math.min(98, minuta));
  const t = Math.max(0.015, (95 - min) / 95); // Pozostały czas (w tym doliczony)
  
  const suma_pre = p1_surowe + px_surowe + p2_surowe;
  const p1_pre = p1_surowe / (suma_pre || 1);
  const px_pre = px_surowe / (suma_pre || 1);
  const p2_pre = p2_surowe / (suma_pre || 1);

  const roznica_bramek = gole1 - gole2;

  let p1_live = 0;
  let px_live = 0;
  let p2_live = 0;

  if (roznica_bramek === 0) {
    // Przy remisie, im mniej czasu, tym większe prawdopodobieństwo remisu końcowego
    px_live = px_pre + (1 - px_pre) * (1 - Math.pow(t, 0.65));
    // Prawdopodobieństwa wygranych maleją proporcjonalnie do pozostałego czasu
    const pozostała_szansa = 1 - px_live;
    const suma_wygranych_pre = p1_pre + p2_pre;
    
    if (suma_wygranych_pre > 0) {
      p1_live = pozostała_szansa * (p1_pre / suma_wygranych_pre);
      p2_live = pozostała_szansa * (p2_pre / suma_wygranych_pre);
    } else {
      p1_live = pozostała_szansa * 0.5;
      p2_live = pozostała_szansa * 0.5;
    }
  } else if (roznica_bramek > 0) {
    // Gospodarz prowadzi
    if (roznica_bramek === 1) {
      // Prowadzenie 1 bramką - remis jest nadal realnym zagrożeniem, ale maleje z czasem
      p1_live = p1_pre + (1 - p1_pre) * (1 - Math.pow(t, 0.8));
      px_live = px_pre * Math.pow(t, 0.8) * 1.2;
      p2_live = p2_pre * Math.pow(t, 1.4) * 0.5;
    } else if (roznica_bramek === 2) {
      // Prowadzenie 2 bramkami - wygrana gospodarza jest bardzo pewna pod koniec
      p1_live = p1_pre + (1 - p1_pre) * (1 - Math.pow(t, 1.3));
      px_live = px_pre * Math.pow(t, 1.5) * 0.4;
      p2_live = p2_pre * Math.pow(t, 2.0) * 0.1;
    } else {
      // Prowadzenie 3+ bramkami - praktycznie przesądzone
      p1_live = 0.96 + 0.04 * (1 - t);
      px_live = 0.03 * t;
      p2_live = 0.01 * t;
    }
  } else {
    // Gość prowadzi (roznica_bramek < 0)
    const abs_diff = Math.abs(roznica_bramek);
    if (abs_diff === 1) {
      p2_live = p2_pre + (1 - p2_pre) * (1 - Math.pow(t, 0.8));
      px_live = px_pre * Math.pow(t, 0.8) * 1.2;
      p1_live = p1_pre * Math.pow(t, 1.4) * 0.5;
    } else if (abs_diff === 2) {
      p2_live = p2_pre + (1 - p2_pre) * (1 - Math.pow(t, 1.3));
      px_live = px_pre * Math.pow(t, 1.5) * 0.4;
      p1_live = p1_pre * Math.pow(t, 2.0) * 0.1;
    } else {
      p2_live = 0.96 + 0.04 * (1 - t);
      px_live = 0.03 * t;
      p1_live = 0.01 * t;
    }
  }

  // Korekta na czerwone kartki (jeśli występują i nie są to kursy live)
  let p1_adj = p1_live;
  let px_adj = px_live;
  let p2_adj = p2_live;

  const redCards1 = czerwoneKartki1 || 0;
  const redCards2 = czerwoneKartki2 || 0;

  if (redCards1 > 0 || redCards2 > 0) {
    const penaltyFactor1 = Math.max(0.3, 1 - (redCards1 * 0.20) * t);
    const penaltyFactor2 = Math.max(0.3, 1 - (redCards2 * 0.20) * t);

    const initialP1 = p1_adj;
    const initialP2 = p2_adj;

    p1_adj = p1_adj * penaltyFactor1;
    p2_adj = p2_adj * penaltyFactor2;

    const lostP1 = initialP1 - p1_adj;
    const lostP2 = initialP2 - p2_adj;

    if (lostP1 > 0) {
      p2_adj += lostP1 * 0.65;
      px_adj += lostP1 * 0.35;
    }
    if (lostP2 > 0) {
      p1_adj += lostP2 * 0.65;
      px_adj += lostP2 * 0.35;
    }
  }

  // Korekta na żółte kartki (odzwierciedla nerwowość i ryzyko czerwonej kartki)
  const yellowCards1 = zolteKartki1 || 0;
  const yellowCards2 = zolteKartki2 || 0;

  if (yellowCards1 > 0 || yellowCards2 > 0) {
    const yellowPenalty1 = Math.max(0.85, 1 - (yellowCards1 * 0.02) * t);
    const yellowPenalty2 = Math.max(0.85, 1 - (yellowCards2 * 0.02) * t);

    const initialP1_y = p1_adj;
    const initialP2_y = p2_adj;

    p1_adj = p1_adj * yellowPenalty1;
    p2_adj = p2_adj * yellowPenalty2;

    const lostP1_y = initialP1_y - p1_adj;
    const lostP2_y = initialP2_y - p2_adj;

    if (lostP1_y > 0) {
      p2_adj += lostP1_y * 0.60;
      px_adj += lostP1_y * 0.40;
    }
    if (lostP2_y > 0) {
      p1_adj += lostP2_y * 0.60;
      px_adj += lostP2_y * 0.40;
    }
  }

  // Korekta o statystykę strzałów i strzałów celnych (Shots & Shots on Target Pressure Factor)
  const hasTotalShots = strzaly1 !== undefined && strzaly2 !== undefined;
  const hasShotsOnTarget = strzalyCelne1 !== undefined && strzalyCelne2 !== undefined;
  const hasManualStats = hasTotalShots || hasShotsOnTarget;

  let s1 = 0;
  let s2 = 0;
  let sot1 = 0;
  let sot2 = 0;
  let actualHasShotsOnTarget = hasShotsOnTarget;

  if (hasManualStats) {
    s1 = strzaly1 || 0;
    s2 = strzaly2 || 0;
    sot1 = strzalyCelne1 || 0;
    sot2 = strzalyCelne2 || 0;
  } else {
    // SZACUJEMY statystyki wyłącznie do celów wizualnych w UI (nie stosujemy ich do modyfikacji prawdopodobieństw)
    const est = szacuj_statystyki_z_kursow(min, gole1, gole2, p1_pre, p2_pre);
    s1 = est.s1;
    s2 = est.s2;
    sot1 = est.sot1;
    sot2 = est.sot2;
    actualHasShotsOnTarget = true;
  }

  // Wpływ strzałów na live probabilities (stosowany wyłącznie przy realnych statystykach manualnych wpisanych przez gracza!)
  if (hasManualStats) {
    const power1 = s1 * 1.0 + sot1 * 1.8;
    const power2 = s2 * 1.0 + sot2 * 1.8;
    const totalPower = power1 + power2;

    if (totalPower > 0) {
      const dom1 = power1 / totalPower;
      const dom2 = power2 / totalPower;
      const powerDiff = dom1 - dom2; // od -1 do 1

      // Nowy faktor: Precyzja Ataku (Celność strzałów) - premiuje drużyny, które uderzają precyzyjniej
      const eff1 = s1 > 0 ? (sot1 / s1) : 0;
      const eff2 = s2 > 0 ? (sot2 / s2) : 0;
      const effDiff = eff1 - eff2; // od -1 do 1
      const precisionBonus = 1 + effDiff * 0.25; // wzmacnia lub osłabia dominację do 25%

      const totalS = s1 + s2 + sot1 + sot2;
      const tempo = totalS / min; // akcje strzeleckie na minutę
      const volumeWeight = Math.min(1.3, totalS / 6); // przy większej liczbie strzałów trend staje się stabilniejszy

      // Łagodniejsza nieliniowa krzywa czasowa t_decay.
      // Pozwala zachować istotną wagę dominacji pod koniec meczu (min 35%), co jest kluczowe w live betach.
      const t_decay = Math.max(0.35, Math.pow(t, 0.45));

      // Zmodyfikowany shift prawdopodobieństwa
      let maxShift = actualHasShotsOnTarget ? 0.24 : 0.16;
      const shift = powerDiff * maxShift * volumeWeight * t_decay * precisionBonus;

      p1_adj = p1_adj + shift;
      p2_adj = p2_adj - shift;

      p1_adj = Math.max(0.01, p1_adj);
      p2_adj = Math.max(0.01, p2_adj);

      // Korekta szansy na remis na bazie intensywności meczu
      if (roznica_bramek === 0) {
        if (tempo < 0.15 && min > 20) {
          // Bardzo mało akcji - prawdopodobieństwo remisu rośnie o 18%
          px_adj = px_adj * 1.18;
        } else if (tempo > 0.35) {
          // Wysokie tempo i ciągłe strzały - szansa na utrzymanie remisu spada o 15%
          px_adj = px_adj * 0.85;
        }
      }
    }
  }

  // NOWOŚĆ: Dynamiczny model zmęczenia i zagęszczenia goli w końcówkach (Fatigue & Late-Game Drama Factor)
  // Udoskonalony: analizuje remis/jednobramkową stratę przy rosnącej liczbie kartek (spięć na boisku)
  if (minuta >= 75 && minuta <= 90) {
    const isCloseScore = roznica_bramek === 0 || Math.abs(roznica_bramek) === 1;
    const cardsTension = (yellowCards1 + yellowCards2) + (redCards1 + redCards2) * 2.5;

    if (hasManualStats) {
      const totalS = s1 + s2;
      if (totalS > 6 || cardsTension >= 3) {
        const tensionMultiplier = 1 + Math.min(0.15, cardsTension * 0.03);
        const decayFactor = (0.92 - (Math.min(10, totalS) / 10) * 0.05) / (isCloseScore ? tensionMultiplier : 1);
        
        px_adj = px_adj * Math.max(0.60, decayFactor);

        const currentPower1 = s1 * 1.0 + sot1 * 1.8;
        const currentPower2 = s2 * 1.0 + sot2 * 1.8;
        const totalPowerCurrent = currentPower1 + currentPower2;
        const s1_pct = totalPowerCurrent > 0 ? (currentPower1 / totalPowerCurrent) : 0.5;

        if (s1_pct > 0.60) {
          p1_adj = p1_adj * 1.10 * tensionMultiplier;
        } else if (s1_pct < 0.40) {
          p2_adj = p2_adj * 1.10 * tensionMultiplier;
        } else {
          p1_adj = p1_adj * 1.05;
          p2_adj = p2_adj * 1.05;
        }
      }
    } else {
      if (isCloseScore && cardsTension >= 2) {
        const fallbackDecay = 0.90 - Math.min(0.20, cardsTension * 0.04);
        px_adj = px_adj * fallbackDecay;
        p1_adj = p1_adj * 1.08;
        p2_adj = p2_adj * 1.08;
      }
    }
  }

  // Zabezpieczenie i normalizacja do 100%
  const suma_live = p1_adj + px_adj + p2_adj;
  return {
    p1: p1_adj / (suma_live || 1),
    px: px_adj / (suma_live || 1),
    p2: p2_adj / (suma_live || 1),
  };
}

/**
 * Szacuje linię stagnacji i stan statystyk na podstawie minuty i strzałów.
 */
export function pobierz_i_opisz_staty(
  gospodarz: string,
  gosc: string,
  gole1: number,
  gole2: number,
  minuta: number,
  p1: number,
  px: number,
  p2: number,
  strzaly1?: number,
  strzaly2?: number,
  strzalyCelne1?: number,
  strzalyCelne2?: number,
  zolteKartki1?: number,
  zolteKartki2?: number
): MatchStats {
  const min = Math.max(1, minuta);
  const hasTotalShots = strzaly1 !== undefined && strzaly2 !== undefined;
  const hasShotsOnTarget = strzalyCelne1 !== undefined && strzalyCelne2 !== undefined;
  const hasManualShots = hasTotalShots || hasShotsOnTarget;

  let stagnationLine = 5.0;
  let homeDominance = 50;
  let predictedTotalGoals = 0;
  let description = '';

  const aktualne_gole = gole1 + gole2;
  const pozostale_minuty = 90 - min;

  const yellow1 = zolteKartki1 || 0;
  const yellow2 = zolteKartki2 || 0;
  const totalYellows = yellow1 + yellow2;

  let s1 = 0;
  let s2 = 0;
  let sot1 = 0;
  let sot2 = 0;

  if (hasManualShots) {
    s1 = strzaly1 || 0;
    s2 = strzaly2 || 0;
    sot1 = strzalyCelne1 || 0;
    sot2 = strzalyCelne2 || 0;
  } else {
    // SZACUJEMY statystyki automatycznie na bazie live probabilities, minuty i wyniku bramkowego!
    const est = szacuj_statystyki_z_kursow(min, gole1, gole2, p1, p2);
    s1 = est.s1;
    s2 = est.s2;
    sot1 = est.sot1;
    sot2 = est.sot2;
  }

  const lacznie_strzalow = s1 + s2;
  const lacznie_celnych = sot1 + sot2;
  
  // Strzały celne dają silniejszy sygnał o braku stagnacji
  const lacznie_aktywne = lacznie_strzalow + lacznie_celnych * 1.5;
  const oczekiwane_aktywne = (min / 90) * 26; // Średnia norma: ok. 26 skumulowanych punktów aktywności na mecz

  // Obliczanie linii stagnacji (0-10)
  if (min > 10) {
    const ratio = lacznie_aktywne / (oczekiwane_aktywne || 1);
    stagnationLine = Math.max(0, Math.min(10, 10 - ratio * 5));
    const gole = gole1 + gole2;
    if (gole > 4) stagnationLine = Math.max(0, stagnationLine - 1.5);
  }

  if (totalYellows > 0) {
    // Żółte kartki wskazują na walkę i faule, co przełamuje czystą stagnację
    stagnationLine = Math.max(0, stagnationLine - Math.min(1.5, totalYellows * 0.25));
  }

  // Dominacja gospodarza (0 - 100%) na bazie ważonej siły ofensywnej
  const power1 = s1 * 1.0 + sot1 * 1.8;
  const power2 = s2 * 1.0 + sot2 * 1.8;
  if (power1 + power2 > 0) {
    homeDominance = Math.round((power1 / (power1 + power2)) * 100);
  } else {
    homeDominance = 50;
  }

  // Precyzja (celność strzałów) i wskaźnik momentu ofensywnego (momentum)
  const efficiency1 = s1 > 0 ? Math.round((sot1 / s1) * 100) : 0;
  const efficiency2 = s2 > 0 ? Math.round((sot2 / s2) * 100) : 0;
  const momentumScore = power1 + power2 > 0 ? Math.round(((power1 - power2) / (power1 + power2)) * 100) : 0;

  // Przewidywana całkowita liczba goli na podstawie strzałów, celnych strzałów i stagnacji
  const tempo_strzalow = (lacznie_strzalow + lacznie_celnych * 1.5) / min;
  
  // Korekta na strefy czasowe wysokiego zmęczenia i nasilenia ataków (np. końcówka połowy i meczu)
  let fatigueGoalBoost = 1.0;
  if (min >= 35 && min <= 45) {
    fatigueGoalBoost = 1.12; // Zmęczenie przed przerwą sprzyja błędom obrony
  } else if (min >= 75 && min <= 90) {
    fatigueGoalBoost = 1.25; // Silne zmęczenie w końcówce znacząco zwiększa oczekiwaną liczbę bramek
  }

  const oczekiwane_bramki_z_tempa = pozostale_minuty * (0.012 + 0.055 * tempo_strzalow * (1.25 - stagnationLine / 10)) * fatigueGoalBoost;
  predictedTotalGoals = Number((aktualne_gole + Math.max(0.05, Math.min(4.5, oczekiwane_bramki_z_tempa))).toFixed(2));

  // Opis słowny statystyk
  if (stagnationLine >= 7.5) {
    description = 'Gra wybitnie zamknięta (stagnacja). Drużyny skupione na defensywie, rzadkie wejścia w pole karne, brak strzałów celnych.';
  } else if (stagnationLine >= 5.5) {
    description = 'Spokojny przebieg meczu. Gra toczy się głównie w środku pola, niska intensywność i schematyczne ataki.';
  } else if (stagnationLine >= 3.5) {
    description = 'Standardowe tempo meczu. Obie strony podejmują próby ofensywne, gra jest otwarta i zbalansowana.';
  } else {
    const hasHighSoT = lacznie_celnych > 3;
    description = hasHighSoT 
      ? 'Wysokie tempo i duża precyzja (strzały celne). Częste sytuacje podbramkowe, bramkarze mają dużo pracy.'
      : 'Wysokie tempo i duża intensywność. Częste sytuacje podbramkowe, szybkie przejścia z obrony do ataku.';
  }

  if (totalYellows >= 4) {
    description += ` Spotkanie obfituje w ostry kontakt i nerwowość (${totalYellows} żółtych kartek), co może skutkować czerwoną kartką i nagłą zmianą układu sił.`;
  } else if (totalYellows >= 2) {
    description += ` Widoczna jest agresywna walka na boisku, sędzia musiał już sięgać po żółte kartki (${totalYellows} szt.).`;
  }

  return {
    stagnationLine: Number(stagnationLine.toFixed(1)),
    description,
    homeDominance,
    predictedTotalGoals,
    hasManualShots,
    momentumScore,
    efficiency1,
    efficiency2,
  };
}

/**
 * Szacuje kierunek i siłę zakładu na podstawie statystyk i czasu.
 * Wykorzystuje bezpieczne hedgingi (DNB, podpórki 1X/X2) w celu osiągnięcia najwyższej skuteczności.
 */
export function przewiduj_kierunek(
  gospodarz: string,
  gosc: string,
  gole1: number,
  gole2: number,
  minuta: number,
  p1: number,
  px: number,
  p2: number,
  stats: MatchStats
): PredictionResult {
  const roznica = gole1 - gole2;
  const totalGole = gole1 + gole2;
  const hasStats = stats.hasManualShots === true;
  
  let kierunek = 'Remis / Stagnacja';
  let sila: 'Słaba' | 'Średnia' | 'Silna' = 'Średnia';
  let pewnosc_procent = 50;
  let uzasadnienie = '';

  if (minuta > 75) {
    if (roznica === 0) {
      if (hasStats && stats.stagnationLine > 6.5) {
        kierunek = 'Under bramkowy / Remis (X)';
        sila = 'Silna';
        pewnosc_procent = Math.round(px * 100 + 12);
        uzasadnienie = `Końcówka meczu (${minuta}'). Brak naporu strzałowego i wysoka stagnacja (${stats.stagnationLine}/10) sugerują bezpieczny podział punktów i brak kolejnych bramek.`;
      } else {
        kierunek = 'Remis (X) lub Podwójna Szansa (1X/X2)';
        sila = 'Średnia';
        pewnosc_procent = Math.round((px + Math.max(p1, p2) * 0.4) * 100);
        uzasadnienie = `Remis w końcówce (${minuta}'). Obie drużyny grają ostrożnie. Najbardziej prawdopodobny wynik to podział punktów lub minimalne zwycięstwo faworyta.`;
      }
    } else if (Math.abs(roznica) === 1) {
      const prowadzacy = gole1 > gole2 ? gospodarz : gosc;
      const pWin = gole1 > gole2 ? p1 : p2;
      const pDraw = px;

      if (hasStats && stats.homeDominance > 62 && gole1 > gole2) {
        kierunek = `Wygrana: ${gospodarz} (1)`;
        sila = 'Silna';
        pewnosc_procent = Math.round(pWin * 100);
        uzasadnienie = `${gospodarz} prowadzi 1 bramką i ma pełną kontrolę strzelecką (${stats.homeDominance}%). Mało prawdopodobne, by stracili punkty.`;
      } else if (hasStats && stats.homeDominance < 38 && gole2 > gole1) {
        kierunek = `Wygrana: ${gosc} (2)`;
        sila = 'Silna';
        pewnosc_procent = Math.round(pWin * 100);
        uzasadnienie = `${gosc} prowadzi i dominuje w statystykach strzeleckich. Gospodarze nie są w stanie wykreować sytuacji zagrożenia.`;
      } else {
        // Niepewne prowadzenie 1 bramką - polecamy bezpieczne zabezpieczenie stawkowe (1X / X2)
        kierunek = gole1 > gole2 ? 'Podwójna szansa: 1X' : 'Podwójna szansa: X2';
        sila = 'Silna';
        pewnosc_procent = Math.round((pWin + pDraw) * 100);
        uzasadnienie = `${prowadzacy} prowadzi tylko jedną bramką w końcówce (${minuta}'). Zabezpieczenie podpórką (1X/X2) daje aż ${pewnosc_procent}% matematycznej pewności sukcesu.`;
      }
    } else {
      // Prowadzenie 2+ bramkami
      const faworyt = gole1 > gole2 ? gospodarz : gosc;
      kierunek = gole1 > gole2 ? `Wygrana: ${gospodarz} (1)` : `Wygrana: ${gosc} (2)`;
      sila = 'Silna';
      pewnosc_procent = 98;
      uzasadnienie = `${faworyt} pewnie prowadzi różnicą ${Math.abs(roznica)} bramek w ${minuta}. minucie. Losy spotkania są całkowicie rozstrzygnięte.`;
    }
  } else {
    // Pierwsza połowa lub początek drugiej
    if (hasStats && stats.stagnationLine > 7.5 && totalGole <= 2) {
      kierunek = totalGole === 0 ? 'Under 1.5 gola' : 'Under 2.5 gola';
      sila = 'Silna';
      pewnosc_procent = Math.round((10 - stats.stagnationLine) * 4 + 70);
      uzasadnienie = `Bardzo niska intensywność strzelecka i wysoka stagnacja (${stats.stagnationLine}/10). Mecz toczy się głównie w środku pola bez klarownych sytuacji bramkowych.`;
    } else if (hasStats && stats.stagnationLine < 3.8) {
      kierunek = totalGole >= 2 ? 'Over 2.5 gola / Obie Strzelą (BTTS)' : 'Over 1.5 gola';
      sila = 'Silna';
      pewnosc_procent = Math.round(85 - stats.stagnationLine * 4);
      uzasadnienie = `Niezwykle dynamiczne spotkanie. Niski współczynnik stagnacji (${stats.stagnationLine}/10) i częste strzały zwiastują wysokie prawdopodobieństwo kolejnych bramek.`;
    } else {
      // Szukamy przewagi faworyta ze statystyk i ubezpieczamy za pomocą DNB lub podpórek dla większej sprawdzalności
      if (hasStats && stats.homeDominance > 62) {
        kierunek = `Gospodarz - Remis bez zakładu (DNB 1)`;
        sila = 'Średnia';
        pewnosc_procent = Math.round(p1 * 100 + px * 50);
        uzasadnienie = `Wyraźna dominacja strzelecka gospodarzy (${stats.homeDominance}%). Zakład DNB 1 zabezpiecza przed remisem, co znacząco zwiększa sprawdzalność typu.`;
      } else if (hasStats && stats.homeDominance < 38) {
        kierunek = `Gość - Remis bez zakładu (DNB 2)`;
        sila = 'Średnia';
        pewnosc_procent = Math.round(p2 * 100 + px * 50);
        uzasadnienie = `Goście kontrolują przebieg meczu (${100 - stats.homeDominance}% strzałów). Sugerujemy bezpieczny zakład DNB 2 z pełnym zwrotem w przypadku remisu.`;
      } else {
        // Zwykła analiza probabilistyczna ze wsparciem bezpiecznych typów (podpórek)
        if (p1 > p2 * 1.4) {
          kierunek = `Podwójna szansa: 1X (Gospodarz lub Remis)`;
          pewnosc_procent = Math.round((p1 + px) * 100);
          sila = 'Silna';
          uzasadnienie = `Model probabilistyczny i kursy wskazują na wyższość gospodarzy (${Math.round(p1 * 100)}% szans). Zakład 1X to wysoce prawdopodobny typ o niskim ryzyku.`;
        } else if (p2 > p1 * 1.4) {
          kierunek = `Podwójna szansa: X2 (Remis lub Gość)`;
          pewnosc_procent = Math.round((p2 + px) * 100);
          sila = 'Silna';
          uzasadnienie = `Zbalansowana ocena szans wskazuje na korzyść gości. Typ X2 chroni stawkę w przypadku podziału punktów, dając dużą pewność matematyczną.`;
        } else {
          kierunek = totalGole <= 2 ? 'Under 3.5 gola' : 'Remis lub Under bramkowy';
          sila = 'Średnia';
          pewnosc_procent = 75;
          uzasadnienie = `Bardzo wyrównany mecz bez wyraźnego faworyta. Optymalną strategią przy braku dominacji jest obstawianie bezpiecznych linii underowych lub podziału punktów.`;
        }
      }
    }
  }

  return { kierunek, sila, pewnosc_procent, uzasadnienie };
}

/**
 * Oblicza wartość Expected Value (EV) dla każdego z rynków i wybiera najlepszy zakład.
 */
export function oblicz_wartosci_zakladow(
  kurs1: number,
  kurs_x: number,
  kurs2: number,
  p1: number,
  px: number,
  p2: number
): ValueBet[] {
  const calcKelly = (ev: number, odd: number, isPositive: boolean) => {
    if (!isPositive || odd <= 1) return 0;
    // Standardowa formuła Kelly'ego: f* = ev / (b - 1) gdzie b to dziesiętny kurs (odd)
    // Wykorzystujemy ułamek Ćwierć Kelly'ego (0.25) dla bezpiecznego zarządzania kapitałem
    const rawKelly = ev / (odd - 1);
    const quarterKelly = rawKelly * 0.25;
    return Number(Math.max(0, Math.min(0.20, quarterKelly) * 100).toFixed(1)); // ograniczenie do maks 20% kapitału dla bezpieczeństwa
  };

  const ev1 = kurs1 * p1 - 1;
  const evX = kurs_x * px - 1;
  const ev2 = kurs2 * p2 - 1;

  const isPos1 = ev1 > 0.02;
  const isPosX = evX > 0.02;
  const isPos2 = ev2 > 0.02;

  const bets: ValueBet[] = [
    {
      outcome: '1',
      name: 'Wygrana Gospodarza (1)',
      odd: kurs1,
      fairProb: p1,
      ev: ev1,
      isPositive: isPos1,
      kellyStake: calcKelly(ev1, kurs1, isPos1),
    },
    {
      outcome: 'X',
      name: 'Remis (X)',
      odd: kurs_x,
      fairProb: px,
      ev: evX,
      isPositive: isPosX,
      kellyStake: calcKelly(evX, kurs_x, isPosX),
    },
    {
      outcome: '2',
      name: 'Wygrana Gościa (2)',
      odd: kurs2,
      fairProb: p2,
      ev: ev2,
      isPositive: isPos2,
      kellyStake: calcKelly(ev2, kurs2, isPos2),
    },
  ];

  return bets;
}

/**
 * Konwertuje surowy typ zakładu (outcome) na czytelną, ujednoliconą etykietę polską.
 */
export function outcomeToLabel(outcome: string): string {
  const norm = outcome.toLowerCase();
  if (norm.includes('gospodarz') || norm === '1') {
    return 'Gospodarz (1)';
  }
  if (norm.includes('gosc') || norm.includes('gość') || norm === '2') {
    return 'Gość (2)';
  }
  if (norm.includes('remis') || norm === 'x' || norm.includes('(x)')) {
    return 'Remis (X)';
  }
  return outcome;
}

/**
 * Wylicza sugerowany wynik końcowy w sposób ściśle powiązany z zalecanym typem matematycznym (bez sprzeczności).
 */
export function obliczSugerowanyWynikMatematycznie(
  gole1: number,
  gole2: number,
  typZalecany?: string
): { sugerowaneGole1: number; sugerowaneGole2: number } {
  const typ = (typZalecany || '').toLowerCase();
  
  let sugerowaneGole1 = gole1;
  let sugerowaneGole2 = gole2;

  if (typ.includes('remis') || typ === 'x' || typ.includes('(x)')) {
    // Wynik musi być remisem
    const maxG = Math.max(gole1, gole2);
    sugerowaneGole1 = maxG;
    sugerowaneGole2 = maxG;
  } else if (typ.includes('gospodarz') || typ.includes('(1)') || typ === '1') {
    // Wynik musi wskazywać na zwycięstwo gospodarza
    if (gole1 > gole2) {
      sugerowaneGole1 = gole1;
      sugerowaneGole2 = gole2;
    } else {
      sugerowaneGole1 = gole2 + 1;
      sugerowaneGole2 = gole2;
    }
  } else if (typ.includes('gosc') || typ.includes('gość') || typ.includes('(2)') || typ === '2') {
    // Wynik musi wskazywać na zwycięstwo gości
    if (gole2 > gole1) {
      sugerowaneGole1 = gole1;
      sugerowaneGole2 = gole2;
    } else {
      sugerowaneGole1 = gole1;
      sugerowaneGole2 = gole1 + 1;
    }
  } else {
    // Domyślna minimalna zmiana
    sugerowaneGole1 = gole1;
    sugerowaneGole2 = gole2;
  }

  return { sugerowaneGole1, sugerowaneGole2 };
}

/**
 * Czy padł gol od ostatniego zapisu (pomocnicza flaga dla powiadomień)
 */
export function czy_padl_gol_od_ostatniego_zapisu(
  gole1_nowe: number,
  gole2_nowe: number,
  gole1_stare?: number,
  gole2_stare?: number
): boolean {
  if (gole1_stare === undefined || gole2_stare === undefined) return false;
  return gole1_nowe > gole1_stare || gole2_nowe > gole2_stare;
}

/**
 * Tworzy bogaty, profesjonalny prompt dla Gemini w języku polskim.
 */
export function zbuduj_prompt_panelu(
  gospodarz: string,
  gosc: string,
  gole1: number,
  gole2: number,
  minuta: number,
  kierunek: string,
  sila: string,
  pewnosc_procent: number,
  bestEvBet: ValueBet | null,
  allEvBets: ValueBet[],
  stats: MatchStats,
  strzaly1?: number,
  strzaly2?: number,
  czerwoneKartki1?: number,
  czerwoneKartki2?: number,
  notatki?: string,
  strzalyCelne1?: number,
  strzalyCelne2?: number,
  zolteKartki1?: number,
  zolteKartki2?: number
): string {
  const p1_pct = Math.round(allEvBets[0].fairProb * 100);
  const px_pct = Math.round(allEvBets[1].fairProb * 100);
  const p2_pct = Math.round(allEvBets[2].fairProb * 100);

  const strzaly_domowe = strzaly1 !== undefined ? strzaly1 : 'brak danych';
  const strzaly_wyjazdowe = strzaly2 !== undefined ? strzaly2 : 'brak danych';
  const celne_domowe = strzalyCelne1 !== undefined ? strzalyCelne1 : 'brak danych';
  const celne_wyjazdowe = strzalyCelne2 !== undefined ? strzalyCelne2 : 'brak danych';
  const red_1 = czerwoneKartki1 || 0;
  const red_2 = czerwoneKartki2 || 0;
  const yellow_1 = zolteKartki1 || 0;
  const yellow_2 = zolteKartki2 || 0;

  let text = `Jesteś ekspertem analizy danych sportowych oraz profesjonalnym typerem zakładów piłkarskich na żywo (live betting pro).
Przeanalizuj poniższe szczegółowe dane z meczu i przedstaw krótką, konkretną i zyskowną rekomendację bukmacherską.

[MECZ NA ŻYWO]
Gospodarz: ${gospodarz}
Gość: ${gosc}
Aktualny wynik: ${gole1} : ${gole2}
Aktualna minuta: ${minuta}'

[STATYSTYKI GRY]
Strzały gospodarza: ${strzaly_domowe} (w tym celne: ${celne_domowe})
Strzały gościa: ${strzaly_wyjazdowe} (w tym celne: ${celne_wyjazdowe})
Czerwone kartki gospodarza: ${red_1}
Czerwone kartki gościa: ${red_2}
Żółte kartki gospodarza: ${yellow_1}
Żółte kartki gościa: ${yellow_2}
Dominacja gospodarza (strzały/napór ważony): ${stats.homeDominance}%
Szacowana linia stagnacji meczu: ${stats.stagnationLine} / 10 (gdzie 10 to całkowity brak akcji, niska dynamika)
Opis stanu gry: ${stats.description}
Prognozowana łączna liczba goli w meczu: ${stats.predictedTotalGoals}

[KURSY BUKMACHERSKIE I SZACUNKI MODELU]
Aktualne kursy bukmachera: [1]: ${allEvBets[0].odd} | [X]: ${allEvBets[1].odd} | [2]: ${allEvBets[2].odd}
Modelowe, sprawiedliwe prawdopodobieństwo (skorygowane): 
 - Wygrana ${gospodarz} (1): ${p1_pct}% (Sprawiedliwy kurs: ${(1 / allEvBets[0].fairProb).toFixed(2)})
 - Remis (X): ${px_pct}% (Sprawiedliwy kurs: ${(1 / allEvBets[1].fairProb).toFixed(2)})
 - Wygrana ${gosc} (2): ${p2_pct}% (Sprawiedliwy kurs: ${(1 / allEvBets[2].fairProb).toFixed(2)})

[ANALIZA WARTOŚCI (EV - EXPECTED VALUE)]
${allEvBets.map(b => ` - Zakład na [${b.outcome}]: Realne Prawdobieństwo = ${Math.round(b.fairProb * 100)}%, Kurs = ${b.odd}, Szacowane EV = ${b.ev > 0 ? '+' : ''}${Math.round(b.ev * 100)}%`).join('\n')}

[SUGESTIA MODELU MATEMATYCZNEGO]
Kierunek zakładu: ${kierunek}
Sugerowana siła: ${sila}
Pewność matematyczna: ${pewnosc_procent}%
${bestEvBet ? `Wybrany zakład o najwyższej wartości (EV): [${bestEvBet.outcome}] - ${bestEvBet.name} (Kurs: ${bestEvBet.odd}, EV: +${Math.round(bestEvBet.ev * 100)}%)` : 'Brak jednoznacznego zakładu o dodatnim EV przewyższającym próg bezpieczeństwa.'}

[ZŁOTE OKNO CZASOWE (KOMUNIKAT DLA TYPERA)]
Status wejścia: ${(() => {
  const dummyMatch: LiveMatch = {
    id: 'dummy',
    gospodarz,
    gosc,
    gole1,
    gole2,
    minuta,
    kurs1: allEvBets[0]?.odd || 2,
    kurs_x: allEvBets[1]?.odd || 3,
    kurs2: allEvBets[2]?.odd || 3,
    strzaly1,
    strzaly2,
    strzalyCelne1,
    strzalyCelne2,
    czerwoneKartki1,
    czerwoneKartki2,
    zolteKartki1,
    zolteKartki2,
    dataDodania: '',
    status: 'niesprawdzony'
  };
  const t = ocenOptymalneWejscie(dummyMatch);
  return `${t.status} - ${t.rekomendacja} (Sugerowany zakład czasowy: ${t.typSugerowany}, Szansa: ${t.szansaProcent}%, Poziom ryzyka: ${t.poziomRyzyka}. Uzasadnienie: ${t.opis})`;
})()}

${notatki ? `[DODATKOWE NOTATKI I SYTUACJA NA BOISKU (WPISANE PRZEZ ANalityka)]\n${notatki}\n` : ''}

Wygeneruj profesjonalną analizę live składającą się z następujących sekcji:
1. SZYBKA OCENA TAKTYCZNA (Co dzieje się na boisku, jak upływ czasu i stagnacja wpływają na obie ekipy. Odnieś się do obecnej minuty ${minuta}' i oceń czy obecny przedział czasu 65'-75' minuty jest złotym oknem wejścia o niskim ryzyku dla tego meczu).
2. OCENA WARTOŚCI KURSU (Czy kursy bukmachera są przeszacowane czy niedoszacowane).
3. REKOMENDOWANY BET NA ŻYWO (Dokładny typ, optymalny kurs, sugerowana stawka w skali 1-5 j.).
4. CZYNNIKI RYZYKA (Co może zepsuć ten zakład - np. czerwona kartka, nagła zmiana intensywności).

Pisz zwięźle, konkretnie, unikaj ogólników. Skup się wyłącznie na maksymalizacji zysku (Value Betting).`;

  return text;
}

/**
 * Ocenia czy zalecany typ zakończył się sukcesem na podstawie wpisanego końcowego wyniku.
 * Obsługuje teraz zaawansowane rynki: Podwójną szansę (1X, X2, 12), Remis bez zakładu (DNB) oraz BTTS.
 */
export function ocenWynikZalecanegoTypu(
  typ: string,
  goleGospodarz: number,
  goleGosc: number
): 'wygrany' | 'przegrany' | 'anulowany' {
  const t = typ.toLowerCase();
  
  // 1. Double Chance (Podwójna szansa)
  if (t.includes('1x') || t.includes('gospodarz lub remis')) {
    return goleGospodarz >= goleGosc ? 'wygrany' : 'przegrany';
  }
  if (t.includes('x2') || t.includes('gość lub remis') || t.includes('gosc lub remis') || t.includes('remis lub gość') || t.includes('remis lub gosc')) {
    return goleGospodarz <= goleGosc ? 'wygrany' : 'przegrany';
  }
  if (t.includes('12') || t.includes('gospodarz lub gość') || t.includes('gospodarz lub gosc')) {
    return goleGospodarz !== goleGosc ? 'wygrany' : 'przegrany';
  }

  // 2. Draw No Bet (DNB - Remis bez zakładu)
  if (t.includes('dnb 1') || t.includes('dnb gospodarz') || t.includes('remis bez zakładu 1') || t.includes('remis bez zakładu (1)') || t.includes('remis bez zakładu: 1')) {
    if (goleGospodarz > goleGosc) return 'wygrany';
    if (goleGospodarz === goleGosc) return 'anulowany';
    return 'przegrany';
  }
  if (t.includes('dnb 2') || t.includes('dnb gość') || t.includes('dnb gosc') || t.includes('remis bez zakładu 2') || t.includes('remis bez zakładu (2)') || t.includes('remis bez zakładu: 2')) {
    if (goleGospodarz < goleGosc) return 'wygrany';
    if (goleGospodarz === goleGosc) return 'anulowany';
    return 'przegrany';
  }

  // 3. BTTS (Obie strzelą)
  if (t.includes('btts') || t.includes('obie strzelą') || t.includes('obie strzela')) {
    return (goleGospodarz > 0 && goleGosc > 0) ? 'wygrany' : 'przegrany';
  }

  // 4. Rynki klasyczne 1-X-2
  if (t.includes('gospodarz') || t === '1' || t.startsWith('1 ') || t.endsWith('(1)') || t.includes('wygrana gospodarza')) {
    return goleGospodarz > goleGosc ? 'wygrany' : 'przegrany';
  }
  if (t.includes('gosc') || t.includes('gość') || t === '2' || t.startsWith('2 ') || t.endsWith('(2)') || t.includes('wygrana gościa')) {
    return goleGospodarz < goleGosc ? 'wygrany' : 'przegrany';
  }
  if (t.includes('remis') || t === 'x' || t.startsWith('x ') || t.includes('(x)')) {
    return goleGospodarz === goleGosc ? 'wygrany' : 'przegrany';
  }

  // 5. Under / Over bramkowe
  const totalGoals = goleGospodarz + goleGosc;
  if (t.includes('under')) {
    if (t.includes('1.5')) {
      return totalGoals < 1.5 ? 'wygrany' : 'przegrany';
    }
    if (t.includes('2.5')) {
      return totalGoals < 2.5 ? 'wygrany' : 'przegrany';
    }
    if (t.includes('3.5')) {
      return totalGoals < 3.5 ? 'wygrany' : 'przegrany';
    }
  }
  if (t.includes('over')) {
    if (t.includes('1.5')) {
      return totalGoals > 1.5 ? 'wygrany' : 'przegrany';
    }
    if (t.includes('2.5')) {
      return totalGoals > 2.5 ? 'wygrany' : 'przegrany';
    }
    if (t.includes('3.5')) {
      return totalGoals > 3.5 ? 'wygrany' : 'przegrany';
    }
  }

  // Domyślna ocena
  return 'anulowany';
}

/**
 * Wylicza procentową pewność (Confidence Score) analizy na podstawie statystyk i zmienności.
 */
export function oblicz_confidence_score(
  match: LiveMatch,
  stats: MatchStats | null,
  fairProbs: { p1: number; px: number; p2: number } | null
): number {
  let score = 50; // Bazowa pewność (punkt wyjściowy)

  // 1. Dostępność szczegółowych statystyk (strzałów) znacznie podnosi pewność analizy (+15%)
  if (stats?.hasManualShots || (match.strzaly1 !== undefined && match.strzaly2 !== undefined)) {
    score += 15;
  }

  // 2. Upływ czasu (minuta meczu) - im bliżej końca, tym mniejsza zmienność i wyższa przewidywalność (+20% max)
  const minutaFactor = Math.round((match.minuta / 90) * 20);
  score += minutaFactor;

  // 3. Dominacja/Faworyt na bazie prawdopodobieństw (+15% max)
  if (fairProbs) {
    const maxP = Math.max(fairProbs.p1, fairProbs.px, fairProbs.p2);
    // Jeśli jedna z opcji ma wysokie prawdopodobieństwo, pewność rośnie
    if (maxP > 0.33) {
      score += Math.round((maxP - 0.33) * 22);
    }
  }

  // 4. Stabilność wyniku (głębokość prowadzenia)
  const roznicaGoli = Math.abs(match.gole1 - match.gole2);
  if (roznicaGoli >= 2) {
    score += 8; // Duże prowadzenie to stabilny wynik
  } else if (roznicaGoli === 1 && match.minuta > 75) {
    score += 5; // Jednobramkowe prowadzenie pod koniec też jest dość stabilne
  }

  // 5. Zmienne zakłócające (czerwone kartki)
  const totRedCards = (match.czerwoneKartki1 || 0) + (match.czerwoneKartki2 || 0);
  if (totRedCards > 0) {
    if (match.minuta < 60) {
      // Czerwona kartka wczesnym etapem zwiększa chaos i obniża pewność analizy (-10%)
      score -= 10;
    } else {
      // Pod koniec czerwona kartka ułatwia przewidzenie obrony/ataków faworyta (+5%)
      score += 5;
    }
  }

  // Ograniczamy wynik do bezpiecznego przedziału 20% - 98% (w zakładach nigdy nie ma 100%)
  return Math.max(20, Math.min(98, score));
}

/**
 * Wylicza dynamiczny wskaźnik naporu / tempa gry (Pressure Index) na podstawie
 * linii stagnacji, naporu strzałowego oraz czasu gry.
 */
export function oblicz_pressure_index(m: LiveMatch): { value: number; label: string; isHot: boolean } {
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
    const stats = pobierz_i_opisz_staty(
      m.gospodarz,
      m.gosc,
      m.gole1,
      m.gole2,
      m.minuta,
      fairProbs.p1,
      fairProbs.px,
      fairProbs.p2,
      m.strzaly1,
      m.strzaly2,
      m.strzalyCelne1,
      m.strzalyCelne2,
      m.zolteKartki1,
      m.zolteKartki2
    );

    let value = 50;

    if (stats.hasManualShots) {
      // stagnationLine: 0 = extreme pressure, 10 = total stagnation
      value = Math.round((10 - stats.stagnationLine) * 10);
    } else {
      // Bez statystyk, tempo szacujemy po minucie i roznicy goli
      const roznica = Math.abs(m.gole1 - m.gole2);
      if (m.minuta > 75 && roznica === 1) {
        value = 75; // Duża presja na remis lub podwyższenie
      } else if (m.minuta > 85 && m.gole1 + m.gole2 > 0) {
        value = 65;
      } else {
        value = 45;
      }
    }

    // Korekta o czerwone kartki (+12% do intensywności / zamieszania)
    const totRed = (m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0);
    if (totRed > 0) {
      value += 12;
    }

    // Jeśli zanotowano wysoką średnią goli lub silną dominację jednej ze stron
    if (stats.homeDominance > 70 || stats.homeDominance < 30) {
      value += 8;
    }

    value = Math.max(0, Math.min(100, value));

    let label = 'Niskie';
    let isHot = false;

    if (value >= 78) {
      label = 'Ekstremalne / Gwałtowny Wzrost 🔥';
      isHot = true;
    } else if (value >= 60) {
      label = 'Wysokie Tempo ⚡';
      if (stats.hasManualShots && stats.stagnationLine <= 3.8) {
        isHot = true;
      }
    } else if (value >= 35) {
      label = 'Umiarkowane ⏱️';
    } else {
      label = 'Niskie (Stagnacja) 💤';
    }

    return { value, label, isHot };
  } catch (err) {
    console.error("Błąd w oblicz_pressure_index:", err);
    return { value: 50, label: 'Umiarkowane ⏱️', isHot: false };
  }
}

/**
 * Ocenia optymalny moment wejścia w zakład na żywo (szczególnie w okolicach 65', 70', 75' minuty)
 * pod kątem niskiego ryzyka przegranej i realnej szansy na wygraną.
 */
export function ocenOptymalneWejscie(m: LiveMatch): OptimalEntryAssessment {
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
    const stats = pobierz_i_opisz_staty(
      m.gospodarz,
      m.gosc,
      m.gole1,
      m.gole2,
      m.minuta,
      fairProbs.p1,
      fairProbs.px,
      fairProbs.p2,
      m.strzaly1,
      m.strzaly2,
      m.strzalyCelne1,
      m.strzalyCelne2,
      m.zolteKartki1,
      m.zolteKartki2
    );
    
    const minuta = m.minuta;
    const roznicaGoli = m.gole1 - m.gole2;
    const absRoznica = Math.abs(roznicaGoli);
    const stagnation = stats.stagnationLine; // 0 (wysokie tempo) do 10 (głęboka stagnacja)
    const dominance = stats.homeDominance; // 0 - 100

    // 🎯 Oceniamy pewność (Confidence Score) na podstawie rozbieżności kursów bukmachera a wyliczonych fair-probability
    const impliedP1 = 1 / (m.kurs1 > 1 ? m.kurs1 : 1.01);
    const impliedPX = 1 / (m.kurs_x > 1 ? m.kurs_x : 1.01);
    const impliedP2 = 1 / (m.kurs2 > 1 ? m.kurs2 : 1.01);
    const marginSum = impliedP1 + impliedPX + impliedP2;

    const cleanImplied1 = impliedP1 / (marginSum || 1);
    const cleanImpliedX = impliedPX / (marginSum || 1);
    const cleanImplied2 = impliedP2 / (marginSum || 1);

    // Rozbieżności (edge): Fair probability - Clean implied probability
    const disc1 = fairProbs.p1 - cleanImplied1;
    const discX = fairProbs.px - cleanImpliedX;
    const disc2 = fairProbs.p2 - cleanImplied2;

    const maxPositiveDiscrepancy = Math.max(disc1, discX, disc2);

    // Kalkulacja wskaźnika pewności modelu (Confidence Score %) - oparta na realnych fundamentach statystycznych i bezpieczeństwie bankrollu
    let baseConfidence = 65;
    if (stats.hasManualShots || m.strzaly1 !== undefined) {
      baseConfidence += 10; // Wyższy poziom pewności przy wprowadzonych manualnych strzałach live
    }
    baseConfidence += Math.round((minuta / 90) * 12); // Im bliżej końca meczu, tym większa przewidywalność

    let discrepancyFactor = 0;
    if (maxPositiveDiscrepancy > 0.02 && maxPositiveDiscrepancy <= 0.10) {
      // Słodki punkt (sweet spot) wartościowej przewagi: stabilna i bezpieczna przewaga
      discrepancyFactor = Math.round(maxPositiveDiscrepancy * 120);
    } else if (maxPositiveDiscrepancy > 0.10) {
      // Podejrzanie duża przewaga: może wskazywać na błąd modelu, niepełne dane live lub anomalie rynkowe. Maleje przy skrajnych odchyłach!
      discrepancyFactor = Math.round(12 - (maxPositiveDiscrepancy - 0.10) * 80);
    } else {
      discrepancyFactor = -5; // Słaba lub brak wartościowej przewagi
    }

    let calcConfidence = baseConfidence + discrepancyFactor;
    if (m.oddsHistory && m.oddsHistory.length >= 2) {
      calcConfidence += 5; // Bonus za zarejestrowaną historię skoków kursowych
    }
    const confidenceScore = Math.min(95, Math.max(40, Math.round(calcConfidence)));
    
    // Określamy najbezpieczniejszy zalecany typ pod kątem niskiego ryzyka
    let typSugerowany = 'Wstrzymaj się';
    if (absRoznica >= 2) {
      typSugerowany = roznicaGoli > 0 ? `Wygrana: ${m.gospodarz} (1)` : `Wygrana: ${m.gosc} (2)`;
    } else if (roznicaGoli === 0) {
      if (stagnation > 6.5) {
        typSugerowany = 'Remis (X) / Under bramkowy';
      } else if (dominance > 62) {
        typSugerowany = 'Podwójna Szansa: 1X';
      } else if (dominance < 38) {
        typSugerowany = 'Podwójna Szansa: X2';
      } else {
        typSugerowany = 'Podwójna Szansa: 1X / X2 (Podpórka)';
      }
    } else {
      // 1 gol różnicy
      const leadingOutcome = roznicaGoli > 0 ? '1X' : 'X2';
      if (stagnation > 6.0) {
        typSugerowany = `Zabezpiecz: ${leadingOutcome}`;
      } else {
        typSugerowany = `Remis Bez Zakładu: DNB ${roznicaGoli > 0 ? '1' : '2'}`;
      }
    }

    // ⚡ ANALIZA TRENDU KURSOWEGO (REAL-TIME ODDS VELOCITY & HIGH PROBABILITY MATRIX >= 80%) ⚡
    // Od momentu wpisania danych rejestrujemy i analizujemy dynamiczne skoki kursowe.
    // Łączymy prędkość spadku kursu faworyta (Odds Velocity), efektywność strzałów i wskaźnik stagnacji.
    const history = m.oddsHistory || [];
    if (history.length >= 2) {
      const first = history[0];
      const latest = history[history.length - 1];

      const spadekGospodarz = first.kurs1 - latest.kurs1;
      const spadekGosc = first.kurs2 - latest.kurs2;

      const procentGospodarz = first.kurs1 > 0 ? (spadekGospodarz / first.kurs1) * 100 : 0;
      const procentGosc = first.kurs2 > 0 ? (spadekGosc / first.kurs2) * 100 : 0;

      // Wykrywanie trendu faworyta (kurs początkowy <= 2.80) ze spadkiem kursu >= 3.0%
      const isHomeFav = first.kurs1 <= 2.80 && procentGospodarz >= 3.0;
      const isAwayFav = first.kurs2 <= 2.80 && procentGosc >= 3.0;

      if (isHomeFav || isAwayFav) {
        const favTeam = isHomeFav ? m.gospodarz : m.gosc;
        const startKurs = isHomeFav ? first.kurs1 : first.kurs2;
        const aktKurs = isHomeFav ? latest.kurs1 : latest.kurs2;
        const dropPct = isHomeFav ? procentGospodarz : procentGosc;
        
        // Zabezpieczające typy bukmacherskie (Podpórka 1X / X2 lub DNB) chroniące kapitał
        const safeDoubleChance = isHomeFav ? '1X (Wygrana / Remis)' : 'X2 (Wygrana / Remis)';
        const dnbType = isHomeFav ? 'DNB 1 (Remis Bez Zakładu)' : 'DNB 2 (Remis Bez Zakładu)';

        // Obliczanie ważonego wskaźnika predykcji High-Probability (0-100)
        // 1. Baza wynikająca ze skoku kursowego i stagnacji przeciwnika
        let predictiveScore = 76 + (dropPct * 1.6) + (stagnation * 1.8);

        // 2. Bonus za różnicę goli i brak naporu rywala
        if ((isHomeFav && roznicaGoli >= 0) || (!isHomeFav && roznicaGoli <= 0)) {
          predictiveScore += 6;
        }

        // 3. Efektywność strzałów i kontrola boiska
        const shotsOnTargetFav = isHomeFav ? m.strzalyCelne1 : m.strzalyCelne2;
        if (shotsOnTargetFav >= 3) predictiveScore += 4;

        if (predictiveScore > 98) predictiveScore = 98;
        const szansaRound = Math.round(predictiveScore);

        // Generujemy rekomendację dla skoku trendu
        if (szansaRound >= 80) {
          return {
            status: 'IDEALNY',
            rekomendacja: 'TERAZ STAWIAJ! (TREND 80%+) ⚡',
            poziomRyzyka: 'Niskie',
            szansaProcent: szansaRound,
            confidenceScore: Math.min(98, Math.max(szansaRound, confidenceScore)),
            opis: `Wykryto SILNY TREND SPADKOWY faworyta (${favTeam})! Kurs spadł z ${startKurs.toFixed(2)} na ${aktKurs.toFixed(2)} (-${Math.round(dropPct)}%) przy stabilnej kontroli boiska (stagnacja: ${stagnation.toFixed(1)}/10). Przewidywana skuteczność wynosi ${szansaRound}%! Postaw bezpieczną podpórkę, aby wyeliminować ryzyko straty kuponu.`,
            typSugerowany: `${favTeam}: ${safeDoubleChance} lub ${dnbType}`
          };
        }
      }
    }

    // 1. ZA WCZEŚNIE (Przed 60. minutą)
    if (minuta < 60) {
      return {
        status: 'POCZEKAJ',
        rekomendacja: 'Odczekaj do złotej strefy (65\'-75\')',
        poziomRyzyka: 'Wysokie',
        szansaProcent: Math.round(45 + minuta * 0.4),
        confidenceScore,
        opis: `Mecz trwa dopiero ${minuta} min. Ryzyko na tym etapie jest wysokie ze względu na długi czas do końca i ryzyko niespodziewanych kartek/zmian taktycznych. Najlepsze okazje o niskim ryzyku pojawią się w przedziale 65'-75' minuty.`,
        typSugerowany: 'Obserwuj statystyki'
      };
    }

    // 2. ZA PÓŹNO (Po 78. minucie)
    if (minuta > 78) {
      if (absRoznica >= 2) {
        return {
          status: 'DOBRY',
          rekomendacja: 'Stabilny wynik końcowy',
          poziomRyzyka: 'Niskie',
          szansaProcent: 97,
          confidenceScore,
          opis: `Końcówka meczu (${minuta}'). Przewaga dwiema lub więcej bramkami jest niezwykle stabilna. Prawdopodobieństwo utraty zakładu dążącego do wygranej lidera jest bliskie zeru.`,
          typSugerowany
        };
      }
      
      const isExtremeStagnation = stagnation >= 7.2;
      if (roznicaGoli === 0 && isExtremeStagnation) {
        return {
          status: 'DOBRY',
          rekomendacja: 'Utrzymanie wyniku / Under',
          poziomRyzyka: 'Umiarkowane',
          szansaProcent: 86,
          confidenceScore,
          opis: `Mecz w fazie głębokiej defensywy i stagnacji (${stagnation}/10) w ${minuta}. minucie. Drużyny nie podejmują ryzyka, co minimalizuje szansę na bramki w ostatnich minutach.`,
          typSugerowany: 'Remis (X) lub Under bramkowy'
        };
      }

      return {
        status: 'PRZEKROCZONY',
        rekomendacja: 'Przekroczona Złota Strefa (Chaotyczna końcówka)',
        poziomRyzyka: 'Wysokie',
        szansaProcent: 62,
        confidenceScore,
        opis: `Mecz zbliża się do końca (${minuta}'). Przy wyniku stykowym (różnica 1 gola lub remis przy niskiej stagnacji) gra staje się chaotyczna. Następuje zmęczenie i ryzyko przypadkowych karnych lub błędów obrony. Wejście niesie wysokie ryzyko.`,
        typSugerowany
      };
    }

    // 3. ZŁOTA STREFA (TIMING 60' - 78')
    let status: 'IDEALNY' | 'DOBRY' | 'RYZYKOWNY' = 'DOBRY';
    let poziomRyzyka: 'Niskie' | 'Umiarkowane' | 'Wysokie' = 'Umiarkowane';
    let szansaProcent = 74;
    let opis = '';

    const isLeadingStagnant = absRoznica === 1 && stagnation >= 5.8;
    const isLeadingDominant = (roznicaGoli === 1 && dominance > 60) || (roznicaGoli === -1 && dominance < 40);

    if (absRoznica >= 2) {
      status = 'IDEALNY';
      poziomRyzyka = 'Niskie';
      szansaProcent = 96;
      opis = `Wyjątkowo stabilny mecz w złotym przedziale (${minuta}'). Dwubramkowe prowadzenie to gwarant bezpieczeństwa. Świetny moment na dodanie do kuponu zakładu z zerowym ryzykiem straty.`;
    } else if (isLeadingStagnant || (absRoznica === 1 && isLeadingDominant)) {
      status = 'IDEALNY';
      poziomRyzyka = 'Niskie';
      szansaProcent = 88;
      opis = `Złoty moment na zakład w ${minuta}. minucie! Lider w pełni kontroluje grę, a stagnacja przeciwnika wynosi aż ${stagnation}/10. Przeciwnik nie wykazuje chęci ataku. Ryzyko straty gola jest znikome.`;
    } else if (roznicaGoli === 0 && stagnation >= 6.8) {
      status = 'IDEALNY';
      poziomRyzyka = 'Niskie';
      szansaProcent = 85;
      opis = `Wyśmienita okazja na remis lub under w ${minuta}. minucie. Stagnacja meczu wynosi ${stagnation}/10 (brak strzałów celnych). Brak naporu pozwala na obstawienie bezpiecznego remisu/underu o bardzo wysokiej skuteczności.`;
    } else if (absRoznica === 1 && stagnation < 4.2) {
      status = 'RYZYKOWNY';
      poziomRyzyka = 'Wysokie';
      szansaProcent = 56;
      opis = `Wprawdzie to złota strefa (${minuta}'), lecz tempo gry jest ekstremalne, a stagnacja wynosi tylko ${stagnation}/10. Drużyna przegrywająca mocno naciska. Istnieje duże ryzyko zmiany wyniku, co zwiększa ryzyko wpadki.`;
    } else {
      status = 'DOBRY';
      poziomRyzyka = 'Umiarkowane';
      szansaProcent = 73;
      opis = `Dobry przedział do zakładu (${minuta}'). Sytuacja na boisku jest stabilna. Postawienie na sugerowany bezpieczny rynek (np. Podwójna Szansa lub DNB) zapewnia solidną szansę na wygraną przy chronionej stawce.`;
    }

    return {
      status,
      rekomendacja: status === 'IDEALNY' ? 'ZAGRAJ TERAZ (IDEALNY)' : status === 'DOBRY' ? 'MOŻNA POSTAWIĆ (DOBRY)' : 'ZBYT CHAOTYCZNIE (RYZYKO)',
      poziomRyzyka,
      szansaProcent,
      confidenceScore,
      opis,
      typSugerowany
    };
  } catch (err) {
    console.error("Błąd w ocenOptymalneWejscie:", err);
    return {
      status: 'POCZEKAJ',
      rekomendacja: 'Błąd Kalkulacji',
      poziomRyzyka: 'Wysokie',
      szansaProcent: 50,
      confidenceScore: 50,
      opis: 'Brak danych do wyliczenia idealnego okna wejścia.',
      typSugerowany: 'Brak'
    };
  }
}

/**
 * Oblicza Indeks Spięć (Tension Index) odzwierciedlający poziom agresji i walki na boisku (0-100).
 * Rośnie z czasem (końcówka) i z liczbą kartek żółtych i czerwonych, zwłaszcza przy wyrównanym wyniku.
 */
export function obliczIndeksSpiec(m: LiveMatch): { value: number; level: 'Niski' | 'Umiarkowany' | 'Wysoki' | 'Ekstremalny'; description: string } {
  const min = m.minuta;
  const cardsY = (m.zolteKartki1 || 0) + (m.zolteKartki2 || 0);
  const cardsR = (m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0);
  const diff = Math.abs(m.gole1 - m.gole2);
  
  // Bazowa wartość z kartek
  let base = cardsY * 12 + cardsR * 30;
  
  // Wskaźnik bliskości wyniku
  let scoreMultiplier = 1.0;
  if (diff === 0) {
    scoreMultiplier = 1.35; // remis wzmaga nerwowość pod koniec
  } else if (diff === 1) {
    scoreMultiplier = 1.20; // strata jednej bramki oznacza ciągłą presję i faule taktyczne
  } else {
    scoreMultiplier = 0.75; // pewne prowadzenie uspokaja grę
  }
  
  // Współczynnik czasu gry (faule pod presją czasu są częstsze)
  let minuteFactor = 0.5;
  if (min >= 75) {
    minuteFactor = 1.5;
  } else if (min >= 45) {
    minuteFactor = 1.0;
  } else if (min >= 30) {
    minuteFactor = 0.8;
  }
  
  let tension = Math.min(100, Math.round(base * scoreMultiplier * minuteFactor));
  
  // Jeśli brak kartek, ale jest końcówka w wyrównanym meczu, to wciąż jest napięcie rzędu 10-25%
  if (cardsY === 0 && cardsR === 0) {
    tension = Math.max(5, Math.round((min >= 75 ? 20 : min >= 45 ? 10 : 5) * scoreMultiplier));
  }
  
  let level: 'Niski' | 'Umiarkowany' | 'Wysoki' | 'Ekstremalny' = 'Niski';
  let description = 'Gra przebiega w spokojnej atmosferze, brak ostrych starć.';
  
  if (tension >= 75) {
    level = 'Ekstremalny';
    description = 'Krytyczny poziom agresji! Sędzia traci kontrolę, sypią się upomnienia. Wysokie ryzyko czerwonej kartki, rzutu karnego lub rzutów wolnych z niebezpiecznych stref.';
  } else if (tension >= 45) {
    level = 'Wysoki';
    description = 'Ostra gra i liczne spięcia na boisku. Widoczne są faule taktyczne, prowokacje i nerwowe reakcje zawodników.';
  } else if (tension >= 20) {
    level = 'Umiarkowany';
    description = 'Mecz fizyczny, widoczna twarda walka w środku pola i zacięty kontakt o każdą piłkę.';
  }
  
  return { value: tension, level, description };
}

export interface CardExplosionResult {
  isExplosion: boolean;
  strength: 'Brak' | 'Słaba' | 'Średnia' | 'Krytyczna';
  cardOverTip: string;
  redCardWarning: boolean;
  reasons: string[];
}

/**
 * Wykrywa tzw. "Eksplozję kartek" - moment, w którym tempo pokazywania kartek rośnie lawinowo,
 * wskazując że sędzia stracił panowanie nad meczem, co sprzyja zakładom na over kartkowy lub czerwoną kartkę.
 */
export function wykryjEksplozjeKartek(m: LiveMatch): CardExplosionResult {
  const min = m.minuta;
  const cardsY = (m.zolteKartki1 || 0) + (m.zolteKartki2 || 0);
  const cardsR = (m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0);
  
  const reasons: string[] = [];
  let isExplosion = false;
  let strength: 'Brak' | 'Słaba' | 'Średnia' | 'Krytyczna' = 'Brak';
  let cardOverTip = 'Spokojny mecz. Brak silnego sygnału na kartki.';
  let redCardWarning = false;
  
  if (cardsR > 0) {
    redCardWarning = true;
    reasons.push(`Pokazano już czerwoną kartkę (${cardsR} szt.), co podnosi temperaturę starć.`);
  }
  
  // Częstotliwość kartek na minutę
  const cardsPerMinute = min > 0 ? cardsY / min : 0;
  
  if (cardsY >= 5 && min <= 60) {
    isExplosion = true;
    strength = 'Krytyczna';
    redCardWarning = true;
    cardOverTip = '🔥 SYGNAŁ KRYTYCZNY: Obstaw Over 6.5 / 7.5 żółtych kartek w meczu lub kolejną czerwoną.';
    reasons.push('Anomalna eksplozja kartek (5+) przed 60. minutą. Sędzia zaostrzył kary.');
  } else if (cardsY >= 3 && min <= 35) {
    isExplosion = true;
    strength = 'Średnia';
    cardOverTip = '⚡ SILNY SYGNAŁ: Over 5.5 żółtych kartek. Sędzia ustawia bardzo rygorystyczny próg.';
    reasons.push('Wczesna lawina kartek (3+) przed 35. minutą - nerwowy początek meczu.');
  } else if (cardsY >= 6 && min <= 80) {
    isExplosion = true;
    strength = 'Średnia';
    cardOverTip = '📈 SYGNAŁ OVER: Over 7.5 kartek. Spotkanie obfituje w walkę faul za faul.';
    reasons.push('Wysoka ogólna suma kartek (6+) świadcząca o całkowitej bezpardonowości piłkarzy.');
  } else if (cardsPerMinute >= 0.08 && min > 15) {
    isExplosion = true;
    strength = 'Słaba';
    cardOverTip = 'Gra kontaktowa. Warto rozważyć standardową linię Over 4.5 kartki.';
    reasons.push('Systematyczna częstotliwość kartkowania przekraczająca średnią normę meczową.');
  }
  
  return { isExplosion, strength, cardOverTip, redCardWarning, reasons };
}

export interface OddsReactionResult {
  deviationLevel: 'Normalna' | 'Powolna (Value!)' | 'Nadreakcja (Kontra!)' | 'Brak danych';
  description: string;
  valueOutcome?: '1' | 'X' | '2';
  efficiencyScore: number; // 0-100
}

/**
 * Śledzi zachowanie bukmachera i szuka odstępstw (value) na bazie matematycznej ewolucji prawdopodobieństw.
 * Wykrywa opieszałość bukmachera w obniżaniu kursów lub nadmierną panikę (nadreakcję) na bieżące wydarzenia.
 */
export function analizujReakcjeBukmachera(m: LiveMatch): OddsReactionResult {
  const preProbs = uzyskaj_pre_match_proby(m);
  const probsRaw = przelicz_prawdopodobienstwa(m.kurs1, m.kurs_x, m.kurs2);
  
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
  
  const sumRaw = probsRaw.p1_surowe + probsRaw.px_surowe + probsRaw.p2_surowe;
  if (!sumRaw || m.kurs1 <= 1 || m.kurs_x <= 1 || m.kurs2 <= 1) {
    return { 
      deviationLevel: 'Brak danych', 
      description: 'Kursy nie zostały poprawnie wczytane lub mecz został zablokowany u bukmachera.', 
      efficiencyScore: 50 
    };
  }
  
  // Implikowane prawdopodobieństwa bukmachera bez marży
  const p1_bookie = probsRaw.p1_surowe / sumRaw;
  const px_bookie = probsRaw.px_surowe / sumRaw;
  const p2_bookie = probsRaw.p2_surowe / sumRaw;
  
  const diff1 = fairProbs.p1 - p1_bookie;
  const diffX = fairProbs.px - px_bookie;
  const diff2 = fairProbs.p2 - p2_bookie;
  
  let deviationLevel: 'Normalna' | 'Powolna (Value!)' | 'Nadreakcja (Kontra!)' = 'Normalna';
  let description = 'Bukmacher precyzyjnie reaguje na czas, wynik i zmiany na boisku.';
  let valueOutcome: '1' | 'X' | '2' | undefined;
  let efficiencyScore = 50;
  
  // Bukmacher zbyt wolno reaguje (zostawia zbyt wysoki kurs w stosunku do modelu)
  const slowReactionThreshold = 0.055;
  
  if (diff1 > slowReactionThreshold && diff1 > diffX && diff1 > diff2) {
    deviationLevel = 'Powolna (Value!)';
    valueOutcome = '1';
    efficiencyScore = Math.min(98, 50 + Math.round(diff1 * 260));
    description = `Bukmacher za wolno koryguje kurs na ${m.gospodarz}. Matematyczny model daje im znacznie większe szanse niż kurs live (Valuebet!).`;
  } else if (diff2 > slowReactionThreshold && diff2 > diff1 && diff2 > diffX) {
    deviationLevel = 'Powolna (Value!)';
    valueOutcome = '2';
    efficiencyScore = Math.min(98, 50 + Math.round(diff2 * 260));
    description = `Bukmacher spóźnia się z reakcją na grę ${m.gosc}. Kurs na gości ma ukrytą wartość (Valuebet!).`;
  } else if (diffX > slowReactionThreshold && diffX > diff1 && diffX > diff2) {
    deviationLevel = 'Powolna (Value!)';
    valueOutcome = 'X';
    efficiencyScore = Math.min(98, 50 + Math.round(diffX * 260));
    description = 'Bukmacher opieszale reaguje na upływający czas przy remisie. Kurs na remis spada wolniej niż rzeczywiste prawdopodobieństwo.';
  }
  
  // Bukmacher panikuje / nadreaguje na wydarzenie (np. chwilowy napór, stawiając kursy nieproporcjonalnie nisko)
  const overreactionThreshold = -0.075;
  if (diff1 < overreactionThreshold && Math.abs(diff1) > Math.abs(diff2)) {
    deviationLevel = 'Nadreakcja (Kontra!)';
    valueOutcome = '2'; // Countering gospodarz win by placing a bet on gość (X2 / DNB)
    efficiencyScore = Math.min(95, 50 + Math.round(Math.abs(diff1) * 200));
    description = `Bukmacher uległ przesadnemu entuzjazmowi i zbił kurs na ${m.gospodarz} zbyt agresywnie. Tworzy to świetną okazję do gry przeciwko trendowi (X2 lub DNB na ${m.gosc}).`;
  } else if (diff2 < overreactionThreshold && Math.abs(diff2) > Math.abs(diff1)) {
    deviationLevel = 'Nadreakcja (Kontra!)';
    valueOutcome = '1'; // Countering gość win
    efficiencyScore = Math.min(95, 50 + Math.round(Math.abs(diff2) * 200));
    description = `Kurs na ${m.gosc} został sztucznie zaniżony przez chwilowy napór. Genialna okazja do postawienia kontry na ${m.gospodarz} (1X lub DNB).`;
  }
  
  return { deviationLevel, description, valueOutcome, efficiencyScore };
}
