from __future__ import annotations

from dataclasses import dataclass
from typing import List
import time


@dataclass
class ChildOrder:
    side: str
    base: str
    quote: str
    amount: float
    limit_price: float
    expiry_secs: int
    partial_fill: bool
    post_only: bool
    tag: str


def build_twap(
    side: str,
    base: str,
    quote: str,
    total_amount: float,
    start_price: float,
    end_price: float | None,
    duration_secs: int,
    slices: int,
    expiry_each_secs: int,
    post_only: bool,
    tag: str,
) -> List[ChildOrder]:
    per = total_amount / max(1, slices)
    if end_price is None:
        prices = [start_price for _ in range(slices)]
    else:
        prices = [start_price + (end_price - start_price) * i / max(1, slices - 1) for i in range(slices)]
    return [
        ChildOrder(side, base, quote, per, prices[i], expiry_each_secs, True, post_only, f"{tag}:twap:{i}")
        for i in range(slices)
    ]


def build_ladder(
    side: str,
    base: str,
    quote: str,
    total_amount: float,
    p_min: float,
    p_max: float,
    steps: int,
    expiry_secs: int,
    post_only: bool,
    tag: str,
) -> List[ChildOrder]:
    per = total_amount / max(1, steps)
    prices = [p_min + (p_max - p_min) * i / max(1, steps - 1) for i in range(steps)]
    return [
        ChildOrder(side, base, quote, per, prices[i], expiry_secs, True, post_only, f"{tag}:ladder:{i}")
        for i in range(steps)
    ]


def build_dutch(
    side: str,
    base: str,
    quote: str,
    amount: float,
    start_price: float,
    end_price: float,
    step: float,
    step_secs: int,
    expiry_each_secs: int,
    post_only: bool,
    tag: str,
) -> List[ChildOrder]:
    prices: List[float] = []
    if side.upper() == "SELL":
        p = start_price
        while p >= end_price:
            prices.append(p)
            p -= step
    else:
        p = start_price
        while p <= end_price:
            prices.append(p)
            p += step
    return [
        ChildOrder(side, base, quote, amount, p, expiry_each_secs, True, post_only, f"{tag}:dutch:{i}")
        for i, p in enumerate(prices)
    ]



