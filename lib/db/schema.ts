import { pgTable, text, integer, boolean, uuid, timestamp, decimal, jsonb } from "drizzle-orm/pg-core"

// The users table already exists in your database, so we reference it
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  name: text("name"),
  role: text("role").default("user"),
  emailVerified: boolean("email_verified").default(false),
  totpSecret: text("totp_secret"),
  telegramUserId: text("telegram_user_id"),
  telegramUsername: text("telegram_username"),
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

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => users.id),
  listingId: uuid("listing_id").references(() => listings.id),
  quantity: integer("quantity").default(1),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => orders.id),
  kind: text("kind").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
})

// User roles and order status enums
export const userRoles = ["user", "admin"] as const
export type UserRole = (typeof userRoles)[number]

export const orderStatuses = ["pending", "paid", "confirmed", "cancelled"] as const
export type OrderStatus = (typeof orderStatuses)[number]

export const rarityTypes = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Mythic"] as const
export type RarityType = (typeof rarityTypes)[number]
