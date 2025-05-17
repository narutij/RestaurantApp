import { 
  users, type User, type InsertUser,
  menuItems, type MenuItem, type InsertMenuItem,
  tables, type Table, type InsertTable,
  orders, type Order, type InsertOrder,
  dayTemplates, type DayTemplate, type InsertDayTemplate,
  type OrderWithDetails,
  userProfiles, type UserProfile, type UserProfileData,
  restaurants, type Restaurant, type InsertRestaurant
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

  // Restaurants
  getRestaurants(): Promise<Restaurant[]>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: number, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: number): Promise<boolean>;
  
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
  private restaurantsMap: Map<number, Restaurant>;
  private currentUserId: number;
  private currentMenuItemId: number;
  private currentTableId: number;
  private currentOrderId: number;
  private currentDayTemplateId: number;
  private currentUserProfileId: number;
  private currentRestaurantId: number;

  constructor() {
    this.users = new Map();
    this.menuItemsMap = new Map();
    this.tablesMap = new Map();
    this.ordersMap = new Map();
    this.dayTemplatesMap = new Map();
    this.userProfilesMap = new Map();
    this.restaurantsMap = new Map();
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentTableId = 1;
    this.currentOrderId = 1;
    this.currentDayTemplateId = 1;
    this.currentUserProfileId = 1;
    this.currentRestaurantId = 1;
    
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
    const newTable: Table = { 
      ...table, 
      id,
      isActive: table.isActive ?? false,
      activatedAt: table.activatedAt ?? null
    };
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
    const newOrder: Order = { 
      ...order, 
      id,
      timestamp: order.timestamp || new Date(),
      completed: order.completed ?? false
    };
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
    const dayTemplate: DayTemplate = { 
      ...template, 
      id,
      tables: template.tables || null,
      menuItems: template.menuItems || null,
      isTemplate: template.isTemplate ?? null
    };
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
      date: date.toISOString().split('T')[0],
      menuItems: template.menuItems,
      tables: template.tables,
      isTemplate: false
    };

    return this.createDayTemplate(newDayConfig);
  }
  
  // User Profile methods
  async getUserProfile(id: number): Promise<UserProfile | undefined> {
    try {
      // For database implementation
      const profiles = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
      if (profiles.length > 0) {
        return profiles[0];
      }
      
      // Fallback to memory storage if not found in DB
      return this.userProfilesMap.get(id);
    } catch (error) {
      console.error("Error getting user profile:", error);
      // Fallback to memory storage
      return this.userProfilesMap.get(id);
    }
  }
  
  async createUserProfile(profile: UserProfileData): Promise<UserProfile> {
    try {
      // For database implementation
      const data = {
        name: profile.name,
        role: profile.role,
        avatar_url: profile.avatarUrl || null
      };
      
      const [newProfile] = await db.insert(userProfiles).values(data).returning();
      return newProfile;
    } catch (error) {
      console.error("Error creating user profile:", error);
      
      // Fallback to memory storage implementation
      const id = this.currentUserProfileId++;
      const newProfile = {
        id,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatarUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as UserProfile;
      this.userProfilesMap.set(id, newProfile);
      return newProfile;
    }
  }
  
  async updateUserProfile(id: number, profile: Partial<UserProfileData>): Promise<UserProfile | undefined> {
    try {
      // For database implementation
      const data: any = {
        updated_at: new Date()
      };
      
      if (profile.name !== undefined) data.name = profile.name;
      if (profile.role !== undefined) data.role = profile.role;
      if (profile.avatarUrl !== undefined) {
        data.avatar_url = profile.avatarUrl;
        console.log("Setting avatar_url in database to:", profile.avatarUrl);
        
        // Direct SQL update for avatar to ensure it's saved properly
        try {
          await db.execute(
            'UPDATE user_profiles SET avatar_url = $1 WHERE id = $2',
            [profile.avatarUrl, id]
          );
          console.log("Used direct SQL to update avatar URL");
        } catch (err) {
          console.error("Error in direct avatar update:", err);
        }
      }
      
      // Get the existing profile first to ensure it exists
      const existingProfile = await this.getUserProfile(id);
      if (!existingProfile) {
        return undefined;
      }
      
      // Create the return object with up-to-date avatar URL
      const updatedProfile: UserProfile = {
        ...existingProfile,
        name: profile.name !== undefined ? profile.name : existingProfile.name,
        role: profile.role !== undefined ? profile.role : existingProfile.role,
        avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : existingProfile.avatarUrl,
        updatedAt: new Date()
      };
      
      // Also update memory storage as fallback
      this.userProfilesMap.set(id, updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      
      // Fallback to memory storage implementation
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

  // Restaurant Methods
  async getRestaurants(): Promise<Restaurant[]> {
    try {
      // For database implementation
      const results = await db.select().from(restaurants);
      return results;
    } catch (error) {
      console.error("Error getting restaurants:", error);
      
      // Fallback to memory storage implementation
      return Array.from(this.restaurantsMap.values());
    }
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    try {
      // For database implementation
      const [result] = await db.select().from(restaurants).where(eq(restaurants.id, id));
      return result;
    } catch (error) {
      console.error("Error getting restaurant:", error);
      
      // Fallback to memory storage implementation
      return this.restaurantsMap.get(id);
    }
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    try {
      // For database implementation
      const [newRestaurant] = await db.insert(restaurants).values(restaurant).returning();
      return newRestaurant;
    } catch (error) {
      console.error("Error creating restaurant:", error);
      
      // Fallback to memory storage implementation
      const id = this.currentRestaurantId++;
      const now = new Date();
      const newRestaurant: Restaurant = {
        ...restaurant,
        id,
        createdAt: now,
        updatedAt: now
      };
      this.restaurantsMap.set(id, newRestaurant);
      return newRestaurant;
    }
  }

  async updateRestaurant(id: number, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    try {
      // For database implementation
      const data: any = {
        updated_at: new Date()
      };
      
      if (restaurant.name !== undefined) data.name = restaurant.name;
      if (restaurant.address !== undefined) data.address = restaurant.address;
      
      const [updatedRestaurant] = await db
        .update(restaurants)
        .set(data)
        .where(eq(restaurants.id, id))
        .returning();
      
      return updatedRestaurant;
    } catch (error) {
      console.error("Error updating restaurant:", error);
      
      // Fallback to memory storage implementation
      const existingRestaurant = this.restaurantsMap.get(id);
      if (!existingRestaurant) {
        return undefined;
      }
      
      const updatedRestaurant: Restaurant = {
        ...existingRestaurant,
        ...restaurant,
        updatedAt: new Date()
      };
      
      this.restaurantsMap.set(id, updatedRestaurant);
      return updatedRestaurant;
    }
  }
  
  async deleteRestaurant(id: number): Promise<boolean> {
    try {
      // For database implementation
      const result = await db
        .delete(restaurants)
        .where(eq(restaurants.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      
      // Fallback to memory storage implementation
      const exists = this.restaurantsMap.has(id);
      if (exists) {
        this.restaurantsMap.delete(id);
      }
      return exists;
    }
  }
}

export const storage = new MemStorage();
