/**
 * Gemini-Powered Quiz Generator
 * Uses Google Gemini API (FREE!) for SMART comprehension questions
 */

// Use native fetch (Node 18+) or node-fetch as fallback
const fetch = globalThis.fetch || require('node-fetch');

class GeminiQuizGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    this.minimumPassScore = 60; // Lowered from 70% - we want to verify they grasp content, not exam perfection
    this.maxRetries = 2; // Retry Gemini calls before falling back
  }

  /**
   * Retry wrapper for Gemini API calls
   */
  async withRetry(operation, operationName) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.log(`[QUIZ] ${operationName} attempt ${attempt}/${this.maxRetries} failed:`, error.message);

        if (attempt < this.maxRetries) {
          const delay = attempt * 500; // 500ms, 1000ms backoff
          console.log(`[QUIZ] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate smart quiz using Gemini
   */
  async generateQuiz(text) {
    console.log('[QUIZ] Starting quiz generation...');
    console.log('[QUIZ] Text length:', text.length);
    console.log('[QUIZ] API URL:', this.apiUrl.substring(0, 100) + '...');

    const prompt = `
You are a quiz generator for students. Read this text and create 2 simple comprehension questions.

TEXT:
${text}

REQUIREMENTS:
1. Questions should test if students UNDERSTOOD the content (not memorization)
2. Use SIMPLE, CLEAR language - avoid complex words like "paradox", "broader implication", "significance"
3. Ask about: main idea, what the author means, or key points
4. Make questions direct and easy to understand
5. Each question should have 3-4 keywords students might use in their answer

GOOD EXAMPLES:
- "What is this text mainly about?"
- "What does the author want you to understand?"
- "Explain the key idea in your own words"

BAD EXAMPLES (too complex):
- "What paradox does the text present?"
- "Analyze the broader implications"
- "What is the significance of..."

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is the main idea of this text?",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "type": "main-idea"
    }
  ]
}
`;

    try {
      // Wrap Gemini call with retry logic
      const quizData = await this.withRetry(async () => {
        console.log('[QUIZ] Calling Gemini API...');
        const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Robust safety checks for Gemini response
      if (!data.candidates || !data.candidates[0]) {
        console.error('[QUIZ] Gemini returned no candidates:', JSON.stringify(data));
        throw new Error('No candidates in Gemini response');
      }

      if (!data.candidates[0].content) {
        console.error('[QUIZ] Gemini candidate has no content:', JSON.stringify(data.candidates[0]));
        throw new Error('No content in Gemini candidate');
      }

      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('[QUIZ] Gemini content has no parts:', JSON.stringify(data.candidates[0].content));
        throw new Error('No parts in Gemini content');
      }

      const content = data.candidates[0].content.parts[0].text;

      // Parse JSON from response (remove markdown code blocks if present)
      let jsonText = content;

      // Remove markdown code blocks (```json ... ```)
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Extract JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse quiz JSON from Gemini response');
      }

      // Clean up the JSON (remove trailing commas before } or ])
      let cleanJson = jsonMatch[0]
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/\n/g, ' ')             // Remove newlines
        .replace(/\s+/g, ' ');           // Normalize whitespace

        const parsedQuiz = JSON.parse(cleanJson);
        return parsedQuiz;
      }, 'Quiz Generation'); // End of withRetry

      // Format and return the quiz
      return {
        questions: quizData.questions.map((q, i) => ({
          id: i + 1,
          question: q.question,
          keywords: q.keywords,
          type: q.type || 'comprehension'
        })),
        passScore: this.minimumPassScore
      };

    } catch (error) {
      console.error('[QUIZ] ERROR generating quiz with Gemini:', error.message);
      console.error('[QUIZ] Full error:', error);
      console.error('[QUIZ] Falling back to generic questions');
      // Fallback to simple questions if LLM fails
      return this.generateFallbackQuiz(text);
    }
  }

  /**
   * Evaluate answers using Gemini
   */
  async evaluateAnswers(questions, userAnswers) {
    const evaluationPrompt = `
You are evaluating quiz answers. Your goal: Did the student GRASP the content? Not exam perfection.

SCORING GUIDE (0.0-1.0):
- 1.0 = Fully grasped the concept, expressed clearly
- 0.8-0.9 = Good understanding, minor wording issues or incomplete
- 0.6-0.7 = Partial grasp, touched on key ideas but missing depth
- 0.4-0.5 = Vague understanding, some relevant points
- 0.0-0.3 = Missed the concept or no answer

Be GENEROUS with partial credit. If they show ANY understanding of the concept, give at least 0.5.

${questions.map((q, i) => `
Q${i + 1}: ${q.question}
User Answer: "${userAnswers[i] || 'NO ANSWER'}"
Key concepts to look for: ${q.keywords.join(', ')}
`).join('\n')}

Return ONLY valid JSON:
{
  "results": [
    {"score": 1.0, "feedback": "Perfect! You got it"},
    {"score": 0.7, "feedback": "Good grasp! Just missing X"}
  ]
}
`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: evaluationPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Robust safety checks for Gemini response
      if (!data.candidates || !data.candidates[0]) {
        console.error('[QUIZ] Gemini returned no candidates:', JSON.stringify(data));
        throw new Error('No candidates in Gemini response');
      }

      if (!data.candidates[0].content) {
        console.error('[QUIZ] Gemini candidate has no content:', JSON.stringify(data.candidates[0]));
        throw new Error('No content in Gemini candidate');
      }

      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('[QUIZ] Gemini content has no parts:', JSON.stringify(data.candidates[0].content));
        throw new Error('No parts in Gemini content');
      }

      const content = data.candidates[0].content.parts[0].text;

      // Parse JSON (remove markdown code blocks if present)
      let jsonText = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse evaluation JSON');
      }

      let cleanJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1').replace(/\n/g, ' ').replace(/\s+/g, ' ');
      const evalData = JSON.parse(cleanJson);

      // Calculate score using soft scoring (0.0-1.0 per question)
      const totalScore = evalData.results.reduce((sum, r) => sum + (r.score || 0), 0);
      const score = Math.round((totalScore / questions.length) * 100);
      const passed = score >= this.minimumPassScore;

      // Count how many questions had good understanding (>= 0.6)
      const goodUnderstanding = evalData.results.filter(r => r.score >= 0.6).length;

      return {
        score: score,
        passed: passed,
        correctCount: goodUnderstanding,
        totalQuestions: questions.length,
        results: evalData.results.map((r, i) => ({
          questionId: i + 1,
          score: r.score,
          correct: r.score >= 0.6, // For backwards compatibility
          userAnswer: userAnswers[i],
          feedback: r.feedback
        })),
        message: passed
          ? score >= 90 ? '🎉 Excellent! You really grasped it!' : '😊 Nice! You got it. Here\'s your paraphrase.'
          : `💪 Score: ${score}%. You're close! Review the feedback and try again. Need ${this.minimumPassScore}% to unlock.`
      };

    } catch (error) {
      console.error('Error evaluating answers with Gemini:', error);
      // Fallback to keyword matching
      return this.evaluateFallback(questions, userAnswers);
    }
  }

  /**
   * Generate flash summary using Gemini
   */
  async generateFlashSummary(text) {
    const prompt = `
Summarize the key learnings from this text in 3-5 bullet points. Be concise but capture the main ideas.

TEXT:
${text}

Return ONLY valid JSON:
{
  "keyPoints": ["point 1", "point 2", "point 3"],
  "keywords": "keyword1, keyword2, keyword3"
}
`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error response:', errorText);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Robust safety checks for Gemini response
      if (!data.candidates || !data.candidates[0]) {
        console.error('[QUIZ] Gemini returned no candidates:', JSON.stringify(data));
        throw new Error('No candidates in Gemini response');
      }

      if (!data.candidates[0].content) {
        console.error('[QUIZ] Gemini candidate has no content:', JSON.stringify(data.candidates[0]));
        throw new Error('No content in Gemini candidate');
      }

      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
        console.error('[QUIZ] Gemini content has no parts:', JSON.stringify(data.candidates[0].content));
        throw new Error('No parts in Gemini content');
      }

      const content = data.candidates[0].content.parts[0].text;

      let jsonText = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse summary JSON');
      }

      let cleanJson = jsonMatch[0].replace(/,(\s*[}\]])/g, '$1').replace(/\n/g, ' ').replace(/\s+/g, ' ');
      const summaryData = JSON.parse(cleanJson);

      return {
        keyPoints: summaryData.keyPoints,
        keywords: summaryData.keywords,
        wordCount: text.split(/\s+/).length,
        readingTime: Math.ceil(text.split(/\s+/).length / 200)
      };

    } catch (error) {
      console.error('Error generating summary with Gemini:', error);
      return this.generateFallbackSummary(text);
    }
  }

  /**
   * Fallback quiz if LLM fails
   */
  generateFallbackQuiz(text) {
    return {
      questions: [
        {
          id: 1,
          question: "What is the main topic of this text?",
          keywords: ["main", "topic", "about"],
          type: "main-idea"
        },
        {
          id: 2,
          question: "Explain one key point in your own words.",
          keywords: ["key", "point", "explain"],
          type: "comprehension"
        }
      ],
      passScore: this.minimumPassScore
    };
  }

  /**
   * Fallback evaluation using keyword matching (with soft scoring)
   */
  evaluateFallback(questions, userAnswers) {
    const results = questions.map((q, i) => {
      const answer = (userAnswers[i] || '').toLowerCase();
      const keywords = q.keywords.map(kw => kw.toLowerCase());
      const matchedKeywords = keywords.filter(kw => answer.includes(kw));

      // Soft scoring based on keyword matches
      let score = 0;
      if (!answer || answer === 'no answer') {
        score = 0.0;
      } else if (matchedKeywords.length === keywords.length) {
        score = 1.0; // All keywords present
      } else if (matchedKeywords.length >= keywords.length / 2) {
        score = 0.7; // Most keywords present
      } else if (matchedKeywords.length > 0) {
        score = 0.5; // Some keywords present
      } else if (answer.length > 10) {
        score = 0.3; // Attempted answer, no keywords
      }

      return {
        questionId: q.id,
        score: score,
        correct: score >= 0.6,
        userAnswer: userAnswers[i],
        feedback: score >= 0.9 ? 'Perfect!' :
                  score >= 0.6 ? 'Good grasp!' :
                  score >= 0.4 ? 'You\'re getting there! Try to include key concepts.' :
                  'Include key concepts from the text'
      };
    });

    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const score = Math.round((totalScore / questions.length) * 100);
    const goodUnderstanding = results.filter(r => r.score >= 0.6).length;

    return {
      score: score,
      passed: score >= this.minimumPassScore,
      correctCount: goodUnderstanding,
      totalQuestions: questions.length,
      results: results,
      message: score >= this.minimumPassScore
        ? score >= 90 ? '🎉 Excellent! You really grasped it!' : '😊 Nice! You got it. Here\'s your paraphrase.'
        : `💪 Score: ${score}%. You're close! Review the feedback and try again. Need ${this.minimumPassScore}% to unlock.`
    };
  }

  /**
   * Fallback summary
   */
  generateFallbackSummary(text) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return {
      keyPoints: sentences.slice(0, 3).map(s => s.trim()),
      keywords: "summary, key points, main ideas",
      wordCount: text.split(/\s+/).length,
      readingTime: Math.ceil(text.split(/\s+/).length / 200)
    };
  }
}

module.exports = GeminiQuizGenerator;
