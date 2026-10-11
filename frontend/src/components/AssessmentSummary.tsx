import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  HelpCircle,
  ArrowLeft,
  PhoneCall,
  Activity,
  Heart,
  Stethoscope,
  ChevronRight,
  Info
} from 'lucide-react';
import { ClinicalAssessment, TriageLevel } from '../types';

interface AssessmentSummaryProps {
  assessment: ClinicalAssessment;
  onBackToConsultation: () => void;
  onEndConsultation: () => void;
}

export const AssessmentSummary: React.FC<AssessmentSummaryProps> = ({
  assessment,
  onBackToConsultation,
  onEndConsultation,
}) => {
  const isEmergency = assessment.triage_level === 'emergency';
  const isUrgent = assessment.triage_level === 'urgent';
  const isRoutine = assessment.triage_level === 'routine';
  const isInsufficient = assessment.triage_level === 'insufficient_information';

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToConsultation}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Consultation to Clarify</span>
        </button>

        <button
          onClick={onEndConsultation}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-slate-600 hover:text-red-700 border border-slate-200 hover:border-red-200 transition-colors"
        >
          Finish & Purge Session
        </button>
      </div>

      {/* Emergency Alert Banner (PROMINENT - never hidden) */}
      {isEmergency && (
        <div className="rounded-2xl bg-red-600 text-white p-6 shadow-md space-y-4 border-2 border-red-700 animate-pulse">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded">
                Immediate Medical Emergency
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Emergency Care Required Immediately
              </h2>
              <p className="text-sm text-red-100 leading-relaxed">
                Critical warning signs have been reported. Do not wait or continue routine questioning. Seek immediate emergency clinical care.
              </p>
            </div>
          </div>

          <div className="bg-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-white/20">
            <div className="flex items-center gap-3">
              <PhoneCall className="w-6 h-6 text-white shrink-0" />
              <div>
                <div className="text-xs text-red-200 font-semibold uppercase">National Emergency Helpline (India)</div>
                <div className="text-xl font-black text-white">Call 112 / 108 Immediately</div>
              </div>
            </div>
            <a
              href="tel:112"
              className="w-full sm:w-auto px-5 py-2.5 bg-white text-red-700 rounded-lg font-bold text-center text-sm shadow hover:bg-red-50 transition-colors"
            >
              Call 112 Now
            </a>
          </div>
        </div>
      )}

      {/* Triage Urgency Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clinical Assessment</span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Triage Summary</h1>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide border self-start sm:self-auto">
            {isEmergency && (
              <span className="flex items-center gap-1.5 text-red-700 bg-red-50 border-red-200">
                <ShieldAlert className="w-4 h-4 text-red-600" /> Emergency
              </span>
            )}
            {isUrgent && (
              <span className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Urgent Clinical Evaluation
              </span>
            )}
            {isRoutine && (
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Routine / Non-Urgent
              </span>
            )}
            {isInsufficient && (
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 border-blue-200">
                <HelpCircle className="w-4 h-4 text-blue-600" /> Clarification Recommended
              </span>
            )}
          </div>
        </div>

        {/* Patient Summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reported Symptom History</h3>
          <p className="text-slate-800 text-sm sm:text-base leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
            {assessment.patient_summary || 'No symptom history recorded yet.'}
          </p>
        </div>

        {/* Extracted Symptoms */}
        {assessment.symptoms && assessment.symptoms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documented Symptoms</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assessment.symptoms.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 border border-slate-200/60 text-xs">
                  <div className="font-semibold text-slate-800 capitalize">{s.name}</div>
                  <div className="flex items-center gap-2">
                    {s.duration && <span className="text-slate-500">{s.duration}</span>}
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      s.severity === 'severe'
                        ? 'bg-red-100 text-red-800'
                        : s.severity === 'moderate'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.severity || 'mild'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Possible Conditions (Explicitly labeled as Hypotheses) */}
        {assessment.possible_conditions && assessment.possible_conditions.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Possible Explanations (Clinical Hypotheses)
              </h3>
              <span className="text-[11px] text-slate-400 italic">Not confirmed diagnoses</span>
            </div>
            <div className="space-y-2.5">
              {assessment.possible_conditions.map((c, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-teal-50/40 border border-teal-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{c.condition_name}</h4>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                      Hypothesis
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.explanation}</p>
                  <p className="text-[11px] text-teal-800/90 font-medium">{c.uncertainty}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Red Flags / Warning Signs */}
        {assessment.red_flags && assessment.red_flags.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Warning Signs Noted
            </h3>
            <ul className="space-y-1.5">
              {assessment.red_flags.map((rf, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 shrink-0"></span>
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Care Recommendations */}
        {assessment.care_recommendations && assessment.care_recommendations.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Safe Next Steps</h3>
            <div className="space-y-1.5">
              {assessment.care_recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conservative Self-Care (Only when appropriate, empty in emergencies) */}
        {!isEmergency && assessment.self_care_advice && assessment.self_care_advice.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conservative Self-Care Guidance</h3>
            <div className="space-y-1.5">
              {assessment.self_care_advice.map((advice, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs sm:text-sm text-emerald-900">
                  <Heart className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{advice}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up & Escalation Guidance */}
        {assessment.follow_up_guidance && assessment.follow_up_guidance.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">When to Seek Clinical Evaluation</h3>
            <div className="space-y-1.5">
              {assessment.follow_up_guidance.map((f, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs sm:text-sm text-slate-700">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical Disclaimer Footer */}
        <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2">
          <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>{assessment.disclaimer}</span>
        </div>
      </div>
    </div>
  );
};
