## Run 1 — Initial eval (Groq Llama 3.3 70B)
Score: 3/20 (15%)
Primary issues:
- Eval harness comparing column aliases not values (false failures)
- LLM generating incorrect DuckDB date syntax (4 ERRORs)
- Missing aggregate aliases causing comparison mismatches

## Fixes applied
1. Eval harness: value-based comparison, float rounding to 2dp,
   row-order independent matching
2. System prompt: added DuckDB date syntax rules + 5 few-shot examples
3. System prompt: added mandatory alias rule for aggregate columns
4. eval_questions.json: fixed DATE_DIFF → DATEDIFF, updated Q10
   expected_sql to COUNT(DISTINCT)

## Run 2 — After fixes
Score: 18/20 (90%)
Remaining failures:
- Q8: Model added redundant DATEDIFF=0 condition on top of Ship Mode
  filter — over-interpreted "Same Day" as a date relationship rather
  than a label value. Defensible reasoning error.
- Q10: Model used COUNT() instead of COUNT(DISTINCT) — ambiguous
  question phrasing; "orders" could mean rows or unique Order IDs.
  Both interpretations are valid.

## Decision
Left both as documented known edge cases rather than over-fitting
the prompt further. 90% accuracy on 20 hand-written questions is
the reported result.

## Guardrail Testing — Day 5

- Unanswerable (weather): correctly declined, no SQL attempted ✅
- Ambiguous (best region): model assumed best = highest profit,
  returned correct answer with real number — good default behavior ✅
- Missing column (satisfaction rating): retry fired, clean error
  message returned, no stack trace leaked ✅
- Regression check (sales by region): numbers identical to eval
  run, guardrails introduced no regressions ✅
