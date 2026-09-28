import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X } from 'lucide-react';

export default function QRCodeDisplay() {
  const [isOpen, setIsOpen] = useState(false);
  const appUrl = window.location.href;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="text-slate-500 hover:text-emerald-400 transition-colors cursor-pointer"
        title="Pokaż kod QR aplikacji"
      >
        <QrCode className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-base font-semibold text-slate-100">Kod QR aplikacji</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <QRCodeSVG value={appUrl} size={200} />
            </div>
            <p className="text-xs text-slate-400 text-center">
              Zeskanuj, aby otworzyć aplikację na telefonie
            </p>
          </div>
        </div>
      )}
    </>
  );
}
