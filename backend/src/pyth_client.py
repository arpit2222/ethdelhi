from __future__ import annotations

import asyncio
from typing import Optional

import requests

from . import config


class PythPriceClient:
    """Lightweight client to fetch latest prices from Pyth Hermes HTTP API.

    Uses `config.PYTH_HTTP_ENDPOINT` and expects a valid Pyth price feed id
    (hex for EVM or base58 for Solana). Returns the latest aggregate price
    as a Python float, or None if unavailable.
    """

    def __init__(self, base_url: Optional[str] = None) -> None:
        self.base_url = base_url or (config.PYTH_HTTP_ENDPOINT or "https://hermes.pyth.network")

    async def get_latest_price(self, feed_id: Optional[str]) -> Optional[float]:
        if not feed_id:
            return None
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._get_latest_price_sync, feed_id)

    def _get_latest_price_sync(self, feed_id: str) -> Optional[float]:
        try:
            url = f"{self.base_url.rstrip('/')}/v2/updates/price/latest"
            # Pyth Hermes accepts either hex (0x...) or base58 ids
            r = requests.get(url, params={"ids[]": feed_id}, timeout=15)
            r.raise_for_status()
            data = r.json()
            # The response format contains an array of parsed price updates under
            # `parsed`. Take the first entry's price.
            parsed = data.get("parsed") or []
            if not parsed:
                return None
            p0 = parsed[0]
            # price may be under `price.price` or `price` depending on version
            price_obj = p0.get("price") or {}
            if isinstance(price_obj, dict) and "price" in price_obj:
                return float(price_obj["price"])  # already numeric
            if "price" in p0:
                return float(p0["price"])  # fallback
            # As a last resort, check `ema_price` field
            if "ema_price" in price_obj:
                return float(price_obj["ema_price"])  # type: ignore[arg-type]
            return None
        except Exception:
            return None
