import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Contract conversion history
export const conversions = pgTable("conversions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  solidityCode: text("solidity_code").notNull(),
  rustCode: text("rust_code").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertConversionSchema = createInsertSchema(conversions).pick({
  userId: true,
  solidityCode: true,
  rustCode: true,
});

// Deployed contracts
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  conversionId: integer("conversion_id").references(() => conversions.id),
  contractAddress: text("contract_address").notNull(),
  chainId: integer("chain_id").notNull(),
  transactionHash: text("transaction_hash").notNull(),
  contractName: text("contract_name").notNull(),
  constructorArgs: jsonb("constructor_args"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertDeploymentSchema = createInsertSchema(deployments).pick({
  userId: true,
  conversionId: true,
  contractAddress: true,
  chainId: true,
  transactionHash: true,
  contractName: true,
  constructorArgs: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;
