#!/usr/bin/env python3
"""
Quick fix script for common ETHGlobal Trading Bot issues
"""
import os
import sys
import subprocess
from pathlib import Path


def print_header(title):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print(f"{'='*60}")


def check_file_exists(filepath, description):
    """Check if a file exists and print status"""
    if Path(filepath).exists():
        print(f"✅ {description}: Found")
        return True
    else:
        print(f"❌ {description}: Missing")
        return False


def fix_deprecated_warnings():
    """Fix deprecated dependency warnings"""
    print_header("Fixing Deprecated Dependencies")
    
    # Update requirements.txt to use setuptools < 81
    requirements_file = Path("requirements.txt")
    if requirements_file.exists():
        content = requirements_file.read_text()
        
        # Add setuptools pin to avoid deprecation warnings
        if "setuptools<81" not in content:
            content += "\n# Fix deprecation warnings\nsetuptools<81\n"
            requirements_file.write_text(content)
            print("✅ Updated requirements.txt to fix deprecation warnings")
        else:
            print("✅ Deprecation warnings already fixed")
    else:
        print("❌ requirements.txt not found")


def check_env_file():
    """Check if .env file exists and is properly configured"""
    print_header("Checking Environment Configuration")
    
    env_file = Path(".env")
    if env_file.exists():
        print("✅ .env file found")
        
        # Check if key variables are set
        try:
            from dotenv import load_dotenv
            load_dotenv()
            
            required_vars = [
                "ONEINCH_API_KEY",
                "PRIVATE_KEY", 
                "PUBLIC_KEY",
                "RPC_URL"
            ]
            
            missing_vars = []
            for var in required_vars:
                if not os.getenv(var):
                    missing_vars.append(var)
            
            if missing_vars:
                print(f"⚠️  Missing required environment variables: {', '.join(missing_vars)}")
                print("   Please update your .env file with the missing values")
            else:
                print("✅ Required environment variables are configured")
                
        except ImportError:
            print("⚠️  python-dotenv not installed. Install with: pip install python-dotenv")
        except Exception as e:
            print(f"⚠️  Error reading .env file: {e}")
            
    else:
        print("❌ .env file not found")
        print("   Please create a .env file with your configuration")
        return False
    
    return True


def fix_import_issues():
    """Fix common import issues"""
    print_header("Checking Import Issues")
    
    # Check if all required modules can be imported
    try:
        import sys
        sys.path.insert(0, str(Path("src")))
        
        from src import config
        print("✅ Config module imports successfully")
        
        from src.config_validator import ConfigValidator
        print("✅ Config validator imports successfully")
        
        from src.oneinch_client import OneInchClient
        print("✅ OneInch client imports successfully")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    
    return True


def check_proxy_setup():
    """Check proxy setup"""
    print_header("Checking Proxy Setup")
    
    proxy_dir = Path("1inch-express-proxy")
    if not proxy_dir.exists():
        print("❌ Proxy directory not found")
        return False
    
    proxy_files = [
        "index.js",
        "package.json"
    ]
    
    all_exist = True
    for file in proxy_files:
        if check_file_exists(proxy_dir / file, f"Proxy {file}"):
            continue
        else:
            all_exist = False
    
    if all_exist:
        print("✅ Proxy setup looks good")
        
        # Check if node_modules exists
        if (proxy_dir / "node_modules").exists():
            print("✅ Proxy dependencies installed")
        else:
            print("⚠️  Proxy dependencies not installed. Run: cd 1inch-express-proxy && npm install")
    
    return all_exist


def create_startup_script():
    """Create a startup script for easy launching"""
    print_header("Creating Startup Script")
    
    startup_script = """#!/bin/bash
# ETHGlobal Trading Bot Startup Script

echo "🚀 Starting ETHGlobal Trading Bot..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Please run setup first."
    exit 1
fi

# Activate virtual environment
source .venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Run the improved main script
echo "✅ Starting bot with improved configuration..."
python -u -m src.main_improved
"""
    
    startup_file = Path("start_bot.sh")
    if not startup_file.exists():
        startup_file.write_text(startup_script)
        startup_file.chmod(0o755)  # Make executable
        print("✅ Created start_bot.sh script")
    else:
        print("✅ Startup script already exists")
    
    # Also create Windows batch file
    startup_bat = """@echo off
echo 🚀 Starting ETHGlobal Trading Bot...

REM Check if virtual environment exists
if not exist ".venv" (
    echo ❌ Virtual environment not found. Please run setup first.
    pause
    exit /b 1
)

REM Activate virtual environment
call .venv\\Scripts\\activate.bat

REM Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found. Please copy .env.example to .env and configure it.
    pause
    exit /b 1
)

REM Run the improved main script
echo ✅ Starting bot with improved configuration...
python -u -m src.main_improved
pause
"""
    
    startup_bat_file = Path("start_bot.bat")
    if not startup_bat_file.exists():
        startup_bat_file.write_text(startup_bat)
        print("✅ Created start_bot.bat script")
    else:
        print("✅ Windows startup script already exists")


def main():
    """Main fix function"""
    print("🔧 ETHGlobal Trading Bot - Quick Fix Script")
    print("This script will fix common issues and improve your setup.")
    
    # Check current directory
    if not Path("src").exists():
        print("❌ Please run this script from the project root directory")
        sys.exit(1)
    
    # Run all fixes
    fix_deprecated_warnings()
    check_env_file()
    
    if fix_import_issues():
        print("✅ All imports working correctly")
    else:
        print("❌ Some import issues detected")
    
    check_proxy_setup()
    create_startup_script()
    
    print_header("Quick Fix Complete")
    print("✅ All fixes applied!")
    print("\n📋 Next Steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Setup proxy: python setup_proxy.py")
    print("3. Run bot: python -u -m src.main_improved")
    print("\n🚀 Or use the startup script: ./start_bot.sh (Linux/macOS) or start_bot.bat (Windows)")


if __name__ == "__main__":
    main()
