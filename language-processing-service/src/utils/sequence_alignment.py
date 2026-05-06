# src/utils/sequence_alignment.py

from typing import List, Tuple, Optional

SIMILAR_PHONEMES = {
    ('p', 'b'): 0.6, ('t', 'd'): 0.6, ('k', 'g'): 0.6,
    ('f', 'v'): 0.6, ('s', 'z'): 0.6, ('θ', 'ð'): 0.6,
    ('ʃ', 'ʒ'): 0.6, ('tʃ', 'dʒ'): 0.6,
    ('ɪ', 'i'): 0.7, ('i', 'ɪ'): 0.7,
    ('eɪ', 'aɪ'): 0.6, ('eɪ', 'æ'): 0.5,
    ('æ', 'ʌ'): 0.5, ('ʌ', 'ɑ'): 0.5,
    ('u', 'ʊ'): 0.6, ('oʊ', 'ɔ'): 0.5,
    ('r', 'l'): 0.4, ('n', 'ŋ'): 0.5, ('m', 'n'): 0.4,
}

COST_MATCH = 0.0
COST_SIMILAR = 0.3
COST_DIFFERENT = 0.6
COST_INSERT_DELETE = 1.0 
SWAP_PENALTY = 0.3

def get_phoneme_similarity(a: str, b: str) -> float:
    if a == b: return 1.0
    if (a, b) in SIMILAR_PHONEMES: return SIMILAR_PHONEMES[(a, b)]
    if (b, a) in SIMILAR_PHONEMES: return SIMILAR_PHONEMES[(b, a)]
    return 0.0

def get_phoneme_cost(a: str, b: str, similarity_threshold: float = 0.5) -> float:
    if a == b: return COST_MATCH
    sim = get_phoneme_similarity(a, b)
    if sim >= similarity_threshold: return COST_SIMILAR
    return COST_DIFFERENT

def levenshtein_alignment_with_similarity(
    seq1: List[str], 
    seq2: List[str],
    similarity_threshold: float = 0.5,
    anchor_first: bool = False,
) -> Tuple[List[Tuple[Optional[str], Optional[str]]], float]:
    
    n, m = len(seq1), len(seq2)
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1): dp[i][0] = i * COST_INSERT_DELETE
    for j in range(m + 1): dp[0][j] = j * COST_INSERT_DELETE
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = get_phoneme_cost(seq1[i-1], seq2[j-1], similarity_threshold)
            swap_extra = 0.0
            if i > 1 and j > 1 and seq1[i-2] == seq2[j-1] and seq1[i-1] == seq2[j-2]:
                swap_extra = SWAP_PENALTY
            
            # Giữ nguyên hệ số phạt đầu từ để tránh nuốt âm đầu
            penalty_scale = 1.5 if (i <= 2 or j <= 2) else 1.0
            
            dp[i][j] = min(
                dp[i-1][j-1] + cost + swap_extra,
                dp[i-1][j] + COST_INSERT_DELETE * penalty_scale,
                dp[i][j-1] + COST_INSERT_DELETE * penalty_scale
            )
    
    pairs = []
    i, j = n, m
    EPS = 1e-6

    while i > 0 or j > 0:
        current_val = dp[i][j]

        # Trong trường hợp "hòa điểm", ta muốn ép nó "khớp" sớm nhất có thể
        # Để làm được điều đó, khi đi lùi (backtracking), ta phải ưu tiên INSERT/DELETE trước Match.
        # Việc ưu tiên đi ngang/dọc trước đi chéo sẽ đẩy các âm Match về phía index nhỏ hơn (đầu từ).

        # 1. Thử đi lùi hàng (Missing âm)
        if i > 0:
            penalty_scale = 1.5 if (i <= 2 or j <= 2) else 1.0
            if abs(current_val - (dp[i-1][j] + COST_INSERT_DELETE * penalty_scale)) < EPS:
                pairs.append((seq1[i-1], None))
                i -= 1
                continue

        # 2. Thử đi lùi cột (Extra âm)
        if j > 0:
            penalty_scale = 1.5 if (i <= 2 or j <= 2) else 1.0
            if abs(current_val - (dp[i][j-1] + COST_INSERT_DELETE * penalty_scale)) < EPS:
                pairs.append((None, seq2[j-1]))
                j -= 1
                continue

        # 3. Cuối cùng mới thử đi chéo (Match / Mismatch)
        if i > 0 and j > 0:
            cost = get_phoneme_cost(seq1[i-1], seq2[j-1], similarity_threshold)
            swap_extra = 0.0
            if i > 1 and j > 1 and seq1[i-2] == seq2[j-1] and seq1[i-1] == seq2[j-2]:
                swap_extra = SWAP_PENALTY
            
            if abs(current_val - (dp[i-1][j-1] + cost + swap_extra)) < EPS:
                pairs.append((seq1[i-1], seq2[j-1]))
                i -= 1
                j -= 1
                continue

        # Safety break
        if i > 0:
            pairs.append((seq1[i-1], None))
            i -= 1
        elif j > 0:
            pairs.append((None, seq2[j-1]))
            j -= 1

    pairs.reverse()
    return pairs, dp[n][m]