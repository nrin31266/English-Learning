import logging
from typing import Dict

from src.llm.analyzer import analyze_word
from src.s3_storage.cloud_service import upload_file
from src.tts.tts_service import generate_audio

logger = logging.getLogger(__name__)


async def process_word_logic(
    text: str,
    pos: str,
    context: str,
    _ai_result: Dict = None,
) -> Dict:
    """
    Pipeline xử lý 1 word (SEQUENTIAL):
    - AI analyze (skipped if _ai_result is provided — batch mode)
    - generate audio
    - upload audio
    - return result dict

    ❗ Fail ở bất kỳ bước nào → throw exception
    """

    logger.info(f"[START] {text}_{pos}")

    # --- 1. AI (skip if batch pre-computed) ---
    ai_result = _ai_result if _ai_result is not None else await analyze_word(text, pos, context)

    if not ai_result.get("isValid", False):
        logger.info(f"[INVALID] {text}_x{pos}")
        return ai_result

    phonetics = ai_result.get("phonetics", {})
    ipa_us = phonetics.get("us")
    ipa_uk = phonetics.get("uk")

    # --- 2. TTS ---
    logger.info(f"[TTS] {text}_{pos}")

    # ❗ generate_audio vẫn trả (uk, us) nhưng bên trong đã safe
    uk_audio, us_audio = await generate_audio(
        ipa_us=ipa_us,
        ipa_uk=ipa_uk,
        word=text
    )

    # --- 3. UPLOAD (TUẦN TỰ) ---
    logger.info(f"[UPLOAD] {text}_{pos}")

    us_public_id = f"words/{text}_{pos}_us"
    us_url = await upload_file(us_audio, us_public_id, resource_type="video")

    # UK TTS disabled — uk_audio is always b"", skip upload.
    # uk_public_id = f"words/{text}_{pos}_uk"
    # uk_url = await upload_file(uk_audio, uk_public_id, resource_type="video")

    # --- 4. FINALIZE ---
    ai_result["phonetics"]["ukAudioUrl"] = ""
    ai_result["phonetics"]["usAudioUrl"] = us_url

    logger.info(f"[DONE] {text}_{pos}")

    return ai_result