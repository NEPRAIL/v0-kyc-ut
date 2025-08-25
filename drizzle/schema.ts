import { pgTable, text, varchar, timestamp, boolean, numeric, jsonb, bigint, uuid } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: text("id").primaryKey(), // existing text id
  username: varchar("username", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).nullable(), // Telegram numeric id
  telegramUsername: varchar("telegram_username", { length: 64 }).nullable(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const linkingCodes = pgTable("linking_codes", {
  code: varchar("code", { length: 8 }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
})

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  orderNumber: varchar("order_number", { length: 32 }).notNull().unique(),
  totalAmount: numeric("total_amount").default("0").notNull(),
  status: varchar("status", { length: 24 }).default("pending").notNull(),
  items: jsonb("items")
    .$type<Array<{ product_name: string; quantity: number; product_price: number }>>()
    .default([])
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
