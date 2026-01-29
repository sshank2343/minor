import os
import pandas as pd
from app.core.config import RESULTS_DIR
from app.agents.root_cause import analyze_metrics


def ingest_metrics(csv_path: str):
    try:
        if not os.path.exists(csv_path):
            return

        df = pd.read_csv(csv_path)

        analyze_metrics(df)

    except Exception as e:
        print("Metrics ingestion failed:", e)
