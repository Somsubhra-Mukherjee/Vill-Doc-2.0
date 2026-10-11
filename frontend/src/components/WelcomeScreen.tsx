import React, { useState } from 'react';
import { Mic, Globe, ShieldCheck, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { LanguageOption } from '../types';

interface WelcomeScreenProps {
  languages: LanguageOption[];
  selectedLanguage: string;
  onSelectLanguage: (code: string) => void;
  onStartConsultation: () => void;
  isLoading: boolean;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  languages,
  selectedLanguage,
  onSelectLanguage,
  onStartConsultation,
  isLoading,
}) => {
  const [consentGiven, setConsentGiven] = useState(false);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-10 space-y-8">
        {/* Header Tag & Heading */}
        <div className="space-y-3 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/70 text-teal-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Voice-First Regional Health Triage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Your health, heard in your language.
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl">
            Speak comfortably in your mother tongue. VillDoc 2.0 listens to your symptoms, asks relevant clinical follow-up questions, and helps you understand safe, timely next steps.
          </p>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Natural Voice Flow</h3>
            <p className="text-xs text-slate-500">Speak naturally in Bengali, Hindi, Hinglish, or English.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Clinical Safety Checks</h3>
            <p className="text-xs text-slate-500">Built-in emergency escalation for chest pain, stroke, or breathlessness.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">Empathetic Doctor Dialogue</h3>
            <p className="text-xs text-slate-500">Focused 1–2 questions per turn to clarify your condition calmly.</p>
          </div>
        </div>

        {/* Language Selection */}
        <div className="space-y-3 pt-2">
          <label className="block text-sm font-bold text-slate-800">
            Choose your preferred consultation language:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => onSelectLanguage(lang.code)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-600/20 text-teal-900 font-semibold'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div>
                    <div className="text-sm font-semibold">{lang.name}</div>
                    <div className="text-xs text-slate-500 font-normal">{lang.nativeName}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Consent & Safety Checkbox */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/70 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={(e) => setConsentGiven(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-teal-700 focus:ring-teal-600 border-slate-300"
            />
            <span className="text-xs sm:text-sm text-slate-700 leading-snug">
              <strong className="text-slate-900">Patient Consent & Clinical Limitation Notice:</strong> I understand that VillDoc 2.0 is an AI health triage assistant, not a licensed doctor. It provides symptom guidance and triage urgency, not a confirmed clinical diagnosis or prescription. In an emergency, I must dial 112 or visit a hospital immediately.
            </span>
          </label>
        </div>

        {/* Start Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 text-center sm:text-left">
            No personal health data is permanently stored. Fully isolated session.
          </p>

          <button
            onClick={onStartConsultation}
            disabled={!consentGiven || isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all ${
              consentGiven && !isLoading
                ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer hover:shadow'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>Starting Consultation...</span>
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                <span>Start Voice Consultation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
