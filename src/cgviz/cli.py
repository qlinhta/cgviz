"""CLI entry point for CodeGraph-Viz."""

from __future__ import annotations

from pathlib import Path

import click
from rich.console import Console
from rich.panel import Panel

from cgviz.config import Settings
from cgviz.server import run_server


@click.command()
@click.argument("path", default=".", type=click.Path(exists=True))
@click.option("--port", "-p", default=7777, type=int, help="Server port")
@click.option("--host", default="127.0.0.1", help="Server host")
@click.option("--no-open", is_flag=True, help="Don't open browser")
@click.option("--no-watch", is_flag=True, help="Disable live reload")
@click.option(
    "--log-level",
    default="info",
    type=click.Choice(["debug", "info", "warning", "error"], case_sensitive=False),
    help="Log level",
)
def main(path: str, port: int, host: str, no_open: bool, no_watch: bool, log_level: str) -> None:
    """Launch the CodeGraph visualization server.

    PATH is the project root or path to .codegraph/codegraph.db (default: current directory).
    """
    settings = Settings(
        db_path=Path(path),
        port=port,
        host=host,
        open_browser=not no_open,
        watch=not no_watch,
        log_level=log_level,
    )

    db_path = settings.resolve_db_path()

    console = Console()
    console.print(
        Panel(
            f"[bold cyan]CodeGraph-Viz[/bold cyan]\n\n"
            f"  DB:   {db_path}\n"
            f"  URL:  http://{host}:{port}\n"
            f"  Watch: {'on' if settings.watch else 'off'}",
            title="codegraph-viz",
            border_style="cyan",
        )
    )

    run_server(settings)
