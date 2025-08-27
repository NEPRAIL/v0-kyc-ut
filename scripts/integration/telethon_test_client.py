import asyncio
import os
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError
import time

API_ID = int(os.getenv('API_ID') or os.getenv('TELEGRAM_API_ID') or 0)
API_HASH = os.getenv('API_HASH') or os.getenv('TELEGRAM_API_HASH')
PHONE = os.getenv('PHONE_NUMBER') or os.getenv('TELEGRAM_PHONE')
BOT_USERNAME = os.getenv('BOT_USERNAME') or None

if not API_ID or not API_HASH or not PHONE:
    print('API_ID, API_HASH and PHONE_NUMBER must be set in environment')
    raise SystemExit(1)

session_file = 'telethon_test.session'

async def main():
    client = TelegramClient(session_file, API_ID, API_HASH)
    await client.start(phone=PHONE)
    print('Logged in as', await client.get_me())

    # Rate limit safe helper
    async def safe_send(entity, message, wait=2):
        await client.send_message(entity, message)
        print('Sent:', message)
        await asyncio.sleep(wait)

    # If BOT_USERNAME not provided, try to fetch bot by token from env
    bot_token = os.getenv('TELEGRAM_BOT_TOKEN')
    if bot_token:
        # Telegram bot username is not directly derivable; user can DM bot by username if known
        print('Using bot token from env; ensure bot is running and can receive messages')

    # Test sequence: ping, start, help, link (will send /link command), status
    try:
        # locate bot entity - try by username first
        if BOT_USERNAME:
            entity = BOT_USERNAME
        else:
            entity = 'kycut_bot'  # fallback; adjust if needed

        await safe_send(entity, '/ping')
        await safe_send(entity, '/start')
        await safe_send(entity, '/help')
        await safe_send(entity, '/menu')
        await safe_send(entity, '/link')
        await safe_send(entity, '/status')

        print('Test sequence completed')
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
