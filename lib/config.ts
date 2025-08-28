/**
 * Application Configuration
 * Centralized configuration management using environment variables
 */

// Use JS proxy that re-exports TS env if present
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { env, isDevelopment, isProduction } from "./env.js"

export const config = {
  // Application
  app: {
    name: "KYCut",
    version: "1.0.0",
    description: "Professional e-commerce platform with Telegram integration",
    url: env.NEXT_PUBLIC_BASE_URL,
    environment: env.NODE_ENV,
  },

  // Database
  database: {
    url: env.DATABASE_URL,
    postgresUrl: env.POSTGRES_URL,
    maxConnections: isProduction ? 20 : 5,
    connectionTimeout: 30000,
  },

  // Authentication
  auth: {
    sessionSecret: env.SESSION_SECRET,
    sessionMaxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    botTokenExpiry: 90 * 24 * 60 * 60 * 1000, // 90 days
    linkCodeExpiry: 10 * 60 * 1000, // 10 minutes
  },

  // Security
  security: {
    webhookSecret: env.WEBHOOK_SECRET,
    bitcoinEncryptionKey: env.BITCOIN_ENCRYPTION_KEY,
    rateLimiting: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: isProduction ? 100 : 1000,
    },
  },

  // Telegram
  telegram: {
    botToken: env.TELEGRAM_BOT_TOKEN,
    adminId: env.TELEGRAM_ADMIN_ID,
    adminChatId: env.TELEGRAM_ADMIN_CHAT_ID,
    webhookSecret: env.TELEGRAM_WEBHOOK_SECRET,
    webhookUrl: `${env.WEBSITE_URL}/api/telegram/webhook`,
  },

  // Redis/KV Storage
  redis: {
    url: env.KV_URL,
    restApiUrl: env.KV_REST_API_URL,
    restApiToken: env.KV_REST_API_TOKEN,
    defaultTtl: 3600, // 1 hour
  },

  // API Configuration
  api: {
    baseUrl: env.NEXT_PUBLIC_BASE_URL,
    timeout: 30000,
    retries: 3,
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      maxRequests: isProduction ? 100 : 1000,
    },
  },

  // Features
  features: {
    debugRoutes: env.ALLOW_DEBUG_ROUTES === "true",
    telegramIntegration: !!env.TELEGRAM_BOT_TOKEN,
    bitcoinPayments: !!env.BITCOIN_ENCRYPTION_KEY,
    analytics: isProduction,
  },

  // Logging
  logging: {
    level: isDevelopment ? "debug" : "info",
    enableConsole: true,
    enableFile: isProduction,
    maxFileSize: "10MB",
    maxFiles: 5,
  },

  // Performance
  performance: {
    cacheMaxAge: isProduction ? 3600 : 0, // 1 hour in production, no cache in dev
    compressionLevel: isProduction ? 6 : 1,
    enableMinification: isProduction,
  },
} as const

// Configuration validation
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Check critical configurations
  if (!config.database.url) {
    errors.push("Database URL is required")
  }

  if (!config.auth.sessionSecret || config.auth.sessionSecret === "dev-session-secret-change-in-production") {
    if (isProduction) {
      errors.push("Session secret must be set in production")
    }
  }

  if (config.features.telegramIntegration && !config.telegram.botToken) {
    errors.push("Telegram bot token is required when Telegram integration is enabled")
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// Export specific configurations for easy access
export const { app, database, auth, security, telegram, redis, api, features, logging, performance } = config

// Helper function to get configuration summary
export function getConfigSummary() {
  return {
    environment: app.environment,
    features: Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
    integrations: {
      database: !!database.url,
      redis: !!redis.url,
      telegram: features.telegramIntegration,
      bitcoin: features.bitcoinPayments,
    },
  }
}

// Log configuration status (only in development)
if (isDevelopment) {
  const validation = validateConfig()
  const summary = getConfigSummary()

  console.log("🔧 Application Configuration:")
  console.log(`   Environment: ${summary.environment}`)
  console.log(`   Features: ${summary.features.join(", ") || "None"}`)
  console.log(
    `   Integrations: ${
      Object.entries(summary.integrations)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(", ") || "None"
    }`,
  )

  if (!validation.valid) {
    console.warn("⚠️  Configuration warnings:")
    validation.errors.forEach((error) => console.warn(`   • ${error}`))
  }
}
