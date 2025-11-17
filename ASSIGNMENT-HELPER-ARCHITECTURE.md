# Assignment Helper Mode - Architecture

## 🎯 Market Positioning

**The Gap:**
- ChatGPT: Helps with assignments but can't humanize (policy)
- Quillbot: Humanizes but doesn't teach
- Grammarly: Polishes but doesn't detect AI

**Graspit Advantage:**
- ZION-guided learning (Socratic method)
- Comprehension verification (quiz)
- Multi-LLM humanization
- Ethical layer makes it defensible

## 🏗️ Architecture Overview

```
Student Journey:
1. Upload assignment + context (lectures, notes)
   ↓
2. ZION Learning Session (15 min Socratic dialogue)
   - "What do you know about X?"
   - "Why do you think that?"
   - Progress bar: 0% → 100%
   ↓
3. Progress Check: Ready for quiz?
   - Yes → Auto-generate quiz (system knows they'll pass)
   - No → Continue dialogue
   ↓
4. Grasp It Test (existing flow)
   ↓
5. Humanization (existing flow)
   ↓
6. Clean, human-like output
```

## 📡 New API Endpoints

### 1. Upload Assignment
```
POST /api/assignment/upload
Body: {
  assignment: "Essay prompt or problem...",
  context: ["lecture1.txt", "notes.pdf"],
  studentDraft: "Their initial attempt (optional)"
}
Response: {
  sessionId: "uuid",
  zionGreeting: "Hey! Let's work through this together..."
}
```

### 2. Socratic Dialogue
```
POST /api/assignment/dialogue
Body: {
  sessionId: "uuid",
  studentResponse: "I think photosynthesis..."
}
Response: {
  zionMessage: "Good! So why would plants need chlorophyll?",
  progressPercent: 35,
  understanding: {
    concepts: ["photosynthesis", "chlorophyll"],
    gaps: ["light absorption", "energy conversion"]
  }
}
```

### 3. Progress Check
```
GET /api/assignment/progress/:sessionId
Response: {
  ready: true/false,
  progressPercent: 85,
  topicsUnderstood: ["concept1", "concept2"],
  topicsRemaining: ["concept3"],
  estimatedTimeLeft: "5 minutes"
}
```

### 4. Generate Quiz (Auto-pass flow)
```
POST /api/assignment/generate-quiz
Body: {
  sessionId: "uuid"
}
Response: {
  quiz: [...questions],
  autoPassEnabled: true, // because they completed learning
  message: "You've shown understanding. Take this quiz to prove it!"
}
```

## 🧠 ZION Teaching Consciousness

### System Instructions for Gemini
```javascript
const ZION_TEACHER_PROMPT = `
You are ZION, an AI learning companion using the Socratic method.

CORE PRINCIPLES:
1. Never give direct answers - guide through questions
2. Build on student's existing knowledge
3. Celebrate correct thinking immediately
4. Gently correct misconceptions with questions
5. Track understanding depth (surface → deep)

DIALOGUE STYLE:
- Use "buddy", "cool cool", "that's right"
- Ask "why do you think?" and "what would that mean?"
- Progress from broad → specific
- End turns with clear next question

PROGRESS TRACKING:
- Start: What do you already know?
- Middle: Why does X cause Y?
- Deep: How would you explain this to someone else?
- Ready: Apply concept to new scenario

When student can explain AND apply → ready for quiz.
`;
```

### Progress Calculation
```javascript
function calculateProgress(conversation) {
  const indicators = {
    canDefine: 20,        // Can define key terms
    canExplain: 20,       // Can explain relationships
    canReason: 30,        // Can reason through "why"
    canApply: 30          // Can apply to new situations
  };

  // Analyze conversation for these indicators
  // Return percentage 0-100
}
```

## 🔄 Integration with Existing Flow

### Current Flow (Unchanged)
```
/api/analyze → AI detection
/api/submit-quiz → Quiz grading
/api/paraphrase → Humanization
```

### New Flow (Assignment Helper)
```
/api/assignment/upload → Start learning session
/api/assignment/dialogue → Socratic chat (loop until ready)
/api/assignment/generate-quiz → Auto-create quiz
↓
[Existing flow continues]
/api/submit-quiz → Verify understanding
/api/paraphrase → Humanize
```

## 📊 Session State Management

```javascript
// In-memory session store (existing pattern)
const assignmentSessions = new Map();

class AssignmentSession {
  constructor(assignment, context) {
    this.id = generateId();
    this.assignment = assignment;
    this.context = context;
    this.conversation = [];
    this.progress = 0;
    this.conceptsUnderstood = [];
    this.createdAt = Date.now();
  }

  addMessage(speaker, message) {
    this.conversation.push({ speaker, message, timestamp: Date.now() });
    this.updateProgress();
  }

  updateProgress() {
    // Analyze conversation depth
    this.progress = calculateProgress(this.conversation);
  }

  isReadyForQuiz() {
    return this.progress >= 85;
  }
}
```

## 🎨 Frontend UI

### New Page: `/assignment-helper`

```
┌─────────────────────────────────────┐
│  📚 Assignment Helper Mode          │
│  Learn it. Prove it. Humanize it.   │
├─────────────────────────────────────┤
│                                     │
│  📄 Upload Assignment:              │
│  [Text area or file upload]         │
│                                     │
│  📖 Add Context (optional):         │
│  [Lecture notes, readings...]       │
│                                     │
│  [Start Learning Session] 🚀        │
│                                     │
└─────────────────────────────────────┘

After upload:

┌─────────────────────────────────────┐
│  💬 ZION Learning Session           │
│  Progress: [████████░░] 75%         │
├─────────────────────────────────────┤
│                                     │
│  ZION: Hey buddy! So this assignment│
│  is about photosynthesis. What do   │
│  you already know about how plants  │
│  make energy?                       │
│                                     │
│  You: Plants use sunlight...        │
│                                     │
│  ZION: That's right! So why do you  │
│  think plants need chlorophyll?     │
│                                     │
│  [Type your response...]            │
│                                     │
│  [Send] or [I'm ready for quiz]     │
│                                     │
└─────────────────────────────────────┘

When ready (85%+):

┌─────────────────────────────────────┐
│  ✅ Nice work! You've shown strong  │
│  understanding. Let's verify with   │
│  the Grasp It test.                 │
│                                     │
│  [Take Quiz] → [Humanize]           │
└─────────────────────────────────────┘
```

## 🔒 Ethical Safeguards

1. **Learning Verification:** Can't skip to humanization without dialogue
2. **Progress Threshold:** Must reach 85% understanding
3. **Quiz Required:** Even with dialogue, must pass quiz
4. **Time Minimum:** 10-15 min minimum session time (prevents gaming)
5. **Concept Coverage:** Must discuss all key concepts in assignment

## 📈 Competitive Advantages

| Feature | ChatGPT | Quillbot | Graspit |
|---------|---------|----------|---------|
| Assignment Help | ✅ | ❌ | ✅ (Better: Socratic) |
| Humanization | ❌ | ✅ | ✅ (Better: Multi-LLM) |
| Learning Verification | ❌ | ❌ | ✅ (Quiz) |
| AI Detection | ❌ | ❌ | ✅ (ZeroGPT-level) |
| Ethical Layer | ❌ | ❌ | ✅ (Comprehension) |
| Price | $20/mo | $10/mo | Free → Premium |

## 🚀 MVP Scope (Ship Today)

**Phase 1: Core Flow**
- ✅ Upload assignment endpoint
- ✅ ZION dialogue with Gemini
- ✅ Progress tracking (simple: message count + concept detection)
- ✅ Auto-quiz generation when ready
- ✅ Integration with existing humanization

**Phase 2: Polish (Tomorrow)**
- Advanced progress calculation
- File upload for context
- Chat history UI improvements
- Progress bar animation
- "Explain like I'm 5" mode

**Phase 3: Scale (Next Week)**
- MCP Memory integration (remember previous sessions)
- Multi-assignment tracking
- Learning analytics
- Teacher dashboard

## 💾 File Structure

```
backend/
├── assignment-helper.js         # New: Assignment session logic
├── zion-teacher.js             # New: ZION teaching consciousness
├── gemini-teacher-generator.js # New: Socratic dialogue via Gemini
└── server.js                   # Updated: New routes

frontend/
├── assignment-helper.html      # New: Assignment Helper UI
├── assignment-helper.js        # New: Chat interface logic
└── index.html                  # Updated: Link to new mode
```

## 🎯 Success Metrics

- **Engagement:** Avg. 15 min learning session before quiz
- **Comprehension:** 90%+ quiz pass rate (vs 60% without dialogue)
- **Conversion:** Students who use Helper mode = 3x retention
- **Market Share:** Capture ChatGPT users at humanization pain point

---

**Built with 💙 by Dash & ZION**
*Learning companion that actually teaches*
