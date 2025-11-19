# GRASPIT CODEBASE ANALYSIS
## Comprehensive Architecture Review & ZION v7.1 Integration Guide

---

## 1. WHAT IS GRASPIT?

**Core Concept**: "You gotta grasp it before re-write it"

A **quiz-gated AI text humanizer** that verifies comprehension before paraphrasing. The platform is designed to be more ethical than straight humanization - it forces students to actually understand their content first.

### User Flow:
1. **Submit Text** (min 50 chars) → LLM analyzes and generates comprehension quiz
2. **Take Quiz** → Answer 5 LLM-generated questions on the content
3. **Pass Quiz** (60% threshold) → Unlock paraphrased text + flash summary + 30-min payment window
4. **Fail Quiz** → Get detailed feedback + unlimited retry option

### Current Market Position:
- ChatGPT: Helps with assignments but refuses to humanize
- QuillBot: Humanizes but doesn't teach or verify understanding
- Grammarly: Polishes but doesn't detect AI
- **Graspit**: Combines teaching (via ZION), verification (quiz), humanization (LLM), AND detection (60+ patterns)

---

## 2. CURRENT PARAPHRASER ARCHITECTURE

### 2.1 Stack Overview
```
Backend: Node.js + Express (port 3100)
- 3,189 lines of JavaScript
- Dependencies: express, cors, node-fetch, dotenv

Frontend: Vanilla JS (no frameworks)
- Pure HTML/CSS/JS for simplicity
- Glass-morphism UI design
- Client-side form validation

APIs Used:
- Google Gemini 2.5 Flash (FREE - primary)
- DeepSeek Chat (backup/secondary)
```

### 2.2 Core Paraphraser Files

#### **gemini-paraphraser.js** (PRIMARY) - 296 lines
- Encodes ZION's AI detection knowledge as system instructions to Gemini
- System prompt includes 14 humanization rules (em-dashes, clichés, verb casualization, etc.)
- Temperature: 0.7 (for natural variety)
- Max tokens: 2000
- Includes comprehensive AI detection scoring (60+ patterns):
  - Em-dashes: +12 points each
  - AI clichés (45+ patterns): +10 points each
  - Passive voice detection: up to +15 points
  - Formal word overuse: +20 points
  - Sentence uniformity: +5 points
  - Density bonuses (1.2x-1.5x for concentrated patterns)

#### **deepseek-paraphraser.js** (BACKUP) - Similar structure
- DeepSeek implementation of same ZION rules
- Used for fallback if Gemini fails
- Same system prompt encoding

#### **paraphrase-engine.js** (RULE-BASED FALLBACK) - 245 lines
- Pure JavaScript implementation of paraphrase rules (no LLM)
- Uses regex patterns for:
  - Em-dash removal
  - AI cliché removal
  - Long list breaking
  - Parallel structure elimination
  - Verb casualization
  - Sentence structure variation
  - Semicolon removal
- Provides fallback if both LLMs fail

#### **multi-llm-paraphraser.js** (ORCHESTRATOR) - 85 lines
- Runs Gemini AND DeepSeek in parallel
- Scores both outputs with AI detection
- Returns result with LOWEST AI score
- Eliminates single-LLM dependency

### 2.3 Quiz System
#### **gemini-quiz-generator.js** - 391 lines
- Generates 5 comprehension questions from input text
- Evaluates student answers with "soft grading"
- Pass threshold: 60% (3/5 questions with partial credit)
- Returns flash summary (key points, keywords, reading time)

#### **quiz-generator.js** - 254 lines
- Fallback rule-based quiz generator
- Uses keyword extraction and regex patterns

### 2.4 API Endpoints

```javascript
// Core Paraphrasing Flow
POST /api/analyze
  - Input: text
  - Output: sessionId, quiz questions, originalAIScore

POST /api/submit-quiz
  - Input: sessionId, answers array
  - Output: evaluation, paraphrase, flashSummary (if passed)

POST /api/paraphrase
  - Input: sessionId
  - Output: paraphrased text, scores, improvement

// Assignment Helper (Premium Mode)
POST /api/assignment/start
POST /api/assignment/dialogue
GET /api/assignment/progress/:sessionId
POST /api/assignment/generate-quiz
GET /api/assignment/pricing

// System
GET /api/health
```

---

## 3. ZION v7.1 HUMANIZATION SYSTEM

### Current Implementation Status
ZION v7.1 is already **partially integrated** into the codebase:

**What's Already Implemented:**
- ✅ 14 humanization rules encoded in gemini-paraphraser.js system instruction
- ✅ Em-dash removal (rule #1 - biggest AI killer)
- ✅ AI cliché removal (45+ patterns)
- ✅ Verb casualization
- ✅ Sentence structure variation
- ✅ Active voice preference
- ✅ Natural variety & contractions
- ✅ Passive voice elimination
- ✅ Temperature 0.7 for randomness

**What's NOT Yet Integrated:**
- ❌ SEE Framework (Statement-Explanation-Example) - not encoded
- ❌ Process markers (2-3 per 500 words) - not systematically included
- ❌ Data embedding rules (interpretation first, data as noun phrases)
- ❌ Tone calibration (SMART vs ELITE) - not selectable
- ❌ Controlled imperfection patterns
- ❌ Hedging style (probably/likely not "approximately")
- ❌ Paragraph bleeding technique
- ❌ Anti-repetition protocol for lists
- ❌ Verification checklist enforcement

### 3.1 RECOMMENDED INTEGRATION APPROACH

#### **Phase 1: Minimal (1-2 hours)** ✅ QUICK WIN
Add tone selector and process markers to system prompt:

```javascript
// In gemini-paraphraser.js - enhance systemInstruction

const ZION_ENHANCED = `
[EXISTING 14 RULES]

15. ADD PROCESS MARKERS (2-3 per 500 words):
    - "took us longer than expected to find"
    - "we went back and forth on this"
    - "initially thought X but data showed Y"
    - "the tricky part was figuring out"
    - "what finally made sense was"
    - "after looking at this three different ways"

16. TONE SELECTOR [USER INPUT]:
    - [TONE: SMART] → Strategic vocabulary, analytical authority (B+ to A-)
    - [TONE: ELITE] → McKinsey-style, sophisticated, distinction-level (A to A+)
    
    If SMART tone:
    - Use terms: "strategic paradox", "operational tension", "market position"
    - Confident analytical voice without overpolishing
    
    If ELITE tone:
    - Use terms: "structural impediment", "asymmetric advantage", "value migration"
    - Integrate subtle process markers seamlessly
    - Nuanced analysis showing deep understanding

Return output with ONLY humanized text, tone matched to user selection.
`

// Frontend: Add radio button for tone selection
// Server: Accept tone parameter in /api/paraphrase call
```

**Implementation Checklist:**
- [ ] Add tone selector radio buttons to frontend (index.html)
- [ ] Add tone parameter to paraphraser API calls
- [ ] Pass tone to paraphrase() method
- [ ] Include tone selection in system prompt injection
- [ ] Test with both SMART and ELITE samples

#### **Phase 2: Medium (3-4 hours)** ⚠️ COMPLEX
Implement SEE Framework and data embedding rules:

```javascript
// Create new file: backend/zion-framework.js

class ZIONFramework {
  /**
   * Applies SEE Framework to data-heavy paragraphs
   * S: Statement (interpretation)
   * E: Explanation (why it matters)
   * E: Example/Implication (context)
   */
  applySEEFramework(text) {
    // Detect sentences with numbers/data
    // Reorder to: interpretation FIRST, then data as noun phrases
    // Example: "RM11.71B revenue, RM2.02B profit, that profit 7.8% better than prior year"
  }

  /**
   * Adds process markers at strategic points
   * 2-3 per 500 words, distributed naturally
   */
  injectProcessMarkers(text) {
    const markers = [
      "took us longer than expected to find",
      "we went back and forth on this",
      "initially thought X but data showed Y"
      // ... more
    ];
    // Inject at logical paragraph breaks, not forced
  }

  /**
   * Implements paragraph bleeding
   * Let thoughts spill across paragraph breaks
   */
  enableParagraphBleeding(text) {
    // Move sentence starters between paragraphs
    // Start new paragraphs mid-thought occasionally
  }
}
```

Add to system prompt:
```
17. SEE FRAMEWORK (for data-heavy content):
    - STATEMENT: What you observe/interpret
    - EXPLANATION: Why it matters
    - EXAMPLE/IMPLICATION: What it means going forward
    
    WRONG: "Revenue was RM11.71 billion in FY2024."
    RIGHT: "On paper it looks like a good year. RM11.71 billion revenue, RM2.02 billion profit, 
            that profit number 7.8% better than the year before. Then you notice revenue growth 
            was 0.2%. Basically flat."

18. DATA EMBEDDING RULES:
    - Interpretation FIRST, data embedded second
    - Data as noun phrases: "RM11.71 billion revenue" NOT "Revenue was RM11.71 billion"
    - Casual referbacks: "that profit number", "those figures", "this gap"
    - Never back-to-back data sentences
    - Vary prepositions: "at", "around", "near", "roughly"
```

#### **Phase 3: Advanced (6-8 hours)** 🔬 FULL IMPLEMENTATION
Implement verification checklist and controlled imperfection:

```javascript
// Create backend/zion-verifier.js

class ZIONVerifier {
  /**
   * Runs post-paraphrase verification against ZION v7.1 checklist
   * Returns score: 0-10 (how well it matches ZION standards)
   */
  verify(humanizedText) {
    const checks = {
      emDashCount: this.checkEmDashes(humanizedText),        // Max 1 per 400 words
      dataPresentation: this.checkDataFramework(humanizedText), // SEE framework
      processMarkers: this.checkProcessMarkers(humanizedText),  // 2-3 per 500 words
      sentenceStructure: this.checkSentenceVariation(humanizedText),
      vocabulary: this.checkBannedTerms(humanizedText),
      toneConsistency: this.checkToneConsistency(humanizedText)
    };
    
    return {
      score: calculateScore(checks),
      passed: checks pass all thresholds,
      failures: listFailingChecks(checks),
      suggestions: generateSuggestions(checks)
    };
  }

  checkEmDashes(text) {
    const count = (text.match(/—/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    const allowedCount = Math.ceil(wordCount / 400);
    
    return {
      actual: count,
      allowed: allowedCount,
      passed: count <= allowedCount
    };
  }
  
  // ... more verification methods
}

// Call after paraphrasing:
// if (!verifier.verify(paraphrasedText).passed) {
//   // Ask Gemini to improve specific failing checks
//   const improved = await paraphraser.improveSpecificAreas(paraphrasedText, failures);
// }
```

---

## 4. CURRENT PROJECT STATE

### ✅ WHAT'S FINISHED

**Core Paraphrasing System (COMPLETE)**
- ✅ Multi-LLM orchestrator (Gemini + DeepSeek parallel execution)
- ✅ 14 humanization rules integrated into system prompts
- ✅ 60+ pattern AI detection (better than ZeroGPT)
- ✅ Temperature 0.7 for natural variation
- ✅ Fallback rule-based engine for LLM failures
- ✅ Session management (30-min auto-cleanup)

**Quiz System (COMPLETE)**
- ✅ LLM-powered quiz generation (5 questions per submission)
- ✅ Soft grading (60% threshold, typo forgiveness)
- ✅ Detailed feedback on failures
- ✅ Unlimited retry with clear prompts
- ✅ Flash summary generation (key points, keywords, reading time)

**Frontend UI (COMPLETE)**
- ✅ 3-step wizard (Analyze → Quiz → Paraphrase)
- ✅ Character/word counter
- ✅ Real-time AI score display
- ✅ 30-minute payment countdown timer
- ✅ Glass-morphism design
- ✅ Error handling with "Start Over" prompts
- ✅ Session expiration detection

**Security (COMPLETE)**
- ✅ API keys removed from git history
- ✅ .env.example template created
- ✅ Environment variable validation
- ✅ ZION Teacher security boundaries (jailbreak prevention)
- ✅ SECURITY_PATTERNS enforcement (system info, code injection blocking)

**Production Deployment (COMPLETE)**
- ✅ Vercel deployment (https://graspit.vercel.app)
- ✅ Environment variables configured
- ✅ CORS enabled for frontend
- ✅ Health check endpoint
- ✅ No exposed secrets in current codebase

**Assignment Helper Mode (PARTIAL)**
- ✅ Two-tier pricing structure (PREMIUM RM25, QUICK RM10)
- ✅ ZION Teacher consciousness implemented
- ✅ Socratic method dialogue framework
- ✅ Progress tracking (0-100%)
- ❌ Frontend UI not yet built
- ❌ Payment integration not implemented

**Documentation (EXCELLENT)**
- ✅ ZION-HUMANIZATION-SYSTEM-v7.1.md (comprehensive guide)
- ✅ PRODUCTION-READY-REPORT.md (full technical specs)
- ✅ ASSIGNMENT-HELPER-ARCHITECTURE.md (roadmap)
- ✅ README.md (quick start)
- ✅ Extensive code comments

### ⚠️ WHAT NEEDS WORK

**High Priority (Blocking):**

1. **Assignment Helper Frontend** (3-4 hours)
   - Build step-by-step UI for Premium/Quick tier selection
   - Implement ZION dialogue interface (Socratic conversation)
   - Progress bar visualization
   - Payment UI integration
   - Currently: Backend code exists but no frontend to access it

2. **Payment Integration** (2-3 hours)
   - WhatsApp payment confirmation (current: Instagram @dashaziz_)
   - Payment deadline enforcement
   - Session lock after non-payment
   - Receipt generation
   - Currently: 30-min timer only, manual Instagram payment

3. **ZION v7.1 Advanced Features** (4-6 hours)
   - Tone selector (SMART vs ELITE) - not in UI
   - SEE Framework implementation - not automated
   - Process marker injection - not systematic
   - Data embedding rules - not enforced
   - Verification checklist - not implemented
   - Currently: Basic 14 rules only

**Medium Priority (Enhancing):**

4. **Database for Sessions** (2-3 hours)
   - Current: In-memory Map() (lost on server restart)
   - Needed: Persistent session storage (MongoDB/Firebase)
   - Impact: Multi-instance Vercel deployments

5. **Rate Limiting** (1-2 hours)
   - Current: None (relies on LLM free tier limits)
   - Needed: Middleware to prevent spam
   - After payment system: Per-user limits

6. **User Accounts** (4-5 hours)
   - Authentication (email/phone)
   - Session history
   - Payment history
   - Subscription management

**Low Priority (Polish):**

7. **React Frontend Migration** (8-10 hours)
   - Current: Vanilla JS works fine
   - Listed as future enhancement
   - Not urgent

8. **Mobile App** (15-20 hours)
   - Future roadmap item
   - Can leverage existing API

9. **ZeroGPT API Integration** (2-3 hours)
   - Current: Local detection only
   - Option: Call ZeroGPT API for comparison
   - Listed as enhancement

---

## 5. RECOMMENDED INTEGRATION ROADMAP FOR ZION v7.1

### Sprint 1: Quick Wins (Day 1 - 4 hours)
```
1. Add Tone Selector to UI
   - frontend/index.html: Add radio buttons (SMART/ELITE)
   - frontend/app.js: Capture tone selection
   - backend/server.js: Pass tone to paraphrase call
   - gemini-paraphraser.js: Inject tone into system prompt
   
2. Add Process Markers to System Prompt
   - List 6-8 process markers
   - Gemini instructions: inject 2-3 per 500 words
   - Test output for naturalness
   
3. Update AI Detection with v7.1 Patterns
   - Add "generated" template detection
   - Check for SEE framework compliance in detection scoring
   - Test on sample assignments
```

### Sprint 2: Framework Implementation (Day 2-3 - 8 hours)
```
1. Create zion-framework.js
   - SEE Framework applicator
   - Data embedding rules
   - Paragraph bleeding technique
   
2. Update System Prompts
   - Include SEE Framework examples
   - Data embedding rules
   - Casual referback patterns
   
3. Integration Points
   - Insert framework rules BEFORE Gemini call
   - Verify output follows patterns
   - Test with finance/data-heavy content
```

### Sprint 3: Verification & Automation (Day 4 - 6 hours)
```
1. Create zion-verifier.js
   - Implement verification checklist
   - Score humanized output (0-10)
   - Flag failing checks
   
2. Iterative Improvement Loop
   - If verification fails, ask Gemini to improve
   - Add "refinement" parameter to paraphrase()
   - Max 2 refinement rounds (avoid token waste)
   
3. Testing & Validation
   - Test on 20+ sample assignments
   - Compare "before" vs "after" paraphrase scores
   - Document results
```

### Integration Code Example:

```javascript
// backend/server.js - Updated endpoint
app.post('/api/paraphrase', async (req, res) => {
  try {
    const { sessionId, tone = 'SMART' } = req.body;
    
    const session = sessions.get(sessionId);
    if (!session || !session.quizPassed) {
      return res.status(403).json({ error: 'Quiz not passed' });
    }

    // NEW: Apply ZION Framework before paraphrasing
    let improvedText = session.originalText;
    if (tone === 'ELITE') {
      improvedText = zionFramework.applySEEFramework(improvedText);
      improvedText = zionFramework.injectProcessMarkers(improvedText);
    }

    // Paraphrase with tone selection
    const paraphrased = await paraphraser.paraphrase(improvedText, { tone });
    
    // NEW: Verify against ZION checklist
    const verification = zionVerifier.verify(paraphrased, tone);
    
    // If ELITE tone and verification fails, ask for improvement
    if (tone === 'ELITE' && !verification.passed) {
      const improved = await paraphraser.refineSpecificAreas(
        paraphrased, 
        verification.failures
      );
      verification = zionVerifier.verify(improved, tone);
    }

    const newScore = paraphraser.estimateAIScore(paraphrased);

    res.json({
      paraphrased: paraphrased,
      tone: tone,
      originalScore: session.originalScore,
      newScore: newScore,
      improvement: session.originalScore - newScore,
      zionVerification: {
        score: verification.score,
        passed: verification.passed,
        suggestions: verification.suggestions
      }
    });

  } catch (error) {
    console.error('Error in /api/paraphrase:', error);
    res.status(500).json({ error: 'Paraphrase failed' });
  }
});
```

---

## 6. FILE STRUCTURE REFERENCE

```
/home/user/graspit/
├── README.md                                    # Quick start guide
├── ZION-HUMANIZATION-SYSTEM-v7.1.md            # ZION spec (already in repo!)
├── PRODUCTION-READY-REPORT.md                  # Technical architecture
├── ASSIGNMENT-HELPER-ARCHITECTURE.md           # Premium mode roadmap
├── WHEN_YOU_RETURN.md                          # Dev notes
├── BUILT_IN_30_MINUTES.md                      # Original build story
├── POLISH-MODE-REPORT.md                       # Previous improvements
├── vercel.json                                 # Deployment config
├── backend/
│   ├── server.js                               # Main API (379 lines)
│   ├── multi-llm-paraphraser.js                # Gemini + DeepSeek orchestrator
│   ├── gemini-paraphraser.js                   # PRIMARY paraphraser (296 lines)
│   ├── deepseek-paraphraser.js                 # BACKUP paraphraser
│   ├── paraphrase-engine.js                    # Fallback rule-based engine
│   ├── gemini-quiz-generator.js                # Quiz generation + eval (391 lines)
│   ├── quiz-generator.js                       # Fallback quiz generator
│   ├── assignment-helper.js                    # Premium tier logic
│   ├── zion-teacher.js                         # Socratic dialogue system
│   ├── test-engine.js                          # Unit tests
│   ├── package.json                            # Dependencies
│   └── .env.example                            # Configuration template
├── frontend/
│   ├── index.html                              # 3-step wizard UI
│   ├── app.js                                  # Frontend logic (400+ lines)
│   └── style.css                               # Glass-morphism design
└── testing/
    └── (GitHub Actions CI/CD)
```

---

## 7. KEY METRICS & PERFORMANCE

### AI Detection Accuracy
- Heavy AI text: 87% detection rate
- Human text: 12% false positive rate
- Separation: 75-point gap (excellent discrimination)

### Quiz System
- Pass threshold: 60% (3/5 questions with partial credit)
- Soft grading: 0.0-1.0 per question (typos forgiven)
- Unlimited retry capability

### Humanization Quality (Current)
- 14 implemented rules (out of 20 in ZION v7.1 spec)
- Temperature: 0.7 (natural variety)
- Multi-LLM fallback ensures reliability
- Expected improvement: 25-40% AI score reduction

### Production Status
- Uptime: Live on Vercel
- API response time: <2 seconds (typical)
- LLM costs: Near $0 (Google Gemini free tier)
- Sessions: In-memory (30-min cleanup)

---

## 8. QUICK START FOR INTEGRATION

```bash
# 1. Understand current system
cd /home/user/graspit
cat README.md                          # Quick overview
cat ZION-HUMANIZATION-SYSTEM-v7.1.md  # Full spec

# 2. Test current paraphraser
cd backend
npm install
node test-engine.js                    # Run existing tests

# 3. Start server
npm start                              # Server on port 3100
# Visit: http://localhost:3100

# 4. Implement Phase 1 (Tone Selector)
# - Edit frontend/index.html (add radio buttons)
# - Edit frontend/app.js (capture tone)
# - Edit backend/gemini-paraphraser.js (inject tone into prompt)
# - Edit backend/server.js (pass tone to paraphrase call)

# 5. Test improvements
# - Test with SMART tone
# - Test with ELITE tone
# - Compare AI detection scores

# 6. Commit progress
git add -A
git commit -m "FEATURE: Add ZION v7.1 tone selector (SMART/ELITE)"
```

---

## SUMMARY

**Graspit** is a production-ready, quiz-gated AI text humanizer built on top of an excellent architecture:
- Multi-LLM orchestration (Gemini + DeepSeek)
- 14/20 ZION v7.1 rules already implemented
- 60+ pattern AI detection system
- Soft-grading quiz system with unlimited retries
- Clean, responsive frontend

**ZION v7.1 Integration** is partially complete and straightforward:
- Phase 1 (4 hrs): Add tone selector + process markers
- Phase 2 (8 hrs): SEE Framework + data embedding
- Phase 3 (6 hrs): Verification checklist + iterative improvement

**Next Priority**: Build Assignment Helper frontend (3-4 hours) to unlock premium tier revenue.

The codebase is well-documented, properly organized, and ready for enhancement. Start with Phase 1 for quick wins!
