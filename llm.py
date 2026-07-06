import os
import time
import json
from groq import Groq

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    return Groq(api_key=api_key)

def call_with_retry(func, *args, **kwargs):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            if '429' in str(e) or 'rate_limit' in str(e).lower():
                if attempt == max_retries - 1:
                    raise
                print(f"Rate limited. Sleeping for 15 seconds (attempt {attempt+1}/{max_retries})...")
                time.sleep(15)
            else:
                raise

def _do_generate_sql(schema_info: list, question: str, error_message: str = None) -> dict:
    client = get_groq_client()
    
    schema_str = "Table: data\\nColumns:\\n"
    for col in schema_info:
        schema_str += f"- {col['name']} ({col['type']})\\n"
        
    error_section = ""
    if error_message:
        error_section = f"\n\nCRITICAL: The previous SQL you generated failed with this error:\n{error_message}\n\nPlease fix the query."

    prompt = f"""
You are a DuckDB SQL expert. Your task is to generate a SINGLE, valid, read-only DuckDB SQL query to answer the user's question based on the provided schema.

Schema details:
{schema_str}

User Question:
{question}{error_section}

Requirements:
1. You must return a strict JSON object with exactly these three keys:
   - "answerable": boolean (true if the question can be answered using the provided schema, false otherwise)
   - "reason": string (if answerable is false, briefly explain why in a friendly way. If true, empty string)
   - "sql": string (the generated SQL query if answerable is true, otherwise empty string)
2. The query must be a single SELECT statement.
3. Use ONLY the columns listed in the schema. Do not hallucinate columns.
4. The table name to query is `data`.

Rules:
1. Always alias aggregate columns with clear snake_case names using AS (e.g. SUM(Sales) AS total_sales, COUNT(*) AS order_count, AVG(Discount) AS avg_discount). Never return unnamed aggregate columns.
2. For DuckDB date handling specifically:
   - Extract year: EXTRACT(YEAR FROM "Order Date")
   - Extract month: strftime("Order Date", '%Y-%m') — note DuckDB puts the COLUMN FIRST and FORMAT STRING SECOND, opposite of SQLite
   - Date difference: DATEDIFF('day', "Order Date", "Ship Date")
   - Always double-quote column names that contain spaces or hyphens
3. When a question asks "which X has the highest/lowest Y", always include the Y value in the SELECT, not just the X name
4. When a question asks for "least/most profitable products", always GROUP BY the product name and aggregate profit across all rows for that product first, then rank — do not just ORDER BY the raw profit column on individual rows

Few-Shot Examples (note these only show the SQL part, but you MUST wrap your final output in the required JSON format):

Q: "What were total sales in 2016?"
A: SELECT SUM(Sales) AS total_sales FROM data WHERE EXTRACT(YEAR FROM "Order Date") = 2016

Q: "What were total sales by month in 2017?"
A: SELECT strftime("Order Date", '%Y-%m') AS month, SUM(Sales) AS total_sales FROM data WHERE EXTRACT(YEAR FROM "Order Date") = 2017 GROUP BY month ORDER BY month

Q: "What is the average shipping time in days?"
A: SELECT AVG(DATEDIFF('day', "Order Date", "Ship Date")) AS avg_days_to_ship FROM data

Q: "Which product category has the highest total profit?"
A: SELECT Category, SUM(Profit) AS total_profit FROM data GROUP BY Category ORDER BY total_profit DESC LIMIT 1

Q: "What are the 5 least profitable products?"
A: SELECT "Product Name", SUM(Profit) AS total_profit FROM data GROUP BY "Product Name" ORDER BY total_profit ASC LIMIT 5
"""
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.0,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content.strip()
    try:
        parsed = json.loads(content)
        return parsed
    except Exception:
        # Fallback if json parsing fails
        return {"answerable": False, "reason": "Failed to generate a valid response.", "sql": ""}

def generate_sql(schema_info: list, question: str, error_message: str = None) -> dict:
    return call_with_retry(_do_generate_sql, schema_info, question, error_message)

def _do_generate_answer_and_chart(question: str, sql: str, result_rows: list) -> dict:
    client = get_groq_client()
    
    truncated_rows = result_rows[:50]
    
    prompt = f"""
You are an expert data analyst. Based on the following user question, SQL query, and query results, you must return a strict JSON object with two keys: "answer" and "chart".

User Question: {question}
SQL Query: {sql}
Result Rows (up to 50): {json.dumps(truncated_rows)}

Rules for "answer":
- A 1-2 sentence plain-English answer using the actual numbers from the results.

Rules for "chart":
- Must be an object with keys: "type" and "title".
- If type is "bar", "line", or "pie", you must also include "x_field" and "y_field".
- Valid types: bar, line, pie, table, single_value.
- Logic:
  - "single_value": use this if the result has exactly 1 row and 1 column (numeric), OR if the result has exactly 1 row and 2 columns (one categorical, one numeric).
  - "table": the safe fallback for anything that doesn't clearly fit bar/line/pie. If the result has only ONE column and it contains string/text values (not numbers), always pick "table" — never "bar", "line", or "pie".
  - "bar": only valid when there is a categorical column AND a numeric column in the result.
  - "line": only valid when there is a time/date column AND a numeric column.
  - "pie": only valid when there are exactly 2 columns: one categorical, one numeric, with fewer than 8 rows.

Return ONLY valid JSON. Do not include markdown formatting like ```json.
"""
    
    fallback = {
        "answer": "Here are the results for your query.",
        "chart": {"type": "table", "title": "Data Table"}
    }
    
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            
            resp_text = response.choices[0].message.content.strip()
            if resp_text.startswith("```json"):
                resp_text = resp_text[7:]
            if resp_text.startswith("```"):
                resp_text = resp_text[3:]
            if resp_text.endswith("```"):
                resp_text = resp_text[:-3]
            resp_text = resp_text.strip()
            
            parsed = json.loads(resp_text)
            
            if "answer" in parsed and "chart" in parsed and "type" in parsed["chart"]:
                return parsed
        except Exception:
            if attempt == 1:
                return fallback
                
    return fallback

def generate_answer_and_chart(question: str, sql: str, result_rows: list) -> dict:
    return call_with_retry(_do_generate_answer_and_chart, question, sql, result_rows)

def _do_generate_example_questions(schema_info: list) -> dict:
    client = get_groq_client()
    
    schema_str = "Table: data\nColumns:\n"
    has_date = False
    all_available_years = set()
    
    for col in schema_info:
        col_desc = f"- {col['name']} ({col['type']})"
        if "available_years" in col:
            col_desc += f" — available years in data: {', '.join(col['available_years'])}"
            all_available_years.update(col['available_years'])
        if "categorical_samples" in col:
            col_desc += f" — sample values: {', '.join(col['categorical_samples'])}"
        schema_str += col_desc + "\n"
        
        # DuckDB types often include DATE, TIMESTAMP, VARCHAR but we check heuristically
        if "date" in col['name'].lower() or "time" in col['name'].lower() or "date" in col['type'].lower() or "timestamp" in col['type'].lower():
            has_date = True
            
    if all_available_years:
        time_rule = f"one time-based (e.g. over months or years, but ONLY using years from {', '.join(sorted(all_available_years))})"
    elif has_date:
        time_rule = "one time-based (e.g. over months or years)"
    else:
        time_rule = "skip time-based questions since no date columns were detected"
            
    prompt = f"""
You are a data analyst. Based on the following schema, generate 5 example questions a user could ask about this dataset.

Schema details:
{schema_str}

Requirements:
1. Return a strict JSON object with a single key "examples" containing a list of 5 string questions.
2. The questions should cover a mix of: one aggregation, one grouping/breakdown, one filtering, one ranking, and {time_rule}.
3. Only ask questions that can be answered using the provided columns.
4. Keep the questions concise and natural.
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content.strip()
    try:
        return json.loads(content)
    except Exception:
        return {"examples": [
            "What were total sales by region?", 
            "Which product category has the highest profit?", 
            "What were total sales by month in 2017?", 
            "Who are the top 5 customers by total sales?", 
            "Which sub-category has the lowest profit?"
        ]}

def generate_example_questions(schema_info: list) -> dict:
    return call_with_retry(_do_generate_example_questions, schema_info)
