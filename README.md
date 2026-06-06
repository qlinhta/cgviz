# cgviz

[![PyPI version](https://img.shields.io/pypi/v/cgviz)](https://pypi.org/project/cgviz/)
[![Python versions](https://img.shields.io/pypi/pyversions/cgviz)](https://pypi.org/project/cgviz/)
[![License: MIT](https://img.shields.io/pypi/l/cgviz)](LICENSE)

**Explore your codebase as an interactive graph — one command, zero config.**

`cgviz` turns a [CodeGraph](https://github.com/colbymchenry/codegraph) database (a tree-sitter–parsed knowledge graph stored at `.codegraph/codegraph.db`) into a fast, browser-based visualization of every symbol, call, import, and containment relationship in your project. It’s built for understanding architecture, tracing call flows, and impact analysis at a glance.

<!-- Tip: drop a screenshot or GIF here, e.g. ![cgviz](docs/screenshot.png) -->

---

## Features

- **WebGL rendering** (Sigma.js + Graphology) — handles thousands of nodes smoothly
- **Focus mode** — click any symbol to gather its caller/callee cluster, centered and labeled
- **2D and immersive 3D** views (Three.js), toggleable
- **Multiple layouts** — force-directed, radial, hierarchical, and tree
- **Full-text search** and **filters** by node kind, edge kind, and file path
- **View modes** — all edges, call graph, inheritance, and structure
- **Live updates** — re-renders when the `.codegraph` database changes
- **Dark and light themes** with a refined color palette

## Requirements

- **Python ≥ 3.10**
- A project containing a CodeGraph database (`.codegraph/codegraph.db`)

> The PyPI package ships with the frontend **pre-built**, so installing it requires **no Node.js**.

## Installation

```bash
pip3 install cgviz
```

## Quick start

From the root of a project that has a `.codegraph/` directory:

```bash
cgviz
```

…or point it at any project (or directly at a `.db` file):

```bash
cgviz /path/to/your/project
```

This starts a local server and opens your browser with the interactive graph. `cgviz` walks up from the given path to auto-detect `.codegraph/codegraph.db`.

## CLI reference

```
cgviz [OPTIONS] [PATH]
```

| Option | Description | Default |
| --- | --- | --- |
| `PATH` | Project root or path to `codegraph.db` | `.` (current dir) |
| `-p, --port` | Server port | `7777` |
| `--host` | Server host | `127.0.0.1` |
| `--no-open` | Don’t open the browser automatically | off |
| `--no-watch` | Disable live reload on database changes | off |
| `--log-level` | `debug` · `info` · `warning` · `error` | `info` |

All options can also be set via environment variables with the `CGVIZ_` prefix (e.g. `CGVIZ_PORT=8080`).

## Python API

```python
import cgviz

# Blocking launch (Ctrl-C to stop)
cgviz.launch("/path/to/project", port=7777, open_browser=True)
```

## How it works

`cgviz` opens the CodeGraph SQLite database **read-only**, serves it through a FastAPI backend, and renders it with a React + Sigma.js / Three.js frontend. It never modifies your code or your database.

## Development

The frontend (TypeScript / React) lives in `frontend/` and is built into `src/cgviz/static/`. Building it requires **Node.js ≥ 18**.

```bash
# Python package, editable + dev tools
pip3 install -e ".[dev]"

# Frontend dependencies
cd frontend && npm install && cd ..

# Build the frontend into the package
python3 scripts/build_frontend.py

# Run backend + frontend dev servers together
python3 scripts/dev.py /path/to/project

# Run tests
pytest
```

## License

[MIT](LICENSE)
