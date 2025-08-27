import os
import asyncio
from telethon import TelegramClient

API_ID = int(os.getenv('API_ID') or 0)
API_HASH = os.getenv('API_HASH')
PHONE = os.getenv('PHONE_NUMBER')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

if not (API_ID and API_HASH and PHONE and BOT_TOKEN):
    print('Missing required env vars: API_ID, API_HASH, PHONE_NUMBER, TELEGRAM_BOT_TOKEN')
    raise SystemExit(1)

session = 'telethon_test.session'

async def main():
    client = TelegramClient(session, API_ID, API_HASH)
    await client.connect()
    me = await client.get_me()
    print('Using account:', me.username or me.first_name)

    bot_getme = None
    try:
        import requests
        bot_getme = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getMe').json()
    except Exception as e:
        print('Failed to call Bot API:', e)

    bot_username = None
    if bot_getme and bot_getme.get('ok'):
        bot_username = bot_getme['result'].get('username')
        print('Discovered bot username:', bot_username)

    target = bot_username or os.getenv('BOT_USERNAME') or 'kycutbot'

    async def send(msg, wait=1):
        await client.send_message(target, msg)
        print('Sent to', target, msg)
        await asyncio.sleep(wait)

    try:
        await send('/ping')
        await send('/start')
        print('Done sending startup commands; you can call this script again to send /link <CODE>')
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
