/**
 * Graspit Frontend Logic
 * "You gotta grasp it before re-write it"
 * Built with 💙 by Dash & ZION
 */

const API_URL = '/api';

// State management
let currentSessionId = null;
let currentQuiz = null;

// Character and word count for textarea
document.getElementById('inputText')?.addEventListener('input', (e) => {
  const text = e.target.value;
  const charCount = text.length;
  const wordCount = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;

  document.getElementById('charCount').textContent = `${charCount} characters`;
  document.getElementById('wordCount').textContent = `${wordCount} words`;
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

  showLoading(true, '🎯 Analyzing text & generating quiz...');

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

    // Backup session to localStorage (survives serverless restarts)
    localStorage.setItem('graspit_session', JSON.stringify({
      sessionId: data.sessionId,
      originalText: text,
      quiz: data.quiz,
      originalScore: data.originalScore,
      timestamp: Date.now()
    }));

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

  showLoading(true, '✨ Evaluating answers & humanizing text...');

  try {
    // Get session backup from localStorage
    const sessionBackup = JSON.parse(localStorage.getItem('graspit_session') || 'null');

    const response = await fetch(`${API_URL}/submit-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: currentSessionId,
        answers: answers,
        // Include backup data for session recovery
        backup: sessionBackup ? {
          originalText: sessionBackup.originalText,
          quiz: sessionBackup.quiz,
          originalScore: sessionBackup.originalScore
        } : null
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Quiz submission failed');
    }

    const data = await response.json();

    // Show results
    displayQuizResults(data);

    // Paraphrase is already included in response when passed
    // No need to call getParaphrase() separately

  } catch (error) {
    // Check for session expiration
    if (error.message.includes('expired') || error.message.includes('not found')) {
      showPersistentError('⚠️ Session expired. Please start over with new text.', () => startOver());
    } else {
      showError(error.message);
    }
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
    // Quiz failed - show detailed feedback with retry option
    const message = results.message || `Score: ${results.score}%. Need ${results.passScore || 60}% to pass.`;
    const feedbackHtml = results.results ? results.results.map(r =>
      `<div style="margin: 10px 0; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px;">
        <strong>Q${r.questionId}:</strong> ${r.feedback} ${r.correct ? '✅' : '❌'}
      </div>`
    ).join('') : '';

    showPersistentError(
      `❌ ${message}<br><br>${feedbackHtml}<br>Review the feedback and try again!`,
      resetQuiz
    );
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
  // Display text
  document.getElementById('originalText').textContent = paraphrase.original;
  document.getElementById('paraphrasedText').textContent = paraphrase.humanized;

  // Display AI scores
  document.getElementById('originalScore').textContent = paraphrase.originalScore;
  document.getElementById('newScore').textContent = paraphrase.newScore;
  document.getElementById('improvement').textContent = paraphrase.improvement;

  // Calculate and display word counts
  const originalWords = paraphrase.original.trim().split(/\s+/).length;
  const humanizedWords = paraphrase.humanized.trim().split(/\s+/).length;
  const wordDiff = humanizedWords - originalWords;
  const wordDiffPercent = ((wordDiff / originalWords) * 100).toFixed(1);

  document.getElementById('originalWordCount').textContent = `${originalWords} words`;
  document.getElementById('humanizedWordCount').textContent = `${humanizedWords} words`;

  // Show word difference with appropriate formatting
  const diffSign = wordDiff > 0 ? '+' : '';
  const diffText = `${diffSign}${wordDiff} words (${diffSign}${wordDiffPercent}%)`;
  document.getElementById('wordDifference').textContent = diffText;

  // Save to history
  saveResultToHistory(paraphrase);
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
  document.getElementById('wordCount').textContent = '0 words';
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
 * Show/hide loading overlay with custom message
 */
function showLoading(show, message = 'Processing...') {
  const loading = document.getElementById('loading');
  if (show) {
    // Update loading message
    const loadingText = loading.querySelector('p');
    if (loadingText) {
      loadingText.textContent = message;
    }
    loading.classList.add('active');
  } else {
    loading.classList.remove('active');
  }
}

/**
 * Show error message (auto-dismiss after 5s)
 */
function showError(message) {
  const errorDiv = document.getElementById('error');
  errorDiv.textContent = message;
  errorDiv.classList.add('active');

  setTimeout(() => {
    errorDiv.classList.remove('active');
  }, 5000);
}

/**
 * Show persistent error with action button
 */
function showPersistentError(message, action) {
  const errorDiv = document.getElementById('error');
  errorDiv.innerHTML = `
    ${message}
    <button onclick="this.parentElement.classList.remove('active'); ${action ? action.name + '()' : ''}"
            style="margin-left: 10px; padding: 5px 15px; background: #fff; color: #d32f2f; border: 1px solid #fff; border-radius: 4px; cursor: pointer;">
      Start Over
    </button>
  `;
  errorDiv.classList.add('active');
  // Don't auto-dismiss persistent errors
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('Graspit loaded! 🎓');
  showStep('step1');

  // Load saved draft if exists
  const draft = GraspitStorage.getDraft();
  if (draft && draft.text) {
    document.getElementById('inputText').value = draft.text;
    // Update counts
    const charCount = draft.text.length;
    const wordCount = draft.text.trim().length > 0 ? draft.text.trim().split(/\s+/).length : 0;
    document.getElementById('charCount').textContent = `${charCount} characters`;
    document.getElementById('wordCount').textContent = `${wordCount} words`;
  }

  // Auto-save draft on input
  const prefs = GraspitStorage.getPreferences();
  if (prefs.autoSave) {
    document.getElementById('inputText').addEventListener('input', debounce((e) => {
      GraspitStorage.saveDraft(e.target.value);
    }, 1000));
  }
});

/**
 * Debounce helper
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Run AI detector on input text
 */
async function runDetector() {
  const text = document.getElementById('inputText').value.trim();

  if (text.length < 50) {
    showError('Please enter at least 50 characters to analyze.');
    return;
  }

  // Show loading for LLM analysis
  showLoading(true, '🔍 Deep scanning for AI patterns...');

  try {
    const response = await fetch(`${API_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Detection failed');
    }

    const result = await response.json();
    displayDetectorResults(result);
    openDetectorModal();

  } catch (error) {
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

/**
 * Display detector results in modal
 */
function displayDetectorResults(result) {
  const container = document.getElementById('detectorResults');

  // Determine color based on score
  let scoreColor;
  if (result.score >= 50) scoreColor = '#d32f2f';
  else if (result.score >= 25) scoreColor = '#ff6f00';
  else if (result.score >= 10) scoreColor = '#ffc107';
  else scoreColor = '#4caf50';

  let html = `
    <div class="detector-score" style="background: ${scoreColor}20;">
      <div class="detector-score-number" style="color: ${scoreColor};">${result.score}%</div>
      <div class="detector-score-label" style="color: ${scoreColor};">${result.verdict}</div>
    </div>
  `;

  // Flags with excerpts
  if (result.flags && result.flags.length > 0) {
    html += '<div class="detector-flags"><h3>Issues Found:</h3>';

    result.flags.forEach(flag => {
      html += `
        <div class="detector-flag ${flag.severity}">
          <div class="detector-flag-header">
            <span class="detector-flag-name">${flag.name}</span>
            <span class="detector-flag-severity">${flag.severity}</span>
          </div>
          ${flag.excerpt ? `
            <div class="detector-flag-excerpt">"${flag.excerpt}"</div>
          ` : ''}
          ${flag.suggestion ? `
            <div class="detector-flag-suggestion">💡 ${flag.suggestion}</div>
          ` : ''}
        </div>
      `;
    });

    html += '</div>';
  } else {
    html += '<div class="detector-clean"><p>✅ No significant AI patterns detected!</p></div>';
  }

  container.innerHTML = html;
}

/**
 * Open detector modal
 */
function openDetectorModal() {
  document.getElementById('detectorModal').classList.add('active');
}

/**
 * Close detector modal
 */
function closeDetectorModal() {
  document.getElementById('detectorModal').classList.remove('active');
}

/**
 * Open history modal
 */
function openHistoryModal() {
  renderHistory();
  document.getElementById('historyModal').classList.add('active');
}

/**
 * Close history modal
 */
function closeHistoryModal() {
  document.getElementById('historyModal').classList.remove('active');
}

/**
 * Render history list
 */
function renderHistory() {
  const container = document.getElementById('historyList');
  const history = GraspitStorage.getHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <p>No history yet.</p>
        <p>Your humanized texts will appear here.</p>
      </div>
    `;
    return;
  }

  let html = '';

  history.forEach(entry => {
    const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const preview = entry.humanized.substring(0, 100) + (entry.humanized.length > 100 ? '...' : '');

    html += `
      <div class="history-item" onclick="loadHistoryEntry(${entry.id})">
        <div class="history-item-header">
          <span class="history-item-date">${date}</span>
          <span class="history-item-score">${entry.improvement} improvement</span>
        </div>
        <div class="history-item-preview">${preview}</div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Load history entry into results
 */
function loadHistoryEntry(id) {
  const entry = GraspitStorage.getHistoryEntry(id);
  if (!entry) return;

  // Display in results
  document.getElementById('originalText').textContent = entry.original;
  document.getElementById('paraphrasedText').textContent = entry.humanized;
  document.getElementById('originalScore').textContent = entry.originalScore;
  document.getElementById('newScore').textContent = entry.newScore;
  document.getElementById('improvement').textContent = entry.improvement;

  // Word counts
  const originalWords = entry.original.split(/\s+/).length;
  const humanizedWords = entry.humanized.split(/\s+/).length;
  document.getElementById('originalWordCount').textContent = `${originalWords} words`;
  document.getElementById('humanizedWordCount').textContent = `${humanizedWords} words`;

  const wordDiff = humanizedWords - originalWords;
  const diffSign = wordDiff > 0 ? '+' : '';
  document.getElementById('wordDifference').textContent = `${diffSign}${wordDiff} words`;

  // Close modal and show results
  closeHistoryModal();
  showStep('step3');
}

/**
 * Save result to history (called after successful humanization)
 */
function saveResultToHistory(paraphrase) {
  GraspitStorage.saveToHistory({
    original: paraphrase.original,
    humanized: paraphrase.humanized,
    originalScore: paraphrase.originalScore,
    newScore: paraphrase.newScore,
    improvement: paraphrase.improvement,
    wordCount: paraphrase.humanized.split(/\s+/).length
  });

  // Clear draft since we completed
  GraspitStorage.clearDraft();
}

// Close modals on outside click
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});

// Close modals on Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.active').forEach(modal => {
      modal.classList.remove('active');
    });
  }
});
