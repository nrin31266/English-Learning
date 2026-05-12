import json
from string import Template

SENTENCE_PROMPT_TEMPLATE = Template("""You are a deterministic English phonetics+translation engine.
For each sentence return US IPA (no slashes) and Vietnamese translation.
Input: $sentences_json
Output: JSON array, same count and order: [{"phoneticUs":"","translationVi":""}]
Rules: valid JSON only, no markdown, preserve order, raw IPA like "ˈsentəns".""")

_WORD_SCHEMA = """{
  "summaryVi": "≤5-word Vietnamese meanings separated by , or / for multiple meanings",
  "phonetics": {"uk":"IPA","ukAudioUrl":"","us":"IPA","usAudioUrl":""},
  "definitions": [
    {
      "definition": "Strong, precise, dictionary-grade EN meaning",
      "meaningVi": "Extremely short direct VI meaning for UI/Learner",
      "example": "EN sentence",
      "viExample": "VI translation",
      "level": "B1"
    }
  ],
  "isPhrase": false,
  "phraseType": "",
  "isValid": true,
  "cefrLevel": "B1"
}"""

_WORD_RULES = """RULES (strict):
1. isValid=false ONLY if: numbers/URLs/invalid chars/not real English. Never false for POS mismatch.
2. cefrLevel: The OVERALL CEFR level of the word. Calculate this as the average/highest difficulty across all definitions. DO NOT underestimate: formal, academic, specialized, or rare words MUST be rated B2, C1, or C2. Do NOT limit this global level to just the provided context.
3. summaryVi: ≤5 words total, meanings split by "," or "/" for multiple meanings.
4. phonetics: both UK+US IPA. CRITICAL: Use the provided 'context' and 'pos' to disambiguate the correct pronunciation (e.g., noun vs verb stress shift). audioUrl always "".
5. definitions: Return a comprehensive array of MULTIPLE definitions (TARGET: at least 3 distinct definitions for polysemous words).
   - Index [0] (First definition) MUST perfectly match the exact 'context' and 'pos' provided.
   - Index [1], [2], etc. MUST provide OTHER completely DIFFERENT common meanings, nuances, or secondary usages.
   - 'definition': MUST be a strong, precise, and advanced dictionary-grade English explanation.
   - 'meaningVi': MUST be extremely concise (1-3 words max), direct, and optimized for mobile UI display.
6. definitions[].level: The specific CEFR level for that exact meaning.
7. definitions[].viExample: Natural Vietnamese translation of the example sentence.
8. isPhrase=true when pos=PHRASE or word is a collocation/idiom/phrasal verb.
9. phraseType: COLLOCATION|IDIOM|PHRASAL_VERB|FIXED_EXPRESSION — "" for regular words.
10. Return ONLY JSON. No markdown. No extra fields. No null values."""

WORD_ANALYSIS_PROMPT_TEMPLATE = Template(
    f"""English lexical analysis engine. Analyze ONE word.
Input: {{"word":"$word","pos":"$pos","context":"$context"}}
Output schema:
{_WORD_SCHEMA}
{_WORD_RULES}"""
)


def build_batch_word_prompt(words: list[dict]) -> str:
    """
    words: [{"word": "...", "pos": "...", "context": "..."}, ...]
    One AI call to analyze N words. Returns compact prompt.
    """
    words_json = json.dumps(words, ensure_ascii=False, separators=(",", ":"))
    return (
        f"English lexical analysis engine. Analyze {len(words)} words.\n"
        f"Input JSON array: {words_json}\n\n"
        f"Return a JSON ARRAY of {len(words)} objects in the SAME ORDER. Each object:\n"
        f"{_WORD_SCHEMA}\n\n"
        f"{_WORD_RULES}"
    )
