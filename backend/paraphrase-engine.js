/**
 * Graspit Paraphrase Engine
 *
 * Core algorithm built from real AI detection learnings
 * Based on: 92% → 87% → 46% → 31% → <10% research
 */

class ParaphraseEngine {
  constructor() {
    // AI clichés to remove (discovered through testing)
    this.aiCliches = [
      "Here's where it gets interesting",
      "Here's the thing",
      "Let's dive into",
      "Now here's the kicker",
      "It's worth noting that",
      "It's important to understand",
      "In today's fast-paced world",
      "In today's digital age",
      "Innovation rarely emerges",
      "The majority of",
      "Significant portion of",
      "A number of",
      "Furthermore,",
      "Moreover,",
      "Additionally,",
      "Consequently,"
    ];

    // Better transition words (human-like, varied)
    this.humanTransitions = [
      "First,", "Then,", "Plus,", "However,",
      "Therefore,", "But", "So", "Yet", "Still"
    ];

    // Formal to casual verb replacements
    this.verbReplacements = {
      "developed": "built",
      "established": "created",
      "represents": "is",
      "demonstrates": "shows",
      "indicates": "shows",
      "illustrated": "showed",
      "commenced": "started",
      "utilized": "used",
      "facilitates": "helps",
      "encompasses": "includes"
    };
  }

  /**
   * Main paraphrase method - applies all learnings
   */
  paraphrase(text) {
    let result = text;

    // Step 1: Remove em-dashes (BIGGEST KILLER)
    result = this.removeEmDashes(result);

    // Step 2: Remove AI conversation clichés
    result = this.removeAICliches(result);

    // Step 3: Break long list sentences
    result = this.breakLongLists(result);

    // Step 4: Eliminate parallel structures
    result = this.breakParallelStructure(result);

    // Step 5: Simplify complex sentences
    result = this.simplifyComplexSentences(result);

    // Step 6: Replace formal verbs with casual ones
    result = this.casualizeVerbs(result);

    // Step 7: Vary sentence structure
    result = this.varyStructure(result);

    // Step 8: Remove semicolons
    result = this.removeSemicolons(result);

    return result.trim();
  }

  /**
   * Remove em-dashes and replace with simpler punctuation
   * Learning: University students don't use em-dashes
   */
  removeEmDashes(text) {
    // Replace em-dash lists with separate sentences
    text = text.replace(/—([^—]+)—/g, '. $1.');

    // Replace single em-dashes with periods or commas
    text = text.replace(/—/g, '. ');

    return text;
  }

  /**
   * Remove AI conversation clichés
   * Learning: Phrases AI uses to sound engaging actually trigger detection
   */
  removeAICliches(text) {
    this.aiCliches.forEach(cliche => {
      const regex = new RegExp(cliche, 'gi');
      text = text.replace(regex, '');
    });
    return text;
  }

  /**
   * Break long list sentences into multiple short ones
   * Learning: Even without em-dashes, long lists = AI pattern
   */
  breakLongLists(text) {
    // Find sentences with 3+ comma-separated items
    const listPattern = /([^.!?]+),\s*([^,]+),\s*([^,]+),\s*and\s+([^.!?]+)[.!?]/g;

    text = text.replace(listPattern, (match, intro, item1, item2, item3) => {
      return `${intro.trim()}. These include ${item1.trim()}. Also ${item2.trim()}. Plus ${item3.trim()}.`;
    });

    return text;
  }

  /**
   * Break parallel structure sentences
   * Learning: "It does X, does Y, does Z" = AI pattern
   */
  breakParallelStructure(text) {
    // Pattern: "It [verb]s X, [verb]s Y, and [verb]s Z"
    const parallelPattern = /It\s+(\w+s)\s+([^,]+),\s+(\w+s)\s+([^,]+),\s+and\s+(\w+s)\s+([^.!?]+)[.!?]/gi;

    text = text.replace(parallelPattern, (match, v1, obj1, v2, obj2, v3, obj3) => {
      return `This ${v1} ${obj2.trim()}. It ${v2} ${obj2.trim()}. The system ${v3} ${obj3.trim()}.`;
    });

    return text;
  }

  /**
   * Simplify complex sentences (multiple clauses)
   * Learning: Break "while X and Y" into separate sentences
   */
  simplifyComplexSentences(text) {
    // Replace "while X and Y" with separate sentences
    text = text.replace(/\s+while\s+([^.!?]+)\s+and\s+([^.!?]+)[.!?]/gi, '. It $1. Plus $2.');

    return text;
  }

  /**
   * Replace formal verbs with casual equivalents
   * Learning: "Built" > "developed" in student writing
   */
  casualizeVerbs(text) {
    Object.keys(this.verbReplacements).forEach(formal => {
      const casual = this.verbReplacements[formal];
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      text = text.replace(regex, casual);
    });
    return text;
  }

  /**
   * Vary sentence structure to avoid repetition
   * Learning: Don't start 4+ sentences with same pattern
   */
  varyStructure(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    // Check for repetitive starts
    let prevStart = '';
    let repeatCount = 0;

    const varied = sentences.map(sentence => {
      const trimmed = sentence.trim();
      const firstWord = trimmed.split(' ')[0];

      if (firstWord === prevStart) {
        repeatCount++;
        if (repeatCount >= 2) {
          // Vary this sentence start
          return this.varyStart(trimmed);
        }
      } else {
        repeatCount = 0;
      }

      prevStart = firstWord;
      return trimmed;
    });

    return varied.join('. ') + '.';
  }

  /**
   * Vary sentence start to break patterns
   */
  varyStart(sentence) {
    const starters = ['Moreover,', 'However,', 'Plus,', 'Then,', 'Also,'];
    const randomStarter = starters[Math.floor(Math.random() * starters.length)];
    return `${randomStarter} ${sentence.toLowerCase()}`;
  }

  /**
   * Remove semicolons (humans rarely use in casual academic writing)
   */
  removeSemicolons(text) {
    return text.replace(/;/g, '.');
  }

  /**
   * Calculate estimated AI detection score
   * Based on pattern analysis
   */
  estimateAIScore(text) {
    let score = 0;

    // Check for em-dashes (+15% each)
    const emDashCount = (text.match(/—/g) || []).length;
    score += emDashCount * 15;

    // Check for AI clichés (+10% each)
    this.aiCliches.forEach(cliche => {
      if (text.toLowerCase().includes(cliche.toLowerCase())) {
        score += 10;
      }
    });

    // Check for long sentences (+5% for each >40 words)
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(s => {
      const wordCount = s.trim().split(/\s+/).length;
      if (wordCount > 40) score += 5;
    });

    // Check for semicolons (+3% each)
    const semicolonCount = (text.match(/;/g) || []).length;
    score += semicolonCount * 3;

    return Math.min(score, 100); // Cap at 100%
  }
}

module.exports = ParaphraseEngine;
