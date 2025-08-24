import os
import json
import time
import hashlib
from datetime import datetime
import urllib.request
import urllib.parse
import urllib.error

# Configuration
BOT_TOKEN = '8329366425:AAHmg3HBRZ0X09qICDYDrw3FjXIzZaFSAA8'
ADMIN_CHAT_ID = os.getenv('TELEGRAM_ADMIN_ID', 'YOUR_TELEGRAM_USER_ID')  # Get from @userinfobot
API_BASE_URL = os.getenv('WEBSITE_URL', 'https://your-domain.com') + '/api'
WEBHOOK_SECRET = os.getenv('TELEGRAM_WEBHOOK_SECRET', 'your_random_webhook_secret_here')

# Simple user sessions storage
user_sessions = {}

class SimpleTelegramBot:
    def __init__(self):
        self.base_url = f"https://api.telegram.org/bot{BOT_TOKEN}"
        print(f"Bot initialized. Admin Chat ID: {ADMIN_CHAT_ID}")
    
    def send_message(self, chat_id, text, reply_markup=None):
        """Send a message to a chat"""
        url = f"{self.base_url}/sendMessage"
        data = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': 'Markdown'
        }
        if reply_markup:
            data['reply_markup'] = json.dumps(reply_markup)
        
        return self.make_request(url, data)
    
    def make_request(self, url, data):
        """Make HTTP request to Telegram API"""
        try:
            data_encoded = urllib.parse.urlencode(data).encode('utf-8')
            req = urllib.request.Request(url, data=data_encoded, method='POST')
            req.add_header('Content-Type', 'application/x-www-form-urlencoded')
            
            with urllib.request.urlopen(req) as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"Request error: {e}")
            return None
    
    def get_updates(self, offset=None):
        """Get updates from Telegram"""
        url = f"{self.base_url}/getUpdates"
        params = {'timeout': 30}
        if offset:
            params['offset'] = offset
        
        query_string = urllib.parse.urlencode(params)
        try:
            with urllib.request.urlopen(f"{url}?{query_string}") as response:
                return json.loads(response.read().decode('utf-8'))
        except Exception as e:
            print(f"Error getting updates: {e}")
            return None
    
    def handle_message(self, message):
        """Handle incoming messages"""
        chat_id = message['chat']['id']
        user_id = message['from']['id']
        text = message.get('text', '')
        
        print(f"Message from {user_id}: {text}")
        
        if text.startswith('/start'):
            self.handle_start(chat_id)
        elif text.startswith('/login'):
            self.handle_login(chat_id, user_id)
        elif text.startswith('/order'):
            parts = text.split(' ')
            if len(parts) > 1:
                order_id = parts[1].upper()
                self.handle_order(chat_id, user_id, order_id)
            else:
                self.send_message(chat_id, "📋 Please provide an order ID: `/order ORDER123`")
        elif text.startswith('/help'):
            self.handle_help(chat_id)
        else:
            # Handle login flow
            if user_id in user_sessions:
                self.handle_login_flow(chat_id, user_id, text)
            else:
                self.send_message(chat_id, "I don't understand. Use `/help` to see available commands.")
    
    def handle_start(self, chat_id):
        """Handle /start command"""
        welcome_text = """🔐 **Welcome to KYCut Bot!**

I help you manage your KYC account orders securely.

**Available Commands:**
• `/login` - Sign in with your KYCut credentials
• `/order <order_id>` - View and confirm your order
• `/help` - Show this help message

To get started, please login with your KYCut account credentials using `/login`"""
        
        self.send_message(chat_id, welcome_text)
    
    def handle_login(self, chat_id, user_id):
        """Handle /login command"""
        if user_id in user_sessions and user_sessions[user_id].get('authenticated'):
            self.send_message(chat_id, "✅ You are already logged in!")
            return
        
        user_sessions[user_id] = {
            'state': 'awaiting_email',
            'authenticated': False,
            'chat_id': chat_id
        }
        
        self.send_message(chat_id, "🔐 **Login to KYCut**\n\nPlease enter your email address:")
    
    def handle_login_flow(self, chat_id, user_id, text):
        """Handle login flow messages"""
        session = user_sessions.get(user_id, {})
        state = session.get('state')
        
        if state == 'awaiting_email':
            if '@' not in text or '.' not in text:
                self.send_message(chat_id, "❌ Please enter a valid email address.")
                return
            
            user_sessions[user_id]['email'] = text
            user_sessions[user_id]['state'] = 'awaiting_password'
            self.send_message(chat_id, f"📧 Email: `{text}`\n\nNow please enter your password:")
        
        elif state == 'awaiting_password':
            email = session.get('email')
            # Simulate authentication (replace with actual API call)
            if self.authenticate_user(email, text):
                user_sessions[user_id].update({
                    'authenticated': True,
                    'state': 'authenticated'
                })
                self.send_message(chat_id, f"✅ **Login Successful!**\n\nWelcome back!\n\nYou can now use `/order <order_id>` to view your orders.")
            else:
                del user_sessions[user_id]
                self.send_message(chat_id, "❌ **Login failed.**\n\nPlease try again with `/login`")
    
    def authenticate_user(self, email, password):
        """Authenticate user (simplified version)"""
        # This is a simplified version - in production, make actual API call
        try:
            # Make request to your API
            data = json.dumps({'email': email, 'password': password}).encode('utf-8')
            req = urllib.request.Request(f"{API_BASE_URL}/auth/login", data=data)
            req.add_header('Content-Type', 'application/json')
            
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    return True
        except:
            pass
        return False
    
    def handle_order(self, chat_id, user_id, order_id):
        """Handle /order command"""
        if user_id not in user_sessions or not user_sessions[user_id].get('authenticated'):
            self.send_message(chat_id, "🔒 Please login first using `/login` command.")
            return
        
        # Get order details (simplified)
        order = self.get_order_details(order_id)
        if not order:
            self.send_message(chat_id, f"❌ Order `{order_id}` not found.\n\nPlease check your order ID and try again.")
            return
        
        # Format order details
        order_text = self.format_order_details(order)
        
        # Create inline keyboard for confirmation
        keyboard = {
            'inline_keyboard': [
                [
                    {'text': '✅ Confirm Order', 'callback_data': f'confirm_{order_id}'},
                    {'text': '❌ Cancel Order', 'callback_data': f'cancel_{order_id}'}
                ]
            ]
        }
        
        self.send_message(chat_id, order_text, keyboard)
    
    def get_order_details(self, order_id):
        """Get order details from API"""
        try:
            req = urllib.request.Request(f"{API_BASE_URL}/orders/{order_id}")
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    return json.loads(response.read().decode('utf-8'))
        except:
            pass
        return None
    
    def format_order_details(self, order):
        """Format order details for display"""
        items_text = ""
        total_amount = 0
        
        for item in order.get('items', []):
            items_text += f"• {item['name']} - ${item['price']:.2f}\n"
            total_amount += item['price']
        
        return f"""📋 **Order Details**

**Order ID:** `{order['order_number']}`
**Status:** {order['status'].title()}
**Date:** {order['created_at'][:10]}

**Items:**
{items_text}**Total:** ${total_amount:.2f}

**Customer Info:**
• Name: {order['customer_name']}
• Email: {order['customer_email']}

Please review your order and confirm if everything is correct."""
    
    def handle_help(self, chat_id):
        """Handle /help command"""
        help_text = """🤖 **KYCut Bot Help**

**Commands:**
• `/start` - Welcome message and setup
• `/login` - Sign in with your KYCut credentials
• `/order <order_id>` - View and confirm your order
• `/help` - Show this help message

**How to use:**
1. Login with your KYCut account credentials
2. Use your order ID to view order details
3. Confirm your order to proceed with payment
4. Our admin will contact you for payment processing"""
        
        self.send_message(chat_id, help_text)
    
    def handle_callback_query(self, callback_query):
        """Handle button callbacks"""
        user_id = callback_query['from']['id']
        chat_id = callback_query['message']['chat']['id']
        data = callback_query['data']
        
        if user_id not in user_sessions or not user_sessions[user_id].get('authenticated'):
            return
        
        if data.startswith('confirm_'):
            order_id = data.replace('confirm_', '')
            self.confirm_order(chat_id, user_id, order_id)
        elif data.startswith('cancel_'):
            order_id = data.replace('cancel_', '')
            self.cancel_order(chat_id, user_id, order_id)
    
    def confirm_order(self, chat_id, user_id, order_id):
        """Confirm an order"""
        # Update order status
        self.update_order_status(order_id, 'confirmed')
        
        # Get order details for admin notification
        order = self.get_order_details(order_id)
        if order:
            self.notify_admin_order_confirmed(order, user_id)
        
        self.send_message(chat_id, f"✅ **Order Confirmed!**\n\nOrder `{order_id}` has been confirmed.\n\nOur admin team has been notified and will contact you shortly for payment processing.\n\nThank you for choosing KYCut!")
    
    def cancel_order(self, chat_id, user_id, order_id):
        """Cancel an order"""
        self.update_order_status(order_id, 'cancelled')
        self.send_message(chat_id, f"❌ **Order Cancelled**\n\nOrder `{order_id}` has been cancelled.")
    
    def update_order_status(self, order_id, status):
        """Update order status via API"""
        try:
            data = json.dumps({'status': status}).encode('utf-8')
            req = urllib.request.Request(f"{API_BASE_URL}/orders/{order_id}/status", data=data)
            req.add_header('Content-Type', 'application/json')
            req.get_method = lambda: 'PATCH'
            
            with urllib.request.urlopen(req) as response:
                return response.status == 200
        except:
            return False
    
    def notify_admin_order_confirmed(self, order, user_id):
        """Notify admin when order is confirmed"""
        items_text = ""
        total_amount = 0
        
        for item in order.get('items', []):
            items_text += f"• {item['name']} - ${item['price']:.2f}\n"
            total_amount += item['price']
        
        admin_message = f"""🔔 **NEW ORDER CONFIRMED**

**Order Details:**
• Order ID: `{order['order_number']}`
• Total: ${total_amount:.2f}
• Status: CONFIRMED ✅

**Items:**
{items_text}

**Customer Information:**
• Name: {order['customer_name']}
• Email: {order['customer_email']}
• Telegram User ID: `{user_id}`

Please process this order and contact the customer for payment."""
        
        self.send_message(ADMIN_CHAT_ID, admin_message)
    
    def run(self):
        """Run the bot with polling"""
        print("Starting KYCut Telegram Bot (Simple Version)...")
        print(f"Admin will receive notifications at chat ID: {ADMIN_CHAT_ID}")
        
        offset = None
        while True:
            try:
                updates = self.get_updates(offset)
                if updates and updates.get('ok'):
                    for update in updates['result']:
                        offset = update['update_id'] + 1
                        
                        if 'message' in update:
                            self.handle_message(update['message'])
                        elif 'callback_query' in update:
                            self.handle_callback_query(update['callback_query'])
                
                time.sleep(1)
            except KeyboardInterrupt:
                print("Bot stopped by user")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(5)

if __name__ == '__main__':
    if ADMIN_CHAT_ID == 'YOUR_TELEGRAM_USER_ID':
        print("ERROR: Please set your Telegram User ID in TELEGRAM_ADMIN_ID environment variable")
        print("Get your ID from @userinfobot on Telegram")
        exit(1)
    
    bot = SimpleTelegramBot()
    bot.run()
