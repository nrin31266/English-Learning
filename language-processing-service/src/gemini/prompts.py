from string import Template

SENTENCE_PROMPT_TEMPLATE = Template("""
You are a deterministic English phonetics and translation engine.

TASK:
For each sentence, generate:
- US IPA pronunciation (without enclosing slashes)
- Vietnamese translation

INPUT:
$sentences_json

HARD CONSTRAINTS (MUST FOLLOW):
1) Output MUST be valid JSON ONLY. No markdown, no explanations.
2) Number of output items MUST equal number of input items.
3) Preserve the exact order of input sentences.
4) DO NOT add slashes "/" around IPA values. Return raw IPA like "ˈsentəns"

OUTPUT FORMAT:
[
  {
    "phoneticUs": "",
    "translationVi": ""
  }
]
""")
WORD_ANALYSIS_PROMPT_TEMPLATE = Template("""
You are an English lexical analysis engine.

TASK:
Analyze ONE English word using POS and context.

INPUT:
{
  "word": "$word",
  "pos": "$pos",
  "context": "$context"
}

OUTPUT REQUIREMENTS (VERY STRICT):
1) Output MUST be valid JSON ONLY. No markdown. No code fences.
2) DO NOT omit any fields.
3) If unknown → use "" or [].
4) Keep structure EXACTLY as defined.

OUTPUT FORMAT:
{
  "summaryVi": "",
  "phonetics": {
    "uk": "",
    "ukAudioUrl": "",
    "us": "",
    "usAudioUrl": ""
  },
  "definitions": [
    {
      "definition": "",
      "meaningVi": "",
      "example": ""
    }
  ],
  "isValid": true,
  "cefrLevel": ""
}

RULES:

1) isValid:
- false if:
  - contains numbers, URLs, emails
  - invalid characters
  - not a real English word
- DO NOT mark false just because POS does not match context

2) cefrLevel:
- MUST be one of: A1, A2, B1, B2, C1, C2
- Based on common CEFR classification of the word
- If unsure → choose the closest level
- DO NOT leave empty

3) summaryVi:
- VERY SHORT Vietnamese meanings
- separated by "," or "/"
- NO full sentence

4) phonetics:
- Provide BOTH UK and US IPA
- Based on correct POS
- audioUrl MUST be "" (do NOT invent URLs)

5) definitions:
- MUST return as MANY definitions as possible (up to 3)
- Prefer 2–3 definitions whenever possible
- Returning only 1 definition when multiple meanings exist is NOT preferred
- definition: clear English meaning
- meaningVi: natural Vietnamese
- example:
  - FIRST definition MUST match context
  - MUST use correct POS

6) context usage:
- MUST use context to choose correct meaning

7) DO NOT:
- add extra fields
- return null
- generate long explanations

IMPORTANT:
Return ONLY JSON object.

NOW ANALYZE.
""")