from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Optional

import numpy as np


class TradingSignal:
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class SMACrossoverStrategy:
    short_window: int = 5
    long_window: int = 20

    def __post_init__(self) -> None:
        if self.short_window >= self.long_window:
            raise ValueError("short_window must be < long_window")
        self.history: Deque[float] = deque(maxlen=self.long_window)
        self._last_cross: Optional[str] = None

    def _sma(self, window: int) -> Optional[float]:
        if len(self.history) < window:
            return None
        arr = np.fromiter(self.history, dtype=float, count=len(self.history))
        return float(arr[-window:].mean())

    def get_signal(self, latest_price: float) -> str:
        self.history.append(latest_price)
        short_sma = self._sma(self.short_window)
        long_sma = self._sma(self.long_window)
        if short_sma is None or long_sma is None:
            return TradingSignal.HOLD

        if short_sma > long_sma:
            signal = TradingSignal.BUY
        elif short_sma < long_sma:
            signal = TradingSignal.SELL
        else:
            signal = TradingSignal.HOLD

        # Only emit on crosses
        if signal != self._last_cross and signal in (TradingSignal.BUY, TradingSignal.SELL):
            self._last_cross = signal
            return signal

        return TradingSignal.HOLD


