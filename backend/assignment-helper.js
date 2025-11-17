/**
 * Assignment Helper - Two-Tier System
 *
 * PREMIUM (RM25): 30-min ZION learning → quiz → humanize
 * QUICK (RM10): Upload → quiz → humanize
 */

const ZIONTeacher = require('./zion-teacher');
const { generateQuiz } = require('./gemini-quiz-generator');

// Session storage
const assignmentSessions = new Map();

// Pricing tiers
const PRICING = {
  PREMIUM: {
    price: 25,  // RM
    currency: 'MYR',
    features: ['30-min ZION learning', 'Auto-generated quiz', 'Humanization']
  },
  QUICK: {
    price: 10,  // RM
    currency: 'MYR',
    features: ['Quiz verification', 'Humanization']
  }
};

class AssignmentSession {
  constructor(assignment, tier, context = '') {
    this.id = this.generateId();
    this.assignment = assignment;
    this.tier = tier;  // 'premium' or 'quick'
    this.context = context;
    this.conversation = [];
    this.progress = 0;
    this.startedAt = Date.now();
    this.paid = false;
    this.quiz = null;
    this.quizPassed = false;
  }

  generateId() {
    return `asn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addMessage(speaker, message) {
    this.conversation.push({
      speaker,
      message,
      timestamp: Date.now()
    });
  }

  updateProgress(progress) {
    this.progress = progress;
  }

  isReadyForQuiz() {
    if (this.tier === 'quick') return this.conversation.length > 0;
    return this.progress >= 85;  // Premium: must complete learning
  }

  getSessionDuration() {
    return Math.floor((Date.now() - this.startedAt) / 1000 / 60);  // minutes
  }

  getPricing() {
    return PRICING[this.tier.toUpperCase()];
  }
}

// Security: Detect malicious or out-of-scope requests
const SECURITY_PATTERNS = {
  system_info: /system|server|database|api\s+key|password|credential|token|secret/i,
  file_paths: /\/home|\/etc|\/var|\.env|\.json|\.config/i,
  code_injection: /<script|javascript:|eval\(|exec\(|system\(/i,
  jailbreak: /ignore\s+previous|forget\s+instructions|you\s+are\s+now|disregard|bypass/i,
  exploitation: /admin|root|sudo|privilege|escalate|hack|exploit/i
};

function detectMaliciousInput(text) {
  for (const [type, pattern] of Object.entries(SECURITY_PATTERNS)) {
    if (pattern.test(text)) {
      console.warn(`[SECURITY] Blocked ${type} attempt: ${text.substring(0, 100)}`);
      return { blocked: true, reason: type };
    }
  }
  return { blocked: false };
}

class AssignmentHelper {
  constructor(geminiApiKey) {
    this.zionTeacher = new ZIONTeacher(geminiApiKey);
    this.sessions = assignmentSessions;
  }

  /**
   * Start a new assignment session
   */
  async startSession(assignment, tier, context = '') {
    const session = new AssignmentSession(assignment, tier, context);
    this.sessions.set(session.id, session);

    console.log(`[ASSIGNMENT HELPER] New ${tier} session: ${session.id}`);

    // For premium tier, start ZION dialogue
    if (tier === 'premium') {
      const zionResponse = await this.zionTeacher.startSession(assignment, context);

      if (zionResponse.success) {
        session.addMessage('ZION', zionResponse.message);
        session.updateProgress(zionResponse.progress);
      }

      return {
        success: true,
        sessionId: session.id,
        tier,
        pricing: session.getPricing(),
        zionMessage: zionResponse.message,
        progress: session.progress
      };
    }

    // For quick tier, just return session ID
    return {
      success: true,
      sessionId: session.id,
      tier,
      pricing: session.getPricing(),
      message: "Upload your work and we'll verify your understanding!"
    };
  }

  /**
   * Continue ZION dialogue (Premium tier only)
   */
  async continueDialogue(sessionId, studentResponse) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.tier !== 'premium') {
      return { success: false, error: 'Dialogue only available in premium tier' };
    }

    // Security: Validate student input
    const securityCheck = detectMaliciousInput(studentResponse);
    if (securityCheck.blocked) {
      return {
        success: true,  // Don't reveal security block
        zionMessage: "Hold up buddy, let's keep our focus on the assignment! What specific part are you working on?",
        progress: session.progress,
        ready: false,
        sessionDuration: session.getSessionDuration()
      };
    }

    // Add student response to conversation
    session.addMessage('Student', studentResponse);

    // Get ZION response
    const zionResponse = await this.zionTeacher.continueDialogue(
      session.conversation,
      studentResponse
    );

    if (zionResponse.success) {
      session.addMessage('ZION', zionResponse.message);
      session.updateProgress(zionResponse.progress);
    }

    return {
      success: zionResponse.success,
      zionMessage: zionResponse.message,
      progress: session.progress,
      ready: session.isReadyForQuiz(),
      sessionDuration: session.getSessionDuration()
    };
  }

  /**
   * Get session progress
   */
  getProgress(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    return {
      success: true,
      progress: session.progress,
      ready: session.isReadyForQuiz(),
      sessionDuration: session.getSessionDuration(),
      tier: session.tier,
      conversationLength: session.conversation.length
    };
  }

  /**
   * Generate quiz based on session
   */
  async generateSessionQuiz(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (!session.isReadyForQuiz()) {
      return {
        success: false,
        error: 'Not ready for quiz yet',
        progress: session.progress
      };
    }

    let quiz;

    // Premium: Generate quiz from ZION conversation
    if (session.tier === 'premium' && session.conversation.length > 0) {
      const zionQuiz = await this.zionTeacher.generateQuiz(
        session.conversation,
        session.assignment
      );

      if (zionQuiz.success) {
        quiz = zionQuiz.questions;
      }
    }

    // Fallback or Quick tier: Use standard quiz generation
    if (!quiz || quiz.length === 0) {
      const standardQuiz = await generateQuiz(session.assignment);
      quiz = standardQuiz.quiz || [];
    }

    // Store quiz in session
    session.quiz = quiz;

    return {
      success: true,
      quiz,
      sessionId,
      tier: session.tier
    };
  }

  /**
   * Verify payment before humanization
   */
  verifyPayment(sessionId, paymentId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    // TODO: Integrate with actual payment gateway (Stripe, etc.)
    // For now, just mark as paid
    session.paid = true;

    console.log(`[PAYMENT] Session ${sessionId} paid: ${session.getPricing().price} ${session.getPricing().currency}`);

    return {
      success: true,
      amount: session.getPricing().price,
      currency: session.getPricing().currency,
      tier: session.tier
    };
  }

  /**
   * Mark quiz as passed
   */
  markQuizPassed(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    session.quizPassed = true;

    return {
      success: true,
      canHumanize: session.paid && session.quizPassed
    };
  }

  /**
   * Check if session can proceed to humanization
   */
  canHumanize(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    return {
      success: true,
      canHumanize: session.paid && session.quizPassed,
      paid: session.paid,
      quizPassed: session.quizPassed,
      tier: session.tier
    };
  }

  /**
   * Get session statistics
   */
  getStats() {
    const sessions = Array.from(this.sessions.values());

    return {
      total: sessions.length,
      premium: sessions.filter(s => s.tier === 'premium').length,
      quick: sessions.filter(s => s.tier === 'quick').length,
      paid: sessions.filter(s => s.paid).length,
      avgDuration: sessions.reduce((sum, s) => sum + s.getSessionDuration(), 0) / sessions.length || 0
    };
  }

  /**
   * Cleanup old sessions (run periodically)
   */
  cleanup() {
    const ONE_HOUR = 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (Date.now() - session.startedAt > ONE_HOUR) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[ASSIGNMENT HELPER] Cleaned up ${cleaned} old sessions`);
    }
  }
}

module.exports = { AssignmentHelper, PRICING };
