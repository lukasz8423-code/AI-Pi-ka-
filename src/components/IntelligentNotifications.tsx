import React, { useState, useEffect, useRef } from 'react';
import { Bell, Sparkles, AlertTriangle, Flame, ShieldAlert, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { LiveMatch } from '../types';
import { 
  przelicz_prawdopodobienstwa, 
  wygladz_prawdopodobienstwa, 
  pobierz_i_opisz_staty, 
  oblicz_confidence_score,
  oblicz_wartosci_zakladow,
  ocenOptymalneWejscie,
  uzyskaj_pre_match_proby,
  wykryjEksplozjeKartek,
  analizujReakcjeBukmachera
} from '../utils/bettingCalc';

interface IntelligentNotificationsProps {
  matches: LiveMatch[];
  onSelectMatch: (id: string) => void;
  selectedMatchId: string | null;
}

interface AlertItem {
  id: string; // generated unique id for the alert
  matchId: string;
  matchName: string;
  type: 'value_bet' | 'early_red' | 'high_confidence' | 'late_tension' | 'golden_timing';
  severity: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  description: string;
  icon: React.ReactNode;
  time: string;
}

export default function IntelligentNotifications({
  matches,
  onSelectMatch,
  selectedMatchId
}: IntelligentNotificationsProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Refy do śledzenia wcześniej wygenerowanych powiadomień oraz faktu zainicjalizowania
  const previousAlertIds = useRef<string[]>([]);
  const isInitialized = useRef(false);

  // Funkcja do odtwarzania profesjonalnego sygnału dźwiękowego (podwójny dzwonek)
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playChime = (freq: number, delay: number, volume: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
        
        gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + duration);
      };

      // Subtelny i profesjonalny podwójny dzwonek (A5, potem E6)
      playChime(880.00, 0, 0.08, 0.5); 
      playChime(1318.51, 0.12, 0.06, 0.6); 
    } catch (e) {
      console.warn("Autoplay / AudioContext blocked by browser constraints:", e);
    }
  };

  // Generuj alertu na bieżąco na podstawie listy meczów
  useEffect(() => {
    const generatedAlerts: AlertItem[] = [];

    matches.forEach(m => {
      // Ignorujemy mecze zakończone lub anulowane
      if (m.status === 'wygrany' || m.status === 'przegrany' || m.status === 'anulowany') {
        return;
      }

      // 1. Wyliczanie prawdopodobieństw i EV
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
        const evBets = oblicz_wartosci_zakladow(m.kurs1, m.kurs_x, m.kurs2, fairProbs.p1, fairProbs.px, fairProbs.p2);
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
        const confidence = oblicz_confidence_score(m, stats, fairProbs);

        // a) Sygnał Value Bet (> 12% EV)
        const bestEvBet = [...evBets].sort((a, b) => b.ev - a.ev)[0];
        if (bestEvBet && bestEvBet.ev > 12) {
          const fairOdds = 1 / (bestEvBet.fairProb || 0.01);
          generatedAlerts.push({
            id: `ev-${m.id}-${bestEvBet.outcome}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'value_bet',
            severity: 'success',
            title: `Wykryto Sygnał Value Bet (+${Math.round(bestEvBet.ev)}% EV)`,
            description: `Model sugeruje zakład: "${bestEvBet.name}" o realnym kursie ${fairOdds.toFixed(2)} vs oferowany ${bestEvBet.odd.toFixed(2)}.`,
            icon: <Flame className="w-4 h-4 text-emerald-400" />,
            time: `${m.minuta}'`
          });
        }

        // b) Czerwona kartka przed 60 minutą (duże zamieszanie taktyczne)
        const redCardsTotal = (m.czerwoneKartki1 || 0) + (m.czerwoneKartki2 || 0);
        if (redCardsTotal > 0 && m.minuta < 60) {
          generatedAlerts.push({
            id: `red-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'early_red',
            severity: 'danger',
            title: 'Wysoka niestabilność: Czerwona kartka!',
            description: `${m.gospodarz} ${m.czerwoneKartki1 || 0} : ${m.czerwoneKartki2 || 0} ${m.gosc}. Wczesne osłabienie drastycznie zwiększa zmienność kursów.`,
            icon: <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />,
            time: `${m.minuta}'`
          });
        }

        // c) Bardzo wysoki Confidence Score (> 80%)
        if (confidence >= 80) {
          generatedAlerts.push({
            id: `conf-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'high_confidence',
            severity: 'info',
            title: `Wysoka pewność matematyczna: ${confidence}%`,
            description: `Bardzo wysoka zgodność statystyczna i rynkowa. Wynik oraz zachowanie linii wskazują na stabilny przebieg gry.`,
            icon: <Sparkles className="w-4 h-4 text-sky-400" />,
            time: `${m.minuta}'`
          });
        }

        // d) Końcówka pod napięciem (stagnacja niska, minuta > 78, 1 bramka różnicy)
        const roznica = Math.abs(m.gole1 - m.gole2);
        if (m.minuta >= 78 && roznica === 1 && stats.stagnationLine < 5) {
          generatedAlerts.push({
            id: `late-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'late_tension',
            severity: 'warning',
            title: 'Sygnał: Bramka w końcówce (Late Goal Pressure)',
            description: `Niski wskaźnik stagnacji (${stats.stagnationLine}/10) i jednobramkowy dystans. Rywale intensywnie forsują ataki.`,
            icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
            time: `${m.minuta}'`
          });
        }

        // e) Złoty Moment Wejścia (Golden Timing: status IDEALNY, minuta 60-78)
        const timing = ocenOptymalneWejscie(m);
        if (timing.status === 'IDEALNY') {
          generatedAlerts.push({
            id: `golden-${m.id}-${m.minuta}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'golden_timing',
            severity: 'success',
            title: `Złote Okno Obstawiania! (Zagraj Teraz ⏱️)`,
            description: `Mecz w ${m.minuta}. minucie spełnia kryteria niskiego ryzyka. Sugerowany zakład: "${timing.typSugerowany}" (${timing.szansaProcent}% szans).`,
            icon: <Bell className="w-4 h-4 text-emerald-400 animate-bounce" />,
            time: `${m.minuta}'`
          });
        }

        // f) Wykrywanie Eksplozji Kartek (Sędzia traci kontrolę!)
        const cardExplosion = wykryjEksplozjeKartek(m);
        if (cardExplosion.isExplosion) {
          generatedAlerts.push({
            id: `card-explosion-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'late_tension',
            severity: cardExplosion.strength === 'Krytyczna' ? 'danger' : 'warning',
            title: `Wykryto Eksplozję Kartek! (${cardExplosion.strength})`,
            description: `${cardExplosion.cardOverTip} Powód: ${cardExplosion.reasons[0] || ''}`,
            icon: <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />,
            time: `${m.minuta}'`
          });
        }

        // g) Śledzenie Reakcji Bukmachera / Odchyleń Kursowych
        const bookieReaction = analizujReakcjeBukmachera(m);
        if (bookieReaction.deviationLevel.includes('Value')) {
          generatedAlerts.push({
            id: `bookie-lag-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'value_bet',
            severity: 'success',
            title: `Bukmacher zaspał! (Slow Odds Response)`,
            description: `${bookieReaction.description} Sugerowana kontra: ${bookieReaction.valueOutcome === '1' ? m.gospodarz : bookieReaction.valueOutcome === '2' ? m.gosc : 'Remis'}.`,
            icon: <Flame className="w-4 h-4 text-emerald-400" />,
            time: `${m.minuta}'`
          });
        } else if (bookieReaction.deviationLevel.includes('Nadreakcja')) {
          generatedAlerts.push({
            id: `bookie-panic-${m.id}`,
            matchId: m.id,
            matchName: `${m.gospodarz} - ${m.gosc}`,
            type: 'value_bet',
            severity: 'info',
            title: `Panika rynkowa (Market Overreaction)`,
            description: `${bookieReaction.description}`,
            icon: <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />,
            time: `${m.minuta}'`
          });
        }

      } catch (err) {
        console.error("Error creating live alerts:", err);
      }
    });

    // Filtruj te, które zostały odrzucone przez użytkownika w tej sesji
    const activeAlerts = generatedAlerts.filter(a => !dismissedIds.includes(a.id));
    const currentIds = activeAlerts.map(a => a.id);

    // Odtwarzamy dźwięk tylko, gdy:
    // 1. Komponent zakończył pierwszy przebieg (nie hałasujemy przy pierwszym wejściu/odświeżeniu strony)
    // 2. Pojawiło się zupełnie nowe powiadomienie (jego ID nie było w poprzednim stanie)
    // 3. Dźwięk jest włączony w ustawieniach
    const hasNewAlert = isInitialized.current && currentIds.some(
      id => !previousAlertIds.current.includes(id)
    );

    if (hasNewAlert && soundEnabled) {
      playNotificationSound();
    }

    // Aktualizacja refów
    previousAlertIds.current = currentIds;
    isInitialized.current = true;

    setAlerts(activeAlerts);
  }, [matches, dismissedIds, soundEnabled]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, id]);
  };

  const handleClearAllDismissed = () => {
    setDismissedIds([]);
  };

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-slate-500" />
          <span>Monitor live aktywny. Brak krytycznych anomalii lub wyjątkowych sygnałów matematycznych w tym momencie.</span>
        </div>
        <div className="flex items-center gap-3">
          {dismissedIds.length > 0 && (
            <button 
              onClick={handleClearAllDismissed}
              className="text-[10px] text-emerald-400 hover:underline hover:text-emerald-300 transition"
            >
              Przywróć zamknięte ({dismissedIds.length})
            </button>
          )}
          <button 
            onClick={playNotificationSound}
            className="text-[10px] bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-md transition flex items-center gap-1 font-medium"
            title="Przetestuj dzwonek powiadomienia"
          >
            <span>Testuj 🔔</span>
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-500 hover:text-slate-300 transition p-1 hover:bg-slate-950/40 rounded-md"
            title={soundEnabled ? "Wycisz dźwięki alertów" : "Włącz dźwięki alertów"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg animate-fadeIn" id="intelligent-notifications-panel">
      {/* Nagłówek */}
      <div className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-emerald-400 animate-swing" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          </div>
          <span className="text-xs font-display font-semibold text-slate-100">Inteligentne Powiadomienia & Sygnały Live</span>
          <span className="text-[10px] bg-emerald-950 text-emerald-400 font-mono font-bold px-1.5 py-0.2 rounded-full border border-emerald-800">
            {alerts.length} aktywnych
          </span>
        </div>
        <div className="flex items-center gap-3">
          {dismissedIds.length > 0 && (
            <button 
              onClick={handleClearAllDismissed}
              className="text-[10px] text-emerald-400 hover:underline transition font-semibold"
            >
              Przywróć ukryte
            </button>
          )}
          <button 
            onClick={playNotificationSound}
            className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 px-2.5 py-1 rounded-md transition flex items-center gap-1 font-medium"
            title="Przetestuj dzwonek powiadomienia"
          >
            <span>Testuj 🔔</span>
          </button>
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-slate-100 transition p-1 hover:bg-slate-900/40 rounded-md"
            title={soundEnabled ? "Wycisz dźwięki powiadomień" : "Włącz dźwięki powiadomień"}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Grid z powiadomieniami */}
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto custom-scrollbar">
        {alerts.map(alert => {
          const isSelected = selectedMatchId === alert.matchId;
          const bgSeverity = 
            alert.severity === 'success' ? 'bg-emerald-950/30 hover:bg-emerald-950/40 border-emerald-900/50' :
            alert.severity === 'warning' ? 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-900/40' :
            alert.severity === 'danger' ? 'bg-rose-950/30 hover:bg-rose-950/40 border-rose-900/50' :
            'bg-sky-950/30 hover:bg-sky-950/40 border-sky-900/50';

          return (
            <div
              key={alert.id}
              onClick={() => onSelectMatch(alert.matchId)}
              className={`border rounded-lg p-3 cursor-pointer transition-all duration-300 flex gap-2.5 items-start relative group text-left ${bgSeverity} ${
                isSelected ? 'ring-1 ring-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.15)]' : ''
              }`}
            >
              {/* Ikona statusu */}
              <div className="mt-0.5 shrink-0">
                {alert.icon}
              </div>

              {/* Treść */}
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[130px]" title={alert.matchName}>
                    {alert.matchName}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 py-0.2 rounded">
                    {alert.time}
                  </span>
                </div>
                <h4 className="text-[11px] font-bold text-slate-100 mt-0.5 leading-tight group-hover:text-emerald-300 transition-colors">
                  {alert.title}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                  {alert.description}
                </p>
              </div>

              {/* Guzik zamykania (Odrzucenia) */}
              <button
                onClick={(e) => handleDismiss(alert.id, e)}
                className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 p-0.5 rounded hover:bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Ukryj to powiadomienie"
              >
                <span className="block text-[9px] font-bold px-1">×</span>
              </button>

              {/* Strzałka wejścia */}
              <div className="absolute bottom-2.5 right-2 text-slate-600 group-hover:text-emerald-400 transition-colors">
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
