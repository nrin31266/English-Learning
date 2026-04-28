# src/utils/sequence_alignment.py

"""
Shared sequence alignment utility - CUSTOM với phoneme similarity
- MISMATCH rẻ hơn INSERT/DELETE
- ANCHOR: hard align first phoneme
- ANTI-SWAP: phát hiện và phạt swap
"""

from typing import List, Tuple, Optional

# 👉 PHONEME SIMILARITY MATRIX
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

# 🎯 THAM SỐ COST
COST_MATCH = 0.0
COST_SIMILAR = 0.3      # mismatch gần (rất rẻ)
COST_DIFFERENT = 0.6    # mismatch khác (vẫn rẻ hơn insert)
COST_INSERT_DELETE = 1.0  # insert/delete
SWAP_PENALTY = 0.3      # phạt thêm khi phát hiện swap


def get_phoneme_similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0
    if (a, b) in SIMILAR_PHONEMES:
        return SIMILAR_PHONEMES[(a, b)]
    if (b, a) in SIMILAR_PHONEMES:
        return SIMILAR_PHONEMES[(b, a)]
    return 0.0


def get_phoneme_cost(a: str, b: str, similarity_threshold: float = 0.5) -> float:
    if a == b:
        return COST_MATCH
    sim = get_phoneme_similarity(a, b)
    if sim >= similarity_threshold:
        return COST_SIMILAR
    return COST_DIFFERENT


def levenshtein_alignment_with_similarity(
    seq1: List[str], 
    seq2: List[str],
    similarity_threshold: float = 0.5,
    anchor_first: bool = False,  # 👉 ĐÃ ĐỔI THÀNH FALSE
) -> Tuple[List[Tuple[Optional[str], Optional[str]]], float]:
    """
    Alignment với:
    - phoneme similarity
    - anchor first phoneme (tránh nuốt đầu)
    - anti-swap detection
    """
    if anchor_first and seq1 and seq2:
        first_pair = (seq1[0], seq2[0])
        rest_pairs, rest_dist = levenshtein_alignment_with_similarity(
            seq1[1:], seq2[1:], similarity_threshold, anchor_first=False
        )
        pairs = [first_pair] + rest_pairs
        cost = get_phoneme_cost(seq1[0], seq2[0], similarity_threshold)
        total_dist = cost + rest_dist
        return pairs, total_dist
    
    n, m = len(seq1), len(seq2)
    
    dp = [[0.0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1):
        dp[i][0] = i * COST_INSERT_DELETE
    for j in range(m + 1):
        dp[0][j] = j * COST_INSERT_DELETE
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = get_phoneme_cost(seq1[i-1], seq2[j-1], similarity_threshold)
            
            swap_extra = 0.0
            if i > 1 and j > 1:
                if seq1[i-2] == seq2[j-1] and seq1[i-1] == seq2[j-2]:
                    swap_extra = SWAP_PENALTY
            
            is_early = (i <= 2 or j <= 2)
            if is_early:
                dp[i][j] = min(
                    dp[i-1][j-1] + cost + swap_extra,
                    dp[i-1][j] + COST_INSERT_DELETE * 1.5,
                    dp[i][j-1] + COST_INSERT_DELETE * 1.5,
                )
            else:
                dp[i][j] = min(
                    dp[i-1][j] + COST_INSERT_DELETE,
                    dp[i][j-1] + COST_INSERT_DELETE,
                    dp[i-1][j-1] + cost + swap_extra
                )
    
    pairs = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            cost = get_phoneme_cost(seq1[i-1], seq2[j-1], similarity_threshold)
            swap_extra = 0.0
            if i > 1 and j > 1:
                if seq1[i-2] == seq2[j-1] and seq1[i-1] == seq2[j-2]:
                    swap_extra = SWAP_PENALTY
            if abs(dp[i][j] - (dp[i-1][j-1] + cost + swap_extra)) < 1e-6:
                pairs.append((seq1[i-1], seq2[j-1]))
                i -= 1
                j -= 1
                continue
        
        if i > 0 and abs(dp[i][j] - (dp[i-1][j] + COST_INSERT_DELETE)) < 1e-6:
            pairs.append((seq1[i-1], None))
            i -= 1
            continue
        
        if j > 0:
            pairs.append((None, seq2[j-1]))
            j -= 1
            continue
    
    pairs.reverse()
    return pairs, dp[n][m]

def levenshtein_distance(a: str, b: str) -> int:
    """Levenshtein distance cho string"""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    la, lb = len(a), len(b)
    dp = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        dp[i][0] = i
    for j in range(lb + 1):
        dp[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
    return dp[la][lb]

def levenshtein_distance_seq(a: List[str], b: List[str]) -> int:
    """Levenshtein distance cho sequence"""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    la, lb = len(a), len(b)
    dp = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        dp[i][0] = i
    for j in range(lb + 1):
        dp[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )
    return dp[la][lb]