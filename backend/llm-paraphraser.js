/**
 * LLM-Powered Paraphraser (DeepSeek)
 * Uses ZION v7.1 Humanization System (0% AI Detection)
 */

const fetch = require('node-fetch');
const { getZIONPrompt } = require('./zion-humanizer-v7');

class LLMParaphraser {
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
    const systemPrompt = getZIONPrompt(tone);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Humanize this text:\n\n${text}` }
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
      const paraphrased = data.choices[0].message.content.trim();

      console.log('[DEEPSEEK] Paraphrase complete');
      return paraphrased;

    } catch (error) {
      console.error('[DEEPSEEK] Error:', error.message);
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

module.exports = LLMParaphraser;
