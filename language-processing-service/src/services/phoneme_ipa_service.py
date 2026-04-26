# src/services/phoneme_ipa_service.py
"""
Phoneme IPA Service - BACKWARD COMPATIBILITY WRAPPER
"""

import sys
import os
from typing import List, Dict, Optional, Tuple

if __name__ == "__main__":
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.services.phonemizer_service import get_ipa as _get_ipa, preload, unload
from src.services.phoneme_alignment_service import compare_words_with_ipa


def compare_phonemes_with_ipa(
    expected_word: str,
    recognized_word: str
) -> Tuple[float, List[Dict]]:
    """Backward compatibility."""
    score, diff_tokens, _, _ = compare_words_with_ipa(
        expected_word, 
        recognized_word, 
        keep_stress=True, 
        normalize=True,
    )
    return score, diff_tokens



def get_ipa_string(word: str) -> Optional[str]:
    """Get IPA without stress (keep original, no normalization)"""
    return _get_ipa(word, keep_stress=False, normalize=True, remove_length=False, as_string=True)


def get_ipa_string_with_stress(word: str) -> Optional[str]:
    """Get IPA with stress (keep original, no normalization)"""
    return _get_ipa(word, keep_stress=True, normalize=True, remove_length=False, as_string=True)


# ========== MAIN TEST ==========
if __name__ == "__main__":
    print("\n" + "="*80)
    print("🔊 PHONEME IPA SERVICE - OpenPhonemizer TEST")
    print("="*80)
    
    preload()
    
    test_words = ["hello", "world", "apple", "beautiful", "read", "lead", "wind", "the", "butter"]
    
    print("\n📌 1. get_ipa_string() - RAW IPA (keep original)")
    print("-"*50)
    for word in test_words:
        ipa = get_ipa_string(word)
        print(f"  {word:12} → {ipa}")
    
    print("\n📌 2. get_ipa_string_with_stress() - RAW IPA with stress")
    print("-"*50)
    for word in test_words:
        ipa = get_ipa_string_with_stress(word)
        print(f"  {word:12} → {ipa}")
    
    print("\n📌 3. compare_phonemes_with_ipa() - with normalization + remove length")
    print("-"*50)
    tests = [
        ("hello", "hello"),
        ("read", "red"),
        ("lead", "led"),
        ("butter", "butter"),
        ("butter", "budder"),
    ]
    for exp, act in tests:
        score, diffs = compare_phonemes_with_ipa(exp, act)
        print(f"  {exp} vs {act}: score={score}")
        mismatches = [d for d in diffs if d['type'] not in ['MATCH', 'NO_DATA']]
        if mismatches:
            for d in mismatches[:3]:
                print(f"    - {d['type']}: '{d.get('expected', '-')}' vs '{d.get('actual', '-')}'")
    
    unload()
    
    print("\n" + "="*80)
    print("✅ TEST COMPLETED")
    print("="*80)