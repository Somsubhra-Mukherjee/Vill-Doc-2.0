# VillDoc 2.0 — Multilingual Voice-First AI Health Triage

**VillDoc 2.0** is an AI-powered, multilingual, voice-first health triage assistant designed for Indian patients. It enables patients to speak naturally in Indian regional languages (Bengali, Hindi, Hinglish, English, Tamil, Telugu, Marathi, Gujarati), engage in empathetic clinical history-taking, understand possible explanations for their symptoms as hypotheses, and receive safe, actionable triage guidance.

> **Clinical Disclaimer:** VillDoc 2.0 is an AI health triage assistant, **not a licensed human doctor**, and does not provide definitive medical diagnoses, prescriptions, or treatment plans. For emergencies in India, dial **112** or visit the nearest hospital emergency department immediately.

---

## 1. System Architecture

VillDoc 2.0 is built on three core layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│               Layer 1: Multilingual Voice & Web Interface              │
│       React + Vite + TypeScript + Tailwind CSS (Audio Recorder)        │
│    Speech-to-Text: Sarvam Saaras (POST https://api.sarvam.ai/speech-to-text)   │
│    Text-to-Speech: Sarvam Bulbul (POST https://api.sarvam.ai/text-to-speech)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│         Layer 2: Clinical History & Reasoning (Sarvam 105B)            │
│   Sarvam Chat Completions (POST https://api.sarvam.ai/v1/chat/completions)│
│  - Model: sarvam-105b-conversations (Voice & Realtime Optimized)       │
│  - Focused 1-2 questions per turn (onset, duration, severity)         │
│  - Strict JSON mode validated with Pydantic ClinicalAssessment schema   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│             Layer 3: Deterministic Safety & Escalation Layer           │
│  - Scans for critical red flags: chest pain, stroke, dyspnea, etc.     │
│  - Immediate escalation to EMERGENCY if danger signals detected        │
│  - Strips all home remedies / self-care advice in emergency cases       │
│  - Filters prescription drugs and antibiotics from output               │
│  - Mandates National Emergency Helpline (112 in India) guidance         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Python 3.13, FastAPI, Pydantic v2, HTTPX (async client with exponential backoff).
- **Speech Recognition (STT):** Sarvam Saaras API (`saaras:v4`).
- **Conversational Reasoning (LLM):** Sarvam Chat Completions API (`sarvam-105b-conversations`).
- **Voice Synthesis (TTS):** Sarvam Bulbul API (`bulbul:v4-flash`).
- **Session State:** In-memory session manager with complete session isolation and zero permanent data logging for patient privacy.

---

## 3. Quick Start & Setup Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### Step 1: Configure Environment Variables
Create or edit `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Add your official Sarvam API key:
```env
SARVAM_API_KEY=your_actual_sarvam_api_key_here
SARVAM_CHAT_MODEL=sarvam-105b-conversations
SARVAM_STT_MODEL=saaras:v4
SARVAM_TTS_MODEL=bulbul:v4-flash
SARVAM_TTS_SPEAKER=shubh
PORT=8000
HOST=0.0.0.0
DEBUG=false
```

*(Note: `backend/.env` is ignored in git to ensure your credentials are never exposed.)*

### Step 2: Start the FastAPI Backend
```bash
# In the repository root:
source backend/venv/bin/activate
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
The API is available at `http://127.0.0.1:8000`. You can inspect health at `http://127.0.0.1:8000/api/health`.

### Step 3: Start the React Frontend
```bash
# In a separate terminal tab:
cd frontend
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 4. Running Automated Tests

Run the full backend test suite verifying session isolation, schema validation, deterministic safety escalation, and API error handling:

```bash
backend/venv/bin/pytest backend/tests -v
```

All 10 test suites cover:
- `test_session_isolation.py`: Verified independent memory state across sessions.
- `test_triage_safety.py`: Verified emergency detection across English, Hindi, and Bengali, home remedy suppression, and antibiotic filtering.
- `test_schema_validation.py`: Verified Pydantic validation, markdown JSON stripping, and broken JSON fallback resilience.
- `test_error_handling.py`: Verified patient consent enforcement, health route without key leakage, and 404 handlers.

---

## 5. Hackathon Demo Script (Synthetic Patients)

### Scenario 1: Mild Complaint (Bengali Voice Flow)
1. Select **Bengali (বাংলা)** on the welcome screen. Check the consent box and click **Start Voice Consultation**.
2. Tap the microphone and speak:
   > *"নমস্কার, আমার গত ২ দিন ধরে একটু শুকনো কাশি আর গলা খুসখুস করছে।"*
3. The AI replies empathetically in Bengali asking if you have a fever or difficulty swallowing.
4. Reply: *"না, জ্বর নেই।"*
5. VillDoc categorizes this as **Routine**, offers safe self-care (warm fluids, rest), and explains when to seek clinical reassessment.

### Scenario 2: Urgent Complaint (Hindi Voice Flow)
1. Select **Hindi (हिन्दी)**.
2. Tap microphone and speak:
   > *"मुझे 3 दिन से 102 डिग्री बुखार है और पेट के दाहिने हिस्से में तेज दर्द हो रहा है।"*
3. VillDoc notes the persistent high fever and abdominal tenderness, categorizes the triage as **Urgent**, advises prompt in-person clinical evaluation, and highlights red flags to watch for.

### Scenario 3: Emergency Red Flag Escalation (English or Hinglish)
1. Select **English** or **Hinglish**.
2. Tap microphone or type:
   > *"My uncle suddenly has severe crushing chest pain and shortness of breath."*
3. **Deterministic Safety Layer triggers immediately:**
   - Halts routine questioning.
   - Sets triage urgency to **Emergency**.
   - Displays a prominent red emergency alert banner.
   - Instructs the user to dial **112 / 108** immediately in India.
   - Strips all home remedies or self-care advice.

---

## 6. Token & Cost Management

For the hackathon credit limit:
- **1 LLM call per turn:** History is aggregated into a single request per patient turn.
- **Audio-on-Demand / Turn Voice:** Bulbul TTS synthesizes only the concise conversational response addressed to the patient, never raw JSON schemas or internal diagnostics.
- **Developer API Monitor:** Click **API Monitor** in the top navigation to view live prompt tokens, completion tokens, STT transcriptions, TTS syntheses, and failed request counts.
