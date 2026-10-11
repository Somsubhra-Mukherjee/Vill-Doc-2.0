import { ClinicalAssessment, UsageStats } from '../types';

const API_BASE = (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
  ? 'http://127.0.0.1:8000/api'
  : '/api';

export interface HealthInfo {
  status: string;
  service: string;
  sarvam_configured: boolean;
  models: {
    chat: string;
    stt: string;
    tts: string;
    speaker: string;
  };
}

export interface SessionResponse {
  session_id: string;
  language: string;
  created_at: string;
  turn_count: number;
  is_active: boolean;
}

export interface TurnResponse {
  session_id: string;
  transcript: string;
  assistant_message: string;
  audio_base64: string | null;
  triage_level: 'emergency' | 'urgent' | 'routine' | 'insufficient_information';
  is_emergency: boolean;
  conversation_complete: boolean;
  assessment: ClinicalAssessment;
  usage: UsageStats;
}

export const api = {
  async getHealth(): Promise<HealthInfo> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getStats(): Promise<UsageStats> {
    const res = await fetch(`${API_BASE}/stats`);
    if (!res.ok) throw new Error(`Stats fetch failed: ${res.statusText}`);
    return res.json();
  },

  async createSession(language: string, consentGiven: boolean): Promise<SessionResponse> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, consent_given: consentGiven }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to start consultation session');
    }
    return res.json();
  },

  async sendTurn(
    sessionId: string,
    options: {
      text?: string;
      audioBlob?: Blob;
      language?: string;
      synthesizeVoice?: boolean;
    }
  ): Promise<TurnResponse> {
    const formData = new FormData();
    if (options.text) {
      formData.append('text', options.text);
    }
    if (options.audioBlob) {
      const isWebm = options.audioBlob.type.includes('webm');
      const ext = isWebm ? 'webm' : 'wav';
      const cleanMime = isWebm ? 'audio/webm' : 'audio/wav';
      const cleanBlob = new Blob([options.audioBlob], { type: cleanMime });
      formData.append('audio_file', cleanBlob, `recording.${ext}`);
    }
    if (options.language) {
      formData.append('language', options.language);
    }
    formData.append('synthesize_voice', options.synthesizeVoice !== false ? 'true' : 'false');

    const res = await fetch(`${API_BASE}/sessions/${sessionId}/turn`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to process consultation turn');
    }
    return res.json();
  },

  async speakText(sessionId: string, text: string, language?: string): Promise<{ audio_base64: string }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Voice synthesis failed');
    }
    return res.json();
  },

  async endSession(sessionId: string): Promise<void> {
    await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {});
  },
};
