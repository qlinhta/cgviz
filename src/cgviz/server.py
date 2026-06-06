"""FastAPI application factory and server runner."""

from __future__ import annotations

import asyncio
import importlib.resources
import logging
import threading
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from cgviz.api.router import router as api_router
from cgviz.api.ws import broadcast_update, router as ws_router
from cgviz.config import Settings
from cgviz.db.reader import CodeGraphDB
from cgviz.db.watcher import CodeGraphWatcher

logger = logging.getLogger(__name__)


def create_app(settings: Settings) -> FastAPI:
    db_path = settings.resolve_db_path()
    db = CodeGraphDB(db_path)
    watcher: CodeGraphWatcher | None = None

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        nonlocal watcher
        await db.connect()
        app.state.db = db

        if settings.watch:
            loop = asyncio.get_running_loop()

            def on_change():
                asyncio.run_coroutine_threadsafe(
                    broadcast_update({"type": "graph_updated", "data": {}}),
                    loop,
                )

            watcher = CodeGraphWatcher(db_path, on_change)
            watcher.start()

        yield

        if watcher is not None:
            watcher.stop()
        await db.close()

    app = FastAPI(
        title="CodeGraph-Viz",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(api_router, prefix="/api")
    app.include_router(ws_router)

    # Mount static files for frontend (catch-all, must be last)
    static_dir = importlib.resources.files("cgviz") / "static"
    static_path = Path(str(static_dir))
    if static_path.is_dir() and any(static_path.iterdir()):
        app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")

    return app


def run_server(settings: Settings) -> None:
    db_path = settings.resolve_db_path()
    logger.info("Starting CodeGraph-Viz server (db: %s)", db_path)

    app = create_app(settings)

    if settings.open_browser:
        url = f"http://{settings.host}:{settings.port}"
        threading.Timer(1.0, webbrowser.open, args=[url]).start()

    uvicorn.run(
        app,
        host=settings.host,
        port=settings.port,
        log_level=settings.log_level,
    )
