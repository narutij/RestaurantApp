import { 
  users, type User, type InsertUser,
  menuItems, type MenuItem, type InsertMenuItem,
  tables, type Table, type InsertTable,
  orders, type Order, type InsertOrder,
  dayTemplates, type DayTemplate, type InsertDayTemplate,
  type OrderWithDetails,
  userProfiles, type UserProfile, type UserProfileData
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Users (from base template)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // User Profiles
  getUserProfile(id: number): Promise<UserProfile | undefined>;
  createUserProfile(profile: UserProfileData): Promise<UserProfile>;
  updateUserProfile(id: number, profile: Partial<UserProfileData>): Promise<UserProfile | undefined>;

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Tables
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTable(id: number, table: Partial<InsertTable>): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;
  activateTable(id: number): Promise<Table | undefined>;
  deactivateTable(id: number): Promise<Table | undefined>;
  getActiveTables(): Promise<Table[]>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrdersWithDetails(): Promise<OrderWithDetails[]>;
  getOrdersByTable(tableId: number): Promise<Order[]>;
  getOrdersWithDetailsByTable(tableId: number): Promise<OrderWithDetails[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  markOrderComplete(id: number): Promise<Order | undefined>;
  getNewOrders(): Promise<OrderWithDetails[]>;
  
  // Day Templates
  getDayTemplates(): Promise<DayTemplate[]>;
  getDayTemplate(id: number): Promise<DayTemplate | undefined>;
  getDayTemplateByDate(date: Date): Promise<DayTemplate | undefined>;
  createDayTemplate(template: InsertDayTemplate): Promise<DayTemplate>;
  updateDayTemplate(id: number, template: Partial<InsertDayTemplate>): Promise<DayTemplate | undefined>;
  deleteDayTemplate(id: number): Promise<boolean>;
  getTemplates(): Promise<DayTemplate[]>;
  applyTemplate(templateId: number, date: Date): Promise<DayTemplate>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItemsMap: Map<number, MenuItem>;
  private tablesMap: Map<number, Table>;
  private ordersMap: Map<number, Order>;
  private dayTemplatesMap: Map<number, DayTemplate>;
  private userProfilesMap: Map<number, UserProfile>;
  private currentUserId: number;
  private currentMenuItemId: number;
  private currentTableId: number;
  private currentOrderId: number;
  private currentDayTemplateId: number;
  private currentUserProfileId: number;

  constructor() {
    this.users = new Map();
    this.menuItemsMap = new Map();
    this.tablesMap = new Map();
    this.ordersMap = new Map();
    this.dayTemplatesMap = new Map();
    this.userProfilesMap = new Map();
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentTableId = 1;
    this.currentOrderId = 1;
    this.currentDayTemplateId = 1;
    this.currentUserProfileId = 1;
    
    // Add a default user profile
    this.userProfilesMap.set(1, {
      id: 1,
      name: "John Doe",
      role: "Restaurant Manager",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Users (from base template)
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Menu Items
  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItemsMap.values());
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItemsMap.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const id = this.currentMenuItemId++;
    const menuItem: MenuItem = { ...item, id };
    this.menuItemsMap.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existingItem = this.menuItemsMap.get(id);
    if (!existingItem) return undefined;

    const updatedItem = { ...existingItem, ...item };
    this.menuItemsMap.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItemsMap.delete(id);
  }

  // Tables
  async getTables(): Promise<Table[]> {
    return Array.from(this.tablesMap.values());
  }

  async getTable(id: number): Promise<Table | undefined> {
    return this.tablesMap.get(id);
  }

  async createTable(table: InsertTable): Promise<Table> {
    const id = this.currentTableId++;
    const newTable: Table = { ...table, id };
    this.tablesMap.set(id, newTable);
    return newTable;
  }

  async updateTable(id: number, table: Partial<InsertTable>): Promise<Table | undefined> {
    const existingTable = this.tablesMap.get(id);
    if (!existingTable) return undefined;

    const updatedTable = { ...existingTable, ...table };
    this.tablesMap.set(id, updatedTable);
    return updatedTable;
  }

  async deleteTable(id: number): Promise<boolean> {
    return this.tablesMap.delete(id);
  }

  async activateTable(id: number): Promise<Table | undefined> {
    const table = this.tablesMap.get(id);
    if (!table) return undefined;

    const updatedTable: Table = { 
      ...table, 
      isActive: true, 
      activatedAt: new Date() 
    };
    this.tablesMap.set(id, updatedTable);
    return updatedTable;
  }

  async deactivateTable(id: number): Promise<Table | undefined> {
    const table = this.tablesMap.get(id);
    if (!table) return undefined;

    const updatedTable: Table = { 
      ...table, 
      isActive: false, 
      activatedAt: null 
    };
    this.tablesMap.set(id, updatedTable);
    return updatedTable;
  }

  async getActiveTables(): Promise<Table[]> {
    return Array.from(this.tablesMap.values()).filter(table => table.isActive);
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return Array.from(this.ordersMap.values());
  }

  async getOrdersWithDetails(): Promise<OrderWithDetails[]> {
    const allOrders = Array.from(this.ordersMap.values());
    return Promise.all(allOrders.map(async (order) => {
      const menuItem = await this.getMenuItem(order.menuItemId);
      const table = await this.getTable(order.tableId);
      return {
        ...order,
        menuItemName: menuItem?.name || 'Unknown Item',
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || ''
      };
    }));
  }

  async getOrdersByTable(tableId: number): Promise<Order[]> {
    return Array.from(this.ordersMap.values()).filter(order => order.tableId === tableId);
  }
  
  async getOrdersWithDetailsByTable(tableId: number): Promise<OrderWithDetails[]> {
    const tableOrders = await this.getOrdersByTable(tableId);
    return Promise.all(tableOrders.map(async (order) => {
      const menuItem = await this.getMenuItem(order.menuItemId);
      const table = await this.getTable(order.tableId);
      return {
        ...order,
        menuItemName: menuItem?.name || 'Unknown Item',
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || ''
      };
    }));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const newOrder: Order = { ...order, id };
    this.ordersMap.set(id, newOrder);
    return newOrder;
  }

  async markOrderComplete(id: number): Promise<Order | undefined> {
    const order = this.ordersMap.get(id);
    if (!order) return undefined;

    const updatedOrder: Order = { ...order, completed: true };
    this.ordersMap.set(id, updatedOrder);
    return updatedOrder;
  }

  async getNewOrders(): Promise<OrderWithDetails[]> {
    const allOrders = Array.from(this.ordersMap.values());
    const newOrders = allOrders.filter(order => !order.completed);
    
    return Promise.all(newOrders.map(async (order) => {
      const menuItem = await this.getMenuItem(order.menuItemId);
      const table = await this.getTable(order.tableId);
      return {
        ...order,
        menuItemName: menuItem?.name || 'Unknown Item',
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || ''
      };
    }));
  }

  // Day Templates
  async getDayTemplates(): Promise<DayTemplate[]> {
    return Array.from(this.dayTemplatesMap.values());
  }

  async getDayTemplate(id: number): Promise<DayTemplate | undefined> {
    return this.dayTemplatesMap.get(id);
  }

  async getDayTemplateByDate(date: Date): Promise<DayTemplate | undefined> {
    const dateString = date.toISOString().split('T')[0];
    const templates = await this.getDayTemplates();
    return templates.find(template => {
      const templateDate = new Date(template.date);
      return templateDate.toISOString().split('T')[0] === dateString && !template.isTemplate;
    });
  }

  async createDayTemplate(template: InsertDayTemplate): Promise<DayTemplate> {
    const id = this.currentDayTemplateId++;
    const dayTemplate: DayTemplate = { ...template, id };
    this.dayTemplatesMap.set(id, dayTemplate);
    return dayTemplate;
  }

  async updateDayTemplate(id: number, template: Partial<InsertDayTemplate>): Promise<DayTemplate | undefined> {
    const existingTemplate = await this.getDayTemplate(id);
    if (!existingTemplate) {
      return undefined;
    }
    
    const updatedTemplate: DayTemplate = { 
      ...existingTemplate, 
      ...template,
      id 
    };
    
    this.dayTemplatesMap.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteDayTemplate(id: number): Promise<boolean> {
    return this.dayTemplatesMap.delete(id);
  }

  async getTemplates(): Promise<DayTemplate[]> {
    const templates = await this.getDayTemplates();
    return templates.filter(template => template.isTemplate);
  }

  async applyTemplate(templateId: number, date: Date): Promise<DayTemplate> {
    const template = await this.getDayTemplate(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Create a new day configuration based on the template
    const newDayConfig: InsertDayTemplate = {
      name: `${template.name} (${date.toLocaleDateString()})`,
      date: date,
      menuItems: template.menuItems,
      tables: template.tables,
      isTemplate: false
    };

    return this.createDayTemplate(newDayConfig);
  }
  
  // User Profile methods
  async getUserProfile(id: number): Promise<UserProfile | undefined> {
    // For database implementation, we would use:
    // const profiles = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    // return profiles.length > 0 ? profiles[0] : undefined;
    
    // For memory storage implementation:
    return this.userProfilesMap.get(id);
  }
  
  async createUserProfile(profile: UserProfileData): Promise<UserProfile> {
    // For database implementation, we would use:
    // const [newProfile] = await db.insert(userProfiles).values(profile).returning();
    // return newProfile;
    
    // For memory storage implementation:
    const id = this.currentUserProfileId++;
    const newProfile: UserProfile = {
      ...profile,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userProfilesMap.set(id, newProfile);
    return newProfile;
  }
  
  async updateUserProfile(id: number, profile: Partial<UserProfileData>): Promise<UserProfile | undefined> {
    // For database implementation, we would use:
    // const updatedProfile = { ...profile, updatedAt: new Date() };
    // const results = await db
    //   .update(userProfiles)
    //   .set(updatedProfile)
    //   .where(eq(userProfiles.id, id))
    //   .returning();
    // return results.length > 0 ? results[0] : undefined;
    
    // For memory storage implementation:
    const existingProfile = this.userProfilesMap.get(id);
    if (!existingProfile) {
      return undefined;
    }
    
    const updatedProfile: UserProfile = {
      ...existingProfile,
      ...profile,
      updatedAt: new Date()
    };
    
    this.userProfilesMap.set(id, updatedProfile);
    return updatedProfile;
  }
}

export const storage = new MemStorage();
