import React from 'react';
import { LiveMatch } from '../types';
import { Settings } from 'lucide-react';

interface MatchControlsPanelProps {
  match: LiveMatch;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  updateField: (field: keyof LiveMatch, value: any) => void;
  localKurs1: string;
  handleKurs1Change: (val: string) => void;
  localKursX: string;
  handleKursXChange: (val: string) => void;
  localKurs2: string;
  handleKurs2Change: (val: string) => void;
  localStrzaly1: string;
  handleStrzaly1Change: (val: string) => void;
  localStrzaly2: string;
  handleStrzaly2Change: (val: string) => void;
  localStrzalyCelne1: string;
  handleStrzalyCelne1Change: (val: string) => void;
  localStrzalyCelne2: string;
  handleStrzalyCelne2Change: (val: string) => void;
  handleStrzaly1Increment: () => void;
  handleStrzaly1Decrement: () => void;
  handleStrzaly2Increment: () => void;
  handleStrzaly2Decrement: () => void;
  handleStrzalyCelne1Increment: () => void;
  handleStrzalyCelne1Decrement: () => void;
  handleStrzalyCelne2Increment: () => void;
  handleStrzalyCelne2Decrement: () => void;
  isSimulatingActive: boolean;
  simLog: string[];
}

export function MatchControlsPanel({
  match,
  isSimulating,
  setIsSimulating,
  updateField,
  localKurs1,
  handleKurs1Change,
  localKursX,
  handleKursXChange,
  localKurs2,
  handleKurs2Change,
  localStrzaly1,
  handleStrzaly1Change,
  localStrzaly2,
  handleStrzaly2Change,
  localStrzalyCelne1,
  handleStrzalyCelne1Change,
  localStrzalyCelne2,
  handleStrzalyCelne2Change,
  handleStrzaly1Increment,
  handleStrzaly1Decrement,
  handleStrzaly2Increment,
  handleStrzaly2Decrement,
  handleStrzalyCelne1Increment,
  handleStrzalyCelne1Decrement,
  handleStrzalyCelne2Increment,
  handleStrzalyCelne2Decrement,
  isSimulatingActive,
  simLog,
}: MatchControlsPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
        <h3 className="text-sm font-display font-semibold text-slate-100 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-400" />
          Kontrola meczu na żywo
        </h3>
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition duration-150 flex items-center gap-1 cursor-pointer select-none ${
            isSimulatingActive 
              ? 'bg-red-950/60 border-red-500 text-red-400 animate-pulse' 
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
          }`}
          title={isSimulatingActive ? 'Zatrzymaj automatyczną symulację minut, strzałów i goli' : 'Uruchom automatyczną symulację minut, strzałów i goli'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isSimulatingActive ? 'bg-red-500' : 'bg-slate-500'}`}></span>
          {isSimulatingActive ? 'Symulacja aktywna' : 'Live telemetry'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Drużyny i Wynik Bramkowy */}
        <div className="bg-slate-950 rounded-lg p-3 border border-slate-800/80">
          <div className="flex justify-between items-center text-center">
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Gospodarz</span>
              <div className="text-sm font-bold text-slate-100 truncate px-1">{match.gospodarz}</div>
              <div className="flex justify-center items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => updateField('gole1', Math.max(0, match.gole1 - 1))}
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-xl font-mono font-bold text-slate-100 min-w-[20px]">{match.gole1}</span>
                <button
                  type="button"
                  onClick={() => updateField('gole1', match.gole1 + 1)}
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>

            <div className="px-3">
              <span className="text-xs text-slate-600 font-bold font-mono">VS</span>
              <div className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded-full mt-2 font-mono">
                {match.minuta}'
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Gość</span>
              <div className="text-sm font-bold text-slate-100 truncate px-1">{match.gosc}</div>
              <div className="flex justify-center items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => updateField('gole2', Math.max(0, match.gole2 - 1))}
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                >
                  -
                </button>
                <span className="text-xl font-mono font-bold text-slate-100 min-w-[20px]">{match.gole2}</span>
                <button
                  type="button"
                  onClick={() => updateField('gole2', match.gole2 + 1)}
                  className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bieżąca Minuta Meczowa */}
        <div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Bieżąca minuta meczu:</span>
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded px-1.5 py-1">
              <button
                type="button"
                onClick={() => updateField('minuta', Math.max(1, match.minuta - 5))}
                className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 font-medium transition flex items-center justify-center text-[10px]"
                title="-5 minut"
              >
                -5'
              </button>
              <button
                type="button"
                onClick={() => updateField('minuta', Math.max(1, match.minuta - 1))}
                className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                title="Odejmij minutę"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="90"
                value={match.minuta}
                onChange={(e) => updateField('minuta', Math.max(1, Math.min(90, parseInt(e.target.value) || 1)))}
                className="w-10 bg-transparent text-center font-mono font-bold text-emerald-400 text-xs outline-none"
              />
              <span className="text-[10px] text-slate-500 font-mono pr-1">'</span>
              <button
                type="button"
                onClick={() => updateField('minuta', Math.min(90, match.minuta + 1))}
                className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition flex items-center justify-center text-xs"
                title="Dodaj minutę"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => updateField('minuta', Math.min(90, match.minuta + 5))}
                className="px-1 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 font-medium transition flex items-center justify-center text-[10px]"
                title="+5 minut"
              >
                +5'
              </button>
            </div>
          </div>
          
          {/* Szybkie skróty minut */}
          <div className="flex flex-wrap gap-1 mt-1.5 justify-end">
            <span className="text-[9px] text-slate-600 self-center font-semibold mr-1">Skróty:</span>
            {[1, 15, 45, 46, 60, 75, 85].map((mPreset) => (
              <button
                key={mPreset}
                type="button"
                onClick={() => updateField('minuta', mPreset)}
                className={`px-1.5 py-0.5 text-[9px] rounded font-mono border transition ${match.minuta === mPreset ? 'bg-emerald-950 border-emerald-700 text-emerald-400 font-bold' : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800 text-slate-450'}`}
              >
                {mPreset}'
              </button>
            ))}
          </div>
        </div>

        {/* Kursy bukmacherskie */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 text-center">Kurs [1]</label>
            <input
              type="text"
              inputMode="decimal"
              id="input-kurs1"
              value={localKurs1}
              onChange={(e) => handleKurs1Change(e.target.value)}
              placeholder="1.01"
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded p-1.5 text-center font-mono font-bold text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 text-center">Kurs [X]</label>
            <input
              type="text"
              inputMode="decimal"
              id="input-kursx"
              value={localKursX}
              onChange={(e) => handleKursXChange(e.target.value)}
              placeholder="1.01"
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded p-1.5 text-center font-mono font-bold text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1 text-center">Kurs [2]</label>
            <input
              type="text"
              inputMode="decimal"
              id="input-kurs2"
              value={localKurs2}
              onChange={(e) => handleKurs2Change(e.target.value)}
              placeholder="1.01"
              className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 rounded p-1.5 text-center font-mono font-bold text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Przełącznik: Kursy LIVE */}
        <div className="flex items-center justify-between bg-slate-950/40 p-2.5 px-3.5 rounded-lg border border-slate-800/60 text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${match.isLiveOdds ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`}></span>
            Wprowadzone kursy to: <strong className={match.isLiveOdds ? "text-red-400" : "text-sky-400"}>{match.isLiveOdds ? "Kursy LIVE na żywo" : "Kursy Przedmeczowe"}</strong>
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={!!match.isLiveOdds} 
              onChange={(e) => updateField('isLiveOdds', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
          </label>
        </div>

        {/* Statystyki Strzałów */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 font-medium">Liczba strzałów (Home / Away):</span>
            <span className="font-mono font-bold text-slate-300">
              {match.strzaly1 !== undefined ? match.strzaly1 : 'brak danych'} : {match.strzaly2 !== undefined ? match.strzaly2 : 'brak danych'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStrzaly1Decrement}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Odejmij strzał"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                id="input-strzaly1"
                placeholder="brak danych"
                value={localStrzaly1}
                onChange={(e) => handleStrzaly1Change(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-1.5 text-center text-slate-100 outline-none placeholder-slate-700 focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleStrzaly1Increment}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Dodaj strzał"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStrzaly2Decrement}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Odejmij strzał"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                id="input-strzaly2"
                placeholder="brak danych"
                value={localStrzaly2}
                onChange={(e) => handleStrzaly2Change(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-1.5 text-center text-slate-100 outline-none placeholder-slate-700 focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleStrzaly2Increment}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Dodaj strzał"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki Strzałów Celnych */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Strzały Celne (opcjonalnie):
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {match.strzalyCelne1 !== undefined ? match.strzalyCelne1 : '-'} : {match.strzalyCelne2 !== undefined ? match.strzalyCelne2 : '-'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStrzalyCelne1Decrement}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Odejmij celny strzał"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                id="input-strzalycelne1"
                placeholder="brak danych"
                value={localStrzalyCelne1}
                onChange={(e) => handleStrzalyCelne1Change(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-1.5 text-center text-slate-100 outline-none placeholder-slate-700 focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleStrzalyCelne1Increment}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Dodaj celny strzał"
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleStrzalyCelne2Decrement}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Odejmij celny strzał"
              >
                -
              </button>
              <input
                type="text"
                inputMode="numeric"
                id="input-strzalycelne2"
                placeholder="brak danych"
                value={localStrzalyCelne2}
                onChange={(e) => handleStrzalyCelne2Change(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-1.5 text-center text-slate-100 outline-none placeholder-slate-700 focus:border-emerald-500 font-mono"
              />
              <button
                type="button"
                onClick={handleStrzalyCelne2Increment}
                className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition flex items-center justify-center text-xs shrink-0"
                title="Dodaj celny strzał"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Kartki (Żółte i Czerwone) */}
        <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-800/80 space-y-3.5">
          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 border-b border-slate-800/60 pb-1.5">
            <span className="inline-block w-2 h-3 bg-yellow-500 rounded-[1px] shadow-sm shadow-yellow-950"></span>
            <span className="inline-block w-2 h-3 bg-red-600 rounded-[1px] shadow-sm shadow-red-950 -ml-1"></span>
            Kary i dyscyplina (Gosp. / Goście)
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Żółte kartki */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>Żółte kartki:</span>
                <span className="font-mono font-bold text-yellow-400">{match.zolteKartki1 || 0} : {match.zolteKartki2 || 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Gospodarz żółte */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-855 rounded p-1">
                  <button
                    type="button"
                    onClick={() => updateField('zolteKartki1', Math.max(0, (match.zolteKartki1 || 0) - 1))}
                    disabled={(match.zolteKartki1 || 0) <= 0}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Odejmij żółtą kartkę gospodarzom"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold text-slate-100 px-1">{match.zolteKartki1 || 0}</span>
                  <button
                    type="button"
                    onClick={() => updateField('zolteKartki1', (match.zolteKartki1 || 0) + 1)}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Dodaj żółtą kartkę gospodarzom"
                  >
                    +
                  </button>
                </div>

                {/* Gość żółte */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-855 rounded p-1">
                  <button
                    type="button"
                    onClick={() => updateField('zolteKartki2', Math.max(0, (match.zolteKartki2 || 0) - 1))}
                    disabled={(match.zolteKartki2 || 0) <= 0}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Odejmij żółtą kartkę gościom"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold text-slate-100 px-1">{match.zolteKartki2 || 0}</span>
                  <button
                    type="button"
                    onClick={() => updateField('zolteKartki2', (match.zolteKartki2 || 0) + 1)}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Dodaj żółtą kartkę gościom"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Czerwone kartki */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                <span>Czerwone kartki:</span>
                <span className="font-mono font-bold text-red-500">{match.czerwoneKartki1 || 0} : {match.czerwoneKartki2 || 0}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {/* Gospodarz czerwone */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-855 rounded p-1">
                  <button
                    type="button"
                    onClick={() => updateField('czerwoneKartki1', Math.max(0, (match.czerwoneKartki1 || 0) - 1))}
                    disabled={(match.czerwoneKartki1 || 0) <= 0}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Odejmij czerwoną kartkę gospodarzom"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold text-slate-100 px-1">{match.czerwoneKartki1 || 0}</span>
                  <button
                    type="button"
                    onClick={() => updateField('czerwoneKartki1', (match.czerwoneKartki1 || 0) + 1)}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Dodaj czerwoną kartkę gospodarzom"
                  >
                    +
                  </button>
                </div>

                {/* Gość czerwone */}
                <div className="flex items-center justify-between bg-slate-950 border border-slate-855 rounded p-1">
                  <button
                    type="button"
                    onClick={() => updateField('czerwoneKartki2', Math.max(0, (match.czerwoneKartki2 || 0) - 1))}
                    disabled={(match.czerwoneKartki2 || 0) <= 0}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:cursor-not-allowed text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Odejmij czerwoną kartkę gościom"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs font-bold text-slate-100 px-1">{match.czerwoneKartki2 || 0}</span>
                  <button
                    type="button"
                    onClick={() => updateField('czerwoneKartki2', (match.czerwoneKartki2 || 0) + 1)}
                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-bold transition flex items-center justify-center text-xs shrink-0"
                    title="Dodaj czerwoną kartkę gościom"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sytuacja taktyczna */}
        <div>
          <label className="block text-xs text-slate-400 font-medium mb-1.5">Sytuacja taktyczna / Notatki z boiska:</label>
          <textarea
            placeholder="np. Czerwona kartka, dominacja w środku pola, zmiana napastnika..."
            value={match.notatki || ''}
            onChange={(e) => updateField('notatki', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-700 outline-none focus:border-emerald-500 h-20 resize-none font-sans"
          />
        </div>

        {/* Log symulacji telemetrycznej */}
        {isSimulatingActive && (
          <div className="bg-slate-950 rounded-lg p-2.5 border border-red-950/40 mt-3 animate-fadeIn">
            <div className="flex items-center justify-between text-[10px] text-red-400 font-bold uppercase tracking-wider mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                Log Telemetrii Live
              </span>
              <span className="text-[9px] font-mono font-normal text-slate-500">Mecz na żywo</span>
            </div>
            <div className="h-24 overflow-y-auto space-y-1 font-mono text-[9.5px] text-slate-400 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {simLog.length === 0 ? (
                <div className="text-slate-600 italic">Oczekiwanie na zdarzenia z meczu...</div>
              ) : (
                simLog.map((log, idx) => {
                  const isGoal = log.includes('⚽');
                  return (
                    <div 
                      key={idx} 
                      className={`leading-relaxed border-b border-slate-900 pb-1 ${
                        isGoal ? 'text-amber-300 font-bold bg-amber-950/45 px-1.5 py-0.5 rounded border border-amber-900/40 my-0.5' : ''
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
