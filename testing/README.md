# AI Detector Testing Suite

Automated testing framework for validating Graspit's humanization effectiveness against industry-standard AI detectors (ZeroGPT, GPTZero).

## 🚀 Quick Start - GitHub Actions (RECOMMENDED)

**Zero local setup required! Run tests directly on GitHub.**

### Option 1: Manual Trigger
1. Go to your repo: `https://github.com/YOUR_USERNAME/graspit/actions`
2. Click "AI Detector Testing" workflow
3. Click "Run workflow"
4. Select sample: `heavy`, `medium`, or `all`
5. Click "Run workflow" button
6. Wait ~5 minutes for results
7. Download artifacts (screenshots + JSON results)

### Option 2: Scheduled (Weekly)
Tests run automatically every Sunday at 00:00 UTC.

### Option 3: Claude.ai Integration
```
Hey Claude, run AI detector tests on GitHub Actions for the graspit repo
```
Claude.ai can trigger the workflow and analyze results without touching your local machine!

---

## 📦 What Gets Tested

### Heavy AI Sample (Academic Style)
- **Expected Original Score**: 80-95% AI
- **Target Humanized Score**: <25% AI
- **Key Indicators**: Em-dashes, formal vocab, passive voice, AI clichés

### Medium AI Sample (Blog Style)
- **Expected Original Score**: 50-70% AI
- **Target Humanized Score**: <20% AI
- **Key Indicators**: AI clichés, formal transitions, predictable structure

---

## 🛠️ Local Testing (Optional)

### Prerequisites
```bash
# Python 3.11+
python3 --version

# Install dependencies
pip install -r testing/requirements.txt

# Chrome browser (auto-installed in GitHub Actions)
```

### Run Tests
```bash
# Test heavy AI sample
python testing/test-ai-detectors.py --sample heavy

# Test medium AI sample
python testing/test-ai-detectors.py --sample medium

# Test all samples
python testing/test-ai-detectors.py --all

# Run with visible browser (no headless)
python testing/test-ai-detectors.py --sample heavy --no-headless
```

---

## 📊 Results Format

### JSON Output (`testing/results/*.json`)
```json
{
  "sample": "heavy",
  "sample_name": "Heavy AI (Academic)",
  "timestamp": "2025-11-17T12:00:00",
  "original_text": "...",
  "humanized_text": "...",
  "zerogpt": {
    "original": {
      "score": "92%",
      "screenshot": "path/to/screenshot.png",
      "success": true
    },
    "humanized": {
      "score": "18%",
      "screenshot": "path/to/screenshot.png",
      "success": true
    }
  },
  "gptzero": {
    "original": {
      "result": "HIGH AI probability",
      "screenshot": "path/to/screenshot.png",
      "success": true
    },
    "humanized": {
      "result": "LOW AI probability",
      "screenshot": "path/to/screenshot.png",
      "success": true
    }
  }
}
```

### Screenshots
All detection results are screenshotted and saved to `testing/results/screenshots/`

---

## 🎯 Success Criteria

**ZeroGPT**:
- ✅ Original: 80-95% AI detected
- ✅ Humanized: <25% AI detected
- ✅ Improvement: 60+ point reduction

**GPTZero**:
- ✅ Original: HIGH AI probability
- ✅ Humanized: LOW/MIXED probability
- ✅ Clear downgrade in AI confidence

---

## 🤖 GitHub Actions Workflow

### Features:
- ✅ Parallel test execution (heavy + medium simultaneously)
- ✅ Headless Chrome (no GUI needed)
- ✅ Auto-upload results as artifacts
- ✅ 30-day artifact retention
- ✅ Weekly scheduled runs
- ✅ Manual trigger via web UI
- ✅ Claude.ai compatible

### Workflow File
`.github/workflows/test-ai-detectors.yml`

---

## 📁 File Structure

```
testing/
├── README.md                      # This file
├── requirements.txt               # Python dependencies
├── test-ai-detectors.py          # Main automation script
├── ai-detector-test.md           # Manual testing protocol
└── results/                       # Test outputs (gitignored)
    ├── heavy_*.json
    ├── medium_*.json
    └── screenshots/
        ├── zerogpt_*.png
        └── gptzero_*.png
```

---

## 🔄 Continuous Testing Strategy

### Weekly Regression Tests
- Automatic runs every Sunday
- Validates humanization consistency
- Tracks detector algorithm changes
- Maintains quality benchmarks

### On-Demand Testing
- Before major releases
- After humanization rule updates
- When testing new AI samples
- For marketing/proof demonstrations

### Result History
- Artifacts stored for 30 days in GitHub
- JSON results for trend analysis
- Screenshots for visual proof
- Exportable for documentation

---

## 🐛 Troubleshooting

### Test Fails with Timeout
- **Cause**: Detector website slow/down
- **Fix**: Re-run workflow or increase wait times in script

### Unable to Extract Score
- **Cause**: Detector UI changed
- **Fix**: Update CSS selectors in `test-ai-detectors.py`

### Screenshot is Blank
- **Cause**: Page not fully loaded before screenshot
- **Fix**: Increase `time.sleep()` before screenshot

### GitHub Actions Fails
- **Cause**: Missing dependencies
- **Fix**: Check `requirements.txt` versions

---

## 📝 Adding New Test Samples

Edit `test-ai-detectors.py`:

```python
SAMPLES = {
    "your_sample_name": {
        "name": "Descriptive Name",
        "text": """Your AI-generated text here...""",
        "expected_score": "XX-XX%"
    }
}
```

Then update workflow to include new sample.

---

## 🎓 Example: Claude.ai Workflow

```
User: "Test Graspit against AI detectors"

Claude.ai:
1. Triggers GitHub Actions workflow
2. Waits for completion (~5 mins)
3. Downloads artifacts
4. Analyzes JSON results
5. Compares scores
6. Generates summary report
7. Provides improvement recommendations

All without touching your local machine or API limits!
```

---

## 📈 Metrics Tracked

- **Original AI Score**: Baseline detection rate
- **Humanized AI Score**: Post-Graspit detection rate
- **Improvement Delta**: Point reduction
- **Success Rate**: % of tests passing criteria
- **Consistency**: Score variance across runs
- **Detector Reliability**: Cross-platform comparison

---

## 🚀 Future Enhancements

- [ ] Add Originality.ai testing
- [ ] Add Writer.com AI detector
- [ ] Implement quiz auto-solving for full end-to-end
- [ ] Add trend analysis dashboard
- [ ] Export results to Google Sheets
- [ ] Slack/Discord notifications
- [ ] A/B testing different humanization strategies

---

**Built with 💙 by Dash & ZION**
*Automated testing for human-first AI content*
