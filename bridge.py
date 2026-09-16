"""TikTok LIVE -> Roblox event bridge.

Run this on a public HTTPS host, then point the Roblox server script at it.
Set TIKTOK_UNIQUE_ID (with or without @) and BRIDGE_SECRET before running.
"""

import asyncio
import os
import threading
from collections import deque
from pathlib import Path
from typing import Any

import uvicorn
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from TikTokLive import TikTokLiveClient
from TikTokLive.events import FollowEvent, GiftEvent, LikeEvent

UNIQUE_ID = os.environ["TIKTOK_UNIQUE_ID"].lstrip("@")
SECRET = os.environ["BRIDGE_SECRET"]
events: deque[dict[str, Any]] = deque(maxlen=500)
events_lock = threading.Lock()
next_event_id = 0


def username(event: Any) -> str:
    user = getattr(event, "user", None)
    return str(getattr(user, "unique_id", "viewer"))


def publish(kind: str, user: str, **data: Any) -> None:
    global next_event_id
    with events_lock:
        next_event_id += 1
        events.append({"id": next_event_id, "type": kind, "user": user, **data})


client: TikTokLiveClient = TikTokLiveClient(unique_id=f"@{UNIQUE_ID}")


@client.on(LikeEvent)
async def receive_like(event: LikeEvent) -> None:
    # TikTok bundles likes, so one event can represent more than one tap.
    count = int(getattr(event, "count", 1) or 1)
    publish("like", username(event), count=min(count, 50))


@client.on(FollowEvent)
async def receive_follow(event: FollowEvent) -> None:
    publish("follow", username(event))


@client.on(GiftEvent)
async def receive_gift(event: GiftEvent) -> None:
    gift = getattr(event, "gift", None)
    if gift is None:
        return
    # Do not fire intermediate streak events; only the completed streak matters.
    if getattr(event, "streaking", False):
        return
    repeats = int(getattr(event, "repeat_count", 1) or 1)
    diamonds = int(getattr(gift, "diamond_count", 1) or 1) * repeats
    publish(
        "gift",
        username(event),
        name=str(getattr(gift, "name", "Gift")),
        diamonds=diamonds,
        repeats=repeats,
    )


def start_tiktok_listener() -> None:
    client.run(fetch_gift_info=True)


app = FastAPI(title="Stress Toys TikTok LIVE Bridge")


@app.on_event("startup")
def start_background_listener() -> None:
    """Start the LIVE client when Uvicorn imports this app on Railway."""
    threading.Thread(target=start_tiktok_listener, daemon=True).start()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "creator": UNIQUE_ID}


@app.get("/")
@app.get("/overlay")
def overlay() -> FileResponse:
    return FileResponse(Path(__file__).with_name("overlay.html"))


@app.get("/events")
def public_events(after: int = 0) -> dict[str, list[dict[str, Any]]]:
    with events_lock:
        return {"events": [event for event in events if event["id"] > after]}


@app.post("/poll")
def poll(x_bridge_key: str | None = Header(default=None)) -> dict[str, list[dict[str, Any]]]:
    if x_bridge_key != SECRET:
        raise HTTPException(status_code=401, detail="Invalid bridge key")
    with events_lock:
        batch = list(events)
        events.clear()
    return {"events": batch}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "8080")))
