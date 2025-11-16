/**
 * Gemini-Powered Quiz Generator
 * Uses Google Gemini API (FREE!) for SMART comprehension questions
 */

const fetch = require('node-fetch');

class GeminiQuizGenerator {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    this.minimumPassScore = 70;
  }

  /**
   * Generate smart quiz using Gemini
   */
  async generateQuiz(text) {
    const prompt = `
You are a quiz generator. Read this text and create 5 comprehension questions that test true understanding.

TEXT:
${text}

REQUIREMENTS:
1. Questions should test UNDERSTANDING, not memorization
2. Mix question types: main idea, reasoning, application, inference
3. Keep questions clear and specific
4. Each question should have keywords for answer validation

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is the main purpose or focus of this text?",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "type": "main-idea"
    }
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

      // Safety check
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Unexpected Gemini response structure:', JSON.stringify(data));
        throw new Error('Unexpected response from Gemini');
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

      const quizData = JSON.parse(cleanJson);

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
      console.error('Error generating quiz with Gemini:', error);
      // Fallback to simple questions if LLM fails
      return this.generateFallbackQuiz(text);
    }
  }

  /**
   * Evaluate answers using Gemini
   */
  async evaluateAnswers(questions, userAnswers) {
    const evaluationPrompt = `
You are evaluating quiz answers. For each question and answer pair, determine if the answer demonstrates understanding.

Be LENIENT - if the answer shows they grasped the concept, mark it correct even if wording differs.

${questions.map((q, i) => `
Q${i + 1}: ${q.question}
User Answer: "${userAnswers[i] || 'NO ANSWER'}"
Keywords to look for: ${q.keywords.join(', ')}
`).join('\n')}

Return ONLY valid JSON:
{
  "results": [
    {"correct": true, "feedback": "Good understanding shown"},
    {"correct": false, "feedback": "Missing key concept: X"}
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

      // Safety check
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Unexpected Gemini response structure:', JSON.stringify(data));
        throw new Error('Unexpected response from Gemini');
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

      // Calculate score
      const correctCount = evalData.results.filter(r => r.correct).length;
      const score = Math.round((correctCount / questions.length) * 100);
      const passed = score >= this.minimumPassScore;

      return {
        score: score,
        passed: passed,
        correctCount: correctCount,
        totalQuestions: questions.length,
        results: evalData.results.map((r, i) => ({
          questionId: i + 1,
          correct: r.correct,
          userAnswer: userAnswers[i],
          feedback: r.feedback
        })),
        message: passed
          ? '🎉 Great! You grasped it. Here\'s your paraphrase.'
          : `📚 Score: ${score}%. Review and try again. Need ${this.minimumPassScore}% to unlock.`
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

      // Safety check
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        console.error('Unexpected Gemini response structure:', JSON.stringify(data));
        throw new Error('Unexpected response from Gemini');
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
   * Fallback evaluation using keyword matching
   */
  evaluateFallback(questions, userAnswers) {
    let correctCount = 0;

    const results = questions.map((q, i) => {
      const answer = (userAnswers[i] || '').toLowerCase();
      const hasKeywords = q.keywords.some(kw => answer.includes(kw.toLowerCase()));

      if (hasKeywords) correctCount++;

      return {
        questionId: q.id,
        correct: hasKeywords,
        userAnswer: userAnswers[i],
        feedback: hasKeywords ? 'Good!' : 'Try to include key concepts'
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);

    return {
      score: score,
      passed: score >= this.minimumPassScore,
      correctCount: correctCount,
      totalQuestions: questions.length,
      results: results,
      message: score >= this.minimumPassScore
        ? '🎉 You grasped it!'
        : `Score: ${score}%. Try again!`
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
