import os
import sys
import asyncio
from telethon import TelegramClient

API_ID = int(os.getenv('API_ID') or 0)
API_HASH = os.getenv('API_HASH')
PHONE = os.getenv('PHONE_NUMBER')
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')

# If TELEGRAM_BOT_TOKEN isn't set in the environment, try to read the repo .env file.
def _load_dotenv_token(path='.env'):
    try:
        with open(path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                k, v = line.split('=', 1)
                if k.strip() == 'TELEGRAM_BOT_TOKEN' and v:
                    return v.strip().strip('"').strip("'")
    except FileNotFoundError:
        return None
    return None

if not BOT_TOKEN:
    BOT_TOKEN = _load_dotenv_token('../../.env') or _load_dotenv_token('.env')

session = 'telethon_test.session'

if not BOT_TOKEN:
    # Allow running in --local mode without BOT_TOKEN; warn instead of exiting.
    print('Warning: TELEGRAM_BOT_TOKEN not found in env or .env — continuing (local/headless mode may not require it).')

async def main(messages):
    # Try to create a TelegramClient using API_ID/API_HASH if available. If not,
    # attempt to instantiate the client with only the existing session file. In
    # many cases an already-authenticated session file is sufficient to connect
    # without re-supplying API credentials.
    try:
        if API_ID and API_HASH:
            client = TelegramClient(session, API_ID, API_HASH)
        else:
            # Telethon normally needs api_id/api_hash for new sessions, but an
            # existing session file often contains the required auth data.
            client = TelegramClient(session)
        await client.connect()
    except Exception as e:
        print('Failed to start TelegramClient:', e)
        raise
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
        for m in messages:
            await send(m)
    finally:
        await client.disconnect()


class _FakeUser:
    def __init__(self, id=12345, username='testuser', first_name='Test'):
        self.id = id
        self.username = username
        self.first_name = first_name


class _FakeChat:
    def __init__(self, id=12345):
        self.id = id


class _FakeMessage:
    def __init__(self, text, user: _FakeUser):
        self.text = text
        self.chat = _FakeChat(user.id)
        self.from_user = user

    async def reply_text(self, text, **kwargs):
        print('\n[Bot Reply]\n', text)
        return None


class _FakeCallbackQuery:
    def __init__(self, data, user: _FakeUser):
        self.data = data
        self.from_user = user
        self.message = _FakeMessage(data, user)

    async def answer(self):
        return None

    async def edit_message_text(self, text, **kwargs):
        print('\n[Edited Message]\n', text)
        return None


class _FakeUpdate:
    def __init__(self, text, user_id=12345, username='testuser'):
        self.effective_user = _FakeUser(id=user_id, username=username)
        self.message = _FakeMessage(text, self.effective_user)
        self.callback_query = None
        self.effective_chat = self.message.chat


class _FakeContext:
    def __init__(self, args=None):
        self.args = args or []


async def _run_local_commands(cmds):
    # Import bot and instantiate it while bypassing the atomic flock that may
    # block in CI or when a real instance is running. We monkeypatch the
    # fcntl.flock function used by KYCutBot.__init__ to be a no-op.
    import importlib.util
    import importlib.machinery
    # Load KYCutBot module from file path (directory contains a hyphen so package import fails)
    bot_path = os.path.join(os.path.dirname(__file__), '..', 'TELEGRAM-BOT', 'kycut_telegram_bot.py')
    bot_path = os.path.normpath(bot_path)
    spec = importlib.util.spec_from_file_location('kycut_telegram_bot', bot_path)
    mod = importlib.util.module_from_spec(spec)
    loader = spec.loader
    if loader and hasattr(loader, 'exec_module'):
        loader.exec_module(mod)
    else:
        raise ImportError('Could not load kycut_telegram_bot module from path: ' + bot_path)

    # Monkeypatch flock to no-op to avoid requiring exclusive lock for tests
    try:
        if hasattr(mod, 'fcntl'):
            mod.fcntl.flock = lambda *a, **k: None
    except Exception:
        pass

    # Instantiate bot
    bot = mod.KYCutBot()

    async def dispatch_text(text):
        # If text looks like a command, call matching handler
        parts = text.strip().split()
        cmd = parts[0].lstrip('/') if parts else ''
        args = parts[1:]
        update = _FakeUpdate(text, user_id=99999, username='integration_test')
        ctx = _FakeContext(args=args)

        # Map simple commands to methods
        mapping = {
            'menu': bot.menu_command,
            'link': bot.link_command,
            'orders': bot.orders_command,
            'order': bot.order_command,
            'help': bot.help_command,
            'start': bot.start_command,
            'ping': bot.ping_command,
        }
        fn = mapping.get(cmd)
        if fn:
            await fn(update, ctx)
        else:
            # Fallback to message handler
            await bot.handle_message(update, ctx)

    try:
        for m in cmds:
            await dispatch_text(m)
    finally:
        # best-effort cleanup if bot has application
        try:
            if hasattr(bot, 'application') and bot.application:
                try:
                    bot.lockfile_fd and bot.lockfile_fd.close()
                except Exception:
                    pass
        except Exception:
            pass


if __name__ == '__main__':
    # Support a local/headless mode to reuse KYCutBot handlers without
    # requiring Telethon API credentials or a running Telegram account.
    args = sys.argv[1:]
    if not args:
        print('Usage: python telethon_send_commands.py [--local] <message1> [message2] [...]')
        raise SystemExit(1)

    if args[0] == '--local':
        cmds = args[1:]
        if not cmds:
            print('Provide commands to run in local mode, e.g. --local /menu /orders')
            raise SystemExit(1)
        asyncio.run(_run_local_commands(cmds))
    else:
        msgs = args
        asyncio.run(main(msgs))
