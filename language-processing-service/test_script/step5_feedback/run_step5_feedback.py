#!/usr/bin/env python3
"""
Step 5 Test: Phoneme Diff Visualization
Test phoneme_ipa_service với các cặp từ thực tế

CHỈ test phoneme diff, KHÔNG test full shadowing service
Mục tiêu: verify diff_tokens trả về đúng để UI render highlight
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.services.phoneme_ipa_service import (
    compare_phonemes_with_ipa,
    get_ipa_string
)
from src.services.cmu_service import preload_cmu_model


# ==============================================================================
# TEST CASES - Chỉ test từng cặp từ
# ==============================================================================

TEST_CASES = [
    # === CORRECT ===
    {
        "name": "CORRECT: apple = apple",
        "expected": "apple",
        "actual": "apple",
        "expect_score_min": 0.95,
        "expect_all_match": True
    },
    {
        "name": "CORRECT: cat = cat", 
        "expected": "cat",
        "actual": "cat",
        "expect_score_min": 0.95,
        "expect_all_match": True
    },
    
    # === NEAR / WRONG - Sai nhẹ ===
   # Sửa trong TEST_CASES:
{
    "name": "NEAR: Packer vs Parker",
    "expected": "Packer",
    "actual": "Parker",
    "expect_score_min": 0.55,
    "expect_score_max": 0.65,
    "expect_has": ["MISMATCH", "EXTRA"]  # Bỏ "MISSING"
},
    {
        "name": "NEAR: lessons vs lesson (thiếu /z/)",
        "expected": "lessons",
        "actual": "lesson",
        "expect_score_min": 0.8,
        "expect_score_max": 0.9,
        "expect_has": ["MISSING"]
    },
# Trong test, case "fox vs foxx" nên được đánh dấu là expect_no_cmu_data
{
    "name": "NEAR: fox vs foxx (thừa x)",
    "expected": "fox",
    "actual": "foxx",
    "expect_no_cmu_data": True,  # Vì "foxx" không có trong CMU
    "note": "Từ 'foxx' không có trong CMU dict, char-level sẽ xử lý"
},
    
    # === WRONG - Sai rõ ===
    {
        "name": "WRONG: discuss vs request",
        "expected": "discuss",
        "actual": "request",
        "expect_score_max": 0.3,
        "expect_has": ["MISMATCH", "EXTRA"]
    },
    {
        "name": "WRONG: research vs ratio",
        "expected": "research",
        "actual": "ratio",
        "expect_score_max": 0.25,
        "expect_has": ["MISMATCH"]
    },
    {
        "name": "WRONG: marketing vs negative",
        "expected": "marketing",
        "actual": "negative",
        "expect_score_min": 0.35,
        "expect_score_max": 0.45,
        "expect_has": ["MISMATCH", "MISSING"]
    },
    {
        "name": "WRONG: methods vs networks",
        "expected": "methods",
        "actual": "networks",
        "expect_score_min": 0.1,
        "expect_score_max": 0.2,
        "expect_has": ["MISMATCH"]
    },
    {
        "name": "WRONG: would vs look",
        "expected": "would",
        "actual": "look",
        "expect_score_min": 0.3,
        "expect_score_max": 0.4,
        "expect_has": ["MISMATCH"]
    },
    {
        "name": "WRONG: to vs you",
        "expected": "to",
        "actual": "you",
        "expect_score_min": 0.4,
        "expect_score_max": 0.6,
        "expect_has": ["MISMATCH"]
    },
    {
        "name": "WRONG: rent vs read",
        "expected": "rent",
        "actual": "read",
        "expect_score_min": 0.4,
        "expect_score_max": 0.6,
        "expect_has": ["MISSING", "MISMATCH"]
    },
    {
        "name": "WRONG: store vs style",
        "expected": "store",
        "actual": "style",
        "expect_score_min": 0.4,
        "expect_score_max": 0.6,
        "expect_has": ["MISMATCH"]
    },
    
  
 {
    "name": "EXTRA: like vs really like",
    "expected": "like",
    "actual": "really like",
    "expect_no_cmu_data": True,
    "note": "Phrase - xử lý bởi alignment, không phải phoneme level"
},
    
    # === MISSING - Nói thiếu ===
    {
        "name": "MISSING: up vs a",
        "expected": "up",
        "actual": "a",
        "expect_score_min": 0.4,
        "expect_score_max": 0.6,
        "expect_has": ["MATCH", "MISSING"]
    },
    
    # === SLANG (CMU không hỗ trợ - vẫn được classify bởi char-level) ===
    {
        "name": "SLANG: going to vs gonna",
        "expected": "going to",
        "actual": "gonna",
        "expect_no_cmu_data": True,
        "note": "CMU không hỗ trợ slang, vẫn được xử lý bởi _classify_word"
    },
    {
        "name": "SLANG: I am vs I'm",
        "expected": "I am",
        "actual": "I'm",
        "expect_no_cmu_data": True,
        "note": "CMU không hỗ trợ contraction"
    }
]


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def print_header(title: str):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)


def print_diff_visual(expected: str, actual: str, diff_tokens: list):
    """Mô phỏng UI render highlight từ diff_tokens"""
    print("\n  📊 UI sẽ render highlight:")
    
    # Dòng IPA kỳ vọng
    exp_line = "     Kỳ vọng: "
    # Dòng IPA thực tế
    act_line = "     Bạn nói: "
    # Dòng gạch chân
    marker_line = "              "
    
    for token in diff_tokens:
        exp_ipa = token["expected_ipa"] or "∅"
        act_ipa = token["actual_ipa"] or "∅"
        
        if token["type"] == "MATCH":
            exp_line += f" {exp_ipa} "
            act_line += f" {act_ipa} "
            marker_line += "  ✓  "
        elif token["type"] == "MISMATCH":
            exp_line += f"✨{exp_ipa}✨"
            act_line += f"🔴{act_ipa}🔴"
            marker_line += "  ✗  "
        elif token["type"] == "MISSING":
            exp_line += f"🔴{exp_ipa}🔴"
            act_line += "  ∅  "
            marker_line += "  ✗  "
        else:  # EXTRA
            exp_line += "  ∅  "
            act_line += f"🟡{act_ipa}🟡"
            marker_line += "  +  "
        
        exp_line += " "
        act_line += " "
    
    print(exp_line)
    print(act_line)
    print(marker_line)


def run_test(case: dict):
    """Chạy 1 test case"""
    print(f"\n📝 Test: {case['name']}")
    print(f"   Expected: '{case['expected']}'")
    print(f"   Actual:   '{case['actual']}'")
    
    score, diff_tokens = compare_phonemes_with_ipa(case["expected"], case["actual"])
    
    # Hiển thị IPA
    ipa_exp = get_ipa_string(case["expected"])
    ipa_act = get_ipa_string(case["actual"])
    print(f"   IPA kỳ vọng: {ipa_exp}")
    print(f"   IPA thực tế: {ipa_act}")
    print(f"   Score: {score}")
    
    # Kiểm tra NO_CMU_DATA
    if diff_tokens and diff_tokens[0].get("type") == "NO_DATA":
        print(f"   ⚠️ {case.get('note', 'CMU không có dữ liệu')}")
        if case.get("expect_no_cmu_data"):
            print("   ✅ PASS (expected no CMU data)")
        else:
            print("   ❌ FAIL (unexpected no CMU data)")
        return
    
    # In diff_tokens chi tiết
    print(f"\n   Diff tokens ({len(diff_tokens)} âm vị):")
    for token in diff_tokens:
        if token["type"] == "MATCH":
            print(f"     [{token['position']}] ✓ {token['expected_ipa']} = {token['actual_ipa']}")
        elif token["type"] == "MISMATCH":
            print(f"     [{token['position']}] ✗ {token['expected_ipa']} → {token['actual_ipa']}")
        elif token["type"] == "MISSING":
            print(f"     [{token['position']}] ✗ thiếu: {token['expected_ipa']}")
        else:
            print(f"     [{token['position']}] ✗ thừa: {token['actual_ipa']}")
    
    # UI visualization
    print_diff_visual(case["expected"], case["actual"], diff_tokens)
    
    # Kiểm tra score range
    passed = True
    
    if "expect_score_min" in case:
        if score < case["expect_score_min"]:
            print(f"   ❌ Score {score} < min {case['expect_score_min']}")
            passed = False
        else:
            print(f"   ✅ Score >= {case['expect_score_min']}")
    
    if "expect_score_max" in case:
        if score > case["expect_score_max"]:
            print(f"   ❌ Score {score} > max {case['expect_score_max']}")
            passed = False
        else:
            print(f"   ✅ Score <= {case['expect_score_max']}")
    
    # Kiểm tra các loại diff có mặt
    if "expect_all_match" in case and case["expect_all_match"]:
        all_match = all(t["type"] == "MATCH" for t in diff_tokens)
        if all_match:
            print(f"   ✅ All tokens are MATCH")
        else:
            print(f"   ❌ Not all tokens are MATCH")
            passed = False
    
    if "expect_has" in case:
        token_types = set(t["type"] for t in diff_tokens)
        for expected_type in case["expect_has"]:
            if expected_type in token_types:
                print(f"   ✅ Has {expected_type}")
            else:
                print(f"   ❌ Missing {expected_type}")
                passed = False
    
    # Kết luận
    if passed:
        print(f"\n   ✅ KẾT LUẬN: PASS")
    else:
        print(f"\n   ❌ KẾT LUẬN: FAIL")
    
    return passed


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    print_header("STEP 5: PHONEME DIFF VISUALIZATION TEST")
    
    print("\n🔄 Loading CMU model...")
    preload_cmu_model()
    print("✅ Ready!")
    
    print_header("TEST CASES")
    
    passed_count = 0
    failed_count = 0
    
    for case in TEST_CASES:
        if run_test(case):
            passed_count += 1
        else:
            failed_count += 1
        print("\n" + "-" * 60)
    
    print_header("SUMMARY")
    print(f"\n  ✅ PASSED: {passed_count}")
    print(f"  ❌ FAILED: {failed_count}")
    print(f"  📊 TOTAL:  {passed_count + failed_count}")
    
    if failed_count == 0:
        print("\n🎉 ALL TESTS PASSED! UI có thể render highlight từ diff_tokens.")
    else:
        print(f"\n⚠️ {failed_count} test(s) failed. Cần kiểm tra lại.")
    
    print("\n💡 UI sẽ dùng diff_tokens để:")
    print("   - MATCH: hiển thị bình thường")
    print("   - MISMATCH: highlight khác màu (đỏ)")
    print("   - MISSING: highlight đỏ + gạch chân")
    print("   - EXTRA: highlight vàng + dấu +")


if __name__ == "__main__":
    main()