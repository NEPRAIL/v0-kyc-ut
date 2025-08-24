#!/bin/bash

# KYCut Telegram Bot Runner
echo "Starting KYCut Telegram Bot..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements
echo "Installing requirements..."
pip install -r scripts/requirements.txt

# Set environment variables (you need to configure these)
export TELEGRAM_BOT_TOKEN="your_bot_token_here"
export TELEGRAM_ADMIN_CHAT_ID="your_admin_chat_id_here"
export API_BASE_URL="https://your-domain.com/api"
export TELEGRAM_WEBHOOK_SECRET="your_webhook_secret_here"

# Run the bot
echo "Starting bot..."
python scripts/telegram_bot.py
