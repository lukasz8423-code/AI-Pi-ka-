import React from 'react';
import { LiveMatch } from '../types';
import { SlidersHorizontal, Radio, Download, Star, Lock, Sparkles, Plus, ChevronRight, Trash2 } from 'lucide-react';
import { checkHasValuebet } from './MatchList';

interface CompactMatchListViewProps {
  matches: LiveMatch[];
  apiFetchedMatches: LiveMatch[];
  selectedMatchId: string | null;
  pinnedMatchIds: string[];
  onSelectMatch: (id: string) => void;
  onDeleteMatch: (id: string) => void;
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
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMatch(m.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition cursor-pointer ml-1"
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

      {/* 2. Karta: Lista meczów */}
      <div className="bg-[#0b131e] border border-slate-850 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Lista meczów</span>
            </div>

            <button
              type="button"
              onClick={onFetchRealMatches}
              disabled={fetchingReal}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-850 border border-slate-750 hover:border-slate-600 text-slate-300 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Download className={`w-3 h-3 ${fetchingReal ? 'animate-bounce' : ''}`} />
              <span>{fetchingReal ? 'Pobieranie...' : 'Pobierz API'}</span>
            </button>
          </div>

          {/* Filtry mini */}
          <div className="flex items-center gap-2 mb-3 text-[10px] font-mono">
            <span className="text-slate-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-rose-500"></span>
              POBRANE Z API ({apiCount})
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-sm bg-emerald-500"></span>
              NA ŻYWO ({liveMatches.length})
            </span>
          </div>

          {/* Lista kafelków meczów */}
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {matches.map((m) => {
              const isSelected = m.id === selectedMatchId;
              const isPinned = pinnedMatchIds.includes(m.id);
              const hasVal = checkHasValuebet(m);

              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMatch(m.id)}
                  className={`p-2 rounded-xl border transition-all cursor-pointer group ${
                    isSelected
                      ? 'bg-[#121f30] border-sky-500 shadow-md ring-1 ring-sky-500/40'
                      : 'bg-slate-950/60 border-slate-850 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      ▶ Minuta {m.minuta}'
                    </span>
                    <div className="flex items-center gap-1">
                      {isPinned && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                      {hasVal && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[8px] font-bold px-1 rounded">
                          OKAZJA
                        </span>
                      )}
                      <span className="text-slate-400 text-[9px]">@{m.kursZalecany || m.kurs1}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMatch(m.id);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-md transition cursor-pointer ml-1"
                        title="Usuń mecz z listy"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate max-w-[130px]">{m.gospodarz}</span>
                    <span className="font-mono text-slate-400">{m.gole1}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span className="truncate max-w-[130px]">{m.gosc}</span>
                    <span className="font-mono text-emerald-400 font-bold">{m.gole2}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

