/**
 * Gemini-Powered Paraphraser
 * Uses APEX V9 Humanization System (1% AI Detection Target)
 *
 * ZION v7.1 archived to /archive/ - did not achieve target detection rates
 */

// Use native fetch (Node 18+) or node-fetch as fallback
const fetch = globalThis.fetch || require('node-fetch');
const { getAPEXPrompt, APEX_CONFIG } = require('./apex-humanizer-v9');

class GeminiParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    // APEX V9 uses gemini-1.5-pro-002
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${APEX_CONFIG.model}:generateContent?key=${apiKey}`;
  }

  /**
   * Paraphrase text using APEX V9
   * @param {string} text - Text to humanize
   * @param {string} tone - 'apex' (default) or 'apex-academic'
   */
  async paraphrase(text, tone = 'apex') {
    console.log('[PARAPHRASER] Starting APEX V9 humanization...');
    console.log('[PARAPHRASER] Tone:', tone);

    // Get APEX prompt (apex or apex-academic)
    const systemInstruction = getAPEXPrompt(tone);

    // APEX V9 config - DO NOT CHANGE THESE VALUES
    const genConfig = {
      temperature: APEX_CONFIG.temperature,  // 1.35 - high entropy
      topP: APEX_CONFIG.topP,                // 0.90
      topK: APEX_CONFIG.topK,                // 40
      maxOutputTokens: APEX_CONFIG.maxOutputTokens  // 8192
    };

    try {
      console.log(`[PARAPHRASER] Calling Gemini API (${APEX_CONFIG.model})...`);
      console.log(`[PARAPHRASER] Config: temp=${genConfig.temperature}, topP=${genConfig.topP}, topK=${genConfig.topK}`);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${systemInstruction}\n\n${text}`
            }]
          }],
          generationConfig: genConfig
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
    score += Math.min(emDashCount * 12, 20);

    const semicolonCount = (text.match(/;/g) || []).length;
    score += Math.min(semicolonCount * 2.5, 5);

    // 2. AI CLICHÉS (max 50 points)
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

    let clichéScore = clichéCount * 8;
    const wordCount = words.length;
    if (wordCount > 0 && wordCount < 200) {
      const density = clichéCount / (wordCount / 50);
      if (density > 2) clichéScore *= 1.5;
      else if (density > 1) clichéScore *= 1.2;
    }
    score += Math.min(clichéScore, 50);

    // 3. SENTENCE STRUCTURE (max 20 points)
    if (sentences.length >= 3) {
      const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
      const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length;
      const variance = sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / sentenceLengths.length;
      if (variance < 30) score += 8;
      if (variance < 20) score += 4;
    }

    const longSentences = sentences.filter(s => s.trim().split(/\s+/).length > 35).length;
    score += Math.min(longSentences * 2, 8);

    // 4. VOCABULARY ANALYSIS (max 20 points)
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

    let formalScore = formalCount * 2.5;
    if (wordCount > 0 && wordCount < 200) {
      const formalDensity = formalCount / (wordCount / 50);
      if (formalDensity > 3) formalScore *= 1.4;
    }
    score += Math.min(formalScore, 20);

    // Adverbs
    const adverbs = ['particularly', 'significantly', 'notably', 'especially', 'specifically',
                     'certainly', 'absolutely', 'definitely', 'clearly', 'obviously'];
    let adverbCount = 0;
    adverbs.forEach(adv => {
      if (lowerText.includes(adv)) adverbCount++;
    });
    score += Math.min(adverbCount * 2, 10);

    // 5. PARAGRAPH STRUCTURE (max 10 points)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    if (paragraphs.length >= 2) {
      const paraLengths = paragraphs.map(p => p.length);
      const avgParaLength = paraLengths.reduce((a, b) => a + b, 0) / paraLengths.length;
      const paraVariance = paraLengths.reduce((sum, len) => sum + Math.pow(len - avgParaLength, 2), 0) / paraLengths.length;
      if (paraVariance < 500) score += 5;
      if (paraVariance < 200) score += 5;
    }

    // 6. PASSIVE VOICE (max 15 points)
    const passivePatterns = /\b(is|are|was|were|be|been|being)\s+\w+(ed|en)\b/gi;
    const passiveMatches = text.match(passivePatterns);
    const passiveCount = passiveMatches ? passiveMatches.length : 0;

    if (sentences.length > 0) {
      const passiveRatio = passiveCount / sentences.length;
      if (passiveRatio > 0.4) score += 15;
      else if (passiveRatio > 0.25) score += 10;
      else if (passiveRatio > 0.15) score += 5;
    }

    // 7. LIST PATTERNS (max 10 points)
    const listPatterns = /(?:first|second|third|finally|additionally|lastly)[\s,]/gi;
    const listMatches = text.match(listPatterns);
    if (listMatches) score += Math.min(listMatches.length * 2, 10);

    return Math.min(Math.round(score), 100);
  }

  /**
   * Fallback to rule-based paraphrasing if LLM fails
   */
  fallbackParaphrase(text) {
    let result = text;
    result = result.replace(/—([^—]+)—/g, '. $1.');
    result = result.replace(/—/g, '. ');
    result = result.replace(/;/g, '.');

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
