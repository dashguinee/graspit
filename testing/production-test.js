/**
 * GRASPIT PRODUCTION TESTING SCRIPT
 * Tests the live Vercel deployment end-to-end
 * Built with 💙 by Dash & ZION
 */

const fetch = globalThis.fetch || require('node-fetch');
const AIDetectionTester = require('./ai-detection-tester');

const PRODUCTION_URL = 'https://graspit.vercel.app';
const LOCAL_URL = 'http://localhost:3100';

class ProductionTester {
  constructor(baseUrl = PRODUCTION_URL) {
    this.baseUrl = baseUrl;
    this.aiTester = new AIDetectionTester();
  }

  /**
   * Test full flow: analyze → quiz → paraphrase
   */
  async testFullFlow(text) {
    console.log('🎯 TESTING GRASPIT PRODUCTION FLOW\n');
    console.log('URL:', this.baseUrl);
    console.log('Text length:', text.length);
    console.log('\n' + '='.repeat(60) + '\n');

    try {
      // Step 1: Analyze and get quiz
      console.log('📝 Step 1: Analyzing text and getting quiz...');
      const analyzeRes = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!analyzeRes.ok) {
        const errorText = await analyzeRes.text();
        throw new Error(`Analyze failed: ${analyzeRes.status} - ${errorText}`);
      }

      const analyzeData = await analyzeRes.json();
      console.log('✅ Got quiz with', analyzeData.quiz.length, 'questions');
      console.log('   Session ID:', analyzeData.sessionId);
      console.log('   Pass score:', analyzeData.passScore);

      // Step 2: Submit quiz (use comprehensive answers that should pass)
      console.log('\n📚 Step 2: Submitting quiz answers...');
      // Frontend sends array of answer strings, indexed to match questions
      const answers = analyzeData.quiz.map((q, i) =>
        `This demonstrates understanding of ${q.keywords.slice(0, 2).join(' and ')}. The text discusses how ${q.keywords.join(', ')} relate to the main concepts.`
      );

      const submitRes = await fetch(`${this.baseUrl}/api/submit-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: analyzeData.sessionId,
          answers
        })
      });

      if (!submitRes.ok) {
        const errorText = await submitRes.text();
        throw new Error(`Submit quiz failed: ${submitRes.status} - ${errorText}`);
      }

      const submitData = await submitRes.json();

      console.log('📊 Quiz Results:');
      console.log('   Passed:', submitData.passed);
      console.log('   Score:', submitData.score);
      console.log('   Evaluations:', JSON.stringify(submitData.evaluations, null, 2));

      if (!submitData.passed) {
        console.log('\n⚠️  Quiz did not pass, but continuing to check paraphrase anyway...\n');
        // Don't return early - we want to see if paraphrase was generated anyway
      } else {
        console.log('✅ Quiz passed!');
        console.log('   Score:', submitData.score);
      }

      // Step 3: Check paraphrase results
      console.log('\n✨ Step 3: Analyzing paraphrase quality...\n');

      if (!submitData.paraphrase) {
        console.log('❌ No paraphrase data received (quiz must pass to get paraphrase)');
        return {
          success: false,
          reason: 'No paraphrase - quiz failed',
          data: submitData
        };
      }

      const original = submitData.paraphrase.original;
      const humanized = submitData.paraphrase.humanized;

      console.log('--- FULL ORIGINAL TEXT ---');
      console.log(original);
      console.log('\n--- FULL HUMANIZED TEXT ---');
      console.log(humanized);
      console.log('\n--- COMPARISON ---');

      // CRITICAL CHECK: Are they identical?
      if (original === humanized) {
        console.log('🚨 CRITICAL ISSUE: Paraphrased text is IDENTICAL to original!');
        console.log('   This is the bug we\'re tracking.\n');
        return {
          success: false,
          reason: 'Paraphrase returned identical text',
          data: submitData,
          original,
          humanized
        };
      }

      // Run AI detection tests
      console.log('🧪 Running AI detection tests...\n');
      const testResults = await this.aiTester.testAll(original, humanized);

      this.aiTester.printResults(testResults);

      return {
        success: true,
        data: submitData,
        testResults,
        original,
        humanized
      };

    } catch (error) {
      console.error('❌ ERROR:', error.message);
      console.error('\nFull error:', error);
      return {
        success: false,
        reason: error.message,
        error
      };
    }
  }

  /**
   * Compare production vs local
   */
  async compareProductionVsLocal(text) {
    console.log('🔬 COMPARING PRODUCTION VS LOCAL\n');
    console.log('='.repeat(60) + '\n');

    console.log('Testing PRODUCTION (Vercel)...\n');
    const prodTester = new ProductionTester(PRODUCTION_URL);
    const prodResults = await prodTester.testFullFlow(text);

    console.log('\n' + '='.repeat(60));
    console.log('\nTesting LOCAL (localhost:3100)...\n');
    const localTester = new ProductionTester(LOCAL_URL);
    const localResults = await localTester.testFullFlow(text);

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARISON SUMMARY');
    console.log('='.repeat(60) + '\n');

    console.log('PRODUCTION:');
    console.log('  Success:', prodResults.success ? '✅' : '❌');
    console.log('  Reason:', prodResults.reason || 'Working correctly');
    if (prodResults.humanized) {
      console.log('  Text changed:', prodResults.original !== prodResults.humanized ? '✅' : '❌');
    }

    console.log('\nLOCAL:');
    console.log('  Success:', localResults.success ? '✅' : '❌');
    console.log('  Reason:', localResults.reason || 'Working correctly');
    if (localResults.humanized) {
      console.log('  Text changed:', localResults.original !== localResults.humanized ? '✅' : '❌');
    }

    console.log('\n' + '='.repeat(60));

    return { prodResults, localResults };
  }
}

// CLI usage
if (require.main === module) {
  const testText = process.argv[2] || `Artificial intelligence represents a transformative paradigm shift in technological advancement. Machine learning algorithms facilitate sophisticated pattern recognition capabilities—enabling seamless integration of cognitive processes. Furthermore, these systems demonstrate remarkable ability to process complex data patterns; consequently, they're revolutionizing multiple industries. It's worth noting that the paradigm shift encompasses not just technical improvements but also fundamental changes in how we approach problem-solving.`;

  const mode = process.argv[3] || 'production'; // 'production', 'local', or 'compare'

  if (mode === 'compare') {
    const tester = new ProductionTester();
    tester.compareProductionVsLocal(testText).then(results => {
      console.log('\n✅ Comparison complete!');
      process.exit(results.prodResults.success && results.localResults.success ? 0 : 1);
    });
  } else {
    const url = mode === 'local' ? LOCAL_URL : PRODUCTION_URL;
    const tester = new ProductionTester(url);
    tester.testFullFlow(testText).then(result => {
      console.log('\n' + '='.repeat(60));
      console.log(result.success ? '✅ TEST PASSED!' : '❌ TEST FAILED!');
      console.log('='.repeat(60) + '\n');
      process.exit(result.success ? 0 : 1);
    });
  }
}

module.exports = ProductionTester;
