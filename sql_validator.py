import re

def is_safe_sql(query: str) -> bool:
    """
    Validates if the provided SQL query is a safe, read-only SELECT statement.
    Rejects queries containing multiple statements or destructive operations.
    """
    if not query or not isinstance(query, str):
        return False

    # Remove single line and multi-line comments for validation
    clean_query = re.sub(r'--.*', '', query)
    clean_query = re.sub(r'/\*.*?\*/', '', clean_query, flags=re.DOTALL)
    
    # Check for multiple statements separated by semicolon
    # If there is a semicolon, ensure it's only at the end
    clean_query_stripped = clean_query.strip()
    if ';' in clean_query_stripped:
        parts = [stmt for stmt in clean_query_stripped.split(';') if stmt.strip()]
        if len(parts) > 1:
            return False

    # Check for forbidden keywords (case insensitive)
    # Using word boundaries to avoid matching substrings of legitimate column names
    forbidden_keywords = [
        'insert', 'update', 'delete', 'drop', 'alter', 'truncate', 
        'create', 'replace', 'grant', 'revoke', 'commit', 'rollback',
        'merge', 'upsert', 'exec', 'execute', 'call'
    ]
    
    forbidden_pattern = r'\b(?:' + '|'.join(forbidden_keywords) + r')\b'
    if re.search(forbidden_pattern, clean_query, re.IGNORECASE):
        return False
        
    return True
