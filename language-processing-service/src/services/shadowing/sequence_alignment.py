# src/services/shadowing/sequence_alignment.py

from typing import Callable, Optional, Sequence, TypeVar

AlignmentPair = tuple[Optional[str], Optional[str]]
T = TypeVar("T")
U = TypeVar("U")

SIMILAR_PHONEMES: dict[tuple[str, str], float] = {
    ("p", "b"): 0.6,
    ("t", "d"): 0.6,
    ("k", "g"): 0.6,
    ("f", "v"): 0.6,
    ("s", "z"): 0.6,
    ("θ", "ð"): 0.6,
    ("ʃ", "ʒ"): 0.6,
    ("tʃ", "dʒ"): 0.6,

    ("ɪ", "i"): 0.7,
    ("eɪ", "aɪ"): 0.6,
    ("eɪ", "æ"): 0.5,
    ("æ", "ʌ"): 0.5,
    ("ʌ", "ɑ"): 0.5,
    ("u", "ʊ"): 0.6,
    ("oʊ", "ɔ"): 0.5,

    ("r", "l"): 0.4,
    ("n", "ŋ"): 0.5,
    ("m", "n"): 0.4,
}

COST_MATCH = 0.0
COST_SIMILAR = 0.3
COST_DIFFERENT = 0.6
COST_INSERT_DELETE = 1.0
SWAP_PENALTY = 0.3
EPSILON = 1e-6


def levenshtein_distance(a: Sequence[str] | str, b: Sequence[str] | str) -> int:
    if a == b:
        return 0

    if not a:
        return len(b)

    if not b:
        return len(a)

    rows = len(a) + 1
    cols = len(b) + 1
    dp = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        dp[i][0] = i

    for j in range(cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )

    return dp[-1][-1]


def normalized_similarity(a: Sequence[str] | str, b: Sequence[str] | str) -> float:
    max_len = max(len(a), len(b))

    if max_len == 0:
        return 1.0

    return max(0.0, 1.0 - levenshtein_distance(a, b) / max_len)


def normalized_distance_cost(
    a: str,
    b: str,
    similarity_weight: float = 0.8,
) -> float:
    if a == b:
        return 0.0

    return round(1.0 - normalized_similarity(a, b) * similarity_weight, 4)


def align_sequences(
    expected_items: Sequence[T],
    actual_items: Sequence[U],
    substitution_cost_fn: Callable[[T, U], float],
    delete_cost: float = 1.0,
    insert_cost: float = 1.0,
    prefer_gap_on_tie: bool = False,
) -> list[tuple[Optional[T], Optional[U], str]]:
    expected_count = len(expected_items)
    actual_count = len(actual_items)

    dp = [[0.0] * (actual_count + 1) for _ in range(expected_count + 1)]

    for i in range(1, expected_count + 1):
        dp[i][0] = dp[i - 1][0] + delete_cost

    for j in range(1, actual_count + 1):
        dp[0][j] = dp[0][j - 1] + insert_cost

    for i in range(1, expected_count + 1):
        for j in range(1, actual_count + 1):
            cost = substitution_cost_fn(expected_items[i - 1], actual_items[j - 1])

            dp[i][j] = min(
                dp[i - 1][j - 1] + cost,
                dp[i - 1][j] + delete_cost,
                dp[i][j - 1] + insert_cost,
            )

    aligned_reversed: list[tuple[Optional[T], Optional[U], str]] = []
    i = expected_count
    j = actual_count

    while i > 0 or j > 0:
        if prefer_gap_on_tie and i > 0:
            if abs(dp[i][j] - (dp[i - 1][j] + delete_cost)) < EPSILON:
                aligned_reversed.append((expected_items[i - 1], None, "DELETE"))
                i -= 1
                continue

        if prefer_gap_on_tie and j > 0:
            if abs(dp[i][j] - (dp[i][j - 1] + insert_cost)) < EPSILON:
                aligned_reversed.append((None, actual_items[j - 1], "INSERT"))
                j -= 1
                continue

        if i > 0 and j > 0:
            cost = substitution_cost_fn(expected_items[i - 1], actual_items[j - 1])

            if abs(dp[i][j] - (dp[i - 1][j - 1] + cost)) < EPSILON:
                align_type = "MATCH" if cost == 0.0 else "SUBSTITUTE"
                aligned_reversed.append(
                    (expected_items[i - 1], actual_items[j - 1], align_type)
                )
                i -= 1
                j -= 1
                continue

        if not prefer_gap_on_tie and j > 0 and abs(dp[i][j] - (dp[i][j - 1] + insert_cost)) < EPSILON:
            aligned_reversed.append((None, actual_items[j - 1], "INSERT"))
            j -= 1
            continue

        if i > 0:
            aligned_reversed.append((expected_items[i - 1], None, "DELETE"))
            i -= 1

    aligned_reversed.reverse()

    return aligned_reversed


def get_phoneme_similarity(a: str, b: str) -> float:
    if a == b:
        return 1.0

    return SIMILAR_PHONEMES.get((a, b)) or SIMILAR_PHONEMES.get((b, a)) or 0.0


def get_phoneme_cost(
    a: str,
    b: str,
    similarity_threshold: float = 0.5,
) -> float:
    if a == b:
        return COST_MATCH

    similarity = get_phoneme_similarity(a, b)

    return COST_SIMILAR if similarity >= similarity_threshold else COST_DIFFERENT


def _is_swapped_pair(
    seq1: Sequence[str],
    seq2: Sequence[str],
    i: int,
    j: int,
) -> bool:
    return (
        i > 1
        and j > 1
        and seq1[i - 2] == seq2[j - 1]
        and seq1[i - 1] == seq2[j - 2]
    )


def _swap_penalty(
    seq1: Sequence[str],
    seq2: Sequence[str],
    i: int,
    j: int,
) -> float:
    return SWAP_PENALTY if _is_swapped_pair(seq1, seq2, i, j) else 0.0


def _edge_penalty_scale(i: int, j: int, anchor_first: bool) -> float:
    """
    Penalize insert/delete near the beginning of a word.

    This helps avoid swallowing the first phonemes too easily, which is important
    in pronunciation scoring.
    """
    if anchor_first:
        return 2.0 if i <= 2 or j <= 2 else 1.0

    return 1.5 if i <= 2 or j <= 2 else 1.0


def levenshtein_alignment_with_similarity(
    seq1: Sequence[str],
    seq2: Sequence[str],
    similarity_threshold: float = 0.5,
    anchor_first: bool = False,
) -> tuple[list[AlignmentPair], float]:
    """
    Align two phoneme sequences using Levenshtein DP with similar-phoneme costs.

    Returns:
        pairs: list of (expected_phoneme, actual_phoneme)
        distance: final weighted edit distance
    """
    n = len(seq1)
    m = len(seq2)

    if n == 0 and m == 0:
        return [], 0.0

    if n == 0:
        return [(None, phoneme) for phoneme in seq2], float(m) * COST_INSERT_DELETE

    if m == 0:
        return [(phoneme, None) for phoneme in seq1], float(n) * COST_INSERT_DELETE

    dp = [[0.0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = dp[i - 1][0] + COST_INSERT_DELETE * _edge_penalty_scale(
            i,
            0,
            anchor_first,
        )

    for j in range(1, m + 1):
        dp[0][j] = dp[0][j - 1] + COST_INSERT_DELETE * _edge_penalty_scale(
            0,
            j,
            anchor_first,
        )

    for i in range(1, n + 1):
        for j in range(1, m + 1):
            sub_cost = get_phoneme_cost(
                seq1[i - 1],
                seq2[j - 1],
                similarity_threshold,
            )
            swap_cost = _swap_penalty(seq1, seq2, i, j)
            delete_cost = COST_INSERT_DELETE * _edge_penalty_scale(i, j, anchor_first)
            insert_cost = COST_INSERT_DELETE * _edge_penalty_scale(i, j, anchor_first)

            dp[i][j] = min(
                dp[i - 1][j - 1] + sub_cost + swap_cost,
                dp[i - 1][j] + delete_cost,
                dp[i][j - 1] + insert_cost,
            )

    pairs: list[AlignmentPair] = []
    i, j = n, m

    while i > 0 or j > 0:
        current = dp[i][j]

        # Tie-break order:
        # 1. delete expected phoneme
        # 2. insert actual phoneme
        # 3. match/substitute
        #
        # This keeps early exact matches more stable after reversing the path.
        if i > 0:
            delete_cost = COST_INSERT_DELETE * _edge_penalty_scale(i, j, anchor_first)

            if abs(current - (dp[i - 1][j] + delete_cost)) < EPSILON:
                pairs.append((seq1[i - 1], None))
                i -= 1
                continue

        if j > 0:
            insert_cost = COST_INSERT_DELETE * _edge_penalty_scale(i, j, anchor_first)

            if abs(current - (dp[i][j - 1] + insert_cost)) < EPSILON:
                pairs.append((None, seq2[j - 1]))
                j -= 1
                continue

        if i > 0 and j > 0:
            sub_cost = get_phoneme_cost(
                seq1[i - 1],
                seq2[j - 1],
                similarity_threshold,
            )
            swap_cost = _swap_penalty(seq1, seq2, i, j)

            if abs(current - (dp[i - 1][j - 1] + sub_cost + swap_cost)) < EPSILON:
                pairs.append((seq1[i - 1], seq2[j - 1]))
                i -= 1
                j -= 1
                continue

        # Safety fallback. Should rarely happen, but prevents infinite loops.
        if i > 0:
            pairs.append((seq1[i - 1], None))
            i -= 1
        elif j > 0:
            pairs.append((None, seq2[j - 1]))
            j -= 1

    pairs.reverse()

    return pairs, round(dp[n][m], 4)
