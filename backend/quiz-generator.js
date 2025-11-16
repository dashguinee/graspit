/**
 * Graspit Smart Recap - Quiz Generator
 *
 * Forces understanding before paraphrasing
 * Ethical positioning: Learn first, then write
 */

class QuizGenerator {
  constructor() {
    this.minimumPassScore = 70; // 70% to pass
  }

  /**
   * Generate quiz from input text
   * Extracts key concepts and creates comprehension questions
   */
  generateQuiz(text) {
    const concepts = this.extractKeyConcepts(text);
    const questions = this.createQuestions(concepts, text);

    return {
      questions: questions,
      passScore: this.minimumPassScore,
      conceptCount: concepts.length
    };
  }

  /**
   * Extract key concepts from text
   * Looks for: definitions, statistics, main arguments, examples
   */
  extractKeyConcepts(text) {
    const concepts = [];

    // Extract sentences with statistics (numbers + %)
    const statPattern = /([^.!?]*\d+[%]?[^.!?]*)[.!?]/g;
    let match;
    while ((match = statPattern.exec(text)) !== null) {
      concepts.push({
        type: 'statistic',
        content: match[1].trim(),
        question: this.generateStatQuestion(match[1].trim())
      });
    }

    // Extract definitions (X is Y, X refers to Y)
    const defPattern = /([^.!?]*(?:is|refers to|means|called)[^.!?]*)[.!?]/gi;
    const defMatches = text.match(defPattern);
    if (defMatches) {
      defMatches.slice(0, 2).forEach(def => {
        concepts.push({
          type: 'definition',
          content: def.trim(),
          question: this.generateDefQuestion(def.trim())
        });
      });
    }

    // Extract main arguments (sentences with "because", "therefore", "thus")
    const argPattern = /([^.!?]*(?:because|therefore|thus|since)[^.!?]*)[.!?]/gi;
    const argMatches = text.match(argPattern);
    if (argMatches) {
      argMatches.slice(0, 2).forEach(arg => {
        concepts.push({
          type: 'argument',
          content: arg.trim(),
          question: this.generateArgQuestion(arg.trim())
        });
      });
    }

    return concepts.slice(0, 5); // Max 5 questions
  }

  /**
   * Generate statistic question
   */
  generateStatQuestion(stat) {
    // Extract the number
    const numberMatch = stat.match(/(\d+[%]?)/);
    const number = numberMatch ? numberMatch[1] : '';

    // Extract the context (what the stat is about)
    const context = stat.replace(/\d+[%]?/, '[NUMBER]');

    return {
      text: `According to the text, what percentage/number relates to: ${this.simplifyContext(context)}?`,
      correctAnswer: number,
      type: 'fill-in'
    };
  }

  /**
   * Generate definition question
   */
  generateDefQuestion(definition) {
    // Extract term being defined
    const parts = definition.split(/\s+(?:is|refers to|means|called)\s+/i);
    const term = parts[0].trim();
    const meaning = parts[1] ? parts[1].trim() : '';

    return {
      text: `What does the text say about "${term}"?`,
      correctAnswer: this.extractKeywords(meaning),
      type: 'short-answer'
    };
  }

  /**
   * Generate argument question
   */
  generateArgQuestion(argument) {
    // Extract the cause and effect
    const causePart = argument.split(/because|since/i)[1] || argument;
    const effectPart = argument.split(/therefore|thus/i)[1] || argument;

    return {
      text: `Explain the main point made in this statement: "${this.simplify(argument)}"`,
      correctAnswer: this.extractKeywords(argument),
      type: 'comprehension'
    };
  }

  /**
   * Create multiple choice questions from concepts
   */
  createQuestions(concepts, fullText) {
    return concepts.map((concept, index) => {
      return {
        id: index + 1,
        question: concept.question.text,
        type: concept.question.type,
        correctAnswer: concept.question.correctAnswer,
        concept: concept.type,
        source: concept.content
      };
    });
  }

  /**
   * Evaluate user answers
   */
  evaluateAnswers(questions, userAnswers) {
    let correctCount = 0;

    const results = questions.map((q, index) => {
      const userAnswer = userAnswers[index] || '';
      const isCorrect = this.checkAnswer(q, userAnswer);

      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        correct: isCorrect,
        userAnswer: userAnswer,
        correctAnswer: q.correctAnswer,
        feedback: isCorrect ? '✅ Correct!' : `❌ Incorrect. The answer relates to: ${q.correctAnswer}`
      };
    });

    const score = (correctCount / questions.length) * 100;
    const passed = score >= this.minimumPassScore;

    return {
      score: Math.round(score),
      passed: passed,
      correctCount: correctCount,
      totalQuestions: questions.length,
      results: results,
      message: passed
        ? '🎉 Great! You grasped it. Here\'s your paraphrase.'
        : `📚 Score: ${Math.round(score)}%. Review the material and try again. You need ${this.minimumPassScore}% to unlock paraphrase.`
    };
  }

  /**
   * Check if answer is correct
   */
  checkAnswer(question, userAnswer) {
    const normalizedUser = userAnswer.toLowerCase().trim();
    const normalizedCorrect = String(question.correctAnswer).toLowerCase().trim();

    // For fill-in (numbers/percentages) - exact match
    if (question.type === 'fill-in') {
      return normalizedUser === normalizedCorrect;
    }

    // For short-answer/comprehension - keyword matching
    const keywords = normalizedCorrect.split(/\s+/);
    const matchCount = keywords.filter(kw => normalizedUser.includes(kw)).length;

    // Need at least 50% keyword match
    return (matchCount / keywords.length) >= 0.5;
  }

  /**
   * Simplify context for question display
   */
  simplifyContext(text) {
    return text.replace('[NUMBER]', '___')
      .replace(/\s+/g, ' ')
      .substring(0, 100) + '...';
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    // Remove common words
    const stopWords = ['the', 'is', 'are', 'was', 'were', 'a', 'an', 'and', 'or', 'but'];
    const words = text.toLowerCase()
      .replace(/[.,!?;]/g, '')
      .split(/\s+/)
      .filter(w => !stopWords.includes(w) && w.length > 3);

    return words.slice(0, 5).join(' ');
  }

  /**
   * Simplify long text for display
   */
  simplify(text) {
    return text.length > 80 ? text.substring(0, 80) + '...' : text;
  }
}

module.exports = QuizGenerator;
