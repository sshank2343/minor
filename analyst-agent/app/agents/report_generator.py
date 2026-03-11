import os
import json
import requests
import traceback
from datetime import datetime
from app.core.config import RESULTS_DIR
from app.core.llm import get_llm
from app.agents.root_cause import analyze_breaking_point

llm = get_llm()


def generate_report_from_breaking_point(test_id: str, test_run: dict, breaking_point: dict):
    """
    Generate structured RCA report from breaking point data using enhanced analyzer.
    
    Args:
        test_id: Test run ID
        test_run: Full test run data from MongoDB
        breaking_point: Breaking point metrics
    """
    try:
        print(f"🔍 Starting RCA report generation for test {test_id}")
        print(f"   Test Run: {test_run.get('endpointPath', 'unknown')}")
        print(f"   Breaking Point Users: {breaking_point.get('usersAtFailure', 'unknown')}")
        
        os.makedirs(RESULTS_DIR, exist_ok=True)

        # Use enhanced root cause analyzer
        report = analyze_breaking_point(test_run, breaking_point)
        
        print(f"📊 Report generated successfully:")
        print(f"   - breaking_point_users: {report.get('breaking_point_users')}")
        print(f"   - failure_type: {report.get('failure_type')}")
        print(f"   - recommendations count: {len(report.get('recommendations', []))}")
        
        # Save report to file
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(
            RESULTS_DIR, f"rca_report_{test_id}_{timestamp}.json"
        )
        
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)

        print(f"✅ RCA report generated at {report_path}")
        print(f"   Endpoint: {report['endpoint']}")
        print(f"   Breaking Point: {report['breaking_point_users']} users")
        print(f"   Failure Type: {report['failure_type']}")
        print(f"   Root Cause: {report['root_cause']}")

        # Send structured report to control plane
        try:
            print(f"📤 Sending report to control-plane...")
            response = requests.post(
                f"http://control-plane:5000/api/test/{test_id}/ai-analysis",
                json=report,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"✅ RCA report sent to control plane for test {test_id}")
            else:
                print(f"⚠️ Failed to send RCA report: {response.status_code}")
                print(f"   Response: {response.text}")
                
        except requests.RequestException as e:
            print(f"⚠️ Failed to send RCA report to control plane: {e}")

    except Exception as e:
        print(f"❌ RCA report generation failed: {e}")
        traceback.print_exc()


def generate_report(test_id: str, analysis_text: str):
    """Legacy report generator for backwards compatibility"""
    try:
        os.makedirs(RESULTS_DIR, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(
            RESULTS_DIR, f"report_{test_id}_{timestamp}.txt"
        )

        prompt = f"""
        You are an SRE AI agent analyzing load test results.

        Generate a JSON report with EXACTLY this structure (all fields required):
        {{
            "endpoint": "GET /endpoint-path",
            "breaking_point_users": 100,
            "stable_users": 80,
            "failure_type": "latency|cpu|memory|errors|timeout",
            "root_cause": "Detailed explanation of why system failed",
            "evidence": {{
                "error_rate": 0.05,
                "timeout_rate": 0.03,
                "p95_latency_ms": 5000,
                "dominant_status_code": 200
            }},
            "recommendations": [
                "REASON: explanation. SOLUTION: specific action",
                "REASON: explanation. SOLUTION: specific action",
                "REASON: explanation. SOLUTION: specific action"
            ]
        }}

        Rules:
        - breaking_point_users: Number where system broke
        - stable_users: 70-80% of breaking point (safe capacity)
        - failure_type: ONE of: "latency", "cpu", "memory", "errors", "timeout", "overload"
        - root_cause: 1-2 sentences explaining the bottleneck
        - recommendations: 3 items, each with REASON and SOLUTION format
        
        Analysis Data:
        {analysis_text}
        
        Return ONLY valid JSON, no markdown formatting.
"""

        report_text = llm(prompt)

        # Save to file
        with open(report_path, "w") as f:
            f.write(report_text)

        print(f"Report generated at {report_path}")

        # Parse and send to control plane API
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in report_text:
                json_start = report_text.find("```json") + 7
                json_end = report_text.find("```", json_start)
                report_text = report_text[json_start:json_end].strip()
            elif "```" in report_text:
                json_start = report_text.find("```") + 3
                json_end = report_text.find("```", json_start)
                report_text = report_text[json_start:json_end].strip()
            
            report_json = json.loads(report_text)
            
            # Send to control plane
            response = requests.post(
                f"http://control-plane:5000/api/test/{test_id}/ai-analysis",
                json=report_json,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"✅ AI analysis sent to control plane for test {test_id}")
            else:
                print(f"⚠️ Failed to send AI analysis: {response.status_code}")
                
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse AI report as JSON: {e}")
            print(f"Report text: {report_text[:200]}...")
        except requests.RequestException as e:
            print(f"⚠️ Failed to send AI analysis to control plane: {e}")

    except Exception as e:
        print("Report generation failed:", e)
