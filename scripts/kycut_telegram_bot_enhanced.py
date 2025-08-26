#!/usr/bin/env python3
"""
Enhanced KYCut Telegram Bot with comprehensive API integration
Supports all new bot API endpoints and improved functionality
"""

import os
import json
import sqlite3
import threading
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from urllib.parse import urljoin

import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler, CallbackQueryHandler,
    ContextTypes, filters
)
from telegram.constants import ParseMode

# Enhanced logging configuration
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO,
    handlers=[
        logging.FileHandler('kycut_bot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Configuration with enhanced settings
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8")
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://kycut.com")
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "kycut_webhook_2024_secure_key_789xyz")
ADMIN_ID = int(os.getenv("TELEGRAM_ADMIN_ID", "8321071978"))

# API endpoints
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

# Global session storage
user_sessions: Dict[int, Dict[str, Any]] = {}

class EnhancedSessionStore:
    """Enhanced session storage with better persistence and error handling"""
    
    def __init__(self, sqlite_path: str = "enhanced_bot_store.db"):
        self.sqlite_path = sqlite_path
        self.lock = threading.Lock()
        self.conn = None
        self._init_database()
    
    def _init_database(self):
        """Initialize SQLite database with enhanced schema"""
        try:
            self.conn = sqlite3.connect(self.sqlite_path, check_same_thread=False)
            with self.conn:
                # Enhanced sessions table
                self.conn.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        telegram_user_id INTEGER PRIMARY KEY,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Enhanced telegram users mapping
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
                        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                # Command usage tracking
                self.conn.execute("""
                    CREATE TABLE IF NOT EXISTS command_usage (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        telegram_user_id INTEGER,
                        command TEXT,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        success INTEGER DEFAULT 1
                    )
                """)
            
            logger.info("Enhanced database initialized successfully")
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            self.conn = None
    
    def set(self, telegram_user_id: int, data: Dict[str, Any]) -> None:
        """Store session data with enhanced tracking"""
        if not self.conn:
            return
        
        try:
            with self.lock, self.conn:
                self.conn.execute(
                    """INSERT INTO sessions (telegram_user_id, data, updated_at) 
                       VALUES (?, ?, CURRENT_TIMESTAMP) 
                       ON CONFLICT(telegram_user_id) DO UPDATE SET 
                       data=excluded.data, updated_at=excluded.updated_at""",
                    (telegram_user_id, json.dumps(data))
                )
                
                # Update telegram_users table
                user_data = data.get('user_data', {})
                self.conn.execute(
                    """INSERT INTO telegram_users 
                       (telegram_user_id, website_user_id, username, bot_token, token_expires, last_seen) 
                       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                       ON CONFLICT(telegram_user_id) DO UPDATE SET
                       website_user_id=excluded.website_user_id,
                       username=excluded.username,
                       bot_token=excluded.bot_token,
                       token_expires=excluded.token_expires,
                       last_seen=excluded.last_seen""",
                    (
                        telegram_user_id,
                        user_data.get('website_user_id'),
                        user_data.get('telegram_username'),
                        data.get('bot_token'),
                        data.get('token_expires')
                    )
                )
        except Exception as e:
            logger.error(f"Failed to store session for user {telegram_user_id}: {e}")
    
    def get(self, telegram_user_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve session data with validation"""
        if not self.conn:
            return None
        
        try:
            with self.lock, self.conn:
                cursor = self.conn.execute(
                    "SELECT data FROM sessions WHERE telegram_user_id = ?",
                    (telegram_user_id,)
                )
                row = cursor.fetchone()
                if row:
                    return json.loads(row[0])
        except Exception as e:
            logger.error(f"Failed to retrieve session for user {telegram_user_id}: {e}")
        
        return None
    
    def log_command(self, telegram_user_id: int, command: str, success: bool = True):
        """Log command usage for analytics"""
        if not self.conn:
            return
        
        try:
            with self.lock, self.conn:
                self.conn.execute(
                    "INSERT INTO command_usage (telegram_user_id, command, success) VALUES (?, ?, ?)",
                    (telegram_user_id, command, 1 if success else 0)
                )
        except Exception as e:
            logger.error(f"Failed to log command usage: {e}")

class EnhancedKYCutBot:
    """Enhanced KYCut Telegram Bot with comprehensive API integration"""
    
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.store = EnhancedSessionStore()
        self._load_persisted_sessions()
        self._setup_handlers()
        
        # Test API connectivity on startup
        asyncio.create_task(self._test_api_connectivity())
    
    def _load_persisted_sessions(self):
        """Load persisted sessions into memory"""
        try:
            if self.store.conn:
                with self.store.lock, self.store.conn:
                    cursor = self.store.conn.execute("SELECT telegram_user_id, data FROM sessions")
                    for user_id, data_json in cursor.fetchall():
                        try:
                            user_sessions[user_id] = json.loads(data_json)
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid session data for user {user_id}")
            logger.info(f"Loaded {len(user_sessions)} persisted sessions")
        except Exception as e:
            logger.error(f"Failed to load persisted sessions: {e}")
    
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
    
    def _setup_handlers(self):
        """Setup all command and message handlers"""
        handlers = [
            CommandHandler("start", self.start_command),
            CommandHandler("help", self.help_command),
            CommandHandler("menu", self.menu_command),
            CommandHandler("link", self.link_command),
            CommandHandler("login", self.login_command),
            CommandHandler("logout", self.logout_command),
            CommandHandler("orders", self.orders_command),
            CommandHandler("order", self.order_command),
            CommandHandler("stats", self.stats_command),
            CommandHandler("status", self.status_command),
            CommandHandler("ping", self.ping_command),
            MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message),
            CallbackQueryHandler(self.handle_callback),
        ]
        
        for handler in handlers:
            self.application.add_handler(handler)
        
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
    
    def _is_authenticated(self, user_id: int) -> bool:
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
• Authenticated: {'✅' if self._is_authenticated(user_id) else '❌'}
• User ID: `{user_id}`
        """
        
        await update.message.reply_text(message.strip(), parse_mode=ParseMode.MARKDOWN)
    
    async def stats_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Show comprehensive order statistics"""
        user_id = update.effective_user.id
        self.store.log_command(user_id, "stats")
        
        if not self._is_authenticated(user_id):
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
    
    
    async def on_error(self, update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
        """Enhanced error handler with better logging"""
        logger.error(f"Exception while handling an update: {context.error}")
        
        # Log error details
        if update and hasattr(update, 'effective_user'):
            user_id = update.effective_user.id if update.effective_user else 'Unknown'
            logger.error(f"Error for user {user_id}: {context.error}")
        
        # Send error notification to admin
        try:
            if update and hasattr(update, 'effective_message'):
                await context.bot.send_message(
                    chat_id=ADMIN_ID,
                    text=f"🚨 Bot Error:\n```\n{str(context.error)[:500]}\n```",
                    parse_mode=ParseMode.MARKDOWN
                )
        except Exception:
            pass  # Don't fail on error notification failure

def main():
    """Enhanced main function with better startup handling"""
    logger.info("🚀 Starting Enhanced KYCut Telegram Bot...")
    
    try:
        bot = EnhancedKYCutBot()
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
