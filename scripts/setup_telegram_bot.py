#!/usr/bin/env python3
"""
Telegram Bot Setup Script for KYCut
This script helps set up the Telegram bot environment and dependencies.
"""

import os
import sys
import subprocess
import json

def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    packages = [
        "python-telegram-bot==20.7",
        "requests==2.31.0",
        "python-dotenv==1.0.0"
    ]
    
    for package in packages:
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"✓ Installed {package}")
        except subprocess.CalledProcessError:
            print(f"✗ Failed to install {package}")
            return False
    return True

def get_user_input():
    """Get configuration from user"""
    print("\n=== KYCut Telegram Bot Setup ===")
    print("Please provide the following information:")
    
    # Get Telegram User ID
    print("\n1. Get your Telegram User ID:")
    print("   - Message @userinfobot on Telegram")
    print("   - Copy the 'Id' number it gives you")
    
    admin_id = input("\nEnter your Telegram User ID: ").strip()
    if not admin_id.isdigit():
        print("Error: User ID must be a number")
        return None
    
    # Bot token is already in the code
    bot_token = "8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8"
    
    # Get website URL
    website_url = input("Enter your website URL (e.g., https://yoursite.com): ").strip()
    if not website_url.startswith(('http://', 'https://')):
        website_url = 'https://' + website_url
    
    return {
        'TELEGRAM_BOT_TOKEN': bot_token,
        'TELEGRAM_ADMIN_ID': admin_id,
        'WEBSITE_URL': website_url,
        'TELEGRAM_WEBHOOK_SECRET': 'your_webhook_secret_here'
    }

def create_env_file(config):
    """Create .env file for the bot"""
    env_content = f"""# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN={config['TELEGRAM_BOT_TOKEN']}
TELEGRAM_ADMIN_ID={config['TELEGRAM_ADMIN_ID']}
WEBSITE_URL={config['WEBSITE_URL']}
TELEGRAM_WEBHOOK_SECRET={config['TELEGRAM_WEBHOOK_SECRET']}

# Database Configuration (copy from your main project)
DATABASE_URL=your_database_url_here
"""
    
    with open('scripts/.env', 'w') as f:
        f.write(env_content)
    
    print("✓ Created scripts/.env file")
    print("⚠️  Don't forget to update DATABASE_URL in scripts/.env")

def main():
    print("KYCut Telegram Bot Setup")
    print("=" * 30)
    
    # Install dependencies
    if not install_dependencies():
        print("Failed to install dependencies. Please install manually.")
        return
    
    # Get configuration
    config = get_user_input()
    if not config:
        print("Setup cancelled.")
        return
    
    # Create environment file
    create_env_file(config)
    
    print("\n✓ Setup complete!")
    print("\nNext steps:")
    print("1. Update DATABASE_URL in scripts/.env")
    print("2. Run the bot: python scripts/telegram_bot.py")
    print("3. Test by messaging your bot on Telegram")

if __name__ == "__main__":
    main()
