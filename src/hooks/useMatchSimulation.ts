import { useState, useEffect, useRef } from 'react';
import { LiveMatch } from '../types';
import { przelicz_prawdopodobienstwa, wygladz_prawdopodobienstwa, uzyskaj_pre_match_proby } from '../utils/bettingCalc';
import { SHOT_CHANCE, GOAL_CHANCE, BOOKMAKER_MARGIN } from '../utils/constants';

export function useMatchSimulation(
  match: LiveMatch | null,
  onUpdateMatch: (m: LiveMatch) => void
) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);
  
  // Refy do zapobiegania stale closure bez resetowania interwału
  const onUpdateRef = useRef(onUpdateMatch);
  const matchRef = useRef(match);

  useEffect(() => {
    onUpdateRef.current = onUpdateMatch;
  }, [onUpdateMatch]);

  useEffect(() => {
    matchRef.current = match;
  }, [match]);

  useEffect(() => {
    setSimLog([]);
    setIsSimulating(false);
  }, [match?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && match) {
      interval = setInterval(() => {
        const currentMatch = matchRef.current;
        if (!currentMatch) return;

        // Jeśli minuta wynosi już 90, kończym symulację
        if (currentMatch.minuta >= 90) {
          setIsSimulating(false);
          setSimLog(prev => [`🏁 90' Koniec meczu! Symulacja zakończona.`, ...prev]);
          return;
        }

        // Nowe parametry
        const nMin = Math.min(90, currentMatch.minuta + 1);
        let nGole1 = currentMatch.gole1;
        let nGole2 = currentMatch.gole2;
        let nStrzaly1 = currentMatch.strzaly1 !== undefined ? currentMatch.strzaly1 : Math.round((nMin / 8) * 0.5);
        let nStrzaly2 = currentMatch.strzaly2 !== undefined ? currentMatch.strzaly2 : Math.round((nMin / 8) * 0.4);
        let nYolte1 = currentMatch.zolteKartki1 !== undefined ? currentMatch.zolteKartki1 : 0;
        let nYolte2 = currentMatch.zolteKartki2 !== undefined ? currentMatch.zolteKartki2 : 0;
        
        let newEvent: string | null = null;

        // Szansa na zdarzenie (strzał)
        const shotChance = Math.random();
        if (shotChance < SHOT_CHANCE) {
          const s1 = nStrzaly1;
          const s2 = nStrzaly2;
          let homeDom = 50;
          if (s1 + s2 > 0) {
            homeDom = Math.round((s1 / (s1 + s2)) * 100);
          }
          const isHomeShot = (Math.random() * 100) < homeDom;
          
          if (isHomeShot) {
            nStrzaly1 += 1;
            // Szansa na gol ze strzału
            if (Math.random() < GOAL_CHANCE) {
              nGole1 += 1;
              newEvent = `⚽ ${nMin}' GOOOOL dla ${currentMatch.gospodarz}! Wynik: ${nGole1}:${nGole2}`;
            } else {
              newEvent = `👟 ${nMin}' Groźny strzał ${currentMatch.gospodarz} (niecelny)`;
            }
          } else {
            nStrzaly2 += 1;
            // Szansa na gol ze strzału
            if (Math.random() < GOAL_CHANCE) {
              nGole2 += 1;
              newEvent = `⚽ ${nMin}' GOOOOL dla ${currentMatch.gosc}! Wynik: ${nGole1}:${nGole2}`;
            } else {
              newEvent = `👟 ${nMin}' Strzał drużyny ${currentMatch.gosc} z dystansu (zablokowany)`;
            }
          }
        } else {
          // Szansa na poboczne zdarzenie (kartka, rzut rożny)
          const eventChance = Math.random();
          if (eventChance < GOAL_CHANCE) {
            const isHomeEvent = Math.random() < 0.5;
            const teamName = isHomeEvent ? currentMatch.gospodarz : currentMatch.gosc;
            const eventType = Math.random();
            if (eventType < 0.4) {
              newEvent = `🚩 ${nMin}' Rzut rożny dla ${teamName}`;
            } else if (eventType < 0.7) {
              newEvent = `🟨 ${nMin}' Żółta kartka dla zawodnika ${teamName}`;
              if (isHomeEvent) {
                nYolte1 += 1;
              } else {
                nYolte2 += 1;
              }
            } else {
              newEvent = `🔄 ${nMin}' Zmiana taktyczna w zespole ${teamName}`;
            }
          }
        }

        if (newEvent) {
          setSimLog(prev => [newEvent!, ...prev.slice(0, 19)]);
        }

        // Automatycznie aktualizujemy kursy bukmacherskie na bazie nowej minuty i wyniku
        const preProbs = uzyskaj_pre_match_proby(currentMatch);
        const liveFair = wygladz_prawdopodobienstwa(
          currentMatch.gospodarz,
          currentMatch.gosc,
          nGole1,
          nGole2,
          nMin,
          preProbs.p1,
          preProbs.px,
          preProbs.p2,
          currentMatch.czerwoneKartki1,
          currentMatch.czerwoneKartki2,
          nStrzaly1,
          nStrzaly2,
          currentMatch.strzalyCelne1,
          currentMatch.strzalyCelne2,
          nYolte1,
          nYolte2
        );

        // Zamieniamy na kursy bukmachera z marżą
        const nKurs1 = Math.max(1.01, Math.min(100, Number((1 / (liveFair.p1 * BOOKMAKER_MARGIN)).toFixed(2))));
        const nKursX = Math.max(1.01, Math.min(100, Number((1 / (liveFair.px * BOOKMAKER_MARGIN)).toFixed(2))));
        const nKurs2 = Math.max(1.01, Math.min(100, Number((1 / (liveFair.p2 * BOOKMAKER_MARGIN)).toFixed(2))));

        onUpdateRef.current({
          ...currentMatch,
          minuta: nMin,
          gole1: nGole1,
          gole2: nGole2,
          strzaly1: nStrzaly1,
          strzaly2: nStrzaly2,
          kurs1: nKurs1,
          kurs_x: nKursX,
          kurs2: nKurs2,
          zolteKartki1: nYolte1,
          zolteKartki2: nYolte2
        });

      }, 3000); // co 3 sekundy
    }

    return () => clearInterval(interval);
  }, [isSimulating, match?.id]);

  return {
    isSimulating,
    setIsSimulating,
    simLog,
    setSimLog
  };
}
