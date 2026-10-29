import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    AI_PORT: int = int(os.getenv("AI_PORT", "8000"))
    MODEL_PATH: str = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__), "..", "models", "best.pt"))
    CONF_THRESHOLD: float = float(os.getenv("CONF_THRESHOLD", "0.25"))
    MODEL_REGISTRY_PATH: str = os.getenv("MODEL_REGISTRY_PATH", "models/registry.json")

    model_config = SettingsConfigDict(env_file=os.path.join(os.path.dirname(__file__), '..', '.env'), extra='ignore')

settings = Settings()
