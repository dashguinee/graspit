/**
 * Gemini-Powered Paraphraser
 * Uses ZION v7.1 Humanization System (0% AI Detection)
 */

// Use native fetch (Node 18+) or node-fetch as fallback
const fetch = globalThis.fetch || require('node-fetch');
const { getZIONPrompt } = require('./zion-humanizer-v7');

class GeminiParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  }

  /**
   * Paraphrase text using Gemini with ZION v7.1
   * @param {string} text - Text to humanize
   * @param {string} tone - 'smart' or 'elite'
   */
  async paraphrase(text, tone = 'smart') {
    console.log('[PARAPHRASER] Starting ZION v7.1 humanization...');
    console.log('[PARAPHRASER] Tone:', tone);

    // Get the appropriate ZION prompt for the tone
    const systemInstruction = getZIONPrompt(tone);

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
              text: `${systemInstruction}\n\nHumanize this text:\n\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,  // Higher for natural variety
            maxOutputTokens: 4000
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
      console.error('[PARAPHRASER] ERROR:', error.message);
      console.error('[PARAPHRASER] Falling back to rule-based');
      return this.fallbackParaphrase(text);
    }
  }

  /**
   * Estimate AI detection score - ZeroGPT-level accuracy
   * Checks 50+ patterns that AI text exhibits
   */
  estimateAIScore(text) {
    let score = 0;
    const lowerText = text.toLowerCase();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/);

    // 1. PUNCTUATION PATTERNS (max 25 points)
    const emDashCount = (text.match(/—/g) || []).length;
    score += Math.min(emDashCount * 12, 20); // Max 20 for em-dashes (increased weight)

    const semicolonCount = (text.match(/;/g) || []).length;
    score += Math.min(semicolonCount * 2.5, 5); // Max 5 for semicolons (increased weight)

    // 2. AI CLICHÉS - Comprehensive list (max 30 points)
    const aiClichés = [
      "here's where it gets interesting", "here's the thing", "let's dive into",
      "it's worth noting", "in today's fast-paced world", "it's important to note",
      "it's crucial to understand", "in conclusion", "to summarize",
      "at the end of the day", "when all is said and done", "the bottom line is",
      "let's explore", "delve into", "unpack", "navigate through",
      "it's no secret that", "there's no denying", "one cannot help but",
      "in the grand scheme of things", "bear in mind", "keep in mind",
      "it goes without saying", "needless to say", "as previously mentioned",
      "moreover", "furthermore", "nevertheless", "nonetheless",
      "consequently", "therefore", "thus", "hence",
      "in light of", "with that in mind", "taking into account",
      "it is evident that", "it is clear that", "it stands to reason",
      "on the flip side", "on the other hand", "conversely",
      "in essence", "essentially", "fundamentally", "primarily",
      "notably", "significantly", "particularly", "especially"
    ];

    let clichéCount = 0;
    aiClichés.forEach(cliché => {
      if (lowerText.includes(cliché)) clichéCount++;
    });

    // Base score for clichés (increased from 6 to 8 - major AI indicator)
    let clichéScore = clichéCount * 8;

    // DENSITY BONUS: Multiple clichés in short text = obvious AI
    const wordCount = words.length;
    if (wordCount > 0 && wordCount < 200) {
      const density = clichéCount / (wordCount / 50); // Clichés per 50 words
      if (density > 2) clichéScore *= 1.5; // 50% bonus for high density
      else if (density > 1) clichéScore *= 1.2; // 20% bonus for moderate density
    }

    score += Math.min(clichéScore, 50); // Max 50 for clichés

    // 3. SENTENCE STRUCTURE (max 20 points)
    // Check for uniform sentence lengths (AI loves consistency)
    if (sentences.length >= 3) {
      const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;

      // Low variance = very uniform = AI-like
      if (variance < 30) score += 8;
      if (variance < 20) score += 4; // Additional 4 for very uniform
    }

    // Overly long sentences
    const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 35).length;
    score += Math.min(longSentences * 2, 8); // Max 8 for long sentences

    // 4. VOCABULARY ANALYSIS (max 15 points)
    // Formal/academic words
    const formalWords = [
      'utilize', 'facilitate', 'demonstrate', 'substantial', 'comprehensive',
      'significant', 'considerable', 'numerous', 'various', 'particular',
      'specific', 'implement', 'endeavor', 'ascertain', 'subsequently'
    ];

    let formalCount = 0;
    formalWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) formalCount += matches.length;
    });

    // Base score for formal words
    let formalScore = formalCount * 2.5;

    // DENSITY BONUS: High formal word concentration in short text
    if (wordCount > 0 && wordCount < 200) {
      const formalDensity = formalCount / (wordCount / 50); // Formal words per 50 words
      if (formalDensity > 3) formalScore *= 1.4; // 40% bonus for academic overkill
    }

    score += Math.min(formalScore, 20); // Max 20 for formal words (increased cap)

    // Adverb overuse (AI loves adverbs)
    const adverbs = ['particularly', 'significantly', 'notably', 'especially', 'specifically',
                     'certainly', 'absolutely', 'definitely', 'clearly', 'obviously'];
    let adverbCount = 0;
    adverbs.forEach(adv => {
      if (lowerText.includes(adv)) adverbCount++;
    });
    score += Math.min(adverbCount * 2, 10); // Max 10 for adverbs (doubled weight)

    // 5. PARAGRAPH STRUCTURE (max 10 points)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length >= 2) {
      const paraLengths = paragraphs.map(p => p.length);
      const avgParaLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
      const paraVariance = paraLengths.reduce((sum, len) => sum + Math.pow(len - avgParaLength, 2), 0) / paraLengths.length;

      // Very uniform paragraph lengths
      if (paraVariance < 500) score += 5;
      if (paraVariance < 200) score += 5; // Additional 5 for extremely uniform
    }

    // 6. PASSIVE VOICE DETECTION (major AI tell - max 15 points)
    const passivePatterns = /\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi;
    const passiveMatches = text.match(passivePatterns);
    const passiveCount = passiveMatches ? passiveMatches.length : 0;

    if (sentences.length > 0) {
      const passiveRatio = passiveCount / sentences.length;
      if (passiveRatio > 0.4) score += 15; // More than 40% passive = AI
      else if (passiveRatio > 0.25) score += 10; // 25-40% passive = likely AI
      else if (passiveRatio > 0.15) score += 5; // 15-25% passive = some AI traits
    }

    // 7. OTHER AI SIGNATURES (max 10 points)
    // Lists and enumerations (AI loves structure)
    const listPatterns = /(?:first|second|third|finally|additionally|lastly)[\s,]/gi;
    const listMatches = text.match(listPatterns);
    if (listMatches) score += Math.min(listMatches.length * 2, 10); // Doubled weight

    // Total possible: ~155 points across all categories, capped at 100%
    return Math.min(Math.round(score), 100);
  }

  /**
   * Fallback to rule-based paraphrasing if LLM fails
   */
  fallbackParaphrase(text) {
    let result = text;

    // Remove em-dashes
    result = result.replace(/—([^—]+)—/g, '. $1.');
    result = result.replace(/—/g, '. ');

    // Remove semicolons
    result = result.replace(/;/g, '.');

    // Casualize some verbs
    const replacements = {
      'developed': 'built',
      'demonstrates': 'shows',
      'utilized': 'used'
    };

    Object.keys(replacements).forEach(formal => {
      const casual = replacements[formal];
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      result = result.replace(regex, casual);
    });

    return result.trim();
  }
}

module.exports = GeminiParaphraser;
