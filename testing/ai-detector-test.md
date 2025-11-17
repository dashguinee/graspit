# AI Detector Testing Protocol

## Test Samples

### Sample 1: Heavy AI Text (Academic Style)
```
Artificial intelligence has fundamentally transformed the landscape of modern technology—incorporating machine learning, neural networks, and deep learning—into comprehensive solutions that revolutionize various industries. The implementation of AI systems demonstrates significant potential in addressing complex challenges. Furthermore, it's worth noting that these technologies facilitate unprecedented levels of automation, enhance decision-making processes, and promote innovative approaches to problem-solving. Additionally, the integration of AI encompasses various domains, including healthcare, finance, and education, where it is utilized to optimize performance and deliver substantial value to stakeholders.
```

**Expected AI Score**: 80-95% (heavy AI indicators)

**Key AI Signatures**:
- ✅ Em-dashes (—incorporating...—into)
- ✅ AI clichés ("it's worth noting", "Furthermore", "Additionally")
- ✅ Formal words ("demonstrates", "facilitate", "encompasses", "utilized")
- ✅ Passive voice ("is utilized")
- ✅ Parallel structure ("facilitate...enhance...promote")
- ✅ Long sentence (50+ words)

---

### Sample 2: Medium AI Text (Blog Style)
```
In today's fast-paced world, understanding the importance of digital marketing is crucial for business success. Let's dive into the key strategies that can help you navigate through this complex landscape. First, social media engagement plays a vital role in building brand awareness. Moreover, content marketing facilitates meaningful connections with your target audience. Additionally, data-driven decision making enables businesses to optimize their campaigns effectively.
```

**Expected AI Score**: 50-70% (moderate AI indicators)

**Key AI Signatures**:
- ✅ AI clichés ("In today's fast-paced world", "Let's dive into", "it's crucial")
- ✅ Formal transitions ("Moreover", "Additionally")
- ✅ Formal words ("facilitates", "enables")
- ✅ Predictable structure (First, Moreover, Additionally)

---

## Testing Workflow

### Manual Testing Steps:

1. **Test Original AI Text**:
   - Go to https://zerogpt.com or https://gptzero.me
   - Paste the AI sample text
   - Click "Detect AI" / "Check for AI"
   - Record score (e.g., "ZeroGPT: 92% AI")
   - Take screenshot

2. **Humanize via Graspit**:
   - Go to https://graspit.vercel.app
   - Paste the same AI text
   - Complete the quiz (pass with 60%+)
   - Copy the humanized version
   - Note the internal AI score reduction

3. **Test Humanized Text**:
   - Return to https://zerogpt.com or https://gptzero.me
   - Paste the humanized version
   - Click "Detect AI" / "Check for AI"
   - Record score (e.g., "ZeroGPT: 18% AI")
   - Take screenshot

4. **Document Results**:
   - Create comparison table
   - Calculate improvement (e.g., 92% → 18% = 74-point reduction)
   - Save screenshots to `/testing/results/`

### Expected Results:

**ZeroGPT**:
- Original: 80-95% AI detected
- Humanized: <25% AI detected
- Improvement: 60-75 point reduction

**GPTZero**:
- Original: HIGH AI probability
- Humanized: LOW/MIXED probability
- Improvement: Significant reduction

**Originality.ai** (if accessible):
- Original: 85-100% AI score
- Humanized: <30% AI score
- Improvement: 60+ point reduction

---

## Automated Testing (Future)

Create `test-ai-detectors.py` script using visual automation:

```python
"""
AI Detector Testing Script
Tests AI text vs humanized text on multiple detectors
"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_zerogpt(text):
    """Test text on ZeroGPT and return score"""
    driver = webdriver.Chrome()
    driver.get("https://zerogpt.com")

    # Find textarea and paste text
    textarea = driver.find_element(By.ID, "textArea")
    textarea.send_keys(text)

    # Click detect button
    detect_btn = driver.find_element(By.ID, "detectButton")
    detect_btn.click()

    # Wait for results
    time.sleep(5)
    result = driver.find_element(By.CLASS_NAME, "result-score").text

    # Screenshot
    driver.save_screenshot(f"zerogpt_{int(time.time())}.png")
    driver.quit()

    return result

def test_gptzero(text):
    """Test text on GPTZero and return score"""
    # Similar implementation
    pass

def compare_results(original_text, humanized_text):
    """Compare AI scores for original vs humanized"""
    print("Testing Original Text...")
    original_zero = test_zerogpt(original_text)
    original_gpt = test_gptzero(original_text)

    print("Testing Humanized Text...")
    humanized_zero = test_zerogpt(humanized_text)
    humanized_gpt = test_gptzero(humanized_text)

    print(f"""
    RESULTS COMPARISON:

    ZeroGPT:
      Original: {original_zero}
      Humanized: {humanized_zero}

    GPTZero:
      Original: {original_gpt}
      Humanized: {humanized_gpt}
    """)

if __name__ == "__main__":
    # Load test samples
    ai_text = "..." # From Sample 1 above
    humanized_text = "..." # From Graspit output

    compare_results(ai_text, humanized_text)
```

---

## Results Documentation Template

```markdown
# AI Detector Test Results - [DATE]

## Test Sample: [NAME]
**Original Word Count**: XXX words
**Humanized Word Count**: XXX words

### ZeroGPT Results:
- **Original**: X% AI detected
- **Humanized**: X% AI detected
- **Improvement**: XX-point reduction ✅

### GPTZero Results:
- **Original**: [HIGH/MEDIUM/LOW] AI probability
- **Humanized**: [HIGH/MEDIUM/LOW] AI probability
- **Improvement**: [Description]

### Graspit Internal Score:
- **Original**: X% AI
- **Humanized**: X% AI
- **Internal Improvement**: XX points

### Screenshots:
- [zerogpt-original.png]
- [zerogpt-humanized.png]
- [gptzero-original.png]
- [gptzero-humanized.png]

### Analysis:
[Observations about what worked, what didn't, patterns noticed]
```

---

## Quick Test Checklist

- [ ] Generated/selected AI text sample
- [ ] Tested on ZeroGPT (original)
- [ ] Tested on GPTZero (original)
- [ ] Humanized via Graspit
- [ ] Passed Graspit quiz
- [ ] Tested on ZeroGPT (humanized)
- [ ] Tested on GPTZero (humanized)
- [ ] Documented results
- [ ] Saved screenshots
- [ ] Calculated improvements

---

**Last Updated**: 2025-11-17
**Status**: Ready for testing
