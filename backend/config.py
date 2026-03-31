from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "mistral"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    embedding_model: str = "mistral"
    faiss_index_path: str = "./data/faiss_index"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = True
    cors_origins: str = "http://localhost:3000"
    data_dir: str = "./data/documents"

    model_config = {"env_file": ".env"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
