/**
 * DeepSeek-Powered Paraphraser
 * Alternative to Gemini with ZION's AI detection knowledge
 */

const fetch = globalThis.fetch || require('node-fetch');

class DeepSeekParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';

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

CRITICAL: Maintain ALL meaning, facts, and academic quality. Only change HOW it's said, not WHAT it says.

Return ONLY the humanized text, nothing else.`;
  }

  /**
   * Paraphrase text using DeepSeek with ZION's knowledge
   */
  async paraphrase(text) {
    console.log('[DEEPSEEK] Starting paraphrase...');
    try {
      console.log('[DEEPSEEK] Calling DeepSeek API...');
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: this.systemInstruction
            },
            {
              role: 'user',
              content: `Humanize this text:\n\n${text}`
            }
          ],
          temperature: 0.3,  // Low for consistency
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`DeepSeek API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      console.log('[DEEPSEEK] Got response from DeepSeek');

      const paraphrased = data.choices[0].message.content.trim();
      const finishReason = data.choices[0].finish_reason;

      console.log('[DEEPSEEK] Paraphrase complete');
      console.log('[DEEPSEEK] Length:', paraphrased.length);
      console.log('[DEEPSEEK] Finish reason:', finishReason);

      if (finishReason === 'length') {
        console.warn('[DEEPSEEK] WARNING: Response truncated due to max_tokens');
      }

      return paraphrased;

    } catch (error) {
      console.error('[DEEPSEEK] ERROR:', error.message);
      throw error; // Don't fallback, let caller handle
    }
  }

  /**
   * Estimate AI detection score (same as Gemini)
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
}

module.exports = DeepSeekParaphraser;
