"""
Configuration validation and environment setup
"""
from __future__ import annotations

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum

from . import config


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str]
    warnings: List[str]


class ConfigValidator:
    """Validates configuration and provides helpful error messages"""
    
    def __init__(self):
        self.environment = self._detect_environment()
    
    def _detect_environment(self) -> Environment:
        """Detect current environment"""
        env = os.getenv("ENVIRONMENT", "development").lower()
        if env in ["prod", "production"]:
            return Environment.PRODUCTION
        elif env in ["stage", "staging"]:
            return Environment.STAGING
        else:
            return Environment.DEVELOPMENT
    
    def validate_all(self) -> ValidationResult:
        """Validate all configuration"""
        errors = []
        warnings = []
        
        # Validate critical config
        critical_errors = self._validate_critical_config()
        errors.extend(critical_errors)
        
        # Validate chain-specific config
        chain_errors, chain_warnings = self._validate_chain_config()
        errors.extend(chain_errors)
        warnings.extend(chain_warnings)
        
        # Validate API keys
        api_errors, api_warnings = self._validate_api_keys()
        errors.extend(api_errors)
        warnings.extend(api_warnings)
        
        # Validate proxy configuration
        proxy_warnings = self._validate_proxy_config()
        warnings.extend(proxy_warnings)
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def _validate_critical_config(self) -> List[str]:
        """Validate critical configuration"""
        errors = []
        
        if not config.ONEINCH_API_KEY:
            errors.append("ONEINCH_API_KEY is required")
        
        if not config.PYTH_ETH_USD_FEED_ID:
            errors.append("PYTH_ETH_USD_FEED_ID is required")
        
        return errors
    
    def _validate_chain_config(self) -> tuple[List[str], List[str]]:
        """Validate chain-specific configuration"""
        errors = []
        warnings = []
        
        # Check if we have EVM configuration
        has_evm_config = all([
            config.RPC_URL,
            config.CHAIN_ID,
            config.PRIVATE_KEY,
            config.PUBLIC_KEY,
            config.WETH_ADDRESS,
            config.USDC_ADDRESS
        ])
        
        # Check if we have Solana configuration
        has_solana_config = all([
            config.SOLANA_RPC_URL,
            config.SOLANA_PRIVATE_KEY,
            config.SOLANA_PUBLIC_KEY,
            config.WSOL_MINT,
            config.USDC_MINT
        ])
        
        if not has_evm_config and not has_solana_config:
            errors.append("At least one chain configuration (EVM or Solana) must be complete")
        
        if has_evm_config:
            evm_errors, evm_warnings = self._validate_evm_config()
            errors.extend(evm_errors)
            warnings.extend(evm_warnings)
        
        if has_solana_config:
            solana_errors, solana_warnings = self._validate_solana_config()
            errors.extend(solana_errors)
            warnings.extend(solana_warnings)
        
        return errors, warnings
    
    def _validate_evm_config(self) -> tuple[List[str], List[str]]:
        """Validate EVM chain configuration"""
        errors = []
        warnings = []
        
        if config.CHAIN_ID != config.ONEINCH_CHAIN_ID:
            warnings.append(
                f"CHAIN_ID ({config.CHAIN_ID}) and ONEINCH_CHAIN_ID ({config.ONEINCH_CHAIN_ID}) "
                "should match for consistent behavior"
            )
        
        # Validate RPC URL
        if config.RPC_URL and not config.RPC_URL.startswith("http"):
            errors.append("RPC_URL must be a valid HTTP/HTTPS URL")
        
        # Validate private key format
        if config.PRIVATE_KEY and not config.PRIVATE_KEY.startswith("0x"):
            errors.append("PRIVATE_KEY must start with '0x'")
        
        # Validate token addresses
        if config.WETH_ADDRESS and not config.WETH_ADDRESS.startswith("0x"):
            errors.append("WETH_ADDRESS must be a valid Ethereum address")
        
        if config.USDC_ADDRESS and not config.USDC_ADDRESS.startswith("0x"):
            errors.append("USDC_ADDRESS must be a valid Ethereum address")
        
        return errors, warnings
    
    def _validate_solana_config(self) -> tuple[List[str], List[str]]:
        """Validate Solana configuration"""
        errors = []
        warnings = []
        
        # Validate RPC URL
        if config.SOLANA_RPC_URL and not config.SOLANA_RPC_URL.startswith("http"):
            errors.append("SOLANA_RPC_URL must be a valid HTTP/HTTPS URL")
        
        # Validate mint addresses (Solana addresses are base58)
        if config.WSOL_MINT and len(config.WSOL_MINT) < 32:
            errors.append("WSOL_MINT must be a valid Solana address")
        
        if config.USDC_MINT and len(config.USDC_MINT) < 32:
            errors.append("USDC_MINT must be a valid Solana address")
        
        return errors, warnings
    
    def _validate_api_keys(self) -> tuple[List[str], List[str]]:
        """Validate API key configuration"""
        errors = []
        warnings = []
        
        # Check API key format
        if config.ONEINCH_API_KEY and len(config.ONEINCH_API_KEY) < 20:
            warnings.append("ONEINCH_API_KEY seems too short - please verify it's correct")
        
        return errors, warnings
    
    def _validate_proxy_config(self) -> List[str]:
        """Validate proxy configuration"""
        warnings = []
        
        if config.ONEINCH_PROXY_URL and config.ONEINCH_CLOUD_PROXY_URL:
            warnings.append(
                "Both ONEINCH_PROXY_URL and ONEINCH_CLOUD_PROXY_URL are set. "
                "Local proxy will take precedence."
            )
        
        if config.ONEINCH_PROXY_URL:
            if not config.ONEINCH_PROXY_URL.startswith("http"):
                warnings.append("ONEINCH_PROXY_URL should be a valid HTTP/HTTPS URL")
        
        if config.ONEINCH_CLOUD_PROXY_URL:
            if not config.ONEINCH_CLOUD_PROXY_URL.startswith("http"):
                warnings.append("ONEINCH_CLOUD_PROXY_URL should be a valid HTTP/HTTPS URL")
        
        return warnings
    
    def get_recommended_config(self) -> Dict[str, Any]:
        """Get recommended configuration based on environment"""
        recommendations = {}
        
        if self.environment == Environment.DEVELOPMENT:
            recommendations.update({
                "RPC_URL": "https://arb1.arbitrum.io/rpc",
                "CHAIN_ID": 42161,
                "ONEINCH_CHAIN_ID": 42161,
                "WETH_ADDRESS": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                "USDC_ADDRESS": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                "ONEINCH_PROXY_URL": "http://localhost:3000",
            })
        elif self.environment == Environment.PRODUCTION:
            recommendations.update({
                "RPC_URL": "https://arb1.arbitrum.io/rpc",
                "CHAIN_ID": 42161,
                "ONEINCH_CHAIN_ID": 42161,
                "WETH_ADDRESS": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                "USDC_ADDRESS": "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
                # Production should use cloud proxy
                "ONEINCH_CLOUD_PROXY_URL": "https://your-proxy.vercel.app",
            })
        
        return recommendations
    
    def print_validation_report(self, result: ValidationResult):
        """Print a formatted validation report"""
        print("🔧 Configuration Validation Report")
        print("=" * 50)
        
        if result.is_valid:
            print("✅ Configuration is valid!")
        else:
            print("❌ Configuration has errors:")
            for error in result.errors:
                print(f"  • {error}")
        
        if result.warnings:
            print("\n⚠️  Warnings:")
            for warning in result.warnings:
                print(f"  • {warning}")
        
        print(f"\n🌍 Environment: {self.environment.value}")
        
        if not result.is_valid:
            print("\n💡 Recommended configuration:")
            recommendations = self.get_recommended_config()
            for key, value in recommendations.items():
                print(f"  {key}={value}")


def validate_and_setup_config() -> bool:
    """Validate configuration and setup environment"""
    validator = ConfigValidator()
    result = validator.validate_all()
    
    validator.print_validation_report(result)
    
    if not result.is_valid:
        print("\n❌ Configuration validation failed. Please fix the errors above.")
        return False
    
    print("\n✅ Configuration is ready!")
    return True
