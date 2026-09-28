import React from 'react';
import { LiveMatch } from '../types';
import { 
  wygladz_prawdopodobienstwa, 
  oblicz_wartosci_zakladow, 
  uzyskaj_pre_match_proby,
  ocenOptymalneWejscie,
  wykryjEksplozjeKartek
} from './bettingCalc';

export interface AlertNotificationItem {
  id: string;
  matchId: string;
  matchName: string;
  type: 'value_bet' | 'early_red' | 'high_confidence' | 'late_tension' | 'golden_timing' | 'cards';
  severity: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  time: string;
  odd?: number;
}

/**
 * Zwraca listę aktywnych alertów i powiadomień na podstawie bieżącego stanu meczów
 */
export function generateMatchAlerts(matches: LiveMatch[]): AlertNotificationItem[] {
  if (!Array.isArray(matches) || matches.length === 0) {
    return [];
  }

  const alerts: AlertNotificationItem[] = [];

  matches.forEach(m => {
    // Ignorujemy mecze zakończone lub anulowane
    if (m.status === 'wygrany' || m.status === 'przegrany' || m.status === 'anulowany') {
      return;
    }

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
        m.czerwoneKartki2
      );
      const evBets = oblicz_wartosci_zakladow(m.kurs1, m.kurs_x, m.kurs2, fairProbs.p1, fairProbs.px, fairProbs.p2);

      // 1. Alert: Value Bet (+5% EV lub więcej)
      const bestEv = [...evBets].sort((a, b) => b.ev - a.ev)[0];
      if (bestEv && bestEv.ev > 5) {
        alerts.push({
          id: `ev-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'value_bet',
          severity: 'success',
          title: `Value Bet (+${Math.round(bestEv.ev)}% EV)`,
          description: `Zalecany typ: ${bestEv.name} @${bestEv.odd.toFixed(2)} (Fair: ${(1 / bestEv.fairProb).toFixed(2)})`,
          time: `${m.minuta}'`,
          odd: bestEv.odd
        });
      }

      // 2. Alert: Czerwona kartka
      if ((m.czerwoneKartki1 && m.czerwoneKartki1 > 0) || (m.czerwoneKartki2 && m.czerwoneKartki2 > 0)) {
        const teamWithRed = (m.czerwoneKartki1 && m.czerwoneKartki1 > 0) ? m.gospodarz : m.gosc;
        alerts.push({
          id: `red-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'early_red',
          severity: 'danger',
          title: `Czerwona kartka (${teamWithRed})`,
          description: `Gra w osłabieniu od ${m.minuta}'. Gwałtowny spadek kursu na rywali.`,
          time: `${m.minuta}'`
        });
      }

      // 3. Alert: Złote Okno Obstawiania
      const timing = ocenOptymalneWejscie(m);
      if (timing && (timing.status === 'IDEALNY' || timing.szansaProcent >= 75)) {
        alerts.push({
          id: `timing-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'golden_timing',
          severity: 'warning',
          title: `Złote Okno Obstawiania (${timing.szansaProcent}% szans)`,
          description: `Typ: ${timing.typSugerowany}. Idealny moment na wejście w końcówkę spotkania.`,
          time: `${m.minuta}'`
        });
      }

      // 4. Alert: Eksplozja kartek
      const cards = wykryjEksplozjeKartek(m);
      if (cards && cards.isExplosion) {
        alerts.push({
          id: `cards-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'cards',
          severity: 'danger',
          title: `Eksplozja Kartek (${cards.strength})`,
          description: cards.cardOverTip || (cards.reasons && cards.reasons[0]) || 'Wysoka intensywność przewinień i kartkowania.',
          time: `${m.minuta}'`
        });
      }

    } catch (e) {
      console.warn("Błąd generowania alertu dla meczu:", m.id, e);
    }
  });

  return alerts;
}
