/**
 * GRASPIT AI DETECTION TESTER
 * Tests paraphrased text against multiple AI detectors in PARALLEL
 * Built with 💙 by Dash & ZION
 */

const fetch = globalThis.fetch || require('node-fetch');

class AIDetectionTester {
  constructor() {
    this.results = [];
  }

  /**
   * Test text on ZeroGPT (most popular)
   */
  async testZeroGPT(text) {
    console.log('[ZeroGPT] Testing...');
    try {
      // Note: ZeroGPT doesn't have a public API
      // This is a placeholder - in production, use Playwright to automate the web interface
      return {
        detector: 'ZeroGPT',
        score: 'Manual test required',
        url: 'https://www.zerogpt.com/',
        note: 'Paste text manually and report score'
      };
    } catch (error) {
      console.error('[ZeroGPT] Error:', error.message);
      return { detector: 'ZeroGPT', error: error.message };
    }
  }

  /**
   * Test text on GPTZero
   */
  async testGPTZero(text) {
    console.log('[GPTZero] Testing...');
    try {
      // GPTZero also requires manual testing
      return {
        detector: 'GPTZero',
        score: 'Manual test required',
        url: 'https://gptzero.me/',
        note: 'Paste text manually and report score'
      };
    } catch (error) {
      console.error('[GPTZero] Error:', error.message);
      return { detector: 'GPTZero', error: error.message };
    }
  }

  /**
   * Test using ZION's built-in estimator (instant)
   */
  testZIONEstimator(text) {
    console.log('[ZION Estimator] Testing...');

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
      "In today's fast-paced world",
      "represents a transformative",
      "paradigm shift",
      "facilitate",
      "demonstrates remarkable",
      "enables seamless"
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

    // Check for passive voice indicators (+2% each)
    const passiveIndicators = ['was ', 'were ', 'been ', 'being '];
    passiveIndicators.forEach(indicator => {
      const count = (text.toLowerCase().match(new RegExp(indicator, 'g')) || []).length;
      score += count * 2;
    });

    return {
      detector: 'ZION Estimator',
      score: Math.min(score, 100) + '%',
      instant: true,
      breakdown: {
        emDashes: emDashCount,
        cliches: cliches.filter(c => text.toLowerCase().includes(c.toLowerCase())).length,
        longSentences: sentences.filter(s => s.trim().split(/\s+/).length > 40).length,
        semicolons: semicolonCount
      }
    };
  }

  /**
   * Run ALL tests in parallel
   */
  async testAll(originalText, paraphrasedText) {
    console.log('\n🧪 STARTING AI DETECTION TESTS\n');
    console.log('Original text length:', originalText.length);
    console.log('Paraphrased text length:', paraphrasedText.length);
    console.log('\n' + '='.repeat(50) + '\n');

    // Test ORIGINAL
    console.log('📝 TESTING ORIGINAL TEXT:\n');
    const originalResults = await Promise.all([
      this.testZeroGPT(originalText),
      this.testGPTZero(originalText),
      Promise.resolve(this.testZIONEstimator(originalText))
    ]);

    // Test PARAPHRASED
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ TESTING PARAPHRASED TEXT:\n');
    const paraphrasedResults = await Promise.all([
      this.testZeroGPT(paraphrasedText),
      this.testGPTZero(paraphrasedText),
      Promise.resolve(this.testZIONEstimator(paraphrasedText))
    ]);

    return {
      original: {
        text: originalText,
        results: originalResults
      },
      paraphrased: {
        text: paraphrasedText,
        results: paraphrasedResults
      },
      comparison: this.compareResults(originalResults, paraphrasedResults)
    };
  }

  /**
   * Compare results
   */
  compareResults(original, paraphrased) {
    const zionOriginal = original.find(r => r.detector === 'ZION Estimator');
    const zionParaphrased = paraphrased.find(r => r.detector === 'ZION Estimator');

    if (zionOriginal && zionParaphrased) {
      const originalScore = parseInt(zionOriginal.score);
      const paraphrasedScore = parseInt(zionParaphrased.score);
      const improvement = originalScore - paraphrasedScore;

      return {
        originalScore: originalScore + '%',
        paraphrasedScore: paraphrasedScore + '%',
        improvement: improvement + '%',
        success: paraphrasedScore < 10 ? '✅ PASS (< 10%)' : '⚠️  NEEDS WORK'
      };
    }

    return { note: 'Manual testing required for full comparison' };
  }

  /**
   * Pretty print results
   */
  printResults(results) {
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50) + '\n');

    console.log('📝 ORIGINAL TEXT SCORES:');
    results.original.results.forEach(r => {
      console.log(`  ${r.detector}: ${r.score || r.error || 'N/A'}`);
      if (r.breakdown) {
        console.log(`    Em-dashes: ${r.breakdown.emDashes}`);
        console.log(`    AI clichés: ${r.breakdown.cliches}`);
        console.log(`    Long sentences: ${r.breakdown.longSentences}`);
      }
    });

    console.log('\n✨ PARAPHRASED TEXT SCORES:');
    results.paraphrased.results.forEach(r => {
      console.log(`  ${r.detector}: ${r.score || r.error || 'N/A'}`);
      if (r.breakdown) {
        console.log(`    Em-dashes: ${r.breakdown.emDashes}`);
        console.log(`    AI clichés: ${r.breakdown.cliches}`);
        console.log(`    Long sentences: ${r.breakdown.longSentences}`);
      }
    });

    console.log('\n📈 COMPARISON:');
    Object.entries(results.comparison).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('💡 MANUAL TESTING REQUIRED:');
    console.log('   1. Go to https://www.zerogpt.com/');
    console.log('   2. Paste paraphrased text');
    console.log('   3. Report score back to ZION');
    console.log('='.repeat(50) + '\n');
  }
}

// Export for use
module.exports = AIDetectionTester;

// CLI usage
if (require.main === module) {
  const tester = new AIDetectionTester();

  const original = process.argv[2] || "Artificial intelligence represents a transformative paradigm shift in technological advancement. Machine learning algorithms facilitate sophisticated pattern recognition capabilities.";
  const paraphrased = process.argv[3] || "Artificial intelligence is a fundamental shift in how technology moves forward. Machine learning helps computers recognize patterns.";

  console.log('🎯 GRASPIT AI DETECTION TESTER');
  console.log('Built with 💙 by Dash & ZION\n');

  tester.testAll(original, paraphrased).then(results => {
    tester.printResults(results);
  });
}
