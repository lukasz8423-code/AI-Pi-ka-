import React, { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { 
  Sparkles, FileText, Share2, Compass, AlertCircle, RefreshCw, 
  ChevronRight, Calendar, Bookmark, HelpCircle, Clock, Activity
} from 'lucide-react';
import { LiveMatch } from '../types';
import { 
  przelicz_prawdopodobienstwa, 
  wygladz_prawdopodobienstwa, 
  pobierz_i_opisz_staty, 
  oblicz_confidence_score,
  uzyskaj_pre_match_proby
} from '../utils/bettingCalc';

interface AiAnalysisViewProps {
  analysis: string | undefined;
  loading: boolean;
  error: string | null;
  matchName: string;
  match: LiveMatch | null;
}

const LOADING_MESSAGES = [
  '⚽ Analizowanie zachowania formacji obronnych...',
  '📊 Przeliczanie dynamicznego współczynnika stagnacji...',
  '💡 Szukanie rozbieżności kursowych w modelach azjatyckich...',
  '🧠 Generowanie optymalnych scenariuszy taktycznych...',
  '🛡️ Kalkulowanie czynników ryzyka i marży bezpieczeństwa...',
  '📉 Badanie tempa przeprowadzania akcji ofensywnych...'
];

export default function AiAnalysisView({
  analysis,
  loading,
  error,
  matchName,
  match
}: AiAnalysisViewProps) {
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

  // Zmiana komunikatów ładowania co 2.5 sekundy
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingMsgIdx(0);
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Kalkulacja wskaźnika pewności i rozbicie na czynniki pierwsze
  let confidence = 50;
  let hasShots = false;
  let timeContrib = 0;
  let skewContrib = 0;
  let stabilityContrib = 0;
  let redCardPenalty = 0;

  if (match) {
    try {
      const preProbs = uzyskaj_pre_match_proby(match);
      const fairProbs = wygladz_prawdopodobienstwa(
        match.gospodarz,
        match.gosc,
        match.gole1,
        match.gole2,
        match.minuta,
        preProbs.p1,
        preProbs.px,
        preProbs.p2,
        match.czerwoneKartki1,
        match.czerwoneKartki2,
        match.strzaly1,
        match.strzaly2,
        match.strzalyCelne1,
        match.strzalyCelne2,
        match.zolteKartki1,
        match.zolteKartki2
      );
      const stats = pobierz_i_opisz_staty(
        match.gospodarz,
        match.gosc,
        match.gole1,
        match.gole2,
        match.minuta,
        fairProbs.p1,
        fairProbs.px,
        fairProbs.p2,
        match.strzaly1,
        match.strzaly2,
        match.strzalyCelne1,
        match.strzalyCelne2,
        match.zolteKartki1,
        match.zolteKartki2
      );
      
      confidence = oblicz_confidence_score(match, stats, fairProbs);

      // Czynniki cząstkowe dla sekcji technicznej
      hasShots = stats.hasManualShots;
      timeContrib = Math.round((match.minuta / 90) * 20);
      
      if (fairProbs) {
        const maxP = Math.max(fairProbs.p1, fairProbs.px, fairProbs.p2);
        if (maxP > 0.33) {
          skewContrib = Math.round((maxP - 0.33) * 22);
        }
      }
      
      const roznicaGoli = Math.abs(match.gole1 - match.gole2);
      if (roznicaGoli >= 2) {
        stabilityContrib = 8;
      } else if (roznicaGoli === 1 && match.minuta > 75) {
        stabilityContrib = 5;
      }
      
      const totRedCards = (match.czerwoneKartki1 || 0) + (match.czerwoneKartki2 || 0);
      if (totRedCards > 0) {
        if (match.minuta < 60) {
          redCardPenalty = -10;
        } else {
          redCardPenalty = 5;
        }
      }
    } catch (err) {
      console.error("Error calculating confidence breakdown in AiAnalysisView:", err);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 shadow-lg" id="ai-analysis-container">
      {/* Nagłówek panelu */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-slate-100">Analiza Taktyczno-Rynkowa Gemini AI</h3>
            <p className="text-[10px] text-slate-400">Dla meczu: <span className="text-slate-300 font-semibold">{matchName}</span></p>
          </div>
        </div>
        <span className="text-[9px] bg-emerald-950 border border-emerald-800/80 text-emerald-400 font-mono font-bold px-2 py-0.5 rounded uppercase">
          Model: Gemini 3.6 Flash
        </span>
      </div>

      {/* Dynamiczny Wskaźnik Pewności (Confidence Score) */}
      {match && (
        <div className="mb-5 bg-slate-950 border border-slate-850 rounded-lg p-4 animate-fade-in" id="ai-confidence-widget">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Lewa strona: Okrąg/Wskaźnik i główny wynik */}
            <div className="flex items-center gap-4">
              <div className="relative flex items-center justify-center shrink-0">
                {/* Kołowy wykres w SVG */}
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    className="stroke-slate-850 fill-none"
                    strokeWidth="4.5"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    className={`fill-none transition-all duration-1000 ${
                      confidence >= 75 ? 'stroke-emerald-500' :
                      confidence >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                    }`}
                    strokeWidth="5"
                    strokeDasharray={175.92}
                    strokeDashoffset={175.92 - (175.92 * confidence) / 100}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className={`text-base font-mono font-black ${
                    confidence >= 75 ? 'text-emerald-400' :
                    confidence >= 50 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {confidence}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  Confidence Score
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    confidence >= 75 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    confidence >= 55 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-red-950 text-rose-400 border border-red-800'
                  }`}>
                    {confidence >= 75 ? 'Bardzo Wysoka' :
                     confidence >= 60 ? 'Wysoka' :
                     confidence >= 45 ? 'Umiarkowana' : 'Niska'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-normal">
                  Pewność analizy live na bazie naporu, minut meczu, czerwonych kartek i zmienności rynkowej.
                </p>
              </div>
            </div>

            {/* Prawa strona: Rozbicie czynników */}
            <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-800/80 min-w-[210px] text-[10px] space-y-1 font-mono">
              <div className="text-slate-500 uppercase font-bold text-[9px] tracking-wider border-b border-slate-800 pb-1 mb-1">
                Kalkulacja pewności:
              </div>
              
              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" /> Minuta gry ({match.minuta}'):
                </span>
                <span className="text-emerald-400 font-bold">+{timeContrib}%</span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-slate-400">
                  <Activity className="w-3 h-3 text-slate-500" /> Statystyki strzałów:
                </span>
                <span className={hasShots ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {hasShots ? `+15%` : 'brak danych'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-300">
                <span className="flex items-center gap-1 text-slate-400">
                  <Sparkles className="w-3 h-3 text-slate-500" /> Faworyt / Skos kursów:
                </span>
                <span className={skewContrib > 0 ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {skewContrib > 0 ? `+${skewContrib}%` : 'brak'}
                </span>
              </div>

              {stabilityContrib > 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    🛡️ Stabilność wyniku:
                  </span>
                  <span className="text-emerald-400 font-bold">+{stabilityContrib}%</span>
                </div>
              )}

              {redCardPenalty !== 0 && (
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="inline-block w-1.5 h-2.5 bg-red-600 rounded-[1px]"></span> Chaos (Czerwone kartki):
                  </span>
                  <span className={redCardPenalty < 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
                    {redCardPenalty > 0 ? `+${redCardPenalty}%` : `${redCardPenalty}%`}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Ekran ładowania (AI analizuje) */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4" id="ai-loader-block">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-slate-800 border-t-emerald-500 animate-spin"></div>
            <Sparkles className="w-5 h-5 text-emerald-400 absolute animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-100">Generowanie raportu na żywo...</p>
            <p className="text-xs text-slate-400 h-5 font-mono italic animate-fade-in transition-all">
              {LOADING_MESSAGES[loadingMsgIdx]}
            </p>
          </div>
        </div>
      )}

      {/* Ekran błędu */}
      {!loading && error && (
        <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 flex gap-3 items-start" id="ai-error-block">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider">Wystąpił problem ze schowkiem/API</h4>
            <p className="text-xs text-slate-300 mt-1">{error}</p>
            <p className="text-[10px] text-slate-500 mt-2">
              💡 Możesz skopiować prompt ręcznie i wkleić go w oficjalnym czacie Gemini (https://gemini.google.com), a następnie przekleić odpowiedź.
            </p>
          </div>
        </div>
      )}

      {/* Brak analizy (placeholder) */}
      {!loading && !error && !analysis && (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-3 border border-dashed border-slate-800 rounded-lg bg-slate-950/30" id="ai-placeholder-block">
          <FileText className="w-8 h-8 text-slate-700" />
          <h4 className="text-xs font-semibold text-slate-400">Raport taktyczny nie został jeszcze wygenerowany</h4>
          <p className="text-[11px] text-slate-500 max-w-sm">
            Kliknij przycisk <strong>"Uruchom analizę Gemini AI"</strong> w panelu sterowania u góry, aby otrzymać zautomatyzowane sugestie, predykcje, optymalne stawkowanie i analizę taktyczną w czasie rzeczywistym.
          </p>
        </div>
      )}

      {/* Wyrenderowany Raport w formacie Markdown */}
      {!loading && !error && analysis && (
        <div className="bg-slate-950 rounded-lg p-4 md:p-6 border border-slate-850" id="ai-markdown-report">
          <div className="markdown-body text-sm text-slate-300 space-y-4 leading-relaxed">
            <Markdown>{analysis}</Markdown>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              Rekomendacje są szacunkami matematycznymi. Graj odpowiedzialnie.
            </span>
            <span className="font-mono">Generowane lokalnie</span>
          </div>
        </div>
      )}
    </div>
  );
}
