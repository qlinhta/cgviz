from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_path: Path = Path(".")
    host: str = "127.0.0.1"
    port: int = 7777
    open_browser: bool = True
    log_level: str = "info"
    watch: bool = True

    model_config = {"env_prefix": "CGVIZ_"}

    def resolve_db_path(self) -> Path:
        """Find codegraph.db by walking up from db_path."""
        p = self.db_path.resolve()

        if p.is_file() and p.name == "codegraph.db":
            return p

        if p.is_dir():
            candidate = p / ".codegraph" / "codegraph.db"
            if candidate.exists():
                return candidate

        current = p if p.is_dir() else p.parent
        for _ in range(10):
            candidate = current / ".codegraph" / "codegraph.db"
            if candidate.exists():
                return candidate
            parent = current.parent
            if parent == current:
                break
            current = parent

        raise FileNotFoundError(
            f"No .codegraph/codegraph.db found at or above {self.db_path}. "
            "Run 'codegraph init -i' in your project first."
        )
