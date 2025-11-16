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
   * Looks for: main ideas, definitions, arguments, themes
   */
  extractKeyConcepts(text) {
    const concepts = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Get main topic/theme (first substantial sentence)
    if (sentences.length > 0) {
      concepts.push({
        type: 'main-idea',
        content: sentences[0].trim(),
        question: this.generateMainIdeaQuestion(sentences[0].trim())
      });
    }

    // Extract definitions (X is Y, X refers to Y)
    const defPattern = /([^.!?]*(?:is|are|refers to|means|called|defined as)[^.!?]*)[.!?]/gi;
    const defMatches = text.match(defPattern);
    if (defMatches && defMatches.length > 0) {
      defMatches.slice(0, 2).forEach(def => {
        concepts.push({
          type: 'definition',
          content: def.trim(),
          question: this.generateDefQuestion(def.trim())
        });
      });
    }

    // Extract key arguments/reasons
    const argPattern = /([^.!?]*(?:because|therefore|thus|since|however|moreover)[^.!?]*)[.!?]/gi;
    const argMatches = text.match(argPattern);
    if (argMatches && argMatches.length > 0) {
      argMatches.slice(0, 2).forEach(arg => {
        concepts.push({
          type: 'argument',
          content: arg.trim(),
          question: this.generateArgQuestion(arg.trim())
        });
      });
    }

    // Add a general comprehension question
    if (sentences.length >= 3) {
      const middleSentence = sentences[Math.floor(sentences.length / 2)];
      concepts.push({
        type: 'comprehension',
        content: middleSentence.trim(),
        question: this.generateComprehensionQuestion(text)
      });
    }

    return concepts.slice(0, 5); // Max 5 questions
  }

  /**
   * Generate main idea question
   */
  generateMainIdeaQuestion(sentence) {
    return {
      text: `What is the main topic or focus of this text?`,
      correctAnswer: this.extractKeywords(sentence),
      type: 'short-answer'
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
    return {
      text: `Explain the main point or reasoning in your own words.`,
      correctAnswer: this.extractKeywords(argument),
      type: 'comprehension'
    };
  }

  /**
   * Generate general comprehension question
   */
  generateComprehensionQuestion(fullText) {
    // Extract a few key themes
    const keywords = this.extractKeywords(fullText);

    return {
      text: `In one sentence, what is this text primarily about?`,
      correctAnswer: keywords,
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

  /**
   * Generate flash summary of key learnings
   * Shows condensed understanding after quiz
   */
  generateFlashSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keywords = this.extractKeywords(text);

    // Extract 3-5 key points
    const keyPoints = [];

    // First sentence (topic)
    if (sentences.length > 0) {
      keyPoints.push(this.condense(sentences[0]));
    }

    // Middle sentences (main content)
    if (sentences.length >= 3) {
      const mid1 = Math.floor(sentences.length / 3);
      const mid2 = Math.floor((sentences.length * 2) / 3);
      keyPoints.push(this.condense(sentences[mid1]));
      keyPoints.push(this.condense(sentences[mid2]));
    }

    // Last sentence (conclusion/result)
    if (sentences.length > 1) {
      keyPoints.push(this.condense(sentences[sentences.length - 1]));
    }

    return {
      keyPoints: keyPoints.filter(p => p.length > 10).slice(0, 5),
      keywords: keywords.split(' ').slice(0, 8).join(', '),
      wordCount: text.split(/\s+/).length,
      readingTime: Math.ceil(text.split(/\s+/).length / 200) // ~200 words/min
    };
  }

  /**
   * Condense a sentence to its core meaning
   */
  condense(sentence) {
    // Remove filler words and keep core meaning
    const fillerWords = ['very', 'really', 'quite', 'just', 'actually', 'basically', 'literally'];
    let condensed = sentence.trim();

    fillerWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      condensed = condensed.replace(regex, '');
    });

    // Clean up extra spaces
    condensed = condensed.replace(/\s+/g, ' ').trim();

    // Limit length
    return condensed.length > 100 ? condensed.substring(0, 100) + '...' : condensed;
  }
}

module.exports = QuizGenerator;
