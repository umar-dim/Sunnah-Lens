from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    GEMINI_API_KEY: str
    # Any OpenAI-compatible endpoint; all three unset = /api/chat disabled (503).
    CHAT_BASE_URL: str | None = None
    CHAT_API_KEY: str | None = None
    CHAT_MODEL: str | None = None

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
