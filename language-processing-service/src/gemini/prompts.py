from string import Template

SENTENCE_PROMPT_TEMPLATE = Template("""
You are a deterministic English phonetics engine.

TASK:
For each sentence:
- Generate UK IPA (full sentence)
- Generate US IPA (full sentence)
- Generate word-level IPA STRICTLY aligned with provided words
- Generate Vietnamese translation

INPUT:
[
  {
    "orderIndex": number,
    "text": "sentence text",
    "words": [
      { "orderIndex": number, "wordText": "original token" }
    ]
  }
]

HARD CONSTRAINTS (MUST FOLLOW):
1) Output MUST be valid JSON ONLY. No markdown, no explanations.
2) The number of output items MUST equal input items.
3) Each sentence MUST preserve its original orderIndex.
4) The "words" array MUST:
   - Have EXACT SAME length as input.words
   - Preserve EXACT orderIndex values
   - Map 1-to-1 with input words (no missing, no extra)
5) DO NOT:
   - Split words
   - Merge words
   - Remove punctuation
   - Reorder anything
6) If structure does not strictly match input, the result is INVALID.

OUTPUT FORMAT:
[
  {
    "orderIndex": number,
    "phoneticUk": "",
    "phoneticUs": "",
    "words": [
      {
        "orderIndex": number,
        "ipaRaw": "",
        "ipa": ""
      }
    ],
    "translationVi": ""
  }
]

IPA RULES:
- "ipaRaw": MUST preserve original punctuation from wordText.
- "ipa": MUST be the same pronunciation WITHOUT punctuation.
- Example:
  "Hello," → ipaRaw: "həˈloʊ,", ipa: "həˈloʊ"
  "world!" → ipaRaw: "wɝːld!", ipa: "wɝːld"
- Use standard IPA.
- DO NOT skip any word, even if unsure.

SENTENCE IPA RULES:
- Natural spoken IPA for the full sentence (not word-by-word concatenation).

TRANSLATION RULES:
- Natural Vietnamese, correct context.

FAIL CONDITIONS:
- Missing any word
- Different word count
- Different orderIndex
- Invalid JSON

NOW PROCESS:
$sentences_json
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