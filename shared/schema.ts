import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Menu Items
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItems.$inferSelect;

// Tables
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  label: text("label").notNull(),
  isActive: boolean("is_active").default(false),
  activatedAt: timestamp("activated_at"),
});

export const insertTableSchema = createInsertSchema(tables).pick({
  number: true,
  label: true,
  isActive: true,
  activatedAt: true,
});

export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  completed: boolean("completed").default(false),
  price: doublePrecision("price").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  tableId: true,
  menuItemId: true,
  timestamp: true,
  completed: true,
  price: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Types for websocket events
export type WebSocketMessage = {
  type: "NEW_ORDER" | "COMPLETE_ORDER" | "ACTIVATE_TABLE" | "DEACTIVATE_TABLE" | "CONNECTED_USERS";
  payload: unknown;
};

export type ConnectedUsersPayload = {
  count: number;
};

export type OrderWithDetails = {
  id: number;
  tableId: number;
  menuItemId: number;
  menuItemName: string;
  timestamp: Date;
  completed: boolean;
  price: number;
  tableNumber: string;
  tableLabel: string;
};

// User schema from the base template
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
