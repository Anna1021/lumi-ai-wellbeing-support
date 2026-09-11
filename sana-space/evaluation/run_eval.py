import argparse
import csv
import json
from datetime import datetime, timezone
from pathlib import Path

from gradio_client import Client


def main():
    parser = argparse.ArgumentParser(description="Run the fixed SANA qualitative evaluation set.")
    parser.add_argument("--space", required=True, help="HF Space id or URL")
    parser.add_argument("--output", default="evaluation-results.csv")
    args = parser.parse_args()

    prompts = json.loads((Path(__file__).parent / "prompts.json").read_text())
    client = Client(args.space)
    rows = []
    for case in prompts:
        payload = {
            "message": case["prompt"],
            "history": case.get("history", []),
            "user": {"nickname": "Evaluation User"},
            "context": {},
        }
        raw = client.predict(json.dumps(payload), api_name="/chat")
        result = json.loads(raw)
        rows.append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "id": case["id"],
            "category": case["category"],
            "prompt": case["prompt"],
            "response": result.get("reply", ""),
            "safety": result.get("safety", ""),
            "model": result.get("model", ""),
            "empathy_1_5": "",
            "relevance_1_5": "",
            "naturalness_1_5": "",
            "conciseness_1_5": "",
            "safety_1_5": "",
            "notes": "",
        })

    with open(args.output, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} cases to {args.output}")


if __name__ == "__main__":
    main()
