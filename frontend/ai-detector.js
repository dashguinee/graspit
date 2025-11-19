/**
 * ZION AI Detector v1.0
 * Built from reverse-engineering AI detection patterns
 * Based on ZION Humanization System v7.1 research
 *
 * "We learned what triggers detection, now we detect it"
 */

const ZIONDetector = {
  /**
   * Main detection function
   * Returns score 0-100 (higher = more likely AI)
   */
  analyze(text) {
    if (!text || text.length < 50) {
      return { score: 0, flags: [], details: 'Text too short to analyze' };
    }

    const flags = [];
    let totalScore = 0;

    // Run all pattern checks
    const checks = [
      this.checkEmDashes(text),
      this.checkGenerationTemplates(text),
      this.checkParallelStacking(text),
      this.checkTemplateConcessions(text),
      this.checkFormalHedging(text),
      this.checkBannedPhrases(text),
      this.checkSentenceUniformity(text),
      this.checkRepetitiveStructures(text),
      this.checkDataPresentation(text),
      this.checkProcessMarkers(text)
    ];

    checks.forEach(check => {
      if (check.score > 0) {
        flags.push(check);
        totalScore += check.score;
      }
    });

    // Cap at 100
    const finalScore = Math.min(totalScore, 100);

    return {
      score: finalScore,
      flags,
      verdict: this.getVerdict(finalScore),
      suggestions: this.getSuggestions(flags)
    };
  },

  /**
   * Check 1: Em-dash overuse (Critical - #1 AI signature)
   */
  checkEmDashes(text) {
    const emDashCount = (text.match(/—/g) || []).length;
    const wordCount = text.split(/\s+/).length;
    const ratio = emDashCount / (wordCount / 400);

    // Sandwich pattern: word—explanation—continuation
    const sandwichPattern = /\w+—[^—]+—\w+/g;
    const sandwiches = (text.match(sandwichPattern) || []).length;

    let score = 0;
    const issues = [];

    if (ratio > 1) {
      score += Math.min((ratio - 1) * 15, 25);
      issues.push(`${emDashCount} em-dashes (should be max ${Math.floor(wordCount / 400)})`);
    }

    if (sandwiches > 0) {
      score += sandwiches * 10;
      issues.push(`${sandwiches} sandwich pattern(s) detected`);
    }

    return {
      name: 'Em-dash Overuse',
      score,
      issues,
      severity: score > 15 ? 'high' : score > 5 ? 'medium' : 'low'
    };
  },

  /**
   * Check 2: Generation templates ("X generated Y in [year]")
   */
  checkGenerationTemplates(text) {
    const patterns = [
      /\w+\s+(generated|produced|created|yielded|recorded)\s+[\$£€]?[\d,\.]+\s*(billion|million|thousand)?/gi,
      /(?:sector|industry|market|company)\s+generated\s+/gi,
      /revenue\s+(?:was|reached|hit|totaled)\s+[\$£€]?[\d,\.]+/gi,
      /profit\s+(?:was|stood at|reached)\s+[\$£€]?[\d,\.]+/gi
    ];

    let matches = 0;
    const found = [];

    patterns.forEach(pattern => {
      const results = text.match(pattern) || [];
      matches += results.length;
      found.push(...results);
    });

    return {
      name: 'Generation Templates',
      score: matches * 8,
      issues: found.length > 0 ? [`Found: "${found.slice(0, 3).join('", "')}"`] : [],
      severity: matches > 2 ? 'high' : matches > 0 ? 'medium' : 'low'
    };
  },

  /**
   * Check 3: Parallel stacking ("X was [number] with Y at [number]")
   */
  checkParallelStacking(text) {
    const patterns = [
      /was\s+[\$£€]?[\d,\.]+\s*(?:billion|million|%|percent)?\s*with\s+\w+\s+(?:at|of)\s+[\$£€]?[\d,\.]+/gi,
      /[\$£€]?[\d,\.]+\s*(?:billion|million)?\s*(?:in\s+)?revenue[,\s]+[\$£€]?[\d,\.]+\s*(?:billion|million)?\s*(?:in\s+)?profit/gi
    ];

    let matches = 0;
    const found = [];

    patterns.forEach(pattern => {
      const results = text.match(pattern) || [];
      matches += results.length;
      found.push(...results);
    });

    return {
      name: 'Parallel Data Stacking',
      score: matches * 10,
      issues: found.length > 0 ? [`Found: "${found.slice(0, 2).join('", "')}"`] : [],
      severity: matches > 1 ? 'high' : matches > 0 ? 'medium' : 'low'
    };
  },

  /**
   * Check 4: Template concessions ("which, while X, nevertheless Y")
   */
  checkTemplateConcessions(text) {
    const patterns = [
      /which,?\s+while\s+\w+,?\s+(?:nevertheless|nonetheless|however|still)/gi,
      /although\s+\w+,?\s+(?:it\s+)?(?:nevertheless|nonetheless|still)\s+/gi,
      /despite\s+(?:the\s+fact\s+that|this),?\s+(?:it\s+)?(?:nevertheless|nonetheless)/gi
    ];

    let matches = 0;
    patterns.forEach(pattern => {
      matches += (text.match(pattern) || []).length;
    });

    return {
      name: 'Template Concessions',
      score: matches * 12,
      issues: matches > 0 ? [`${matches} template concession pattern(s)`] : [],
      severity: matches > 1 ? 'high' : matches > 0 ? 'medium' : 'low'
    };
  },

  /**
   * Check 5: Formal hedging vocabulary
   */
  checkFormalHedging(text) {
    const formalWords = [
      'approximately', 'significantly', 'substantially',
      'consequently', 'furthermore', 'moreover',
      'thus', 'hence', 'whereby', 'thereof',
      'notwithstanding', 'aforementioned', 'henceforth'
    ];

    const found = [];
    const lowerText = text.toLowerCase();

    formalWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex) || [];
      if (matches.length > 0) {
        found.push(`${word} (${matches.length}x)`);
      }
    });

    return {
      name: 'Formal Hedging Vocabulary',
      score: found.length * 5,
      issues: found,
      severity: found.length > 3 ? 'high' : found.length > 1 ? 'medium' : 'low'
    };
  },

  /**
   * Check 6: Banned AI phrases
   */
  checkBannedPhrases(text) {
    const phrases = [
      'this demonstrates', 'this highlights', 'this underscores',
      'it is worth noting', 'it should be noted', 'it is important to note',
      'in conclusion', 'to summarize', 'in summary',
      'serves as a testament', 'plays a crucial role',
      'it is evident that', 'this serves to',
      'the fact that', 'due to the fact'
    ];

    const found = [];
    const lowerText = text.toLowerCase();

    phrases.forEach(phrase => {
      if (lowerText.includes(phrase)) {
        found.push(phrase);
      }
    });

    return {
      name: 'AI Signature Phrases',
      score: found.length * 8,
      issues: found.map(p => `"${p}"`),
      severity: found.length > 2 ? 'high' : found.length > 0 ? 'medium' : 'low'
    };
  },

  /**
   * Check 7: Sentence length uniformity
   */
  checkSentenceUniformity(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 5) {
      return { name: 'Sentence Uniformity', score: 0, issues: [], severity: 'low' };
    }

    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Low standard deviation = too uniform = likely AI
    const uniformityScore = stdDev < 5 ? (5 - stdDev) * 4 : 0;

    return {
      name: 'Sentence Uniformity',
      score: uniformityScore,
      issues: stdDev < 5 ? [`Sentence lengths too uniform (std dev: ${stdDev.toFixed(1)})`] : [],
      severity: uniformityScore > 10 ? 'high' : uniformityScore > 5 ? 'medium' : 'low'
    };
  },

  /**
   * Check 8: Repetitive sentence structures
   */
  checkRepetitiveStructures(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 4) {
      return { name: 'Repetitive Structures', score: 0, issues: [], severity: 'low' };
    }

    // Check for consecutive sentences starting same way
    let repetitions = 0;
    const patterns = [];

    for (let i = 1; i < sentences.length; i++) {
      const prev = sentences[i - 1].trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase();
      const curr = sentences[i].trim().split(/\s+/).slice(0, 3).join(' ').toLowerCase();

      if (prev === curr) {
        repetitions++;
        if (!patterns.includes(prev)) patterns.push(prev);
      }
    }

    // Check for "The [noun]" pattern overuse
    const theNounPattern = sentences.filter(s =>
      /^\s*the\s+\w+\s+(is|was|has|have|will|can|could|should|would)/i.test(s)
    ).length;

    const theNounScore = theNounPattern > sentences.length * 0.4 ? 8 : 0;

    return {
      name: 'Repetitive Structures',
      score: (repetitions * 6) + theNounScore,
      issues: [
        ...patterns.map(p => `Repeated start: "${p}..."`),
        ...(theNounScore > 0 ? [`${theNounPattern}/${sentences.length} sentences start with "The [noun] is/was..."`] : [])
      ],
      severity: repetitions > 2 ? 'high' : repetitions > 0 ? 'medium' : 'low'
    };
  },

  /**
   * Check 9: Data presentation style
   */
  checkDataPresentation(text) {
    // Subject-verb-number pattern (AI style)
    const svnPattern = /(?:revenue|profit|sales|growth|market|sector)\s+(?:was|is|reached|totaled|hit|stood at)\s+[\$£€]?[\d,\.]+/gi;
    const svnMatches = (text.match(svnPattern) || []).length;

    // Back-to-back data sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let consecutiveDataSentences = 0;

    for (let i = 1; i < sentences.length; i++) {
      const prevHasData = /[\$£€]?[\d,\.]+\s*(?:billion|million|%|percent)/i.test(sentences[i - 1]);
      const currHasData = /[\$£€]?[\d,\.]+\s*(?:billion|million|%|percent)/i.test(sentences[i]);

      if (prevHasData && currHasData) {
        consecutiveDataSentences++;
      }
    }

    return {
      name: 'Data Presentation Style',
      score: (svnMatches * 5) + (consecutiveDataSentences * 4),
      issues: [
        ...(svnMatches > 0 ? [`${svnMatches} subject-verb-number pattern(s)`] : []),
        ...(consecutiveDataSentences > 0 ? [`${consecutiveDataSentences} back-to-back data sentence(s)`] : [])
      ],
      severity: (svnMatches + consecutiveDataSentences) > 3 ? 'high' : (svnMatches + consecutiveDataSentences) > 1 ? 'medium' : 'low'
    };
  },

  /**
   * Check 10: Absence of process markers (human signals)
   */
  checkProcessMarkers(text) {
    const humanMarkers = [
      /took\s+(?:us|me)\s+(?:a\s+while|longer|some\s+time)/i,
      /went\s+back\s+and\s+forth/i,
      /initially\s+thought/i,
      /tricky\s+part/i,
      /what\s+finally\s+(?:made\s+sense|worked)/i,
      /after\s+looking\s+at\s+(?:this|it)\s+(?:three|several|multiple)/i,
      /(?:candidly|honestly|frankly)/i,
      /that\s+(?:number|figure|data)\s+(?:stops|caught|surprised)/i
    ];

    let markerCount = 0;
    humanMarkers.forEach(pattern => {
      if (pattern.test(text)) markerCount++;
    });

    const wordCount = text.split(/\s+/).length;
    const expectedMarkers = Math.floor(wordCount / 500);

    // Missing markers is suspicious
    const score = markerCount < expectedMarkers ? (expectedMarkers - markerCount) * 6 : 0;

    return {
      name: 'Missing Human Markers',
      score,
      issues: score > 0 ? [`Only ${markerCount} process marker(s) found (expected ~${expectedMarkers})`] : [],
      severity: score > 10 ? 'high' : score > 5 ? 'medium' : 'low'
    };
  },

  /**
   * Get verdict based on score
   */
  getVerdict(score) {
    if (score >= 50) return { level: 'high', text: 'Likely AI Generated', color: '#d32f2f' };
    if (score >= 25) return { level: 'medium', text: 'Possibly AI Generated', color: '#ff6f00' };
    if (score >= 10) return { level: 'low', text: 'Some AI Patterns', color: '#ffc107' };
    return { level: 'human', text: 'Likely Human Written', color: '#4caf50' };
  },

  /**
   * Generate improvement suggestions
   */
  getSuggestions(flags) {
    const suggestions = [];
    const highSeverity = flags.filter(f => f.severity === 'high');

    highSeverity.forEach(flag => {
      switch (flag.name) {
        case 'Em-dash Overuse':
          suggestions.push('Reduce em-dashes to max 1 per 400 words. Use commas or periods instead.');
          break;
        case 'Generation Templates':
          suggestions.push('Embed data in interpretation: "Somewhere between X and Y annually, growth has plateaued"');
          break;
        case 'Parallel Data Stacking':
          suggestions.push('Split data into separate contexts with interpretation between.');
          break;
        case 'Template Concessions':
          suggestions.push('Replace "which, while X, nevertheless Y" with reaction language.');
          break;
        case 'Formal Hedging Vocabulary':
          suggestions.push('Use "probably", "around", "roughly" instead of "approximately", "significantly".');
          break;
        case 'AI Signature Phrases':
          suggestions.push('Remove phrases like "this demonstrates", "it is worth noting".');
          break;
        case 'Sentence Uniformity':
          suggestions.push('Vary sentence lengths: short (invites) → long (delivers) → short (pivots).');
          break;
        case 'Repetitive Structures':
          suggestions.push('Vary sentence openings. Never start consecutive sentences the same way.');
          break;
        case 'Data Presentation Style':
          suggestions.push('Use data as noun phrases: "RM11.71 billion revenue" not "Revenue was RM11.71 billion".');
          break;
        case 'Missing Human Markers':
          suggestions.push('Add process markers: "took us a while to figure out", "initially thought X but...".');
          break;
      }
    });

    return suggestions;
  }
};

// Export for use
window.ZIONDetector = ZIONDetector;
