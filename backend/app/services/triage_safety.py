"""
VillDoc 2.0 - Deterministic Safety Layer
Provides application-level safety checks and emergency escalation rules.
This layer is NOT a disease classifier and does NOT diagnose diseases.
It checks for critical medical red flags and enforces safe triage boundaries.
"""

import re
from typing import List, Tuple
from app.schemas.triage import ClinicalAssessment, TriageLevel


# Multilingual emergency keywords and symptom patterns (English, Hindi transliteration/Devanagari, Bengali)
EMERGENCY_PATTERNS = [
    # Chest pain / Heart attack signs
    r"\b(chest\s+(?:severe\s+|crushing\s+)?(?:pain|pressure|tightness)|heart attack|angina|crushing chest)\b",
    r"(?:छाती|सीने)(?:\s+में)?(?:\s+(?:बहुत|तेज|तीव्र))?\s+(?:दर्द|दबाव|जकड़न)|दिल का दौरा",
    r"(?:বুকে)(?:\s+(?:তীব্র|প্রচণ্ড|খুব))?\s+(?:ব্যথা|চাপ|জ্বালা)|হৃদরোগ",
    r"\b(?:chaati|seene)\s+(?:me\s+)?(?:dard|chap)|buke\s+(?:tibr[oa]\s+)?(?:betha|byatha|chap)\b",

    # Severe breathing difficulty
    r"\b(difficulty breathing|can't breathe|cannot breathe|breathlessness|gasping|choking|shortness of breath|dyspnea)\b",
    r"(सांस लेने में तकलीफ|सांस फूलना|दम घुट|শ্বাসকষ্ট|শ্বাস নিতে কষ্ট|দম আটকে)",
    r"\b(saans lene me taklif|saans phoolna|swaskosto|dom atke)\b",

    # Stroke signs (FAST: Face, Arms, Speech, Time)
    r"\b(stroke|facial drooping|one-sided weakness|slurred speech|paralysis|arm weakness)\b",
    r"(लकवा|मुंह टेढ़ा|बोलने में असमर्थ|পক্ষাঘাত|মুখ বেঁকে যাওয়া|কথা জড়িয়ে)\b",
    r"\b(lakwa|muh tedha|pokkhaghat)\b",

    # Altered mental status / Consciousness
    r"\b(loss of consciousness|unconscious|fainted|passed out|unresponsive|severe confusion|coma)\b",
    r"(बेहोश|होश खो|অজ্ঞান|সংজ্ঞাহীন|অসচেতন)",
    r"\b(behosh|hosh kho|ogyan)\b",

    # Severe bleeding
    r"\b(severe bleeding|uncontrolled bleeding|coughing blood|vomiting blood|haemorrhage|hemorrhage)\b",
    r"(खून बहना|खून की उल्टी|অতিরিক্ত রক্তপাত|রক্ত বমি|কাশির সাথে রক্ত)",
    r"\b(khoon ki ulti|khoon behna|rokto bomi)\b",

    # Seizures / Convulsions
    r"\b(seizure|convulsion|epilepsy fit|active seizure)\b",
    r"(दौरा|झटके|খিঁচুনি|ফিট)",
    r"\b(daura|khichuni)\b",

    # Severe Anaphylaxis / Allergic Reaction
    r"\b(anaphylaxis|throat swelling|swollen tongue|lip swelling|severe allergic reaction)\b",
    r"(गले में सूजन|जीभ में सूजन|গলা ফুলে যাওয়া|জিভ ফুলে যাওয়া)",
    r"\b(gale me soojan|anaphylaxis)\b",

    # Poisoning / Overdose
    r"\b(poisoning|swallowed poison|drug overdose|insecticide|pesticide)\b",
    r"(ज़हर|বিষ খেয়েছে|বিষাক্ত)\b",
    r"\b(zeher|zahar|bish)\b",
]

# Prohibited medication terms that must never be recommended as self-care
PROHIBITED_MEDICATIONS = [
    r"\b(amoxicillin|azithromycin|ciprofloxacin|doxycycline|cephalexin|metronidazole|penicillin)\b",
    r"\b(steroid|prednisone|dexamethasone|tramadol|codeine|morphine|alprazolam|diazepam)\b",
    r"\b(antibiotic|antibiotics)\b",
]


def check_emergency_signals(text: str) -> List[str]:
    """Scans text for critical medical emergency warning signs."""
    detected = []
    text_lower = text.lower()
    for pattern in EMERGENCY_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for m in matches:
            val = m if isinstance(m, str) else m[0]
            if val and val not in detected:
                detected.append(val)
    return detected


def sanitize_care_advice(advice_list: List[str]) -> List[str]:
    """Ensures no prescription medications or antibiotics are present in advice."""
    sanitized = []
    for item in advice_list:
        is_safe = True
        for pattern in PROHIBITED_MEDICATIONS:
            if re.search(pattern, item, re.IGNORECASE):
                is_safe = False
                break
        if is_safe:
            sanitized.append(item)
    return sanitized


def apply_safety_guardrails(
    assessment: ClinicalAssessment,
    user_input_history: List[str],
    language: str = "en-IN"
) -> Tuple[ClinicalAssessment, bool]:
    """
    Evaluates the clinical assessment against deterministic safety rules.
    Returns:
        (updated_assessment, was_escalated)
    """
    escalated = False
    all_user_text = " ".join(user_input_history)

    # 1. Check for emergency signals in user conversation and red flags
    emergency_signals = check_emergency_signals(all_user_text)

    # Also check assessment red flags and symptoms
    if assessment.red_flags:
        for rf in assessment.red_flags:
            emergency_signals.extend(check_emergency_signals(rf))

    for sym in assessment.symptoms:
        if sym.severity == "severe":
            emergency_signals.extend(check_emergency_signals(sym.name))

    # If any emergency signals are detected or LLM marked emergency
    is_emergency = bool(emergency_signals or assessment.triage_level == TriageLevel.EMERGENCY)

    if is_emergency:
        if assessment.triage_level != TriageLevel.EMERGENCY:
            escalated = True
        assessment.triage_level = TriageLevel.EMERGENCY
        assessment.conversation_complete = True

        # In emergencies, strip all home remedies / self-care advice
        assessment.self_care_advice = []

        # Add detected signals to red flags if not already present
        for sig in emergency_signals:
            if sig not in assessment.red_flags:
                assessment.red_flags.append(f"Emergency indicator detected: {sig}")

        # Ensure immediate emergency care guidance is top priority
        emergency_instruction_en = "Seek emergency medical care immediately. Call 112 or visit the nearest emergency hospital immediately. Do not wait."
        emergency_instruction_hi = "तुरंत आपातकालीन चिकित्सा सहायता लें। 112 पर कॉल करें या तुरंत नजदीकी अस्पताल के आपातकालीन विभाग में जाएं।"
        emergency_instruction_bn = "অবিলম্বে জরুরি চিকিৎসার ব্যবস্থা নিন। ১১২ নম্বরে ফোন করুন বা নিকটস্থ হাসপাতালের জরুরি বিভাগে যান।"

        localized_emergency = emergency_instruction_en
        if "hi" in language:
            localized_emergency = emergency_instruction_hi
        elif "bn" in language:
            localized_emergency = emergency_instruction_bn

        # Prepend emergency guidance
        if localized_emergency not in assessment.care_recommendations:
            assessment.care_recommendations = [localized_emergency] + assessment.care_recommendations

    # 2. Sanitize any self-care advice against prohibited medications
    assessment.self_care_advice = sanitize_care_advice(assessment.self_care_advice)
    assessment.care_recommendations = sanitize_care_advice(assessment.care_recommendations)

    # 3. Always ensure limitation disclaimer is present
    if not assessment.disclaimer:
        assessment.disclaimer = (
            "VillDoc 2.0 is an AI health triage assistant, not a licensed doctor. "
            "In case of severe or life-threatening symptoms, dial 112 or visit an emergency room immediately."
        )

    return assessment, is_emergency
