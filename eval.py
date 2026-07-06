import json
import requests
import duckdb
import os
import math
import argparse
import time
from typing import Any, List, Dict

API_URL = "http://localhost:8000"
QUESTIONS_FILE = "eval_questions.json"
RESULTS_FILE = "eval_results.json"
CSV_FILE = "superstore_clean.csv"

def round_value(val: Any) -> Any:
    if isinstance(val, float):
        if math.isnan(val):
            return "NaN"
        return round(val, 2)
    return val

def normalize_row_values(row: Dict[str, Any]) -> tuple:
    # Extract values only, in order, rounded to 2 decimal places
    return tuple(round_value(v) for v in row.values())

def are_results_equal(actual_rows: List[Dict[str, Any]], expected_rows: List[Dict[str, Any]]) -> bool:
    if len(actual_rows) != len(expected_rows):
        return False
    
    # Extract just the values from each row
    actual_vals = [normalize_row_values(r) for r in actual_rows]
    expected_vals = [normalize_row_values(r) for r in expected_rows]
    
    # Sort rows by their values to ignore row order
    actual_vals.sort()
    expected_vals.sort()
    
    return actual_vals == expected_vals

def main():
    if not os.path.exists(QUESTIONS_FILE):
        print(f"Error: {QUESTIONS_FILE} not found.")
        return
        
    with open(QUESTIONS_FILE, 'r') as f:
        questions = json.load(f)

    # 1. Upload CSV to get session ID
    print(f"Uploading {CSV_FILE} to server...")
    try:
        with open(CSV_FILE, 'rb') as f:
            response = requests.post(f"{API_URL}/upload", files={"file": (CSV_FILE, f)})
            response.raise_for_status()
            session_id = response.json()["session_id"]
    except Exception as e:
        print(f"Failed to upload CSV or connect to API: {e}")
        return

    # 2. Setup local DuckDB session
    print("Setting up local DuckDB session for expected results...")
    local_conn = duckdb.connect(database=':memory:')
    local_conn.execute(f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{CSV_FILE}')")

    results = []
    total = len(questions)
    passed = 0
    failed = 0
    
    failures_by_category = {}
    
    print("\nStarting evaluation...\n")
    
    for idx, q_data in enumerate(questions):
        question = q_data["question"]
        expected_sql = q_data["expected_sql"]
        category = q_data.get("category", "uncategorized")
        
        print(f"[{idx+1}/{total}] Testing: {question}")
        
        # Get expected rows from local duckdb
        try:
            local_result = local_conn.execute(expected_sql)
            expected_cols = [desc[0] for desc in local_result.description]
            expected_rows_raw = local_result.fetchall()
            expected_rows = [dict(zip(expected_cols, row)) for row in expected_rows_raw]
        except Exception as e:
            print(f"  -> Error running expected SQL locally: {e}")
            expected_rows = []

        # Call /ask endpoint
        try:
            ask_res = requests.post(
                f"{API_URL}/ask",
                json={"session_id": session_id, "question": question}
            )
            ask_res.raise_for_status()
            ask_data = ask_res.json()
            generated_sql = ask_data.get("sql", "")
            actual_rows = ask_data.get("rows", [])
        except Exception as e:
            print(f"  -> Error calling API: {e}")
            if 'ask_res' in locals() and ask_res.status_code != 200:
                print(f"     Response: {ask_res.text}")
            generated_sql = "ERROR"
            actual_rows = []

        # Compare
        is_match = are_results_equal(actual_rows, expected_rows)
        
        if is_match:
            print("  -> PASS")
            passed += 1
        else:
            print("  -> FAIL")
            failed += 1
            failures_by_category[category] = failures_by_category.get(category, 0) + 1
            
            print(f"\n--- FAILURE DETAILS ---")
            print(f"Question: {question}")
            print(f"Category: {category}")
            print(f"Generated SQL: {generated_sql}")
            print(f"Expected SQL:  {expected_sql}")
            print("\nResult Sets (Side-by-Side preview - max 5 rows):")
            print(f"  Actual Rows ({len(actual_rows)} total):")
            for r in actual_rows[:5]:
                print(f"    {r}")
            if len(actual_rows) > 5:
                print("    ...")
            print(f"  Expected Rows ({len(expected_rows)} total):")
            for r in expected_rows[:5]:
                print(f"    {r}")
            if len(expected_rows) > 5:
                print("    ...")
            print("-----------------------\n")
            
        results.append({
            "question": question,
            "category": category,
            "expected_sql": expected_sql,
            "generated_sql": generated_sql,
            "passed": is_match,
            "actual_rows_count": len(actual_rows),
            "expected_rows_count": len(expected_rows)
        })
        
        # Avoid hitting Gemini free tier rate limits (15 requests/min)
        time.sleep(8)

    # Save results
    with open(RESULTS_FILE, 'w') as f:
        json.dump(results, f, indent=2)
        
    # Summary Table
    print("\n================ EVALUATION SUMMARY ================")
    accuracy = (passed / total) * 100 if total > 0 else 0
    print(f"Total Questions: {total}")
    print(f"Passed:          {passed}")
    print(f"Failed:          {failed}")
    print(f"Accuracy:        {accuracy:.1f}%")
    
    if failures_by_category:
        print("\nFailures by Category:")
        for cat, count in failures_by_category.items():
            print(f"  - {cat}: {count}")
    print("====================================================")
    print(f"Full results saved to {RESULTS_FILE}")

if __name__ == "__main__":
    main()
