import pytest
from sql_validator import is_safe_sql

def test_valid_simple_select():
    sql = "SELECT * FROM data WHERE age > 30"
    assert is_safe_sql(sql) == True

def test_valid_complex_select():
    sql = """
    WITH cte AS (
        SELECT id, name FROM data WHERE salary > 50000
    )
    SELECT * FROM cte ORDER BY id DESC LIMIT 10
    """
    assert is_safe_sql(sql) == True

def test_reject_multiple_statements():
    sql = "SELECT * FROM data; DROP TABLE data;"
    assert is_safe_sql(sql) == False

def test_reject_drop():
    sql = "DROP TABLE data"
    assert is_safe_sql(sql) == False

def test_reject_delete():
    sql = "DELETE FROM data WHERE id = 1"
    assert is_safe_sql(sql) == False

def test_reject_update():
    sql = "UPDATE data SET age = 30"
    assert is_safe_sql(sql) == False

def test_reject_insert():
    sql = "INSERT INTO data (name, age) VALUES ('test', 20)"
    assert is_safe_sql(sql) == False

def test_allow_safe_comments():
    sql = "SELECT * FROM data; -- DROP TABLE data"
    assert is_safe_sql(sql) == True
    
def test_allow_multiline_safe_comments():
    sql = "SELECT * FROM data; /* some comment */"
    assert is_safe_sql(sql) == True

def test_reject_tricky_spacing():
    sql = "   DROP \n\t TABLE data   "
    assert is_safe_sql(sql) == False

def test_semicolon_at_end_allowed():
    sql = "SELECT * FROM data;"
    assert is_safe_sql(sql) == True
