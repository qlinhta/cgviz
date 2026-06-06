#!/usr/bin/env python3
"""Build the frontend and copy output to the Python package's static directory."""

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT / "frontend"
STATIC_DIR = ROOT / "src" / "cgviz" / "static"


def main() -> None:
    if not (FRONTEND_DIR / "package.json").exists():
        print("ERROR: frontend/package.json not found", file=sys.stderr)
        sys.exit(1)

    print("Installing frontend dependencies...")
    subprocess.run(["npm", "ci"], cwd=FRONTEND_DIR, check=True)

    print("Building frontend...")
    subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)

    dist = FRONTEND_DIR / "dist"
    if not dist.exists():
        print("ERROR: frontend/dist not found after build", file=sys.stderr)
        sys.exit(1)

    if STATIC_DIR.exists():
        for item in STATIC_DIR.iterdir():
            if item.name == ".gitkeep":
                continue
            if item.is_dir():
                shutil.rmtree(item)
            else:
                item.unlink()

    print(f"Copying {dist} -> {STATIC_DIR}")
    for item in dist.iterdir():
        dest = STATIC_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dest)
        else:
            shutil.copy2(item, dest)

    print("Frontend build complete.")


if __name__ == "__main__":
    main()
