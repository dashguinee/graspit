/**
 * Graspit Backend Server
 *
 * Connects paraphrase engine + quiz generator
 * Flow: Submit text → Get quiz → Pass quiz → Get paraphrase
 */

const express = require('express');
const cors = require('cors');
const ParaphraseEngine = require('./paraphrase-engine');
const QuizGenerator = require('./quiz-generator');

const app = express();
const PORT = 3100;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Initialize engines
const paraphraser = new ParaphraseEngine();
const quizGen = new QuizGenerator();

// Store sessions temporarily (would use DB in production)
const sessions = new Map();

/**
 * POST /api/analyze
 * Step 1: Submit text, get quiz
 */
app.post('/api/analyze', (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({
        error: 'Text too short. Need at least 50 characters to analyze.'
      });
    }

    // Generate quiz
    const quiz = quizGen.generateQuiz(text);

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
    res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/submit-quiz
 * Step 2: Submit quiz answers, get results
 */
app.post('/api/submit-quiz', (req, res) => {
  try {
    const { sessionId, answers } = req.body;

    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Evaluate answers
    const evaluation = quizGen.evaluateAnswers(session.quiz.questions, answers);

    // Update session
    session.quizPassed = evaluation.passed;
    session.quizScore = evaluation.score;
    sessions.set(sessionId, session);

    res.json({
      ...evaluation,
      canGetParaphrase: evaluation.passed
    });

  } catch (error) {
    console.error('Error in /api/submit-quiz:', error);
    res.status(500).json({ error: 'Quiz submission failed' });
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
