# 🤖 KYCut Telegram Bot Setup Guide

## Prerequisites
- Python 3.8 or higher
- Your deployed KYCut website URL
- Telegram account

## Step 1: Get Your Telegram User ID
1. Message [@userinfobot](https://t.me/userinfobot) on Telegram
2. Copy your User ID (you'll need this as ADMIN_CHAT_ID)

## Step 2: Set Environment Variables
Create a `.env` file in the scripts directory:

\`\`\`bash
TELEGRAM_BOT_TOKEN=8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8
TELEGRAM_ADMIN_CHAT_ID=YOUR_USER_ID_HERE
API_BASE_URL=https://your-site.vercel.app/api
TELEGRAM_WEBHOOK_SECRET=your-secret-key-123
\`\`\`

## Step 3: Install Dependencies
\`\`\`bash
cd scripts
python3 -m venv telegram_bot_env
source telegram_bot_env/bin/activate  # On Windows: telegram_bot_env\Scripts\activate
pip install -r requirements.txt
\`\`\`

## Step 4: Run the Bot
\`\`\`bash
python telegram_bot.py
\`\`\`

## How It Works
1. **Customer Flow:**
   - Customer completes order on website
   - Gets redirected to Telegram instructions
   - Messages bot with `/order ORDER123`
   - Reviews and confirms order

2. **Admin Flow:**
   - Receives notification when order is confirmed
   - Gets customer contact details
   - Processes payment outside Telegram

## Bot Commands
- `/start` - Welcome message
- `/login` - Sign in with website credentials
- `/order ORDER123` - View specific order
- `/help` - Show help message

## Security Features
- User authentication with website credentials
- Session management
- Encrypted communications
- Admin-only notifications
