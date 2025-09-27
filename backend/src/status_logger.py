import json
import time
from typing import Dict, Any
from pathlib import Path

class StatusLogger:
    def __init__(self, log_path: str = "bot_status.json"):
        self.log_path = Path(log_path)
    
    def update_status(self, trader_instance):
        """Update bot status for dashboard"""
        try:
            print(f"📊 Updating status log to: {self.log_path}")
            status = {
                "running": trader_instance.running,
                "current_price": trader_instance.last_price,
                "price_history": trader_instance.price_history[-10:],
                "active_strategies": [
                    {
                        "id": strategy_id,
                        "mode": strategy.get("mode", "unknown"),
                        "side": strategy.get("side", "unknown"),
                        "status": "active",
                        "created_at": strategy.get("created_at", time.time()),
                        "expires_at": strategy.get("expires_at"),
                        "progress": self._calculate_progress(strategy)
                    }
                    for strategy_id, strategy in trader_instance.active_strategies.items()
                ],
                "last_update": time.time()
            }
            
            with open(self.log_path, 'w') as f:
                json.dump(status, f, indent=2)
            
            print(f"✅ Status log updated successfully")
                
        except Exception as e:
            print(f"❌ Failed to update status log: {e}")
    
    def _calculate_progress(self, strategy: Dict[str, Any]) -> int:
        """Calculate strategy progress percentage"""
        if strategy.get("mode") == "twap":
            total_slices = strategy.get("total_slices", 1)
            current_slice = strategy.get("slice_index", 0)
            return min(int((current_slice / total_slices) * 100), 100)
        return 0
