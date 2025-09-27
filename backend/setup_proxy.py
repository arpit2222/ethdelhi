"""
Setup script for 1inch proxy configuration
"""
import os
import subprocess
import sys
import time
from pathlib import Path


def print_banner():
    """Print setup banner"""
    print("🔧 ETHGlobal Trading Bot - Proxy Setup")
    print("=" * 50)


def check_node_installed():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js installed: {result.stdout.strip()}")
            return True
        else:
            print("❌ Node.js not found")
            return False
    except FileNotFoundError:
        print("❌ Node.js not found")
        return False


def check_npm_installed():
    """Check if npm is installed"""
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ npm installed: {result.stdout.strip()}")
            return True
        else:
            print("❌ npm not found")
            return False
    except FileNotFoundError:
        print("❌ npm not found")
        return False


def install_proxy_dependencies():
    """Install proxy dependencies"""
    proxy_dir = Path("1inch-express-proxy")
    
    if not proxy_dir.exists():
        print("❌ Proxy directory not found")
        return False
    
    print("📦 Installing proxy dependencies...")
    
    try:
        result = subprocess.run(
            ["npm", "install"],
            cwd=proxy_dir,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✅ Proxy dependencies installed successfully")
            return True
        else:
            print(f"❌ Failed to install dependencies: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error installing dependencies: {e}")
        return False


def create_env_file():
    """Create or update .env file"""
    env_file = Path(".env")
    
    print("🔑 Setting up environment variables...")
    
    # Get 1inch API key
    api_key = input("Enter your 1inch API key: ").strip()
    if not api_key:
        print("❌ API key is required")
        return False
    
    # Check if .env exists
    env_content = []
    if env_file.exists():
        with open(env_file, 'r') as f:
            env_content = f.readlines()
    
    # Update or add ONEINCH_API_KEY
    updated = False
    for i, line in enumerate(env_content):
        if line.startswith("ONEINCH_API_KEY="):
            env_content[i] = f"ONEINCH_API_KEY={api_key}\n"
            updated = True
            break
    
    if not updated:
        env_content.append(f"ONEINCH_API_KEY={api_key}\n")
    
    # Add proxy URL if not exists
    proxy_exists = any(line.startswith("ONEINCH_PROXY_URL=") for line in env_content)
    if not proxy_exists:
        env_content.append("ONEINCH_PROXY_URL=http://localhost:3000\n")
    
    # Write back to file
    with open(env_file, 'w') as f:
        f.writelines(env_content)
    
    print("✅ Environment variables configured")
    return True


def start_proxy():
    """Start the proxy server"""
    proxy_dir = Path("1inch-express-proxy")
    
    print("🚀 Starting proxy server...")
    print("   The proxy will run on http://localhost:3000")
    print("   Press Ctrl+C to stop the proxy")
    
    try:
        # Set environment variable for authorization
        env = os.environ.copy()
        with open(".env", 'r') as f:
            for line in f:
                if line.startswith("ONEINCH_API_KEY="):
                    api_key = line.split("=", 1)[1].strip()
                    env["AUTHORIZATION"] = f"Bearer {api_key}"
                    break
        
        # Start the proxy server
        subprocess.run(["node", "index.js"], cwd=proxy_dir, env=env)
        
    except KeyboardInterrupt:
        print("\n⏹️  Proxy server stopped")
    except Exception as e:
        print(f"❌ Error starting proxy: {e}")


def test_proxy():
    """Test proxy functionality"""
    print("🧪 Testing proxy...")
    
    import requests
    
    try:
        # Test proxy endpoint
        response = requests.get(
            "http://localhost:3000/",
            params={
                "url": "https://api.1inch.dev/swap/v6.0/42161/tokens"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ Proxy is working correctly")
            return True
        else:
            print(f"❌ Proxy returned status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to proxy. Is it running?")
        return False
    except Exception as e:
        print(f"❌ Error testing proxy: {e}")
        return False


def show_usage_instructions():
    """Show usage instructions"""
    print("\n📖 Usage Instructions:")
    print("=" * 30)
    print("1. Start the proxy server:")
    print("   python setup_proxy.py start")
    print()
    print("2. In another terminal, run the trading bot:")
    print("   python -u -m src.main_improved")
    print()
    print("3. The bot will automatically use the proxy when ONEINCH_PROXY_URL is set")
    print()
    print("4. To stop the proxy, press Ctrl+C in the proxy terminal")


def main():
    """Main setup function"""
    print_banner()
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "start":
            # Check prerequisites
            if not check_node_installed():
                print("❌ Please install Node.js first: https://nodejs.org/")
                return
            
            if not check_npm_installed():
                print("❌ Please install npm first")
                return
            
            # Install dependencies
            if not install_proxy_dependencies():
                print("❌ Failed to install dependencies")
                return
            
            # Start proxy
            start_proxy()
            
        elif command == "test":
            test_proxy()
            
        elif command == "help":
            show_usage_instructions()
            
        else:
            print(f"❌ Unknown command: {command}")
            print("Available commands: start, test, help")
    else:
        # Interactive setup
        print("This script will help you set up the 1inch proxy server.")
        print()
        
        # Check prerequisites
        if not check_node_installed():
            print("❌ Please install Node.js first: https://nodejs.org/")
            return
        
        if not check_npm_installed():
            print("❌ Please install npm first")
            return
        
        # Install dependencies
        if not install_proxy_dependencies():
            print("❌ Failed to install dependencies")
            return
        
        # Setup environment
        if not create_env_file():
            print("❌ Failed to setup environment")
            return
        
        print("\n✅ Setup complete!")
        print()
        
        choice = input("Would you like to start the proxy server now? (y/n): ").strip().lower()
        if choice in ['y', 'yes']:
            start_proxy()
        else:
            show_usage_instructions()


if __name__ == "__main__":
    main()

