# Test Script Guide

Muc tieu: chay test nhanh cho tung step shadowing ma khong can audio that.

## Cau truc
- `test_script/common/`: helper tao mock request + transcription.
- `test_script/step1_alignment/`: test cho buoc alignment.
- `test_script/step2_extra_penalty/`: de danh cho buoc phat extra.
- `test_script/step3_fluency/`: de danh cho fluency.
- `test_script/step4_phoneme/`: de danh cho phoneme score.
- `test_script/step5_feedback/`: de danh cho feedback text.

Moi step co folder `logs/` de luu ket qua test de doc lai.

## Cach chay Step 1 (mock test, khong can audio)
Tu module `language-processing-service`:

```bash
source ./lps-env/bin/activate
python -u test_script/step1_alignment/run_step1_mock_tests.py
```

Ket qua:
- Terminal in PASS/FAIL.
- Log chi tiet: `test_script/step1_alignment/logs/step1_latest.log`

## Cach mo rong cho step tiep theo
1. Tao script runner trong folder step tuong ung.
2. Dung helper `test_script/common/mock_factory.py`.
3. Viet assert cho output mong doi.
4. Ghi log vao `logs/stepX_latest.log`.
