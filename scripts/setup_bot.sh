#!/bin/bash

echo "🤖 Setting up KYCut Telegram Bot..."

# Create virtual environment
python3 -m venv telegram_bot_env
source telegram_bot_env/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export TELEGRAM_BOT_TOKEN="8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8"
export TELEGRAM_ADMIN_CHAT_ID="8321071978"
export API_BASE_URL="https://your-deployed-site.vercel.app/api"
export TELEGRAM_WEBHOOK_SECRET="your-webhook-secret-key"

echo "✅ Bot setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your Telegram User ID by messaging @userinfobot"
echo "2. Update TELEGRAM_ADMIN_CHAT_ID with your user ID"
echo "3. Update API_BASE_URL with your deployed site URL"
echo "4. Run the bot with: python telegram_bot.py"
