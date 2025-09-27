from __future__ import annotations

from typing import Any, Dict

from .zerog_client import ZeroGClient


class OrderStore:
    def __init__(self) -> None:
        self.z = ZeroGClient()

    def save_intent(self, intent_text: str, parsed: Dict[str, Any], order_payload: Dict[str, Any]) -> str:
        doc = {"type": "limit_order_intent", "intent": intent_text, "parsed": parsed, "order": order_payload}
        return self.z.store_trade_log(doc)

    def save_event(self, order_hash: str, event: Dict[str, Any]) -> str:
        doc = {"type": "limit_order_event", "order_hash": order_hash, **event}
        return self.z.store_trade_log(doc)



