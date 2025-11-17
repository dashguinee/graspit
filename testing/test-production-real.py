#!/usr/bin/env python3
"""
REAL Graspit Production AI Detector Testing
Tests actual Graspit API humanization against ZeroGPT and GPTZero

Built with 💙 by Dash & ZION
"""

import os
import time
import json
import requests
import argparse
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Graspit Production API
GRASPIT_API = "https://graspit.vercel.app/api"

# Test samples
SAMPLES = {
    "heavy": {
        "name": "Heavy AI (Academic)",
        "text": """Artificial intelligence has fundamentally transformed the landscape of modern technology—incorporating machine learning, neural networks, and deep learning—into comprehensive solutions that revolutionize various industries. The implementation of AI systems demonstrates significant potential in addressing complex challenges. Furthermore, it's worth noting that these technologies facilitate unprecedented levels of automation, enhance decision-making processes, and promote innovative approaches to problem-solving. Additionally, the integration of AI encompasses various domains, including healthcare, finance, and education, where it is utilized to optimize performance and deliver substantial value to stakeholders.""",
        "expected_original": "80-95% AI",
        "expected_humanized": "<25% AI"
    },
    "medium": {
        "name": "Medium AI (Blog)",
        "text": """In today's fast-paced world, understanding the importance of digital marketing is crucial for business success. Let's dive into the key strategies that can help you navigate through this complex landscape. First, social media engagement plays a vital role in building brand awareness. Moreover, content marketing facilitates meaningful connections with your target audience. Additionally, data-driven decision making enables businesses to optimize their campaigns effectively.""",
        "expected_original": "50-70% AI",
        "expected_humanized": "<20% AI"
    }
}

class GraspitProductionTester:
    def __init__(self, headless=True):
        """Initialize the tester with Chrome driver"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless=new")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--disable-gpu")
            chrome_options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=chrome_options)
        self.screenshots_dir = "testing/results/screenshots"
        os.makedirs(self.screenshots_dir, exist_ok=True)

    def humanize_via_graspit(self, text):
        """
        Call real Graspit production API to humanize text
        Returns humanized text or None if failed
        """
        print("  🎯 Calling Graspit Production API...")

        try:
            # Step 1: Analyze and get quiz
            print("    Step 1: Analyzing text and getting quiz...")
            analyze_response = requests.post(
                f"{GRASPIT_API}/analyze",
                json={"text": text},
                timeout=30
            )

            if analyze_response.status_code != 200:
                print(f"    ❌ Analyze failed: {analyze_response.status_code}")
                print(f"       Response: {analyze_response.text}")
                return None

            analyze_data = analyze_response.json()
            session_id = analyze_data.get("sessionId")
            quiz = analyze_data.get("quiz", [])

            print(f"    ✅ Got quiz with {len(quiz)} questions")
            print(f"    Session ID: {session_id}")

            # Step 2: Generate smart answers for the quiz
            print("    Step 2: Auto-solving quiz...")
            answers = []
            for i, question in enumerate(quiz):
                # Generate comprehensive answer based on keywords
                keywords = question.get("keywords", [])
                # Create a detailed answer that incorporates the keywords
                answer = f"The text discusses {', '.join(keywords[:3])}. "
                answer += f"The main concept relates to how {keywords[0] if keywords else 'the topic'} "
                answer += f"connects with {keywords[1] if len(keywords) > 1 else 'related concepts'}. "
                answer += "This demonstrates understanding of the key ideas presented in the original text."
                answers.append(answer)
                print(f"      Q{i+1}: {question.get('question', '')[:60]}...")

            # Step 3: Submit quiz
            print("    Step 3: Submitting quiz answers...")
            submit_response = requests.post(
                f"{GRASPIT_API}/submit-quiz",
                json={
                    "sessionId": session_id,
                    "answers": answers
                },
                timeout=60  # Humanization can take time with multi-LLM
            )

            if submit_response.status_code != 200:
                print(f"    ❌ Submit failed: {submit_response.status_code}")
                print(f"       Response: {submit_response.text}")
                return None

            submit_data = submit_response.json()

            # Check if quiz passed
            if not submit_data.get("passed"):
                print(f"    ⚠️  Quiz failed (score: {submit_data.get('score')})")
                print(f"       Evaluations: {submit_data.get('evaluations')}")
                return None

            print(f"    ✅ Quiz passed! (score: {submit_data.get('score')})")

            # Extract humanized text
            paraphrase_data = submit_data.get("paraphrase")
            if not paraphrase_data:
                print("    ❌ No paraphrase data received")
                return None

            humanized = paraphrase_data.get("humanized")
            if not humanized:
                print("    ❌ No humanized text in response")
                return None

            print(f"    ✅ Humanization complete!")
            print(f"       Original length: {len(text)} chars")
            print(f"       Humanized length: {len(humanized)} chars")

            return humanized

        except requests.exceptions.Timeout:
            print("    ❌ Request timeout (API took too long)")
            return None
        except Exception as e:
            print(f"    ❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def test_zerogpt(self, text, label):
        """Test text on ZeroGPT and return AI score"""
        print(f"  🔍 Testing on ZeroGPT ({label})...")

        try:
            self.driver.get("https://www.zerogpt.com")
            wait = WebDriverWait(self.driver, 15)

            # Find and fill textarea
            textarea = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "textarea, #textArea"))
            )
            textarea.clear()
            textarea.send_keys(text)

            # Click detect button
            detect_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Detect')] | //button[@id='detectBtn']"))
            )
            detect_btn.click()

            # Wait for results - look for percentage or result element
            time.sleep(8)  # ZeroGPT can be slow

            # Try multiple selectors for the score
            score = "Unable to extract"
            try:
                # Try common selectors
                for selector in [".percentage", "#result", ".result-percentage", "[class*='percent']"]:
                    try:
                        score_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        if score_element.text.strip():
                            score = score_element.text.strip()
                            break
                    except:
                        continue

                # If still not found, try to find any element with % symbol
                if score == "Unable to extract":
                    elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '%')]")
                    for elem in elements:
                        text_content = elem.text.strip()
                        if text_content and any(char.isdigit() for char in text_content):
                            score = text_content
                            break
            except Exception as e:
                print(f"      Warning: {str(e)}")

            # Screenshot
            timestamp = int(time.time())
            screenshot_path = f"{self.screenshots_dir}/zerogpt_{label}_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)
            print(f"      Score: {score}")
            print(f"      Screenshot: {screenshot_path}")

            return {
                "score": score,
                "screenshot": screenshot_path,
                "success": score != "Unable to extract"
            }

        except Exception as e:
            print(f"    ❌ ERROR: {str(e)}")
            return {
                "score": "ERROR",
                "error": str(e),
                "success": False
            }

    def test_gptzero(self, text, label):
        """Test text on GPTZero and return AI score"""
        print(f"  🔍 Testing on GPTZero ({label})...")

        try:
            self.driver.get("https://gptzero.me")
            wait = WebDriverWait(self.driver, 15)

            # Find and fill textarea
            textarea = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "textarea"))
            )
            textarea.clear()
            textarea.send_keys(text)

            # Click scan/check button
            scan_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Scan')] | //button[contains(., 'Check')]"))
            )
            scan_btn.click()

            # Wait for results
            time.sleep(10)  # GPTZero can be slow

            # Try to extract result
            result = "Unable to extract"
            try:
                # Try multiple possible selectors
                for selector in [".result-text", ".ai-result", "[class*='result']", "[class*='score']"]:
                    try:
                        result_element = self.driver.find_element(By.CSS_SELECTOR, selector)
                        if result_element.text.strip():
                            result = result_element.text.strip()
                            break
                    except:
                        continue

                # Try to find percentage or probability indicators
                if result == "Unable to extract":
                    elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'AI') or contains(text(), 'Human') or contains(text(), '%')]")
                    for elem in elements[:5]:  # Check first 5 matches
                        text_content = elem.text.strip()
                        if text_content and len(text_content) < 100:  # Reasonable length
                            result = text_content
                            break
            except Exception as e:
                print(f"      Warning: {str(e)}")

            # Screenshot
            timestamp = int(time.time())
            screenshot_path = f"{self.screenshots_dir}/gptzero_{label}_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)
            print(f"      Result: {result}")
            print(f"      Screenshot: {screenshot_path}")

            return {
                "result": result,
                "screenshot": screenshot_path,
                "success": result != "Unable to extract"
            }

        except Exception as e:
            print(f"    ❌ ERROR: {str(e)}")
            return {
                "result": "ERROR",
                "error": str(e),
                "success": False
            }

    def run_full_test(self, sample_name):
        """Run complete test: original → humanize via Graspit → compare"""
        print(f"\n{'='*70}")
        print(f"🎯 TESTING SAMPLE: {SAMPLES[sample_name]['name']}")
        print(f"{'='*70}\n")

        original_text = SAMPLES[sample_name]['text']

        # STEP 1: Test Original AI Text
        print("📝 STEP 1: Testing Original AI Text")
        print("-" * 70)
        original_zerogpt = self.test_zerogpt(original_text, f"{sample_name}_original")
        time.sleep(3)  # Rate limiting courtesy
        original_gptzero = self.test_gptzero(original_text, f"{sample_name}_original")
        time.sleep(3)

        # STEP 2: Humanize via Graspit Production API
        print(f"\n✨ STEP 2: Humanizing via Graspit Production")
        print("-" * 70)
        humanized_text = self.humanize_via_graspit(original_text)

        if not humanized_text:
            print("\n❌ HUMANIZATION FAILED - Cannot continue with this sample")
            return {
                "sample": sample_name,
                "sample_name": SAMPLES[sample_name]['name'],
                "timestamp": datetime.now().isoformat(),
                "status": "FAILED",
                "error": "Humanization via Graspit API failed"
            }

        # STEP 3: Test Humanized Text
        print(f"\n🔬 STEP 3: Testing Humanized Text")
        print("-" * 70)
        humanized_zerogpt = self.test_zerogpt(humanized_text, f"{sample_name}_humanized")
        time.sleep(3)
        humanized_gptzero = self.test_gptzero(humanized_text, f"{sample_name}_humanized")

        # Compile Results
        results = {
            "sample": sample_name,
            "sample_name": SAMPLES[sample_name]['name'],
            "timestamp": datetime.now().isoformat(),
            "status": "SUCCESS",
            "expected": {
                "original": SAMPLES[sample_name]["expected_original"],
                "humanized": SAMPLES[sample_name]["expected_humanized"]
            },
            "original_text": original_text,
            "humanized_text": humanized_text,
            "text_stats": {
                "original_length": len(original_text),
                "humanized_length": len(humanized_text),
                "length_change": len(humanized_text) - len(original_text),
                "texts_identical": original_text == humanized_text
            },
            "zerogpt": {
                "original": original_zerogpt,
                "humanized": humanized_zerogpt
            },
            "gptzero": {
                "original": original_gptzero,
                "humanized": humanized_gptzero
            }
        }

        # Save results
        os.makedirs("testing/results", exist_ok=True)
        results_file = f"testing/results/{sample_name}_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)

        # Print Summary
        print(f"\n{'='*70}")
        print(f"📊 RESULTS SUMMARY: {SAMPLES[sample_name]['name']}")
        print(f"{'='*70}")
        print(f"\n🔸 ZeroGPT:")
        print(f"   Original:   {original_zerogpt.get('score', 'ERROR')}")
        print(f"   Humanized:  {humanized_zerogpt.get('score', 'ERROR')}")
        print(f"\n🔸 GPTZero:")
        print(f"   Original:   {original_gptzero.get('result', 'ERROR')[:60]}")
        print(f"   Humanized:  {humanized_gptzero.get('result', 'ERROR')[:60]}")
        print(f"\n🔸 Text Stats:")
        print(f"   Original length:   {len(original_text)} chars")
        print(f"   Humanized length:  {len(humanized_text)} chars")
        print(f"   Texts identical:   {original_text == humanized_text}")
        print(f"\n💾 Results saved to: {results_file}")
        print(f"{'='*70}\n")

        return results

    def close(self):
        """Close the browser"""
        self.driver.quit()

def main():
    parser = argparse.ArgumentParser(
        description='Test real Graspit production humanization against AI detectors'
    )
    parser.add_argument('--sample', choices=['heavy', 'medium'], help='Test sample to use')
    parser.add_argument('--all', action='store_true', help='Test all samples')
    parser.add_argument('--no-headless', action='store_true', help='Show browser (default: headless)')

    args = parser.parse_args()

    if not args.sample and not args.all:
        parser.print_help()
        return

    headless = not args.no_headless
    tester = GraspitProductionTester(headless=headless)

    all_results = []

    try:
        if args.all:
            for sample_name in SAMPLES.keys():
                result = tester.run_full_test(sample_name)
                all_results.append(result)
                time.sleep(5)  # Pause between samples
        else:
            result = tester.run_full_test(args.sample)
            all_results.append(result)

        # Print final summary
        print("\n" + "="*70)
        print("🎉 ALL TESTS COMPLETE!")
        print("="*70)
        for result in all_results:
            status_icon = "✅" if result.get("status") == "SUCCESS" else "❌"
            print(f"{status_icon} {result.get('sample_name', 'Unknown')}: {result.get('status', 'UNKNOWN')}")
        print("="*70 + "\n")

    finally:
        tester.close()

if __name__ == "__main__":
    main()
