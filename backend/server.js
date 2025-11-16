/**
 * Graspit Backend Server
 *
 * LLM-POWERED with DeepSeek API
 * Flow: Submit text → Get quiz → Pass quiz → Get paraphrase
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const LLMParaphraser = require('./llm-paraphraser');
const LLMQuizGenerator = require('./llm-quiz-generator');

const app = express();
const PORT = 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Initialize LLM engines with DeepSeek API
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'sk-99b64a1c8d5a4b229335f315f28a50b1';
const paraphraser = new LLMParaphraser(DEEPSEEK_API_KEY);
const quizGen = new LLMQuizGenerator(DEEPSEEK_API_KEY);

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
      return res.status(404).json({ error: 'Session not found' });
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
      return res.status(404).json({ error: 'Session not found' });
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
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Graspit API',
    version: '0.1.0',
    activeSessions: sessions.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║          🎓 GRASPIT API 🎓            ║
║                                       ║
║  Server running on port ${PORT}        ║
║  http://localhost:${PORT}              ║
║                                       ║
║  Endpoints:                           ║
║  POST /api/analyze                    ║
║  POST /api/submit-quiz                ║
║  POST /api/paraphrase                 ║
║  GET  /api/health                     ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

// Cleanup old sessions every 30 minutes
setInterval(() => {
  const now = Date.now();
  const thirtyMinutes = 30 * 60 * 1000;

  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.timestamp.getTime() > thirtyMinutes) {
      sessions.delete(sessionId);
    }
  }
}, 30 * 60 * 1000);

module.exports = app;
