import os
import logging
import asyncio
import aiohttp
import hashlib
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8')
ADMIN_CHAT_ID = os.getenv('TELEGRAM_ADMIN_CHAT_ID')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://your-domain.com/api')
WEBHOOK_SECRET = os.getenv('TELEGRAM_WEBHOOK_SECRET')

# User sessions for authentication
user_sessions = {}

class KYCutBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Setup bot command and callback handlers"""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("login", self.login_command))
        self.application.add_handler(CommandHandler("order", self.order_command))
        self.application.add_handler(CommandHandler("help", self.help_command))
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        welcome_text = """
🔐 **Welcome to KYCut Bot!**

I help you manage your KYC account orders securely.

**Available Commands:**
• `/login` - Sign in with your KYCut credentials
• `/order <order_id>` - View and confirm your order
• `/help` - Show this help message

To get started, please login with your KYCut account credentials using `/login`
        """
        await update.message.reply_text(welcome_text, parse_mode='Markdown')
    
    async def login_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /login command"""
        user_id = update.effective_user.id
        
        if user_id in user_sessions and user_sessions[user_id].get('authenticated'):
            await update.message.reply_text("✅ You are already logged in!")
            return
        
        # Initialize login session
        user_sessions[user_id] = {
            'state': 'awaiting_email_or_username',
            'authenticated': False,
            'login_attempts': 0
        }
        
        await update.message.reply_text(
            "🔐 **Login to KYCut**\n\nPlease enter your email address or username:",
            parse_mode='Markdown'
        )
    
    async def order_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /order command"""
        user_id = update.effective_user.id
        
        # Check if user is authenticated
        if user_id not in user_sessions or not user_sessions[user_id].get('authenticated'):
            await update.message.reply_text(
                "🔒 Please login first using `/login` command.",
                parse_mode='Markdown'
            )
            return
        
        # Get order ID from command arguments
        if not context.args:
            await update.message.reply_text(
                "📋 Please provide an order ID: `/order ORDER123`",
                parse_mode='Markdown'
            )
            return
        
        order_id = context.args[0].upper()
        await self.show_order_details(update, order_id, user_id)
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        help_text = """
🤖 **KYCut Bot Help**

**Commands:**
• `/start` - Welcome message and setup
• `/login` - Sign in with your KYCut credentials
• `/order <order_id>` - View and confirm your order
• `/help` - Show this help message

**How to use:**
1. Login with your KYCut account credentials
2. Use your order ID to view order details
3. Confirm your order to proceed with payment
4. Our admin will contact you for payment processing

**Security:**
• Your credentials are verified against our secure database
• All communications are encrypted
• Order confirmations are sent directly to our admin team
        """
        await update.message.reply_text(help_text, parse_mode='Markdown')
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle text messages based on user state"""
        user_id = update.effective_user.id
        message_text = update.message.text
        
        if user_id not in user_sessions:
            await update.message.reply_text("Please start with `/start` command.")
            return
        
        user_state = user_sessions[user_id].get('state')
        
        if user_state == 'awaiting_email_or_username':
            await self.handle_email_or_username_input(update, message_text, user_id)
        elif user_state == 'awaiting_password':
            await self.handle_password_input(update, message_text, user_id)
        else:
            await update.message.reply_text(
                "I don't understand. Use `/help` to see available commands."
            )
    
    async def handle_email_or_username_input(self, update: Update, email_or_username: str, user_id: int):
        """Handle email or username input during login"""
        if len(email_or_username.strip()) < 3:
            await update.message.reply_text("❌ Please enter a valid email address or username.")
            return
        
        user_sessions[user_id]['emailOrUsername'] = email_or_username.strip()
        user_sessions[user_id]['state'] = 'awaiting_password'
        
        await update.message.reply_text(
            f"📧 Email/Username: `{email_or_username}`\n\nNow please enter your password (minimum 8 characters):",
            parse_mode='Markdown'
        )
    
    async def handle_password_input(self, update: Update, password: str, user_id: int):
        """Handle password input during login"""
        try:
            await update.message.delete()
        except:
            pass
        
        if len(password) < 8:
            await update.message.reply_text(
                "❌ Password must be at least 8 characters long. Please try again with `/login`"
            )
            del user_sessions[user_id]
            return
        
        email_or_username = user_sessions[user_id]['emailOrUsername']
        
        # Authenticate with API
        auth_result = await self.authenticate_user(email_or_username, password)
        
        if auth_result['success']:
            user_sessions[user_id].update({
                'authenticated': True,
                'state': 'authenticated',
                'user_data': auth_result['user'],
                'session_token': auth_result.get('sessionToken'),
                'login_time': datetime.now()
            })
            
            await update.message.reply_text(
                f"✅ **Login Successful!**\n\nWelcome back, {auth_result['user']['name']}!\n\nYou can now use `/order <order_id>` to view your orders.",
                parse_mode='Markdown'
            )
        else:
            user_sessions[user_id]['login_attempts'] += 1
            
            if user_sessions[user_id]['login_attempts'] >= 3:
                del user_sessions[user_id]
                await update.message.reply_text(
                    "❌ **Too many failed attempts.**\n\nPlease start over with `/login`"
                )
            else:
                await update.message.reply_text(
                    f"❌ **Login failed:** {auth_result['error']}\n\nPlease try again with `/login`"
                )
    
    async def authenticate_user(self, email_or_username: str, password: str):
        """Authenticate user with the API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{API_BASE_URL}/auth/login",
                    json={'emailOrUsername': email_or_username, 'password': password},
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            'success': True,
                            'user': data['user'],
                            'sessionToken': data.get('sessionToken')
                        }
                    else:
                        try:
                            error_data = await response.json()
                            error_message = error_data.get('error', 'Authentication failed')
                        except:
                            error_message = f'Authentication failed (Status: {response.status})'
                        
                        return {
                            'success': False,
                            'error': error_message
                        }
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return {
                'success': False,
                'error': 'Connection error. Please try again later.'
            }
    
    async def show_order_details(self, update: Update, order_id: str, user_id: int):
        """Show order details and confirmation options"""
        try:
            session_token = user_sessions[user_id].get('session_token', '')
            headers = {
                'Cookie': f'session={session_token}' if session_token else '',
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{API_BASE_URL}/orders/{order_id}",
                    headers=headers
                ) as response:
                    
                    if response.status == 404:
                        await update.message.reply_text(
                            f"❌ Order `{order_id}` not found.\n\nPlease check your order ID and try again.",
                            parse_mode='Markdown'
                        )
                        return
                    
                    if response.status == 401:
                        await update.message.reply_text(
                            "🔒 Session expired. Please login again with `/login`",
                            parse_mode='Markdown'
                        )
                        if user_id in user_sessions:
                            del user_sessions[user_id]
                        return
                    
                    if response.status != 200:
                        await update.message.reply_text("❌ Error fetching order details. Please try again.")
                        return
                    
                    order = await response.json()
            
            order_text = self.format_order_details(order)
            
            keyboard = [
                [
                    InlineKeyboardButton("✅ Confirm Order", callback_data=f"confirm_{order_id}"),
                    InlineKeyboardButton("❌ Cancel Order", callback_data=f"cancel_{order_id}")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                order_text,
                parse_mode='Markdown',
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error showing order details: {e}")
            await update.message.reply_text("❌ Error loading order details. Please try again.")
    
    def format_order_details(self, order):
        """Format order details for display"""
        items_text = ""
        total_amount = 0
        
        for item in order.get('items', []):
            items_text += f"• {item['name']} - ${item['price']:.2f}\n"
            total_amount += item['price']
        
        return f"""
📋 **Order Details**

**Order ID:** `{order['order_number']}`
**Status:** {order['status'].title()}
**Date:** {order['created_at'][:10]}

**Items:**
{items_text}
**Total:** ${total_amount:.2f}

**Customer Info:**
• Name: {order['customer_name']}
• Email: {order['customer_email']}
• Telegram: {order.get('customer_telegram', 'Not provided')}

Please review your order and confirm if everything is correct.
        """
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle button callbacks"""
        query = update.callback_query
        await query.answer()
        
        user_id = query.from_user.id
        
        # Check authentication
        if user_id not in user_sessions or not user_sessions[user_id].get('authenticated'):
            await query.edit_message_text("🔒 Session expired. Please login again with `/login`")
            return
        
        callback_data = query.data
        
        if callback_data.startswith('confirm_'):
            order_id = callback_data.replace('confirm_', '')
            await self.confirm_order(query, order_id, user_id)
        elif callback_data.startswith('cancel_'):
            order_id = callback_data.replace('cancel_', '')
            await self.cancel_order(query, order_id, user_id)
    
    async def confirm_order(self, query, order_id: str, user_id: int):
        """Handle order confirmation"""
        try:
            session_token = user_sessions[user_id].get('session_token', '')
            headers = {
                'Cookie': f'session={session_token}' if session_token else '',
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{API_BASE_URL}/orders/{order_id}/status",
                    json={'status': 'confirmed'},
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        order = await response.json()
                        
                        await self.notify_admin_order_confirmed(order, user_id)
                        
                        await query.edit_message_text(
                            f"✅ **Order Confirmed!**\n\nOrder `{order_id}` has been confirmed.\n\nOur admin team has been notified and will contact you shortly for payment processing.\n\nThank you for choosing KYCut!",
                            parse_mode='Markdown'
                        )
                    elif response.status == 401:
                        await query.edit_message_text("🔒 Session expired. Please login again with `/login`")
                        if user_id in user_sessions:
                            del user_sessions[user_id]
                    else:
                        await query.edit_message_text("❌ Error confirming order. Please try again.")
        
        except Exception as e:
            logger.error(f"Error confirming order: {e}")
            await query.edit_message_text("❌ Error confirming order. Please try again.")
    
    async def cancel_order(self, query, order_id: str, user_id: int):
        """Handle order cancellation"""
        try:
            session_token = user_sessions[user_id].get('session_token', '')
            headers = {
                'Cookie': f'session={session_token}' if session_token else '',
                'Content-Type': 'application/json'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{API_BASE_URL}/orders/{order_id}/status",
                    json={'status': 'cancelled'},
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        await query.edit_message_text(
                            f"❌ **Order Cancelled**\n\nOrder `{order_id}` has been cancelled.\n\nIf you need assistance, please contact our support team.",
                            parse_mode='Markdown'
                        )
                    elif response.status == 401:
                        await query.edit_message_text("🔒 Session expired. Please login again with `/login`")
                        if user_id in user_sessions:
                            del user_sessions[user_id]
                    else:
                        await query.edit_message_text("❌ Error cancelling order. Please try again.")
        
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            await query.edit_message_text("❌ Error cancelling order. Please try again.")
    
    async def notify_admin_order_confirmed(self, order, user_id: int):
        """Notify admin when order is confirmed"""
        try:
            user_data = user_sessions[user_id].get('user_data', {})
            telegram_user = user_sessions[user_id].get('telegram_user', {})
            
            items_text = ""
            total_amount = 0
            
            for item in order.get('items', []):
                items_text += f"• {item['name']} - ${item['price']:.2f}\n"
                total_amount += item['price']
            
            admin_message = f"""
🔔 **NEW ORDER CONFIRMED**

**Order Details:**
• Order ID: `{order['order_number']}`
• Total: ${total_amount:.2f}
• Status: CONFIRMED ✅

**Items:**
{items_text}

**Customer Information:**
• Name: {order['customer_name']}
• Email: {order['customer_email']}
• Telegram: @{telegram_user.get('username', 'N/A')} (ID: {user_id})
• Phone: {order.get('customer_phone', 'Not provided')}

**Contact Details:**
• Telegram User ID: `{user_id}`
• Account Email: {user_data.get('email', 'N/A')}
            """
            
            await self.application.bot.send_message(
                chat_id=ADMIN_CHAT_ID,
                text=admin_message,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Error notifying admin: {e}")
    
    async def run(self):
        """Start the bot"""
        logger.info("Starting KYCut Telegram Bot...")
        await self.application.initialize()
        await self.application.start()
        await self.application.updater.start_polling()
        
        try:
            await asyncio.Event().wait()
        except KeyboardInterrupt:
            logger.info("Shutting down bot...")
        finally:
            await self.application.updater.stop()
            await self.application.stop()
            await self.application.shutdown()

if __name__ == '__main__':
    if not ADMIN_CHAT_ID:
        logger.error("TELEGRAM_ADMIN_CHAT_ID environment variable is required")
        exit(1)
    
    bot = KYCutBot()
    asyncio.run(bot.run())
