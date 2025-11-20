/**
 * DeepSeek-Powered Paraphraser
 * Uses ZION v7.1 Humanization System (0% AI Detection)
 */

const fetch = globalThis.fetch || require('node-fetch');
const { getZIONPrompt } = require('./zion-humanizer-v7');

class DeepSeekParaphraser {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
  }

  /**
   * Paraphrase text using DeepSeek with ZION v7.1
   * @param {string} text - Text to humanize
   * @param {string} tone - 'smart' or 'elite'
   */
  async paraphrase(text, tone = 'smart') {
    console.log('[DEEPSEEK] Starting ZION v7.1 humanization...');
    console.log('[DEEPSEEK] Tone:', tone);

    // Get the appropriate ZION prompt for the tone
    const systemInstruction = getZIONPrompt(tone);

    try {
      console.log('[DEEPSEEK] Calling DeepSeek API (deepseek-chat)...');
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
              content: systemInstruction
            },
            {
              role: 'user',
              content: `Humanize this text:\n\n${text}`
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
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
