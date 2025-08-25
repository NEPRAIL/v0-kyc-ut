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
from datetime import datetime
from typing import Dict, Optional, Any, List
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
        """Show main navigation menu"""
        user_id = update.effective_user.id
        is_linked = self.is_authenticated(user_id)
        
        if is_linked:
            user_data = user_sessions[user_id].get('user_data', {})
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
        
        keyboard = []
        
        if is_linked:
            keyboard.extend([
                [InlineKeyboardButton("📋 My Orders", callback_data="menu_orders")],
                [InlineKeyboardButton("📊 Order Stats", callback_data="menu_stats"),
                 InlineKeyboardButton("⚙️ Account", callback_data="menu_account")],
                [InlineKeyboardButton("ℹ️ Help", callback_data="menu_help"),
                 InlineKeyboardButton("🔧 Settings", callback_data="menu_settings")]
            ])
        else:
            keyboard.extend([
                [InlineKeyboardButton("🔗 Link Account", callback_data="menu_link")],
                [InlineKeyboardButton("🔐 Login", callback_data="menu_login")],
                [InlineKeyboardButton("ℹ️ Help", callback_data="menu_help")]
            ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            menu_text,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )
    
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
        
        # Verify linking code with website
        result = await self.verify_linking_code(code, user_id, telegram_username)
        
        if result['success']:
            # Store session info
            user_sessions[user_id] = {
                'state': 'linked',
                'authenticated': True,
                'linked_via': 'code',
                'user_data': {
                    'name': telegram_username or f"User{user_id}",
                    'telegram_username': telegram_username,
                    'telegram_user_id': user_id
                }
            }
            
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
        """Handle /orders command - show all orders with pagination"""
        user_id = update.effective_user.id
        
        if not self.is_authenticated(user_id):
            await update.message.reply_text(
                "❌ **Authentication Required**\n\n"
                "Please link your account first:\n"
                "• Use `/link CODE` with your 8-digit code\n"
                "• Or use `/login` with your credentials\n\n"
                "Get your linking code from the website account page.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        
        # Fetch all orders
        orders_result = await self.fetch_all_orders(user_id)
        
        if not orders_result['success']:
            await update.message.reply_text(
                f"❌ **Failed to Load Orders**\n\n"
                f"Error: {orders_result.get('error', 'Unknown error')}\n\n"
                f"Please try again or contact support.",
                parse_mode=ParseMode.MARKDOWN
            )
            return
        
        orders = orders_result['orders']
        
        if not orders:
            keyboard = [
                [InlineKeyboardButton("🛒 Start Shopping", url=WEBSITE_URL)],
                [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await update.message.reply_text(
                "📋 **No Orders Found**\n\n"
                "You don't have any orders yet.\n\n"
                "Ready to start shopping? Visit the website to browse our products!",
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
            return
        
        # Show orders with pagination
        await self.show_orders_list(update, orders, page=0)
    
    async def show_orders_list(self, update: Update, orders: List[Dict], page: int = 0):
        """Show paginated list of orders"""
        orders_per_page = 5
        total_orders = len(orders)
        total_pages = (total_orders + orders_per_page - 1) // orders_per_page
        
        start_idx = page * orders_per_page
        end_idx = min(start_idx + orders_per_page, total_orders)
        page_orders = orders[start_idx:end_idx]
        
        # Calculate stats
        total_spent = sum(float(order.get('total_amount', 0)) for order in orders)
        pending_count = len([o for o in orders if o.get('status') == 'pending'])
        completed_count = len([o for o in orders if o.get('status') in ['delivered', 'completed']])
        
        orders_text = f"""
📋 **Your Orders** (Page {page + 1}/{total_pages})

**📊 Quick Stats:**
• Total Orders: {total_orders}
• Total Spent: ${total_spent:.2f}
• Pending: {pending_count} | Completed: {completed_count}

**📦 Recent Orders:**
"""
        
        # Add order items
        for i, order in enumerate(page_orders, start_idx + 1):
            order_id = order.get('order_number', order.get('id', 'Unknown'))
            status = order.get('status', 'pending').upper()
            total = float(order.get('total_amount', 0))
            date = order.get('created_at', '')
            
            # Format date
            if date:
                try:
                    date_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
                    date_str = date_obj.strftime('%m/%d/%Y')
                except:
                    date_str = 'Unknown'
            else:
                date_str = 'Unknown'
            
            status_emoji = {
                'PENDING': '⏳',
                'CONFIRMED': '✅',
                'PROCESSING': '🔄',
                'SHIPPED': '🚚',
                'DELIVERED': '📦',
                'CANCELLED': '❌'
            }.get(status, '❓')
            
            orders_text += f"\n{i}. **{order_id}** {status_emoji}\n"
            orders_text += f"   ${total:.2f} • {date_str} • {status}\n"
        
        # Create navigation keyboard
        keyboard = []
        
        # Order action buttons
        if page_orders:
            order_buttons = []
            for order in page_orders[:3]:  # Show max 3 order buttons
                order_id = order.get('order_number', order.get('id', 'Unknown'))
                order_buttons.append(
                    InlineKeyboardButton(f"📋 {order_id[:8]}", callback_data=f"order_view_{order_id}")
                )
            
            # Split into rows of 2
            for i in range(0, len(order_buttons), 2):
                keyboard.append(order_buttons[i:i+2])
        
        # Pagination buttons
        nav_buttons = []
        if page > 0:
            nav_buttons.append(InlineKeyboardButton("⬅️ Previous", callback_data=f"orders_page_{page-1}"))
        if page < total_pages - 1:
            nav_buttons.append(InlineKeyboardButton("Next ➡️", callback_data=f"orders_page_{page+1}"))
        
        if nav_buttons:
            keyboard.append(nav_buttons)
        
        # Filter and menu buttons
        keyboard.extend([
            [InlineKeyboardButton("🔍 Filter Orders", callback_data="orders_filter"),
             InlineKeyboardButton("📊 Statistics", callback_data="menu_stats")],
            [InlineKeyboardButton("🏠 Main Menu", callback_data="menu_main")]
        ])
        
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        if hasattr(update, 'callback_query') and update.callback_query:
            await update.callback_query.edit_message_text(
                orders_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
            )
        else:
            await update.message.reply_text(
                orders_text,
                parse_mode=ParseMode.MARKDOWN,
                reply_markup=reply_markup
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
        """Check if user is authenticated"""
        return (user_id in user_sessions and 
                user_sessions[user_id].get('authenticated', False))
    
    async def authenticate_user(self, username: str, password: str) -> Dict[str, Any]:
        """Authenticate user with website API"""
        try:
            url = urljoin(WEBSITE_URL, '/api/auth/login')
            
            payload = {
                'emailOrUsername': username,
                'password': password
            }
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': WEBHOOK_SECRET,
                'User-Agent': 'KYCut-Bot/1.0'
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                # The API now returns { success: true } with httpOnly cookies
                if data.get('success'):
                    # Extract session cookie from response
                    session_cookie = None
                    for cookie in response.cookies:
                        if cookie.name == 'session':
                            session_cookie = cookie.value
                            break
                    
                    return {
                        'success': True,
                        'user_data': {
                            'name': username,  # Use username as fallback since API doesn't return user data
                            'email': username if '@' in username else None,
                            'username': username if '@' not in username else None
                        },
                        'session_token': session_cookie
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
    
    async def verify_linking_code(self, code: str, telegram_user_id: int, telegram_username: str) -> Dict[str, Any]:
        """Verify linking code with website API"""
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
                return {
                    'success': True,
                    'message': data.get('message', 'Account linked successfully!')
                }
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('error', 'Invalid or expired code')
                except:
                    error_msg = f'Verification failed (HTTP {response.status_code})'
                
                return {
                    'success': False,
                    'error': error_msg
                }
                
        except requests.RequestException as e:
            logger.error(f"Linking code verification failed: {e}")
            return {
                'success': False,
                'error': f"Connection error: {str(e)}"
            }
    
    async def fetch_all_orders(self, user_id: int) -> Dict[str, Any]:
        """Fetch all orders for authenticated user"""
        try:
            # For linked users, we need to make API calls differently
            session_token = user_sessions[user_id].get('session_token')
            
            if session_token:
                # User authenticated via login
                url = urljoin(WEBSITE_URL, '/api/orders/user')
                headers = {
                    'Cookie': f'session={session_token}',
                    'X-Webhook-Secret': WEBHOOK_SECRET,
                    'User-Agent': 'KYCut-Bot/2.0'
                }
            else:
                # User linked via code - use Telegram user ID
                url = urljoin(WEBSITE_URL, '/api/orders/telegram')
                headers = {
                    'Content-Type': 'application/json',
                    'X-Webhook-Secret': WEBHOOK_SECRET,
                    'User-Agent': 'KYCut-Bot/2.0'
                }
                # Add telegram user ID to request
                url += f'?telegram_user_id={user_id}'
            
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'orders': data.get('orders', [])
                }
            elif response.status_code == 401:
                return {
                    'success': False,
                    'error': 'Session expired. Please link your account again.'
                }
            else:
                return {
                    'success': False,
                    'error': f"Failed to fetch orders (HTTP {response.status_code})"
                }
                
        except requests.RequestException as e:
            logger.error(f"Fetch orders request failed: {e}")
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
