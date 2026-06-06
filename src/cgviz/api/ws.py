"""WebSocket endpoint for live updates."""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()
logger = logging.getLogger(__name__)

_active_connections: set[WebSocket] = set()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    _active_connections.add(websocket)
    logger.info("WebSocket client connected (%d active)", len(_active_connections))

    try:
        await websocket.send_json({"type": "connected", "data": {"version": "0.1.0"}})

        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                continue

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        pass
    finally:
        _active_connections.discard(websocket)
        logger.info("WebSocket client disconnected (%d active)", len(_active_connections))


async def broadcast_update(message: dict) -> None:
    """Send a message to all connected WebSocket clients."""
    dead: list[WebSocket] = []
    for ws in _active_connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _active_connections.discard(ws)
