from __future__ import annotations

import json
from typing import Any, Dict, Optional, List
from datetime import datetime

import requests

from . import config


class ZeroGClient:

    def __init__(self, endpoint: Optional[str] = None) -> None:
        self.endpoint = endpoint or config.ZERO_G_RPC_URL
        if not self.endpoint:
            raise RuntimeError("ZERO_G_RPC_URL is not configured")

    def store_trade_log(self, data: Dict[str, Any]) -> str:
        payload = {"data": data}
        resp = requests.post(self.endpoint, json=payload, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        return str(body.get("id") or body.get("tx_hash") or body)



