import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const telegramUsers = sqliteTable("telegram_users", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  points: integer("points").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const telegramPayments = sqliteTable("telegram_payments", {
  chargeId: text("charge_id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull(),
  points: integer("points").notNull(),
  currency: text("currency").notNull(),
  createdAt: text("created_at").notNull(),
});
