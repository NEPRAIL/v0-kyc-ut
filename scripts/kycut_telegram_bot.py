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
from datetime import datetime
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

# Logging setup
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

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
                        data TEXT NOT NULL
                    )
                """)
            self.use_sqlite = True
        except Exception:
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
                    "INSERT INTO sessions (telegram_user_id, data) VALUES (?, ?) "
                    "ON CONFLICT(telegram_user_id) DO UPDATE SET data=excluded.data",
                    (telegram_user_id, json.dumps(data)),
                )
        else:
            with self.lock:
                store = self.load_all()
                store[telegram_user_id] = data
                with open(self.json_path, "w", encoding="utf-8") as f:
                    json.dump(store, f)

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

class KYCutBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.store = SessionStore()
        # Load persisted sessions into in-memory cache for backward compat
        try:
            persisted = self.store.load_all()
            user_sessions.clear()
            user_sessions.update(persisted)
        except Exception:
            pass
        self.setup_handlers()
    
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
        
        # Message handlers
        self.application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND, self.handle_message
        ))
        
        # Callback query handler for inline buttons
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
        self.application.add_error_handler(self.on_error)

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

    async def on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE):
        """Don't crash on unexpected exceptions"""
        try:
            if update:
                await self._reply(update, "⚠️ An unexpected error occurred. Please try again.")
        except Exception:
            pass

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command with deep link support"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "User"
        
        # Check for deep link parameters
        if context.args:
            param = context.args[0]
            if param.startswith("hello_"):
                # This is a linking deep link
                await self.handle_linking_deeplink(update, param)
                return
        
        welcome_text = f"""
🔐 **Welcome to KYCut Bot, {username}!**

I help you manage your KYCut orders securely with a dynamic interface.

**🚀 Quick Start:**
• `/menu` - Main navigation menu
• `/link CODE` - Link your account with 8-digit code
• `/orders` - View all your orders
• `/login` - Sign in with website credentials

**📋 Order Management:**
• Browse orders with interactive menus
• Confirm/cancel orders with one tap
• Real-time status updates
• Admin notifications

**🔗 Account Linking:**
1. Get your linking code from the website
2. Use `/link YOUR_CODE` to connect accounts
3. Enjoy seamless order management!

Use `/menu` to get started with the interactive interface!
        """
        
        # Create main menu keyboard
        keyboard = [
            [InlineKeyboardButton("📋 My Orders", callback_data="menu_orders")],
            [InlineKeyboardButton("🔗 Link Account", callback_data="menu_link"),
             InlineKeyboardButton("ℹ️ Help", callback_data="menu_help")],
            [InlineKeyboardButton("🔧 Settings", callback_data="menu_settings")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            welcome_text,
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
        await update.message.reply_text("🏓 pong")

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
    
    def is_authenticated(self, user_id: int) -> bool:
        """Check if user is authenticated (in-memory or persisted)."""
        if user_id in user_sessions and user_sessions[user_id].get('authenticated'):
            return True
        persisted = self.store.get(user_id)
        if persisted and persisted.get('authenticated'):
            user_sessions[user_id] = persisted  # hydrate cache
            return True
        return False
    
    async def fetch_all_orders(self, user_id: int) -> Dict[str, Any]:
        """Fetch all orders either using session cookie (login) or telegram link."""
        try:
            sess = user_sessions.get(user_id) or self.store.get(user_id) or {}
            session_token = sess.get('session_token')

            if session_token:
                url = urljoin(WEBSITE_URL, '/api/orders/user')
                headers = {
                    'Cookie': f'session={session_token}',
                    'X-Webhook-Secret': WEBHOOK_SECRET,
                    'User-Agent': 'KYCut-Bot/2.0'
                }
            else:
                url = urljoin(WEBSITE_URL, '/api/orders/telegram')
                headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': WEBHOOK_SECRET,
                    'User-Agent': 'KYCut-Bot/2.0'
                }
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
                headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': WEBHOOK_SECRET,
                    'User-Agent': 'KYCut-Bot/2.0'
                }
                
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
            url = urljoin(WEBSITE_URL, '/api/telegram/verify-code')
            
            payload = {
                'code': code,
                'telegramUserId': telegram_user_id,
                'telegramUsername': telegram_username
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET,
                'User-Agent': 'KYCut-Bot/2.0'
            }
            
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
                'Content-Type': 'application/json',
                'Cookie': f'session={session_token}',
                'X-Webhook-Secret': WEBHOOK_SECRET,
                'User-Agent': 'KYCut-Bot/1.0'
            }
            
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
            
            headers = {
                'Cookie': f'session={session_token}',
                'X-Webhook-Secret': WEBHOOK_SECRET,
                'User-Agent': 'KYCut-Bot/1.0'
            }
            
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

    def run(self):
        """Start the bot"""
        logger.info("Starting KYCut Telegram Bot v2.0 with Dynamic Interface...")
        logger.info(f"Website URL: {WEBSITE_URL}")
        logger.info(f"Admin ID: {ADMIN_ID}")
        
        if not ADMIN_ID:
            logger.warning("ADMIN_ID not set! Admin notifications will not work.")
        
        self.application.run_polling(drop_pending_updates=True)

def main():
    """Main function"""
    if not BOT_TOKEN:
        print("❌ Error: BOT_TOKEN not configured!")
        print("Please set your bot token in the script or environment variable.")
        return
    
    if not WEBSITE_URL:
        print("❌ Error: WEBSITE_URL not configured!")
        print("Please set WEBSITE_URL environment variable to your deployed site.")
        return
    
    print(f"🤖 KYCut Telegram Bot v2.0 Configuration:")
    print(f"   Website: {WEBSITE_URL}")
    print(f"   Admin ID: {ADMIN_ID}")
    print(f"   Webhook Secret: {'✅ Set' if WEBHOOK_SECRET else '❌ Not Set'}")
    print(f"   Features: Dynamic Interface, Linking Codes, Order Management")
    
    # Start bot
    bot = KYCutBot()
    
    try:
        bot.run()
    except KeyboardInterrupt:
        logger.info("Bot stopped by user")
    except Exception as e:
        logger.error(f"Bot crashed: {e}")

if __name__ == "__main__":
    main()
