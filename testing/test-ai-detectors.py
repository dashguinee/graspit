#!/usr/bin/env python3
"""
AI Detector Testing Automation
Tests Graspit's humanization against ZeroGPT and GPTZero

Usage:
    python test-ai-detectors.py --sample heavy
    python test-ai-detectors.py --sample medium
    python test-ai-detectors.py --all
"""

import os
import time
import json
import argparse
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Test samples
SAMPLES = {
    "heavy": {
        "name": "Heavy AI (Academic)",
        "text": """Artificial intelligence has fundamentally transformed the landscape of modern technology—incorporating machine learning, neural networks, and deep learning—into comprehensive solutions that revolutionize various industries. The implementation of AI systems demonstrates significant potential in addressing complex challenges. Furthermore, it's worth noting that these technologies facilitate unprecedented levels of automation, enhance decision-making processes, and promote innovative approaches to problem-solving. Additionally, the integration of AI encompasses various domains, including healthcare, finance, and education, where it is utilized to optimize performance and deliver substantial value to stakeholders.""",
        "expected_score": "80-95%"
    },
    "medium": {
        "name": "Medium AI (Blog)",
        "text": """In today's fast-paced world, understanding the importance of digital marketing is crucial for business success. Let's dive into the key strategies that can help you navigate through this complex landscape. First, social media engagement plays a vital role in building brand awareness. Moreover, content marketing facilitates meaningful connections with your target audience. Additionally, data-driven decision making enables businesses to optimize their campaigns effectively.""",
        "expected_score": "50-70%"
    }
}

class AIDetectorTester:
    def __init__(self, headless=True):
        """Initialize the tester with Chrome driver"""
        chrome_options = Options()
        if headless:
            chrome_options.add_argument("--headless")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")

        self.driver = webdriver.Chrome(options=chrome_options)
        self.results = {}
        self.screenshots_dir = "testing/results/screenshots"
        os.makedirs(self.screenshots_dir, exist_ok=True)

    def test_zerogpt(self, text, label):
        """Test text on ZeroGPT and return AI score"""
        print(f"  Testing on ZeroGPT ({label})...")

        try:
            self.driver.get("https://www.zerogpt.com")

            # Wait for page load
            wait = WebDriverWait(self.driver, 10)

            # Find and fill textarea
            textarea = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "textarea"))
            )
            textarea.clear()
            textarea.send_keys(text)

            # Click detect button
            detect_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Detect')]"))
            )
            detect_btn.click()

            # Wait for results
            time.sleep(5)

            # Extract score
            try:
                score_element = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".percentage"))
                )
                score = score_element.text
            except:
                score = "Unable to extract"

            # Screenshot
            timestamp = int(time.time())
            screenshot_path = f"{self.screenshots_dir}/zerogpt_{label}_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)

            return {
                "score": score,
                "screenshot": screenshot_path,
                "success": True
            }

        except Exception as e:
            print(f"    ERROR: {str(e)}")
            return {
                "score": "ERROR",
                "error": str(e),
                "success": False
            }

    def test_gptzero(self, text, label):
        """Test text on GPTZero and return AI score"""
        print(f"  Testing on GPTZero ({label})...")

        try:
            self.driver.get("https://gptzero.me")

            # Wait for page load
            wait = WebDriverWait(self.driver, 10)

            # Find and fill textarea
            textarea = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='Paste']"))
            )
            textarea.clear()
            textarea.send_keys(text)

            # Click scan button
            scan_btn = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Scan')]"))
            )
            scan_btn.click()

            # Wait for results
            time.sleep(7)

            # Extract result
            try:
                result_element = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".result-text"))
                )
                result = result_element.text
            except:
                result = "Unable to extract"

            # Screenshot
            timestamp = int(time.time())
            screenshot_path = f"{self.screenshots_dir}/gptzero_{label}_{timestamp}.png"
            self.driver.save_screenshot(screenshot_path)

            return {
                "result": result,
                "screenshot": screenshot_path,
                "success": True
            }

        except Exception as e:
            print(f"    ERROR: {str(e)}")
            return {
                "result": "ERROR",
                "error": str(e),
                "success": False
            }

    def humanize_via_graspit(self, text):
        """
        Humanize text via Graspit API
        Note: This requires passing the quiz - for automation, we need the quiz answers
        """
        import requests

        print("  Humanizing via Graspit API...")

        # For now, return a simulated humanized version
        # In production, this would call Graspit API and handle quiz
        print("    WARNING: Manual quiz completion required for full automation")

        # Return text with basic transformations as placeholder
        humanized = text.replace("—", ". ")
        humanized = humanized.replace("Furthermore, ", "")
        humanized = humanized.replace("Additionally, ", "Plus, ")
        humanized = humanized.replace("Moreover, ", "Also, ")

        return humanized

    def run_full_test(self, sample_name):
        """Run complete test: original → humanize → compare"""
        print(f"\n{'='*60}")
        print(f"Testing Sample: {SAMPLES[sample_name]['name']}")
        print(f"{'='*60}\n")

        original_text = SAMPLES[sample_name]['text']

        # Test original
        print("STEP 1: Testing Original AI Text")
        print("-" * 40)
        original_zerogpt = self.test_zerogpt(original_text, f"{sample_name}_original")
        original_gptzero = self.test_gptzero(original_text, f"{sample_name}_original")

        # Humanize
        print("\nSTEP 2: Humanizing Text via Graspit")
        print("-" * 40)
        humanized_text = self.humanize_via_graspit(original_text)

        # Test humanized
        print("\nSTEP 3: Testing Humanized Text")
        print("-" * 40)
        humanized_zerogpt = self.test_zerogpt(humanized_text, f"{sample_name}_humanized")
        humanized_gptzero = self.test_gptzero(humanized_text, f"{sample_name}_humanized")

        # Compile results
        results = {
            "sample": sample_name,
            "sample_name": SAMPLES[sample_name]['name'],
            "timestamp": datetime.now().isoformat(),
            "original_text": original_text,
            "humanized_text": humanized_text,
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
        results_file = f"testing/results/{sample_name}_{int(time.time())}.json"
        os.makedirs("testing/results", exist_ok=True)
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2)

        print(f"\n{'='*60}")
        print(f"RESULTS SUMMARY")
        print(f"{'='*60}")
        print(f"ZeroGPT Original:   {original_zerogpt.get('score', 'ERROR')}")
        print(f"ZeroGPT Humanized:  {humanized_zerogpt.get('score', 'ERROR')}")
        print(f"\nGPTZero Original:   {original_gptzero.get('result', 'ERROR')}")
        print(f"GPTZero Humanized:  {humanized_gptzero.get('result', 'ERROR')}")
        print(f"\nResults saved to: {results_file}")
        print(f"{'='*60}\n")

        return results

    def close(self):
        """Close the browser"""
        self.driver.quit()

def main():
    parser = argparse.ArgumentParser(description='Test AI detectors with Graspit humanization')
    parser.add_argument('--sample', choices=['heavy', 'medium'], help='Test sample to use')
    parser.add_argument('--all', action='store_true', help='Test all samples')
    parser.add_argument('--headless', action='store_true', default=True, help='Run in headless mode')

    args = parser.parse_args()

    if not args.sample and not args.all:
        parser.print_help()
        return

    tester = AIDetectorTester(headless=args.headless)

    try:
        if args.all:
            for sample_name in SAMPLES.keys():
                tester.run_full_test(sample_name)
        else:
            tester.run_full_test(args.sample)
    finally:
        tester.close()

if __name__ == "__main__":
    main()
