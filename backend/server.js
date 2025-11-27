/**
 * Graspit Backend Server
 *
 * LLM-POWERED with DeepSeek API
 * Flow: Submit text → Get quiz → Pass quiz → Get paraphrase
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const MultiLLMParaphraser = require('./multi-llm-paraphraser');
const GeminiQuizGenerator = require('./gemini-quiz-generator');
const { AssignmentHelper, PRICING } = require('./assignment-helper');

const app = express();
const PORT = 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Initialize LLM engines - MULTI-LLM system for bulletproof paraphrasing!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}
const paraphraser = new MultiLLMParaphraser(GEMINI_API_KEY, DEEPSEEK_API_KEY);
const quizGen = new GeminiQuizGenerator(GEMINI_API_KEY);
const assignmentHelper = new AssignmentHelper(GEMINI_API_KEY);

// Store sessions temporarily (would use DB in production)
const sessions = new Map();

/**
 * POST /api/analyze
 * Step 1: Submit text, get LLM-generated quiz
 */
app.post('/api/analyze', async (req, res) => {
  try {
    const { text, tone } = req.body;

    // Valid tones: 'smart', 'elite', 'apex' (default), 'apex-academic'
    const validTones = ['smart', 'elite', 'apex', 'apex-academic'];
    const selectedTone = validTones.includes(tone) ? tone : 'apex';

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Text too short. Need at least 50 characters to analyze.'
      });
    }

    // Generate quiz using LLM
    const quiz = await quizGen.generateQuiz(text);

    // Estimate AI score before paraphrase
    const originalScore = paraphraser.estimateAIScore(text);

    // Create session
    const sessionId = Date.now().toString();
    sessions.set(sessionId, {
      originalText: text,
      quiz: quiz,
      originalScore: originalScore,
      tone: selectedTone,  // Store tone for use in paraphrasing
      timestamp: new Date()
    });

    console.log(`[SESSION] Created ${sessionId} with tone: ${selectedTone}`);

    res.json({
      sessionId: sessionId,
      quiz: quiz.questions,
      passScore: quiz.passScore,
      originalAIScore: originalScore,
      tone: selectedTone,
      message: 'Complete the quiz to unlock your paraphrase! 📚'
    });

  } catch (error) {
    console.error('Error in /api/analyze:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

/**
 * POST /api/submit-quiz
 * Step 2: Submit quiz answers, get LLM evaluation + flash summary + paraphrase if passed
 */
app.post('/api/submit-quiz', async (req, res) => {
  try {
    const { sessionId, answers, backup } = req.body;

    let session = sessions.get(sessionId);

    // If session not found, try to recover from backup
    if (!session && backup) {
      console.log('Session not found, recovering from client backup...');
      // Handle quiz structure - ensure it has questions property
      const quizData = backup.quiz.questions ? backup.quiz : { questions: backup.quiz };
      session = {
        originalText: backup.originalText,
        quiz: quizData,
        originalScore: backup.originalScore
      };
      // Store recovered session
      sessions.set(sessionId, session);
    }

    if (!session) {
      return res.status(404).json({
        error: 'Session expired or not found',
        message: 'Your session may have expired. Please submit your text again to get a new quiz.',
        code: 'SESSION_EXPIRED'
      });
    }

    // Evaluate answers using LLM
    const evaluation = await quizGen.evaluateAnswers(session.quiz.questions, answers);

    // Update session
    session.quizPassed = evaluation.passed;
    session.quizScore = evaluation.score;

    if (evaluation.passed) {
      // Generate flash summary using LLM
      const flashSummary = await quizGen.generateFlashSummary(session.originalText);

      // Generate paraphrase using LLM with APEX V9 / ZION
      const tone = session.tone || 'apex';
      console.log(`[PARAPHRASE] Using tone: ${tone}`);
      const paraphrased = await paraphraser.paraphrase(session.originalText, tone);
      const newScore = paraphraser.estimateAIScore(paraphrased);

      // Store in session
      session.paraphrased = paraphrased;
      session.newScore = newScore;
      session.flashSummary = flashSummary;
      session.paymentDeadline = Date.now() + (30 * 60 * 1000); // 30 minutes from now

      sessions.set(sessionId, session);

      // Return everything!
      res.json({
        ...evaluation,
        flashSummary: flashSummary,
        paraphrase: {
          original: session.originalText,
          humanized: paraphrased,
          originalScore: session.originalScore,
          newScore: newScore,
          improvement: session.originalScore - newScore
        },
        payment: {
          deadline: session.paymentDeadline,
          timeRemaining: 30 * 60, // 30 minutes in seconds
          amount: 'RM10',
          instagram: '@dashaziz_',
          message: '🎉 You got it! Now pay RM10 within 30 minutes'
        }
      });
    } else {
      // Quiz failed - no paraphrase
      sessions.set(sessionId, session);

      res.json({
        ...evaluation,
        canRetry: true
      });
    }

  } catch (error) {
    console.error('Error in /api/submit-quiz:', error);
    res.status(500).json({ error: 'Quiz submission failed: ' + error.message });
  }
});

/**
 * POST /api/paraphrase
 * Step 3: Get paraphrase (only if quiz passed)
 */
app.post('/api/paraphrase', (req, res) => {
  try {
    const { sessionId } = req.body;

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

    // Paraphrase the text
    const paraphrased = paraphraser.paraphrase(session.originalText);
    const newScore = paraphraser.estimateAIScore(paraphrased);

    res.json({
      original: session.originalText,
      paraphrased: paraphrased,
      originalScore: session.originalScore,
      newScore: newScore,
      improvement: session.originalScore - newScore,
      message: '🎉 You grasped it! Here\'s your human-like version.',
      quizScore: session.quizScore
    });

  } catch (error) {
    console.error('Error in /api/paraphrase:', error);
    res.status(500).json({ error: 'Paraphrase failed' });
  }
});

/**
 * ========================================
 * ASSIGNMENT HELPER ENDPOINTS (NEW!)
 * ========================================
 */

/**
 * POST /api/assignment/start
 * Start new assignment session (Premium or Quick tier)
 */
app.post('/api/assignment/start', async (req, res) => {
  try {
    const { assignment, tier, context } = req.body;

    if (!assignment || assignment.trim().length < 20) {
      return res.status(400).json({
        error: 'Assignment too short. Need at least 20 characters.'
      });
    }

    if (!['premium', 'quick'].includes(tier)) {
      return res.status(400).json({
        error: 'Invalid tier. Must be "premium" or "quick"'
      });
    }

    const result = await assignmentHelper.startSession(assignment, tier, context);

    res.json(result);
  } catch (error) {
    console.error('[ASSIGNMENT START] Error:', error.message);
    res.status(500).json({
      error: 'Failed to start assignment session',
      details: error.message
    });
  }
});

/**
 * POST /api/assignment/dialogue
 * Continue ZION dialogue (Premium tier only)
 */
app.post('/api/assignment/dialogue', async (req, res) => {
  try {
    const { sessionId, response: studentResponse } = req.body;

    if (!sessionId || !studentResponse) {
      return res.status(400).json({
        error: 'Missing sessionId or response'
      });
    }

    const result = await assignmentHelper.continueDialogue(sessionId, studentResponse);

    res.json(result);
  } catch (error) {
    console.error('[ASSIGNMENT DIALOGUE] Error:', error.message);
    res.status(500).json({
      error: 'Failed to continue dialogue',
      details: error.message
    });
  }
});

/**
 * GET /api/assignment/progress/:sessionId
 * Get session progress and readiness
 */
app.get('/api/assignment/progress/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = assignmentHelper.getProgress(sessionId);

    res.json(result);
  } catch (error) {
    console.error('[ASSIGNMENT PROGRESS] Error:', error.message);
    res.status(500).json({
      error: 'Failed to get progress',
      details: error.message
    });
  }
});

/**
 * POST /api/assignment/generate-quiz
 * Generate quiz based on learning session
 */
app.post('/api/assignment/generate-quiz', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing sessionId'
      });
    }

    const result = await assignmentHelper.generateSessionQuiz(sessionId);

    res.json(result);
  } catch (error) {
    console.error('[ASSIGNMENT QUIZ] Error:', error.message);
    res.status(500).json({
      error: 'Failed to generate quiz',
      details: error.message
    });
  }
});

/**
 * GET /api/assignment/pricing
 * Get pricing information for both tiers
 */
app.get('/api/assignment/pricing', (req, res) => {
  res.json({
    success: true,
    pricing: PRICING
  });
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Graspit API',
    version: '0.2.0',  // Updated version for Assignment Helper
    activeSessions: sessions.size,
    assignmentSessions: assignmentHelper.getStats()
  });
});

// Start server
/**
 * POST /api/detect
 * Comprehensive LLM-based AI detection using ZION patterns + AI behavior analysis
 */
app.post('/api/detect', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Text too short. Need at least 50 characters to analyze.'
      });
    }

    const detectionPrompt = `You are an expert AI detection system. Analyze this text thoroughly for AI-generated patterns AND missing human signals.

## PART 1: AI PATTERNS TO DETECT (What AI Does)

### Structure Patterns
- **Em-dash Overuse**: More than 1 per 400 words, sandwich patterns (word—explanation—word)
- **Template Openers**: "X faces a classic problem", "has to figure out how to", "Looking at X helps understand"
- **Template Transitions**: "gets more complicated when you consider", "upon closer examination"
- **Template Conclusions**: "will likely determine", "remains to be seen", "only time will tell"
- **Parallel Stacking**: Multiple data points in one sentence "X was [number] with Y at [number]"

### Data Presentation
- **Generation Templates**: "X generated/made/brought in Y", "The sector produced Z"
- **Subject-Verb-Number**: "Revenue was X", "They made Y billion", "Sales reached Z"
- **Back-to-back Data**: Consecutive sentences with numbers, no interpretation between

### Vocabulary Markers
- **Formal Hedging**: approximately, significantly, consequently, furthermore, nevertheless, notwithstanding
- **Corporate Speak**: "vision is to help build X by using Y to empower Z", "aims to achieve", "focuses on delivering"
- **AI Signature Phrases**: "this demonstrates", "it is worth noting", "in conclusion", "to summarize", "it should be noted"

### Statistical Patterns
- **Sentence Uniformity**: All sentences similar length (standard deviation < 5 words)
- **Predictable Rhythm**: Same structure repeated (Subject-Verb-Object consistently)
- **Low Burstiness**: No variation between simple and complex sentences

## PART 2: HUMAN SIGNALS TO CHECK (What's Missing)

### Process Markers (Unfakeable Human Signals)
- "took us a while to figure out", "we went back and forth"
- "initially thought X but", "the tricky part was"
- "after looking at this three times", "what finally made sense"
- "candidly", "honestly", "frankly"

### Reaction Language
- "which sounds impressive until you see"
- "that number stops you", "hard to ignore"
- "raises an obvious question"

### Controlled Imperfection
- Self-corrections: "Actually, let me reframe that"
- Interrupted thoughts, natural run-ons
- Contractions: it's, don't, that's, we're

### Knowledge Gaps
- Acknowledging limits: "exact figures not disclosed"
- Uncertainty: "probably", "maybe", "not entirely clear"

## SCORING METHODOLOGY

Calculate two scores:
1. **AI Probability** (0-100): How likely this was AI-generated
2. **Human Probability** (0-100): How likely this was human-written

These should roughly sum to 100 but can overlap for ambiguous text.

Consider:
- High severity patterns = +15-20 points to AI score
- Medium severity = +8-12 points
- Low severity = +3-5 points
- Missing human signals = +5-10 points to AI score
- Present human signals = +10-15 points to human score

## OUTPUT FORMAT (JSON only, no markdown)

{
  "aiScore": <0-100>,
  "humanScore": <0-100>,
  "verdict": "<Likely AI | Possibly AI | Mixed Signals | Likely Human>",
  "confidence": "<high|medium|low>",
  "summary": "<1-2 sentence overall assessment>",
  "flags": [
    {
      "name": "<pattern name>",
      "category": "<ai_pattern|missing_human_signal>",
      "severity": "<high|medium|low>",
      "excerpt": "<exact quote from text, max 100 chars>",
      "suggestion": "<specific actionable fix>",
      "priority": <1-5, 1 being highest priority to fix>
    }
  ],
  "positives": [
    {
      "name": "<human signal found>",
      "excerpt": "<quote showing the signal>"
    }
  ],
  "quickWins": ["<top 3 fastest fixes that will improve score>"]
}

## TEXT TO ANALYZE:

${text}

Analyze thoroughly. Return ONLY valid JSON.`;

    // Use Gemini for detection
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: detectionPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4000
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API call failed');
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    let result;
    try {
      // Clean up response - remove markdown code blocks if present
      const cleanJson = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanJson);

      // Ensure backward compatibility - map to old format if needed
      if (result.aiScore !== undefined && result.score === undefined) {
        result.score = result.aiScore;
      }
    } catch (e) {
      console.error('Failed to parse detection result:', resultText);
      result = {
        score: 50,
        aiScore: 50,
        humanScore: 50,
        verdict: 'Analysis Error',
        confidence: 'low',
        summary: 'Could not complete analysis',
        flags: [{ name: 'Parse Error', severity: 'high', excerpt: 'Could not parse LLM response', suggestion: 'Try again', priority: 1 }],
        positives: [],
        quickWins: ['Try again with the text']
      };
    }

    res.json(result);

  } catch (error) {
    console.error('Error in /api/detect:', error);
    res.status(500).json({ error: 'Detection failed: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║          🎓 GRASPIT API v0.3.0 🎓          ║
║      With LLM Detection + Assignment       ║
║                                            ║
║  Server running on port ${PORT}              ║
║  http://localhost:${PORT}                    ║
║                                            ║
║  Core Endpoints:                           ║
║  POST /api/analyze                         ║
║  POST /api/submit-quiz                     ║
║  POST /api/paraphrase                      ║
║  POST /api/detect (NEW!)                   ║
║                                            ║
║  Assignment Helper:                        ║
║  POST /api/assignment/start                ║
║  POST /api/assignment/dialogue             ║
║  POST /api/assignment/generate-quiz        ║
║  GET  /api/assignment/progress/:id         ║
║  GET  /api/assignment/pricing              ║
║                                            ║
║  System:                                   ║
║  GET  /api/health                          ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  // Clean up core sessions
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.timestamp.getTime() > thirtyMinutes) {
      sessions.delete(sessionId);
    }
  }

  // Clean up assignment helper sessions
  assignmentHelper.cleanup();
}, 30 * 60 * 1000);

module.exports = app;
