import json
from string import Template


LESSON_METADATA_PROMPT_TEMPLATE = Template("""You are a lesson metadata and translation engine for an English learning app.

Input:
- sourceType: $source_type
- sourceTitle: $source_title
- existingTitle: $existing_title
- existingDescription: $existing_description
- sourceLicenseType: $source_license_type
- transcriptLanguageHint: $language_hint
- sentences JSON:
$sentences_json

Return valid JSON only with this exact shape:
{
  "title": "short learner-facing lesson title",
  "description": "1-2 short English sentences describing the lesson",
  "languageLevel": "A1|A2|B1|B2|C1|C2",
  "sourceLanguage": "BCP-47 language tag such as en-US, en-GB, vi-VN, ja-JP, unknown",
  "sourceLicenseType": "STANDARD_YOUTUBE|CREATIVE_COMMONS|OWNED_CONTENT|PERMISSION_GRANTED|UNKNOWN",
  "sentences": [
    {
      "translationVi": "natural Vietnamese translation"
    }
  ]
}

Rules:
- Output sentences length must equal input sentences length and keep the same order.
- Do not include IPA or phonetics.
- Infer sourceLanguage from the transcript content.
- Infer languageLevel from vocabulary, grammar, speed implied by sentence complexity, and discourse style.
- Preserve the provided sourceLicenseType when the request already supplied one.
- For YouTube without a provided license, prefer CREATIVE_COMMONS.
- For YouTube, do not invent a title or description; keep existingTitle and existingDescription.
- For uploaded audio, keep existingTitle/existingDescription when provided.
- For uploaded audio with missing title or description, generate the missing fields in English.
- For uploaded audio, set sourceLicenseType to OWNED_CONTENT unless the content suggests otherwise.
- Vietnamese should sound natural, concise, and suitable for learners.
""")


def build_lesson_metadata_prompt(
    source_type: str,
    source_title: str | None,
    existing_title: str | None,
    existing_description: str | None,
    source_license_type: str | None,
    language_hint: str | None,
    sentences: list[str],
) -> str:
    return LESSON_METADATA_PROMPT_TEMPLATE.substitute(
        source_type=source_type,
        source_title=json.dumps(source_title or "", ensure_ascii=False),
        existing_title=json.dumps(existing_title or "", ensure_ascii=False),
        existing_description=json.dumps(existing_description or "", ensure_ascii=False),
        source_license_type=json.dumps(source_license_type or "", ensure_ascii=False),
        language_hint=json.dumps(language_hint or "", ensure_ascii=False),
        sentences_json=json.dumps(sentences, ensure_ascii=False),
    )
