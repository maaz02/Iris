import json
import pytest
from unittest.mock import patch, MagicMock
from llm import generate_answer_and_chart

def create_mock_response(text):
    mock = MagicMock()
    mock.text = text
    return mock

@patch('llm.get_genai_client')
def test_single_value_chart(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    mock_response = create_mock_response(json.dumps({
        "answer": "Total profit is $500.",
        "chart": {"type": "single_value", "title": "Total Profit"}
    }))
    mock_client.models.generate_content.return_value = mock_response
    
    res = generate_answer_and_chart("What is total profit?", "SELECT SUM(Profit) FROM data", [{"SUM(Profit)": 500}])
    assert res["answer"] == "Total profit is $500."
    assert res["chart"]["type"] == "single_value"

@patch('llm.get_genai_client')
def test_time_series_chart(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    mock_response = create_mock_response(json.dumps({
        "answer": "Sales trended upwards over the week.",
        "chart": {"type": "line", "x_field": "Date", "y_field": "Sales", "title": "Sales by Date"}
    }))
    mock_client.models.generate_content.return_value = mock_response
    
    res = generate_answer_and_chart(
        "Show sales by date", 
        "SELECT Date, SUM(Sales) as Sales FROM data GROUP BY Date", 
        [{"Date": "2023-01-01", "Sales": 100}, {"Date": "2023-01-02", "Sales": 150}]
    )
    assert res["chart"]["type"] == "line"
    assert res["chart"]["x_field"] == "Date"

@patch('llm.get_genai_client')
def test_categorical_chart(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    mock_response = create_mock_response("```json\n" + json.dumps({
        "answer": "Technology had the highest sales.",
        "chart": {"type": "bar", "x_field": "Category", "y_field": "Sales", "title": "Sales by Category"}
    }) + "\n```")
    mock_client.models.generate_content.return_value = mock_response
    
    res = generate_answer_and_chart("Sales by category?", "SELECT Category, SUM(Sales) as Sales FROM data GROUP BY Category", [{"Category": "Tech", "Sales": 500}])
    assert res["chart"]["type"] == "bar"

@patch('llm.get_genai_client')
def test_json_fallback(mock_get_client):
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client
    
    # Always return invalid JSON
    mock_response = create_mock_response("This is just some text, not JSON.")
    mock_client.models.generate_content.return_value = mock_response
    
    res = generate_answer_and_chart("Some question", "SELECT * FROM data", [{"col": 1}])
    assert res["chart"]["type"] == "table"
    assert res["answer"] == "Here are the results for your query."
    # ensure we retried twice (so 2 calls)
    assert mock_client.models.generate_content.call_count == 2
