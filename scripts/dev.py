#!/usr/bin/env python3
"""Run the FastAPI backend and Vite frontend dev server concurrently."""

import os
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"


def main() -> None:
    db_path = sys.argv[1] if len(sys.argv) > 1 else "."

    backend = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn",
            "cgviz.server:app_instance",
            "--reload",
            "--host", "127.0.0.1",
            "--port", "7777",
        ],
        cwd=ROOT,
        env={**os.environ, "CGVIZ_DB_PATH": db_path, "CGVIZ_OPEN_BROWSER": "false"},
    )

    frontend = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
    )

    def shutdown(sig, frame):
        backend.terminate()
        frontend.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        backend.wait()
        frontend.wait()
    except KeyboardInterrupt:
        backend.terminate()
        frontend.terminate()


if __name__ == "__main__":
    main()
