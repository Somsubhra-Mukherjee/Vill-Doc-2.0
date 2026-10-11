export type TriageLevel = 'emergency' | 'urgent' | 'routine' | 'insufficient_information';

export interface SymptomItem {
  name: string;
  duration?: string | null;
  severity?: string;
  certainty?: string;
}

export interface PossibleCondition {
  condition_name: string;
  explanation: string;
  uncertainty: string;
}

export interface ClinicalAssessment {
  assistant_message: string;
  conversation_complete: boolean;
  patient_summary: string;
  symptoms: SymptomItem[];
  missing_information: string[];
  possible_conditions: PossibleCondition[];
  red_flags: string[];
  triage_level: TriageLevel;
  care_recommendations: string[];
  self_care_advice: string[];
  follow_up_guidance: string[];
  disclaimer: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  audioBase64?: string | null;
  timestamp: Date;
}

export interface SessionData {
  sessionId: string;
  language: string;
  turnCount: number;
}

export interface UsageStats {
  active_sessions?: number;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  stt_requests?: number;
  tts_requests?: number;
  chat_requests?: number;
  failed_requests?: number;
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}
