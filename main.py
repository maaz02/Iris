import os
import uuid
import tempfile
import duckdb
import pandas as pd
import chardet
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from sql_validator import is_safe_sql
from llm import generate_sql, generate_answer_and_chart, generate_example_questions

load_dotenv()

app = FastAPI(title="Iris API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dictionary to store DuckDB connections and schema info
# Format: session_id -> {"conn": duckdb.DuckDBPyConnection, "schema": list}
sessions = {}

class AskRequest(BaseModel):
    session_id: str
    question: str

@app.get("/examples")
async def get_examples(session_id: Optional[str] = None):
    if session_id and session_id in sessions:
        schema = sessions[session_id]["schema"]
        conn = sessions[session_id]["conn"]
        
        # Enrich schema with available years and categorical samples
        enriched_schema = []
        for col in schema:
            col_info = dict(col)
            name_lower = col["name"].lower()
            type_lower = col["type"].lower()
            
            if "date" in name_lower or "time" in name_lower or "date" in type_lower or "timestamp" in type_lower:
                try:
                    res = conn.execute(f'SELECT DISTINCT EXTRACT(YEAR FROM "{col["name"]}") AS year FROM data ORDER BY year DESC LIMIT 5').fetchall()
                    years = [str(int(row[0])) for row in res if row[0] is not None]
                    if years:
                        col_info["available_years"] = years
                except Exception:
                    pass
                    
            if "varchar" in type_lower or "text" in type_lower:
                try:
                    # check distinct count
                    distinct_count_res = conn.execute(f'SELECT COUNT(DISTINCT "{col["name"]}") FROM data').fetchone()
                    if distinct_count_res and distinct_count_res[0] < 30:
                        sample_res = conn.execute(f'SELECT DISTINCT "{col["name"]}" FROM data WHERE "{col["name"]}" IS NOT NULL LIMIT 10').fetchall()
                        samples = [str(row[0]) for row in sample_res if row[0] is not None]
                        if samples:
                            col_info["categorical_samples"] = samples
                except Exception:
                    pass
                    
            enriched_schema.append(col_info)
            
        try:
            return generate_example_questions(enriched_schema)
        except Exception as e:
            print(f"Error generating examples: {e}")
            pass # fallback to default below
            
    return {
        "examples": [
            "What were total sales by category?",
            "Which region has the highest profit?",
            "Who are the top 5 customers by revenue?",
            "How many orders resulted in a loss?",
            "What were sales by month this year?"
        ]
    }

@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
        
    session_id = str(uuid.uuid4())
    sheet_used = None
    
    # Save the uploaded file to a temporary file
    temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(filename)[1])
    try:
        content = await file.read()
        
        if filename.endswith('.csv'):
            result = chardet.detect(content)
            encoding = result.get('encoding')
            confidence = result.get('confidence', 0)
            
            decoded_text = None
            if encoding and confidence >= 0.7:
                try:
                    decoded_text = content.decode(encoding)
                except UnicodeDecodeError:
                    pass
            
            if decoded_text is None:
                for enc in ['utf-8', 'utf-16', 'latin-1', 'windows-1252']:
                    try:
                        decoded_text = content.decode(enc)
                        break
                    except UnicodeDecodeError:
                        continue
            
            if decoded_text is None:
                raise HTTPException(
                    status_code=400,
                    detail="Could not read this file — please re-save it as UTF-8 encoded CSV and try again. In Excel: File → Save As → CSV UTF-8 (Comma delimited)."
                )
                
            with os.fdopen(temp_fd, "wb") as f:
                f.write(decoded_text.encode('utf-8'))
        else:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(content)
            
        # Initialize DuckDB connection
        conn = duckdb.connect(database=':memory:')
        
        if filename.endswith('.csv'):
            # Load CSV into DuckDB
            conn.execute(f"CREATE TABLE data AS SELECT * FROM read_csv_auto('{temp_path}')")
        else:
            # Load Excel using pandas
            xls = pd.ExcelFile(temp_path)
            sheet_used = xls.sheet_names[0]
            df = pd.read_excel(xls, sheet_name=sheet_used)
            # Register pandas dataframe directly to DuckDB
            conn.register('data', df)
        
        # Get schema (column names and types)
        schema_query = conn.execute("DESCRIBE data").fetchall()
        schema = [{"name": row[0], "type": row[1]} for row in schema_query]
        
        # Get 3 sample values per column
        sample_query = conn.execute("SELECT * FROM data LIMIT 3").fetchall()
        samples = []
        for i, col in enumerate(schema):
            col_samples = [row[i] for row in sample_query]
            samples.append({"column": col["name"], "samples": col_samples})
            
        sessions[session_id] = {
            "conn": conn,
            "schema": schema
        }
        
        return {
            "session_id": session_id,
            "schema": schema,
            "samples": samples,
            "sheet_used": sheet_used
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/ask")
async def ask_question(request: AskRequest):
    if request.session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found. Please upload a file first.")
        
    session_data = sessions[request.session_id]
    conn = session_data["conn"]
    schema = session_data["schema"]
    
    try:
        # Call LLM to generate SQL
        gen_result = generate_sql(schema, request.question)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating SQL: {str(e)}")
        
    if not gen_result.get("answerable", True):
        raise HTTPException(status_code=400, detail=gen_result.get("reason", "I wasn't able to answer that from the uploaded data. Try rephrasing your question."))

    sql = gen_result.get("sql", "")
    
    # Validate SQL
    if not is_safe_sql(sql):
        raise HTTPException(
            status_code=400, 
            detail="Generated SQL was rejected due to safety constraints (e.g. not a SELECT statement, or multiple statements)."
        )
        
    try:
        # Execute SQL
        result = conn.execute(sql)
    except Exception as e:
        # Retry logic on failure
        try:
            gen_result = generate_sql(schema, request.question, error_message=str(e))
            sql = gen_result.get("sql", "")
            if not is_safe_sql(sql):
                raise Exception("Safety constraints violation on retry.")
            result = conn.execute(sql)
        except Exception:
            raise HTTPException(status_code=400, detail="I wasn't able to answer that from the uploaded data. Try rephrasing your question.")
            
    try:
        columns = [desc[0] for desc in result.description]
        rows = result.fetchall()
        
        # Convert rows to list of dicts for JSON serialization
        json_rows = [dict(zip(columns, row)) for row in rows]
        
        # Second LLM call for answer and chart
        llm_extras = generate_answer_and_chart(request.question, sql, json_rows)
        
        return {
            "sql": sql,
            "columns": columns,
            "rows": json_rows,
            "answer": llm_extras.get("answer", ""),
            "chart": llm_extras.get("chart", {})
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing results: {str(e)}")
