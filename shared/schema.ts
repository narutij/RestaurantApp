import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Menus
export const menus = pgTable("menus", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuSchema = createInsertSchema(menus).pick({
  name: true,
  restaurantId: true,
});

export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type Menu = typeof menus.$inferSelect;

// Menu Categories
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  menuId: integer("menu_id").notNull(),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).pick({
  name: true,
  menuId: true,
  order: true,
});

export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;

// Menu Items
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: doublePrecision("price").notNull(),
  categoryId: integer("category_id"),
  description: text("description"),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).pick({
  name: true,
  price: true,
  categoryId: true,
  description: true,
  order: true,
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
  completed: boolean("completed").notNull().default(false),
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

// Restaurants
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  address: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

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

// User Profile schema
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProfileSchema = createInsertSchema(userProfiles).pick({
  name: true,
  role: true,
  avatarUrl: true,
});

export type UserProfileData = z.infer<typeof userProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Day Templates
export const dayTemplates = pgTable("day_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(),
  menuItems: jsonb("menu_items").$type<MenuItem[]>(),
  tables: jsonb("tables").$type<Table[]>(),
  isTemplate: boolean("is_template").default(false),
});

export const insertDayTemplateSchema = createInsertSchema(dayTemplates).pick({
  name: true,
  date: true,
  menuItems: true,
  tables: true,
  isTemplate: true,
});

export type InsertDayTemplate = z.infer<typeof insertDayTemplateSchema>;
export type DayTemplate = typeof dayTemplates.$inferSelect;
