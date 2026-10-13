from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    app_url: str = "http://localhost:3000"
    secret_key: str = "dev-secret"
    database_url: str = "postgresql+asyncpg://vinihub:vinihub@postgres:5432/vinihub"

    google_client_id: str = ""
    google_client_secret: str = ""

    mock_models: bool = False
    providers_dir: str = "providers"
    template_presets_dir: str = "presets/templates"
    encryption_key: str = ""
    chat_context_chars: int = 48000

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_security: str = "starttls"
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "ViniHub <no-reply@vinihub.local>"

    minio_endpoint: str = "minio:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "vinihub"
    minio_secret_key: str = "vinihub-secret"
    minio_bucket: str = "vinihub"
    minio_secure: bool = False
    minio_public_secure: bool = False


settings = Settings()
