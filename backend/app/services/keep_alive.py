"""
NeuroDetect - Cloud & Local Keep-Alive Service
Ensures the backend remains persistently active 24/7 on Render and cloud platforms
by automatically pinging the /health endpoint within the 15-minute idle window.
"""

import asyncio
import os
import httpx


async def keep_alive_daemon(target_url: str = None, interval_seconds: int = None):
    """
    Background asynchronous worker that periodically pings the backend's
    health check endpoint.
    
    Why this is required:
    Render's Free Web Services automatically spin down (sleep) after 15 minutes
    of inactivity. This worker pings every ~9 minutes (540 seconds) to ensure
    Render resets its inactivity timer, preventing cold-starts (which can take 50-90s)
    and ensuring the backend remains ALWAYS ACTIVE.
    """
    # Auto-detect target URL
    if not target_url:
        target_url = (
            os.getenv("KEEP_ALIVE_URL")
            or os.getenv("RENDER_EXTERNAL_URL")
            or ""
        ).strip()

    if interval_seconds is None:
        try:
            interval_seconds = int(os.getenv("KEEP_ALIVE_INTERVAL_SECONDS", "540"))
        except (ValueError, TypeError):
            interval_seconds = 540

    if not target_url:
        print("[Keep-Alive] Notice: RENDER_EXTERNAL_URL or KEEP_ALIVE_URL is not set.")
        print("[Keep-Alive] Set KEEP_ALIVE_URL in .env or Render dashboard to enable self-ping.")
        return

    clean_base = target_url.rstrip("/")
    if not clean_base.endswith("/health"):
        ping_endpoint = f"{clean_base}/health"
    else:
        ping_endpoint = clean_base

    print(f"[Keep-Alive] Always-Active Daemon initialized.")
    print(f"[Keep-Alive] Target Endpoint : {ping_endpoint}")
    print(f"[Keep-Alive] Ping Interval   : {interval_seconds} seconds (~{interval_seconds // 60} mins)")

    # Wait 25 seconds for the server to finish booting and binding
    await asyncio.sleep(25)

    headers = {
        "User-Agent": "NeuroDetect-AlwaysActive-Service/1.0",
        "X-Keep-Alive-Ping": "true"
    }

    async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
        while True:
            try:
                response = await client.get(ping_endpoint)
                if response.status_code == 200:
                    print(f"[Keep-Alive] Ping SUCCESS -> {ping_endpoint} [HTTP {response.status_code}] (Service active)")
                else:
                    print(f"[Keep-Alive] Ping WARNING -> {ping_endpoint} [HTTP {response.status_code}]")
            except Exception as exc:
                print(f"[Keep-Alive] Ping NOTICE  -> {ping_endpoint} ({type(exc).__name__}: {exc})")

            await asyncio.sleep(interval_seconds)
