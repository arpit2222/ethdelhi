from __future__ import annotations

import re
from typing import Optional, TypedDict, Literal, Dict, Any


Mode = Literal["simple", "twap", "ladder", "dutch", "bracket"]


class ParsedBase(TypedDict, total=False):
    mode: Mode
    side: Literal["BUY", "SELL"]
    base: str
    quote: str
    chain: str
    post_only: bool
    partial_fill: bool


class ParsedSimple(ParsedBase, total=False):
    amount: float
    limit_price: float
    expiry_secs: int


class ParsedTWAP(ParsedBase, total=False):
    total_amount: float
    start_price: float
    end_price: float | None
    duration_secs: int
    slices: int
    expiry_each_secs: int


class ParsedLadder(ParsedBase, total=False):
    total_amount: float
    p_min: float
    p_max: float
    steps: int
    expiry_secs: int


class ParsedDutch(ParsedBase, total=False):
    amount: float
    start_price: float
    end_price: float
    step: float
    step_secs: int
    expiry_each_secs: int


class ParsedBracket(ParsedBase, total=False):
    amount: float
    entry: float
    take_profit: float
    stop: float
    expiry_secs: int


def _parse_time_secs(text: str) -> int:
    t = text.lower()
    if "week" in t or "7d" in t:
        return 7 * 24 * 3600
    if "day" in t or "24h" in t or "today" in t or "1d" in t:
        return 24 * 3600
    if "12h" in t:
        return 12 * 3600
    if "2h" in t:
        return 2 * 3600
    if "1h" in t or "60m" in t:
        return 3600
    if "30m" in t:
        return 1800
    if "5m" in t:
        return 300
    return 24 * 3600


def _chain(text: str) -> str:
    t = text.lower()
    if "arbitrum" in t:
        return "arbitrum"
    if "ethereum" in t or "mainnet" in t:
        return "ethereum"
    return "arbitrum"


def _side(text: str) -> Optional[str]:
    if "buy" in text:
        return "BUY"
    if "sell" in text:
        return "SELL"
    return None


def _base_quote(text: str) -> tuple[Optional[str], Optional[str]]:
    m = re.search(r"(eth|weth|arb|usdc)\b", text)
    base = None
    if m:
        tok = m.group(1).upper()
        if tok in ("ETH", "WETH"):
            base = "ETH"
        elif tok == "ARB":
            base = "ARB"
        elif tok == "USDC":
            base = "USDC"
    if base in ("ETH", "ARB"):
        return base, "USDC"
    if base == "USDC":
        return "ETH", "USDC"
    return None, None


def parse_intent(text: str) -> Optional[Dict[str, Any]]:
    t = text.strip().lower()
    if not t:
        return None

    chain = _chain(t)
    side = _side(t)
    base, quote = _base_quote(t)
    post_only = ("post only" in t) or ("maker only" in t)
    partial_fill = ("fill-or-kill" not in t) and ("no partial" not in t)

    if t.startswith("twap"):
        m_amt = re.search(r"(\d+(?:\.\d+)?)\s*(eth|weth|arb)", t)
        m_from = re.search(r"from\s*(\$?\d+(?:\.\d+)?)", t)
        m_to = re.search(r"to\s*(\$?\d+(?:\.\d+)?)", t)
        m_slices = re.search(r"(\d+)\s*slices", t)
        dur = _parse_time_secs(t)
        if not (side and m_amt and m_from):
            return None
        total_amount = float(m_amt.group(1))
        start_price = float(m_from.group(1).replace("$", ""))
        end_price = float(m_to.group(1).replace("$", "")) if m_to else None
        slices = int(m_slices.group(1)) if m_slices else 6
        return {
            "mode": "twap",
            "side": side,
            "base": (base or "ETH"),
            "quote": (quote or "USDC"),
            "chain": chain,
            "post_only": post_only,
            "partial_fill": partial_fill,
            "total_amount": total_amount,
            "start_price": start_price,
            "end_price": end_price,
            "duration_secs": dur,
            "slices": slices,
            "expiry_each_secs": max(300, dur // max(1, slices)),
        }

    if t.startswith("ladder") or "steps" in t:
        m_amt = re.search(r"(\d+(?:\.\d+)?)\s*(eth|weth|arb)", t)
        m_band = re.search(r"(\$?\d+(?:\.\d+)?)\s*-\s*(\$?\d+(?:\.\d+)?)", t)
        m_steps = re.search(r"(\d+)\s*steps", t)
        if not (side and m_amt and m_band):
            return None
        total_amount = float(m_amt.group(1))
        p_min = float(m_band.group(1).replace("$", ""))
        p_max = float(m_band.group(2).replace("$", ""))
        steps = int(m_steps.group(1)) if m_steps else 5
        return {
            "mode": "ladder",
            "side": side,
            "base": (base or "ETH"),
            "quote": (quote or "USDC"),
            "chain": chain,
            "post_only": post_only,
            "partial_fill": partial_fill,
            "total_amount": total_amount,
            "p_min": min(p_min, p_max),
            "p_max": max(p_min, p_max),
            "steps": steps,
            "expiry_secs": _parse_time_secs(t),
        }

    if t.startswith("dutch") or "every" in t:
        m_amt = re.search(r"(\d+(?:\.\d+)?)\s*(eth|weth|arb)", t)
        m_start = re.search(r"start\s*(\$?\d+(?:\.\d+)?)", t)
        m_end = re.search(r"end\s*(\$?\d+(?:\.\d+)?)", t)
        m_step = re.search(r"step\s*(\$?\d+(?:\.\d+)?)", t)
        step_secs = _parse_time_secs("5m" if "5m" in t else t)
        if not (side and m_amt and m_start and m_end and m_step):
            return None
        return {
            "mode": "dutch",
            "side": side,
            "base": (base or "ETH"),
            "quote": (quote or "USDC"),
            "chain": chain,
            "post_only": post_only,
            "partial_fill": partial_fill,
            "amount": float(m_amt.group(1)),
            "start_price": float(m_start.group(1).replace("$", "")),
            "end_price": float(m_end.group(1).replace("$", "")),
            "step": float(m_step.group(1).replace("$", "")),
            "step_secs": step_secs,
            "expiry_each_secs": max(300, step_secs),
        }

    if t.startswith("bracket") or "take" in t or "stop" in t:
        m_amt = re.search(r"(\d+(?:\.\d+)?)\s*(eth|weth|arb)", t)
        m_entry = re.search(r"entry\s*(\$?\d+(?:\.\d+)?)", t) or re.search(r"at\s*(\$?\d+(?:\.\d+)?)", t)
        m_take = re.search(r"take(\s*profit)?\s*(\$?\d+(?:\.\d+)?)", t)
        m_stop = re.search(r"stop\s*(\$?\d+(?:\.\d+)?)", t)
        if not (side and m_amt and m_entry and m_take and m_stop):
            return None
        return {
            "mode": "bracket",
            "side": side,
            "base": (base or "ETH"),
            "quote": (quote or "USDC"),
            "chain": chain,
            "post_only": post_only,
            "partial_fill": partial_fill,
            "amount": float(m_amt.group(1)),
            "entry": float(m_entry.group(1).replace("$", "")),
            "take_profit": float(m_take.group(2).replace("$", "")),
            "stop": float(m_stop.group(1).replace("$", "")),
            "expiry_secs": _parse_time_secs(t),
        }

    m_amt = re.search(r"(\d+(?:\.\d+)?)\s*(eth|weth|arb)", t)
    m_px = re.search(r"at\s*(\$?\d+(?:\.\d+)?)", t) or re.search(r"@\s*(\$?\d+(?:\.\d+)?)", t)
    if side and m_amt and m_px:
        return {
            "mode": "simple",
            "side": side,
            "base": (base or "ETH"),
            "quote": (quote or "USDC"),
            "chain": chain,
            "post_only": post_only,
            "partial_fill": partial_fill,
            "amount": float(m_amt.group(1)),
            "limit_price": float(m_px.group(1).replace("$", "")),
            "expiry_secs": _parse_time_secs(t),
        }

    return None



