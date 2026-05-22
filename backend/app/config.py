import os
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = os.environ.get("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL: str = "https://api.siliconflow.cn/v1"
    DEEPSEEK_MODEL: str = "deepseek-ai/DeepSeek-R1.5"

    COZE_API_KEY: str = os.environ.get("COZE_API_KEY", "")
    COZE_URL: str = os.environ.get("COZE_URL", "https://3xqbzqjk5g.coze.site/stream_run")
    COZE_BOT_ID: str = os.environ.get("COZE_BOT_ID", "")

    GAME_MAX_ROUNDS: int = 10
    INITIAL_SANITY: int = 100
    INITIAL_MONEY: int = 5000
    INITIAL_REPUTATION: int = 50

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()