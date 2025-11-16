/**
 * Graspit Frontend Logic
 * Handles user interactions and API calls
 */

const API_URL = 'http://localhost:3100/api';

// State management
let currentSessionId = null;
let currentQuiz = null;

// Character count for textarea
document.getElementById('inputText')?.addEventListener('input', (e) => {
  const count = e.target.value.length;
  document.getElementById('charCount').textContent = `${count} characters`;
});

/**
 * Step 1: Analyze text and get quiz
 */
async function analyzeText() {
  const text = document.getElementById('inputText').value.trim();

  if (text.length < 50) {
    showError('Please enter at least 50 characters.');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Analysis failed');
    }

    const data = await response.json();

    // Store session and quiz
    currentSessionId = data.sessionId;
    currentQuiz = data.quiz;

    // Display quiz
    displayQuiz(data.quiz);

    // Move to step 2
    showStep('step2');

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display quiz questions
 */
function displayQuiz(questions) {
  const container = document.getElementById('quizContainer');
  container.innerHTML = '';

  questions.forEach((q, index) => {
    const div = document.createElement('div');
    div.className = 'quiz-question';
    div.innerHTML = `
      <h3>Question ${q.id}</h3>
      <p>${q.question}</p>
      <input
        type="text"
        id="answer${index}"
        placeholder="Your answer..."
        autocomplete="off"
      />
    `;
    container.appendChild(div);
  });
}

/**
 * Step 2: Submit quiz answers
 */
async function submitQuiz() {
  if (!currentSessionId || !currentQuiz) {
    showError('No active quiz session');
    return;
  }

  // Collect answers
  const answers = [];
  for (let i = 0; i < currentQuiz.length; i++) {
    const answer = document.getElementById(`answer${i}`).value.trim();
    answers.push(answer);
  }

  // Check if all answered
  if (answers.some(a => !a)) {
    showError('Please answer all questions');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/submit-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        answers: answers
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Quiz submission failed');
    }

    const data = await response.json();

    // Show results
    displayQuizResults(data);

    // If passed, get paraphrase
    if (data.passed) {
      await getParaphrase();
    }

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display quiz results
 */
function displayQuizResults(results) {
  const container = document.getElementById('quizResults');
  container.className = results.passed ? 'passed' : 'failed';

  let html = `
    <h3>${results.passed ? '✅ Quiz Passed!' : '❌ Quiz Not Passed'}</h3>
    <p>Score: ${results.score}% (${results.correctCount}/${results.totalQuestions} correct)</p>
    <p>${results.message}</p>
  `;

  if (!results.passed) {
    html += '<button onclick="resetQuiz()" class="btn-secondary">Try Again</button>';
  }

  container.innerHTML = html;
}

/**
 * Step 3: Get paraphrase (if quiz passed)
 */
async function getParaphrase() {
  if (!currentSessionId) {
    showError('No active session');
    return;
  }

  showLoading(true);

  try {
    const response = await fetch(`${API_URL}/paraphrase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Paraphrase failed');
    }

    const data = await response.json();

    // Display results
    document.getElementById('originalText').textContent = data.original;
    document.getElementById('paraphrasedText').textContent = data.paraphrased;
    document.getElementById('originalScore').textContent = data.originalScore;
    document.getElementById('newScore').textContent = data.newScore;
    document.getElementById('improvement').textContent = data.improvement;

    // Move to step 3
    showStep('step3');

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Copy paraphrased text to clipboard
 */
async function copyParaphrase() {
  const text = document.getElementById('paraphrasedText').textContent;

  try {
    await navigator.clipboard.writeText(text);

    // Visual feedback
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    btn.style.background = '#4caf50';

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 2000);

  } catch (error) {
    showError('Failed to copy to clipboard');
  }
}

/**
 * Reset quiz and try again
 */
function resetQuiz() {
  showStep('step2');
  displayQuiz(currentQuiz);
  document.getElementById('quizResults').innerHTML = '';
}

/**
 * Start over with new text
 */
function startOver() {
  currentSessionId = null;
  currentQuiz = null;
  document.getElementById('inputText').value = '';
  document.getElementById('charCount').textContent = '0 characters';
  showStep('step1');
}

/**
 * Show specific step
 */
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(stepId).classList.add('active');
}

/**
 * Show/hide loading overlay
 */
function showLoading(show) {
  const loading = document.getElementById('loading');
  if (show) {
    loading.classList.add('active');
  } else {
    loading.classList.remove('active');
  }
}

/**
 * Show error message
 */
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.add('active');

  setTimeout(() => {
    errorDiv.classList.remove('active');
  }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Graspit loaded! 🎓');
  showStep('step1');
});
