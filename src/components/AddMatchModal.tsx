import React, { useState } from 'react';
import { LiveMatch } from '../types';
import { uzyskaj_pre_match_proby } from '../utils/bettingCalc';
import { fetchStatsForMatch } from '../utils/apiService';
import { Plus, X, Sparkles, RefreshCw, AlertCircle, CheckCircle2, Download } from 'lucide-react';

interface AddMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMatch: (newMatch: LiveMatch) => void;
  apiKey?: string;
}

export const AddMatchModal: React.FC<AddMatchModalProps> = ({
  isOpen,
  onClose,
  onAddMatch,
  apiKey,
}) => {
  // Czyste, puste stany początkowe bez żadnych zahardkodowanych wartości testowych
  const [gospodarz, setGospodarz] = useState('');
  const [gosc, setGosc] = useState('');
  const [gole1, setGole1] = useState('');
  const [gole2, setGole2] = useState('');
  const [minuta, setMinuta] = useState('');
  const [kurs1, setKurs1] = useState('');
  const [kurs_x, setKursX] = useState('');
  const [kurs2, setKurs2] = useState('');
  const [strzaly1, setStrzaly1] = useState('');
  const [strzaly2, setStrzaly2] = useState('');
  const [strzalyCelne1, setStrzalyCelne1] = useState('');
  const [strzalyCelne2, setStrzalyCelne2] = useState('');
  const [posiadaniePilki1, setPosiadaniePilki1] = useState('');
  const [notatki, setNotatki] = useState('');

  const [fetchingApi, setFetchingApi] = useState(false);
  const [apiFeedback, setApiFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleResetForm = () => {
    setGospodarz('');
    setGosc('');
    setGole1('');
    setGole2('');
    setMinuta('');
    setKurs1('');
    setKursX('');
    setKurs2('');
    setStrzaly1('');
    setStrzaly2('');
    setStrzalyCelne1('');
    setStrzalyCelne2('');
    setPosiadaniePilki1('');
    setNotatki('');
    setApiFeedback(null);
  };

  const handleFetchStatsFromApi = async () => {
    if (!gospodarz.trim() && !gosc.trim()) {
      setApiFeedback({
        type: 'error',
        message: 'Wpisz nazwę gospodarza lub gościa przed pobraniem z API.'
      });
      return;
    }

    setFetchingApi(true);
    setApiFeedback(null);

    try {
      const stats = await fetchStatsForMatch(gospodarz.trim(), gosc.trim(), apiKey);
      if (stats) {
        if (stats.gospodarz && !gospodarz) setGospodarz(stats.gospodarz);
        if (stats.gosc && !gosc) setGosc(stats.gosc);
        setGole1(String(stats.gole1 ?? 0));
        setGole2(String(stats.gole2 ?? 0));
        setMinuta(String(stats.minuta ?? 45));
        setKurs1(String(stats.kurs1 ?? 2.20));
        setKursX(String(stats.kurs_x ?? 3.10));
        setKurs2(String(stats.kurs2 ?? 3.00));
        setStrzaly1(String(stats.strzaly1 ?? 6));
        setStrzaly2(String(stats.strzaly2 ?? 5));
        setStrzalyCelne1(String(stats.strzalyCelne1 ?? 3));
        setStrzalyCelne2(String(stats.strzalyCelne2 ?? 2));
        setPosiadaniePilki1(String(stats.posiadaniePilki1 ?? 50));
        if (stats.notatki) setNotatki(stats.notatki);

        setApiFeedback({
          type: 'success',
          message: 'Pomyślnie pobrano i uzupełniono statystyki z API!'
        });
      } else {
        setApiFeedback({
          type: 'error',
          message: 'Nie znaleziono meczu w bieżącej bazie API. Wprowadź dane ręcznie.'
        });
      }
    } catch (err: any) {
      setApiFeedback({
        type: 'error',
        message: err.message || 'Błąd podczas komunikacji z API meczowym.'
      });
    } finally {
      setFetchingApi(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gospodarz.trim() || !gosc.trim()) return;

    const parsedMinuta = Math.min(90, Math.max(1, parseInt(minuta) || 1));
    const parsedGole1 = Math.max(0, parseInt(gole1) || 0);
    const parsedGole2 = Math.max(0, parseInt(gole2) || 0);
    const parsedKurs1 = parseFloat(kurs1) > 1.01 ? parseFloat(kurs1) : 2.0;
    const parsedKursX = parseFloat(kurs_x) > 1.01 ? parseFloat(kurs_x) : 3.0;
    const parsedKurs2 = parseFloat(kurs2) > 1.01 ? parseFloat(kurs2) : 3.0;
    const parsedPossession = Math.min(95, Math.max(5, parseInt(posiadaniePilki1) || 50));

    const newId = `custom-${Date.now()}`;
    const matchObj: LiveMatch = {
      id: newId,
      gospodarz: gospodarz.trim(),
      gosc: gosc.trim(),
      gole1: parsedGole1,
      gole2: parsedGole2,
      minuta: parsedMinuta,
      kurs1: parsedKurs1,
      kurs_x: parsedKursX,
      kurs2: parsedKurs2,
      strzaly1: parseInt(strzaly1) || 0,
      strzaly2: parseInt(strzaly2) || 0,
      strzalyCelne1: parseInt(strzalyCelne1) || 0,
      strzalyCelne2: parseInt(strzalyCelne2) || 0,
      posiadaniePilki1: parsedPossession,
      posiadaniePilki2: 100 - parsedPossession,
      notatki: notatki.trim(),
      status: 'niesprawdzony',
      dataDodania: new Date().toISOString(),
      typZalecany: parsedKurs2 < parsedKurs1 ? `${gosc.trim()} (DNB / Zwycięstwo)` : `${gospodarz.trim()} (DNB / Zwycięstwo)`,
      kursZalecany: parsedKurs2 < parsedKurs1 ? parsedKurs2 : parsedKurs1,
      evZalecane: 0.045
    };

    matchObj.startingPreMatchProbs = uzyskaj_pre_match_proby(matchObj);
    onAddMatch(matchObj);
    handleResetForm();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b131e] border border-slate-850 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-8 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Dodaj Nowy Mecz Live</h3>
              <p className="text-[11px] text-slate-400">Wprowadź drużyny lub pobierz dane z zewnętrznego API</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formularz */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Drużyny */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Gospodarz (1):</label>
              <input
                type="text"
                required
                value={gospodarz}
                onChange={(e) => setGospodarz(e.target.value)}
                placeholder="np. Real Madryt"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Gość (2):</label>
              <input
                type="text"
                required
                value={gosc}
                onChange={(e) => setGosc(e.target.value)}
                placeholder="np. FC Barcelona"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
          </div>

          {/* Wyraźny przycisk pobierania z API */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleFetchStatsFromApi}
              disabled={fetchingApi || (!gospodarz.trim() && !gosc.trim())}
              className="w-full py-2.5 px-4 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 hover:border-sky-500 text-sky-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              {fetchingApi ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Pobieranie statystyk z API...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pobierz statystyki z API dla tego meczu</span>
                </>
              )}
            </button>
          </div>

          {/* Komunikat o stanie pobierania */}
          {apiFeedback && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
              apiFeedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}>
              {apiFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{apiFeedback.message}</span>
            </div>
          )}

          {/* Wynik i Minuta */}
          <div className="grid grid-cols-3 gap-3 bg-[#0e1724] p-3 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Gole Gosp.</label>
              <input
                type="number"
                min="0"
                max="20"
                value={gole1}
                onChange={(e) => setGole1(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Gole Gości</label>
              <input
                type="number"
                min="0"
                max="20"
                value={gole2}
                onChange={(e) => setGole2(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-emerald-400 mb-1">Minuta meczu'</label>
              <input
                type="number"
                min="1"
                max="90"
                value={minuta}
                onChange={(e) => setMinuta(e.target.value)}
                placeholder="1-90"
                className="w-full bg-slate-950 border border-emerald-800/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold text-center outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Kursy bukmacherskie 1X2 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300">Kursy bukmacherskie (1 - X - 2):</label>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={kurs1}
                onChange={(e) => setKurs1(e.target.value)}
                placeholder="1 (Gosp)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
              />
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={kurs_x}
                onChange={(e) => setKursX(e.target.value)}
                placeholder="X (Remis)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
              />
              <input
                type="number"
                step="0.01"
                min="1.01"
                value={kurs2}
                onChange={(e) => setKurs2(e.target.value)}
                placeholder="2 (Gość)"
                className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Statystyki: Strzały i Celne */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300">Strzały (Łączne / Celne):</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={strzaly1}
                  onChange={(e) => setStrzaly1(e.target.value)}
                  placeholder="Gosp. strzały"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
                <input
                  type="number"
                  min="0"
                  value={strzalyCelne1}
                  onChange={(e) => setStrzalyCelne1(e.target.value)}
                  placeholder="Celne"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={strzaly2}
                  onChange={(e) => setStrzaly2(e.target.value)}
                  placeholder="Gość strzały"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
                <input
                  type="number"
                  min="0"
                  value={strzalyCelne2}
                  onChange={(e) => setStrzalyCelne2(e.target.value)}
                  placeholder="Celne"
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-emerald-400 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Posiadanie piłki */}
          <div>
            <div className="flex justify-between text-[11px] font-bold text-slate-300 mb-1">
              <span>Posiadanie piłki gospodarza:</span>
              <span className="text-sky-400">{posiadaniePilki1 ? `${posiadaniePilki1}%` : '50%'}</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={posiadaniePilki1 || '50'}
              onChange={(e) => setPosiadaniePilki1(e.target.value)}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Notatki taktyczne */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Notatki z przebiegu gry (dla Gemini AI):</label>
            <textarea
              rows={2}
              value={notatki}
              onChange={(e) => setNotatki(e.target.value)}
              placeholder="np. Drużyna gości gra z kontrataku, wysoki pressing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Przyciski akcji */}
          <div className="pt-2 flex justify-between gap-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Wyczyść
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={!gospodarz.trim() || !gosc.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/50"
              >
                Dodaj Mecz do Listy
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
