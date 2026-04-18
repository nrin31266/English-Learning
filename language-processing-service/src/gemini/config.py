from pydantic_settings import BaseSettings

class GeminiConfig(BaseSettings):
    api_key: str
    model: str = "gemini-2.5-flash"

    model_config = {
        "env_file": ".env",
        "env_prefix": "GEMINI_",   
        "extra": "ignore"
    }

config = GeminiConfig()
print("Gemini Config Loaded:", config.model)
