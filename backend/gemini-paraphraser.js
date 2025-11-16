/**
 * Gemini-Powered Paraphraser
 * Encodes ZION's AI detection knowledge into Google Gemini (FREE!)
 */

class GeminiParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // ZION's knowledge encoded as system instruction
    this.systemInstruction = `You are an expert at humanizing AI-generated text to pass AI detection.

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

CRITICAL: Maintain ALL meaning, facts, and academic quality. Only change HOW it's said, not WHAT it says.

Return ONLY the humanized text, nothing else.`;
  }

  /**
   * Paraphrase text using Gemini with ZION's knowledge
   */
  async paraphrase(text) {
    try {
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
            temperature: 0.7,
            maxOutputTokens: 2000
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const paraphrased = data.candidates[0].content.parts[0].text.trim();

      return paraphrased;

    } catch (error) {
      console.error('Error paraphrasing with Gemini:', error);
      // Fallback to rule-based if LLM fails
      return this.fallbackParaphrase(text);
    }
  }

  /**
   * Estimate AI detection score
   */
  estimateAIScore(text) {
    let score = 0;

    // Check for em-dashes (+15% each)
    const emDashCount = (text.match(/—/g) || []).length;
    score += emDashCount * 15;

    // Check for AI clichés (+10% each)
    const cliches = [
      "Here's where it gets interesting",
      "Here's the thing",
      "Let's dive into",
      "It's worth noting",
      "In today's fast-paced world"
    ];
    cliches.forEach(cliche => {
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
