import React, { useState } from 'react';
import { LiveMatch } from '../types';
import { uzyskaj_pre_match_proby } from '../utils/bettingCalc';
import { Plus, X, Trophy, Clock, Target, DollarSign, FileText } from 'lucide-react';

interface AddMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMatch: (newMatch: LiveMatch) => void;
}

export const AddMatchModal: React.FC<AddMatchModalProps> = ({
  isOpen,
  onClose,
  onAddMatch,
}) => {
  const [gospodarz, setGospodarz] = useState('');
  const [gosc, setGosc] = useState('');
  const [gole1, setGole1] = useState(0);
  const [gole2, setGole2] = useState(0);
  const [minuta, setMinuta] = useState(65);
  const [kurs1, setKurs1] = useState(2.40);
  const [kurs_x, setKursX] = useState(3.20);
  const [kurs2, setKurs2] = useState(2.90);
  const [strzaly1, setStrzaly1] = useState(6);
  const [strzaly2, setStrzaly2] = useState(4);
  const [strzalyCelne1, setStrzalyCelne1] = useState(3);
  const [strzalyCelne2, setStrzalyCelne2] = useState(2);
  const [posiadaniePilki1, setPosiadaniePilki1] = useState(54);
  const [notatki, setNotatki] = useState('Drużyna gospodarzy naciska skrzydłami. Wysoka aktywność w ofensywie.');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gospodarz.trim() || !gosc.trim()) return;

    const newId = `custom-${Date.now()}`;
    const matchObj: LiveMatch = {
      id: newId,
      gospodarz: gospodarz.trim(),
      gosc: gosc.trim(),
      gole1: Number(gole1) || 0,
      gole2: Number(gole2) || 0,
      minuta: Math.min(90, Math.max(1, Number(minuta) || 1)),
      kurs1: Number(kurs1) || 2.0,
      kurs_x: Number(kurs_x) || 3.0,
      kurs2: Number(kurs2) || 3.0,
      strzaly1: Number(strzaly1) || 0,
      strzaly2: Number(strzaly2) || 0,
      strzalyCelne1: Number(strzalyCelne1) || 0,
      strzalyCelne2: Number(strzalyCelne2) || 0,
      posiadaniePilki1: Number(posiadaniePilki1) || 50,
      posiadaniePilki2: 100 - (Number(posiadaniePilki1) || 50),
      notatki: notatki.trim(),
      status: 'niesprawdzony',
      dataDodania: new Date().toISOString(),
      typZalecany: Number(kurs2) < Number(kurs1) ? `${gosc.trim()} (Zwycięstwo lub DNB)` : `${gospodarz.trim()} (Zwycięstwo lub DNB)`,
      kursZalecany: Number(kurs2) < Number(kurs1) ? Number(kurs2) : Number(kurs1),
      evZalecane: 0.045
    };

    matchObj.startingPreMatchProbs = uzyskaj_pre_match_proby(matchObj);
    onAddMatch(matchObj);
    onClose();
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
        <div className="p-5 border-b border-slate-850 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Plus className="w-4 h-4 font-bold" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Dodaj Nowy Mecz Live</h3>
              <p className="text-[11px] text-slate-400">Wprowadź dane taktyczne i kursy spotkania</p>
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
                placeholder="np. Arsenal Londyn"
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
                placeholder="np. Chelsea Londyn"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
              />
            </div>
          </div>

          {/* Wynik i Minuta */}
          <div className="grid grid-cols-3 gap-3 bg-[#0e1724] p-3 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Gole Gosp.</label>
              <input
                type="number"
                min="0"
                max="20"
                value={gole1}
                onChange={(e) => setGole1(Math.max(0, parseInt(e.target.value) || 0))}
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
                onChange={(e) => setGole2(Math.max(0, parseInt(e.target.value) || 0))}
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
                onChange={(e) => setMinuta(Math.min(90, Math.max(1, parseInt(e.target.value) || 1)))}
                className="w-full bg-slate-950 border border-emerald-800/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold text-center outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Kursy STS Live (1, X, 2) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-300">Aktualne kursy bukmacherskie:</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="block text-[9px] text-slate-400 mb-0.5 text-center">Kurs 1</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs1}
                  onChange={(e) => setKurs1(parseFloat(e.target.value) || 2.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 mb-0.5 text-center">Kurs X</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs_x}
                  onChange={(e) => setKursX(parseFloat(e.target.value) || 3.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <span className="block text-[9px] text-slate-400 mb-0.5 text-center">Kurs 2</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  value={kurs2}
                  onChange={(e) => setKurs2(parseFloat(e.target.value) || 2.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-mono text-center outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Statystyki: Strzały, Strzały Celne, Posiadanie */}
          <div className="grid grid-cols-2 gap-3 bg-[#0e1724] p-3 rounded-xl border border-slate-800/80">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Strzały (Gosp / Gość):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={strzaly1}
                  onChange={(e) => setStrzaly1(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-slate-100 font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={strzaly2}
                  onChange={(e) => setStrzaly2(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-slate-100 font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Celne (Gosp / Gość):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={strzalyCelne1}
                  onChange={(e) => setStrzalyCelne1(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-emerald-400 font-mono"
                />
                <input
                  type="number"
                  min="0"
                  value={strzalyCelne2}
                  onChange={(e) => setStrzalyCelne2(parseInt(e.target.value) || 0)}
                  className="w-1/2 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-center text-emerald-400 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Notatki */}
          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Komentarz taktyczny / Notatki:</label>
            <textarea
              rows={2}
              value={notatki}
              onChange={(e) => setNotatki(e.target.value)}
              placeholder="np. Lider kontroluje grę, wysoki pressing..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-sky-500 custom-scrollbar"
            />
          </div>

          {/* Przyciski Akcji */}
          <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/40 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj i Wybierz Mecz</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
