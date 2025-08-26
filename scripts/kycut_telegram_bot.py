#!/usr/bin/env python3
"""
KYCut Telegram Bot - Enhanced Dynamic Interface
Handles user authentication, order management, linking codes, and admin notifications
"""

import os
import json
import logging
import asyncio
import hashlib
import hmac
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List, Union
from urllib.parse import urljoin

# Third-party imports
try:
    import requests
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import (
        Application, CommandHandler, MessageHandler, CallbackQueryHandler,
        ContextTypes, filters
    )
    from telegram.constants import ParseMode
except ImportError as e:
    print(f"Missing required packages. Please install with:")
    print("pip install python-telegram-bot requests python-dotenv")
    exit(1)

# Optional dotenv for environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuration
BOT_TOKEN = "8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8"
WEBSITE_URL = "https://kycut.com"
WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "kycut_webhook_2024_secure_key_789xyz")
ADMIN_ID = int(os.getenv("TELEGRAM_ADMIN_ID", "8321071978"))

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('kycut_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

API_ENDPOINTS = {
    'bot_ping': '/api/bot/ping',
    'bot_status': '/api/bot/status',
    'bot_info': '/api/bot/info',
    'bot_webhook': '/api/bot/webhook',
    'bot_notifications': '/api/bot/notifications',
    'telegram_link': '/api/telegram/link',
    'telegram_verify': '/api/telegram/verify-code',
    'telegram_generate': '/api/telegram/generate-code',
    'orders_user': '/api/orders/user',
    'orders_telegram': '/api/orders/telegram',
    'orders_search': '/api/orders/search',
    'orders_stats': '/api/orders/stats',
    'order_status': '/api/orders/{}/status',
}

user_sessions: Dict[int, Dict[str, Any]] = {}


class SessionStore:
    """Local persistence: prefers SQLite, falls back to JSON."""
    def __init__(self, sqlite_path: str = "bot_store.db", json_path: str = "bot_sessions.json"):
        self.sqlite_path = sqlite_path
        self.json_path = json_path
        self.lock = threading.Lock()
        self.use_sqlite = False
        try:
            self.conn = sqlite3.connect(self.sqlite_path, check_same_thread=False)
            with self.conn:
                self.conn.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        telegram_user_id INTEGER PRIMARY KEY,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                self.conn.execute("""
                        CREATE TABLE IF NOT EXISTS telegram_users (
                            telegram_user_id INTEGER PRIMARY KEY,
                            website_user_id TEXT,
                            username TEXT,
                            first_name TEXT,
                            last_name TEXT,
                            linked INTEGER DEFAULT 0,
                            bot_token TEXT,
                            token_expires TIMESTAMP,
                            data TEXT,
                            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)
                self.conn.execute("""
                    CREATE TABLE IF NOT EXISTS command_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_user_id INTEGER,
                        command TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        success INTEGER DEFAULT 1
                    )
                """)
            self.use_sqlite = True
            logger.info("Enhanced database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            self.conn = None
            self.use_sqlite = False
            # Ensure JSON file exists
            if not os.path.exists(self.json_path):
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump({}, f)

    def load_all(self) -> Dict[int, Dict[str, Any]]:
        if self.use_sqlite:
            with self.lock, self.conn:
                rows = self.conn.execute("SELECT telegram_user_id, data FROM sessions").fetchall()
            out: Dict[int, Dict[str, Any]] = {}
            for uid, data in rows:
                try:
                    out[int(uid)] = json.loads(data)
                except Exception:
                    pass
            return out
        else:
            try:
                with open(self.json_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                return {int(k): v for k, v in raw.items()}
            except Exception:
                return {}

    def set(self, telegram_user_id: int, data: Dict[str, Any]) -> None:
        if self.use_sqlite:
            with self.lock, self.conn:
                self.conn.execute(
                    """INSERT INTO sessions (telegram_user_id, data, updated_at) 
                       VALUES (?, ?, CURRENT_TIMESTAMP) 
                       ON CONFLICT(telegram_user_id) DO UPDATE SET 
                       data=excluded.data, updated_at=excluded.updated_at""",
                    (telegram_user_id, json.dumps(data)),
                )
                user_data = data.get('user_data', {})
                try:
                    self.conn.execute(
                        """INSERT INTO telegram_users 
                           (telegram_user_id, website_user_id, username, first_name, last_name, 
                            bot_token, token_expires, linked, last_seen) 
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                           ON CONFLICT(telegram_user_id) DO UPDATE SET
                           website_user_id=excluded.website_user_id,
                           username=excluded.username,
                           first_name=excluded.first_name,
                           last_name=excluded.last_name,
                           bot_token=excluded.bot_token,
                           token_expires=excluded.token_expires,
                           linked=excluded.linked,
                           last_seen=excluded.last_seen""",
                        (
                            telegram_user_id,
                            user_data.get('website_user_id'),
                            user_data.get('telegram_username'),
                            user_data.get('first_name'),
                            user_data.get('last_name'),
                            data.get('bot_token'),
                            data.get('token_expires'),
                            1 if data.get('authenticated') else 0
                        )
                    )
                except Exception as e:
                    logger.error(f"Failed to update telegram_users: {e}")
        else:
            with self.lock:
                store = self.load_all()
                store[telegram_user_id] = data
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump(store, f)

    def set_link(self, telegram_user_id: int, website_user_id: Optional[str]) -> None:
        """Store mapping from telegram user to website user id."""
        if self.use_sqlite:
            with self.lock, self.conn:
                self.conn.execute(
                    "INSERT INTO telegram_users (telegram_user_id, website_user_id, linked, last_seen) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
                    "ON CONFLICT(telegram_user_id) DO UPDATE SET website_user_id=excluded.website_user_id, linked=excluded.linked, last_seen=excluded.last_seen",
                    (telegram_user_id, website_user_id, 1 if website_user_id else 0),
                )
        else:
            # store in JSON as part of sessions file
            try:
                store = self.load_all()
                entry = store.get(telegram_user_id, {})
                entry['user_data'] = entry.get('user_data', {})
                entry['user_data']['website_user_id'] = website_user_id
                entry['user_data']['linked'] = True if website_user_id else False
                store[telegram_user_id] = entry
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump({str(k): v for k, v in store.items()}, f)
            except Exception:
                pass

    def get_link(self, telegram_user_id: int) -> Optional[str]:
        """Return website_user_id if present for a telegram user."""
        if self.use_sqlite:
            try:
                with self.lock, self.conn:
                    row = self.conn.execute("SELECT website_user_id FROM telegram_users WHERE telegram_user_id=?", (telegram_user_id,)).fetchone()
                if row and row[0]:
                    return row[0]
            except Exception:
                return None
            return None
        else:
            try:
                all_data = self.load_all()
                entry = all_data.get(int(telegram_user_id))
                if entry and entry.get('user_data'):
                    return entry['user_data'].get('website_user_id')
            except Exception:
                return None
            return None

    def get(self, telegram_user_id: int) -> Optional[Dict[str, Any]]:
        all_data = self.load_all()
        return all_data.get(int(telegram_user_id))

    def delete(self, telegram_user_id: int) -> None:
        if self.use_sqlite:
            with self.lock, self.conn:
                self.conn.execute("DELETE FROM sessions WHERE telegram_user_id=?", (telegram_user_id,))
        else:
            with self.lock:
                store = self.load_all()
                store.pop(int(telegram_user_id), None)
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump(store, f)

    def log_command(self, telegram_user_id: int, command: str, success: bool = True):
        """Log command usage for analytics"""
        if not self.use_sqlite or not self.conn:
            return
        
        try:
            with self.lock, self.conn:
                self.conn.execute(
                    "INSERT INTO command_usage (telegram_user_id, command, success) VALUES (?, ?, ?)",
                    (telegram_user_id, command, 1 if success else 0)
                )
        except Exception as e:
            logger.error(f"Failed to log command usage: {e}")


class KYCutBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.store = SessionStore()
        # Load persisted sessions into in-memory cache for backward compat
        try:
            persisted = self.store.load_all()
            user_sessions.clear()
            user_sessions.update(persisted)
            logger.info(f"Loaded {len(user_sessions)} persisted sessions")
        except Exception as e:
            logger.error(f"Failed to load persisted sessions: {e}")
        self.setup_handlers()
        
        asyncio.create_task(self._test_api_connectivity())
    
    async def _test_api_connectivity(self):
        """Test API connectivity on startup"""
        try:
            result = await self._make_api_request('bot_ping')
            if result.get('success'):
                logger.info("✅ API connectivity test passed")
            else:
                logger.warning("⚠️ API connectivity test failed")
        except Exception as e:
            logger.error(f"❌ API connectivity test error: {e}")
    
    def setup_handlers(self):
        """Set up all command and message handlers"""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("login", self.login_command))
        self.application.add_handler(CommandHandler("logout", self.logout_command))
        self.application.add_handler(CommandHandler("order", self.order_command))
        self.application.add_handler(CommandHandler("orders", self.orders_command))
        self.application.add_handler(CommandHandler("link", self.link_command))
        self.application.add_handler(CommandHandler("menu", self.menu_command))
        self.application.add_handler(CommandHandler("auth", self.auth_command))
        self.application.add_handler(CommandHandler("ping", self.ping_command))
        self.application.add_handler(CommandHandler("stats", self.stats_command))
        self.application.add_handler(CommandHandler("status", self.status_command))
        
        # Message handlers
        self.application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND, self.handle_message
        ))
        
        # Callback query handler for inline buttons
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
        self.application.add_error_handler(self.on_error)
        logger.info("All handlers registered successfully")

    async def _make_api_request(self, endpoint_key: str, method: str = 'GET', 
                               data: Optional[Dict] = None, user_id: Optional[int] = None,
                               **kwargs) -> Dict[str, Any]:
        """Enhanced API request method with better error handling"""
        try:
            endpoint = API_ENDPOINTS.get(endpoint_key, endpoint_key)
            if '{}' in endpoint and 'order_id' in kwargs:
                endpoint = endpoint.format(kwargs['order_id'])
            
            url = urljoin(WEBSITE_URL, endpoint)
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'KYCut-Enhanced-Bot/2.0',
                'X-Webhook-Secret': WEBHOOK_SECRET,
            }
            
            # Add bot token if user has one
            if user_id and user_id in user_sessions:
                bot_token = user_sessions[user_id].get('bot_token')
                if bot_token:
                    headers['Authorization'] = f'Bearer {bot_token}'
            
            request_kwargs = {
                'headers': headers,
                'timeout': 30,
            }
            
            if data:
                request_kwargs['json'] = data
            
            if method.upper() == 'GET':
                response = requests.get(url, **request_kwargs)
            elif method.upper() == 'POST':
                response = requests.post(url, **request_kwargs)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, **request_kwargs)
            elif method.upper() == 'PUT':
                response = requests.put(url, **request_kwargs)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            result = response.json() if response.content else {}
            result['_status_code'] = response.status_code
            result['_success'] = response.ok
            
            return result
            
        except requests.exceptions.Timeout:
            logger.error(f"API request timeout for {endpoint_key}")
            return {'success': False, 'error': 'Request timeout'}
        except requests.exceptions.ConnectionError:
            logger.error(f"API connection error for {endpoint_key}")
            return {'success': False, 'error': 'Connection failed'}
        except Exception as e:
            logger.error(f"API request error for {endpoint_key}: {e}")
            return {'success': False, 'error': str(e)}

    def _make_headers(self, user_id: Optional[int] = None, json_content: bool = True, include_webhook_secret: bool = True) -> Dict[str, str]:
        """Construct headers preferring Authorization Bearer <bot_token> when available.

        - If a bot_token exists for the given user (in-memory or persisted), use Authorization header.
        - Otherwise include X-Webhook-Secret when include_webhook_secret=True.
        - Adds Content-Type: application/json when json_content is True.
        """
        headers: Dict[str, str] = {
            'User-Agent': 'KYCut-Bot/2.0'
        }

        try:
            session = None
            if user_id is not None:
                session = user_sessions.get(user_id) or self.store.get(user_id) or {}
            else:
                session = {}

            bot_token = session.get('bot_token') if session else None
            if bot_token:
                headers['Authorization'] = f'Bearer {bot_token}'
            else:
                if include_webhook_secret and WEBHOOK_SECRET:
                    headers['X-Webhook-Secret'] = WEBHOOK_SECRET
        except Exception:
            if include_webhook_secret and WEBHOOK_SECRET:
                headers['X-Webhook-Secret'] = WEBHOOK_SECRET

        if json_content:
            headers['Content-Type'] = 'application/json'

        return headers

    def _get_user_id(self, obj: Union[Update, Any]) -> Optional[int]:
        """Works for Update (message) and CallbackQuery"""
        try:
            if hasattr(obj, "effective_user") and obj.effective_user:
                return obj.effective_user.id
            if hasattr(obj, "from_user") and obj.from_user:
                return obj.from_user.id
            if hasattr(obj, "callback_query") and obj.callback_query and obj.callback_query.from_user:
                return obj.callback_query.from_user.id
        except Exception:
            pass
        return None

    async def _reply(self, carrier: Union[Update, Any], text: str, **kwargs):
        """
        Unified reply:
        - If called from a callback, edit that message.
        - If from a command/message, reply normally.
        """
        try:
            if hasattr(carrier, "callback_query") and carrier.callback_query:
                # Edit the existing message
                return await carrier.callback_query.edit_message_text(text, **kwargs)
            # Fallback to message reply
            if hasattr(carrier, "message") and carrier.message:
                return await carrier.message.reply_text(text, **kwargs)
            # Sometimes we get a CallbackQuery directly
            if hasattr(carrier, "edit_message_text"):
                return await carrier.edit_message_text(text, **kwargs)
        except Exception:
            # Last resort: try replying via application bot using chat id
            try:
                chat_id = None
                if hasattr(carrier, "effective_chat") and carrier.effective_chat:
                    chat_id = carrier.effective_chat.id
                elif hasattr(carrier, "message") and carrier.message and carrier.message.chat:
                    chat_id = carrier.message.chat.id
                if chat_id:
                    return await self.application.bot.send_message(chat_id=chat_id, text=text, **kwargs)
            except Exception:
                pass

    def is_authenticated(self, user_id: int) -> bool:
        """Check if user is authenticated with enhanced validation"""
        session = user_sessions.get(user_id) or self.store.get(user_id)
        if not session:
            return False
        
        # Check if session is still valid
        if session.get('authenticated'):
            # Check token expiration
            token_expires = session.get('token_expires')
            if token_expires:
                try:
                    expires_dt = datetime.fromisoformat(token_expires.replace('Z', '+00:00'))
                    if datetime.now() > expires_dt:
                        logger.info(f"Token expired for user {user_id}")
                        return False
                except Exception:
                    pass
            
            # Update session in memory if loaded from storage
            if user_id not in user_sessions:
                user_sessions[user_id] = session
            
            return True
        
        return False

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Enhanced start command with better onboarding"""
        user_id = update.effective_user.id
        user_name = update.effective_user.first_name or "User"
        
        self.store.log_command(user_id, "start")
        
        # Update user activity
        await self._make_api_request('bot_webhook', 'POST', {
            'telegram_user_id': user_id,
            'action': 'update_activity'
        })
        
        welcome_message = f"""
🎉 **Welcome to KYCut, {user_name}!**

I'm your personal shopping assistant for premium trading cards and collectibles.

**🔗 Get Started:**
• Use `/link CODE` to connect your account
• Use `/login EMAIL PASSWORD` for direct login
• Use `/menu` to see all available options

**📦 What I can do:**
• Show your orders and order history
• Update you on order status changes
• Help you track your purchases
• Provide order statistics

**🆘 Need help?**
Use `/help` for detailed commands or `/menu` for quick navigation.

Ready to get started? 🚀
        """
        
        keyboard = [
            [InlineKeyboardButton("🔗 Link Account", callback_data="action_link")],
            [InlineKeyboardButton("📦 View Orders", callback_data="action_orders")],
            [InlineKeyboardButton("📊 Order Stats", callback_data="action_stats")],
            [InlineKeyboardButton("ℹ️ Help", callback_data="action_help")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            welcome_message.strip(),
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def handle_linking_deeplink(self, update: Update, param: str):
        """Handle deep link for account linking"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "User"
        
        welcome_text = f"""
🔗 **Account Linking - {username}**

You've been redirected here to link your Telegram account with KYCut.

**Two ways to link:**

**Method 1: Linking Code**
1. Get your 8-digit code from the website account page
2. Use `/link YOUR_CODE` command

**Method 2: Login Credentials**
1. Use `/login` to authenticate
2. Enter your website credentials

**Why link your account?**
• Get instant order notifications
• Manage orders directly in Telegram
• Secure payment confirmations
• Real-time status updates

Ready to link? Use the buttons below!
        """
        
        keyboard = [
            [InlineKeyboardButton("🔗 Enter Linking Code", callback_data="menu_link")],
            [InlineKeyboardButton("🔐 Login with Credentials", callback_data="menu_login")],
            [InlineKeyboardButton("📋 View Orders", callback_data="menu_orders")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            welcome_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
    async def menu_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show main navigation menu (works from /menu or inline button)."""
        user_id = self._get_user_id(update) or 0
        is_linked = self.is_authenticated(user_id)

        if is_linked:
            user_data = user_sessions.get(user_id, {}).get('user_data', {})
            username = user_data.get('name', 'User')
            menu_text = f"""
🏠 **Main Menu - {username}**

Welcome to your KYCut dashboard! Choose an option below:

**📋 Orders**
• View all your orders
• Filter by status
• Confirm/cancel orders

**⚙️ Account**
• View account info
• Security settings
• Logout

**ℹ️ Support**
• Help & FAQ
• Contact support
• Bot information
            """
            keyboard = [
                [InlineKeyboardButton("📋 My Orders", callback_data="menu_orders")],
                [InlineKeyboardButton("📊 Order Stats", callback_data="menu_stats"),
                 InlineKeyboardButton("⚙️ Account", callback_data="menu_account")],
                [InlineKeyboardButton("ℹ️ Help", callback_data="menu_help"),
                 InlineKeyboardButton("🔧 Settings", callback_data="menu_settings")]
            ]
        else:
            menu_text = """
🏠 **Main Menu**

Welcome to KYCut Bot! To get started, you need to link your account.

**🔗 Account Linking**
• Link with 8-digit code
• Login with credentials

**ℹ️ Information**
• Help & FAQ
• Bot features
• Support
            """
            keyboard = [
                [InlineKeyboardButton("🔗 Link Account", callback_data="menu_link")],
                [InlineKeyboardButton("🔐 Login", callback_data="menu_login")],
                [InlineKeyboardButton("ℹ️ Help", callback_data="menu_help")]
            ]

        reply_markup = InlineKeyboardMarkup(keyboard)
        await self._reply(update, menu_text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)
    
    async def link_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /link command with linking code"""
        user_id = update.effective_user.id
        telegram_username = update.effective_user.username
        
        if not context.args:
            await update.message.reply_text(
                "🔗 **Account Linking**\n\n"
                "Please provide your 8-digit linking code:\n"
                "`/link YOUR_CODE`\n\n"
                "Example: `/link ABC12345`\n\n"
                "Get your code from the account page on the website.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        
        code = context.args[0].upper().strip()
        
        if len(code) != 8:
            await update.message.reply_text(
                "❌ **Invalid Code Format**\n\n"
                "Linking codes must be exactly 8 characters.\n"
                "Example: `ABC12345`\n\n"
                "Please check your code and try again.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        
        result = await self.verify_linking_code(code, user_id, telegram_username)
        
        if result['success']:
            # Store bot token for persistent authentication
            user_sessions[user_id] = {
                'state': 'linked',
                'authenticated': True,
                'linked_via': 'code',
                'bot_token': result.get('bot_token'),  # Store bot token instead of session cookie
                'token_expires': result.get('expires_at'),
                'user_data': {
                    'name': telegram_username or f"User{user_id}",
                    'telegram_username': telegram_username,
                    'telegram_user_id': user_id
                }
            }
            
            # Persist session
            self.store.set(user_id, user_sessions[user_id])

            # Call ensure-session to get website_user_id and a bot token if available
            try:
                ensure_url = urljoin(WEBSITE_URL, '/api/telegram/ensure-session')
                payload = {'telegramUserId': user_id}
                headers = self._make_headers(user_id=None, json_content=True, include_webhook_secret=True)
                # ensure-session is not user-scoped; use webhook secret or service credentials
                r = requests.post(ensure_url, json=payload, headers=headers, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    # data: { success, userId, botToken, expiresAt }
                    website_user_id = data.get('userId')
                    bot_token = data.get('botToken')
                    if website_user_id:
                        # persist mapping
                        self.store.set_link(user_id, website_user_id)
                        # update session user_data
                        user_sessions[user_id]['user_data']['website_user_id'] = website_user_id
                    if bot_token:
                        user_sessions[user_id]['bot_token'] = bot_token
                        user_sessions[user_id]['token_expires'] = data.get('expiresAt')
                        self.store.set(user_id, user_sessions[user_id])
            except Exception as e:
                logger.debug(f"ensure-session call failed: {e}")
            
            await update.message.reply_text(
                f"✅ **Account Linked Successfully!**\n\n"
                f"Your Telegram account is now connected to KYCut.\n\n"
                f"**What's next?**\n"
                f"• Use `/orders` to view your orders\n"
                f"• Use `/menu` for the main navigation\n"
                f"• You'll receive notifications for new orders\n\n"
                f"Welcome aboard! 🎉",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Show main menu
            await asyncio.sleep(1)
            await self.menu_command(update, context)
            
        else:
            await update.message.reply_text(
                f"❌ **Linking Failed**\n\n"
                f"Error: {result.get('error', 'Invalid or expired code')}\n\n"
                f"**Troubleshooting:**\n"
                f"• Check if the code is correct (8 characters)\n"
                f"• Make sure the code hasn't expired (10 minutes)\n"
                f"• Generate a new code from the website\n\n"
                f"Need help? Use `/help` for assistance.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def orders_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show all orders with pagination (works from message or callback)."""
        user_id = self._get_user_id(update) or 0

        if not self.is_authenticated(user_id):
            await self._reply(
                update,
                "❌ **Authentication Required**\n\n"
                "Please link your account first:\n"
                "• Use `/link CODE` with your 8-digit code\n"
                "• Or use `/login` with your credentials\n\n"
                "Get your linking code from the website account page.",
                parse_mode=ParseMode.MARKDOWN,
            )
            return

        orders_result = await self.fetch_all_orders(user_id)
        if not orders_result.get('success'):
            await self._reply(
                update,
                f"❌ **Failed to Load Orders**\n\nError: {orders_result.get('error','Unknown error')}",
                parse_mode=ParseMode.MARKDOWN,
            )
            return

        orders = orders_result.get('orders', [])
        if not orders:
            keyboard = [
                [InlineKeyboardButton("🛒 Start Shopping", url=WEBSITE_URL)],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")],
            ]
            await self._reply(
                update,
                "📋 **No Orders Found**\n\nYou don't have any orders yet.",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=InlineKeyboardMarkup(keyboard),
            )
            return

        await self.show_orders_list(update, orders, page=0)
    
    async def show_orders_list(self, update: Update, orders: List[Dict], page: int = 0):
        """Show paginated list of orders"""
        orders_per_page = 5
        total_orders = len(orders)
        total_pages = (total_orders + orders_per_page - 1) // orders_per_page

        start_idx = page * orders_per_page
        end_idx = min(start_idx + orders_per_page, total_orders)
        page_orders = orders[start_idx:end_idx]

        total_spent = sum(float(o.get('total_amount', 0) or 0) for o in orders)
        pending_count = len([o for o in orders if (o.get('status') or '').lower() == 'pending'])
        completed_count = len([o for o in orders if (o.get('status') or '').lower() in ['delivered','completed']])

        orders_text = f"""
📋 **Your Orders** (Page {page + 1}/{max(total_pages,1)})

**📊 Quick Stats:**
• Total Orders: {total_orders}
• Total Spent: ${total_spent:.2f}
• Pending: {pending_count} | Completed: {completed_count}

**📦 Recent Orders:**
"""
        
        for i, order in enumerate(page_orders, start_idx + 1):
            order_id = order.get('order_number', order.get('id', 'Unknown'))
            status = (order.get('status') or 'pending').upper()
            total = float(order.get('total_amount', 0) or 0)
            date = order.get('created_at', '')
            
            date_str = 'Unknown'
            if date:
                try:
                    date_obj = datetime.fromisoformat(str(date).replace('Z', '+00:00'))
                    date_str = date_obj.strftime('%m/%d/%Y')
                except Exception:
                    pass
            
            status_emoji = {
                'PENDING':'⏳','CONFIRMED':'✅','PROCESSING':'🔄','SHIPPED':'🚚','DELIVERED':'📦','CANCELLED':'❌'
            }.get(status, '❓')
            
            orders_text += f"\n{i}. **{order_id}** {status_emoji}\n   ${total:.2f} • {date_str} • {status}\n"

        keyboard = []
        
        # Quick view buttons
        if page_orders:
            row = []
            for order in page_orders[:3]:
                oid = order.get('order_number') or order.get('id', 'Unknown')
                row.append(InlineKeyboardButton(f"📋 {oid[:8]}", callback_data=f"order_view_{oid}"))
                if len(row) == 2:
                    keyboard.append(row); row = []
            if row: keyboard.append(row)

        # Pagination
        nav = []
        if page > 0:
            nav.append(InlineKeyboardButton("⬅️ Previous", callback_data=f"orders_page_{page-1}"))
        if page < total_pages - 1:
            nav.append(InlineKeyboardButton("Next ➡️", callback_data=f"orders_page_{page+1}"))
        if nav: keyboard.append(nav)

        keyboard.extend([
            [InlineKeyboardButton("🔍 Filter Orders", callback_data="orders_filter"),
             InlineKeyboardButton("📊 Statistics", callback_data="menu_stats")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")],
        ])

        await self._reply(update, orders_text, parse_mode=ParseMode.MARKDOWN, reply_markup=InlineKeyboardMarkup(keyboard))

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        text = (
            "🤖 *KYCut Bot Help*\n\n"
            "• /menu – main menu\n"
            "• /link CODE – link your account with 8-char code\n"
            "• /login EMAIL_OR_USERNAME PASSWORD – sign in to the website\n"
            "• /orders – list your orders\n"
            "• /order ID – view a specific order\n"
            "• /logout – sign out from the bot\n"
            "• /auth – show your auth status\n"
            "• /ping – test the bot"
        )
        await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)

    async def ping_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Test bot and API connectivity"""
        user_id = update.effective_user.id
        self.store.log_command(user_id, "ping")
        
        start_time = datetime.now()
        
        # Test API ping
        api_result = await self._make_api_request('bot_ping')
        
        end_time = datetime.now()
        response_time = (end_time - start_time).total_seconds() * 1000
        
        if api_result.get('success'):
            status_emoji = "🟢"
            status_text = "Online"
        else:
            status_emoji = "🔴"
            status_text = "Offline"
        
        message = f"""
{status_emoji} **Bot Status: {status_text}**

**Response Time:** {response_time:.0f}ms
**API Server:** {api_result.get('server', 'Unknown')}
**Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

**Your Session:**
• Authenticated: {'✅' if self.is_authenticated(user_id) else '❌'}
• User ID: `{user_id}`
        """
        
        await update.message.reply_text(message.strip(), parse_mode=ParseMode.MARKDOWN)

    async def stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show comprehensive order statistics"""
        user_id = update.effective_user.id
        self.store.log_command(user_id, "stats")
        
        if not self.is_authenticated(user_id):
            await update.message.reply_text(
                "❌ Authentication required. Use `/link CODE` or `/login EMAIL PASSWORD` first."
            )
            return
        
        # Get user stats
        stats_result = await self._make_api_request('orders_stats', user_id=user_id)
        
        if stats_result.get('success'):
            stats = stats_result.get('stats', {})
            
            message = f"""
📊 **Your Order Statistics**

**📦 Orders Overview:**
• Total Orders: {stats.get('total_orders', 0)}
• Total Value: ${stats.get('total_value', 0):.2f}
• Pending Orders: {stats.get('pending_orders', 0)}
• Completed Orders: {stats.get('completed_orders', 0)}

**📈 Recent Activity:**
• Orders (Last 7 Days): {stats.get('recent_orders', 0)}

**💰 Currency:** {stats_result.get('currency', 'USD')}
**📅 Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            keyboard = [
                [InlineKeyboardButton("📦 View All Orders", callback_data="action_orders")],
                [InlineKeyboardButton("🔍 Search Orders", callback_data="action_search")],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="action_menu")],
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                message.strip(),
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_text(
                f"❌ Failed to get statistics: {stats_result.get('error', 'Unknown error')}"
            )

    async def status_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show bot status and system information"""
        user_id = update.effective_user.id
        self.store.log_command(user_id, "status")
        
        # Get bot status from API
        status_result = await self._make_api_request('bot_status')
        
        if status_result.get('success'):
            status_data = status_result.get('status', {})
            
            message = f"""
🤖 **Bot System Status**

**🔧 System Health:**
• Database: {'✅ Connected' if status_data.get('database') else '❌ Disconnected'}
• API Server: {'✅ Online' if status_data.get('api_server') else '❌ Offline'}
• Redis Cache: {'✅ Connected' if status_data.get('redis') else '❌ Disconnected'}

**📊 Statistics:**
• Active Users: {status_data.get('active_users', 0)}
• Total Sessions: {status_data.get('total_sessions', 0)}
• Commands Today: {status_data.get('commands_today', 0)}

**⏰ Uptime:** {status_data.get('uptime', 'Unknown')}
**🔄 Last Updated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            """
            
            await update.message.reply_text(message.strip(), parse_mode=ParseMode.MARKDOWN)
        else:
            await update.message.reply_text(
                f"❌ Failed to get bot status: {status_result.get('error', 'Unknown error')}"
            )

    async def auth_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        uid = update.effective_user.id
        authed = self.is_authenticated(uid)
        sess = user_sessions.get(uid, {})
        how = sess.get("linked_via") or ("login" if "session_token" in sess else "unknown")
        await update.message.reply_text(f"🔐 Authenticated: {authed}\nVia: {how}")

    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if len(context.args) < 2:
            await update.message.reply_text(
                "Usage:\n`/login EMAIL_OR_USERNAME PASSWORD`\n\n"
                "Example:\n`/login user@mail.com StrongPass123`\n\n"
                "**Note:** For better security, use `/link CODE` instead.",
                parse_mode=ParseMode.MARKDOWN,
            )
            return
        username = context.args[0]
        password = " ".join(context.args[1:])

        result = await self.authenticate_user(username, password)
        if not result.get("success"):
            await update.message.reply_text(f"❌ Login failed: {result.get('error','Unknown error')}")
            return

        uid = update.effective_user.id
        user_sessions[uid] = {
            "authenticated": True,
            "linked_via": "login",
            "bot_token": result.get("bot_token"),  # Use bot token for API calls
            "token_expires": result.get("expires_at"),
            "user_data": result.get("user_data", {"name": username}),
        }
        
        # Persist session
        self.store.set(uid, user_sessions[uid])
        
        await update.message.reply_text("✅ Logged in! Use /orders to view your orders or /menu.")
        await self.menu_command(update, context)

    async def logout_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        uid = update.effective_user.id
        user_sessions.pop(uid, None)
        self.store.delete(uid)
        await update.message.reply_text("🚪 Logged out. Use /login or /link to connect again.")

    async def order_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        # Usage: /order ORDER_ID
        if not context.args:
            await update.message.reply_text("Usage: `/order ORDER_ID`", parse_mode=ParseMode.MARKDOWN)
            return
        order_id = context.args[0]
        uid = update.effective_user.id
        if not self.is_authenticated(uid):
            await update.message.reply_text("❌ Authentication required. Use /login or /link first.")
            return
        result = await self.fetch_order(uid, order_id)
        if not result.get("success"):
            await update.message.reply_text(f"❌ {result.get('error','Order not found')}")
            return
        await self.show_order_details(update, result["order"])

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        # Fallback for plain text
        text = (update.message.text or "").strip().lower()
        if text in {"menu", "start", "help"}:
            await self.menu_command(update, context)
        else:
            await update.message.reply_text(
                "I didn’t understand that. Try /menu, /orders, /link CODE or /login EMAIL PASSWORD."
            )

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline keyboard callbacks with dynamic navigation"""
        query = update.callback_query
        user_id = query.from_user.id
        data = query.data
        
        await query.answer()
        
        # Parse callback data
        parts = data.split('_')
        action = parts[0]
        
        # Menu navigation
        if action == 'menu':
            if data == 'menu_main':
                await self.show_main_menu(query)
            elif data == 'menu_orders':
                await self.show_orders_menu(query)
            elif data == 'menu_link':
                await self.show_link_menu(query)
            elif data == 'menu_login':
                await self.show_login_menu(query)
            elif data == 'menu_help':
                await self.show_help_menu(query)
            elif data == 'menu_settings':
                await self.show_settings_menu(query)
            elif data == 'menu_account':
                await self.show_account_menu(query)
            elif data == 'menu_stats':
                await self.show_stats_menu(query)
        
        # Orders navigation
        elif action == 'orders':
            if data.startswith('orders_page_'):
                page = int(parts[2])
                orders_result = await self.fetch_all_orders(user_id)
                if orders_result['success']:
                    await self.show_orders_list(query, orders_result['orders'], page)
            elif data == 'orders_filter':
                await self.show_orders_filter(query)
        
        # Order actions
        elif action == 'order':
            if data.startswith('order_view_'):
                order_id = '_'.join(parts[2:])
                await self.show_order_details_callback(query, order_id)
        
        # Legacy order actions
        elif action in ['confirm', 'cancel']:
            if not self.is_authenticated(user_id):
                await query.edit_message_text("❌ Authentication required!")
                return
            
            order_id = parts[1] if len(parts) > 1 else None
            if action == 'confirm' and order_id:
                await self.confirm_order(query, user_id, order_id)
            elif action == 'cancel' and order_id:
                await self.cancel_order(query, user_id, order_id)

    async def show_main_menu(self, query):
        """Show main menu via callback"""
        await self.menu_command(query, None)

    async def show_orders_menu(self, query):
        """Show orders menu via callback"""
        await self.orders_command(query, None)

    async def show_link_menu(self, query):
        """Show link menu via callback"""
        text = """
🔗 **Account Linking**

You can link your account using a linking code or by logging in with your credentials.

**Linking Code:**
1. Get your 8-digit code from the website
2. Use `/link YOUR_CODE` command

**Login Credentials:**
1. Use `/login` to authenticate
2. Enter your website credentials
        """
        keyboard = [
            [InlineKeyboardButton("🔗 Enter Linking Code", callback_data="menu_link_code")],
            [InlineKeyboardButton("🔐 Login with Credentials", callback_data="menu_login")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def show_login_menu(self, query):
        """Show login menu via callback"""
        await self.login_command(query, None)

    async def show_help_menu(self, query):
        """Show help menu via callback"""
        await self.help_command(query, None)

    async def show_settings_menu(self, query):
        """Show settings menu via callback"""
        text = """
⚙️ **Settings**

Configure your bot preferences here.

**Options:**
• Notifications
• Language
• Privacy
        """
        keyboard = [
            [InlineKeyboardButton("🔔 Notifications", callback_data="settings_notifications")],
            [InlineKeyboardButton("🌐 Language", callback_data="settings_language")],
            [InlineKeyboardButton("🔒 Privacy", callback_data="settings_privacy")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def show_account_menu(self, query):
        """Show account menu via callback"""
        user_id = query.from_user.id
        user_data = user_sessions[user_id].get('user_data', {})
        username = user_data.get('name', 'User')
        telegram_username = user_data.get('telegram_username', 'N/A')
        text = f"""
👤 **Account - {username}**

**Details:**
• Telegram: @{telegram_username}
• User ID: {user_id}

**Actions:**
• Change Password
• Logout
        """
        keyboard = [
            [InlineKeyboardButton("🔑 Change Password", callback_data="account_password")],
            [InlineKeyboardButton("🚪 Logout", callback_data="account_logout")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def show_stats_menu(self, query):
        """Show stats menu via callback"""
        user_id = query.from_user.id
        orders_result = await self.fetch_all_orders(user_id)
        if not orders_result['success']:
            await query.edit_message_text(
                f"❌ **Failed to Load Orders**\n\n"
                f"Error: {orders_result.get('error', 'Unknown error')}\n\n"
                f"Please try again or contact support.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        orders = orders_result['orders']
        total_orders = len(orders)
        total_spent = sum(float(order.get('total_amount', 0)) for order in orders)
        pending_count = len([o for o in orders if o.get('status') == 'pending'])
        completed_count = len([o for o in orders if o.get('status') in ['delivered', 'completed']])
        text = f"""
📊 **Order Statistics**

**Summary:**
• Total Orders: {total_orders}
• Total Spent: ${total_spent:.2f}
• Pending: {pending_count}
• Completed: {completed_count}
        """
        keyboard = [
            [InlineKeyboardButton("📋 View Orders", callback_data="menu_orders")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def show_orders_filter(self, query):
        """Show orders filter options"""
        text = """
🔍 **Filter Orders**

Filter your orders by status.

**Options:**
• Pending
• Confirmed
• Shipped
• Delivered
• Cancelled
        """
        keyboard = [
            [InlineKeyboardButton("⏳ Pending", callback_data="filter_pending")],
            [InlineKeyboardButton("✅ Confirmed", callback_data="filter_confirmed")],
            [InlineKeyboardButton("🚚 Shipped", callback_data="filter_shipped")],
            [InlineKeyboardButton("📦 Delivered", callback_data="filter_delivered")],
            [InlineKeyboardButton("❌ Cancelled", callback_data="filter_cancelled")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def show_order_details_callback(self, query: Any, order_id: str):
        """Show order details from callback"""
        user_id = query.from_user.id
        order_data = await self.fetch_order(user_id, order_id)
        if not order_data['success']:
            await query.edit_message_text(
                f"❌ **Order Not Found**\n\n"
                f"Order ID: `{order_id}`\n"
                f"Error: {order_data.get('error', 'Order not found')}\n\n"
                f"Please check the order ID and try again.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        await self.show_order_details(query, order_data['order'])
    
    async def show_order_details(self, update: Update, order: Dict[str, Any]):
        """Display order details with confirmation buttons"""
        order_id = order.get('id', 'Unknown')
        order_number = order.get('order_number', order_id)
        total = order.get('total', 0)
        status = order.get('status', 'pending')
        items = order.get('items', [])
        customer = order.get('customer', {})
        
        # Format items list
        items_text = ""
        for item in items:
            name = item.get('name', 'Unknown Item')
            quantity = item.get('quantity', 1)
            price = item.get('price', 0)
            items_text += f"• {name} x{quantity} - ${price:.2f}\n"
        
        order_text = f"""
📋 **Order Details**

**Order ID:** `{order_number}`
**Status:** {status.upper()}
**Total:** ${total:.2f}

**Items:**
{items_text}

**Customer:**
• Name: {customer.get('name', 'N/A')}
• Email: {customer.get('email', 'N/A')}
• Contact: {customer.get('contact', 'N/A')}
"""

        # Create inline keyboard
        keyboard = [
            [
                InlineKeyboardButton("✅ Confirm Order", callback_data=f"confirm_{order_id}"),
                InlineKeyboardButton("❌ Cancel Order", callback_data=f"cancel_{order_id}")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if hasattr(update, 'callback_query') and update.callback_query:
            await update.callback_query.edit_message_text(
                order_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_text(
                order_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
    
    async def confirm_order(self, query, user_id: int, order_id: str):
        """Handle order confirmation"""
        # Update order status
        result = await self.update_order_status(user_id, order_id, 'confirmed')
        
        if result['success']:
            # Send confirmation to user
            await query.edit_message_text(
                f"✅ **Order Confirmed!**\n\n"
                f"Order ID: `{order_id}`\n"
                f"Status: CONFIRMED\n\n"
                f"The admin has been notified and will process your order shortly.",
                parse_mode=ParseMode.MARKDOWN
            )
            
            # Send notification to admin
            await self.notify_admin_order_confirmed(order_id, result.get('order_data'))
        else:
            await query.edit_message_text(
                f"❌ **Confirmation Failed**\n\n"
                f"Error: {result.get('error', 'Unknown error')}\n\n"
                f"Please try again or contact support."
            )
    
    async def cancel_order(self, query, user_id: int, order_id: str):
        """Handle order cancellation"""
        result = await self.update_order_status(user_id, order_id, 'cancelled')
        
        if result['success']:
            await query.edit_message_text(
                f"❌ **Order Cancelled**\n\n"
                f"Order ID: `{order_id}`\n"
                f"Status: CANCELLED\n\n"
                f"The order has been cancelled successfully.",
                parse_mode=ParseMode.MARKDOWN
            )
        else:
            await query.edit_message_text(
                f"❌ **Cancellation Failed**\n\n"
                f"Error: {result.get('error', 'Unknown error')}\n\n"
                f"Please try again or contact support."
            )
    
    async def notify_admin_order_confirmed(self, order_id: str, order_data: Dict[str, Any]):
        """Send notification to admin when order is confirmed"""
        if not ADMIN_ID:
            logger.warning("ADMIN_ID not set, cannot send admin notification")
            return
        
        customer = order_data.get('customer', {})
        items = order_data.get('items', [])
        total = order_data.get('total', 0)
        
        # Format items for admin
        items_text = ""
        for item in items:
            name = item.get('name', 'Unknown Item')
            quantity = item.get('quantity', 1)
            price = item.get('price', 0)
            items_text += f"• {name} x{quantity} - ${price:.2f}\n"
        
        admin_text = f"""
🔔 **NEW ORDER CONFIRMED**

**Order ID:** `{order_id}`
**Total:** ${total:.2f}
**Confirmed:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

**Items:**
{items_text}

**Customer Details:**
• **Name:** {customer.get('name', 'N/A')}
• **Email:** {customer.get('email', 'N/A')}
• **Contact:** {customer.get('contact', 'N/A')}
• **Telegram:** @{customer.get('telegram_username', 'N/A')}

**Action Required:**
Please process this order and contact the customer.
        """
        
        try:
            await self.application.bot.send_message(
                chat_id=ADMIN_ID,
                text=admin_text,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Failed to send admin notification: {e}")
    
    async def fetch_all_orders(self, user_id: int) -> Dict[str, Any]:
        """Fetch all orders either using session cookie (login) or telegram link."""
        try:
            sess = user_sessions.get(user_id) or self.store.get(user_id) or {}
            session_token = sess.get('session_token')

            if session_token:
                url = urljoin(WEBSITE_URL, '/api/orders/user')
                headers = self._make_headers(user_id=user_id, json_content=False, include_webhook_secret=True)
                headers['Cookie'] = f'session={session_token}'
            else:
                url = urljoin(WEBSITE_URL, '/api/orders/telegram')
                headers = self._make_headers(user_id=user_id, json_content=True, include_webhook_secret=True)
                url += f'?telegram_user_id={user_id}'

            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                data = response.json()
                return {'success': True, 'orders': data.get('orders', [])}
            if response.status_code == 401:
                return {'success': False, 'error': 'Session expired. Please /login again.'}
            return {'success': False, 'error': f'HTTP {response.status_code}'}
        except requests.RequestException as e:
            logger.error(f"Fetch orders failed: {e}")
            return {'success': False, 'error': f'Connection error: {str(e)}'}
    
    async def ensure_bot_session(self, user_id: int) -> bool:
        """Ensure user has a valid bot token, refresh if needed"""
        if not self.is_authenticated(user_id):
            return False
        
        session = user_sessions[user_id]
        bot_token = session.get('bot_token')
        
        if not bot_token:
            # Try to get a fresh bot token
            try:
                url = urljoin(WEBSITE_URL, '/api/telegram/ensure-session')
                payload = {'telegramUserId': user_id}
                headers = self._make_headers(user_id=None, json_content=True, include_webhook_secret=True)
                response = requests.post(url, json=payload, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        # Update session with new bot token
                        session['bot_token'] = data.get('botToken')
                        session['token_expires'] = data.get('expiresAt')
                        return True
                
                # Failed to get token, user needs to re-link
                user_sessions.pop(user_id, None)
                return False
                
            except Exception as e:
                logger.error(f"Failed to ensure bot session for user {user_id}: {e}")
                return False
        
        return True
    
    async def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user with website API and get bot token"""
        try:
            # First, authenticate with login API
            url = urljoin(WEBSITE_URL, '/api/auth/login')
            
            payload = {
                'emailOrUsername': username,
                'password': password
            }
            
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'KYCut-Bot/2.0'
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    # Note: This requires the user to be linked first via /link command
                    # For now, we'll return success but recommend using /link instead
                    return {
                        'success': True,
                        'user_data': {
                            'name': username,
                            'email': username if '@' in username else None,
                            'username': username if '@' not in username else None
                        },
                        'message': 'Login successful, but please use /link CODE for persistent access'
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Authentication failed'
                    }
            elif response.status_code == 401:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', 'Invalid credentials')
                except:
                    error_msg = 'Invalid credentials. Please check your username/email and password.'
                
                return {
                    'success': False,
                    'error': error_msg
                }
            elif response.status_code == 429:
                return {
                    'success': False,
                    'error': 'Too many login attempts. Please wait a few minutes and try again.'
                }
            else:
                return {
                    'success': False,
                    'error': f"Authentication failed: HTTP {response.status_code}"
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timed out. Please try again.'
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Authentication request failed: {e}")
            return {
                'success': False,
                'error': 'Network error. Please try again later.'
            }
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {
                'success': False,
                'error': 'Authentication failed. Please try again.'
            }
    
    async def verify_linking_code(self, code: str, telegram_user_id: int, telegram_username: str = None) -> Dict[str, Any]:
        """Verify linking code with website API and get bot token"""
        try:
            url = urljoin(WEBSITE_URL, '/api/telegram/link')
            
            payload = {
                'code': code,
                'telegramUserId': telegram_user_id,
                'telegramUsername': telegram_username
            }
            headers = self._make_headers(user_id=None, json_content=True, include_webhook_secret=True)
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return {
                        'success': True,
                        'bot_token': data.get('botToken'),  # Get bot token from response
                        'expires_at': data.get('expiresAt'),
                        'message': data.get('message', 'Account linked successfully')
                    }
                else:
                    return {
                        'success': False,
                        'error': data.get('error', 'Failed to verify linking code')
                    }
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', 'Invalid or expired code')
                except:
                    error_msg = 'Invalid or expired code'
                
                return {
                    'success': False,
                    'error': error_msg
                }
            elif response.status_code == 429:
                return {
                    'success': False,
                    'error': 'Too many attempts. Please wait a minute and try again.'
                }
            else:
                return {
                    'success': False,
                    'error': f"Verification failed: HTTP {response.status_code}"
                }
                
        except requests.exceptions.Timeout:
            return {
                'success': False,
                'error': 'Request timed out. Please try again.'
            }
        except requests.exceptions.RequestException as e:
            logger.error(f"Linking code verification request failed: {e}")
            return {
                'success': False,
                'error': 'Network error. Please try again later.'
            }
        except Exception as e:
            logger.error(f"Linking code verification error: {e}")
            return {
                'success': False,
                'error': 'Verification failed. Please try again.'
            }

    async def update_order_status(self, user_id: int, order_id: str, status: str) -> Dict[str, Any]:
        """Update order status via website API"""
        try:
            session_token = user_sessions[user_id].get('session_token')
            url = urljoin(WEBSITE_URL, f'/api/orders/{order_id}/status')
            
            payload = {
                'status': status,
                'telegram_user_id': user_id,
                'updated_via': 'telegram_bot'
            }
            
            headers = {
                # prefer authorization when bot token exists for this user
                'Content-Type': 'application/json',
                'Cookie': f'session={session_token}',
                'User-Agent': 'KYCut-Bot/1.0'
            }
            # build headers using helper to inject Authorization if available
            headers = self._make_headers(user_id=user_id, json_content=True, include_webhook_secret=True)
            headers['Cookie'] = f'session={session_token}'
            response = requests.patch(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'order_data': data
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': 'Session expired. Please login again with /login'
                }
            elif response.status_code == 403:
                return {
                    'success': False,
                    'error': 'You do not have permission to modify this order'
                }
            elif response.status_code == 404:
                return {
                    'success': False,
                    'error': 'Order not found'
                }
            else:
                return {
                    'success': False,
                    'error': f"Status update failed: HTTP {response.status_code}"
                }
                
        except requests.RequestException as e:
            logger.error(f"Status update request failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }

    async def fetch_order(self, user_id: int, order_id: str) -> Dict[str, Any]:
        """Fetch order details from website API"""
        try:
            session_token = user_sessions[user_id].get('session_token')
            url = urljoin(WEBSITE_URL, f'/api/orders/user')
            
            headers = self._make_headers(user_id=user_id, json_content=False, include_webhook_secret=True)
            headers['Cookie'] = f'session={session_token}'
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                # Find the specific order by ID or order number
                orders = data.get('orders', [])
                order = None
                
                for o in orders:
                    if (o.get('id') == order_id or 
                        o.get('order_number') == order_id or
                        str(o.get('id')) == order_id):
                        order = o
                        break
                
                if order:
                    # Transform order data to expected format
                    transformed_order = {
                        'id': order.get('id'),
                        'order_number': order.get('order_number', order.get('id')),
                        'total': float(order.get('total_amount', 0)),
                        'status': order.get('status', 'pending'),
                        'items': [],
                        'customer': {
                            'name': order.get('customer_name', 'N/A'),
                            'email': order.get('customer_email', 'N/A'),
                            'contact': order.get('customer_email', 'N/A'),
                            'telegram_username': user_sessions[user_id].get('user_data', {}).get('username', 'N/A')
                        }
                    }
                    
                    # Transform items
                    for item in order.get('items', []):
                        transformed_order['items'].append({
                            'name': item.get('product_name', 'Unknown Item'),
                            'quantity': item.get('quantity', 1),
                            'price': float(item.get('product_price', 0))
                        })
                    
                    return {
                        'success': True,
                        'order': transformed_order
                    }
                else:
                    return {
                        'success': False,
                        'error': 'Order not found in your account'
                    }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': 'Session expired. Please login again with /login'
                }
            else:
                return {
                    'success': False,
                    'error': f"Order fetch failed: HTTP {response.status_code}"
                }
                
        except requests.RequestException as e:
            logger.error(f"Order fetch request failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }

    async def on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Enhanced error handler with better logging"""
        logger.error(f"Exception while handling an update: {context.error}")
        
        # Log error details
        if update and hasattr(update, 'effective_user'):
            user_id = update.effective_user.id if update.effective_user else 'Unknown'
            logger.error(f"Error for user {user_id}: {context.error}")
            
            # Log failed command
            if hasattr(update, 'message') and update.message and update.message.text:
                command = update.message.text.split()[0] if update.message.text.startswith('/') else 'message'
                self.store.log_command(user_id, command, success=False)
        
        # Send error notification to admin
        try:
            if update and hasattr(update, 'effective_message'):
                await context.bot.send_message(
                    chat_id=ADMIN_ID,
                    text=f"🚨 Bot Error:\n\`\`\`\n{str(context.error)[:500]}\n\`\`\`",
                    parse_mode=ParseMode.MARKDOWN
                )
        except Exception:
            pass  # Don't fail on error notification failure

# Enhanced main function with better startup handling
def main():
    """Enhanced main function with better startup handling"""
    logger.info("🚀 Starting Enhanced KYCut Telegram Bot...")
    
    try:
        bot = KYCutBot()
        logger.info("✅ Bot initialized successfully")
        
        # Start the bot
        logger.info("🔄 Starting bot polling...")
        bot.application.run_polling(
            allowed_updates=Update.ALL_TYPES,
            drop_pending_updates=True
        )
        
    except KeyboardInterrupt:
        logger.info("👋 Bot stopped by user")
    except Exception as e:
        logger.error(f"❌ Bot startup failed: {e}")
        raise


if __name__ == "__main__":
    main()
