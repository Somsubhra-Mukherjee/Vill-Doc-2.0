import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  FileText,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Edit2,
  Check,
  Stethoscope,
  ChevronRight,
  ShieldAlert,
  Keyboard
} from 'lucide-react';
import { Message, ClinicalAssessment, LanguageOption } from '../types';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface VoiceConsultationProps {
  sessionId: string;
  selectedLanguage: LanguageOption;
  messages: Message[];
  latestAssessment: ClinicalAssessment | null;
  onSendTurn: (options: { text?: string; audioBlob?: Blob; synthesizeVoice?: boolean }) => Promise<void>;
  onViewAssessment: () => void;
  onEndConsultation: () => void;
  isLoading: boolean;
}

export const VoiceConsultation: React.FC<VoiceConsultationProps> = ({
  sessionId,
  selectedLanguage,
  messages,
  latestAssessment,
  onSendTurn,
  onViewAssessment,
  onEndConsultation,
  isLoading,
}) => {
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [typedMessage, setTypedMessage] = useState('');
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const {
    isRecording,
    recordingDuration,
    error: recorderError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle incoming audio from latest assistant message
  useEffect(() => {
    if (!autoPlayAudio) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.audioBase64) {
      playAudio(lastMsg.audioBase64);
    }
  }, [messages, autoPlayAudio]);

  const playAudio = (base64Audio: string) => {
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audioUrl = `data:audio/wav;base64,${base64Audio}`;
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;

      audio.onplay = () => setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Browser prevented autoplay (user gesture required):', err);
          setIsPlayingAudio(false);
        });
      }
    } catch (e) {
      console.error('Audio playback error:', e);
      setIsPlayingAudio(false);
    }
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      setIsPlayingAudio(false);
    }
  };

  const handleStartRecord = async () => {
    setErrorMessage(null);
    stopAudio();
    await startRecording();
  };

  const handleStopRecord = async () => {
    const blob = await stopRecording();
    if (blob) {
      try {
        await onSendTurn({ audioBlob: blob, synthesizeVoice: autoPlayAudio });
      } catch (err: any) {
        setErrorMessage(err.message || 'Speech recognition failed.');
      }
    }
  };

  const handleSendText = async () => {
    const textToSend = typedMessage.trim();
    if (!textToSend || isLoading) return;

    setErrorMessage(null);
    stopAudio();
    setTypedMessage('');
    try {
      await onSendTurn({ text: textToSend, synthesizeVoice: autoPlayAudio });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message.');
    }
  };

  const isEmergency = latestAssessment?.triage_level === 'emergency';

  return (
    <div className="max-w-4xl mx-auto py-4 px-3 sm:px-6 flex flex-col h-[calc(100vh-5rem)]">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-800">
            Consultation Language: <strong className="text-teal-800">{selectedLanguage.name}</strong> ({selectedLanguage.nativeName})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {latestAssessment && (
            <button
              onClick={onViewAssessment}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                isEmergency
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Assessment Summary</span>
            </button>
          )}

          {/* Audio toggle button */}
          <button
            onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            title={autoPlayAudio ? 'Voice narration active' : 'Voice narration muted'}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              autoPlayAudio
                ? 'bg-teal-50 border-teal-200 text-teal-700'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}
          >
            {autoPlayAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Emergency Alert Ribbon if detected */}
      {isEmergency && (
        <div className="mt-3 p-3 rounded-xl bg-red-600 text-white flex items-center justify-between gap-3 shadow-sm animate-pulse">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-200" />
            <span>Emergency warning detected! Routine questions stopped. Dial 112 immediately.</span>
          </div>
          <a
            href="tel:112"
            className="px-3 py-1 bg-white text-red-700 rounded-lg text-xs font-black shrink-0 hover:bg-red-50"
          >
            Call 112
          </a>
        </div>
      )}

      {/* Error Banner */}
      {(errorMessage || recorderError) && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage || recorderError}</span>
          </div>
          <button
            onClick={() => {
              setErrorMessage(null);
              clearRecording();
            }}
            className="text-red-600 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Chat Messages Timeline */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-teal-700 text-white shadow-sm'
                }`}
              >
                {isUser ? 'You' : <Stethoscope className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>

                {/* Audio replay button for assistant */}
                {!isUser && msg.audioBase64 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => playAudio(msg.audioBase64!)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-sm bg-white border border-slate-200 shadow-sm text-sm text-slate-500 flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></div>
              <span>VillDoc is analyzing your symptoms and formulating safe guidance...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Controls Bar */}
      <div className="pt-3 border-t border-slate-200 space-y-3 bg-[#f8faf9]">
        {/* Mode Toggle & Audio Playing Status */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputMode('voice')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'voice'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Input</span>
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                inputMode === 'text'
                  ? 'bg-teal-700 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Type Text</span>
            </button>
          </div>

          {isPlayingAudio && (
            <div className="flex items-center gap-2 text-xs font-medium text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-ping"></span>
              <span>Speaking response...</span>
              <button
                onClick={stopAudio}
                className="ml-1 text-red-600 hover:underline font-bold"
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Voice Mode Controls */}
        {inputMode === 'voice' ? (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full animate-pulse-mic pointer-events-none"></div>
              )}
              <button
                onClick={isRecording ? handleStopRecord : handleStartRecord}
                disabled={isLoading}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center shadow-md transition-all ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 text-white scale-105'
                    : isLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-teal-700 hover:bg-teal-800 text-white hover:scale-105'
                }`}
              >
                {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </button>
            </div>

            <div className="text-center">
              {isRecording ? (
                <div className="space-y-0.5">
                  <div className="text-sm font-bold text-red-600">Recording... {recordingDuration}s</div>
                  <p className="text-xs text-slate-500">Tap microphone button again to finish and submit</p>
                </div>
              ) : isLoading ? (
                <p className="text-xs text-slate-500 font-medium">Processing consultation turn...</p>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700">Tap microphone to speak your symptoms</p>
                  <p className="text-[11px] text-slate-400">Speak clearly in {selectedLanguage.name}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Text Input Mode */
          <div className="p-2 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-2">
            <textarea
              rows={2}
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendText();
                }
              }}
              placeholder={`Type your symptoms or answers in ${selectedLanguage.name}...`}
              className="flex-1 p-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
            />
            <button
              onClick={handleSendText}
              disabled={!typedMessage.trim() || isLoading}
              className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                typedMessage.trim() && !isLoading
                  ? 'bg-teal-700 hover:bg-teal-800 text-white'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
