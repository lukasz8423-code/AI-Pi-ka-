import React, { useState, useEffect } from 'react';
import { LiveMatch } from '../types';
import { uzyskaj_pre_match_proby, przelicz_prawdopodobienstwa, wygladz_prawdopodobienstwa, oblicz_wartosci_zakladow } from '../utils/bettingCalc';
import { Edit3, X, Save, Clock, Trophy, TrendingUp, Activity, CheckCircle2 } from 'lucide-react';

interface EditMatchModalProps {
  isOpen: boolean;
  match: LiveMatch | null;
  onClose: () => void;
  onUpdateMatch: (updatedMatch: LiveMatch) => void;
}

export const EditMatchModal: React.FC<EditMatchModalProps> = ({
  isOpen,
  match,
  onClose,
  onUpdateMatch,
}) => {
  const [minuta, setMinuta] = useState('');
  const [gole1, setGole1] = useState('');
  const [gole2, setGole2] = useState('');
  const [kurs1, setKurs1] = useState('');
  const [kurs_x, setKursX] = useState('');
  const [kurs2, setKurs2] = useState('');
  const [strzaly1, setStrzaly1] = useState('');
  const [strzaly2, setStrzaly2] = useState('');
  const [strzalyCelne1, setStrzalyCelne1] = useState('');
  const [strzalyCelne2, setStrzalyCelne2] = useState('');
  const [posiadaniePilki1, setPosiadaniePilki1] = useState('');
  const [notatki, setNotatki] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (match) {
      setMinuta(String(match.minuta ?? 1));
      setGole1(String(match.gole1 ?? 0));
      setGole2(String(match.gole2 ?? 0));
      setKurs1(String(match.kurs1 ?? 2.0));
      setKursX(String(match.kurs_x ?? 3.0));
      setKurs2(String(match.kurs2 ?? 3.0));
      setStrzaly1(match.strzaly1 !== undefined ? String(match.strzaly1) : '');
      setStrzaly2(match.strzaly2 !== undefined ? String(match.strzaly2) : '');
      setStrzalyCelne1(match.strzalyCelne1 !== undefined ? String(match.strzalyCelne1) : '');
      setStrzalyCelne2(match.strzalyCelne2 !== undefined ? String(match.strzalyCelne2) : '');
      setPosiadaniePilki1(typeof match.posiadaniePilki1 === 'number' ? String(match.posiadaniePilki1) : '');
      setNotatki(match.notatki ?? '');
      setSaveSuccess(false);
    }
  }, [match, isOpen]);

  if (!isOpen || !match) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedMinuta = Math.min(120, Math.max(1, parseInt(minuta, 10) || 1));
    const parsedGole1 = Math.max(0, parseInt(gole1, 10) || 0);
    const parsedGole2 = Math.max(0, parseInt(gole2, 10) || 0);
    const parsedKurs1 = parseFloat(kurs1) > 1.01 ? parseFloat(kurs1) : 2.0;
    const parsedKursX = parseFloat(kurs_x) > 1.01 ? parseFloat(kurs_x) : 3.0;
    const parsedKurs2 = parseFloat(kurs2) > 1.01 ? parseFloat(kurs2) : 3.0;

    let parsedPossession1: number | undefined = undefined;
    let parsedPossession2: number | undefined = undefined;
    if (posiadaniePilki1.trim() !== '') {
      const p = parseInt(posiadaniePilki1, 10);
      if (!isNaN(p) && p >= 0 && p <= 100) {
        parsedPossession1 = p;
        parsedPossession2 = 100 - p;
      }
    }

    const updated: LiveMatch = {
      ...match,
      minuta: parsedMinuta,
      gole1: parsedGole1,
      gole2: parsedGole2,
      kurs1: parsedKurs1,
      kurs_x: parsedKursX,
      kurs2: parsedKurs2,
      strzaly1: strzaly1.trim() !== '' ? parseInt(strzaly1, 10) : undefined,
      strzaly2: strzaly2.trim() !== '' ? parseInt(strzaly2, 10) : undefined,
      strzalyCelne1: strzalyCelne1.trim() !== '' ? parseInt(strzalyCelne1, 10) : undefined,
      strzalyCelne2: strzalyCelne2.trim() !== '' ? parseInt(strzalyCelne2, 10) : undefined,
      posiadaniePilki1: parsedPossession1,
      posiadaniePilki2: parsedPossession2,
      notatki: notatki.trim(),
    };

    // Przeliczenie pre-match i rekomendacji
    updated.startingPreMatchProbs = uzyskaj_pre_match_proby(updated);
    
    // Przeliczenie Valuebety dla zaktualizowanych parametrów
    try {
      const rawP = przelicz_prawdopodobienstwa(parsedKurs1, parsedKursX, parsedKurs2);
      const fair = wygladz_prawdopodobienstwa(
        updated.gospodarz,
        updated.gosc,
        updated.gole1,
        updated.gole2,
        updated.minuta,
        updated.startingPreMatchProbs?.p1 || rawP.p1,
        updated.startingPreMatchProbs?.px || rawP.px,
        updated.startingPreMatchProbs?.p2 || rawP.p2,
        updated.czerwoneKartki1,
        updated.czerwoneKartki2,
        updated.strzaly1,
        updated.strzaly2,
        updated.strzalyCelne1,
        updated.strzalyCelne2
      );
      const evs = oblicz_wartosci_zakladow(parsedKurs1, parsedKursX, parsedKurs2, fair.p1, fair.px, fair.p2);
      const best = evs.sort((a, b) => b.ev - a.ev)[0];
      if (best && best.isPositive) {
        updated.typZalecany = best.name;
        updated.kursZalecany = best.odd;
        updated.evZalecane = best.ev;
      }
    } catch (err) {
      console.error("Błąd rekalkulacji EV:", err);
    }

    onUpdateMatch(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 400);
  };

  const numP1 = posiadaniePilki1 !== '' ? parseInt(posiadaniePilki1, 10) : NaN;
  const validP1 = !isNaN(numP1) && numP1 >= 0 && numP1 <= 100;

  return (
    <div 
      className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#0b131e] border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-6 relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Edycja Parametrów Meczu</span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md">
                {match.gospodarz} vs {match.gosc}
              </p>
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

        {/* Formularz edycji */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. WYNIK I MINUTA Z SZYBKIMI PRZYCISKAMI */}
          <div className="bg-[#0e1724] p-3.5 rounded-xl border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Wynik i Czas Gry</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/50">
                Live Status
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Bramki Gospodarz */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">
                  {match.gospodarz}
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGole1(String(Math.max(0, (parseInt(gole1, 10) || 0) - 1)))}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={gole1}
                    onChange={(e) => setGole1(e.target.value)}
                    className="w-10 bg-slate-900 border border-slate-700 rounded-lg py-1 text-center text-sm font-bold font-mono text-slate-100 outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGole1(String((parseInt(gole1, 10) || 0) + 1))}
                    className="w-6 h-6 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Minuta Meczu */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900/40 text-center">
                <label className="block text-[10px] font-bold text-emerald-400 mb-1 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Minuta'
                </label>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => setMinuta(String(Math.max(1, (parseInt(minuta, 10) || 1) - 5)))}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] cursor-pointer"
                    title="-5 min"
                  >
                    -5
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={minuta}
                    onChange={(e) => setMinuta(e.target.value)}
                    className="w-12 bg-slate-900 border border-emerald-500/50 rounded-lg py-1 text-center text-sm font-bold font-mono text-emerald-400 outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setMinuta(String(Math.min(120, (parseInt(minuta, 10) || 1) + 5)))}
                    className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-mono text-[10px] border border-emerald-800 cursor-pointer"
                    title="+5 min"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Bramki Gość */}
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
                <label className="block text-[10px] font-bold text-slate-400 mb-1 truncate">
                  {match.gosc}
                </label>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGole2(String(Math.max(0, (parseInt(gole2, 10) || 0) - 1)))}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={gole2}
                    onChange={(e) => setGole2(e.target.value)}
                    className="w-10 bg-slate-900 border border-slate-700 rounded-lg py-1 text-center text-sm font-bold font-mono text-slate-100 outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setGole2(String((parseInt(gole2, 10) || 0) + 1))}
                    className="w-6 h-6 rounded-lg bg-sky-900/60 hover:bg-sky-800 text-sky-200 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. KURSY BUKMACHERSKIE 1X2 */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Kursy Bukmacherskie (1 - X - 2):</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <span className="block text-[10px] text-slate-400 mb-0.5 text-center truncate">1 ({match.gospodarz})</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs1}
                  onChange={(e) => setKurs1(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 mb-0.5 text-center">X (Remis)</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs_x}
                  onChange={(e) => setKursX(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 mb-0.5 text-center truncate">2 ({match.gosc})</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs2}
                  onChange={(e) => setKurs2(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* 3. STRZAŁY I STRZAŁY CELNE */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Strzały (Łączne / Celne):</span>
            </label>
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

          {/* 4. POSIADANIE PIŁKI (OPCJONALNE) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[11px] font-bold text-slate-300">
                Posiadanie piłki gospodarza (%) - opcjonalnie:
              </label>
              {validP1 && (
                <span className="text-[11px] font-semibold text-sky-400">
                  {match.gosc}: {100 - numP1}%
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              max="100"
              value={posiadaniePilki1}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setPosiadaniePilki1('');
                } else {
                  const num = parseInt(val, 10);
                  if (!isNaN(num)) {
                    setPosiadaniePilki1(String(Math.min(100, Math.max(0, num))));
                  }
                }
              }}
              placeholder="np. 55 (zostaw puste, jeśli nieznane)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono placeholder:text-slate-500 outline-none focus:border-sky-500"
            />
          </div>

          {/* 5. NOTATKI TAKTYCZNE */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Notatki z przebiegu gry (dla Gemini AI):</label>
            <textarea
              rows={2}
              value={notatki}
              onChange={(e) => setNotatki(e.target.value)}
              placeholder="np. Przewaga w środku pola, wysoki pressing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Przyciski Zapisu */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Zapisano!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Zapisz Zmiany</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
