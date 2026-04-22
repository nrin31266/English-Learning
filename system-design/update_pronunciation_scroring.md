# Shadowing Pronunciation Scoring Flow (Final)

Tai lieu nay mo ta luong chinh thuc da hoan thien trong he thong shadowing hien tai.

## 1) Muc tieu he thong

- Cham ket qua shadowing on dinh, co giai thich du de hoc vien sua loi.
- Tach ro 2 tang:
  - Tang quyet dinh trang thai tu: alignment + char-level classify.
  - Tang giai thich phat am: phoneme/IPA diff visualization.
- UI uu tien de hoc vien thay cau va loi can sua, khong spam metric.

## 2) Dau vao va dau ra

### Dau vao

- `expectedWords`: danh sach tu cua cau mau (co `wordText`, `wordNormalized`, `orderIndex`, ...).
- `transcription_result`: ket qua ASR (text + segments/words).

### Dau ra (`ShadowingResult`)

- Sentence-level:
  - `sentenceId`
  - `expectedText`
  - `recognizedText`
  - `totalWords`
  - `correctWords`
  - `accuracy`
  - `weightedAccuracy`
  - `fluencyScore`
  - `avgPause`
  - `speechRate`
  - `recognizedWordCount`
  - `lastRecognizedPosition`
  - `compares[]`

- Word-level (`ShadowingWordCompare`):
  - `position`
  - `expectedWord`
  - `recognizedWord`
  - `expectedNormalized`
  - `recognizedNormalized`
  - `status`: `CORRECT | NEAR | WRONG | MISSING | EXTRA`
  - `score`
  - `phonemeDiff` (chi co khi can)
  - `extraOrMissingIpa` (chi co voi EXTRA/MISSING khi co IPA)

## 3) Pipeline backend (chi tiet)

### Step 1: Trich recognized tokens

- Lay `recognized_text` tu `transcription_result.text`.
- Neu text rong, build lai tu `segments.words`.
- Tokenize va normalize tung tu -> `rec_items = [(raw, normalized)]`.

### Step 2: Alignment (DP)

- Dung dynamic programming edit-distance de can `expected` va `recognized`.
- Tao danh sach cap alignment:
  - `MATCH`
  - `SUBSTITUTE`
  - `INSERT` (EXTRA)
  - `DELETE` (MISSING)

### Step 3: Classify trang thai tu

- Voi `INSERT` -> `EXTRA`, `score=0.0`.
- Voi `DELETE` -> `MISSING`, `score=0.0`.
- Voi `MATCH/SUBSTITUTE` -> dung `_classify_word` (char-level):
  - exact -> `CORRECT`, `1.0`
  - gan dung -> `NEAR`, `0.7..0.95`
  - con lai -> `WRONG`, `0.0`

Luu y quan trong:

- `_classify_word` la bo quyet dinh trang thai chinh trong pipeline hien tai.
- Tang phoneme khong override status, ma dung de giai thich.

### Step 4: Phoneme/IPA enrichment theo nhanh

#### Nhanh NEAR/WRONG

- Goi `compare_phonemes_with_ipa(expected_word, recognized_word)`.
- Nhan ve:
  - `score` phoneme
  - `diff_tokens` de UI highlight sai am
  - `expected_ipa`
  - `actual_ipa`
- Gan vao `phonemeDiff` cua word do.

#### Nhanh EXTRA/MISSING

- Khong chay phoneme diff chinh.
- Chi goi `get_ipa_string_with_stress(word)` de lay IPA phuc vu hien thi hoc tu.
- Gan vao `extraOrMissingIpa`.

#### Nhanh CORRECT

- Khong enrich them de tranh noise khong can thiet.

### Step 5: Tinh diem sentence-level

- `accuracy = correctWords / totalWords * 100`
- `weightedAccuracy = total_score / (totalWords + alpha * extra_words) * 100`
  - `alpha` doc tu env `SHADOWING_EXTRA_PENALTY_ALPHA`
  - clamp `[0.0, 1.0]`
  - default `0.3`

### Step 6: Tinh fluency

- Tu word timestamps:
  - `avgPause`: khoang dung trung binh
  - `speechRate`: words/second
  - `fluencyScore`: heuristic tong hop tu pause + rate

## 4) Rule tong ket hien tai

- Alignment dung de tranh lech day chuyen khi user noi thua/thieu.
- Trang thai word (`CORRECT/NEAR/WRONG/MISSING/EXTRA`) quyet dinh boi char-level classify sau alignment.
- CMU/IPA dung de:
  - Giai thich loi phat am (NEAR/WRONG)
  - Ho tro IPA cho EXTRA/MISSING
- Diem sentence van dua tren score char-level + extra penalty + fluency.

## 5) Mapping UI de dong bo voi backend

### Main result mode

- Hien sentence va highlight theo `status`.
- `EXTRA`: hien thi `+word`.
- `MISSING`: hien thi ghost/faded word.
- Word dung (`CORRECT`) de clean, khong can show chi tiet.

### Hover/detail mode

- Neu co `phonemeDiff`:
  - show `%` accuracy phoneme
  - show `expected_ipa` vs `actual_ipa`
  - show `diff_tokens`
- Neu co `extraOrMissingIpa`:
  - show IPA cua tu lien quan.

### Debug mode

- Hien tong quan status count + cong thuc weighted accuracy.
- Hien bang chi tiet tung tu, co thong tin phoneme/IPA khi co.

## 6) Contract mau (rut gon)

```json
{
  "sentenceId": 101,
  "accuracy": 66.67,
  "weightedAccuracy": 58.82,
  "fluencyScore": 0.74,
  "compares": [
    {
      "position": 0,
      "expectedWord": "ship",
      "recognizedWord": "sheep",
      "status": "NEAR",
      "score": 0.7,
      "phonemeDiff": {
        "score": 0.55,
        "expected_ipa": "...",
        "actual_ipa": "...",
        "diff_tokens": []
      },
      "extraOrMissingIpa": null
    },
    {
      "position": 1,
      "expectedWord": null,
      "recognizedWord": "really",
      "status": "EXTRA",
      "score": 0.0,
      "phonemeDiff": null,
      "extraOrMissingIpa": {
        "word": "really",
        "ipa": "...",
        "type": "EXTRA"
      }
    }
  ]
}
```

## 7) Checklist regression can giu

- Alignment:
  - expected: `I like apples`
  - recognized: `I really like apples`
  - phai ra 1 `EXTRA` dung vi tri.

- Phoneme/IPA:
  - `ship` vs `sheep` -> co `phonemeDiff`, score thap hon exact.
  - `apple` vs `apples` -> status phu hop, score giam.
  - contraction (`don't` vs `dont`) -> khong vo pipeline.

- Fluency:
  - pause lon -> `fluencyScore` giam.

- UI:
  - main mode khong bi spam thong tin.
  - detail/hover moi show diff phat am.

## 8) Ghi chu kien truc

- He thong hien tai la hybrid rule-based + phoneme enrichment.
- Khong dung AI model acoustic nhe/nang de cham phoneme.
- Neu can nang cap sau:
  - co the doi bo classify chinh sang phoneme-first,
  - nhung can cap nhat dong bo weighted score + regression tests + UI explainability.
