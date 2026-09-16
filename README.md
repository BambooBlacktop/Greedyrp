# TikTok LIVE → Stress Toys RNG

This is a real-time relay for your LIVE interaction concept:

| TikTok event | Roblox effect |
| --- | --- |
| Like | Small heart-sticker burst |
| Follow | Large “FOLLOWED!” sticker plus hearts |
| Gift under 100 diamonds | Gift banner plus hearts |
| Gift 100–999 diamonds | Bigger gift celebration |
| Gift 1,000+ diamonds | Legendary full-screen celebration |

## Before the first live

1. Choose a public HTTPS host for `bridge.py` (Railway, Render, Fly.io, or a VPS). Roblox game servers cannot poll `localhost`.
2. Set host environment variables:
   - `TIKTOK_UNIQUE_ID` = `greedyrp`
   - `BRIDGE_SECRET` = a long random password
3. Install `requirements.txt`, then run `python bridge.py`.
4. Check `https://YOUR-BRIDGE-DOMAIN/health` returns `status: ok`.
5. In Roblox Studio, enable **Game Settings → Security → Allow HTTP Requests**.
6. Add the two scripts from `Roblox/` to the locations stated in their first lines. Put the hosted HTTPS URL and the same secret in `TikTokLiveBridge.server.lua`.

## Important

TikTok does not provide a public official API for live like/follow/gift events. This relay uses the unofficial open-source TikTokLive client, so keep it updated and follow TikTok's terms plus the library's license.

Test the effects without going live by firing the `TikTokLiveEffect` RemoteEvent from Studio's command bar.
