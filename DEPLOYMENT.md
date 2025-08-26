# KYCut Deployment Guide

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all required environment variables are set in your production environment:

#### Database
- `DATABASE_URL` - PostgreSQL connection string
- `POSTGRES_URL` - Primary database URL
- `POSTGRES_PRISMA_URL` - Prisma-specific URL

#### Authentication & Security
- `SESSION_SECRET` - 32+ character secret for session signing
- `WEBHOOK_SECRET` - Secret for webhook authentication
- `BITCOIN_ENCRYPTION_KEY` - Key for Bitcoin wallet encryption

#### Telegram Integration
- `TELEGRAM_BOT_TOKEN` - Bot token from @BotFather
- `TELEGRAM_ADMIN_ID` - Admin user ID for notifications
- `TELEGRAM_ADMIN_CHAT_ID` - Admin chat ID for notifications
- `TELEGRAM_WEBHOOK_SECRET` - Webhook validation secret

#### Application
- `NEXT_PUBLIC_BASE_URL` - Your production domain
- `SITE_URL` - Same as base URL
- `WEBSITE_URL` - Same as base URL

### 2. Database Setup

#### Run Migrations
\`\`\`bash
# Apply database schema
npm run db:push

# Seed initial data (if needed)
npm run db:seed
\`\`\`

#### Verify Tables
Ensure these tables exist:
- `users`
- `orders`
- `telegramLinks`
- `telegramLinkingCodes`
- `sessions`
- `products`
- `variants`
- `listings`

### 3. Telegram Bot Setup

#### Configure Webhook
\`\`\`bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "YOUR_WEBHOOK_SECRET"
  }'
\`\`\`

#### Test Bot Commands
- `/start` - Bot introduction
- `/help` - Command list
- `/link CODE` - Account linking
- `/orders` - Order management
- `/status` - Account status

### 4. Security Configuration

#### HTTPS Setup
- Ensure SSL certificate is properly configured
- Redirect HTTP to HTTPS
- Set secure cookie flags in production

#### CORS Configuration
- Configure allowed origins
- Set proper headers for API endpoints

#### Rate Limiting
- Implement rate limiting for API endpoints
- Configure Redis for rate limit storage

### 5. Performance Optimization

#### Caching
- Enable Next.js static generation where possible
- Configure CDN for static assets
- Set proper cache headers

#### Database
- Ensure proper indexes are created
- Configure connection pooling
- Monitor query performance

### 6. Monitoring & Logging

#### Health Checks
- `/api/health` - Application health
- `/api/bot/status` - Bot connectivity
- Database connectivity check

#### Error Tracking
- Configure error reporting service
- Set up log aggregation
- Monitor API response times

## Deployment Steps

### 1. Pre-Deployment Testing
\`\`\`bash
# Run production test suite
npm run test:production

# Check environment variables
npm run check:env

# Verify database connectivity
npm run check:db
\`\`\`

### 2. Build & Deploy
\`\`\`bash
# Build for production
npm run build

# Start production server
npm start
\`\`\`

### 3. Post-Deployment Verification

#### Functional Tests
- [ ] User registration works
- [ ] Login/logout functions properly
- [ ] Order creation and management
- [ ] Telegram bot responds to commands
- [ ] Account linking via Telegram works
- [ ] Payment flow completes successfully

#### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] No memory leaks

#### Security Tests
- [ ] HTTPS enforced
- [ ] Session security working
- [ ] API authentication required
- [ ] Rate limiting active
- [ ] Input validation working

## Troubleshooting

### Common Issues

#### Database Connection Errors
- Verify DATABASE_URL format
- Check network connectivity
- Ensure database server is running
- Verify credentials and permissions

#### Telegram Bot Not Responding
- Check TELEGRAM_BOT_TOKEN validity
- Verify webhook URL is accessible
- Ensure webhook secret matches
- Check bot permissions

#### Session Issues
- Verify SESSION_SECRET is set
- Check cookie configuration
- Ensure HTTPS in production
- Verify session storage

#### Order Processing Errors
- Check payment integration
- Verify order status updates
- Ensure notification delivery
- Check database constraints

### Monitoring Commands
\`\`\`bash
# Check application logs
pm2 logs kycut

# Monitor system resources
htop

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Test Telegram webhook
curl -X POST "https://your-domain.com/api/telegram/webhook" \
  -H "X-Webhook-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"message": {"text": "/status"}}'
\`\`\`

## Rollback Plan

### Quick Rollback
1. Revert to previous deployment
2. Restore database backup if needed
3. Update DNS if necessary
4. Verify functionality

### Database Rollback
\`\`\`bash
# Restore from backup
pg_restore -d $DATABASE_URL backup.sql

# Run migration rollback if needed
npm run db:rollback
\`\`\`

## Support & Maintenance

### Regular Tasks
- Monitor error rates and performance
- Update dependencies monthly
- Backup database daily
- Review security logs weekly
- Test disaster recovery quarterly

### Emergency Contacts
- Development Team: [contact info]
- Infrastructure Team: [contact info]
- Database Admin: [contact info]

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Environment:** Production
