import React from 'react';
import { LiveMatch } from '../types';
import { SlidersHorizontal, Radio, Download, Star, Lock, Sparkles, Plus, ChevronRight, Trash2, Edit3 } from 'lucide-react';
import { checkHasValuebet } from './MatchList';

interface CompactMatchListViewProps {
  matches: LiveMatch[];
  apiFetchedMatches: LiveMatch[];
  selectedMatchId: string | null;
  pinnedMatchIds: string[];
  onSelectMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
  onEditMatch?: (match: LiveMatch) => void;
  onFetchRealMatches: () => void;
  fetchingReal: boolean;
  onOpenAddMatchModal: () => void;
}

export const CompactMatchListView: React.FC<CompactMatchListViewProps> = ({
  matches,
  apiFetchedMatches,
  selectedMatchId,
  pinnedMatchIds,
  onSelectMatch,
  onDeleteMatch,
  onEditMatch,
  onFetchRealMatches,
  fetchingReal,
  onOpenAddMatchModal,
}) => {
  const liveMatches = matches.filter(m => m.status === 'niesprawdzony' && m.minuta < 90);
  const apiCount = apiFetchedMatches.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* 1. Karta: Filtry & Dodawanie meczu */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Filtry & Akcje</span>
            </div>

            {/* Przycisk: Dodaj mecz ręcznie */}
            <button
              type="button"
              onClick={onOpenAddMatchModal}
              className="flex items-center gap-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
              title="Dodaj własny mecz ręcznie do analizy live"
            >
              <Plus className="w-3 h-3 text-emerald-400" />
              <span>Dodaj mecz</span>
            </button>
          </div>

          {/* Filtry badge */}
          <div className="flex items-center gap-2 mb-3 text-[10px] font-mono">
            <span className="flex items-center gap-1 text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-sm bg-rose-500"></span>
              POBRANE Z API ({apiCount})
            </span>
            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/50">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500 animate-pulse"></span>
              NA ŻYWO ({liveMatches.length})
            </span>
          </div>

          {/* Podgląd wybranych meczów */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {liveMatches.slice(0, 4).map((m) => {
              const isSelected = m.id === selectedMatchId;
              const hasVal = checkHasValuebet(m);
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-[#121f30] border-sky-500 shadow-md ring-1 ring-sky-500/40'
                      : 'bg-slate-950/60 border-slate-850 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                      ▶ Minuta {m.minuta}'
                    </span>
                    <div className="flex items-center gap-1">
                      {hasVal && (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> OKAZJA
                        </span>
                      )}
                      {m.isLocked && <Lock className="w-2.5 h-2.5 text-amber-400" />}

                      {onEditMatch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditMatch(m);
                          }}
                          className="p-1 text-sky-400 hover:text-sky-200 hover:bg-sky-950/50 rounded-md transition cursor-pointer ml-1"
                          title="Edytuj mecz"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMatch(m.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition cursor-pointer"
                        title="Usuń mecz z listy"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 truncate">
                    {m.gospodarz} <span className="text-slate-500 font-normal">{m.gole1}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-200 truncate flex items-center justify-between">
                    <span>{m.gosc}</span>
                    <span className="text-emerald-400 font-bold font-mono">{m.gole2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Karta: Szybka Integracja API */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              <span>Pobieranie Meczu z API</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
            Pobierz automatycznie bieżące mecze z zewnętrznej bazy API lub dopasuj statystyki dla dodanych drużyn.
          </p>

          <button
            type="button"
            onClick={onFetchRealMatches}
            disabled={fetchingReal}
            className="w-full py-2 px-3 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {fetchingReal ? (
              <>
                <Download className="w-3.5 h-3.5 animate-bounce text-sky-400" />
                <span>Synchronizacja...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Pobierz spotkania na żywo</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-850 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>Standard API Football-Data</span>
          <span className="text-emerald-400 font-bold">Połączono</span>
        </div>
      </div>
    </div>
  );
};
