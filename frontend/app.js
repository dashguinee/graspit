/**
 * Graspit Frontend Logic
 * "You gotta grasp it before re-write it"
 * Built with 💙 by Dash & ZION
 */

const API_URL = '/api';

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
 * Display quiz results, flash summary, and paraphrase
 */
function displayQuizResults(results) {
  if (results.passed) {
    // Show flash summary
    displayFlashSummary(results.flashSummary);

    // Display paraphrase
    displayParaphrase(results.paraphrase);

    // Start countdown timer
    startCountdown(results.payment.timeRemaining);

    // Move to results page
    showStep('step3');
  } else {
    // Quiz failed - show error and let them try again
    showError(`Quiz not passed (${results.score}%). ${results.feedback || 'Try answering with more detail about the key concepts.'}`);
  }
}

/**
 * Display flash summary of key learnings
 */
function displayFlashSummary(summary) {
  const container = document.getElementById('flashSummary');

  const keyPoints = summary.keyPoints.map(point => `<li>${point}</li>`).join('');

  container.innerHTML = `
    <h3>📖 Key Points You Should Remember:</h3>
    <ul>${keyPoints}</ul>
    <div class="keywords">
      <strong>Keywords:</strong> ${summary.keywords}
    </div>
    <div class="keywords">
      <strong>Reading time:</strong> ~${summary.readingTime} min | <strong>Word count:</strong> ${summary.wordCount}
    </div>
  `;
}

/**
 * Display paraphrase results
 */
function displayParaphrase(paraphrase) {
  document.getElementById('originalText').textContent = paraphrase.original;
  document.getElementById('paraphrasedText').textContent = paraphrase.humanized;
  document.getElementById('originalScore').textContent = paraphrase.originalScore;
  document.getElementById('newScore').textContent = paraphrase.newScore;
  document.getElementById('improvement').textContent = paraphrase.improvement;
}

/**
 * Start 30-minute countdown timer
 */
let countdownInterval = null;

function startCountdown(seconds) {
  let remaining = seconds;

  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  // Update immediately
  updateCountdownDisplay(remaining);

  // Update every second
  countdownInterval = setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      clearInterval(countdownInterval);
      document.getElementById('countdown').textContent = '⏰ TIME\'S UP!';
      document.getElementById('countdown').style.color = '#d32f2f';
    } else {
      updateCountdownDisplay(remaining);
    }
  }, 1000);
}

/**
 * Update countdown display
 */
function updateCountdownDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = `${minutes}:${secs.toString().padStart(2, '0')}`;

  document.getElementById('countdown').textContent = display;

  // Change color when time is running low
  if (seconds < 300) { // Less than 5 minutes
    document.getElementById('countdown').style.color = '#d32f2f';
  } else if (seconds < 600) { // Less than 10 minutes
    document.getElementById('countdown').style.color = '#ff6f00';
  }
}

// getParaphrase function removed - paraphrase happens automatically after quiz now

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
  // Clear countdown timer
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

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
