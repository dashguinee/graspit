/**
 * Multi-LLM Paraphraser
 * Now APEX V9 only - DeepSeek disabled (APEX requires specific Gemini config)
 * Built with 💙 by Dash & ZION
 */

const GeminiParaphraser = require('./gemini-paraphraser');

class MultiLLMParaphraser {
  constructor(geminiKey, deepseekKey) {
    this.gemini = new GeminiParaphraser(geminiKey);
    // DeepSeek disabled - APEX V9 is Gemini-specific
    // this.deepseek = deepseekKey ? new DeepSeekParaphraser(deepseekKey) : null;
  }

  /**
   * Paraphrase using APEX V9
   * @param {string} text - Text to humanize
   * @param {string} tone - 'apex' (default) or 'apex-academic'
   */
  async paraphrase(text, tone = 'apex') {
    console.log('[MULTI-LLM] Using APEX V9 (Gemini 1.5 Pro-002)');
    console.log('[MULTI-LLM] Tone:', tone);

    return await this.gemini.paraphrase(text, tone);
  }

  /**
   * Estimate AI detection score
   */
  estimateAIScore(text) {
    return this.gemini.estimateAIScore(text);
  }
}

module.exports = MultiLLMParaphraser;
