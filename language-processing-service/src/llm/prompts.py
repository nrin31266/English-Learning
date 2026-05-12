import json
from string import Template

SENTENCE_PROMPT_TEMPLATE = Template("""You are a deterministic English phonetics+translation engine.
For each sentence return US IPA (no slashes) and Vietnamese translation.
Input: $sentences_json
Output: JSON array, same count and order: [{"phoneticUs":"","translationVi":""}]
Rules: valid JSON only, no markdown, preserve order, raw IPA like "ˈsentəns".""")

_WORD_SCHEMA = """{
  "summaryVi": "≤5-word Vietnamese meanings separated by /",
  "phonetics": {"uk":"IPA","ukAudioUrl":"","us":"IPA","usAudioUrl":""},
  "definitions": [
    {
      "definition": "EN meaning",
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
2. cefrLevel: This base level MUST accurately reflect the specific provided 'context', not just the general word level.
3. summaryVi: ≤5 words total, meanings split by "/".
4. phonetics: both UK+US IPA; audioUrl always "".
5. definitions: Generate ALL distinct, commonly used meanings for this word (DO NOT limit to 2 or 3).
   - CORE RULE: The FIRST definition MUST perfectly match the exact 'context' and 'pos' provided if available.
   - meaningVi MUST be extremely concise, direct, and optimized for mobile UI display (no long explanations).
6. definitions[].level: CEFR level for that specific meaning.
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
