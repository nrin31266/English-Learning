from pydantic_settings import BaseSettings

class RedisConfig(BaseSettings):
    url: str

    model_config = {
        "env_file": ".env",
        "env_prefix": "REDIS_",
        "extra": "ignore",
    }