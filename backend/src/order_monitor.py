from __future__ import annotations

import asyncio
from typing import Dict, List

from .limit_order_client import LimitOrderClient
from .order_store import OrderStore


class OrderMonitor:
    def __init__(self) -> None:
        self.client = LimitOrderClient()
        self.store = OrderStore()
        self.groups: Dict[str, List[str]] = {}
        self.status_cache: Dict[str, dict] = {}

    def add_group(self, tag: str, hashes: List[str]) -> None:
        self.groups[tag] = hashes

    async def run(self) -> None:
        while True:
            for tag, hashes in list(self.groups.items()):
                for h in list(hashes):
                    try:
                        st = self.client.status(h)
                        self.status_cache[h] = st
                        if st.get("filled"):
                            for sib in hashes:
                                if sib != h:
                                    try:
                                        self.client.cancel(sib)
                                    except Exception:
                                        pass
                            self.store.save_event(h, {"event": "filled", "group": tag, "status": st})
                            del self.groups[tag]
                            break
                        elif st.get("canceled") or st.get("expired"):
                            hashes.remove(h)
                    except Exception:
                        pass
            await asyncio.sleep(30)



