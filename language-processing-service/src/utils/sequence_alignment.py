# src/utils/sequence_alignment.py
"""
Shared sequence alignment utility - MỘT NƠI DUY NHẤT cho alignment logic
"""
from typing import List, Tuple, Optional


def levenshtein_alignment(
    seq1: List[str], 
    seq2: List[str]
) -> Tuple[List[Tuple[Optional[str], Optional[str]]], int]:
    """
    Alignment 2 sequence, trả về:
    - aligned_pairs: list of (item_from_seq1, item_from_seq2)
    - distance: edit distance
    """
    n, m = len(seq1), len(seq2)
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if seq1[i-1] == seq2[j-1] else 1
            dp[i][j] = min(
                dp[i-1][j] + 1,
                dp[i][j-1] + 1,
                dp[i-1][j-1] + cost
            )
    
    # Backtrack
    pairs = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and dp[i][j] == dp[i-1][j-1] + (0 if seq1[i-1] == seq2[j-1] else 1):
            pairs.append((seq1[i-1], seq2[j-1]))
            i -= 1
            j -= 1
        elif i > 0 and dp[i][j] == dp[i-1][j] + 1:
            pairs.append((seq1[i-1], None))
            i -= 1
        else:
            pairs.append((None, seq2[j-1]))
            j -= 1
    
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