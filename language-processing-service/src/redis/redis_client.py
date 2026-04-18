from redis.asyncio import from_url
from src.redis.config import RedisConfig

redis_config = RedisConfig()

redis_client = from_url(
    redis_config.url,
    decode_responses=True,
   # ssl=False
)
