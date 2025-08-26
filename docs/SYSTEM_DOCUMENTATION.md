# KYCut Telegram Bot Integration System

## Overview

This document provides comprehensive documentation for the KYCut Telegram Bot Integration System, including all API endpoints, authentication methods, and usage instructions.

## System Architecture

### Core Components

1. **Web Application** - Next.js 14 with App Router
2. **Database** - PostgreSQL with Drizzle ORM
3. **Authentication** - Session-based + Bot Token system
4. **Telegram Bot** - Python-based bot with persistent sessions
5. **API Layer** - RESTful APIs for bot integration

### Key Features

- ✅ Secure account linking between Telegram and website
- ✅ Persistent bot sessions with auto-refresh
- ✅ Comprehensive order management
- ✅ Real-time status updates
- ✅ Admin management interface
- ✅ Rate limiting and security monitoring
- ✅ Comprehensive logging and analytics

## API Endpoints

### Bot Management APIs

#### `GET /api/bot/info`
**Public endpoint** - Returns bot information and available features
\`\`\`json
{
  "success": true,
  "bot": {
    "username": "KYCutBot",
    "first_name": "KYCut",
    "id": 123456789
  },
  "configuration": {
    "has_bot_token": true,
    "has_webhook_secret": true,
    "features": ["account_linking", "order_management", ...]
  }
}
\`\`\`

#### `GET /api/bot/ping`
**Authentication**: Webhook Secret
**Purpose**: Health check and connectivity test
\`\`\`json
{
  "success": true,
  "message": "Bot connection successful",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "status": "online"
}
\`\`\`

#### `GET /api/bot/status`
**Authentication**: Webhook Secret
**Purpose**: Comprehensive bot status and statistics
\`\`\`json
{
  "success": true,
  "bot": {
    "connected": true,
    "username": "KYCutBot"
  },
  "statistics": {
    "total_telegram_links": 150,
    "active_telegram_links": 120,
    "recent_activity_24h": 45,
    "recent_orders_24h": 12
  }
}
\`\`\`

### Telegram Integration APIs

#### `POST /api/telegram/generate-code`
**Authentication**: Session Cookie
**Purpose**: Generate 8-character linking code (10-minute expiration)
\`\`\`json
{
  "success": true,
  "code": "ABC12345",
  "expiresAt": "2024-01-01T00:10:00.000Z",
  "isNew": true
}
\`\`\`

#### `POST /api/telegram/verify-code`
**Authentication**: Webhook Secret OR Session Cookie
**Purpose**: Verify linking code and create account link
\`\`\`json
{
  "code": "ABC12345",
  "telegramUserId": 123456789,
  "telegramUsername": "user123"
}
\`\`\`

#### `POST /api/telegram/unlink`
**Authentication**: Session Cookie
**Purpose**: Remove Telegram account link
\`\`\`json
{
  "success": true,
  "message": "Telegram account unlinked successfully"
}
\`\`\`

### Order Management APIs

#### `GET /api/orders/telegram?telegram_user_id=123456789`
**Authentication**: Webhook Secret
**Purpose**: Get orders for specific Telegram user
\`\`\`json
{
  "success": true,
  "orders": [
    {
      "id": "ord_abc123",
      "order_number": "ord_abc123",
      "total_amount": 29.99,
      "status": "pending",
      "created_at": "2024-01-01T00:00:00.000Z",
      "items": [...]
    }
  ]
}
\`\`\`

#### `PATCH /api/orders/{id}/status`
**Authentication**: Session Cookie OR Webhook Secret OR Bot Token
**Purpose**: Update order status
\`\`\`json
{
  "status": "confirmed",
  "telegram_user_id": 123456789,
  "updated_via": "telegram_bot",
  "notes": "Confirmed by customer via Telegram"
}
\`\`\`

#### `GET /api/orders/search`
**Authentication**: Session Cookie OR Webhook Secret
**Purpose**: Search orders with filters
**Query Parameters**:
- `q` - Search query
- `status` - Filter by status
- `telegram_user_id` - Filter by Telegram user
- `date_from` / `date_to` - Date range
- `limit` / `offset` - Pagination

#### `GET /api/orders/stats`
**Authentication**: Session Cookie OR Webhook Secret
**Purpose**: Get order statistics
\`\`\`json
{
  "success": true,
  "stats": {
    "total_orders": 25,
    "total_value": 750.50,
    "pending_orders": 3,
    "completed_orders": 20,
    "recent_orders": 5
  }
}
\`\`\`

## Authentication Methods

### 1. Session Cookie Authentication
- Used for web application users
- HttpOnly cookies with secure flags
- 7-day expiration with auto-refresh

### 2. Bot Token Authentication
- Used for Telegram bot API calls
- 30-day expiration with auto-refresh
- Stored as hashed values in database

### 3. Webhook Secret Authentication
- Used for system-to-system communication
- Required for admin operations
- Validates using `X-Webhook-Secret` header

## Database Schema

### Key Tables

#### `users`
- Standard user accounts
- Links to Telegram accounts via `telegram_links`

#### `telegram_links`
- Maps Telegram users to website users
- Stores bot tokens and session data
- Tracks activity and linking method

#### `telegram_linking_codes`
- Temporary 8-character codes
- 10-minute expiration
- One-time use with tracking

#### `orders`
- Order information with Telegram deep links
- Status tracking and history
- Integration with bot notifications

## Bot Features

### Account Linking
1. User generates code on website (`/api/telegram/generate-code`)
2. User sends `/link CODE` to bot
3. Bot verifies code (`/api/telegram/verify-code`)
4. Accounts are linked with bot token issued

### Order Management
- View all orders with `/orders`
- Get specific order details with `/order ORDER_ID`
- Receive real-time status updates
- Order statistics with `/stats`

### Session Persistence
- SQLite local storage with JSON fallback
- Automatic session restoration on bot restart
- Token refresh before expiration

## Security Features

### Rate Limiting
- API endpoints protected with rate limits
- Per-user and per-endpoint restrictions
- Automatic blocking of suspicious activity

### Input Validation
- All inputs sanitized and validated
- SQL injection prevention
- XSS protection

### Audit Logging
- All API calls logged with timestamps
- User activity tracking
- Security event monitoring

## Deployment

### Environment Variables
\`\`\`bash
# Required
TELEGRAM_BOT_TOKEN=your_bot_token
WEBHOOK_SECRET=your_webhook_secret
DATABASE_URL=your_database_url

# Optional
TELEGRAM_ADMIN_ID=your_admin_telegram_id
WEBSITE_URL=https://your-domain.com
SESSION_SECRET=your_session_secret
\`\`\`

### Database Setup
1. Run migration scripts in order:
   - `scripts/create-telegram-linking-codes-table.sql`
   - `scripts/optimize-bot-sessions.sql`
   - `scripts/cleanup-expired-linking-codes.sql`

### Bot Deployment
1. Install Python dependencies: `pip install -r requirements.txt`
2. Configure environment variables
3. Run bot: `python scripts/kycut_telegram_bot_enhanced.py`

## Testing

### Comprehensive Test Suite
Run the complete system test:
\`\`\`bash
node scripts/test-complete-system.js
\`\`\`

Tests include:
- Database connectivity
- API endpoint functionality
- Authentication flows
- Order management
- Telegram integration
- Error handling

### Manual Testing Checklist
- [ ] Account linking works end-to-end
- [ ] Orders display correctly in bot
- [ ] Status updates propagate properly
- [ ] Session persistence works after restart
- [ ] Rate limiting prevents abuse
- [ ] Error handling works gracefully

## Troubleshooting

### Common Issues

#### Bot Not Responding
1. Check bot token validity
2. Verify webhook secret configuration
3. Check API connectivity with `/ping`
4. Review bot logs for errors

#### Authentication Failures
1. Verify session cookies are set
2. Check bot token expiration
3. Validate webhook secret
4. Review rate limiting status

#### Order Sync Issues
1. Check database connectivity
2. Verify API endpoint responses
3. Review order status update logs
4. Test with manual API calls

### Monitoring

#### Key Metrics
- Active Telegram links
- API response times
- Error rates
- Order processing times
- Bot command usage

#### Log Locations
- Bot logs: `kycut_bot.log`
- API logs: Server console/logs
- Database logs: PostgreSQL logs

## Support

For technical support or questions:
1. Check this documentation
2. Review system logs
3. Run diagnostic tests
4. Contact development team

---

**Last Updated**: January 2024
**Version**: 2.0.0
**Status**: Production Ready ✅
