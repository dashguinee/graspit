/**
 * Multi-LLM Paraphraser
 * Tests BOTH Gemini and DeepSeek, picks the best result
 * Built with 💙 by Dash & ZION
 */

const GeminiParaphraser = require('./gemini-paraphraser');
const DeepSeekParaphraser = require('./deepseek-paraphraser');

class MultiLLMParaphraser {
  constructor(geminiKey, deepseekKey) {
    this.gemini = new GeminiParaphraser(geminiKey);
    this.deepseek = deepseekKey ? new DeepSeekParaphraser(deepseekKey) : null;
  }

  /**
   * Run BOTH LLMs in parallel and pick the best result
   * @param {string} text - Text to humanize
   * @param {string} tone - 'smart' or 'elite' (default: 'elite' for 0% AI)
   */
  async paraphrase(text, tone = 'elite') {
    console.log('[MULTI-LLM] Starting parallel paraphrasing...');
    console.log('[MULTI-LLM] Tone:', tone);

    const promises = [
      this.gemini.paraphrase(text, tone).catch(err => ({
        error: true,
        source: 'gemini',
        message: err.message
      }))
    ];

    // Add DeepSeek if available
    if (this.deepseek) {
      promises.push(
        this.deepseek.paraphrase(text, tone).catch(err => ({
          error: true,
          source: 'deepseek',
          message: err.message
        }))
      );
    }

    const results = await Promise.all(promises);

    console.log('[MULTI-LLM] Got', results.length, 'results');

    // Filter out errors
    const validResults = results.filter(r => !r.error);

    if (validResults.length === 0) {
      console.error('[MULTI-LLM] All LLMs failed!');
      throw new Error('All paraphrasing LLMs failed');
    }

    // Score each result
    const scoredResults = validResults.map((result, i) => {
      const aiScore = this.gemini.estimateAIScore(result);
      const source = i === 0 ? 'gemini' : 'deepseek';

      console.log(`[MULTI-LLM] ${source.toUpperCase()}: ${aiScore}% AI`);

      return {
        text: result,
        aiScore,
        source,
        length: result.length
      };
    });

    // Pick the one with lowest AI score
    scoredResults.sort((a, b) => a.aiScore - b.aiScore);
    const best = scoredResults[0];

    console.log(`[MULTI-LLM] Winner: ${best.source.toUpperCase()} with ${best.aiScore}% AI`);

    return best.text;
  }

  /**
   * Estimate AI detection score
   */
  estimateAIScore(text) {
    return this.gemini.estimateAIScore(text);
  }
}

module.exports = MultiLLMParaphraser;
