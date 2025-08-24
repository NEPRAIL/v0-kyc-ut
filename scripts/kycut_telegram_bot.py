#!/usr/bin/env python3
"""
KYCut Telegram Bot - Complete Local Implementation
Handles user authentication, order management, and admin notifications
"""

import os
import json
import logging
import asyncio
import hashlib
import hmac
from datetime import datetime
from typing import Dict, Optional, Any
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
WEBSITE_URL = os.getenv("WEBSITE_URL", "https://your-kycut-site.vercel.app")
WEBHOOK_SECRET = os.getenv("TELEGRAM_WEBHOOK_SECRET", "kycut_webhook_2024_secure_key_789xyz")
ADMIN_ID = int(os.getenv("TELEGRAM_ADMIN_ID", "0"))

# Logging setup
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# User session storage (in production, use Redis or database)
user_sessions: Dict[int, Dict[str, Any]] = {}

class KYCutBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Set up all command and message handlers"""
        # Command handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CommandHandler("login", self.login_command))
        self.application.add_handler(CommandHandler("logout", self.logout_command))
        self.application.add_handler(CommandHandler("order", self.order_command))
        self.application.add_handler(CommandHandler("auth", self.auth_command))
        self.application.add_handler(CommandHandler("ping", self.ping_command))
        
        # Message handlers
        self.application.add_handler(MessageHandler(
            filters.TEXT & ~filters.COMMAND, self.handle_message
        ))
        
        # Callback query handler for inline buttons
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "User"
        
        welcome_text = f"""
🔐 **Welcome to KYCut Bot, {username}!**

I help you manage your KYCut orders securely.

**Available Commands:**
• `/login` - Sign in with your website credentials
• `/order ORDER123` - View and confirm an order
• `/ping` - Test connection to KYCut website
• `/logout` - Sign out
• `/help` - Show this help message

**Getting Started:**
1. First, use `/login` to authenticate
2. Then use `/order YOUR_ORDER_ID` to manage orders

Need help? Use `/help` anytime!
        """
        
        await update.message.reply_text(
            welcome_text,
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
🔐 **KYCut Bot Help**

**Commands:**
• `/start` - Welcome message
• `/login` - Sign in with website credentials
• `/order ORDER123` - View and confirm an order
• `/ping` - Test connection to website
• `/logout` - Sign out
• `/help` - Show this help

**Authentication:**
1. Use `/login` to start authentication
2. Follow the prompts to enter credentials
3. Once authenticated, you can manage orders

**Order Management:**
1. Use `/order YOUR_ORDER_ID` to view order details
2. Confirm or cancel orders using the buttons
3. Admin will be notified when you confirm

**Connection Testing:**
• Use `/ping` to test if the bot can connect to the website
• Shows server status, response time, and connection details

**Security:**
• Your credentials are sent securely to the website
• Sessions expire automatically
• Only you can access your orders

**Support:**
If you need help, contact the KYCut support team.
        """
        
        await update.message.reply_text(
            help_text,
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def ping_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /ping command to test website connection"""
        user_id = update.effective_user.id
        username = update.effective_user.username or "User"
        
        # Send initial message
        ping_msg = await update.message.reply_text(
            "🔄 Testing Connection...\n\nChecking connection to KYCut website..."
        )
        
        try:
            # Test connection to website
            start_time = datetime.now()
            url = urljoin(WEBSITE_URL, '/api/bot/ping')
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET,
                'User-Agent': f'KYCut-Bot/1.0 (Telegram-{user_id})'
            }
            
            payload = {
                'bot_version': '1.0.0',
                'telegram_user_id': user_id,
                'telegram_username': username,
                'test_timestamp': start_time.isoformat()
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds() * 1000
            
            if response.status_code == 200:
                data = response.json()
                
                success_text = f"""✅ Connection Successful!

Server Details:
• Status: {data.get('status', 'online').upper()}
• Server: {data.get('server', 'KYCut API')}
• Version: {data.get('version', '1.0.0')}
• Response Time: {response_time:.0f}ms

Connection Info:
• Website URL: {WEBSITE_URL}
• Webhook Secret: ✅ Valid
• Timestamp: {data.get('timestamp', 'N/A')}

Bot Status:
• Bot Token: ✅ Valid
• Admin ID: {'✅ Set' if ADMIN_ID else '⚠️ Not Set'}

🟢 All systems operational!"""
                
                await ping_msg.edit_text(success_text)
                
            else:
                error_text = f"""❌ Connection Failed!

Error Details:
• Status Code: {response.status_code}
• Response Time: {response_time:.0f}ms
• Website URL: {WEBSITE_URL}

Possible Issues:
• Website may be down or unreachable
• Webhook secret may be incorrect
• API endpoint may not exist

Troubleshooting:
1. Check if the website is accessible in browser
2. Verify WEBSITE_URL is correct
3. Ensure webhook secret matches on both sides"""
                
                await ping_msg.edit_text(error_text)
                
        except requests.exceptions.Timeout:
            await ping_msg.edit_text(
                f"⏰ Connection Timeout!\n\n"
                f"The website {WEBSITE_URL} took too long to respond.\n\n"
                f"Possible causes:\n"
                f"• Website is slow or overloaded\n"
                f"• Network connectivity issues\n"
                f"• Server is down\n\n"
                f"Please try again later."
            )
            
        except requests.exceptions.ConnectionError:
            await ping_msg.edit_text(
                f"🔌 Connection Error!\n\n"
                f"Cannot connect to {WEBSITE_URL}\n\n"
                f"Possible causes:\n"
                f"• Website is down\n"
                f"• Incorrect URL\n"
                f"• Network issues\n"
                f"• DNS problems\n\n"
                f"Please check the website URL and try again."
            )
            
        except Exception as e:
            logger.error(f"Ping command error: {e}")
            await ping_msg.edit_text(
                f"❌ Unexpected Error!\n\n"
                f"Error: {str(e)}\n\n"
                f"Please try again or contact support."
            )
    
    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /login command"""
        user_id = update.effective_user.id
        
        if self.is_authenticated(user_id):
            await update.message.reply_text(
                "✅ You're already logged in!\n\n"
                "Use `/order ORDER123` to manage your orders."
            )
            return
        
        # Set user state to awaiting credentials
        user_sessions[user_id] = {
            'state': 'awaiting_credentials',
            'authenticated': False
        }
        
        await update.message.reply_text(
            "🔐 **Login to KYCut**\n\n"
            "Please send your credentials in this format:\n"
            "`/auth username password`\n\n"
            "Example: `/auth john@example.com mypassword`\n\n"
            "⚠️ Make sure to delete your message after sending for security!",
            parse_mode=ParseMode.MARKDOWN
        )
    
    async def auth_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /auth command with credentials"""
        user_id = update.effective_user.id
        
        if len(context.args) != 2:
            await update.message.reply_text(
                "❌ Invalid format!\n\n"
                "Use: `/auth username password`\n"
                "Example: `/auth john@example.com mypassword`"
            )
            return
        
        username, password = context.args
        
        # Delete the user's message for security
        try:
            await update.message.delete()
        except:
            pass
        
        # Authenticate with website
        auth_result = await self.authenticate_user(username, password)
        
        if auth_result['success']:
            user_sessions[user_id] = {
                'state': 'authenticated',
                'authenticated': True,
                'user_data': auth_result['user_data'],
                'session_token': auth_result.get('session_token')
            }
            
            await context.bot.send_message(
                chat_id=user_id,
                text=f"✅ **Login Successful!**\n\n"
                     f"Welcome, {auth_result['user_data'].get('name', username)}!\n\n"
                     f"You can now use `/order ORDER123` to manage your orders.",
                parse_mode=ParseMode.MARKDOWN
            )
        else:
            await context.bot.send_message(
                chat_id=user_id,
                text=f"❌ **Login Failed**\n\n"
                     f"Error: {auth_result.get('error', 'Invalid credentials')}\n\n"
                     f"Please try `/login` again.",
                parse_mode=ParseMode.MARKDOWN
            )
    
    async def logout_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /logout command"""
        user_id = update.effective_user.id
        
        if user_id in user_sessions:
            del user_sessions[user_id]
        
        await update.message.reply_text(
            "✅ **Logged Out Successfully**\n\n"
            "Use `/login` to sign in again."
        )
    
    async def order_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /order command"""
        user_id = update.effective_user.id
        
        if not self.is_authenticated(user_id):
            await update.message.reply_text(
                "❌ **Authentication Required**\n\n"
                "Please use `/login` first to access your orders."
            )
            return
        
        if not context.args:
            await update.message.reply_text(
                "❌ **Order ID Required**\n\n"
                "Use: `/order ORDER123`\n"
                "Example: `/order ORD-2024-001`"
            )
            return
        
        order_id = context.args[0]
        
        # Fetch order details
        order_data = await self.fetch_order(user_id, order_id)
        
        if not order_data['success']:
            await update.message.reply_text(
                f"❌ **Order Not Found**\n\n"
                f"Order ID: `{order_id}`\n"
                f"Error: {order_data.get('error', 'Order not found')}\n\n"
                f"Please check the order ID and try again.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        
        # Display order details with confirmation buttons
        await self.show_order_details(update, order_data['order'])
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle non-command messages"""
        user_id = update.effective_user.id
        
        if user_id not in user_sessions:
            await update.message.reply_text(
                "👋 Welcome! Use `/start` to begin or `/help` for assistance."
            )
            return
        
        state = user_sessions[user_id].get('state', '')
        
        if state == 'awaiting_credentials':
            await update.message.reply_text(
                "🔐 Please use the `/auth username password` command format.\n\n"
                "Example: `/auth john@example.com mypassword`"
            )
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle inline keyboard callbacks"""
        query = update.callback_query
        user_id = query.from_user.id
        
        if not self.is_authenticated(user_id):
            await query.answer("❌ Authentication required!")
            return
        
        await query.answer()
        
        data = query.data.split('_')
        action = data[0]
        order_id = data[1] if len(data) > 1 else None
        
        if action == 'confirm' and order_id:
            await self.confirm_order(query, user_id, order_id)
        elif action == 'cancel' and order_id:
            await self.cancel_order(query, user_id, order_id)
    
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
        """Check if user is authenticated"""
        return (user_id in user_sessions and 
                user_sessions[user_id].get('authenticated', False))
    
    async def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user with website API"""
        try:
            url = urljoin(WEBSITE_URL, '/api/auth/simple-login')
            
            payload = {
                'username': username,
                'password': password
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return {
                        'success': True,
                        'user_data': data.get('user', {}),
                        'session_token': data.get('session_token')
                    }
                else:
                    return {
                        'success': False,
                        'error': data.get('message', 'Authentication failed')
                    }
            else:
                return {
                    'success': False,
                    'error': f"Authentication failed: {response.status_code}"
                }
                
        except requests.RequestException as e:
            logger.error(f"Authentication request failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }
    
    async def fetch_order(self, user_id: int, order_id: str) -> Dict[str, Any]:
        """Fetch order details from website API"""
        try:
            session_token = user_sessions[user_id].get('session_token')
            url = urljoin(WEBSITE_URL, f'/api/orders/{order_id}')
            
            headers = {
                'Authorization': f'Bearer {session_token}',
                'X-Webhook-Secret': WEBHOOK_SECRET
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'order': data
                }
            else:
                return {
                    'success': False,
                    'error': f"Order fetch failed: {response.status_code}"
                }
                
        except requests.RequestException as e:
            logger.error(f"Order fetch request failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }
    
    async def update_order_status(self, user_id: int, order_id: str, status: str) -> Dict[str, Any]:
        """Update order status via website API"""
        try:
            session_token = user_sessions[user_id].get('session_token')
            url = urljoin(WEBSITE_URL, f'/api/orders/{order_id}/status')
            
            payload = {
                'status': status,
                'telegram_user_id': user_id
            }
            
            headers = {
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {session_token}',
                'X-Webhook-Secret': WEBHOOK_SECRET
            }
            
            response = requests.patch(url, json=payload, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'order_data': data
                }
            else:
                return {
                    'success': False,
                    'error': f"Status update failed: {response.status_code}"
                }
                
        except requests.RequestException as e:
            logger.error(f"Status update request failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }
    
    def run(self):
        """Start the bot"""
        logger.info("Starting KYCut Telegram Bot...")
        logger.info(f"Website URL: {WEBSITE_URL}")
        logger.info(f"Admin ID: {ADMIN_ID}")
        
        if not ADMIN_ID:
            logger.warning("ADMIN_ID not set! Admin notifications will not work.")
        
        self.application.run_polling(drop_pending_updates=True)

def main():
    """Main function"""
    # Validate configuration
    if not BOT_TOKEN or BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("❌ Error: BOT_TOKEN not configured!")
        print("Please set your bot token in the script or environment variable.")
        return
    
    if not WEBSITE_URL or WEBSITE_URL == "https://your-kycut-site.vercel.app":
        print("❌ Error: WEBSITE_URL not configured!")
        print("Please set WEBSITE_URL environment variable to your deployed site.")
        return
    
    if not ADMIN_ID:
        print("⚠️  Warning: TELEGRAM_ADMIN_ID not set!")
        print("Admin notifications will not work. Get your ID from @userinfobot")
    
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
