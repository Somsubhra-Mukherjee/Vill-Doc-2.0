import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VoiceConsultation } from './components/VoiceConsultation';
import { AssessmentSummary } from './components/AssessmentSummary';
import { UsagePanel } from './components/UsagePanel';
import { api, HealthInfo } from './services/api';
import { LanguageOption, Message, ClinicalAssessment, UsageStats } from './types';

const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'en-IN', name: 'English', nativeName: 'Indian English', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hinglish', nativeName: 'हिंदी + English', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
];

export function App() {
  const [currentScreen, setCurrentScreen] = useState<'welcome' | 'consultation' | 'assessment'>('welcome');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('bn-IN');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [latestAssessment, setLatestAssessment] = useState<ClinicalAssessment | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats>({});
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguageCode) || SUPPORTED_LANGUAGES[0];

  // Poll health and stats on mount
  useEffect(() => {
    api.getHealth()
      .then((data) => setHealthInfo(data))
      .catch((err) => console.warn('Backend health check error:', err));

    api.getStats()
      .then((data) => setUsageStats(data))
      .catch((err) => console.warn('Stats fetch error:', err));
  }, []);

  const handleStartConsultation = async () => {
    setIsLoading(true);
    try {
      const res = await api.createSession(selectedLanguageCode, true);
      setSessionId(res.session_id);

      // Initial greeting message
      const initialGreeting: Message = {
        id: 'msg-initial',
        role: 'assistant',
        content:
          selectedLanguageCode === 'bn-IN'
            ? 'নমস্কার। আমি ভিলডক (VillDoc), আপনার এআই স্বাস্থ্য সহায়ক। আজ আপনার শরীর কেমন আছে? আপনার কি সমস্যা বা লক্ষণ হচ্ছে তা দয়া করে বলুন।'
            : selectedLanguageCode === 'hi-IN'
            ? 'नमस्ते। मैं विलडॉक (VillDoc) हूँ, आपका एআই स्वास्थ्य सहायक। आज आप कैसा महसूस कर रहे हैं? कृपया मुझे बताएं कि आपको क्या समस्या या लक्षण हैं।'
            : 'Hello. I am VillDoc, your AI health triage assistant. How are you feeling today? Please tell me what symptoms or health concerns you are experiencing.',
        timestamp: new Date(),
      };

      setMessages([initialGreeting]);
      setCurrentScreen('consultation');
    } catch (err: any) {
      alert(`Could not start consultation: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTurn = async (options: { text?: string; audioBlob?: Blob; synthesizeVoice?: boolean }) => {
    if (!sessionId) return;
    setIsLoading(true);

    try {
      const turnRes = await api.sendTurn(sessionId, {
        ...options,
        language: selectedLanguageCode,
      });

      // User Message
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: turnRes.transcript,
        timestamp: new Date(),
      };

      // Assistant Message
      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: turnRes.assistant_message,
        audioBase64: turnRes.audio_base64,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLatestAssessment(turnRes.assessment);
      if (turnRes.usage) {
        setUsageStats(turnRes.usage);
      }

      // If emergency triggered or conversation finished, view assessment
      if (turnRes.is_emergency) {
        // Switch to assessment screen immediately for patient safety
        setCurrentScreen('assessment');
      }
    } catch (err: any) {
      console.error('Turn processing failed:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndConsultation = async () => {
    if (sessionId) {
      await api.endSession(sessionId);
    }
    setSessionId(null);
    setMessages([]);
    setLatestAssessment(null);
    setCurrentScreen('welcome');
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col selection:bg-teal-100 selection:text-teal-900">
      <Navbar
        isDevPanelOpen={isDevPanelOpen}
        onToggleDevPanel={() => setIsDevPanelOpen(!isDevPanelOpen)}
        selectedLanguageName={selectedLanguage.name}
        isInConsultation={currentScreen !== 'welcome'}
        onEndConsultation={handleEndConsultation}
      />

      <main className="flex-1">
        {currentScreen === 'welcome' && (
          <WelcomeScreen
            languages={SUPPORTED_LANGUAGES}
            selectedLanguage={selectedLanguageCode}
            onSelectLanguage={setSelectedLanguageCode}
            onStartConsultation={handleStartConsultation}
            isLoading={isLoading}
          />
        )}

        {currentScreen === 'consultation' && sessionId && (
          <VoiceConsultation
            sessionId={sessionId}
            selectedLanguage={selectedLanguage}
            messages={messages}
            latestAssessment={latestAssessment}
            onSendTurn={handleSendTurn}
            onViewAssessment={() => setCurrentScreen('assessment')}
            onEndConsultation={handleEndConsultation}
            isLoading={isLoading}
          />
        )}

        {currentScreen === 'assessment' && latestAssessment && (
          <AssessmentSummary
            assessment={latestAssessment}
            onBackToConsultation={() => setCurrentScreen('consultation')}
            onEndConsultation={handleEndConsultation}
          />
        )}
      </main>

      <UsagePanel
        isOpen={isDevPanelOpen}
        onClose={() => setIsDevPanelOpen(false)}
        stats={usageStats}
        isConfigured={healthInfo?.sarvam_configured ?? false}
        models={
          healthInfo?.models ?? {
            chat: 'sarvam-105b-conversations',
            stt: 'saaras:v4',
            tts: 'bulbul:v4-flash',
          }
        }
      />
    </div>
  );
}
export default App;
