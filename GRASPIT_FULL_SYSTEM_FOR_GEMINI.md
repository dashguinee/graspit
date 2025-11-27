# GRASPIT - COMPLETE SYSTEM DOCUMENTATION FOR GEMINI

## OVERVIEW

GraspIt is an AI-powered text humanization platform with a unique "learn-first" approach. Students must prove they understand content before getting humanized versions.

**Business Model:**
- Premium (RM25): 30-min ZION learning dialogue → quiz → humanize
- Quick (RM10): Direct quiz → humanize

**Stack:**
- Backend: Node.js + Express
- Frontend: Vanilla HTML/CSS/JS
- AI: Google Gemini API
- Deployment: Vercel

---

## DIRECTORY STRUCTURE

```
/home/dash/graspit/
├── backend/
│   ├── server.js                 # Main Express server (PORT 3100)
│   ├── apex-humanizer-v9.js      # APEX V9 humanization prompt (NEW)
│   ├── gemini-paraphraser.js     # Gemini integration for humanization
│   ├── multi-llm-paraphraser.js  # Multi-LLM wrapper (now APEX-only)
│   ├── gemini-quiz-generator.js  # Quiz generation & evaluation
│   ├── assignment-helper.js      # Two-tier assignment system
│   ├── zion-teacher.js           # Socratic teaching dialogue
│   ├── package.json              # Dependencies
│   ├── .env                      # API keys
│   └── archive/
│       └── zion-humanizer-v7.js  # Old v7.1 system (archived)
├── frontend/
│   ├── index.html                # Main UI
│   ├── app.js                    # Frontend logic
│   ├── style.css                 # Styling
│   ├── storage.js                # Local storage management
│   └── ai-detector.js            # Client-side detection helpers
└── vercel.json                   # Deployment config
```

---

## API ENDPOINTS

### Core Flow
```
POST /api/analyze        - Submit text, get quiz
POST /api/submit-quiz    - Submit answers, get humanized text if passed
POST /api/paraphrase     - Get paraphrase (legacy)
POST /api/detect         - AI detection analysis
```

### Assignment Helper
```
POST /api/assignment/start           - Start learning session
POST /api/assignment/dialogue        - Continue ZION dialogue
POST /api/assignment/generate-quiz   - Generate session quiz
GET  /api/assignment/progress/:id    - Check progress
GET  /api/assignment/pricing         - Get pricing info
```

### System
```
GET /api/health          - Health check
```

---

## APEX V9 HUMANIZATION SYSTEM (CURRENT)

### File: `/backend/apex-humanizer-v9.js`

```javascript
const APEX_V9_PROMPT = `### ROLE: LEAD STRATEGY CONSULTANT (THE "APEX" PROTOCOL) ###

You are a cynical, distinction-level Industry Analyst writing a high-level feasibility assessment. You are not reporting news; you are diagnosing structural failure. Your writing style is "Forensic," "Staccato," and "Meta-Cognitive."

### THE 5 IMMUTABLE LAWS OF HUMAN WRITING (STRICT ADHERENCE):

1. DATA OBFUSCATION (ANTI-SCRAPER RULE):
   *   NEVER use a specific percentage (e.g., "18%") or exact dollar amount (e.g., "$60 million") if a descriptor works.
   *   MANDATORY TRANSLATION:
       *   "18%" -> "nearly one-fifth"
       *   "$60 million" -> "tens of millions in capital"
       *   "2023" -> "the recent fiscal cycle"
   *   WHY: Exact numbers are AI fingerprints. Scale descriptors are Human signatures.

2. HEADER ABSTRACTION:
   *   NEVER use standard headers (e.g., "Introduction", "Conclusion", "CSR Initiatives").
   *   USE abstract, tension-based headers.
   *   *Examples:* "The Physics of Scale," "Structural Dissonance," "The Stakeholder Calculus," "Feasibility Mapping."

3. SYNTAX INVERSION (THE "YODA" EFFECT):
   *   Do not start sentences with the Subject. Start with the Clause or Implication.
   *   *Bad (AI):* "The strategy hits a wall here."
   *   *Good (Human):* "Here, the strategy hits a mathematical wall."

4. THE "STACCATO" FRAGMENT:
   *   Use sentence fragments to punctuate data. Judge the reality immediately.
   *   *Pattern:* [Long, complex academic sentence] + [Full Stop] + [Two-word judgment].
   *   *Example:* "The data confirms this tension. Effectively static."

5. HIGH-PERPLEXITY VOCABULARY:
   *   Replace standard verbs/nouns with this specific list:
   *   *Lineage, dimensionalise, calculus, abatement, fracture, dissonance, mechanism, saturation, friction, trajectory, reconcile, liberate.*

### META-COGNITIVE MARKERS (THE "TIRED WRITER"):
*   Inject phrases that show the analysis was difficult.
*   *Use:* "This distinction required extended deliberation," "Candidly, the outlook is mixed," "No assessment is accurate without..."

### OUTPUT FORMAT:
*   No pleasantries.
*   No "Here is the rewritten text."
*   Just the raw, cynical, 1% human text.

[INPUT TEXT FOLLOWS]`;

const APEX_CONFIG = {
  model: 'gemini-1.5-pro-002',
  temperature: 1.35,
  topP: 0.90,
  topK: 40,
  maxOutputTokens: 8192
};
```

### API Call Structure

```javascript
// gemini-paraphraser.js
const response = await fetch(this.apiUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [{
        text: `${systemInstruction}\n\n${text}`
      }]
    }],
    generationConfig: {
      temperature: 1.35,  // HIGH - Creates entropy for human-like output
      topP: 0.90,
      topK: 40,
      maxOutputTokens: 8192
    }
  })
});
```

---

## QUIZ SYSTEM

### File: `/backend/gemini-quiz-generator.js`

**Quiz Generation:**
- Model: `gemini-2.5-flash`
- Temperature: 0.7
- Generates 2 simple comprehension questions
- Pass score: 60%

**Evaluation:**
- Soft scoring (0.0-1.0 per question)
- Generous partial credit
- LLM-based semantic evaluation

---

## ZION TEACHER (Premium Tier)

### File: `/backend/zion-teacher.js`

**Purpose:** Socratic method learning companion for premium tier

**Model:** `gemini-2.0-flash-exp`
**Temperature:** 0.8 (creative for teaching)

**Progress Calculation:**
- canDefine (20%): Uses terminology correctly
- canExplain (20%): Explains relationships
- canReason (30%): Answers "why" questions
- canApply (30%): Applies to new scenarios

**Ready for Quiz:** Progress >= 85%

---

## FRONTEND

### File: `/frontend/app.js`

**Flow:**
1. User pastes text
2. Click "Analyze & Get Quiz"
3. Answer quiz questions
4. If passed (60%+): See flash summary + humanized text
5. 30-minute countdown to pay

**Features:**
- Session backup in localStorage
- History modal
- AI detector modal
- Word count comparison

---

## ENVIRONMENT VARIABLES

```bash
# /backend/.env
GEMINI_API_KEY=AIzaSyAZffegve-8w0WQo2AXDotvQrVbdmo0pEM
DEEPSEEK_API_KEY=sk-99b64a1c8d5a4b229335f315f28a50b1  # Unused now
```

---

## DEPLOYMENT

### Vercel Configuration (`vercel.json`)

```json
{
  "version": 2,
  "buildCommand": "cd backend && npm install",
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    },
    {
      "src": "frontend/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "backend/server.js" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

---

## ARCHIVED SYSTEMS

### ZION v7.1 (`/backend/archive/zion-humanizer-v7.js`)

**Why archived:** Did not achieve target detection rates (best was ~4%)

**Key differences from APEX V9:**
- Lower temperature (0.7)
- Casual voice ("candidly", "honestly")
- SEE Framework for data
- Process markers ("took us longer than expected")

---

## KNOWN ISSUES / IMPROVEMENT OPPORTUNITIES

1. **APEX V9 UNTESTED**: The new APEX V9 system is implemented but not yet tested for actual AI detection rates

2. **Tone parameter not in frontend**: Server accepts `tone` parameter ('apex', 'apex-academic') but frontend doesn't expose it

3. **DeepSeek disabled**: Multi-LLM comparison disabled since APEX V9 is Gemini-specific

4. **Session storage**: Uses in-memory Map, sessions lost on server restart (mitigated by localStorage backup)

5. **Payment integration**: Not implemented - currently manual Instagram DM verification

6. **Rate limiting**: No rate limiting on API endpoints

---

## VERIFICATION CHECKLIST

For Gemini to verify the APEX V9 setup:

1. [ ] Is `gemini-1.5-pro-002` the correct model for high instruction-following?
2. [ ] Is temperature 1.35 optimal or too high?
3. [ ] Are the 5 Immutable Laws correctly implemented?
4. [ ] Should data obfuscation preserve citation numbers?
5. [ ] Is the "Yoda" syntax inversion applied consistently?
6. [ ] Are staccato fragments effective for detection bypass?
7. [ ] Should we add more high-perplexity vocabulary?
8. [ ] Is the meta-cognitive markers list complete?

---

## LOCAL TESTING

```bash
cd /home/dash/graspit/backend
npm install
npm run dev  # Uses nodemon for hot reload

# Server runs on http://localhost:3100
```

---

## SAMPLE API CALLS

### Analyze Text
```bash
curl -X POST http://localhost:3100/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Your AI-generated text here...", "tone": "apex"}'
```

### Submit Quiz
```bash
curl -X POST http://localhost:3100/api/submit-quiz \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "123456", "answers": ["answer1", "answer2"]}'
```

### AI Detection
```bash
curl -X POST http://localhost:3100/api/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Text to analyze for AI patterns..."}'
```

---

## SUMMARY FOR GEMINI

**What we need help with:**
1. Verify APEX V9 prompt is optimal for 1% AI detection
2. Suggest any improvements to the 5 Immutable Laws
3. Confirm temperature 1.35 + topP 0.90 + topK 40 creates proper entropy
4. Identify any streamlining opportunities in the codebase
5. Suggest any missing patterns in the humanization prompt
6. Help test and validate the system achieves target detection rates
