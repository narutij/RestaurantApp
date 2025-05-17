import { 
  users, type User, type InsertUser,
  menuItems, type MenuItem, type InsertMenuItem,
  tables, type Table, type InsertTable,
  orders, type Order, type InsertOrder,
  dayTemplates, type DayTemplate, type InsertDayTemplate,
  type OrderWithDetails,
  userProfiles, type UserProfile, type UserProfileData,
  restaurants, type Restaurant, type InsertRestaurant,
  menus, type Menu, type InsertMenu,
  menuCategories, type MenuCategory, type InsertMenuCategory
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
  
  // Menus
  getMenus(restaurantId?: number): Promise<Menu[]>;
  getMenu(id: number): Promise<Menu | undefined>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: number, menu: Partial<InsertMenu>): Promise<Menu | undefined>;
  deleteMenu(id: number): Promise<boolean>;
  
  // Menu Categories
  getMenuCategories(menuId: number): Promise<MenuCategory[]>;
  getMenuCategory(id: number): Promise<MenuCategory | undefined>;
  createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory>;
  updateMenuCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined>;
  deleteMenuCategory(id: number): Promise<boolean>;
  
  // Menu Items
  getMenuItems(categoryId?: number): Promise<MenuItem[]>;
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
  private menusMap: Map<number, Menu>;
  private menuCategoriesMap: Map<number, MenuCategory>;
  private currentUserId: number;
  private currentMenuItemId: number;
  private currentTableId: number;
  private currentOrderId: number;
  private currentDayTemplateId: number;
  private currentUserProfileId: number;
  private currentRestaurantId: number;
  private currentMenuId: number;
  private currentMenuCategoryId: number;

  constructor() {
    this.users = new Map();
    this.menuItemsMap = new Map();
    this.tablesMap = new Map();
    this.ordersMap = new Map();
    this.dayTemplatesMap = new Map();
    this.userProfilesMap = new Map();
    this.restaurantsMap = new Map();
    this.menusMap = new Map();
    this.menuCategoriesMap = new Map();
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentTableId = 1;
    this.currentOrderId = 1;
    this.currentDayTemplateId = 1;
    this.currentUserProfileId = 1;
    this.currentRestaurantId = 1;
    this.currentMenuId = 1;
    this.currentMenuCategoryId = 1;
    
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
  
  // Menu methods
  async getMenus(restaurantId?: number): Promise<Menu[]> {
    try {
      if (restaurantId) {
        const result = await db.select().from(menus).where(eq(menus.restaurantId, restaurantId));
        return result;
      } else {
        const result = await db.select().from(menus);
        return result;
      }
    } catch (error) {
      console.error("Error getting menus:", error);
      
      // Return from memory if DB fails
      if (restaurantId) {
        return Array.from(this.menusMap.values()).filter(menu => menu.restaurantId === restaurantId);
      } else {
        return Array.from(this.menusMap.values());
      }
    }
  }
  
  async getMenu(id: number): Promise<Menu | undefined> {
    try {
      const result = await db.select().from(menus).where(eq(menus.id, id));
      return result[0];
    } catch (error) {
      console.error("Error getting menu:", error);
      return this.menusMap.get(id);
    }
  }
  
  async createMenu(menu: InsertMenu): Promise<Menu> {
    try {
      const result = await db.insert(menus).values(menu).returning();
      if (result.length > 0) {
        return result[0];
      }
    } catch (error) {
      console.error("Error creating menu:", error);
    }
    
    // Fallback to memory storage
    const id = this.currentMenuId++;
    const now = new Date();
    const newMenu: Menu = { 
      ...menu, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.menusMap.set(id, newMenu);
    return newMenu;
  }
  
  async updateMenu(id: number, menu: Partial<InsertMenu>): Promise<Menu | undefined> {
    try {
      const result = await db.update(menus)
        .set({ ...menu, updatedAt: new Date() })
        .where(eq(menus.id, id))
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
    } catch (error) {
      console.error("Error updating menu:", error);
    }
    
    // Fallback to memory storage
    const existingMenu = this.menusMap.get(id);
    if (!existingMenu) {
      return undefined;
    }
    
    const updatedMenu: Menu = { 
      ...existingMenu, 
      ...menu,
      updatedAt: new Date()
    };
    this.menusMap.set(id, updatedMenu);
    return updatedMenu;
  }
  
  async deleteMenu(id: number): Promise<boolean> {
    try {
      const result = await db.delete(menus).where(eq(menus.id, id)).returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting menu:", error);
      
      // Fallback to memory storage
      return this.menusMap.delete(id);
    }
  }
  
  // Menu Categories methods
  async getMenuCategories(menuId: number): Promise<MenuCategory[]> {
    try {
      const result = await db.select().from(menuCategories).where(eq(menuCategories.menuId, menuId));
      return result;
    } catch (error) {
      console.error("Error getting menu categories:", error);
      
      // Return from memory if DB fails
      return Array.from(this.menuCategoriesMap.values())
        .filter(category => category.menuId === menuId)
        .sort((a, b) => a.order - b.order);
    }
  }
  
  async getMenuCategory(id: number): Promise<MenuCategory | undefined> {
    try {
      const result = await db.select().from(menuCategories).where(eq(menuCategories.id, id));
      return result[0];
    } catch (error) {
      console.error("Error getting menu category:", error);
      return this.menuCategoriesMap.get(id);
    }
  }
  
  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    try {
      const result = await db.insert(menuCategories).values(category).returning();
      if (result.length > 0) {
        return result[0];
      }
    } catch (error) {
      console.error("Error creating menu category:", error);
    }
    
    // Fallback to memory storage
    const id = this.currentMenuCategoryId++;
    const now = new Date();
    const newCategory: MenuCategory = { 
      ...category, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.menuCategoriesMap.set(id, newCategory);
    return newCategory;
  }
  
  async updateMenuCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory | undefined> {
    try {
      const result = await db.update(menuCategories)
        .set({ ...category, updatedAt: new Date() })
        .where(eq(menuCategories.id, id))
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
    } catch (error) {
      console.error("Error updating menu category:", error);
    }
    
    // Fallback to memory storage
    const existingCategory = this.menuCategoriesMap.get(id);
    if (!existingCategory) {
      return undefined;
    }
    
    const updatedCategory: MenuCategory = { 
      ...existingCategory, 
      ...category,
      updatedAt: new Date()
    };
    this.menuCategoriesMap.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteMenuCategory(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete menu category with id: ${id}`);
      const categoryToDelete = await this.getMenuCategory(id);
      if (!categoryToDelete) {
        console.log(`Category with id ${id} not found`);
        return false;
      }
      
      console.log(`Found category to delete:`, categoryToDelete);
      const result = await db.delete(menuCategories).where(eq(menuCategories.id, id)).returning();
      console.log(`Delete result:`, result);
      
      // Also delete from memory storage to maintain consistency
      this.menuCategoriesMap.delete(id);
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting menu category:", error);
      
      // Still try memory storage as fallback
      const memoryResult = this.menuCategoriesMap.delete(id);
      console.log(`Memory storage deletion result: ${memoryResult}`);
      return memoryResult;
    }
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
  async getMenuItems(categoryId?: number): Promise<MenuItem[]> {
    try {
      if (categoryId) {
        const result = await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
        return result;
      } else {
        const result = await db.select().from(menuItems);
        return result;
      }
    } catch (error) {
      console.error("Error getting menu items:", error);
      
      // Fallback to memory storage
      if (categoryId) {
        return Array.from(this.menuItemsMap.values())
          .filter(item => item.categoryId === categoryId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      } else {
        return Array.from(this.menuItemsMap.values());
      }
    }
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    try {
      console.log(`Retrieving menu item with id: ${id}`);
      const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
      console.log(`Database query result for menu item ${id}:`, result);
      
      if (result.length > 0) {
        return result[0];
      }
      
      // If not found in database, try memory storage
      const memoryItem = this.menuItemsMap.get(id);
      console.log(`Memory storage result for menu item ${id}:`, memoryItem || 'Not found');
      return memoryItem;
    } catch (error) {
      console.error("Error getting menu item:", error);
      // Fallback to memory storage
      const memoryItem = this.menuItemsMap.get(id);
      console.log(`Memory storage fallback for menu item ${id}:`, memoryItem || 'Not found');
      return memoryItem;
    }
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    try {
      console.log(`Creating menu item:`, item);
      const result = await db.insert(menuItems).values(item).returning();
      console.log(`Database result for creating menu item:`, result);
      
      if (result.length > 0) {
        // Also store in memory for consistent access
        const newItem = result[0];
        this.menuItemsMap.set(newItem.id, newItem);
        console.log(`Stored new menu item in memory with id: ${newItem.id}`);
        return newItem;
      }
    } catch (error) {
      console.error("Error creating menu item:", error);
    }
    
    // Fallback to memory storage
    const id = this.currentMenuItemId++;
    const now = new Date();
    const menuItem: MenuItem = { 
      ...item, 
      id,
      createdAt: now,
      updatedAt: now
    };
    
    console.log(`Fallback: Creating menu item in memory with id: ${id}`);
    this.menuItemsMap.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    try {
      const result = await db.update(menuItems)
        .set({ ...item, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      
      if (result.length > 0) {
        return result[0];
      }
    } catch (error) {
      console.error("Error updating menu item:", error);
    }
    
    // Fallback to memory storage
    const existingItem = this.menuItemsMap.get(id);
    if (!existingItem) return undefined;

    const updatedItem = { 
      ...existingItem, 
      ...item,
      updatedAt: new Date()
    };
    this.menuItemsMap.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete menu item with id: ${id}`);
      const itemToDelete = await this.getMenuItem(id);
      if (!itemToDelete) {
        console.log(`Menu item with id ${id} not found`);
        return false;
      }
      
      console.log(`Found menu item to delete:`, itemToDelete);
      const result = await db.delete(menuItems).where(eq(menuItems.id, id)).returning();
      console.log(`Delete result:`, result);
      
      // Also delete from memory storage to maintain consistency
      this.menuItemsMap.delete(id);
      
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting menu item:", error);
      
      // Still try memory storage as fallback
      const memoryResult = this.menuItemsMap.delete(id);
      console.log(`Memory storage deletion result: ${memoryResult}`);
      return memoryResult;
    }
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
      // First, check if the user profile exists in the database
      try {
        const profiles = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
        if (profiles.length > 0) {
          console.log("Got profile from database:", profiles[0]);
          return profiles[0];
        }
      } catch (dbErr) {
        console.error("Database query error:", dbErr);
      }
      
      // Fallback to memory storage if not found in DB
      console.log("Falling back to memory storage for profile");
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
      // First get the existing profile
      const existingProfile = await this.getUserProfile(id);
      if (!existingProfile) {
        return undefined;
      }
      
      // Prepare the data for database update
      const avatarUrl = profile.avatarUrl !== undefined ? profile.avatarUrl : existingProfile.avatarUrl;
      const name = profile.name !== undefined ? profile.name : existingProfile.name;
      const role = profile.role !== undefined ? profile.role : existingProfile.role;
      
      console.log("Updating profile data:", { id, name, role, avatarUrl });
      
      let updated = false;
      try {
        // Update with proper Drizzle ORM
        const result = await db.update(userProfiles)
          .set({
            name: name,
            role: role,
            avatarUrl: avatarUrl,
            updatedAt: new Date()
          })
          .where(eq(userProfiles.id, id))
          .returning();
          
        if (result.length > 0) {
          console.log("Successfully updated profile:", result[0]);
          updated = true;
        } else {
          console.log("No rows updated, trying insert instead");
        }
      } catch (err) {
        console.error("Error in profile update:", err);
      }
      
      // If update failed, try to insert instead
      if (!updated) {
        try {
          const result = await db.insert(userProfiles).values({
            id,
            name,
            role,
            avatarUrl,
            createdAt: new Date(),
            updatedAt: new Date()
          }).returning();
          
          if (result.length > 0) {
            console.log("Successfully inserted profile:", result[0]);
          }
        } catch (err) {
          console.error("Error in profile insert:", err);
        }
      }
      
      // Create the return object with up-to-date data 
      const updatedProfile: UserProfile = {
        id,
        name,
        role,
        avatarUrl,
        createdAt: existingProfile.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      // Always update memory storage
      this.userProfilesMap.set(id, updatedProfile);
      
      return updatedProfile;
    } catch (error) {
      console.error("Error updating user profile:", error);
      
      // If all database operations fail, update memory storage
      const existingProfile = this.userProfilesMap.get(id);
      if (!existingProfile) {
        return undefined;
      }
      
      const updatedProfile: UserProfile = {
        ...existingProfile,
        name: profile.name !== undefined ? profile.name : existingProfile.name,
        role: profile.role !== undefined ? profile.role : existingProfile.role,
        avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : existingProfile.avatarUrl,
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
