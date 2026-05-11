from pydantic_settings import BaseSettings


class DeepSeekConfig(BaseSettings):
    api_key: str
    base_url: str = "https://api.deepseek.com"
    model: str = "deepseek-v4-flash"
    timeout_seconds: float = 180.0
    max_retries: int = 2

    model_config = {
        "env_file": ".env",
        "env_prefix": "DEEPSEEK_",
        "extra": "ignore",
    }


config = DeepSeekConfig()
print("DeepSeek Config Loaded:", config.model)
