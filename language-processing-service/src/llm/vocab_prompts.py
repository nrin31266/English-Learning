VOCAB_SYSTEM_PROMPT = (
    "You are an expert vocabulary curriculum designer. "
    "Always respond with valid JSON only. No markdown, no explanation."
)

def build_subtopic_prompt(topic_title: str, cefr_range: str, n: int, tags: list[str] | None = None) -> str:
    tags_str = ", ".join(tags) if tags else "none"
    return f"""Generate a comprehensive list of vocabulary sub-topics for the following topic.
Target number of sub-topics: {n}

Topic: "{topic_title}"
Tags: [{tags_str}]
CEFR range: {cefr_range}

First, auto-generate a concise 1-2 sentence description of this vocabulary topic based on the title and tags. This description will be used as the topic's summary in the system.

Requirements:
- "topic_description": a concise 1-2 sentence English description summarizing the topic's vocabulary scope.
- Each sub-topic covers a distinct semantic cluster (no overlap).
- Spread CEFR levels evenly across the range {cefr_range}.
- "titleVi" must be a natural, concise Vietnamese translation.
- Each sub-topic should be broad enough to represent AT LEAST 20 vocabulary words.

Return JSON object with keys "topic_description" and "subtopics":
{{
  "topic_description": "1-2 sentence English summary of the overall topic",
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
Quantity: AT LEAST 16 words. If the sub-topic is rich in vocabulary, generate up to 25 words to ensure thorough coverage.

Parent topic: "{topic_title}"
Sub-topic: "{subtopic_title}"
Sub-topic description: "{subtopic_description}"
Target CEFR level: {cefr_level}

{avoid}

Requirements:
- Words must be genuinely and frequently used in this specific context.
- POS must be one of: NOUN, VERB, ADJ, ADV, PHRASE.
- Provide a good mix of single words and useful collocations/phrases.
- IMPORTANT: Keep natural spelling, spaces, apostrophes, and accents (e.g., "chargé d'affaires", "take into account"). DO NOT use underscores for phrases.
- All "word" values must be strictly lowercase.
Return JSON object:
{{
  "words": [
    {{ "word": "...", "pos": "NOUN" }}
  ]
}}"""