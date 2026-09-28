import React from 'react';
import { LiveMatch } from '../types';
import { Bell, Flame, Sparkles, ShieldAlert, AlertTriangle, ChevronRight, X, Volume2, VolumeX, CheckCircle2 } from 'lucide-react';
import { 
  przelicz_prawdopodobienstwa, 
  wygladz_prawdopodobienstwa, 
  oblicz_wartosci_zakladow, 
  uzyskaj_pre_match_proby,
  ocenOptymalneWejscie,
  wykryjEksplozjeKartek
} from '../utils/bettingCalc';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: LiveMatch[];
  onSelectMatch: (id: string) => void;
  selectedMatchId: string | null;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  matches,
  onSelectMatch,
  selectedMatchId,
}) => {
  const [soundMuted, setSoundMuted] = React.useState(false);

  if (!isOpen) return null;

  // Wyliczanie alertów w czasie rzeczywistym
  const alerts: Array<{
    id: string;
    matchId: string;
    matchName: string;
    type: string;
    severity: 'success' | 'warning' | 'info' | 'danger';
    title: string;
    description: string;
    time: string;
    odd?: number;
  }> = [];

  matches.forEach(m => {
    if (m.status === 'wygrany' || m.status === 'przegrany' || m.status === 'anulowany') return;

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
        preProbs.p2
      );
      const evBets = oblicz_wartosci_zakladow(m.kurs1, m.kurs_x, m.kurs2, fairProbs.p1, fairProbs.px, fairProbs.p2);

      // Value bet
      const bestEv = [...evBets].sort((a, b) => b.ev - a.ev)[0];
      if (bestEv && bestEv.ev > 8) {
        alerts.push({
          id: `ev-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'value_bet',
          severity: 'success',
          title: `Value Bet (+${Math.round(bestEv.ev)}% EV)`,
          description: `Zalecany typ: ${bestEv.name} @${bestEv.odd.toFixed(2)} (Fair: ${(1/bestEv.fairProb).toFixed(2)})`,
          time: `${m.minuta}'`,
          odd: bestEv.odd
        });
      }

      // Golden Timing
      const timing = ocenOptymalneWejscie(m);
      if (timing.status === 'IDEALNY') {
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

      // Eksplozja kartek
      const cards = wykryjEksplozjeKartek(m);
      if (cards.isExplosion) {
        alerts.push({
          id: `cards-${m.id}`,
          matchId: m.id,
          matchName: `${m.gospodarz} vs ${m.gosc}`,
          type: 'cards',
          severity: 'danger',
          title: `Eksplozja Kartek (${cards.strength})`,
          description: cards.cardOverTip,
          time: `${m.minuta}'`
        });
      }
    } catch (e) {
      // ignore
    }
  });

  const playTestSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
      console.warn("AudioContext blocked:", e);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b131e] border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-8 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Centrum Powiadomień Live</span>
                <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-rose-500/30 font-bold">
                  {alerts.length} aktywnych
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Automatyczne alerty radarów analitycznych</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={playTestSound}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
              title="Przetestuj dźwięk powiadomienia"
            >
              <span>Testuj 🔔</span>
            </button>
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg transition cursor-pointer"
              title={soundMuted ? "Włącz dźwięki" : "Wycisz dźwięki"}
            >
              {soundMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-850 rounded-lg transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lista Alertów */}
        <div className="p-4 space-y-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-70" />
              Brak pilnych anomalii w tym momencie. Wszystkie mecze są stabilne.
            </div>
          ) : (
            alerts.map((alert) => {
              const isSelected = selectedMatchId === alert.matchId;
              const borderCol =
                alert.severity === 'success' ? 'border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40' :
                alert.severity === 'warning' ? 'border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/40' :
                alert.severity === 'danger' ? 'border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40' :
                'border-sky-900/60 bg-sky-950/20 hover:bg-sky-950/40';

              return (
                <div
                  key={alert.id}
                  onClick={() => {
                    onSelectMatch(alert.matchId);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${borderCol} ${
                    isSelected ? 'ring-1 ring-sky-400 shadow-md' : ''
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {alert.severity === 'success' && <Flame className="w-4 h-4 text-emerald-400" />}
                      {alert.severity === 'warning' && <Sparkles className="w-4 h-4 text-amber-400" />}
                      {alert.severity === 'danger' && <ShieldAlert className="w-4 h-4 text-rose-400" />}
                      {alert.severity === 'info' && <AlertTriangle className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100 group-hover:text-sky-300 transition">
                          {alert.title}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded">
                          {alert.time}
                        </span>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-300 mt-0.5 truncate">
                        {alert.matchName}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center self-center shrink-0 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950/80 border-t border-slate-850 flex justify-between items-center text-xs text-slate-400">
          <span>Kliknij w alert, aby natychmiast przejść do meczu.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
