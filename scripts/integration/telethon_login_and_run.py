import os
import asyncio
import requests
from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

API_ID = int(os.getenv('API_ID') or 0)
API_HASH = os.getenv('API_HASH')
PHONE = os.getenv('PHONE_NUMBER')
LOGIN_CODE = os.getenv('LOGIN_CODE')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

if not (API_ID and API_HASH and PHONE and LOGIN_CODE and BOT_TOKEN):
    print('Missing required env vars: API_ID, API_HASH, PHONE_NUMBER, LOGIN_CODE, TELEGRAM_BOT_TOKEN')
    raise SystemExit(1)

session = 'telethon_test.session'

async def main():
    client = TelegramClient(session, API_ID, API_HASH)

    # Use non-interactive start with code_callback so we can provide the SMS code via env
    try:
        print('Starting Telethon client (non-interactive)...')
        await client.start(phone=PHONE, code_callback=lambda: LOGIN_CODE)
    except SessionPasswordNeededError:
        # 2FA password required
        pwd = os.getenv('TELEGRAM_2FA')
        if not pwd:
            print('2FA password required but TELEGRAM_2FA not set in env')
            await client.disconnect()
            return
        await client.start(phone=PHONE, password=pwd, code_callback=lambda: LOGIN_CODE)
    except Exception as e:
        print('Failed to start Telethon client:', str(e))
        await client.disconnect()
        return

    me = await client.get_me()
    print('Logged in as', me.username or me.first_name)

    # Discover bot username via Bot API
    bot_getme = requests.get(f'https://api.telegram.org/bot{BOT_TOKEN}/getMe').json()
    bot_username = None
    if bot_getme.get('ok'):
        bot_username = bot_getme['result'].get('username')
        print('Discovered bot username:', bot_username)
    else:
        print('Failed to get bot info from Bot API; will try default username')

    target = bot_username or os.getenv('BOT_USERNAME') or 'kycutbot'

    async def send(msg, wait=2):
        await client.send_message(target, msg)
        print('Sent to', target, msg)
        await asyncio.sleep(wait)

    try:
        await send('/ping')
        await send('/start')
        await send('/link')
        await send('/status')
        await send('/menu')
        print('Commands sent; check bot and site for reactions')
    finally:
        await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
