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

First, auto-generate a concise 1-2 sentence description of this vocabulary topic based on the title and tags.

CRITICAL Requirements for Sub-topics:
- STRICTLY MUTUALLY EXCLUSIVE: Each sub-topic MUST cover a completely distinct semantic cluster. There must be ZERO conceptual overlap between them.
- DEFINING BOUNDARIES (INCLUDES & EXCLUDES): The "description" MUST be a highly detailed 3-4 sentence explanation. It MUST explicitly state what specific aspects are INCLUDED and what related aspects are strictly EXCLUDED. (e.g., "Focuses strictly on the flight booking process and ticketing. Strictly excludes airport security, luggage, or boarding procedures.").
- Spread CEFR levels evenly across the range {cefr_range}.
- "titleVi" must be a natural, concise Vietnamese translation.
- Each sub-topic should be broad enough to represent AT LEAST 20-30 unique vocabulary words.

Return JSON object:
{{
  "topic_description": "1-2 sentence English summary of the overall topic",
  "subtopics": [
    {{
      "title": "...",
      "titleVi": "...",
      "description": "3-4 sentence detailed boundary description. Must clearly state INCLUDES and EXCLUDES to prevent any word overlap.",
      "cefrLevel": "B1"
    }}
  ]
}}"""

def build_word_gen_prompt(
    topic_title: str,
    subtopic_title: str,
    subtopic_description: str,
    cefr_level: str,
) -> str:
    return f"""Generate a highly specific list of English vocabulary words for this targeted sub-topic.
Quantity: Generate exactly 20 to 25 words to ensure thorough coverage.

Parent topic: "{topic_title}"
Sub-topic: "{subtopic_title}"
Sub-topic Context/Boundaries: "{subtopic_description}"
Target CEFR level: {cefr_level}

Requirements:
- STRICT CONTEXTUAL ALIGNMENT: Words MUST belong exclusively to the highly specific "Sub-topic Context/Boundaries" described above. DO NOT generate generic words from the broader Parent topic.
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