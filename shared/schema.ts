import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
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

// Table Layouts
export const tableLayouts = pgTable("table_layouts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  restaurantId: integer("restaurant_id").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTableLayoutSchema = createInsertSchema(tableLayouts).pick({
  name: true,
  restaurantId: true,
  description: true,
});

export type InsertTableLayout = z.infer<typeof insertTableLayoutSchema>;
export type TableLayout = typeof tableLayouts.$inferSelect;

// Tables
export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  label: text("label").notNull(),
  description: text("description"),
  layoutId: integer("layout_id"),
  isActive: boolean("is_active").default(false),
  activatedAt: timestamp("activated_at"),
  peopleCount: integer("people_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTableSchema = createInsertSchema(tables).pick({
  number: true,
  label: true,
  description: true,
  layoutId: true,
  isActive: true,
  activatedAt: true,
  peopleCount: true,
});

export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tables.$inferSelect;

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  menuItemId: integer("menu_item_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  completed: boolean("completed").notNull().default(false),
  price: doublePrecision("price").notNull(),
  notes: text("notes"),
  specialItemName: text("special_item_name"),
  isSpecialItem: boolean("is_special_item").default(false),
  workdayId: integer("workday_id"),
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  tableId: true,
  menuItemId: true,
  timestamp: true,
  completed: true,
  price: true,
  notes: true,
  specialItemName: true,
  isSpecialItem: true,
  workdayId: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Restaurants
export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).pick({
  name: true,
  address: true,
  imageUrl: true,
});

export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurants.$inferSelect;

// Workdays - Track active workday sessions
export const workdays = pgTable("workdays", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  date: text("date").notNull(),
  menuId: integer("menu_id"),
  tableLayoutId: integer("table_layout_id"),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorkdaySchema = createInsertSchema(workdays).pick({
  restaurantId: true,
  date: true,
  menuId: true,
  tableLayoutId: true,
  startedAt: true,
  endedAt: true,
  isActive: true,
});

export type InsertWorkday = z.infer<typeof insertWorkdaySchema>;
export type Workday = typeof workdays.$inferSelect;

// Workday Workers - Workers assigned to a workday
export const workdayWorkers = pgTable("workday_workers", {
  id: serial("id").primaryKey(),
  workdayId: integer("workday_id").notNull(),
  workerId: text("worker_id").notNull(),
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const insertWorkdayWorkerSchema = createInsertSchema(workdayWorkers).pick({
  workdayId: true,
  workerId: true,
});

export type InsertWorkdayWorker = z.infer<typeof insertWorkdayWorkerSchema>;
export type WorkdayWorker = typeof workdayWorkers.$inferSelect;

// Restaurant Workers - Worker management with roles
export type WorkerPermissions = {
  canManageTables?: boolean;
  canManageOrders?: boolean;
  canAccessKitchen?: boolean;
  canViewHistory?: boolean;
  canManageMenu?: boolean;
};

export type WorkerRole = 'admin' | 'manager' | 'worker' | 'kitchen';
export type WorkerStatus = 'active' | 'inactive' | 'pending';

export const restaurantWorkers = pgTable("restaurant_workers", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  workerId: text("worker_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  role: text("role").notNull().default('worker'),
  permissions: jsonb("permissions").$type<WorkerPermissions>(),
  status: text("status").notNull().default('pending'),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRestaurantWorkerSchema = createInsertSchema(restaurantWorkers).pick({
  restaurantId: true,
  workerId: true,
  name: true,
  email: true,
  role: true,
  permissions: true,
  status: true,
  avatarUrl: true,
});

export type InsertRestaurantWorker = z.infer<typeof insertRestaurantWorkerSchema>;
export type RestaurantWorker = typeof restaurantWorkers.$inferSelect;

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
  workerId: text("worker_id"),
  name: text("name").notNull(),
  role: text("role").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProfileSchema = createInsertSchema(userProfiles).pick({
  workerId: true,
  name: true,
  role: true,
  avatarUrl: true,
});

export type UserProfileData = z.infer<typeof userProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Day Templates (legacy - keeping for backward compatibility)
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

// Types for websocket events
export type WebSocketMessage = {
  type:
    | "NEW_ORDER"
    | "COMPLETE_ORDER"
    | "UNCOMPLETE_ORDER"
    | "ACTIVATE_TABLE"
    | "DEACTIVATE_TABLE"
    | "CONNECTED_USERS"
    | "USER_CONNECT"
    | "WORKDAY_STARTED"
    | "WORKDAY_ENDED"
    | "WORKER_JOINED"
    | "WORKER_LEFT"
    | "KITCHEN_NOTIFICATION";
  payload: unknown;
};

export type ConnectedUserInfo = {
  name: string;
  connectedAt: string;
};

export type ConnectedUsersPayload = {
  count: number;
  users: ConnectedUserInfo[];
};

export type OrderWithDetails = {
  id: number;
  tableId: number;
  menuItemId: number | null;
  menuItemName: string;
  timestamp: Date;
  completed: boolean;
  price: number;
  tableNumber: string;
  tableLabel: string;
  notes: string | null;
  specialItemName: string | null;
  isSpecialItem: boolean;
  peopleCount: number;
};

export type KitchenNotificationPayload = {
  orderId: number;
  tableNumber: string;
  message: string;
};

// Reminders
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  text: text("text").notNull(),
  createdBy: text("created_by").notNull(),
  createdByName: text("created_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReminderSchema = createInsertSchema(reminders).pick({
  restaurantId: true,
  text: true,
  createdBy: true,
  createdByName: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof reminders.$inferSelect;
