# Step 1 Case List

Danh sach case mock cho alignment Step 1.

## Nhom co ban
- `exact_match`: cau goc va cau nhan dang giong nhau.
- `insert_extra_word`: chen 1 tu thua giua cau.
- `insert_extra_at_start`: chen tu thua dau cau.
- `insert_extra_at_end`: chen tu thua cuoi cau.
- `delete_missing_word`: thieu tu o giua cau.
- `delete_missing_at_end`: thieu tu o cuoi cau.

## Nhom thay the tu
- `substitute_near_word`: tu gan giong (vd `apples` vs `apple`) -> NEAR.
- `substitute_wrong_word`: tu khac ro rang -> WRONG.
- `all_wrong_same_length`: ca cau sai toan bo.

## Nhom normalize
- `contraction_normalization`: `It's` vs `its` -> CORRECT sau normalize.
- `punctuation_normalization`: dau cau khong lam sai ket qua (`Hello, world!`).

## Nhom ket hop
- `insert_middle_and_end`: vua thua giua vua thua cuoi.

## Cach chay
```bash
source ./lps-env/bin/activate
PYTHONPATH=. python -u test_script/step1_alignment/run_step1_mock_tests.py
```

Log ket qua:
- `test_script/step1_alignment/logs/step1_latest.log`
