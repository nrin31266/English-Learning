VOCAB_SYSTEM_PROMPT = (
    "You are an expert vocabulary curriculum designer. "
    "Always respond with valid JSON only. No markdown, no explanation."
)

def build_subtopic_prompt(topic_title: str, description: str, cefr_range: str, n: int) -> str:
    return f"""Generate a comprehensive list of vocabulary sub-topics for the following topic.
Target minimum: {n} sub-topics. If the topic is broad, generate MORE to fully cover it.

Topic: "{topic_title}"
Description: "{description}"
CEFR range: {cefr_range}

Requirements:
- Each sub-topic covers a distinct semantic cluster (no overlap).
- Spread CEFR levels evenly across the range {cefr_range}.
- "titleVi" must be a natural, concise Vietnamese translation.
- Each sub-topic should be broad enough to represent AT LEAST 20 vocabulary words.

Return JSON object with key "subtopics" containing an array:
{{
  "subtopics": [
    {{
      "title": "...",
      "titleVi": "...",
      "description": "2-3 sentence description of vocabulary theme",
      "cefrLevel": "B1"
    }}
  ]
}}"""


def build_word_gen_prompt(
    topic_title: str,
    subtopic_title: str,
    subtopic_description: str,
    cefr_level: str,
    existing_keys: list[str],
) -> str:
    avoid = (
        "Avoid these already-used words: " + ", ".join(existing_keys[:100])
        if existing_keys
        else ""
    )
    return f"""Generate a comprehensive list of English vocabulary words for this sub-topic.
Quantity: AT LEAST 20 words. If the sub-topic is rich in vocabulary, generate MORE (up to 30-40 words) to ensure thorough coverage.

Parent topic: "{topic_title}"
Sub-topic: "{subtopic_title}"
Sub-topic description: "{subtopic_description}"
Target CEFR level: {cefr_level}

{avoid}

Requirements:
- Words must be genuinely and frequently used in this specific context.
- POS must be one of: NOUN, VERB, ADJ, ADV, PHRASE.
- For PHRASE, use underscore-separated form (e.g., "take_into_account").
- Provide a good mix of single words and useful collocations/phrases.
- All "word" values must be strictly lowercase.

Return JSON object:
{{
  "words": [
    {{ "word": "...", "pos": "NOUN" }}
  ]
}}"""