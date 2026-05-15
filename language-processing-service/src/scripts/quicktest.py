import argparse
import asyncio
import csv
import json
import os
import re
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any, Optional

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

_client: Optional[AsyncIOMotorClient] = None

DEFAULT_DB = os.getenv("MONGODB_DB", "dictionary_db")
DEFAULT_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

PHRASE_POS = {
    "PHRASE",
    "PHRASAL_VERB",
    "COLLOCATION",
    "IDIOM",
    "FIXED_EXPRESSION",
}

VALID_LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}

# Sau khi bỏ fill-blank exact-string, các lỗi strict là lỗi làm hỏng dữ liệu thật.
STRICT_CODES = {
    "WORD_TEXT_EMPTY",
    "READY_WITHOUT_DEFINITIONS",
    "DEFINITION_NOT_OBJECT",
    "DEFINITION_EMPTY",
    "EXAMPLE_EMPTY",
    "MEANING_VI_EMPTY",
}

TOO_SHORT_MEANING_VI = {
    "làm",
    "đặt",
    "điều",
    "cái",
    "sự",
    "thứ",
    "việc",
    "người",
    "nơi",
    "vật",
}

PLACEHOLDERS = {
    "someone",
    "somebody",
    "something",
    "one's",
    "ones",
    "your",
}

COMMON_WORDS = {
    "the",
    "a",
    "an",
    "to",
    "of",
    "for",
    "with",
    "in",
    "on",
    "at",
    "by",
    "from",
    "and",
    "or",
    "be",
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "make",
    "take",
    "get",
    "go",
    "have",
    "has",
    "had",
}

# Cụm kiểu này không sai tuyệt đối, nhưng nên sửa để word tự nhiên/giàu ngữ cảnh hơn.
PHRASE_RECOMMENDATIONS = {
    "wash face": "wash your face",
    "brush teeth": "brush your teeth",
    "take account": "take something into account",
    "lose touch": "lose touch with someone",
    "get in touch": "get in touch with someone",
    "keep in touch": "keep in touch with someone",
    "ask out": "ask someone out",
    "remind of": "remind someone of something",
}


@dataclass
class Issue:
    wordId: str
    wordText: str
    wordKey: str
    pos: str
    status: str
    usedEntryCount: int
    definitionIndex: Optional[int]
    severity: str
    code: str
    message: str
    recommendedFix: str = ""
    example: str = ""
    meaningVi: str = ""
    definition: str = ""


def get_client() -> AsyncIOMotorClient:
    global _client

    if _client is None:
        _client = AsyncIOMotorClient(DEFAULT_URI)

    return _client


def get_db():
    return get_client()[DEFAULT_DB]


def get_words_collection():
    return get_db()["words"]


def get_entries_collection():
    return get_db()["vocab_word_entries"]


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalize_text(value: str) -> str:
    value = (value or "").lower()
    value = re.sub(r"[^\w\s+#./'-]+", " ", value, flags=re.UNICODE)
    return normalize_spaces(value)


def display_word(doc: dict[str, Any]) -> str:
    text = normalize_spaces(doc.get("text") or "")
    if text:
        return text

    key = normalize_spaces(doc.get("key") or "")
    return key.replace("_", " ")


def contains_exact_word(example: str, word: str) -> bool:
    if not example or not word:
        return False

    normalized_example = normalize_text(example)
    normalized_word = normalize_text(word)

    if not normalized_example or not normalized_word:
        return False

    regex = rf"(?<![\w'-]){re.escape(normalized_word)}(?![\w'-])"
    return bool(re.search(regex, normalized_example, flags=re.IGNORECASE))


def word_tokens_for_relevance(word: str) -> set[str]:
    normalized = normalize_text(word)

    if not normalized:
        return set()

    tokens = set()
    for token in normalized.split():
        if len(token) < 3:
            continue
        if token in PLACEHOLDERS:
            continue
        if token in COMMON_WORDS:
            continue
        tokens.add(token)

    return tokens


def example_looks_related(example: str, word: str) -> bool:
    """
    Không bắt exact-string nữa.
    Chỉ kiểm tra nhẹ: example có còn nhận ra được từ/cụm đang học không.
    """
    tokens = word_tokens_for_relevance(word)

    if not tokens:
        return True

    example_text = normalize_text(example)

    if not example_text:
        return False

    return any(token in example_text for token in tokens)


def is_too_rough_meaning_vi(value: str) -> bool:
    text = normalize_spaces(value).lower()

    if not text:
        return True

    if text in TOO_SHORT_MEANING_VI:
        return True

    if len(text.split()) == 1 and len(text) <= 4:
        return True

    return False


def is_probably_phrase(word: str) -> bool:
    text = normalize_spaces(word)
    return " " in text or "-" in text


def recommended_phrase_fix(word: str, definition: str = "", meaning_vi: str = "") -> str:
    normalized = normalize_text(word)

    if normalized in PHRASE_RECOMMENDATIONS:
        return PHRASE_RECOMMENDATIONS[normalized]

    # wake up chỉ cần sửa nếu nghĩa đang là "đánh thức ai đó".
    combined = normalize_text(f"{definition} {meaning_vi}")
    if normalized == "wake up":
        if (
            "cause someone" in combined
            or "rouse" in combined
            or "đánh thức" in combined
            or "làm ai thức" in combined
        ):
            return "wake someone up"

    return ""


def issue(
    doc: dict[str, Any],
    used_count: int,
    index: Optional[int],
    severity: str,
    code: str,
    message: str,
    definition_obj: Optional[dict[str, Any]] = None,
    recommended_fix: str = "",
) -> Issue:
    definition_obj = definition_obj or {}

    return Issue(
        wordId=str(doc.get("_id") or doc.get("id") or ""),
        wordText=display_word(doc),
        wordKey=str(doc.get("key") or ""),
        pos=str(doc.get("pos") or ""),
        status=str(doc.get("status") or ""),
        usedEntryCount=used_count,
        definitionIndex=index,
        severity=severity,
        code=code,
        message=message,
        recommendedFix=recommended_fix,
        example=str(definition_obj.get("example") or ""),
        meaningVi=str(definition_obj.get("meaningVi") or ""),
        definition=str(definition_obj.get("definition") or ""),
    )


async def count_used_entries(doc: dict[str, Any]) -> int:
    key = doc.get("key")
    pos = doc.get("pos")

    if not key or not pos:
        return 0

    return await get_entries_collection().count_documents({
        "wordKey": key,
        "pos": pos,
    })


def check_word(doc: dict[str, Any], used_count: int, fill_blank_check: bool) -> list[Issue]:
    issues: list[Issue] = []

    word = display_word(doc)
    pos = str(doc.get("pos") or "").upper()
    status = str(doc.get("status") or "")
    definitions = doc.get("definitions") or []

    if not word:
        issues.append(issue(doc, used_count, None, "HIGH", "WORD_TEXT_EMPTY", "Word text/key is empty."))

    if status == "READY" and not definitions:
        issues.append(issue(
            doc,
            used_count,
            None,
            "HIGH",
            "READY_WITHOUT_DEFINITIONS",
            "Word is READY but has no definitions.",
        ))

    if doc.get("isPhrase") is True and not doc.get("phraseType") and pos in PHRASE_POS - {"PHRASE"}:
        issues.append(issue(
            doc,
            used_count,
            None,
            "MEDIUM",
            "PHRASE_TYPE_EMPTY",
            "Phrase word has empty phraseType.",
        ))

    # Noun phrase as NOUN is acceptable, only info.
    if is_probably_phrase(word) and pos in {"NOUN", "VERB", "ADJ", "ADV"} and doc.get("isPhrase") is False:
        issues.append(issue(
            doc,
            used_count,
            None,
            "INFO",
            "PHRASE_FLAG_FALSE",
            "Word looks like a phrase but isPhrase=false. This is often acceptable for noun phrases.",
        ))

    cefr = doc.get("cefrLevel")
    if cefr and str(cefr) not in VALID_LEVELS:
        issues.append(issue(doc, used_count, None, "LOW", "INVALID_CEFR", f"Invalid cefrLevel: {cefr}"))

    for idx, definition in enumerate(definitions):
        if not isinstance(definition, dict):
            issues.append(issue(
                doc,
                used_count,
                idx,
                "HIGH",
                "DEFINITION_NOT_OBJECT",
                "Definition item is not an object.",
            ))
            continue

        definition_text = normalize_spaces(definition.get("definition") or "")
        meaning_vi = normalize_spaces(definition.get("meaningVi") or "")
        example = normalize_spaces(definition.get("example") or "")
        vi_example = normalize_spaces(definition.get("viExample") or "")
        level = str(definition.get("level") or "")

        if not definition_text:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "HIGH",
                "DEFINITION_EMPTY",
                "Definition is empty.",
                definition,
            ))

        if not meaning_vi:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "HIGH",
                "MEANING_VI_EMPTY",
                "meaningVi is empty.",
                definition,
            ))
        elif is_too_rough_meaning_vi(meaning_vi):
            issues.append(issue(
                doc,
                used_count,
                idx,
                "MEDIUM",
                "MEANING_VI_ROUGH",
                "meaningVi looks too short/rough.",
                definition,
            ))

        if not example:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "HIGH",
                "EXAMPLE_EMPTY",
                "Example is empty.",
                definition,
            ))
        else:
            if not example_looks_related(example, word):
                issues.append(issue(
                    doc,
                    used_count,
                    idx,
                    "MEDIUM",
                    "EXAMPLE_NOT_RECOGNIZABLE",
                    "Example may not clearly show the word/phrase being learned.",
                    definition,
                ))

            # Optional legacy check for exact fill-blank mode only.
            if fill_blank_check and not contains_exact_word(example, word):
                issues.append(issue(
                    doc,
                    used_count,
                    idx,
                    "INFO",
                    "FILL_BLANK_EXACT_MISMATCH",
                    "Example does not contain exact word/phrase. This matters only for exact fill-blank mode.",
                    definition,
                ))

        if not vi_example:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "MEDIUM",
                "VI_EXAMPLE_EMPTY",
                "viExample is empty.",
                definition,
            ))

        if level and level not in VALID_LEVELS:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "LOW",
                "INVALID_DEFINITION_LEVEL",
                f"Invalid definition level: {level}",
                definition,
            ))

        phrase_fix = recommended_phrase_fix(word, definition_text, meaning_vi)
        if phrase_fix:
            issues.append(issue(
                doc,
                used_count,
                idx,
                "MEDIUM",
                "PHRASE_CAN_BE_RICHER",
                f'Phrase can be clearer/richer as "{phrase_fix}".',
                definition,
                recommended_fix=phrase_fix,
            ))

    return issues


def build_query(args: argparse.Namespace) -> dict[str, Any]:
    query: dict[str, Any] = {}

    if args.status and args.status.upper() != "ALL":
        query["status"] = args.status.upper()

    if args.pos:
        query["pos"] = args.pos.upper()

    if args.q:
        keyword = args.q.strip()
        regex = {"$regex": re.escape(keyword), "$options": "i"}
        query["$or"] = [
            {"text": regex},
            {"key": regex},
            {"summaryVi": regex},
            {"definitions.definition": regex},
            {"definitions.meaningVi": regex},
            {"definitions.example": regex},
            {"definitions.viExample": regex},
        ]

    return query


def filter_issues(issues: list[Issue], args: argparse.Namespace) -> list[Issue]:
    filtered = issues

    if args.strict_only:
        filtered = [item for item in filtered if item.code in STRICT_CODES]

    if args.ignore_info:
        filtered = [item for item in filtered if item.severity != "INFO"]

    if args.codes:
        allowed = {
            code.strip()
            for code in args.codes.split(",")
            if code.strip()
        }
        filtered = [item for item in filtered if item.code in allowed]

    if args.only_high:
        filtered = [item for item in filtered if item.severity == "HIGH"]

    return filtered


async def scan_words(args: argparse.Namespace) -> list[Issue]:
    col = get_words_collection()
    query = build_query(args)

    cursor = col.find(query)

    if args.limit > 0:
        cursor = cursor.limit(args.limit)

    cursor = cursor.sort("updatedAt", -1)

    all_issues: list[Issue] = []
    scanned = 0
    skipped_unused = 0

    async for doc in cursor:
        used_count = await count_used_entries(doc)

        if args.used_only and used_count == 0:
            skipped_unused += 1
            continue

        scanned += 1
        all_issues.extend(check_word(doc, used_count, args.fill_blank_check))

        if scanned % 500 == 0:
            print(
                f"[scan] scanned={scanned}, skippedUnused={skipped_unused}, rawIssues={len(all_issues)}"
            )

    filtered = filter_issues(all_issues, args)

    print(
        f"[done] scanned={scanned}, skippedUnused={skipped_unused}, "
        f"rawIssues={len(all_issues)}, reportedIssues={len(filtered)}"
    )

    return filtered


def print_issues(issues: list[Issue], max_rows: int) -> None:
    if not issues:
        print("✅ No issues found.")
        return

    severity_order = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
        "INFO": 3,
    }

    issues = sorted(
        issues,
        key=lambda x: (
            severity_order.get(x.severity, 99),
            -x.usedEntryCount,
            x.wordText.lower(),
            x.definitionIndex if x.definitionIndex is not None else -1,
        ),
    )

    for item in issues[:max_rows]:
        idx = "-" if item.definitionIndex is None else str(item.definitionIndex)

        print("=" * 100)
        print(f"[{item.severity}] {item.code}")
        print(f"wordId: {item.wordId}")
        print(
            f"word: {item.wordText} | key: {item.wordKey} | pos: {item.pos} | "
            f"status: {item.status} | used: {item.usedEntryCount} | defIndex: {idx}"
        )
        print(f"message: {item.message}")

        if item.recommendedFix:
            print(f"recommendedFix: {item.recommendedFix}")
        if item.meaningVi:
            print(f"meaningVi: {item.meaningVi}")
        if item.definition:
            print(f"definition: {item.definition}")
        if item.example:
            print(f"example: {item.example}")

    if len(issues) > max_rows:
        print("=" * 100)
        print(f"... and {len(issues) - max_rows} more issues. Use --out to save full report.")


def write_json_report(path: str, issues: list[Issue]) -> None:
    payload = {
        "generatedAt": datetime.now(tz=timezone.utc).isoformat(),
        "count": len(issues),
        "issues": [asdict(item) for item in issues],
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[report] JSON saved: {path}")


def write_csv_report(path: str, issues: list[Issue]) -> None:
    fields = list(asdict(issues[0]).keys()) if issues else [
        "wordId",
        "wordText",
        "wordKey",
        "pos",
        "status",
        "usedEntryCount",
        "definitionIndex",
        "severity",
        "code",
        "message",
        "recommendedFix",
        "example",
        "meaningVi",
        "definition",
    ]

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()

        for item in issues:
            writer.writerow(asdict(item))

    print(f"[report] CSV saved: {path}")


async def close() -> None:
    global _client

    if _client is not None:
        _client.close()
        _client = None


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Quick scan Mongo words collection for dirty dictionary data."
    )

    parser.add_argument("--q", default="", help="Search keyword.")
    parser.add_argument("--status", default="READY", help="Word status: READY/PENDING/FAILED/PROCESSING/ALL.")
    parser.add_argument("--pos", default="", help="Filter by POS, e.g. NOUN.")
    parser.add_argument("--limit", type=int, default=0, help="Limit scanned words. 0 = no limit.")
    parser.add_argument("--max-print", type=int, default=80, help="Max issues printed to terminal.")
    parser.add_argument("--out", default="", help="Output report path. Supports .json or .csv.")

    parser.add_argument(
        "--strict-only",
        action="store_true",
        help="Only show issues that break core dictionary data. No exact fill-blank checks.",
    )
    parser.add_argument(
        "--used-only",
        action="store_true",
        help="Only report words referenced by vocab_word_entries.",
    )
    parser.add_argument(
        "--only-high",
        action="store_true",
        help="Only show HIGH severity issues.",
    )
    parser.add_argument(
        "--ignore-info",
        action="store_true",
        help="Hide INFO issues.",
    )
    parser.add_argument(
        "--fill-blank-check",
        action="store_true",
        help="Legacy optional check: report exact word/phrase mismatch as INFO.",
    )
    parser.add_argument(
        "--codes",
        default="",
        help="Comma-separated issue codes to include.",
    )

    args = parser.parse_args()

    print(f"[mongo] uri={DEFAULT_URI}")
    print(f"[mongo] db={DEFAULT_DB}")
    print(
        f"[scan] status={args.status}, pos={args.pos or 'ALL'}, q={args.q or '-'}, "
        f"limit={args.limit or 'ALL'}, strictOnly={args.strict_only}, "
        f"usedOnly={args.used_only}, fillBlankCheck={args.fill_blank_check}"
    )

    try:
        issues = await scan_words(args)
        print_issues(issues, args.max_print)

        if args.out:
            if args.out.lower().endswith(".csv"):
                write_csv_report(args.out, issues)
            else:
                write_json_report(args.out, issues)

    finally:
        await close()


if __name__ == "__main__":
    asyncio.run(main())