import React from 'react';
import { Cpu, X, Zap, CheckCircle2, AlertTriangle, Layers, BarChart2 } from 'lucide-react';
import { UsageStats } from '../types';

interface UsagePanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UsageStats;
  isConfigured: boolean;
  models: {
    chat: string;
    stt: string;
    tts: string;
  };
}

export const UsagePanel: React.FC<UsagePanelProps> = ({
  isOpen,
  onClose,
  stats,
  isConfigured,
  models,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-teal-700" />
          <h2 className="font-bold text-slate-900 text-sm">Developer API Monitor</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
        {/* API Authentication Status */}
        <div className="p-3 rounded-xl border space-y-2 bg-slate-50 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700">Sarvam API Key</span>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle className="w-3 h-3 text-amber-600" /> Placeholder / Missing
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isConfigured
              ? 'Real-time Sarvam Saaras STT, 105B Chat, and Bulbul TTS ready.'
              : 'Add SARVAM_API_KEY in backend/.env for live production API calls.'}
          </p>
        </div>

        {/* Model Identifiers */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Active Model Pipeline
          </h3>
          <div className="space-y-1.5">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
              <span className="text-slate-500">Conversational Reasoning</span>
              <span className="font-mono font-semibold text-slate-800">{models.chat}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
              <span className="text-slate-500">Speech Recognition (STT)</span>
              <span className="font-mono font-semibold text-slate-800">{models.stt}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex justify-between">
              <span className="text-slate-500">Voice Synthesis (TTS)</span>
              <span className="font-mono font-semibold text-slate-800">{models.tts}</span>
            </div>
          </div>
        </div>

        {/* Token Usage */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" /> Reported LLM Token Consumption
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Prompt Tokens</div>
              <div className="text-lg font-bold text-slate-800">{stats.prompt_tokens || 0}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 uppercase">Output Tokens</div>
              <div className="text-lg font-bold text-slate-800">{stats.completion_tokens || 0}</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-center">
            <div className="text-[10px] text-teal-800 uppercase font-semibold">Total Tokens Used</div>
            <div className="text-2xl font-black text-teal-900">{stats.total_tokens || 0}</div>
          </div>
        </div>

        {/* Request Counts by Service */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Request Counter by Service
          </h3>
          <div className="space-y-1.5">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <span>Sarvam Chat Calls</span>
              <span className="font-bold text-slate-800">{stats.chat_requests || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <span>Sarvam STT Transcriptions</span>
              <span className="font-bold text-slate-800">{stats.stt_requests || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <span>Sarvam TTS Syntheses</span>
              <span className="font-bold text-slate-800">{stats.tts_requests || 0}</span>
            </div>
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 flex justify-between items-center text-red-800 font-semibold">
              <span>Failed Requests</span>
              <span>{stats.failed_requests || 0}</span>
            </div>
          </div>
        </div>

        {/* Cost & Credit Limitation Note */}
        <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-500 space-y-1">
          <strong className="text-slate-700 block">Credit Management:</strong>
          <p>
            VillDoc 2.0 optimizes token consumption with single-call turn processing, concise responses, and audio generation limited strictly to patient-facing responses.
          </p>
        </div>
      </div>
    </div>
  );
};
