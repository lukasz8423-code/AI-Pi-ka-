import React from 'react';
import { MessageSquareCode, Check, Copy, Zap } from 'lucide-react';

interface AIPromptPanelProps {
  promptText: string;
  copied: boolean;
  handleCopy: () => void;
  onTriggerAiAnalysis: (promptText: string) => void;
  aiLoading: boolean;
}

export function AIPromptPanel({
  promptText,
  copied,
  handleCopy,
  onTriggerAiAnalysis,
  aiLoading,
}: AIPromptPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <MessageSquareCode className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-display font-semibold text-white">Generator Promptu AI</h3>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition duration-150 ${
            copied ? 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700' : ''
          }`}
          id="btn-copy-prompt"
          title="Kopiuj gotowy tekst promptu do schowka"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              Skopiowano!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Kopiuj prompt
            </>
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
        📋 Ten tekst jest automatycznie aktualizowany na bazie Twoich live suwaków. Możesz skopiować go jednym kliknięciem i wkleić do czatu Gemini lub kliknąć <strong>Analizuj automatycznie</strong>, aby uruchomić Gemini bezpośrednio w aplikacji!
      </p>

      <div className="relative">
        <textarea
          readOnly
          value={promptText}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-400 h-32 focus:outline-none focus:border-slate-700 select-all"
        />
        <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 px-2 py-0.5 rounded text-[8px] font-mono text-slate-500 border border-slate-800 pointer-events-none">
          {promptText.length} znaków
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
        <button
          onClick={() => onTriggerAiAnalysis(promptText)}
          disabled={aiLoading}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition duration-200 shadow-md shadow-emerald-900/10 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
          id="btn-trigger-ai-analysis"
        >
          <Zap className={`w-4 h-4 ${aiLoading ? 'animate-spin text-emerald-400' : 'text-amber-400 fill-amber-400'}`} />
          {aiLoading ? 'Generowanie analizy przez Gemini...' : 'Uruchom analizę Gemini AI (Serwer)'}
        </button>
      </div>
    </div>
  );
}
