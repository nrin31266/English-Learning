from pydantic_settings import BaseSettings

class TTSConfig(BaseSettings):
    # mặc định giọng US nếu không chọn
    default_voice: str = "us"

    model_config = {
        "env_file": ".env",
        "env_prefix": "TTS_",
        "extra": "ignore"
    }

config = TTSConfig()
