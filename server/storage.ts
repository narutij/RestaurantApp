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
  menuCategories, type MenuCategory, type InsertMenuCategory,
  tableLayouts, type TableLayout, type InsertTableLayout,
  workdays, type Workday, type InsertWorkday,
  workdayWorkers, type WorkdayWorker, type InsertWorkdayWorker,
  restaurantWorkers, type RestaurantWorker, type InsertRestaurantWorker,
  reminders, type Reminder, type InsertReminder
} from "@shared/schema";
import { db } from "./db";
import { eq, inArray, and, desc } from "drizzle-orm";

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

  // Table Layouts
  getTableLayouts(restaurantId?: number): Promise<TableLayout[]>;
  getTableLayout(id: number): Promise<TableLayout | undefined>;
  createTableLayout(layout: InsertTableLayout): Promise<TableLayout>;
  updateTableLayout(id: number, layout: Partial<InsertTableLayout>): Promise<TableLayout | undefined>;
  deleteTableLayout(id: number): Promise<boolean>;
  
  // Tables
  getTables(layoutId?: number): Promise<Table[]>;
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
  markOrderIncomplete(id: number): Promise<Order | undefined>;
  cancelOrder(id: number): Promise<Order | undefined>;
  clearOrdersByTable(tableId: number): Promise<void>;
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

  // Fetch menu items for a specific menu
  getMenuItemsByMenuId(menuId: number): Promise<MenuItem[]>;

  // Workdays
  getWorkdays(restaurantId?: number): Promise<Workday[]>;
  getWorkday(id: number): Promise<Workday | undefined>;
  getActiveWorkday(restaurantId: number): Promise<Workday | undefined>;
  createWorkday(workday: InsertWorkday): Promise<Workday>;
  updateWorkday(id: number, workday: Partial<InsertWorkday>): Promise<Workday | undefined>;
  startWorkday(id: number): Promise<Workday | undefined>;
  endWorkday(id: number): Promise<Workday | undefined>;

  // Workday Workers
  getWorkdayWorkers(workdayId: number): Promise<WorkdayWorker[]>;
  addWorkdayWorker(worker: InsertWorkdayWorker): Promise<WorkdayWorker>;
  removeWorkdayWorker(workdayId: number, workerId: string): Promise<boolean>;

  // Restaurant Workers
  getRestaurantWorkers(restaurantId: number): Promise<RestaurantWorker[]>;
  getRestaurantWorker(id: number): Promise<RestaurantWorker | undefined>;
  createRestaurantWorker(worker: InsertRestaurantWorker): Promise<RestaurantWorker>;
  updateRestaurantWorker(id: number, worker: Partial<InsertRestaurantWorker>): Promise<RestaurantWorker | undefined>;
  deleteRestaurantWorker(id: number): Promise<boolean>;

  // History
  getOrdersByDate(restaurantId: number, date: string): Promise<OrderWithDetails[]>;
  getHistorySummary(restaurantId: number, date: string): Promise<{
    totalRevenue: number;
    orderCount: number;
    tablesServed: number;
    orders: OrderWithDetails[];
  }>;
  getDetailedHistory(restaurantId: number, date: string): Promise<{
    shifts: Array<{
      id: number;
      startedAt: Date | null;
      endedAt: Date | null;
      isActive: boolean;
      workers: Array<{
        workerId: string;
        joinedAt: Date;
      }>;
      revenue: number;
      orderCount: number;
      tablesServed: number;
      peopleServed: number;
      orders: OrderWithDetails[];
    }>;
    totals: {
      revenue: number;
      orderCount: number;
      tablesServed: number;
      peopleServed: number;
      workersCount: number;
    };
  }>;

  // Reminders
  getReminders(restaurantId: number): Promise<Reminder[]>;
  createReminder(reminder: InsertReminder): Promise<Reminder>;
  deleteReminder(id: number): Promise<boolean>;

  // Statistics
  getStatistics(restaurantId: number, timeframe: 'week' | 'month' | 'quarter' | 'year'): Promise<{
    revenue: number;
    peopleCount: number;
    topItems: Array<{ name: string; count: number; revenue: number }>;
  }>;

  // Worker Statistics
  getTopWorkersByTime(restaurantId: number, startDate: Date, endDate: Date): Promise<Array<{
    workerId: string;
    name: string;
    totalMinutes: number;
  }>>;

  getWorkerStatistics(workerId: string, startDate: Date, endDate: Date): Promise<{
    totalHours: number;
    shiftsCount: number;
    averageShiftLength: number;
    restaurants: Array<{ id: number; name: string; hours: number }>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private menuItemsMap: Map<number, MenuItem> = new Map();
  private tablesMap: Map<number, Table> = new Map();
  private tableLayoutsMap: Map<number, TableLayout> = new Map();
  private ordersMap: Map<number, Order> = new Map();
  private dayTemplatesMap: Map<number, DayTemplate> = new Map();
  private userProfilesMap: Map<number, UserProfile> = new Map();
  private restaurantsMap: Map<number, Restaurant> = new Map();
  private menusMap: Map<number, Menu> = new Map();
  private menuCategoriesMap: Map<number, MenuCategory> = new Map();
  private workdaysMap: Map<number, Workday> = new Map();
  private workdayWorkersMap: Map<number, WorkdayWorker> = new Map();
  private restaurantWorkersMap: Map<number, RestaurantWorker> = new Map();
  private remindersMap: Map<number, Reminder> = new Map();
  private currentUserId: number = 1;
  private currentMenuItemId: number = 1;
  private currentTableId: number = 1;
  private currentTableLayoutId: number = 1;
  private currentOrderId: number = 1;
  private currentDayTemplateId: number = 1;
  private currentUserProfileId: number = 1;
  private currentRestaurantId: number = 1;
  private currentMenuId: number = 1;
  private currentMenuCategoryId: number = 1;
  private currentWorkdayId: number = 1;
  private currentWorkdayWorkerId: number = 1;
  private currentRestaurantWorkerId: number = 1;
  private currentReminderId: number = 1;

  constructor() {
    this.clear();
    this.loadDataFromDatabase();
  }

  private clear() {
    this.users.clear();
    this.menuItemsMap.clear();
    this.tablesMap.clear();
    this.tableLayoutsMap.clear();
    this.ordersMap.clear();
    this.dayTemplatesMap.clear();
    this.userProfilesMap.clear();
    this.restaurantsMap.clear();
    this.menusMap.clear();
    this.menuCategoriesMap.clear();
    this.workdaysMap.clear();
    this.workdayWorkersMap.clear();
    this.restaurantWorkersMap.clear();
    this.currentUserId = 1;
    this.currentMenuItemId = 1;
    this.currentTableId = 1;
    this.currentTableLayoutId = 1;
    this.currentOrderId = 1;
    this.currentDayTemplateId = 1;
    this.currentUserProfileId = 1;
    this.currentRestaurantId = 1;
    this.currentMenuId = 1;
    this.currentMenuCategoryId = 1;
    this.currentWorkdayId = 1;
    this.currentWorkdayWorkerId = 1;
    this.currentRestaurantWorkerId = 1;

    // Add a default user profile
    this.userProfilesMap.set(1, {
      id: 1,
      workerId: null,
      name: "John Doe",
      role: "Restaurant Manager",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  private loadDataFromDatabase() {
    // Call the async initialization method but don't wait for it
    this.initializeFromDatabase().catch(err => {
      console.error("Failed to initialize database:", err);
    });
  }
  
  private async initializeFromDatabase() {
    try {
      console.log("Initializing storage from database...");
      
      // Load menu items
      const dbMenuItems = await db.select().from(menuItems);
      console.log(`Loaded ${dbMenuItems.length} menu items from database`);
      
      for (const item of dbMenuItems) {
        this.menuItemsMap.set(item.id, item);
        if (item.id >= this.currentMenuItemId) {
          this.currentMenuItemId = item.id + 1;
        }
      }
      
      // Load menu categories
      const dbMenuCategories = await db.select().from(menuCategories);
      console.log(`Loaded ${dbMenuCategories.length} menu categories from database`);
      
      for (const category of dbMenuCategories) {
        this.menuCategoriesMap.set(category.id, category);
        if (category.id >= this.currentMenuCategoryId) {
          this.currentMenuCategoryId = category.id + 1;
        }
      }
      
      // Load menus
      const dbMenus = await db.select().from(menus);
      console.log(`Loaded ${dbMenus.length} menus from database`);
      
      for (const menu of dbMenus) {
        this.menusMap.set(menu.id, menu);
        if (menu.id >= this.currentMenuId) {
          this.currentMenuId = menu.id + 1;
        }
      }
      
      // Load restaurants
      try {
        const dbRestaurants = await db.select().from(restaurants);
        console.log(`Loaded ${dbRestaurants.length} restaurants from database`);
        
        for (const restaurant of dbRestaurants) {
          this.restaurantsMap.set(restaurant.id, restaurant);
          if (restaurant.id >= this.currentRestaurantId) {
            this.currentRestaurantId = restaurant.id + 1;
          }
        }
      } catch (err) {
        console.log("Could not load restaurants from database");
      }
      
      // Load table layouts
      try {
        const dbTableLayouts = await db.select().from(tableLayouts);
        console.log(`Loaded ${dbTableLayouts.length} table layouts from database`);
        
        for (const layout of dbTableLayouts) {
          this.tableLayoutsMap.set(layout.id, layout);
          if (layout.id >= this.currentTableLayoutId) {
            this.currentTableLayoutId = layout.id + 1;
          }
        }
      } catch (err) {
        console.log("Could not load table layouts from database");
      }
      
      // Load tables
      try {
        const dbTables = await db.select().from(tables);
        console.log(`Loaded ${dbTables.length} tables from database`);
        
        for (const table of dbTables) {
          // Reset active status on server restart - tables shouldn't be active after restart
          const tableWithResetStatus = { ...table, isActive: false, activatedAt: null };
          this.tablesMap.set(table.id, tableWithResetStatus);
          if (table.id >= this.currentTableId) {
            this.currentTableId = table.id + 1;
          }
        }
      } catch (err) {
        console.log("Could not load tables from database");
      }
      
      console.log("Storage initialization complete");
    } catch (error) {
      console.error("Error initializing from database:", error);
      console.log("Continuing with empty memory storage");
    }
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
      console.log(`Retrieving menu with id: ${id}`);
      const menu = await this.getMenu(id);
      if (!menu) {
        console.log(`Menu not found with id: ${id}`);
        return false;
      }
      
      // First identify and delete menu categories associated with this menu
      try {
        console.log(`Finding categories for menu id: ${id}`);
        const menuCats = await db.select().from(menuCategories).where(eq(menuCategories.menuId, id));
        
        if (menuCats.length > 0) {
          console.log(`Found ${menuCats.length} categories to delete for menu ${id}`);
          
          // For each category, delete its menu items first
          for (const category of menuCats) {
            try {
              console.log(`Finding items for category id: ${category.id}`);
              await db.delete(menuItems).where(eq(menuItems.categoryId, category.id));
              console.log(`Deleted items for category ${category.id}`);
            } catch (err) {
              console.error(`Error deleting menu items for category ${category.id}:`, err);
            }
          }
          
          // Then delete all the categories
          await db.delete(menuCategories).where(eq(menuCategories.menuId, id));
          console.log(`Deleted all categories for menu ${id}`);
        }
      } catch (err) {
        console.error(`Error handling categories for menu ${id}:`, err);
      }
      
      // Finally delete the menu itself
      console.log(`Deleting menu with id: ${id}`);
      const result = await db.delete(menus).where(eq(menus.id, id)).returning();
      
      // Also remove from memory storage to keep things in sync
      this.menusMap.delete(id);
      
      console.log(`Menu deletion result:`, result);
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
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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
      id,
      name: category.name,
      menuId: category.menuId,
      order: category.order ?? null,
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
      
      // Make sure the category exists before trying to delete it
      const categoryToDelete = await this.getMenuCategory(id);
      if (!categoryToDelete) {
        console.log(`Category with id ${id} not found`);
        return false;
      }
      
      console.log(`Found category to delete:`, categoryToDelete);
      
      try {
        // 1. First find all menu items associated with this category
        const relatedItems = await this.getMenuItems(id);
        console.log(`Found ${relatedItems.length} menu items related to this category`);
        
        // 2. Delete related menu items from the database
        if (relatedItems.length > 0) {
          console.log(`Deleting ${relatedItems.length} related menu items from database`);
          
          for (const item of relatedItems) {
            try {
              // For each item, delete from database
              await db.delete(menuItems).where(eq(menuItems.id, item.id));
              console.log(`Deleted menu item ${item.id} (${item.name}) from database`);
              
              // Then remove from memory storage
              this.menuItemsMap.delete(item.id);
            } catch (itemError) {
              console.error(`Error deleting menu item ${item.id}:`, itemError);
              // Continue with other items even if one fails
            }
          }
        }
        
        // 3. Delete the category from database
        console.log(`Now deleting the category ${id} from database`);
        const result = await db.delete(menuCategories).where(eq(menuCategories.id, id)).returning();
        
        // 4. Remove from memory storage
        this.menuCategoriesMap.delete(id);
        
        console.log(`Category deletion result:`, result);
        return result.length > 0;
      } catch (dbError) {
        console.error("Database operations failed:", dbError);
        
        // Fallback to memory-only operations if database fails
        console.log("Attempting memory-only deletion as fallback");
        
        // Delete items from memory
        const memoryItems = Array.from(this.menuItemsMap.values())
          .filter(item => item.categoryId === id);
        
        for (const item of memoryItems) {
          this.menuItemsMap.delete(item.id);
          console.log(`Deleted menu item ${item.id} from memory`);
        }
        
        // Delete category from memory
        const memResult = this.menuCategoriesMap.delete(id);
        console.log(`Memory-only category deletion result: ${memResult}`);
        return memResult;
      }
    } catch (error) {
      console.error("Error in deleteMenuCategory:", error);
      
      // Last attempt emergency fallback
      try {
        const memoryItems = Array.from(this.menuItemsMap.values())
          .filter(item => item.categoryId === id);
        
        for (const item of memoryItems) {
          this.menuItemsMap.delete(item.id);
        }
        
        const memoryResult = this.menuCategoriesMap.delete(id);
        console.log(`Emergency fallback memory deletion result: ${memoryResult}`);
        return memoryResult;
      } catch (memError) {
        console.error("Memory deletion also failed:", memError);
        return false;
      }
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
    console.log(`Getting menu items ${categoryId ? `for category ${categoryId}` : 'for all categories'}`);
    try {
      let dbResults: MenuItem[] = [];
      if (categoryId) {
        dbResults = await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId));
      } else {
        dbResults = await db.select().from(menuItems);
      }
      console.log(`Found ${dbResults.length} menu items in database`);
      for (const item of dbResults) {
        if (!this.menuItemsMap.has(item.id)) {
          this.menuItemsMap.set(item.id, item);
        }
      }
      let allItems = Array.from(this.menuItemsMap.values());
      if (categoryId) {
        allItems = allItems.filter(item => item.categoryId === categoryId);
      }
      return allItems.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
    } catch (error) {
      console.error("Error getting menu items:", error);
      let memoryItems = Array.from(this.menuItemsMap.values());
      if (categoryId) {
        memoryItems = memoryItems.filter(item => item.categoryId === categoryId);
      }
      return memoryItems.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
    }
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    console.log(`Retrieving menu item with id: ${id}`);
    
    try {
      // Try to get from database first
      const result = await db.select().from(menuItems).where(eq(menuItems.id, id));
      
      if (result.length > 0) {
        const item = result[0];
        console.log(`Found menu item in database: ${item.name}`);
        
        // Update memory cache
        this.menuItemsMap.set(id, item);
        return item;
      }
      
      // If not in database, check memory
      const memoryItem = this.menuItemsMap.get(id);
      if (memoryItem) {
        console.log(`Found menu item in memory: ${memoryItem.name}`);
        return memoryItem;
      }
      
      console.log(`Menu item with id ${id} not found`);
      return undefined;
    } catch (error) {
      console.error("Error getting menu item:", error);
      
      // Fallback to memory only
      const memoryItem = this.menuItemsMap.get(id);
      if (memoryItem) {
        console.log(`Fallback: Found menu item in memory: ${memoryItem.name}`);
        return memoryItem;
      }
      
      return undefined;
    }
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    console.log(`Creating menu item:`, item);
    try {
      const result = await db.insert(menuItems).values(item).returning();
      if (result.length > 0) {
        const newItem = result[0];
        console.log(`Created menu item in database: ${newItem.name} with id ${newItem.id}`);
        this.menuItemsMap.set(newItem.id, newItem);
        return newItem;
      }
    } catch (error) {
      console.error("Error creating menu item in database:", error);
    }
    const id = this.currentMenuItemId++;
    const now = new Date();
    const menuItem: MenuItem = { 
      ...item, 
      id,
      createdAt: now,
      updatedAt: now,
      order: item.order ?? 0,
      categoryId: item.categoryId ?? null,
      description: item.description ?? null
    };
    console.log(`Fallback: Created menu item in memory: ${menuItem.name} with id ${id}`);
    this.menuItemsMap.set(id, menuItem);
    return menuItem;
  }

  async updateMenuItem(id: number, item: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    console.log(`Updating menu item with id ${id}:`, item);
    
    try {
      // First, check if the item exists
      const existingItem = await this.getMenuItem(id);
      if (!existingItem) {
        console.log(`Menu item with id ${id} not found, cannot update`);
        return undefined;
      }
      
      // Update in database
      const result = await db.update(menuItems)
        .set({ ...item, updatedAt: new Date() })
        .where(eq(menuItems.id, id))
        .returning();
      
      if (result.length > 0) {
        const updatedItem = result[0];
        console.log(`Updated menu item in database: ${updatedItem.name}`);
        
        // Update memory cache
        this.menuItemsMap.set(id, updatedItem);
        return updatedItem;
      }
    } catch (error) {
      console.error("Error updating menu item in database:", error);
    }
    
    // Fallback to memory storage
    const memoryItem = this.menuItemsMap.get(id);
    if (!memoryItem) {
      console.log(`Menu item with id ${id} not found in memory, cannot update`);
      return undefined;
    }

    const updatedItem = { 
      ...memoryItem, 
      ...item,
      updatedAt: new Date()
    };
    
    console.log(`Fallback: Updated menu item in memory: ${updatedItem.name}`);
    this.menuItemsMap.set(id, updatedItem);
    return updatedItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete menu item with id: ${id}`);
      
      // First, make sure we have the most up-to-date version of the item
      const itemToDelete = await this.getMenuItem(id);
      if (!itemToDelete) {
        console.log(`Menu item with id ${id} not found`);
        return false;
      }
      
      console.log(`Found menu item to delete:`, itemToDelete);
      
      // Delete from database first
      try {
        const result = await db.delete(menuItems)
          .where(eq(menuItems.id, id))
          .returning();
        console.log(`Database delete result:`, result);
        
        // Then delete from memory cache
        this.menuItemsMap.delete(id);
        
        return result.length > 0;
      } catch (dbError) {
        console.error("Database delete failed:", dbError);
        
        // If DB delete fails, try direct memory deletion as fallback
        const memResult = this.menuItemsMap.delete(id);
        return memResult;
      }
    } catch (error) {
      console.error("Error in deleteMenuItem:", error);
      
      // Last attempt - try memory storage as fallback
      try {
        const memoryResult = this.menuItemsMap.delete(id);
        console.log(`Emergency fallback memory deletion result: ${memoryResult}`);
        return memoryResult;
      } catch (memError) {
        console.error("Memory deletion also failed:", memError);
        return false;
      }
    }
  }

  // Tables
  async getTables(): Promise<Table[]> {
    return Array.from(this.tablesMap.values());
  }

  async getTable(id: number): Promise<Table | undefined> {
    // First check memory
    const memTable = this.tablesMap.get(id);
    if (memTable) return memTable;
    
    // If not in memory, try database
    try {
      const [dbTable] = await db.select().from(tables).where(eq(tables.id, id));
      if (dbTable) {
        // Cache in memory for future lookups
        this.tablesMap.set(id, dbTable);
        return dbTable;
      }
    } catch (error) {
      console.error("Error fetching table from database:", error);
    }
    
    return undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    try {
      // Try to insert into database first
      const [result] = await db.insert(tables).values({
        number: table.number,
        label: table.label,
        description: table.description ?? null,
        layoutId: table.layoutId ?? null,
        isActive: table.isActive ?? false,
        activatedAt: table.activatedAt ?? null,
        peopleCount: table.peopleCount ?? null,
      }).returning();
      
      // Cache in memory
      this.tablesMap.set(result.id, result);
      if (result.id >= this.currentTableId) {
        this.currentTableId = result.id + 1;
      }
      return result;
    } catch (error) {
      console.error("Error creating table in database, using memory fallback:", error);
      // Fallback to memory-only storage
      const id = this.currentTableId++;
      const now = new Date();
      const newTable: Table = {
        id,
        number: table.number,
        label: table.label,
        description: table.description ?? null,
        layoutId: table.layoutId ?? null,
        isActive: table.isActive ?? false,
        activatedAt: table.activatedAt ?? null,
        peopleCount: table.peopleCount ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.tablesMap.set(id, newTable);
      return newTable;
    }
  }

  async updateTable(id: number, table: Partial<InsertTable>): Promise<Table | undefined> {
    const existingTable = this.tablesMap.get(id);
    if (!existingTable) return undefined;

    try {
      // Try to update in database
      const [result] = await db.update(tables)
        .set({ ...table, updatedAt: new Date() })
        .where(eq(tables.id, id))
        .returning();
      
      if (result) {
        this.tablesMap.set(id, result);
        return result;
      }
    } catch (error) {
      console.error("Error updating table in database, using memory fallback:", error);
    }

    // Fallback to memory-only update
    const updatedTable = { ...existingTable, ...table, updatedAt: new Date() };
    this.tablesMap.set(id, updatedTable);
    return updatedTable;
  }

  async deleteTable(id: number): Promise<boolean> {
    try {
      // Try to delete from database
      const result = await db.delete(tables).where(eq(tables.id, id)).returning();
      this.tablesMap.delete(id);
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting table from database, using memory fallback:", error);
      return this.tablesMap.delete(id);
    }
  }

  async activateTable(id: number): Promise<Table | undefined> {
    const table = this.tablesMap.get(id);
    if (!table) return undefined;

    const activatedAt = new Date();
    const updatedTable: Table = { 
      ...table, 
      isActive: true, 
      activatedAt 
    };
    
    // Persist to database
    try {
      await db.update(tables)
        .set({ isActive: true, activatedAt, updatedAt: new Date() })
        .where(eq(tables.id, id));
    } catch (error) {
      console.error("Error persisting table activation to database:", error);
    }
    
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
    
    // Persist to database
    try {
      await db.update(tables)
        .set({ isActive: false, activatedAt: null, updatedAt: new Date() })
        .where(eq(tables.id, id));
    } catch (error) {
      console.error("Error persisting table deactivation to database:", error);
    }
    
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
    try {
      // Fetch from database
      const dbOrders = await db.select().from(orders);
      
      // Update memory cache
      dbOrders.forEach(order => this.ordersMap.set(order.id, order));
      
      return Promise.all(dbOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const table = await this.getTable(order.tableId);
        const isSpecial = order.isSpecialItem ?? false;
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId,
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          notes: order.notes,
          specialItemName: order.specialItemName,
          isSpecialItem: isSpecial,
          menuItemName: (isSpecial && order.specialItemName) ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          tableNumber: table?.number || 'Unknown Table',
          tableLabel: table?.label || '',
          peopleCount: table?.peopleCount ?? 0
        };
      }));
    } catch (error) {
      console.error("Error fetching orders from database:", error);
      
      // Fallback to memory
      const allOrders = Array.from(this.ordersMap.values());
      return Promise.all(allOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const table = await this.getTable(order.tableId);
        const isSpecial = order.isSpecialItem ?? false;
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId,
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          notes: order.notes,
          specialItemName: order.specialItemName,
          isSpecialItem: isSpecial,
          menuItemName: (isSpecial && order.specialItemName) ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          tableNumber: table?.number || 'Unknown Table',
          tableLabel: table?.label || '',
          peopleCount: table?.peopleCount ?? 0
        };
      }));
    }
  }

  async getOrdersByTable(tableId: number): Promise<Order[]> {
    try {
      const dbOrders = await db.select().from(orders).where(eq(orders.tableId, tableId));
      // Update memory cache
      dbOrders.forEach(order => this.ordersMap.set(order.id, order));
      return dbOrders;
    } catch (error) {
      console.error("Error fetching orders by table from database:", error);
      return Array.from(this.ordersMap.values()).filter(order => order.tableId === tableId);
    }
  }

  async getOrdersWithDetailsByTable(tableId: number): Promise<OrderWithDetails[]> {
    const table = await this.getTable(tableId);
    const tableOrders = await this.getOrdersByTable(tableId);
    
    // Filter orders to only show those from the CURRENT table session
    // An order belongs to the current session if it was created after the table was activated
    const currentSessionOrders = tableOrders.filter(order => {
      // If table is not active or has no activatedAt, don't show any orders for current session
      if (!table?.isActive || !table?.activatedAt) {
        return false;
      }
      // Only show orders created after the table was activated for this session
      const orderTime = order.timestamp ? new Date(order.timestamp).getTime() : 0;
      const activatedTime = new Date(table.activatedAt).getTime();
      return orderTime >= activatedTime;
    });
    
    return Promise.all(currentSessionOrders.map(async (order) => {
      const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
      const isSpecial = order.isSpecialItem ?? false;
      return {
        id: order.id,
        tableId: order.tableId,
        menuItemId: order.menuItemId,
        timestamp: order.timestamp,
        completed: order.completed,
        price: order.price,
        notes: order.notes,
        specialItemName: order.specialItemName,
        isSpecialItem: isSpecial,
        menuItemName: (isSpecial && order.specialItemName) ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || '',
        peopleCount: table?.peopleCount ?? 0
      };
    }));
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    try {
      // Save to database
      const [result] = await db.insert(orders).values({
        tableId: order.tableId,
        menuItemId: order.menuItemId ?? null,
        price: order.price,
        timestamp: order.timestamp || new Date(),
        completed: order.completed ?? false,
        notes: order.notes ?? null,
        specialItemName: order.specialItemName ?? null,
        isSpecialItem: order.isSpecialItem ?? null,
        workdayId: order.workdayId ?? null
      }).returning();
      
      // Also store in memory for quick access
      this.ordersMap.set(result.id, result);
      return result;
    } catch (error) {
      console.error("Error creating order in database:", error);
      
      // Fallback to memory only
      const id = this.currentOrderId++;
      const newOrder: Order = {
        id,
        tableId: order.tableId,
        menuItemId: order.menuItemId ?? null,
        price: order.price,
        timestamp: order.timestamp || new Date(),
        completed: order.completed ?? false,
        canceled: order.canceled ?? false,
        notes: order.notes ?? null,
        specialItemName: order.specialItemName ?? null,
        isSpecialItem: order.isSpecialItem ?? null,
        workdayId: order.workdayId ?? null
      };
      this.ordersMap.set(id, newOrder);
      return newOrder;
    }
  }

  async markOrderComplete(id: number): Promise<Order | undefined> {
    try {
      const [result] = await db.update(orders)
        .set({ completed: true })
        .where(eq(orders.id, id))
        .returning();
      
      if (result) {
        this.ordersMap.set(id, result);
      }
      return result;
    } catch (error) {
      console.error("Error marking order complete in database:", error);
      const order = this.ordersMap.get(id);
      if (!order) return undefined;

      const updatedOrder: Order = { ...order, completed: true };
      this.ordersMap.set(id, updatedOrder);
      return updatedOrder;
    }
  }

  async markOrderIncomplete(id: number): Promise<Order | undefined> {
    try {
      const [result] = await db.update(orders)
        .set({ completed: false })
        .where(eq(orders.id, id))
        .returning();
      
      if (result) {
        this.ordersMap.set(id, result);
      }
      return result;
    } catch (error) {
      console.error("Error marking order incomplete in database:", error);
      const order = this.ordersMap.get(id);
      if (!order) return undefined;

      const updatedOrder: Order = { ...order, completed: false };
      this.ordersMap.set(id, updatedOrder);
      return updatedOrder;
    }
  }

  async cancelOrder(id: number): Promise<Order | undefined> {
    try {
      const [result] = await db.update(orders)
        .set({ canceled: true })
        .where(eq(orders.id, id))
        .returning();
      
      if (result) {
        this.ordersMap.set(id, result);
      }
      return result;
    } catch (error) {
      console.error("Error canceling order in database:", error);
      const order = this.ordersMap.get(id);
      if (!order) return undefined;

      const updatedOrder: Order = { ...order, canceled: true };
      this.ordersMap.set(id, updatedOrder);
      return updatedOrder;
    }
  }

  async getNewOrders(): Promise<OrderWithDetails[]> {
    try {
      // Fetch incomplete orders from database
      const dbOrders = await db.select().from(orders).where(eq(orders.completed, false));
      
      // Update memory cache
      dbOrders.forEach(order => this.ordersMap.set(order.id, order));
      
      return Promise.all(dbOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const table = await this.getTable(order.tableId);
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId,
          menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          tableNumber: table?.number || 'Unknown Table',
          tableLabel: table?.label || '',
          notes: order.notes,
          specialItemName: order.specialItemName,
          isSpecialItem: order.isSpecialItem ?? false,
          peopleCount: table?.peopleCount ?? 0
        };
      }));
    } catch (error) {
      console.error("Error fetching new orders from database:", error);
      
      // Fallback to memory
      const allOrders = Array.from(this.ordersMap.values());
      const newOrders = allOrders.filter(order => !order.completed);
      
      return Promise.all(newOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const table = await this.getTable(order.tableId);
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId,
          menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          tableNumber: table?.number || 'Unknown Table',
          tableLabel: table?.label || '',
          notes: order.notes,
          specialItemName: order.specialItemName,
          isSpecialItem: order.isSpecialItem ?? false,
          peopleCount: table?.peopleCount ?? 0
        };
      }));
    }
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
    console.log('Creating DayTemplate with menuItems:', template.menuItems);
    const id = this.currentDayTemplateId++;
    const dayTemplate: DayTemplate = { 
      ...template, 
      id,
      tables: template.tables || [],
      menuItems: template.menuItems || [],
      isTemplate: template.isTemplate ?? false
    };
    this.dayTemplatesMap.set(id, dayTemplate);
    return dayTemplate;
  }

  async updateDayTemplate(id: number, template: Partial<InsertDayTemplate>): Promise<DayTemplate | undefined> {
    console.log('Updating DayTemplate with menuItems:', template.menuItems);
    const existingTemplate = await this.getDayTemplate(id);
    if (!existingTemplate) {
      return undefined;
    }
    const updatedTemplate: DayTemplate = { 
      ...existingTemplate, 
      ...template,
      id,
      menuItems: template.menuItems || existingTemplate.menuItems || [],
      tables: template.tables || existingTemplate.tables || []
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
      const newProfile: UserProfile = {
        id,
        workerId: profile.workerId ?? null,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatarUrl ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
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
        workerId: existingProfile.workerId ?? null,
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
        id,
        name: restaurant.name,
        address: restaurant.address,
        imageUrl: restaurant.imageUrl ?? null,
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
        updatedAt: new Date()
      };

      if (restaurant.name !== undefined) data.name = restaurant.name;
      if (restaurant.address !== undefined) data.address = restaurant.address;
      if (restaurant.imageUrl !== undefined) data.imageUrl = restaurant.imageUrl;

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

  // Fetch menu items for a specific menu
  async getMenuItemsByMenuId(menuId: number): Promise<MenuItem[]> {
    console.log(`Getting menu items for menu ${menuId}`);
    try {
      // First get all categories for this menu
      const categories = await db.select().from(menuCategories).where(eq(menuCategories.menuId, menuId));
      console.log(`Found ${categories.length} categories for menu ${menuId}`);
      
      if (categories.length === 0) {
        console.log('No categories found for menu, returning empty array');
        return [];
      }

      // Get all menu items for these categories
      const categoryIds = categories.map(category => category.id);
      const items = await db.select().from(menuItems).where(inArray(menuItems.categoryId, categoryIds));
      console.log(`Found ${items.length} menu items for menu ${menuId}`);
      
      // Sort items by their order
      const sortedItems = items.sort((a, b) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });

      return sortedItems;
    } catch (error) {
      console.error("Error getting menu items by menu ID:", error);
      return [];
    }
  }

  // Table Layouts
  async getTableLayouts(restaurantId?: number): Promise<TableLayout[]> {
    console.log(`Getting table layouts ${restaurantId ? `for restaurant ${restaurantId}` : 'for all restaurants'}`);
    try {
      let dbResults: TableLayout[] = [];
      if (restaurantId) {
        console.log(`Querying database for layouts with restaurantId: ${restaurantId}`);
        dbResults = await db.select().from(tableLayouts).where(eq(tableLayouts.restaurantId, restaurantId));
        console.log(`Database query returned ${dbResults.length} layouts:`, dbResults);
      } else {
        console.log('Querying database for all layouts');
        dbResults = await db.select().from(tableLayouts);
        console.log(`Database query returned ${dbResults.length} layouts:`, dbResults);
      }

      // If no results from DB, try memory storage
      if (dbResults.length === 0) {
        console.log('No results from database, checking memory storage');
        const memoryLayouts = Array.from(this.tableLayoutsMap.values())
          .filter(l => !restaurantId || l.restaurantId === restaurantId);
        console.log(`Found ${memoryLayouts.length} layouts in memory storage:`, memoryLayouts);
        return memoryLayouts;
      }

      // Update memory storage with database results
      dbResults.forEach(layout => {
        this.tableLayoutsMap.set(layout.id, layout);
      });

      return dbResults;
    } catch (error) {
      console.error("Error getting table layouts:", error);
      console.log('Falling back to memory storage due to error');
      const memoryLayouts = Array.from(this.tableLayoutsMap.values())
        .filter(l => !restaurantId || l.restaurantId === restaurantId);
      console.log(`Found ${memoryLayouts.length} layouts in memory storage:`, memoryLayouts);
      return memoryLayouts;
    }
  }

  async getTableLayout(id: number): Promise<TableLayout | undefined> {
    console.log(`Getting table layout with id: ${id}`);
    try {
      const result = await db.select().from(tableLayouts).where(eq(tableLayouts.id, id));
      return result[0];
    } catch (error) {
      console.error("Error getting table layout:", error);
      return this.tableLayoutsMap.get(id);
    }
  }

  async createTableLayout(layout: InsertTableLayout): Promise<TableLayout> {
    console.log(`Creating table layout:`, layout);
    try {
      const result = await db.insert(tableLayouts).values(layout).returning();
      if (result.length > 0) {
        const newLayout = result[0];
        console.log(`Created table layout in database: ${newLayout.name} with id ${newLayout.id}`);
        this.tableLayoutsMap.set(newLayout.id, newLayout);
        return newLayout;
      }
    } catch (error) {
      console.error("Error creating table layout in database:", error);
    }
    const id = this.currentTableLayoutId++;
    const now = new Date();
    const tableLayout: TableLayout = {
      id,
      name: layout.name,
      restaurantId: layout.restaurantId,
      description: layout.description ?? null,
      createdAt: now,
      updatedAt: now
    };
    console.log(`Fallback: Created table layout in memory: ${tableLayout.name} with id ${id}`);
    this.tableLayoutsMap.set(id, tableLayout);
    return tableLayout;
  }

  async updateTableLayout(id: number, layout: Partial<InsertTableLayout>): Promise<TableLayout | undefined> {
    console.log(`Updating table layout with id ${id}:`, layout);
    try {
      const existingLayout = await this.getTableLayout(id);
      if (!existingLayout) {
        console.log(`Table layout with id ${id} not found, cannot update`);
        return undefined;
      }
      const result = await db.update(tableLayouts)
        .set({ ...layout, updatedAt: new Date() })
        .where(eq(tableLayouts.id, id))
        .returning();
      if (result.length > 0) {
        const updatedLayout = result[0];
        console.log(`Updated table layout in database: ${updatedLayout.name}`);
        this.tableLayoutsMap.set(id, updatedLayout);
        return updatedLayout;
      }
    } catch (error) {
      console.error("Error updating table layout in database:", error);
    }
    const memoryLayout = this.tableLayoutsMap.get(id);
    if (!memoryLayout) {
      console.log(`Table layout with id ${id} not found in memory, cannot update`);
      return undefined;
    }
    const updatedLayout = { 
      ...memoryLayout, 
      ...layout,
      updatedAt: new Date()
    };
    console.log(`Fallback: Updated table layout in memory: ${updatedLayout.name}`);
    this.tableLayoutsMap.set(id, updatedLayout);
    return updatedLayout;
  }

  async deleteTableLayout(id: number): Promise<boolean> {
    console.log(`Deleting table layout with id: ${id}`);
    try {
      const result = await db.delete(tableLayouts).where(eq(tableLayouts.id, id)).returning();
      this.tableLayoutsMap.delete(id);
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting table layout:", error);
      return this.tableLayoutsMap.delete(id);
    }
  }

  async clearOrdersByTable(tableId: number): Promise<void> {
    const idsToDelete: number[] = [];
    this.ordersMap.forEach((order, id) => {
      if (order.tableId === tableId) {
        idsToDelete.push(id);
      }
    });
    idsToDelete.forEach(id => this.ordersMap.delete(id));
  }

  // Workdays
  async getWorkdays(restaurantId?: number): Promise<Workday[]> {
    try {
      let result: Workday[];
      if (restaurantId) {
        result = await db.select().from(workdays).where(eq(workdays.restaurantId, restaurantId));
      } else {
        result = await db.select().from(workdays);
      }
      return result;
    } catch (error) {
      console.error("Error getting workdays:", error);
      const allWorkdays = Array.from(this.workdaysMap.values());
      return restaurantId ? allWorkdays.filter(w => w.restaurantId === restaurantId) : allWorkdays;
    }
  }

  async getWorkday(id: number): Promise<Workday | undefined> {
    try {
      const [result] = await db.select().from(workdays).where(eq(workdays.id, id));
      return result;
    } catch (error) {
      console.error("Error getting workday:", error);
      return this.workdaysMap.get(id);
    }
  }

  async getActiveWorkday(restaurantId: number): Promise<Workday | undefined> {
    try {
      const [result] = await db.select().from(workdays)
        .where(and(eq(workdays.restaurantId, restaurantId), eq(workdays.isActive, true)));
      return result;
    } catch (error) {
      console.error("Error getting active workday:", error);
      return Array.from(this.workdaysMap.values())
        .find(w => w.restaurantId === restaurantId && w.isActive);
    }
  }

  async createWorkday(workday: InsertWorkday): Promise<Workday> {
    try {
      const [result] = await db.insert(workdays).values(workday).returning();
      return result;
    } catch (error) {
      console.error("Error creating workday:", error);
      const id = this.currentWorkdayId++;
      const now = new Date();
      const newWorkday: Workday = {
        id,
        restaurantId: workday.restaurantId,
        date: workday.date,
        menuId: workday.menuId ?? null,
        tableLayoutId: workday.tableLayoutId ?? null,
        startedAt: workday.startedAt ?? null,
        endedAt: workday.endedAt ?? null,
        isActive: workday.isActive ?? false,
        createdAt: now,
        updatedAt: now
      };
      this.workdaysMap.set(id, newWorkday);
      return newWorkday;
    }
  }

  async updateWorkday(id: number, workday: Partial<InsertWorkday>): Promise<Workday | undefined> {
    try {
      const [result] = await db.update(workdays)
        .set({ ...workday, updatedAt: new Date() })
        .where(eq(workdays.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating workday:", error);
      const existing = this.workdaysMap.get(id);
      if (!existing) return undefined;
      const updated: Workday = { ...existing, ...workday, updatedAt: new Date() };
      this.workdaysMap.set(id, updated);
      return updated;
    }
  }

  async startWorkday(id: number): Promise<Workday | undefined> {
    return this.updateWorkday(id, { isActive: true, startedAt: new Date() });
  }

  async endWorkday(id: number): Promise<Workday | undefined> {
    return this.updateWorkday(id, { isActive: false, endedAt: new Date() });
  }

  // Workday Workers
  async getWorkdayWorkers(workdayId: number): Promise<WorkdayWorker[]> {
    try {
      const result = await db.select().from(workdayWorkers).where(eq(workdayWorkers.workdayId, workdayId));
      return result;
    } catch (error) {
      console.error("Error getting workday workers:", error);
      return Array.from(this.workdayWorkersMap.values()).filter(w => w.workdayId === workdayId);
    }
  }

  async addWorkdayWorker(worker: InsertWorkdayWorker): Promise<WorkdayWorker> {
    try {
      const [result] = await db.insert(workdayWorkers).values(worker).returning();
      return result;
    } catch (error) {
      console.error("Error adding workday worker:", error);
      const id = this.currentWorkdayWorkerId++;
      const newWorker: WorkdayWorker = {
        id,
        workdayId: worker.workdayId,
        workerId: worker.workerId,
        joinedAt: new Date()
      };
      this.workdayWorkersMap.set(id, newWorker);
      return newWorker;
    }
  }

  async removeWorkdayWorker(workdayId: number, workerId: string): Promise<boolean> {
    try {
      const result = await db.delete(workdayWorkers)
        .where(and(eq(workdayWorkers.workdayId, workdayId), eq(workdayWorkers.workerId, workerId)))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error removing workday worker:", error);
      const entry = Array.from(this.workdayWorkersMap.entries())
        .find(([_, w]) => w.workdayId === workdayId && w.workerId === workerId);
      if (entry) {
        this.workdayWorkersMap.delete(entry[0]);
        return true;
      }
      return false;
    }
  }

  // Restaurant Workers
  async getRestaurantWorkers(restaurantId: number): Promise<RestaurantWorker[]> {
    try {
      const result = await db.select().from(restaurantWorkers).where(eq(restaurantWorkers.restaurantId, restaurantId));
      return result;
    } catch (error) {
      console.error("Error getting restaurant workers:", error);
      return Array.from(this.restaurantWorkersMap.values()).filter(w => w.restaurantId === restaurantId);
    }
  }

  async getRestaurantWorker(id: number): Promise<RestaurantWorker | undefined> {
    try {
      const [result] = await db.select().from(restaurantWorkers).where(eq(restaurantWorkers.id, id));
      return result;
    } catch (error) {
      console.error("Error getting restaurant worker:", error);
      return this.restaurantWorkersMap.get(id);
    }
  }

  async createRestaurantWorker(worker: InsertRestaurantWorker): Promise<RestaurantWorker> {
    try {
      const [result] = await db.insert(restaurantWorkers).values(worker).returning();
      return result;
    } catch (error) {
      console.error("Error creating restaurant worker:", error);
      const id = this.currentRestaurantWorkerId++;
      const now = new Date();
      const newWorker: RestaurantWorker = {
        id,
        restaurantId: worker.restaurantId,
        workerId: worker.workerId,
        name: worker.name,
        email: worker.email ?? null,
        role: worker.role ?? 'worker',
        permissions: worker.permissions ?? null,
        status: worker.status ?? 'pending',
        avatarUrl: worker.avatarUrl ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.restaurantWorkersMap.set(id, newWorker);
      return newWorker;
    }
  }

  async updateRestaurantWorker(id: number, worker: Partial<InsertRestaurantWorker>): Promise<RestaurantWorker | undefined> {
    try {
      const [result] = await db.update(restaurantWorkers)
        .set({ ...worker, updatedAt: new Date() })
        .where(eq(restaurantWorkers.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating restaurant worker:", error);
      const existing = this.restaurantWorkersMap.get(id);
      if (!existing) return undefined;
      const updated: RestaurantWorker = { ...existing, ...worker, updatedAt: new Date() };
      this.restaurantWorkersMap.set(id, updated);
      return updated;
    }
  }

  async deleteRestaurantWorker(id: number): Promise<boolean> {
    try {
      const result = await db.delete(restaurantWorkers).where(eq(restaurantWorkers.id, id)).returning();
      this.restaurantWorkersMap.delete(id);
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting restaurant worker:", error);
      return this.restaurantWorkersMap.delete(id);
    }
  }

  // History
  async getOrdersByDate(restaurantId: number, date: string): Promise<OrderWithDetails[]> {
    // Get workday for the given date and restaurant
    const workday = await this.getWorkdayByDate(restaurantId, date);
    if (!workday) {
      return [];
    }

    try {
      // Get all orders for that workday from the database
      const dbOrders = await db.select().from(orders)
        .where(eq(orders.workdayId, workday.id));
      
      // Get all unique table IDs and their status including activatedAt for session tracking
      const tableIds = [...new Set(dbOrders.map(o => o.tableId))];
      const tableStatusMap = new Map<number, { isActive: boolean; activatedAt: Date | null; tableNumber: string; tableLabel: string | null; peopleCount: number }>();
      for (const tableId of tableIds) {
        const table = await this.getTable(tableId);
        if (table) {
          tableStatusMap.set(tableId, {
            isActive: table.isActive ?? false,
            activatedAt: table.activatedAt,
            tableNumber: table.number,
            tableLabel: table.label,
            peopleCount: table.peopleCount || 0,
          });
        }
      }
      
      // Filter orders to include those from:
      // 1. Closed tables - all orders
      // 2. Active tables - only orders from PREVIOUS sessions (before current activation)
      const historyOrders = dbOrders.filter(order => {
        const tableStatus = tableStatusMap.get(order.tableId);
        if (!tableStatus) return false;
        
        if (tableStatus.isActive === false) {
          return true;
        }
        
        if (tableStatus.activatedAt) {
          const orderTime = new Date(order.timestamp).getTime();
          const activatedTime = new Date(tableStatus.activatedAt).getTime();
          return orderTime < activatedTime;
        }
        
        return false;
      });
      
      return Promise.all(historyOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const tableData = tableStatusMap.get(order.tableId);
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId ?? null,
          menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          tableNumber: tableData?.tableNumber || 'Unknown',
          tableLabel: tableData?.tableLabel || '',
          notes: order.notes ?? null,
          specialItemName: order.specialItemName ?? null,
          isSpecialItem: order.isSpecialItem ?? false,
          peopleCount: tableData?.peopleCount ?? 0
        };
      }));
    } catch (error) {
      console.error("Error getting orders by date from database:", error);
      
      // Fallback to memory
      const allOrders = Array.from(this.ordersMap.values())
        .filter(order => order.workdayId === workday.id);
      
      // Get table status for filtering including activatedAt for session tracking
      const tableIds = [...new Set(allOrders.map(o => o.tableId))];
      const tableStatusMap = new Map<number, { isActive: boolean; activatedAt: Date | null; tableNumber: string; tableLabel: string | null; peopleCount: number }>();
      for (const tableId of tableIds) {
        const table = await this.getTable(tableId);
        if (table) {
          tableStatusMap.set(tableId, {
            isActive: table.isActive ?? false,
            activatedAt: table.activatedAt,
            tableNumber: table.number,
            tableLabel: table.label,
            peopleCount: table.peopleCount || 0,
          });
        }
      }
      
      // Filter orders to include those from:
      // 1. Closed tables - all orders
      // 2. Active tables - only orders from PREVIOUS sessions
      const historyOrders = allOrders.filter(order => {
        const tableStatus = tableStatusMap.get(order.tableId);
        if (!tableStatus) return false;
        
        if (tableStatus.isActive === false) {
          return true;
        }
        
        if (tableStatus.activatedAt) {
          const orderTime = new Date(order.timestamp).getTime();
          const activatedTime = new Date(tableStatus.activatedAt).getTime();
          return orderTime < activatedTime;
        }
        
        return false;
      });

      return Promise.all(historyOrders.map(async (order) => {
        const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
        const tableData = tableStatusMap.get(order.tableId);
        return {
          id: order.id,
          tableId: order.tableId,
          menuItemId: order.menuItemId ?? null,
          menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
          timestamp: order.timestamp,
          completed: order.completed,
          price: order.price,
          tableNumber: tableData?.tableNumber || 'Unknown',
          tableLabel: tableData?.tableLabel || '',
          notes: order.notes ?? null,
          specialItemName: order.specialItemName ?? null,
          isSpecialItem: order.isSpecialItem ?? false,
          peopleCount: tableData?.peopleCount ?? 0
        };
      }));
    }
  }

  private async getWorkdayByDate(restaurantId: number, date: string): Promise<Workday | undefined> {
    try {
      const [result] = await db.select().from(workdays)
        .where(and(eq(workdays.restaurantId, restaurantId), eq(workdays.date, date)));
      return result;
    } catch (error) {
      console.error("Error getting workday by date:", error);
      return Array.from(this.workdaysMap.values())
        .find(w => w.restaurantId === restaurantId && w.date === date);
    }
  }

  async getHistorySummary(restaurantId: number, date: string): Promise<{
    totalRevenue: number;
    orderCount: number;
    tablesServed: number;
    orders: OrderWithDetails[];
  }> {
    const orders = await this.getOrdersByDate(restaurantId, date);
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
    const uniqueTables = new Set(orders.map(order => order.tableId));

    return {
      totalRevenue,
      orderCount: orders.length,
      tablesServed: uniqueTables.size,
      orders
    };
  }

  async getDetailedHistory(restaurantId: number, date: string): Promise<{
    shifts: Array<{
      id: number;
      startedAt: Date | null;
      endedAt: Date | null;
      isActive: boolean;
      workers: Array<{
        workerId: string;
        joinedAt: Date;
      }>;
      revenue: number;
      orderCount: number;
      tablesServed: number;
      peopleServed: number;
      orders: OrderWithDetails[];
    }>;
    totals: {
      revenue: number;
      orderCount: number;
      tablesServed: number;
      peopleServed: number;
      workersCount: number;
    };
  }> {
    try {
      // Get all workdays for this date (can be multiple shifts)
      const allWorkdays = await db.select().from(workdays)
        .where(and(eq(workdays.restaurantId, restaurantId), eq(workdays.date, date)));
      
      // Build shift data
      const shifts = await Promise.all(allWorkdays.map(async (workday) => {
        // Get workers for this shift
        const workers = await this.getWorkdayWorkers(workday.id);
        
        // Get orders for this workday
        const dbOrders = await db.select().from(orders)
          .where(eq(orders.workdayId, workday.id));
        
        // Get all unique table IDs from orders
        const tableIds = [...new Set(dbOrders.map(o => o.tableId))];
        
        // Get table data including activatedAt for session tracking
        const tableStatusMap = new Map<number, { isActive: boolean; activatedAt: Date | null; tableNumber: string; tableLabel: string | null; peopleCount: number }>();
        for (const tableId of tableIds) {
          const table = await this.getTable(tableId);
          if (table) {
            tableStatusMap.set(tableId, {
              isActive: table.isActive ?? false,
              activatedAt: table.activatedAt,
              tableNumber: table.number,
              tableLabel: table.label,
              peopleCount: table.peopleCount || 0,
            });
          }
        }
        
        // Filter orders to include those from:
        // 1. Closed tables (isActive = false) - all orders
        // 2. Active tables BUT only orders from PREVIOUS sessions (order.timestamp < table.activatedAt)
        const historyOrders = dbOrders.filter(order => {
          const tableStatus = tableStatusMap.get(order.tableId);
          if (!tableStatus) return false;
          
          // If table is closed, include all its orders
          if (tableStatus.isActive === false) {
            return true;
          }
          
          // If table is active, only include orders from PREVIOUS sessions
          // (orders created before the current activation time)
          if (tableStatus.activatedAt) {
            const orderTime = new Date(order.timestamp).getTime();
            const activatedTime = new Date(tableStatus.activatedAt).getTime();
            return orderTime < activatedTime;
          }
          
          // If no activatedAt, exclude (shouldn't happen normally)
          return false;
        });
        
        // Enrich orders with details
        const enrichedOrders: OrderWithDetails[] = await Promise.all(historyOrders.map(async (order) => {
          const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
          const tableData = tableStatusMap.get(order.tableId);
          return {
            id: order.id,
            tableId: order.tableId,
            menuItemId: order.menuItemId,
            menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
            timestamp: order.timestamp,
            completed: order.completed,
            price: order.price,
            tableNumber: tableData?.tableNumber || String(order.tableId),
            tableLabel: tableData?.tableLabel || '',
            notes: order.notes,
            specialItemName: order.specialItemName,
            isSpecialItem: order.isSpecialItem ?? false,
            peopleCount: tableData?.peopleCount || 0,
          };
        }));
        
        // Calculate stats for this shift (only from closed tables)
        const revenue = enrichedOrders.reduce((sum, order) => sum + order.price, 0);
        const uniqueTables = new Set(enrichedOrders.map(order => order.tableId));
        const uniquePeople = enrichedOrders.reduce((map, order) => {
          if (order.tableId && order.peopleCount && !map.has(order.tableId)) {
            map.set(order.tableId, order.peopleCount);
          }
          return map;
        }, new Map<number, number>());
        const peopleServed = Array.from(uniquePeople.values()).reduce((sum, count) => sum + count, 0);
        
        return {
          id: workday.id,
          startedAt: workday.startedAt,
          endedAt: workday.endedAt,
          isActive: workday.isActive ?? false,
          workers: workers.map(w => ({ workerId: w.workerId, joinedAt: w.joinedAt ?? new Date() })),
          revenue,
          orderCount: enrichedOrders.length,
          tablesServed: uniqueTables.size,
          peopleServed,
          orders: enrichedOrders,
        };
      }));
      
      // Sort shifts by start time (earliest first)
      shifts.sort((a, b) => {
        const aTime = a.startedAt?.getTime() || 0;
        const bTime = b.startedAt?.getTime() || 0;
        return aTime - bTime;
      });
      
      // Calculate totals across all shifts
      const allOrders = shifts.flatMap(s => s.orders);
      const allUniqueTables = new Set(allOrders.map(o => o.tableId));
      const allUniquePeople = allOrders.reduce((map, order) => {
        if (order.tableId && order.peopleCount && !map.has(order.tableId)) {
          map.set(order.tableId, order.peopleCount);
        }
        return map;
      }, new Map<number, number>());
      const allUniqueWorkers = new Set(shifts.flatMap(s => s.workers.map(w => w.workerId)));
      
      return {
        shifts,
        totals: {
          revenue: shifts.reduce((sum, s) => sum + s.revenue, 0),
          orderCount: allOrders.length,
          tablesServed: allUniqueTables.size,
          peopleServed: Array.from(allUniquePeople.values()).reduce((sum, count) => sum + count, 0),
          workersCount: allUniqueWorkers.size,
        },
      };
    } catch (error) {
      console.error("Error getting detailed history:", error);
      // Fallback to memory-based approach
      const allWorkdays = Array.from(this.workdaysMap.values())
        .filter(w => w.restaurantId === restaurantId && w.date === date);
      
      const shifts = await Promise.all(allWorkdays.map(async (workday) => {
        const workers = await this.getWorkdayWorkers(workday.id);
        const allOrders = Array.from(this.ordersMap.values())
          .filter(order => order.workdayId === workday.id);
        
        // Get all unique table IDs from orders
        const tableIds = [...new Set(allOrders.map(o => o.tableId))];
        
        // Get table data including activatedAt for session tracking
        const tableStatusMap = new Map<number, { isActive: boolean; activatedAt: Date | null; tableNumber: string; tableLabel: string | null; peopleCount: number }>();
        for (const tableId of tableIds) {
          const table = await this.getTable(tableId);
          if (table) {
            tableStatusMap.set(tableId, {
              isActive: table.isActive ?? false,
              activatedAt: table.activatedAt,
              tableNumber: table.number,
              tableLabel: table.label,
              peopleCount: table.peopleCount || 0,
            });
          }
        }
        
        // Filter orders to include those from:
        // 1. Closed tables (isActive = false) - all orders
        // 2. Active tables BUT only orders from PREVIOUS sessions
        const historyOrders = allOrders.filter(order => {
          const tableStatus = tableStatusMap.get(order.tableId);
          if (!tableStatus) return false;
          
          if (tableStatus.isActive === false) {
            return true;
          }
          
          if (tableStatus.activatedAt) {
            const orderTime = new Date(order.timestamp).getTime();
            const activatedTime = new Date(tableStatus.activatedAt).getTime();
            return orderTime < activatedTime;
          }
          
          return false;
        });
        
        const enrichedOrders: OrderWithDetails[] = await Promise.all(historyOrders.map(async (order) => {
          const menuItem = order.menuItemId ? await this.getMenuItem(order.menuItemId) : null;
          const tableData = tableStatusMap.get(order.tableId);
          return {
            id: order.id,
            tableId: order.tableId,
            menuItemId: order.menuItemId,
            menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
            timestamp: order.timestamp,
            completed: order.completed,
            price: order.price,
            tableNumber: tableData?.tableNumber || String(order.tableId),
            tableLabel: tableData?.tableLabel || '',
            notes: order.notes,
            specialItemName: order.specialItemName,
            isSpecialItem: order.isSpecialItem ?? false,
            peopleCount: tableData?.peopleCount || 0,
          };
        }));

        const revenue = enrichedOrders.reduce((sum, order) => sum + order.price, 0);
        const uniqueTables = new Set(enrichedOrders.map(order => order.tableId));
        const uniquePeople = enrichedOrders.reduce((map, order) => {
          if (order.tableId && order.peopleCount && !map.has(order.tableId)) {
            map.set(order.tableId, order.peopleCount);
          }
          return map;
        }, new Map<number, number>());
        const peopleServed = Array.from(uniquePeople.values()).reduce((sum, count) => sum + count, 0);
        
        return {
          id: workday.id,
          startedAt: workday.startedAt,
          endedAt: workday.endedAt,
          isActive: workday.isActive ?? false,
          workers: workers.map(w => ({ workerId: w.workerId, joinedAt: w.joinedAt ?? new Date() })),
          revenue,
          orderCount: enrichedOrders.length,
          tablesServed: uniqueTables.size,
          peopleServed,
          orders: enrichedOrders,
        };
      }));
      
      shifts.sort((a, b) => {
        const aTime = a.startedAt?.getTime() || 0;
        const bTime = b.startedAt?.getTime() || 0;
        return aTime - bTime;
      });
      
      const allOrders = shifts.flatMap(s => s.orders);
      const allUniqueTables = new Set(allOrders.map(o => o.tableId));
      const allUniquePeople = allOrders.reduce((map, order) => {
        if (order.tableId && order.peopleCount && !map.has(order.tableId)) {
          map.set(order.tableId, order.peopleCount);
        }
        return map;
      }, new Map<number, number>());
      const allUniqueWorkers = new Set(shifts.flatMap(s => s.workers.map(w => w.workerId)));
      
      return {
        shifts,
        totals: {
          revenue: shifts.reduce((sum, s) => sum + s.revenue, 0),
          orderCount: allOrders.length,
          tablesServed: allUniqueTables.size,
          peopleServed: Array.from(allUniquePeople.values()).reduce((sum, count) => sum + count, 0),
          workersCount: allUniqueWorkers.size,
        },
      };
    }
  }

  // Reminders
  async getReminders(restaurantId: number): Promise<Reminder[]> {
    try {
      const result = await db.select().from(reminders)
        .where(eq(reminders.restaurantId, restaurantId))
        .orderBy(desc(reminders.createdAt));
      return result;
    } catch (error) {
      console.error("Error getting reminders:", error);
      return Array.from(this.remindersMap.values())
        .filter(r => r.restaurantId === restaurantId)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
    }
  }

  async createReminder(reminder: InsertReminder): Promise<Reminder> {
    try {
      const [result] = await db.insert(reminders).values(reminder).returning();
      return result;
    } catch (error) {
      console.error("Error creating reminder:", error);
      const id = this.currentReminderId++;
      const newReminder: Reminder = {
        id,
        restaurantId: reminder.restaurantId,
        text: reminder.text,
        createdBy: reminder.createdBy,
        createdByName: reminder.createdByName,
        isImportant: reminder.isImportant ?? false,
        createdAt: new Date()
      };
      this.remindersMap.set(id, newReminder);
      return newReminder;
    }
  }

  async deleteReminder(id: number): Promise<boolean> {
    try {
      const result = await db.delete(reminders).where(eq(reminders.id, id)).returning();
      this.remindersMap.delete(id);
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting reminder:", error);
      return this.remindersMap.delete(id);
    }
  }

  // Statistics with timeframe
  async getStatistics(restaurantId: number, timeframe: 'week' | 'month' | 'quarter' | 'year'): Promise<{
    revenue: number;
    peopleCount: number;
    topItems: Array<{ name: string; count: number; revenue: number }>;
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'week': {
        // Current week: Monday to Sunday
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
        break;
      }
      case 'month': {
        // Current calendar month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
      case 'quarter': {
        // 4-month periods: Jan-Apr, May-Aug, Sep-Dec
        const month = now.getMonth(); // 0-11
        const quarterStart = month < 4 ? 0 : month < 8 ? 4 : 8;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      }
      case 'year': {
        // Current calendar year
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      }
    }

    try {
      // Get workdays in the timeframe
      const relevantWorkdays = await db.select().from(workdays)
        .where(eq(workdays.restaurantId, restaurantId));

      const workdayIds = relevantWorkdays
        .filter(w => {
          const workdayDate = new Date(w.date);
          return workdayDate >= startDate && workdayDate <= now;
        })
        .map(w => w.id);

      if (workdayIds.length === 0) {
        return { revenue: 0, peopleCount: 0, topItems: [] };
      }

      // Get all orders for these workdays from the database
      const allOrders = await db.select().from(orders)
        .where(inArray(orders.workdayId, workdayIds));

      // Split workdays into ended (historical) vs active (current)
      const filteredWorkdays = relevantWorkdays.filter(w => {
        const workdayDate = new Date(w.date);
        return workdayDate >= startDate && workdayDate <= now;
      });
      const endedWorkdayIds = new Set(filteredWorkdays.filter(w => !w.isActive).map(w => w.id));
      const activeWorkday = filteredWorkdays.find(w => w.isActive);

      // For ended workdays: include ALL orders (historical, already finalized)
      // For active workday: only include orders from tables that are currently CLOSED
      const closedTableOrders: typeof allOrders = [];

      // All orders from ended workdays are included
      for (const order of allOrders) {
        if (endedWorkdayIds.has(order.workdayId!)) {
          closedTableOrders.push(order);
        }
      }

      // For active workday, only include orders from currently-closed tables
      if (activeWorkday) {
        const activeWorkdayOrders = allOrders.filter(o => o.workdayId === activeWorkday.id);
        const activeWorkdayTableIds = new Set(activeWorkdayOrders.map(o => o.tableId));
        for (const tableId of activeWorkdayTableIds) {
          const table = await this.getTable(tableId);
          if (table && !table.isActive) {
            // Table is closed — include its orders from this workday
            closedTableOrders.push(...activeWorkdayOrders.filter(o => o.tableId === tableId));
          }
        }
      }

      // Calculate revenue from closed tables only
      const revenue = closedTableOrders.reduce((sum, order) => sum + order.price, 0);

      // Sum people count from unique tables in active workday that are closed
      let peopleCount = 0;
      const countedTableIds = new Set<number>();
      for (const order of closedTableOrders) {
        if (!countedTableIds.has(order.tableId)) {
          countedTableIds.add(order.tableId);
          const table = await this.getTable(order.tableId);
          if (table?.peopleCount) {
            peopleCount += table.peopleCount;
          }
        }
      }

      // Calculate top items from closed tables only
      const itemCounts = new Map<string, { count: number; revenue: number }>();

      for (const order of closedTableOrders) {
        let itemName: string;
        if (order.isSpecialItem && order.specialItemName) {
          itemName = order.specialItemName;
        } else if (order.menuItemId) {
          const menuItem = await this.getMenuItem(order.menuItemId);
          itemName = menuItem?.name || 'Unknown Item';
        } else {
          itemName = 'Unknown Item';
        }

        const existing = itemCounts.get(itemName) || { count: 0, revenue: 0 };
        itemCounts.set(itemName, {
          count: existing.count + 1,
          revenue: existing.revenue + order.price
        });
      }

      const topItems = Array.from(itemCounts.entries())
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return { revenue, peopleCount, topItems };
    } catch (error) {
      console.error("Error getting statistics:", error);
      return { revenue: 0, peopleCount: 0, topItems: [] };
    }
  }

  // Get top workers by working time
  async getTopWorkersByTime(restaurantId: number, startDate: Date, endDate: Date): Promise<Array<{
    workerId: string;
    name: string;
    totalMinutes: number;
  }>> {
    try {
      // Get workdays for this restaurant within the date range
      const restaurantWorkdays = await db.select().from(workdays)
        .where(eq(workdays.restaurantId, restaurantId));

      const filteredWorkdays = restaurantWorkdays.filter(wd => {
        if (!wd.startedAt) return false;
        const wdDate = new Date(wd.startedAt);
        return wdDate >= startDate && wdDate <= endDate;
      });

      if (filteredWorkdays.length === 0) {
        return [];
      }

      const workdayIds = filteredWorkdays.map(wd => wd.id);

      // Get all workers who worked during these workdays
      const allWorkdayWorkers = await db.select().from(workdayWorkers)
        .where(inArray(workdayWorkers.workdayId, workdayIds));

      // Calculate total working time for each worker
      const workerTimeMap = new Map<string, { totalMinutes: number; name: string }>();

      for (const ww of allWorkdayWorkers) {
        const workday = filteredWorkdays.find(wd => wd.id === ww.workdayId);
        if (!workday) continue;

        const joinedAt = new Date(ww.joinedAt!);
        const endTime = workday.endedAt ? new Date(workday.endedAt) : new Date();
        const minutesWorked = Math.max(0, (endTime.getTime() - joinedAt.getTime()) / (1000 * 60));

        const existing = workerTimeMap.get(ww.workerId) || { totalMinutes: 0, name: ww.workerId };
        workerTimeMap.set(ww.workerId, {
          totalMinutes: existing.totalMinutes + minutesWorked,
          name: existing.name
        });
      }

      // Get worker names from restaurant workers
      const restaurantWorkersList = await this.getRestaurantWorkers(restaurantId);
      for (const rw of restaurantWorkersList) {
        if (workerTimeMap.has(rw.workerId)) {
          const data = workerTimeMap.get(rw.workerId)!;
          data.name = rw.name;
        }
      }

      // Convert to array and sort by total minutes (descending)
      const topWorkers = Array.from(workerTimeMap.entries())
        .map(([workerId, data]) => ({
          workerId,
          name: data.name,
          totalMinutes: Math.round(data.totalMinutes)
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes)
        .slice(0, 3);

      return topWorkers;
    } catch (error) {
      console.error("Error getting top workers by time:", error);
      return [];
    }
  }

  // Get detailed worker statistics
  async getWorkerStatistics(workerId: string, startDate: Date, endDate: Date): Promise<{
    totalHours: number;
    shiftsCount: number;
    averageShiftLength: number;
    restaurants: Array<{ id: number; name: string; hours: number }>;
  }> {
    try {
      // Get all workday workers entries for this worker
      const allWorkdayWorkers = await db.select().from(workdayWorkers)
        .where(eq(workdayWorkers.workerId, workerId));

      if (allWorkdayWorkers.length === 0) {
        return { totalHours: 0, shiftsCount: 0, averageShiftLength: 0, restaurants: [] };
      }

      const workdayIds = allWorkdayWorkers.map(ww => ww.workdayId);

      // Get corresponding workdays
      const workerWorkdays = await db.select().from(workdays)
        .where(inArray(workdays.id, workdayIds));

      // Filter by date range
      const filteredWorkdays = workerWorkdays.filter(wd => {
        if (!wd.startedAt) return false;
        const wdDate = new Date(wd.startedAt);
        return wdDate >= startDate && wdDate <= endDate;
      });

      if (filteredWorkdays.length === 0) {
        return { totalHours: 0, shiftsCount: 0, averageShiftLength: 0, restaurants: [] };
      }

      // Calculate statistics
      let totalMinutes = 0;
      const restaurantHoursMap = new Map<number, number>();

      for (const wd of filteredWorkdays) {
        const workerEntry = allWorkdayWorkers.find(ww => ww.workdayId === wd.id);
        if (!workerEntry || !workerEntry.joinedAt) continue;

        const joinedAt = new Date(workerEntry.joinedAt);
        const endTime = wd.endedAt ? new Date(wd.endedAt) : new Date();
        const minutesWorked = Math.max(0, (endTime.getTime() - joinedAt.getTime()) / (1000 * 60));

        totalMinutes += minutesWorked;

        // Track hours per restaurant
        const currentHours = restaurantHoursMap.get(wd.restaurantId) || 0;
        restaurantHoursMap.set(wd.restaurantId, currentHours + minutesWorked / 60);
      }

      // Get restaurant names
      const restaurantStats: Array<{ id: number; name: string; hours: number }> = [];
      for (const [restaurantId, hours] of restaurantHoursMap.entries()) {
        const restaurant = await this.getRestaurant(restaurantId);
        restaurantStats.push({
          id: restaurantId,
          name: restaurant?.name || `Restaurant ${restaurantId}`,
          hours: Math.round(hours * 10) / 10
        });
      }

      const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
      const shiftsCount = filteredWorkdays.length;
      const averageShiftLength = shiftsCount > 0 ? Math.round(totalHours / shiftsCount * 10) / 10 : 0;

      return {
        totalHours,
        shiftsCount,
        averageShiftLength,
        restaurants: restaurantStats.sort((a, b) => b.hours - a.hours)
      };
    } catch (error) {
      console.error("Error getting worker statistics:", error);
      return { totalHours: 0, shiftsCount: 0, averageShiftLength: 0, restaurants: [] };
    }
  }
}

export const storage = new MemStorage();
