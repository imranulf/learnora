from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Literal


class Settings(BaseSettings):
    # App settings
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False  # Default to False for security
    APP_NAME: str = "Learnora Core Service"
    VERSION: str = "0.1.0"

    # Security
    SECRET_KEY: str = "change-this-to-a-random-secret-key-in-production"

    # Database
    DATABASE_URL: str = "sqlite:///./learnora.db"
    DB_ECHO: bool = False

    # LangSmith
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: str = ""
    LANGSMITH_PROJECT: str = ""
    LANGSMITH_ENDPOINT: str = "https://eu.api.smith.langchain.com"

    # Google AI
    GOOGLE_API_KEY: str = ""

    # API Settings
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]

    # Knowledge Graph Settings
    KG_STORAGE_PATH: str = "./data/graph"
    KG_FORMAT: str = "turtle"  # RDF serialization format (turtle, xml, n3, etc.)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def validate_production_settings(self) -> None:
        """Validate settings for production environment.

        Raises:
            ValueError: If production settings are invalid
        """
        if self.APP_ENV == "production":
            # Check for weak/default SECRET_KEY
            weak_keys = [
                "change-this-to-a-random-secret-key-in-production",
                "secret",
                "your-secret-key",
            ]
            if self.SECRET_KEY in weak_keys or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be a strong random key (at least 32 chars) in production. "
                    "Generate with: openssl rand -hex 32"
                )

            # Warn if DEBUG is enabled in production
            if self.DEBUG:
                import warnings
                warnings.warn(
                    "DEBUG=True in production environment! This is a security risk.",
                    UserWarning
                )


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance with production validation."""
    _settings = Settings()
    # Validate production settings on startup
    _settings.validate_production_settings()
    return _settings


settings = get_settings()