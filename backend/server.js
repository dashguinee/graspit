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
    const { text } = req.body;

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
      timestamp: new Date()
    });

    res.json({
      sessionId: sessionId,
      quiz: quiz.questions,
      passScore: quiz.passScore,
      originalAIScore: originalScore,
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
    const { sessionId, answers } = req.body;

    const session = sessions.get(sessionId);
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

      // Generate paraphrase using LLM with ZION's knowledge
      const paraphrased = await paraphraser.paraphrase(session.originalText);
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
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║          🎓 GRASPIT API v0.2.0 🎓          ║
║         With Assignment Helper Mode        ║
║                                            ║
║  Server running on port ${PORT}              ║
║  http://localhost:${PORT}                    ║
║                                            ║
║  Core Endpoints:                           ║
║  POST /api/analyze                         ║
║  POST /api/submit-quiz                     ║
║  POST /api/paraphrase                      ║
║                                            ║
║  Assignment Helper (NEW!):                 ║
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
