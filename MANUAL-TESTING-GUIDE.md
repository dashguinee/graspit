# 🎯 Manual AI Detector Testing Guide

**Quick copy/paste guide for validating Graspit humanization**

---

## Heavy AI Sample (Academic Style)

### ⬛ Test 1: Original Text → ZeroGPT

1. Go to: https://www.zerogpt.com/
2. Paste this text:

```
Artificial intelligence has fundamentally transformed the landscape of modern technology—incorporating machine learning, neural networks, and deep learning—into comprehensive solutions that revolutionize various industries. The implementation of AI systems demonstrates significant potential in addressing complex challenges. Furthermore, it's worth noting that these technologies facilitate unprecedented levels of automation, enhance decision-making processes, and promote innovative approaches to problem-solving. Additionally, the integration of AI encompasses various domains, including healthcare, finance, and education, where it is utilized to optimize performance and deliver substantial value to stakeholders.
```

3. Click "Detect Text"
4. **Expected:** 80-95% AI detected
5. Screenshot and record score

---

### ✨ Test 2: Humanized Text → ZeroGPT

1. Go to: https://www.zerogpt.com/
2. Paste this text:

```
Artificial intelligence has completely changed modern technology. It brings together machine learning, neural networks, and deep learning. These tools create comprehensive solutions that are revolutionizing many industries. AI systems show a lot of potential for solving complex problems. They also help automate tasks on a huge scale. This improves how decisions are made and encourages new ways to solve problems. Plus, AI is being used across different fields. You can see it in healthcare, finance, and education. In these areas, it helps optimize performance and delivers real value to everyone involved.
```

3. Click "Detect Text"
4. **Expected:** <25% AI detected ✅
5. Screenshot and record score
6. **Calculate improvement:** Original score - Humanized score (target: 60+ points)

---

## Medium AI Sample (Blog Style)

### ⬛ Test 3: Original Text → ZeroGPT

1. Go to: https://www.zerogpt.com/
2. Paste this text:

```
In today's fast-paced world, understanding the importance of digital marketing is crucial for business success. Let's dive into the key strategies that can help you navigate through this complex landscape. First, social media engagement plays a vital role in building brand awareness. Moreover, content marketing facilitates meaningful connections with your target audience. Additionally, data-driven decision making enables businesses to optimize their campaigns effectively.
```

3. Click "Detect Text"
4. **Expected:** 50-70% AI detected
5. Screenshot and record score

---

### ✨ Test 4: Humanized Text → ZeroGPT

1. Go to: https://www.zerogpt.com/
2. Paste this text:

```
These days, digital marketing is essential for any business that wants to succeed. Social media is a big part of this. It helps build brand awareness and connect with people. Content marketing is also important because it helps you form real connections with your audience. Plus, using data to make decisions lets businesses improve their campaigns and get better results.
```

3. Click "Detect Text"
4. **Expected:** <20% AI detected ✅
5. Screenshot and record score
6. **Calculate improvement:** Original score - Humanized score (target: 40+ points)

---

## GPTZero Testing (Optional)

Repeat the same 4 tests on GPTZero:
- URL: https://gptzero.me/
- Use the same texts as above
- **Expected Original:** HIGH AI probability
- **Expected Humanized:** LOW/MIXED probability

---

## 📊 Results Template

| Sample | Detector | Original | Humanized | Improvement |
|--------|----------|----------|-----------|-------------|
| Heavy | ZeroGPT | __% | __% | __ points |
| Heavy | GPTZero | HIGH/MEDIUM/LOW | HIGH/MEDIUM/LOW | Better/Same/Worse |
| Medium | ZeroGPT | __% | __% | __ points |
| Medium | GPTZero | HIGH/MEDIUM/LOW | HIGH/MEDIUM/LOW | Better/Same/Worse |

---

## 🎯 Success Criteria

✅ **Pass:** Heavy AI improves by 60+ points on ZeroGPT
✅ **Pass:** Medium AI improves by 40+ points on ZeroGPT
✅ **Pass:** GPTZero shows clear downgrade (HIGH → LOW/MIXED)

---

**Share your results in GitHub Discussions!**
**Tag: @dashguinee**
