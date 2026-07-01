import json
from string import Template


# ============================================================
# COMMON
# ============================================================

VOCAB_SYSTEM_PROMPT = (
    "Bạn là chuyên gia thiết kế chương trình học từ vựng tiếng Anh. "
    "Luôn trả về JSON hợp lệ. "
    "Không markdown. Không giải thích. Không thêm chữ ngoài JSON."
)


def _json_escape(value: str) -> str:
    return json.dumps(value or "", ensure_ascii=False)


def _json_array(values: list[str] | None) -> str:
    return json.dumps(values or [], ensure_ascii=False)


CEFR_VALUES = "A1, A2, B1, B2, C1, C2"


# ============================================================
# SHARED GUIDES
# ============================================================

CUSTOM_POS_GUIDE = """POS guide:
- POS is a vocabulary label used by the system for storage and UI.
- For vocab curriculum word lists, use only:
  NOUN, VERB, ADJ, ADV, PHRASE, PHRASAL_VERB, COLLOCATION, IDIOM, FIXED_EXPRESSION.
- For lesson word click or dictionary lookup, these POS may also appear:
  PRON, DET, AUX, ADP, CCONJ, SCONJ, PART, NUM, INTJ, PROPN, OTHER.

Content words:
- NOUN: noun or common noun phrase. Examples: "fare", "boarding pass", "customer feedback".
- VERB: single verb. Examples: "confirm", "reserve", "cancel".
- ADJ: adjective or short adjective phrase. Examples: "available", "non-refundable", "well known".
- ADV: adverb or adverbial phrase. Examples: "quickly", "in advance", "temporarily".

Function words for WordPopup/dictionary:
- PRON: pronoun. Examples: "I", "you", "we", "they", "myself".
- DET: determiner/article/quantifier before a noun. Examples: "a", "the", "this", "some", "every", "each".
- AUX: auxiliary/modal verb. Examples: "am", "is", "do", "have", "can", "should".
- ADP: preposition/adposition. Examples: "in", "on", "at", "to", "from", "with".
- CCONJ: coordinating conjunction. Examples: "and", "but", "or".
- SCONJ: subordinating conjunction. Examples: "because", "although", "if", "when".
- PART: particle. Examples: infinitive "to", "not", or particles in some verb phrases.
- NUM: number or quantity word. Examples: "one", "first", "half", "both".
- INTJ: interjection. Examples: "oh", "wow", "hey".
- PROPN: proper noun. Examples: "John", "Vietnam", "Google".
- OTHER: unclear or unclassified POS.

Phrase/custom labels:
- PHRASE: useful phrase not clearly in the groups below. Examples: "on time", "at risk".
- PHRASAL_VERB: verb + particle/preposition with its own meaning. Examples: "check in", "take off", "wake someone up".
- COLLOCATION: natural word combination. Examples: "make a reservation", "boarding pass", "customer service".
- IDIOM: idiom whose meaning is not literal. Examples: "break the ice", "hit the road".
- FIXED_EXPRESSION: fixed or semi-fixed expression. Examples: "as soon as possible", "in charge of", "be responsible for something".

Special POS rules:
- Do not mark a real English word invalid only because its POS is PRON, DET, AUX, ADP, CCONJ, SCONJ, PART, NUM, or INTJ.
- Function words are valid English and must be explained when the input is a real word.
- For DET such as "every", "each", "some", "any", explain the determiner/quantifier role.
- For AUX such as "am", "is", "do", "have", "can", explain the auxiliary/modal role or the be/do/have role.
- For ADP such as "in", "on", "at", "to", explain common preposition uses.
- Real contractions are valid English: "I'm", "you're", "he's", "don't", "can't", "won't".
- When possible, explain contractions through their full forms. Examples: "I'm" = "I am", "don't" = "do not".
- Natural placeholders are allowed in phrase patterns when needed:
  someone, somebody, something, one's, your.
  Examples: "wake someone up", "take something into account", "lose touch with someone", "do one's best".
"""


STRICT_JSON_RULES = """Strict output rules:
- Return valid JSON only.
- Do not use markdown.
- Do not explain outside JSON.
- Do not add fields outside the required schema.
- Do not use null.
- Use "" for unknown audio URLs or unavailable text fields.
- Keep the exact required output type: object or array as requested.
"""


DEFINITION_QUALITY_RULES = """Dictionary meaning rules:
- Meanings must be real, common enough, and dictionary-like.
- Explain only the exact input word or phrase.
- Do not invent a meaning to fit a topic.
- Do not use a meaning from another POS.
- Do not use the meaning of a longer phrase unless the input is exactly that phrase.
- Do not use vague definitions such as "something related to...".
- Each definition must describe one distinct sense.
- Avoid repeated or near-duplicate senses.
- Prefer meanings that English learners are likely to meet.
"""


EXAMPLE_RULES = """Example rules:
- example must be a natural, useful English sentence.
- The sentence must clearly use the target word/phrase in the selected meaning.
- Natural grammatical changes are allowed:
  nouns may be singular/plural; verbs may be conjugated, V-ing, or V-ed.
- For placeholders, replace them naturally in examples:
  "wake someone up" -> "Please wake me up at 7."
  "take something into account" -> "We took the cost into account."
  "do one's best" -> "She did her best."
- For phrases without placeholders, keep the phrase recognizable or use a very natural grammatical form.
- Do not replace the target with an unrelated synonym.
- Do not write examples that are too complex.
- Avoid sensitive, violent, sexual, political, or controversial content.
- Do not optimize for exact-string fill-in-the-blank; optimize for listening, quiz, flashcard, matching, and dictionary UI.
"""


VIETNAMESE_RULES = """Vietnamese quality rules:
- meaningVi must be natural Vietnamese and match the English definition.
- meaningVi should usually be 2-6 Vietnamese words.
- Do not use a single vague word such as "làm", "đặt", "điều", "cái", "sự".
- viExample must be a natural Vietnamese translation of example.
- Do not translate word-by-word mechanically.
- summaryVi must summarize the main Vietnamese meanings in 3-10 words.
- If there are several main meanings, separate them with "," or "/".
- Do not overload summaryVi with minor senses.
"""


PHONETIC_RULES = """Phonetic rules:
- phonetics.uk and phonetics.us must be raw IPA.
- Do not wrap IPA with "/" or "[]".
- Example correct: "ˈrekərd".
- Example wrong: "/ˈrekərd/" or "[ˈrekərd]".
- If pronunciation changes by POS, use the pronunciation for the requested POS.
- ukAudioUrl and usAudioUrl must always be "".
"""


CEFR_RULES = f"""CEFR rules:
- Use only: {CEFR_VALUES}.
- cefrLevel is the overall difficulty of the word/phrase.
- definitions[].level or level is the difficulty of that specific meaning.
- Do not rate formal, academic, specialized, or rare words too low; they are usually B2, C1, or C2.
"""


PHRASE_TYPE_RULES = """Phrase rules:
- isPhrase=true when the input is an idiom, collocation, phrasal verb, fixed expression, or multi-word phrase with a learnable meaning.
- phraseType must be one of: COLLOCATION, IDIOM, PHRASAL_VERB, FIXED_EXPRESSION.
- For a normal single word: isPhrase=false and phraseType="".
- If pos is PHRASAL_VERB, COLLOCATION, IDIOM, or FIXED_EXPRESSION, then isPhrase must be true.
- Mapping:
  PHRASAL_VERB -> phraseType="PHRASAL_VERB"
  COLLOCATION -> phraseType="COLLOCATION"
  IDIOM -> phraseType="IDIOM"
  FIXED_EXPRESSION -> phraseType="FIXED_EXPRESSION"
- If pos is PHRASE and it is not clearly one of the four phrase types, use isPhrase=true and phraseType="".
"""


POS_LOCK_RULES = f"""POS lock rules:
{CUSTOM_POS_GUIDE}
- The input pos is mandatory and must be followed exactly.
- Every definition must match the requested POS.
- NOUN: noun or noun phrase meaning only.
- VERB: verb meaning only.
- ADJ: adjective meaning only.
- ADV: adverb meaning only.
- PHRASE: meaning/use of the whole phrase.
- PHRASAL_VERB: meaning/use of the phrasal verb.
- COLLOCATION: meaning/use of the natural collocation.
- IDIOM: idiomatic meaning only.
- FIXED_EXPRESSION: meaning/use of the fixed or semi-fixed expression.
- Never borrow a meaning from another POS just because it seems more useful.
"""


# ============================================================
# SENTENCE PHONETIC + TRANSLATION PROMPT
# ============================================================

SENTENCE_PROMPT_TEMPLATE = Template("""You are a stable US English IPA and Vietnamese translation engine.

Task:
For each input sentence, return raw US IPA and a natural Vietnamese translation.

Input JSON:
$sentences_json

Required output:
[
  {
    "phoneticUs": "raw US IPA, without / or []",
    "translationVi": "natural Vietnamese translation"
  }
]

Rules:
- Return valid JSON only.
- Output length must equal input length.
- Keep the original sentence order.
- phoneticUs must be raw IPA only, without "/" or "[]".
- translationVi must sound natural in Vietnamese, not word-for-word.
""")


# ============================================================
# WORD DICTIONARY ANALYSIS PROMPT
# Used for clean dictionary entries by word + POS.
# Do not use topic context here; this prevents invented topic-based meanings.
# ============================================================

_WORD_SCHEMA = """{
  "summaryVi": "Tóm tắt ngắn các nghĩa tiếng Việt chính",
  "phonetics": {
    "uk": "IPA Anh-Anh dạng thô",
    "ukAudioUrl": "",
    "us": "IPA Anh-Mỹ dạng thô",
    "usAudioUrl": ""
  },
  "definitions": [
    {
      "definition": "Clear dictionary-style English definition",
      "meaningVi": "Nghĩa tiếng Việt tự nhiên, ngắn gọn",
      "example": "Natural English example using the target word/phrase or a natural grammatical form",
      "viExample": "Bản dịch tiếng Việt tự nhiên của example",
      "level": "B1"
    }
  ],
  "isPhrase": false,
  "phraseType": "",
  "isValid": true,
  "cefrLevel": "B1"
}"""


_WORD_RULES = f"""Required rules:

{STRICT_JSON_RULES}

Validity:
- isValid=false only when the input is not real English, is only a number, URL, random symbols, or meaningless text.
- Do not set isValid=false because the word is uncommon or the requested POS is uncommon.
- If isValid=false, still return the exact schema:
  summaryVi="", phonetics fields="", definitions=[], isPhrase=false, phraseType="", isValid=false, cefrLevel="A1".

{POS_LOCK_RULES}

{DEFINITION_QUALITY_RULES}

Number of definitions:
- Return as many definitions as are truly needed for the requested POS.
- If the word/phrase has many real senses in that POS, include the main distinct senses.
- If it has only one or a few real senses, return only those.
- Never add fake or weak meanings just to make the list longer.
- Do not include meanings of collocations, idioms, phrasal verbs, or expanded phrases unless the input is exactly that phrase.
- Example: for "run" as VERB, do not add separate senses for "run into" or "run out of".
- Example: for "take off" as PHRASAL_VERB, explain the phrasal verb because the input is exactly that phrase.
- Example: for "bank" as NOUN, explain noun senses of "bank"; do not add "bank account" as its own entry.

English definition style:
- definition must be in English.
- It must be clear, practical, and learner-friendly.
- VERB/PHRASAL_VERB definitions should usually start with "to ...".
- NOUN definitions should usually start with "a ...", "an ...", or "the ...".
- ADJ definitions should describe a state or quality.
- ADV definitions should describe manner, degree, time, frequency, or viewpoint.
- PHRASE/COLLOCATION/IDIOM/FIXED_EXPRESSION definitions must explain the whole expression.
- If the input contains someone/something/one's/your, explain the full pattern.

{VIETNAMESE_RULES}

{EXAMPLE_RULES}

{PHONETIC_RULES}

{CEFR_RULES}

{PHRASE_TYPE_RULES}

Sense order:
- definitions[0] must be the most common or core meaning for the requested POS.
- Later definitions should be other common meanings, secondary senses, or useful nuances.
- Do not include meanings of longer expressions when the input is not that exact expression.

Hard bans:
- Do not invent meanings.
- Do not infer meaning from an imagined topic.
- Do not switch POS.
- Do not explain a different phrase.
- Do not produce invalid JSON.
"""


WORD_ANALYSIS_PROMPT_TEMPLATE = Template(
    f"""You are a stable English vocabulary dictionary engine.

Task:
Analyze ONE English word or phrase using exactly the requested POS.

Input:
{{"word":"$word","pos":"$pos"}}

Output schema:
{_WORD_SCHEMA}

{_WORD_RULES}
"""
)


def build_batch_word_prompt(words: list[dict]) -> str:
    """
    words: [{"word": "...", "pos": "..."}]
    Analyze many words/phrases in one model call.
    No topic context is used, so the model should produce clean dictionary meanings by word + POS only.
    """
    safe_words = [
        {
            "word": item.get("word", ""),
            "pos": item.get("pos", ""),
        }
        for item in words
    ]

    words_json = json.dumps(
        safe_words,
        ensure_ascii=False,
        separators=(",", ":")
    )

    return (
        f"You are a stable English vocabulary dictionary engine.\n\n"
        f"Task:\n"
        f"Analyze {len(safe_words)} English words/phrases using exactly the requested POS for each item.\n\n"
        f"Input JSON array:\n"
        f"{words_json}\n\n"
        f"Required output:\n"
        f"- Return a JSON ARRAY with exactly {len(safe_words)} objects.\n"
        f"- Keep the same order as the input.\n"
        f"- Each object must follow this schema:\n"
        f"{_WORD_SCHEMA}\n\n"
        f"{_WORD_RULES}"
    )


# ============================================================
# VOCAB CURRICULUM PROMPTS
# Used for vocab_topics, vocab_subtopics, vocab_word_entries.
# ============================================================

def build_subtopic_prompt(
    topic_title: str,
    cefr_range: str,
    n: int,
    tags: list[str] | None = None,
) -> str:
    return f"""You are an English vocabulary curriculum designer.

Task:
Create clear subtopics for one large vocabulary topic.
The subtopics must have strong boundaries so later word generation does not overlap.

Input:
- topicTitle: {_json_escape(topic_title)}
- tags: {_json_array(tags)}
- cefrRange: {_json_escape(cefr_range)}
- targetSubtopicCount: {n}

Required output schema:
{{
  "topicDescription": "2-3 sentence English overview with semantic anchors: domain, clusters, actions, objects, roles, constraints",
  "subtopics": [
    {{
      "title": "Natural English subtopic title",
      "titleVi": "Tiêu đề tiếng Việt ngắn gọn",
      "description": "3-4 sentence English boundary description with clear includes and excludes",
      "cefrLevel": "B1"
    }}
  ]
}}

Rules:
{STRICT_JSON_RULES}
- Create around {n} subtopics.
- Quality is more important than forcing the exact count, but do not be far from targetSubtopicCount.
- Subtopics must represent truly different semantic clusters, not renamed synonyms.
- Do not create two subtopics that cover almost the same area.
  Bad pairs:
  "Flight Booking" vs "Buying Airline Tickets";
  "Business Meetings" vs "Meeting Discussions";
  "Frontend Layout" vs "Page Layout Design".
- Each subtopic should be broad enough for about 16-26 high-quality words/phrases.
- Each subtopic should still be narrow enough to avoid generic word lists.
- Spread CEFR levels reasonably within cefrRange.
- title must be natural English.
- titleVi must be short, natural Vietnamese.
- cefrLevel must be one of: {CEFR_VALUES}.

topicDescription:
- Write 2-3 English sentences.
- Include semantic anchors useful for backend scoring: domain, subdomains, actions, objects, roles, constraints.
- Do not write generic text such as "This topic covers useful vocabulary about...".

subtopic description:
- Write 3-4 English sentences.
- Clearly state what the subtopic INCLUDES.
- Clearly state what the subtopic EXCLUDES.
- The included area of one subtopic must not be inside the included area of another.
- Do not use vague descriptions such as "This subtopic is about travel and useful airport words."
- Good style:
  "Focuses on the process of booking flights, comparing ticket options, and confirming reservations. Includes vocabulary for fares, seats, schedules, and booking conditions. Strictly excludes airport security, baggage handling, boarding procedures, and in-flight services."
"""


def build_word_gen_prompt(
    topic_title: str,
    subtopic_title: str,
    subtopic_description: str,
    cefr_level: str,
) -> str:
    return f"""You are an English vocabulary word-list generation engine.

Task:
Generate high-quality English words/phrases for exactly the given learning subtopic.
The list is used for listening dictation, meaning quiz, word quiz, flashcards, and word-meaning matching.
Do not optimize for exact-string fill-in-the-blank.

Input:
- parentTopic: {_json_escape(topic_title)}
- subtopicTitle: {_json_escape(subtopic_title)}
- subtopicDescription: {_json_escape(subtopic_description)}
- targetCefrLevel: {_json_escape(cefr_level)}

Required output schema:
{{
  "words": [
    {{
      "word": "lowercase word or phrase",
      "pos": "NOUN"
    }}
  ]
}}

Output rules:
{STRICT_JSON_RULES}
- Return a JSON object only.
- words should contain 16-26 items when enough high-quality items exist.
- It is better to return fewer clean items than to invent weak items.

Selection rules:
- Every item must belong directly to subtopicDescription.
- Do not include words that are only generally related to parentTopic.
- Do not include loosely related words.
- Do not include words from the EXCLUDES part of subtopicDescription.
- Do not include words that belong better to a neighboring subtopic.
- Each item must have its own learning value.
- Avoid near-synonyms in the same list, such as:
  buy/purchase/acquire, select/choose/pick, fix/repair/mend.
- Avoid too many words from the same word family unless each has a clearly different POS or learning role.
  Bad: configure/configuration/configurable, develop/developer/development.
- Balance the list when possible:
  core nouns, action verbs, important adjectives, useful adverbs, common phrasal verbs,
  natural collocations, useful fixed expressions, and only very common relevant idioms.
- For low CEFR, avoid rare, academic, or specialized words.
- For high CEFR, formal/specialized words are allowed only when realistic for the subtopic.
- Do not include proper names, brands, specific places, URLs, numbers, or random symbols.
- Avoid sensitive, violent, sexual, political, or controversial items.

Phrase and placeholder rules:
- Natural phrase patterns with placeholders are allowed and encouraged when useful.
- Allowed placeholders: someone, somebody, something, one's, your.
- Use placeholders when the phrase normally needs a flexible object/subject.
  Good:
  "wake someone up", "take something into account", "get in touch with someone",
  "remind someone of something", "be responsible for something", "do one's best",
  "brush your teeth", "wash your face".
- Do not output incomplete phrases that later force examples to insert missing words.
  Bad:
  "wash face", "take account", "wake up" if the intended meaning is "wake someone up".
- Choose the form that makes the meaning clear:
  "wake up" = stop sleeping by oneself;
  "wake someone up" = make another person stop sleeping;
  "get up" = rise from bed or stand;
  "get someone up" = make someone get out of bed.

Word format:
- word must be lowercase.
- Keep natural spelling, spaces, apostrophes, hyphens, and periods only when they are part of the word/phrase.
- Keep valid English diacritics/accent marks when standard: "café", "résumé", "naïve", "façade".
- Do not use underscores in phrases.
- Do not include meaning or explanation inside word.

{CUSTOM_POS_GUIDE}

Valid examples:
- {{"word": "boarding pass", "pos": "COLLOCATION"}}
- {{"word": "check in", "pos": "PHRASAL_VERB"}}
- {{"word": "fare", "pos": "NOUN"}}
- {{"word": "take something into account", "pos": "FIXED_EXPRESSION"}}
- {{"word": "be responsible for something", "pos": "FIXED_EXPRESSION"}}
- {{"word": "wake someone up", "pos": "PHRASAL_VERB"}}
- {{"word": "do one's best", "pos": "FIXED_EXPRESSION"}}
- {{"word": "brush your teeth", "pos": "COLLOCATION"}}
- {{"word": "well known", "pos": "ADJ"}}
- {{"word": "on time", "pos": "PHRASE"}}
- {{"word": "résumé", "pos": "NOUN"}}

Invalid examples:
- {{"word": "boarding_pass", "pos": "COLLOCATION"}}
- {{"word": "Airport Security", "pos": "NOUN"}}
- {{"word": "wash face", "pos": "COLLOCATION"}}
- {{"word": "take account", "pos": "FIXED_EXPRESSION"}}
- {{"word": "airport", "pos": "NOUN"}} if the subtopic is only about booking flight tickets.
- {{"word": "buy", "pos": "VERB"}} and {{"word": "purchase", "pos": "VERB"}} in the same list if they serve the same role.
- {{"word": "check in", "pos": "VERB"}} if the intended item is the common phrasal verb; use PHRASAL_VERB.
"""


def build_single_meaning_prompt(
    word: str,
    pos: str,
    topic_title: str,
    topic_description: str,
    subtopic_title: str,
    subtopic_description: str,
) -> str:
    return f"""You are an English vocabulary sense-selection engine.

Task:
Return EXACTLY ONE meaning for the input word/phrase.
The selected meaning must be a real meaning of the input and the best fit for the given learning subtopic.

Input:
- word: {_json_escape(word)}
- pos: {_json_escape(pos)}
- topicTitle: {_json_escape(topic_title)}
- topicDescription: {_json_escape(topic_description)}
- subtopicTitle: {_json_escape(subtopic_title)}
- subtopicDescription: {_json_escape(subtopic_description)}

Required output schema:
{{
  "definition": "Clear dictionary-style English definition that matches the selected real sense",
  "meaningVi": "Nghĩa tiếng Việt tự nhiên, ngắn gọn",
  "example": "Natural English example using the target word/phrase or a natural grammatical form",
  "viExample": "Bản dịch tiếng Việt tự nhiên của example",
  "level": "B1"
}}

Core decision rules:
- Do not invent a new meaning.
- Do not bend the meaning just to fit the subtopic.
- Select a real, common or reasonable meaning of the exact input.
- Prefer the meaning that best matches subtopicDescription.
- Use topicDescription only as wider context for disambiguation.
- If subtopicDescription and topicDescription conflict, prefer subtopicDescription.
- If the word does not fit the subtopic well, still choose the nearest real meaning; never invent one.
- EXCLUDES in subtopicDescription is a soft boundary for sense selection, not an absolute ban.
- Do not reject a real meaning only because its definition/example contains a keyword that also appears in EXCLUDES.

Output rules:
{STRICT_JSON_RULES}
- Return exactly one JSON object.
- Do not return an array.

{POS_LOCK_RULES}

{DEFINITION_QUALITY_RULES}

Definition-specific rules:
- definition must be in English.
- definition must be clear, practical, and dictionary-style.
- Do not write a one-word definition.
- Do not write a long or rambling definition.
- Do not use overly specialized details if a common meaning fits.
- Do not use the meaning of a longer phrase unless input is exactly that phrase.
- If input contains someone/something/one's/your, define the whole pattern.
- Example: "bank" must not use "bank account" as the meaning.
- Example: "take off" may use the phrasal verb meaning because input is exactly the phrase.
- Example: "wake someone up" must mean making someone stop sleeping, not waking by oneself.

{VIETNAMESE_RULES}

{EXAMPLE_RULES}

{CEFR_RULES}

Return:
- Only the JSON object matching the schema.
"""
