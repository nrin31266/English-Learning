import logging
from typing import Dict

from src.gemini.analyzer import analyze_word
from src.s3_storage.cloud_service import upload_file
from src.tts.tts_service import generate_audio

logger = logging.getLogger(__name__)


async def process_word_logic(
    text: str,
    pos: str,
    context: str,
    text_lower: str
) -> Dict:
    """
    Pipeline xử lý 1 word (SEQUENTIAL):
    - AI analyze
    - generate audio
    - upload audio
    - return SuccessRequest

    ❗ Fail ở bất kỳ bước nào → throw exception
    """

    logger.info(f"[START] {text_lower}_{pos}")

    # --- 1. AI ---
    ai_result = await analyze_word(text, pos, context)

    if not ai_result.get("isValid", False):
        logger.info(f"[INVALID] {text_lower}_{pos}")
        return ai_result

    phonetics = ai_result.get("phonetics", {})
    ipa_us = phonetics.get("us")
    ipa_uk = phonetics.get("uk")

    # --- 2. TTS ---
    logger.info(f"[TTS] {text_lower}_{pos}")

    # ❗ generate_audio vẫn trả (uk, us) nhưng bên trong đã safe
    uk_audio, us_audio = await generate_audio(
        ipa_us=ipa_us,
        ipa_uk=ipa_uk,
        word=text
    )

    # --- 3. UPLOAD (TUẦN TỰ) ---
    logger.info(f"[UPLOAD] {text_lower}_{pos}")

    uk_public_id = f"words/{text_lower}_{pos}_uk"
    us_public_id = f"words/{text_lower}_{pos}_us"

    uk_url = await upload_file(uk_audio, uk_public_id, resource_type="video")
    us_url = await upload_file(us_audio, us_public_id, resource_type="video")

    # --- 4. FINALIZE ---
    ai_result["phonetics"]["ukAudioUrl"] = uk_url
    ai_result["phonetics"]["usAudioUrl"] = us_url

    logger.info(f"[DONE] {text_lower}_{pos}")

    return ai_result