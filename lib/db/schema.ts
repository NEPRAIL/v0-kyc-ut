import {
  pgTable,
  text,
  integer,
  boolean,
  uuid,
  timestamp,
  decimal,
  jsonb,
  bigint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"

// The users table already exists in your database, so we reference it
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
})

export const rarities = pgTable("rarities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
})

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  seasonId: uuid("season_id").references(() => seasons.id),
  rarityId: uuid("rarity_id").references(() => rarities.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const variants = pgTable("variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
})

export const orders = pgTable("orders", {
  id: text("id").primaryKey(), // e.g. ord_<hex>
  userId: text("user_id").notNull(), // fk to users.id (text)
  items: jsonb("items").notNull(), // [{productId, qty, price_cents}]
  totalCents: integer("total_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("pending"), // pending|sent|paid|failed|cancelled
  tgDeeplink: text("tg_deeplink"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const telegramLinks = pgTable(
  "telegram_links",
  {
    telegramUserId: bigint("telegram_user_id", { mode: "number" }).primaryKey(), // Telegram ID fits in bigint
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    telegramUsername: text("telegram_username"),
    linkedVia: text("linked_via").notNull().default("code"), // "code" | "login" | "admin"
    isRevoked: boolean("is_revoked").notNull().default(false),

    // bot-session (store HASH, not raw token!)
    botTokenHash: text("bot_token_hash"), // sha256 hex of opaque token
    botTokenExpiresAt: timestamp("bot_token_expires_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    byUser: uniqueIndex("telegram_links_user_unique").on(t.userId),
    byTgId: uniqueIndex("telegram_links_tgid_unique").on(t.telegramUserId),
    byToken: index("telegram_links_token_idx").on(t.botTokenHash),
  }),
)

export const telegramLinkingCodes = pgTable("telegram_linking_codes", {
  code: text("code").primaryKey(), // 8-character alphanumeric code
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
})

export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id),
  variantId: uuid("variant_id").references(() => variants.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
})

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1),
  createdAt: timestamp("created_at").defaultNow(),
})

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: text("order_id").references(() => orders.id),
  kind: text("kind").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  keyHash: text("key_hash").notNull(),
  scopes: text("scopes").array().notNull().default(["read:orders"]),
  name: text("name"),
  lastFour: text("last_four"),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
})

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const rateLimits = pgTable("rate_limits", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  count: integer("count").default(0),
  resetTime: timestamp("reset_time").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const orderStatuses = ["pending", "sent", "paid", "failed", "cancelled"] as const
export type OrderStatus = (typeof orderStatuses)[number]

export const userRoles = ["user", "admin"] as const
export type UserRole = (typeof userRoles)[number]

export const rarityTypes = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"] as const
export type RarityType = (typeof rarityTypes)[number]

export const securityEventTypes = [
  "login_success",
  "login_failed",
  "signup",
  "password_reset_requested",
  "password_reset_completed",
  "api_key_created",
  "api_key_revoked",
  "suspicious_activity",
] as const
export type SecurityEventType = (typeof securityEventTypes)[number]
