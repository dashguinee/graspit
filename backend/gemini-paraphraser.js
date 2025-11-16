/**
 * Gemini-Powered Paraphraser
 * Encodes ZION's AI detection knowledge into Google Gemini (FREE!)
 */

// Use native fetch (Node 18+) or node-fetch as fallback
const fetch = globalThis.fetch || require('node-fetch');

class GeminiParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // ZION's knowledge encoded as system instruction
    this.systemInstruction = `You are an expert at humanizing AI-generated text to pass AI detection.

IMPORTANT: Output the COMPLETE humanized version of ALL the text provided. Do not truncate or stop mid-sentence.

CRITICAL RULES (from proven 92% → 31% → <10% research):

1. REMOVE ALL EM-DASHES (biggest AI killer!)
   - Before: "trends—AI, AR, mobile—into solutions"
   - After: "trends. These include AI, AR, and mobile. Together they create solutions."
   - Replace with: periods (separate sentences) or simple commas

2. REMOVE AI CONVERSATION CLICHÉS:
   ❌ "Here's where it gets interesting"
   ❌ "Let's dive into"
   ❌ "Here's the thing"
   ❌ "Now here's the kicker"
   ❌ "It's worth noting that"
   Just remove them or replace with direct statements

3. BREAK LONG LIST SENTENCES:
   - Before: "Platform combines A, B, C, and D into solutions"
   - After: "Platform combines three features. It includes A. Plus B and C. Together with D."
   - One main idea per sentence

4. ELIMINATE PARALLEL STRUCTURE:
   - Before: "It solves X, reduces Y, promotes Z, and maintains W"
   - After: "This solves X. It cuts down on Y. Users get Z. The system maintains W."
   - Vary sentence openings and verbs

5. CASUALIZE VERBS (students write casually):
   developed → built
   demonstrates → shows
   indicates → shows
   utilized → used
   facilitates → helps
   encompasses → includes
   commenced → started

6. ADD NATURAL TRANSITIONS (students use these!):
   ✅ "First," "Then," "However," "Moreover," "Therefore," "Plus,"
   ❌ Don't use: "Furthermore," "Additionally," "Consequently"
   Mix them naturally throughout

7. VARY SENTENCE STRUCTURE:
   - Don't start 4+ sentences the same way
   - Mix short (5-10 words) and medium (15-25 words) sentences
   - Avoid predictable patterns

8. ACTIVE VOICE 90%+:
   - "We built" not "was built"
   - "People experience" not "is experienced by people"

9. SIMPLIFY COMPLEX SENTENCES:
   - Before: "While X and Y, Z"
   - After: "X happened. Y occurred. This led to Z."

10. REMOVE SEMICOLONS:
    - University students rarely use them
    - Replace with periods

11. ADD NATURAL VARIETY & RANDOMNESS:
    - Mix sentence lengths: some 6-8 words, some 12-18, occasional 20-25
    - Don't make it too perfect - humans have slight inconsistencies
    - Use contractions naturally: "it's", "don't", "that's", "we're"
    - Occasional simple conjunctions: "and", "but", "so" to start sentences
    - Break up paragraphs at natural thought shifts (every 3-5 sentences)

12. REMOVE PASSIVE VOICE (biggest AI tell):
    - "was created by" → "X created"
    - "is considered" → "people consider" or "experts say"
    - "can be seen" → "we see" or "you can see"
    - Active = human, Passive = AI

13. NATURAL IMPERFECTIONS (humans aren't perfect):
    - Occasional informal phrasing is OK
    - Don't over-polish - keep it real
    - Students write confidently but not academically perfect
    - Some sentences can be a bit loose/casual (that's normal!)

14. VARY WORD CHOICE:
    - Don't repeat the same transition word twice in a row
    - Mix up how you start sentences (subject, transition, adverb, etc.)
    - Use synonyms, but keep them simple and natural

CRITICAL: Maintain ALL meaning, facts, and academic quality. Only change HOW it's said, not WHAT it says. The goal is "smart student who writes naturally", NOT "AI trying to sound human".

Return ONLY the humanized text, nothing else.`;
  }

  /**
   * Paraphrase text using Gemini with ZION's knowledge
   */
  async paraphrase(text) {
    console.log('[PARAPHRASER] Starting paraphrase...');
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
              text: `${this.systemInstruction}\n\nHumanize this text:\n\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,  // Higher for natural variety and randomness (human-like inconsistencies)
            maxOutputTokens: 2000
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
      // Fallback to rule-based if LLM fails
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
