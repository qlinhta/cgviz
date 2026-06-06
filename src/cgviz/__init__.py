"""CodeGraph-Viz: Interactive visualization for CodeGraph knowledge graphs."""

from cgviz.config import Settings

__version__ = "0.1.0"


def launch(
    path: str = ".",
    port: int = 7777,
    host: str = "127.0.0.1",
    open_browser: bool = True,
    watch: bool = True,
) -> None:
    """Launch the CodeGraph visualization server.

    Args:
        path: Path to project root or .codegraph/codegraph.db file.
        port: Server port.
        host: Server host.
        open_browser: Open browser automatically.
        watch: Enable live reload on DB changes.
    """
    from pathlib import Path as P

    from cgviz.server import run_server

    settings = Settings(
        db_path=P(path),
        port=port,
        host=host,
        open_browser=open_browser,
        watch=watch,
    )
    run_server(settings)


__all__ = ["launch", "Settings", "__version__"]
