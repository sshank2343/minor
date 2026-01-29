import os
from datetime import datetime
from app.core.config import RESULTS_DIR
from app.core.llm import get_llm

llm = get_llm()

def generate_report(test_id: str, analysis_text: str):
    try:
        os.makedirs(RESULTS_DIR, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        report_path = os.path.join(
            RESULTS_DIR, f"report_{test_id}_{timestamp}.txt"
        )

        prompt = f"""
        You are an SRE AI agent.

        Convert the following technical analysis into a clear incident report with:
        - Summary
        - Root Cause
        - Impact
        - Recommendation

        Analysis:
        {analysis_text}
"""

        report = llm(prompt)

        with open(report_path, "w") as f:
            f.write(report)

        print(f"Report generated at {report_path}")

    except Exception as e:
        print("Report generation failed:", e)
