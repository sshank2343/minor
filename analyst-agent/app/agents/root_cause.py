from app.core.llm import get_llm

llm = get_llm()

def analyze_log_entry(log: dict):
    prompt = f"""
You are an SRE AI agent.

Given the following log entry from a backend system, identify:
1. The probable issue type (CPU, Memory, I/O, Network, Unknown)
2. A one-line explanation

Log Entry:
{log}
"""
    try:
        response = llm(prompt)
        print("AI Log Analysis:", response)
    except Exception as e:
        print("LLM log analysis failed:", e)


def analyze_metrics(df):
    summary = df.describe().to_string()

    prompt = f"""
You are an SRE AI agent.

Given the following performance metrics summary, identify:
1. The primary bottleneck
2. Supporting evidence
3. A concise recommendation

Metrics Summary:
{summary}
"""
    try:
        response = llm(prompt)
        print("AI Metrics Analysis:", response)
    except Exception as e:
        print("LLM metrics analysis failed:", e)
