# 🎓 Graspit

**"You gotta grasp it before you write it."**

An AI paraphraser with Smart Recap - forces understanding before humanizing text.

## What It Does

1. **Analyze**: Paste AI-generated text
2. **Quiz**: Answer comprehension questions to prove you understand
3. **Paraphrase**: Get human-like version (only if you pass the quiz)

## Why It Works

Built from real AI detection research:
- **92% → 31%** AI detection reduction proven
- All techniques codified into algorithm
- Ethical positioning: Learning tool, not cheating

## The Algorithm

Based on discovered patterns:
- ❌ Remove em-dashes (biggest killer)
- ❌ Remove AI conversation clichés
- ✅ Break long list sentences
- ✅ Eliminate parallel structures
- ✅ Vary sentence openings
- ✅ Casualize verbs (built > developed)
- ✅ Remove semicolons

## Quick Start

```bash
# Install dependencies
cd backend
npm install

# Start server
npm start

# Open browser
http://localhost:3100
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JS
- **Algorithm**: Custom paraphrase engine
- **Quiz**: Smart Recap generator

## API Endpoints

- `POST /api/analyze` - Submit text, get quiz
- `POST /api/submit-quiz` - Submit quiz answers
- `POST /api/paraphrase` - Get paraphrase (if passed)
- `GET /api/health` - Health check

## Flow

```
User Input → Generate Quiz → Evaluate Answers → Pass? → Paraphrase
                                                ↓ Fail
                                            Try Again
```

## Future Enhancements

- [ ] React frontend
- [ ] Database for sessions
- [ ] User accounts
- [ ] Payment integration (Stripe)
- [ ] Extended learning modules (paid feature)
- [ ] API integration for ZeroGPT detection
- [ ] Mobile app

## Target Market

Sunway University students (pilot)
- ~20,000 potential users
- $5-10/month subscription model
- Smart Recap as unique differentiator

## Built By

**Dash & ZION** - November 2025

From assignment challenge to real product in 30 minutes. 🚀
