import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums for better type safety and MongoDB-like flexibility
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'pro', 'enterprise']);
export const fileStatusEnum = pgEnum('file_status', ['pending', 'processing', 'completed', 'failed', 'deleted']);
export const toolTypeEnum = pgEnum('tool_type', [
  'pdf_to_word', 'word_to_pdf', 'pdf_merge', 'pdf_compress', 'pdf_split', 'pdf_lock', 'pdf_unlock',
  'pdf_to_image', 'pdf_watermark', 'pdf_rotate', 'image_to_pdf', 'pdf_to_excel', 'pdf_page_delete', 'esign',
  'image_compress', 'image_resize', 'image_convert', 'bg_remove', 'image_crop', 'image_filter', 'image_watermark', 'collage_maker',
  'csv_to_excel', 'excel_clean', 'json_format', 'text_to_csv', 'excel_to_csv', 'xml_to_json', 'qr_generator',
  'ai_chat', 'ai_summary', 'ai_invoice', 'ai_resume', 'ai_legal', 'ai_data_clean', 'voice_to_doc',
  'ai_translation', 'ai_grammar', 'ai_ocr', 'ai_writing', 'ai_email_extractor'
]);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - designed for MongoDB migration compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('user').notNull(),
  subscriptionTier: subscriptionTierEnum("subscription_tier").default('free').notNull(),
  aiCreditsUsedToday: integer("ai_credits_used_today").default(0).notNull(),
  aiCreditsUsedMonth: integer("ai_credits_used_month").default(0).notNull(),
  totalFilesProcessed: integer("total_files_processed").default(0).notNull(),
  totalStorageUsed: integer("total_storage_used").default(0).notNull(), // in bytes
  lastCreditReset: timestamp("last_credit_reset").defaultNow(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Files table - tracks all uploaded and processed files
export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  originalName: varchar("original_name").notNull(),
  storagePath: varchar("storage_path").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  toolUsed: toolTypeEnum("tool_used"),
  status: fileStatusEnum("status").default('pending').notNull(),
  outputPath: varchar("output_path"),
  outputName: varchar("output_name"),
  encryptionKey: varchar("encryption_key"), // For AES-256 encryption
  expiresAt: timestamp("expires_at").notNull(), // Auto-deletion time
  metadata: jsonb("metadata"), // Flexible field for tool-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_files_user").on(table.userId),
  index("IDX_files_expires").on(table.expiresAt),
  index("IDX_files_status").on(table.status),
]);

// AI Usage Logs - tracks all AI operations for billing and analytics
export const aiUsageLogs = pgTable("ai_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  toolType: toolTypeEnum("tool_type").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  processingTimeMs: integer("processing_time_ms"),
  success: boolean("success").default(true).notNull(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Store request/response details
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ai_logs_user").on(table.userId),
  index("IDX_ai_logs_created").on(table.createdAt),
]);

// Subscriptions table - tracks subscription history
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tier: subscriptionTierEnum("tier").notNull(),
  status: varchar("status").notNull().default('active'), // active, cancelled, past_due
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  currency: varchar("currency").default('usd'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_subscriptions_user").on(table.userId),
]);

// Rate limiting table - for abuse protection
export const rateLimits = pgTable("rate_limits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: varchar("endpoint").notNull(),
  requestCount: integer("request_count").default(0).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_rate_limits_user_endpoint").on(table.userId, table.endpoint),
]);

// Audit logs for admin panel
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  action: varchar("action").notNull(),
  resourceType: varchar("resource_type").notNull(),
  resourceId: varchar("resource_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_audit_logs_user").on(table.userId),
  index("IDX_audit_logs_created").on(table.createdAt),
]);

// Relations for Drizzle ORM
export const usersRelations = relations(users, ({ many }) => ({
  files: many(files),
  aiUsageLogs: many(aiUsageLogs),
  subscriptions: many(subscriptions),
  rateLimits: many(rateLimits),
  auditLogs: many(auditLogs),
}));

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

export const aiUsageLogsRelations = relations(aiUsageLogs, ({ one }) => ({
  user: one(users, {
    fields: [aiUsageLogs.userId],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Insert schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAiUsageLogSchema = createInsertSchema(aiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type AiUsageLog = typeof aiUsageLogs.$inferSelect;
export type InsertAiUsageLog = z.infer<typeof insertAiUsageLogSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type RateLimit = typeof rateLimits.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;

// Credit limits per tier
export const CREDIT_LIMITS = {
  free: { daily: 25, monthly: 50 },
  pro: { daily: 100, monthly: 500 },
  enterprise: { daily: -1, monthly: -1 }, // -1 = unlimited
} as const;

// Tool credit costs
export const TOOL_CREDITS = {
  ai_chat: 2,
  ai_summary: 1,
  ai_invoice: 2,
  ai_resume: 3,
  ai_legal: 3,
  ai_data_clean: 2,
  voice_to_doc: 2,
  ai_translation: 2,
  ai_grammar: 1,
  ai_ocr: 2,
  ai_writing: 2,
  ai_email_extractor: 1,
  // Non-AI tools are free
  pdf_to_word: 0,
  word_to_pdf: 0,
  pdf_merge: 0,
  pdf_compress: 0,
  pdf_split: 0,
  pdf_lock: 0,
  pdf_unlock: 0,
  pdf_to_image: 0,
  pdf_watermark: 0,
  pdf_rotate: 0,
  image_to_pdf: 0,
  pdf_to_excel: 0,
  pdf_page_delete: 0,
  esign: 0,
  image_compress: 0,
  image_resize: 0,
  image_convert: 0,
  bg_remove: 0,
  image_crop: 0,
  image_filter: 0,
  image_watermark: 0,
  collage_maker: 0,
  csv_to_excel: 0,
  excel_clean: 0,
  json_format: 0,
  text_to_csv: 0,
  excel_to_csv: 0,
  xml_to_json: 0,
  qr_generator: 0,
} as const;
