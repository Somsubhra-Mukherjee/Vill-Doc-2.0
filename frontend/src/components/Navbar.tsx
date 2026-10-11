import React from 'react';
import { Activity, ShieldAlert, Cpu, HeartPulse } from 'lucide-react';

interface NavbarProps {
  onToggleDevPanel: () => void;
  isDevPanelOpen: boolean;
  selectedLanguageName: string;
  onEndConsultation?: () => void;
  isInConsultation: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleDevPanel,
  isDevPanelOpen,
  selectedLanguageName,
  onEndConsultation,
  isInConsultation,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center text-white shadow-sm">
            <HeartPulse className="w-6 h-6 text-teal-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">VillDoc</span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">2.0</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Multilingual Voice-First AI Triage</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {isInConsultation && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
              <span>{selectedLanguageName}</span>
            </div>
          )}

          {/* Emergency 112 pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>Emergency: 112</span>
          </div>

          {/* Dev stats toggle button */}
          <button
            onClick={onToggleDevPanel}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isDevPanelOpen
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Toggle Developer & Token Monitor Panel"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">API Monitor</span>
          </button>

          {isInConsultation && onEndConsultation && (
            <button
              onClick={onEndConsultation}
              className="text-xs font-medium px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
            >
              End Session
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
