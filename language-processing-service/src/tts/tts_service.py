import asyncio
import logging
from google.cloud import texttospeech
from typing import Optional, Tuple
import xml.sax.saxutils as saxutils

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VOICE_MAP = {
    "uk": {
        "language": "en-GB",
        "voice": "en-GB-Wavenet-B" # giọng nam
    },
    "us": {
        "language": "en-US",
        "voice": "en-US-Wavenet-E" # giọng nữ
    },
}


# --- SYNC CORE ---
def _synthesize_sync(ssml_text: str, voice_key: str) -> bytes:
    selected = VOICE_MAP.get(voice_key, VOICE_MAP["us"])

    logger.info(f"[TTS-{voice_key.upper()}] Voice: {selected['voice']}")

    client = texttospeech.TextToSpeechClient()

    synthesis_input = texttospeech.SynthesisInput(ssml=ssml_text)

    voice = texttospeech.VoiceSelectionParams(
        language_code=selected["language"],
        name=selected["voice"]
    )

    # 🔥 đọc chậm ở đây (KHÔNG dùng prosody nữa)
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.9,
        pitch=0.0
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config
    )

    size = len(response.audio_content)
    logger.info(f"[TTS-{voice_key.upper()}] Done - Size: {size} bytes")

    # ⚠️ detect audio lỗi (rất hay)
    if size < 3000:
        logger.warning(f"[TTS-{voice_key.upper()}] Suspicious small audio!")

    return response.audio_content


# --- ASYNC WRAPPER ---
async def _synthesize_ssml(ssml_text: str, voice_key: str) -> bytes:
    return await asyncio.to_thread(_synthesize_sync, ssml_text, voice_key)


# --- SSML BUILDER ---
# Problem: UK chưa thể tuân thủ IPA
def build_ssml(word: str, ipa: Optional[str]) -> str:
    if not ipa:
        safe_word = saxutils.escape(word)
        return f"<speak>{safe_word}</speak>"

    clean_ipa = ipa.strip().strip('/').strip('[').strip(']')
    safe_ipa = saxutils.escape(clean_ipa)
    
        
    safe_word = saxutils.escape(word)

    logger.info(f"[TTS] IPA: {safe_ipa} | Word-Hack: {safe_word}")

    return (
        f'<speak>'
        f'<break time="10ms"/>' # Nghỉ cực ngắn để ổn định engine
        f'<phoneme alphabet="ipa" ph="{safe_ipa}">{safe_word}</phoneme>'
        f'</speak>'
    )

# --- MAIN API ---
async def generate_audio(
    ipa_us: Optional[str],
    ipa_uk: Optional[str],
    word: str
) -> Tuple[bytes, bytes]:

    logger.info(f"[TTS] Generate: {word}")

    us_ssml = build_ssml(word, ipa_us)
    uk_ssml = build_ssml(word, ipa_uk)

    uk_task = _synthesize_ssml(uk_ssml, "uk")
    us_task = _synthesize_ssml(us_ssml, "us")

    uk_audio, us_audio = await asyncio.gather(uk_task, us_task)

    logger.info(f"[TTS] Done: {word}")

    return uk_audio, us_audio