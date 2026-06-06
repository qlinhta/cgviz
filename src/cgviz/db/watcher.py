"""File-system watcher that triggers a callback when the CodeGraph DB changes.

Monitors the ``.codegraph/`` directory for writes to ``codegraph.db``,
``codegraph.db-wal``, and ``codegraph.db-shm``.  Changes are debounced
by 500 ms so rapid index updates only fire the callback once.
"""

from __future__ import annotations

import logging
import threading
from pathlib import Path
from typing import Callable

from watchdog.events import FileSystemEvent, FileSystemEventHandler
from watchdog.observers import Observer

logger = logging.getLogger(__name__)

_DB_FILES = {"codegraph.db", "codegraph.db-wal", "codegraph.db-shm"}


class _DebounceHandler(FileSystemEventHandler):
    """Receives raw FS events, debounces, and fires the user callback."""

    def __init__(self, callback: Callable[[], None], debounce_seconds: float = 0.5) -> None:
        super().__init__()
        self._callback = callback
        self._debounce = debounce_seconds
        self._timer: threading.Timer | None = None
        self._lock = threading.Lock()

    # watchdog calls on_modified / on_created / on_moved from its own thread.
    def on_modified(self, event: FileSystemEvent) -> None:
        self._handle(event)

    def on_created(self, event: FileSystemEvent) -> None:
        self._handle(event)

    def on_moved(self, event: FileSystemEvent) -> None:
        self._handle(event)

    def _handle(self, event: FileSystemEvent) -> None:
        if event.is_directory:
            return
        name = Path(event.src_path).name
        if name not in _DB_FILES:
            return
        self._schedule()

    def _schedule(self) -> None:
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
            self._timer = threading.Timer(self._debounce, self._fire)
            self._timer.daemon = True
            self._timer.start()

    def _fire(self) -> None:
        logger.debug("CodeGraph DB change detected, firing callback")
        try:
            self._callback()
        except Exception:
            logger.exception("Error in CodeGraph watcher callback")

    def cancel(self) -> None:
        with self._lock:
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None


class CodeGraphWatcher:
    """Watches the ``.codegraph/`` directory for database changes.

    Parameters
    ----------
    db_path:
        Path to ``codegraph.db``.  The parent directory is watched.
    on_change:
        Zero-argument callable invoked (from a background thread) when the
        database file is modified.  The call is debounced by 500 ms.
    """

    def __init__(self, db_path: Path, on_change: Callable[[], None]) -> None:
        self._watch_dir = db_path.resolve().parent
        self._handler = _DebounceHandler(on_change)
        self._observer = Observer()
        self._started = False

    def start(self) -> None:
        """Begin watching for changes."""
        if self._started:
            return
        self._observer.schedule(self._handler, str(self._watch_dir), recursive=False)
        self._observer.daemon = True
        self._observer.start()
        self._started = True
        logger.info("Watching for CodeGraph DB changes in %s", self._watch_dir)

    def stop(self) -> None:
        """Stop watching and clean up resources."""
        if not self._started:
            return
        self._handler.cancel()
        self._observer.stop()
        self._observer.join(timeout=2)
        self._started = False
        logger.info("Stopped CodeGraph DB watcher")
