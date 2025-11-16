/**
 * Quick test for Graspit engines
 */

const ParaphraseEngine = require('./paraphrase-engine');
const QuizGenerator = require('./quiz-generator');

console.log('🧪 Testing Graspit Engines...\n');

// Test text (from Dash's assignment)
const testText = `
Here's where it gets interesting—instead of picking just one, we realized these three ideas complement each other perfectly. Therefore, OOTDly combines all three into one integrated platform with automatic wardrobe digitization, AR-powered virtual try-on, and intelligent shopping recommendations. It solves wardrobe blindness, reduces those annoying online shopping returns, promotes sustainable consumption, and maintains business viability through affiliate revenue.
`;

console.log('📝 Original Text:');
console.log(testText.trim());
console.log('\n' + '='.repeat(60) + '\n');

// Test Paraphrase Engine
const paraphraser = new ParaphraseEngine();

const originalScore = paraphraser.estimateAIScore(testText);
console.log(`🤖 Original AI Score: ${originalScore}%\n`);

const paraphrased = paraphraser.paraphrase(testText);
const newScore = paraphraser.estimateAIScore(paraphrased);

console.log('✨ Paraphrased Text:');
console.log(paraphrased);
console.log('\n' + '='.repeat(60) + '\n');

console.log(`🎯 New AI Score: ${newScore}%`);
console.log(`📊 Improvement: ${originalScore - newScore}% less AI-like\n`);

console.log('='.repeat(60) + '\n');

// Test Quiz Generator
const quizGen = new QuizGenerator();

const quiz = quizGen.generateQuiz(testText);

console.log('📚 Generated Quiz:');
console.log(`   Questions: ${quiz.questions.length}`);
console.log(`   Pass Score: ${quiz.passScore}%\n`);

quiz.questions.forEach((q, i) => {
  console.log(`Q${i + 1}: ${q.question}`);
  console.log(`   Type: ${q.type}`);
  console.log(`   Concept: ${q.concept}\n`);
});

console.log('='.repeat(60));
console.log('✅ All tests completed!');
console.log('🚀 Run `npm start` to launch the server.');
