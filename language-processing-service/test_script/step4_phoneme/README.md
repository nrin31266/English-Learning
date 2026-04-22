# Step 4 - Phoneme Score

Noi dat script test cho phonemeScore (CMU-first + char-level fallback).

Muc tieu test:
- tu giong nhau -> score gan 1.0.
- apples vs apple -> score trong khoang theo spec.
- tu khong co trong CMU -> fallback char-level van cho score hop le.

Run:

```bash
PYTHONPATH=. ./lps-env/bin/python -u test_script/step4_phoneme/run_step4_mock_tests.py
```
