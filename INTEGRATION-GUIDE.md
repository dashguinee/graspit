# ZION v7.1 Integration - Practical Implementation Guide

## Quick Navigation
- **Phase 1 (4 hrs)**: Add tone selector + process markers → QUICK WIN
- **Phase 2 (8 hrs)**: SEE Framework + data embedding → MEDIUM EFFORT
- **Phase 3 (6 hrs)**: Verification checklist → ADVANCED

---

## PHASE 1: TONE SELECTOR + PROCESS MARKERS (4 Hours)

### Step 1: Update Frontend (30 mins)

**File**: `/home/user/graspit/frontend/index.html`

Add after the quiz results section (before the paraphrase output):

```html
<!-- Add ZION v7.1 Tone Selector -->
<div id="toneSelector" class="tone-selector" style="display: none;">
  <h3>Select Writing Tone:</h3>
  
  <label class="tone-option">
    <input type="radio" name="tone" value="SMART" checked>
    <span class="tone-name">SMART</span>
    <span class="tone-desc">Analytical authority, strategic terms (B+ to A-)</span>
  </label>
  
  <label class="tone-option">
    <input type="radio" name="tone" value="ELITE">
    <span class="tone-name">ELITE</span>
    <span class="tone-desc">McKinsey-style sophistication, distinction-level (A to A+)</span>
  </label>
  
  <button onclick="getParaphraseWithTone()" class="btn-primary">
    Get Paraphrase
  </button>
</div>
```

Add CSS to `/home/user/graspit/frontend/style.css`:

```css
.tone-selector {
  background: rgba(255, 255, 255, 0.1);
  padding: 20px;
  border-radius: 15px;
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.tone-option {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 15px;
  cursor: pointer;
  padding: 10px;
  border-radius: 10px;
  transition: background 0.3s;
}

.tone-option:hover {
  background: rgba(255, 255, 255, 0.05);
}

.tone-option input[type="radio"] {
  margin-top: 5px;
  cursor: pointer;
}

.tone-name {
  font-weight: 600;
  min-width: 80px;
}

.tone-desc {
  font-size: 0.85em;
  color: #aaa;
}
```

### Step 2: Update Frontend Logic (30 mins)

**File**: `/home/user/graspit/frontend/app.js`

Replace the `submitQuiz()` function to show tone selector:

```javascript
/**
 * Step 2: Submit quiz answers
 * UPDATED: Show tone selector if passed
 */
async function submitQuiz() {
  if (!currentSessionId || !currentQuiz) {
    showError('No active quiz session');
    return;
  }

  // Collect answers
  const answers = currentQuiz.map((_, index) => {
    return document.getElementById(`answer${index}`).value.trim();
  });

  if (answers.some(a => !a)) {
    showError('Please answer all questions');
    return;
  }

  showLoading(true, '✨ Evaluating answers & humanizing text...');

  try {
    const response = await fetch(`${API_URL}/submit-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, answers })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.code === 'SESSION_EXPIRED') {
        showPersistentError(error.message, 'Start Over');
      } else {
        throw new Error(error.error || 'Quiz submission failed');
      }
      return;
    }

    const data = await response.json();

    if (data.passed) {
      // Show tone selector instead of immediately showing paraphrase
      showToneSelector();
      showStep('step3');
    } else {
      // Show failure feedback
      showQuizFailure(data);
    }

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * NEW: Show tone selector for paraphrase
 */
function showToneSelector() {
  document.getElementById('toneSelector').style.display = 'block';
  document.getElementById('paraphraseResults').innerHTML = '';
}

/**
 * NEW: Get paraphrase with selected tone
 */
async function getParaphraseWithTone() {
  if (!currentSessionId) {
    showError('No active session');
    return;
  }

  const selectedTone = document.querySelector('input[name="tone"]:checked').value;

  showLoading(true, '✨ Generating ' + selectedTone + ' tone paraphrase...');

  try {
    const response = await fetch(`${API_URL}/paraphrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        sessionId: currentSessionId,
        tone: selectedTone  // NEW PARAMETER
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Paraphrase failed');
    }

    const data = await response.json();
    displayParaphrase(data, selectedTone);

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * UPDATED: Display paraphrase with tone indication
 */
function displayParaphrase(data, tone) {
  const container = document.getElementById('paraphraseResults');
  const improvement = Math.round(data.improvement || 0);

  container.innerHTML = `
    <div class="paraphrase-section">
      <h3>Tone: ${tone}</h3>
      <div class="score-display">
        <div class="score-item">
          <label>Original AI Score:</label>
          <span class="score-value">${data.originalScore || 0}%</span>
        </div>
        <div class="score-item">
          <label>New AI Score:</label>
          <span class="score-value">${data.newScore || 0}%</span>
        </div>
        <div class="score-item improvement">
          <label>Improvement:</label>
          <span class="score-value">-${improvement}%</span>
        </div>
      </div>
      
      <div class="paraphrase-comparison">
        <div class="comparison-column">
          <h4>Original</h4>
          <p class="original-text">${escapeHtml(data.original)}</p>
        </div>
        <div class="comparison-column">
          <h4>Humanized (${tone})</h4>
          <p class="humanized-text">${escapeHtml(data.paraphrased)}</p>
        </div>
      </div>

      ${data.zionVerification ? `
        <div class="verification-results">
          <h4>ZION v7.1 Verification</h4>
          <p>Score: ${data.zionVerification.score}/10</p>
          <p>Status: ${data.zionVerification.passed ? 'PASSED' : 'NEEDS REFINEMENT'}</p>
        </div>
      ` : ''}

      <div class="payment-info">
        <h4>Payment Details</h4>
        <p>Amount: RM10</p>
        <p>Contact: @dashaziz_ on Instagram</p>
        <p id="paymentCountdown">Time remaining: 30:00</p>
      </div>
    </div>
  `;

  // Start countdown timer
  startPaymentCountdown();
}
```

### Step 3: Update Backend (1.5 hours)

**File**: `/home/user/graspit/backend/server.js`

Update the `/api/paraphrase` endpoint:

```javascript
/**
 * POST /api/paraphrase
 * Step 3: Get paraphrase with TONE SELECTION (NEW!)
 */
app.post('/api/paraphrase', async (req, res) => {
  try {
    const { sessionId, tone = 'SMART' } = req.body;  // NEW: Accept tone parameter

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session expired or not found',
        message: 'Your session may have expired. Please submit your text again to get a new quiz.',
        code: 'SESSION_EXPIRED'
      });
    }

    if (!session.quizPassed) {
      return res.status(403).json({
        error: 'Quiz not passed. You need to grasp the content first! 📚'
      });
    }

    // Generate paraphrase with TONE PARAMETER (NEW!)
    console.log(`[PARAPHRASE] Using tone: ${tone}`);
    const paraphrased = await paraphraser.paraphrase(session.originalText, { tone });
    const newScore = paraphraser.estimateAIScore(paraphrased);

    res.json({
      original: session.originalText,
      paraphrased: paraphrased,
      tone: tone,  // NEW: Include tone in response
      originalScore: session.originalScore,
      newScore: newScore,
      improvement: session.originalScore - newScore,
      message: `🎉 You grasped it! Here's your ${tone} tone version.`,
      quizScore: session.quizScore
    });

  } catch (error) {
    console.error('Error in /api/paraphrase:', error);
    res.status(500).json({ error: 'Paraphrase failed' });
  }
});
```

### Step 4: Update Paraphraser (1.5 hours)

**File**: `/home/user/graspit/backend/gemini-paraphraser.js`

Update the `paraphrase()` method:

```javascript
/**
 * Paraphrase text using Gemini with TONE SELECTION
 */
async paraphrase(text, options = {}) {
  const tone = options.tone || 'SMART';
  
  console.log(`[PARAPHRASER] Starting paraphrase with ${tone} tone...`);
  
  // Create tone-specific system instruction
  const toneInstruction = this.getToneInstruction(tone);
  const fullSystemPrompt = this.systemInstruction + '\n\n' + toneInstruction;
  
  try {
    console.log('[PARAPHRASER] Calling Gemini API...');
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${fullSystemPrompt}\n\nHumanize this text in ${tone} tone:\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log('[PARAPHRASER] Got response from Gemini');

    const candidate = data.candidates[0];
    const paraphrased = candidate.content.parts[0].text.trim();
    const finishReason = candidate.finishReason;

    console.log('[PARAPHRASER] Paraphrase complete');
    console.log('[PARAPHRASER] Length:', paraphrased.length);
    console.log('[PARAPHRASER] Finish reason:', finishReason);

    if (finishReason === 'MAX_TOKENS') {
      console.warn('[PARAPHRASER] WARNING: Response truncated due to MAX_TOKENS');
    }

    return paraphrased;

  } catch (error) {
    console.error('Error paraphrasing with LLM:', error);
    return this.fallbackParaphrase(text);
  }
}

/**
 * NEW: Get tone-specific instructions
 */
getToneInstruction(tone) {
  const toneInstructions = {
    SMART: `
15. TONE: SMART (Analytical Authority)
    Grade Range: B+ to A-
    
    Use strategic management vocabulary:
    - "strategic paradox", "operational tension"
    - "market position", "competitive dynamics"
    - "value proposition", "capability gap"
    
    Characteristics:
    - Confident analytical voice
    - Industry terminology used precisely
    - Process markers present but subtle
    - Data embedded in strategic interpretation
    
    Example: "The strategic paradox is hard to miss. TM controls the infrastructure everyone else rents, yet struggles to monetise that advantage in consumer markets."
    
16. ADD PROCESS MARKERS (2-3 per 500 words):
    Inject naturally at logical paragraph breaks:
    - "took us longer than expected to find"
    - "we went back and forth on this"
    - "initially thought X but data showed Y"
    - "the tricky part was figuring out"
    - "what finally made sense was"
    - "after looking at this three different ways"
    
    Do NOT make them sound forced. Mix them throughout naturally.
    `,
    
    ELITE: `
15. TONE: ELITE (Distinction-Level Sophistication)
    Grade Range: A to A+
    
    Use McKinsey-style sophisticated vocabulary:
    - "structural impediment", "asymmetric advantage"
    - "value migration", "capability arbitrage"
    - "strategic inflection", "competitive moat"
    
    Characteristics:
    - Sophisticated vocabulary (but never AI-flagged)
    - Nuanced analysis showing deep understanding
    - Subtle process markers integrated seamlessly
    - Data woven into strategic narrative
    
    Hedging (elevated but natural):
    - "likely", "appears to", "suggests"
    - "the evidence points toward"
    - "reasonable to conclude"
    
    Example: "TM occupies an enviable yet precarious position. The infrastructure moat—570,000 kilometres of fibre that competitors cannot replicate within any reasonable timeframe—provides structural advantage."
    
16. ADD PROCESS MARKERS (2-3 per 500 words):
    Integrate subtly into narrative:
    - "the analysis reveals"
    - "upon further examination"
    - "this deeper investigation shows"
    - "the evidence suggests"
    - "when examined closely"
    
    These should feel like natural analytical insights, not meta-commentary.
    `
  };
  
  return toneInstructions[tone] || toneInstructions.SMART;
}
```

### Step 5: Testing (1 hour)

```bash
# 1. Start the server
cd /home/user/graspit/backend
npm start

# 2. Open browser and test
# Visit: http://localhost:3100
# Paste test text
# Take quiz
# Should see tone selector after passing

# 3. Test both tones
# Select SMART tone
# Click "Get Paraphrase"
# Check output has strategic terminology

# Select ELITE tone
# Click "Get Paraphrase"
# Check output has McKinsey-style sophistication

# 4. Compare AI detection scores
# ELITE should have slightly lower scores
```

### Step 6: Commit (5 mins)

```bash
git add frontend/index.html frontend/app.js frontend/style.css
git add backend/server.js backend/gemini-paraphraser.js
git commit -m "FEATURE: Add ZION v7.1 tone selector (SMART/ELITE)

- Add tone selector UI (radio buttons)
- SMART tone: Strategic analytical authority (B+ to A-)
- ELITE tone: McKinsey-style sophistication (A to A+)
- Process markers injected based on tone
- Backend routes tone selection to paraphraser
- Tone selection passed in API responses"
```

---

## PHASE 2: SEE FRAMEWORK + DATA EMBEDDING (8 Hours)

### Create New File: zion-framework.js

**File**: `/home/user/graspit/backend/zion-framework.js`

```javascript
/**
 * ZION Framework Implementation
 * Applies SEE Framework and data embedding rules
 * 
 * SEE = Statement (interpretation) → Explanation (why) → Example/Implication
 */

class ZIONFramework {
  constructor() {
    // Pattern to detect sentences with data/numbers
    this.dataPattern = /\d+[.,]\d*[%MBK]?|\$\d+[BM]?|RM\d+|£\d+|€\d+/;
    
    // Process markers for different tones
    this.smartMarkers = [
      "took us longer than expected to find",
      "we went back and forth on this",
      "initially thought X but data showed Y",
      "the tricky part was figuring out",
      "what finally made sense was",
      "after looking at this three different ways"
    ];
    
    this.eliteMarkers = [
      "the analysis reveals",
      "upon further examination",
      "this deeper investigation shows",
      "the evidence suggests",
      "when examined closely",
      "the research indicates"
    ];
  }

  /**
   * Apply SEE Framework to data-heavy paragraphs
   * Returns text with improved data presentation
   */
  applySEEFramework(text, tone = 'SMART') {
    const paragraphs = text.split('\n\n');
    
    const improved = paragraphs.map(para => {
      // Check if paragraph has numerical data
      const hasData = this.dataPattern.test(para);
      
      if (hasData) {
        return this.restructureWithSEE(para, tone);
      }
      
      return para;
    });
    
    return improved.join('\n\n');
  }

  /**
   * Restructure paragraph using SEE Framework
   * S: Statement (interpretation)
   * E: Explanation (why it matters)
   * E: Example/Implication (what it means)
   */
  restructureWithSEE(paragraph, tone) {
    // Extract sentences
    const sentences = paragraph.split(/[.!?]+/).filter(s => s.trim());
    
    // Find sentences with data
    const dataSentences = sentences.filter(s => this.dataPattern.test(s));
    const nonDataSentences = sentences.filter(s => !this.dataPattern.test(s));
    
    if (dataSentences.length === 0) {
      return paragraph; // No data to restructure
    }

    // Reorder: Interpretation FIRST, then data
    let result = [];
    
    // Add interpretation/statement
    if (nonDataSentences.length > 0) {
      result.push(nonDataSentences[0]);
    }
    
    // Add data as noun phrases with casual referbacks
    const dataPhrase = this.formatDataAsNounPhrases(dataSentences);
    result.push(dataPhrase);
    
    // Add explanation
    if (nonDataSentences.length > 1) {
      result.push(nonDataSentences.slice(1).join('. '));
    }
    
    return result.join('. ');
  }

  /**
   * Format data as noun phrases (not subject-verb-data template)
   * Example: "RM11.71 billion revenue, RM2.02 billion profit"
   * Instead of: "Revenue was RM11.71 billion"
   */
  formatDataAsNounPhrases(dataSentences) {
    const dataPoints = [];
    
    dataSentences.forEach(sentence => {
      // Extract number patterns
      const matches = sentence.match(/(\d+[.,]\d*\s*[A-Z%]?|\$\d+[BM]?)/g);
      const words = sentence.match(/[\w]+\s*(?=\d+|currency)/gi);
      
      if (matches && matches.length > 0) {
        matches.forEach((match, i) => {
          const label = words?.[i] || 'figure';
          dataPoints.push(`${match} ${label.trim()}`.toLowerCase());
        });
      }
    });
    
    // Combine with casual referbacks
    if (dataPoints.length === 0) return dataSentences.join('. ');
    
    if (dataPoints.length === 1) {
      return `that ${dataPoints[0]}`;
    }
    
    if (dataPoints.length === 2) {
      return `${dataPoints[0]}, that other ${dataPoints[1]}`;
    }
    
    // 3+ data points
    return `${dataPoints.slice(0, -1).join(', ')}, and then ${dataPoints[dataPoints.length - 1]}`;
  }

  /**
   * Inject process markers at strategic points
   * 2-3 per 500 words
   */
  injectProcessMarkers(text, tone = 'SMART') {
    const markers = tone === 'ELITE' ? this.eliteMarkers : this.smartMarkers;
    const wordCount = text.split(/\s+/).length;
    const targetMarkerCount = Math.ceil(wordCount / 300); // 2-3 per 500 words
    
    const paragraphs = text.split('\n\n');
    const markerPositions = [];
    
    // Find good insertion points (start of paragraphs, after major ideas)
    for (let i = 1; i < paragraphs.length && markerPositions.length < targetMarkerCount; i++) {
      markerPositions.push(i);
    }
    
    // Insert markers
    let result = [...paragraphs];
    let offset = 0;
    
    markerPositions.forEach(pos => {
      const marker = markers[Math.floor(Math.random() * markers.length)];
      const adjustedPos = pos + offset;
      
      // Insert marker at paragraph start
      const firstSentence = result[adjustedPos];
      const sentences = firstSentence.split(/[.!?]+/);
      
      // Add marker after first sentence
      result[adjustedPos] = sentences[0] + '. ' + marker + '. ' + 
                           sentences.slice(1).join('. ');
      
      offset++;
    });
    
    return result.join('\n\n');
  }

  /**
   * Enable paragraph bleeding
   * Let thoughts spill across paragraph breaks
   */
  enableParagraphBleeding(text) {
    const paragraphs = text.split('\n\n');
    
    // Randomly move sentence starts between paragraphs
    for (let i = 1; i < paragraphs.length; i++) {
      const sentences = paragraphs[i].split(/[.!?]+/);
      
      // Sometimes end previous paragraph mid-thought
      if (Math.random() < 0.3 && sentences.length > 1) {
        const lastSentenceOfPrev = paragraphs[i-1].split(/[.!?]+/);
        
        // Move first sentence of current to end of previous
        lastSentenceOfPrev.push(sentences[0]);
        paragraphs[i-1] = lastSentenceOfPrev.join('. ');
        
        paragraphs[i] = sentences.slice(1).join('. ');
      }
    }
    
    return paragraphs.join('\n\n');
  }
}

module.exports = ZIONFramework;
```

### Update server.js to use framework

```javascript
// Add near top of server.js
const ZIONFramework = require('./zion-framework');
const zionFramework = new ZIONFramework();

// Update /api/paraphrase endpoint
app.post('/api/paraphrase', async (req, res) => {
  try {
    const { sessionId, tone = 'SMART' } = req.body;
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session expired' });
    }

    if (!session.quizPassed) {
      return res.status(403).json({ error: 'Quiz not passed' });
    }

    // NEW: Apply ZION Framework before paraphrasing
    let improvedText = session.originalText;
    if (tone === 'ELITE') {
      improvedText = zionFramework.applySEEFramework(improvedText, tone);
      improvedText = zionFramework.injectProcessMarkers(improvedText, tone);
      improvedText = zionFramework.enableParagraphBleeding(improvedText);
    }

    // Paraphrase with framework-improved text
    const paraphrased = await paraphraser.paraphrase(improvedText, { tone });
    const newScore = paraphraser.estimateAIScore(paraphrased);

    res.json({
      paraphrased: paraphrased,
      tone: tone,
      originalScore: session.originalScore,
      newScore: newScore,
      improvement: session.originalScore - newScore,
      message: `Successfully paraphrased in ${tone} tone`
    });

  } catch (error) {
    console.error('Error in /api/paraphrase:', error);
    res.status(500).json({ error: 'Paraphrase failed' });
  }
});
```

---

## PHASE 3: VERIFICATION CHECKLIST (6 Hours)

### Create zion-verifier.js

**File**: `/home/user/graspit/backend/zion-verifier.js`

```javascript
/**
 * ZION v7.1 Verification Checklist
 * Validates output against ZION standards
 */

class ZIONVerifier {
  constructor() {
    this.bannedTerms = [
      'approximately', 'significantly', 'demonstrates', 'utilizes',
      'facilitates', 'subsequently', 'nevertheless', 'furthermore'
    ];
  }

  /**
   * Run full verification checklist
   */
  verify(text, tone = 'SMART') {
    const checks = {
      emDashCheck: this.checkEmDashes(text),
      processMarkersCheck: this.checkProcessMarkers(text),
      vocabulary Check: this.checkVocabulary(text),
      sentenceStructureCheck: this.checkSentenceStructure(text),
      passiveVoiceCheck: this.checkPassiveVoice(text),
      dataEmbeddingCheck: this.checkDataEmbedding(text)
    };
    
    const score = this.calculateScore(checks);
    const passed = score >= 7; // 7+ out of 10 to pass
    
    return {
      score: score,
      passed: passed,
      checks: checks,
      suggestions: this.generateSuggestions(checks)
    };
  }

  checkEmDashes(text) {
    const count = (text.match(/—/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    const allowedCount = Math.ceil(wordCount / 400);
    
    return {
      actual: count,
      allowed: allowedCount,
      passed: count <= allowedCount,
      penalty: Math.max(0, count - allowedCount) * 15
    };
  }

  checkProcessMarkers(text) {
    const markers = [
      'took us longer', 'we went back', 'initially thought',
      'the tricky part', 'what finally', 'after looking'
    ];
    
    let count = 0;
    markers.forEach(marker => {
      if (text.toLowerCase().includes(marker)) count++;
    });
    
    const wordCount = text.split(/\s+/).length;
    const expectedCount = Math.ceil(wordCount / 300);
    
    return {
      actual: count,
      expected: Math.max(2, expectedCount),
      passed: count >= Math.max(2, expectedCount - 1),
      penalty: count === 0 ? 20 : 0
    };
  }

  checkVocabulary(text) {
    let violations = 0;
    this.bannedTerms.forEach(term => {
      if (text.toLowerCase().includes(term)) violations++;
    });
    
    return {
      violations: violations,
      passed: violations === 0,
      penalty: violations * 10
    };
  }

  checkSentenceStructure(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    const lengths = sentences.map(s => s.split(/\s+/).length);
    
    // Check for variety
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / lengths.length;
    
    // Good variance is 20+
    const hasVariety = variance > 20;
    
    return {
      averageLength: Math.round(avgLength),
      variance: Math.round(variance),
      passed: hasVariety,
      penalty: hasVariety ? 0 : 15
    };
  }

  checkPassiveVoice(text) {
    // Rough detection: "was", "were", "is", "are" + past participle
    const passivePattern = /\b(was|were|is|are)\s+\w+(?:ed|en)\b/gi;
    const count = (text.match(passivePattern) || []).length;
    const wordCount = text.split(/\s+/).length;
    const ratio = count / wordCount;
    
    // Should be less than 10% passive
    return {
      count: count,
      ratio: (ratio * 100).toFixed(1),
      passed: ratio < 0.1,
      penalty: ratio > 0.15 ? 20 : 0
    };
  }

  checkDataEmbedding(text) {
    // Check if data is presented as noun phrases
    // Pattern: "number + unit" appearing in text
    const dataPattern = /\d+[.,]?\d*\s*[%MBK$£€]?[a-z]+\s+[a-z]+/gi;
    const nounPhrases = text.match(dataPattern) || [];
    
    // Check for "was X" patterns (bad data embedding)
    const badPatterns = /was\s+\d+[.,]?\d*|revenue\s+was|profit\s+was/gi;
    const badCount = (text.match(badPatterns) || []).length;
    
    return {
      goodPhrases: nounPhrases.length,
      badPatterns: badCount,
      passed: badCount === 0,
      penalty: badCount * 15
    };
  }

  calculateScore(checks) {
    // Start at 10
    let score = 10;
    
    // Subtract penalties
    Object.values(checks).forEach(check => {
      if (check.penalty) score -= check.penalty / 10;
    });
    
    return Math.max(0, Math.min(10, score));
  }

  generateSuggestions(checks) {
    const suggestions = [];
    
    if (!checks.emDashCheck.passed) {
      suggestions.push(`Reduce em-dashes: ${checks.emDashCheck.actual} found, ${checks.emDashCheck.allowed} allowed`);
    }
    
    if (!checks.processMarkersCheck.passed) {
      suggestions.push(`Add process markers: found ${checks.processMarkersCheck.actual}, need ${checks.processMarkersCheck.expected}`);
    }
    
    if (checks.vocabularyCheck.violations > 0) {
      suggestions.push(`Replace formal terms: ${checks.vocabularyCheck.violations} banned words found`);
    }
    
    if (!checks.sentenceStructureCheck.passed) {
      suggestions.push('Vary sentence lengths more (current variance is low)');
    }
    
    if (!checks.passiveVoiceCheck.passed) {
      suggestions.push(`Reduce passive voice: ${checks.passiveVoiceCheck.count} instances (${checks.passiveVoiceCheck.ratio}%)`);
    }
    
    if (!checks.dataEmbeddingCheck.passed) {
      suggestions.push(`Fix data presentation: ${checks.dataEmbeddingCheck.badPatterns} bad patterns found`);
    }
    
    return suggestions;
  }
}

module.exports = ZIONVerifier;
```

---

## Testing & Validation

```bash
# Test Phase 1
curl -X POST http://localhost:3100/api/paraphrase \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "your_session_id",
    "tone": "SMART"
  }'

# Should see "SMART" tone in output

# Test Phase 2
# Text with financial data should show:
# - SEE Framework applied
# - Process markers injected
# - Data as noun phrases

# Test Phase 3
# Paraphrase should return verification score
# Score >= 7/10 = PASSED
```

---

## Summary

This practical guide gives you:
1. Copy-paste code for Phase 1 (tone selector)
2. Framework implementations for Phase 2 (SEE Framework)
3. Verification system for Phase 3 (checklist enforcement)

Each phase builds on the previous one. Start with Phase 1 for quick wins!
