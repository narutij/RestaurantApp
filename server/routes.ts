import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db"; // Add database import
import { 
  insertMenuItemSchema, 
  insertTableSchema, 
  insertOrderSchema,
  insertDayTemplateSchema,
  userProfileSchema,
  insertRestaurantSchema,
  WebSocketMessage,
  userProfiles,
  insertMenuSchema,
  insertMenuCategorySchema
} from "@shared/schema";
import { eq } from "drizzle-orm"; // Add eq import for database queries
import { log } from "./vite";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for file uploads
const storage_uploads = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage_uploads });

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients
  const clients = new Set<WebSocket>();
  
  // WebSocket connection handling
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    // Send connected users count
    broadcastConnectedUsers();
    
    // Handle client disconnect
    ws.on('close', () => {
      clients.delete(ws);
      broadcastConnectedUsers();
    });
    
    // Handle messages from client
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        switch(message.type) {
          case "COMPLETE_ORDER":
            if (typeof message.payload === 'number') {
              const updatedOrder = await storage.markOrderComplete(message.payload);
              if (updatedOrder) {
                broadcastToAll({
                  type: "COMPLETE_ORDER",
                  payload: updatedOrder
                });
              }
            }
            break;
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    });
  });
  
  // Function to broadcast to all connected clients
  function broadcastToAll(message: WebSocketMessage) {
    const messageStr = JSON.stringify(message);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
  
  // Function to broadcast connected users count
  function broadcastConnectedUsers() {
    broadcastToAll({
      type: "CONNECTED_USERS",
      payload: { count: clients.size }
    });
  }
  
  // API Routes
  // Menus
  app.get('/api/menus', async (req: Request, res: Response) => {
    const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId as string, 10) : undefined;
    const menus = await storage.getMenus(restaurantId);
    res.json(menus);
  });
  
  app.get('/api/menus/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const menu = await storage.getMenu(id);
      
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      res.status(500).json({ error: "Failed to get menu" });
    }
  });
  
  app.post('/api/menus', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMenuSchema.parse(req.body);
      const menu = await storage.createMenu(validatedData);
      res.status(201).json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create menu" });
    }
  });
  
  app.put('/api/menus/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validatedData = insertMenuSchema.partial().parse(req.body);
      const menu = await storage.updateMenu(id, validatedData);
      
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      res.json(menu);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update menu" });
    }
  });
  
  app.delete('/api/menus/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      console.log(`API Request: Deleting menu with ID: ${id}`);
      
      // First check if the menu exists
      const menu = await storage.getMenu(id);
      if (!menu) {
        console.log(`API Error: Menu with ID ${id} not found`);
        return res.status(404).json({ error: "Menu not found" });
      }
      
      // Get all categories for this menu so we can delete them first
      const categories = await storage.getMenuCategories(id);
      if (categories.length > 0) {
        console.log(`Found ${categories.length} categories to delete for menu ${id}`);
        
        // Delete each category (which will also delete its items)
        for (const category of categories) {
          await storage.deleteMenuCategory(category.id);
          console.log(`Deleted category ${category.id} from menu ${id}`);
        }
      }
      
      // Now delete the menu itself
      const result = await storage.deleteMenu(id);
      
      if (!result) {
        console.log(`API Error: Failed to delete menu with ID ${id}`);
        return res.status(500).json({ error: "Failed to delete the menu" });
      }
      
      console.log(`API Success: Menu with ID ${id} deleted successfully`);
      return res.status(200).json({ 
        success: true, 
        message: "Menu deleted successfully",
        menuId: id
      });
    } catch (error) {
      console.error(`API Error: Exception when deleting menu:`, error);
      res.status(500).json({ error: "Failed to delete menu" });
    }
  });
  
  // Menu Categories
  app.get('/api/menu-categories', async (req: Request, res: Response) => {
    try {
      const menuId = req.query.menuId ? parseInt(req.query.menuId as string, 10) : null;
      
      if (!menuId) {
        return res.status(400).json({ error: "Menu ID is required" });
      }
      
      const categories = await storage.getMenuCategories(menuId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to get menu categories" });
    }
  });
  
  app.get('/api/menu-categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const category = await storage.getMenuCategory(id);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to get category" });
    }
  });
  
  app.post('/api/menu-categories', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMenuCategorySchema.parse(req.body);
      const category = await storage.createMenuCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create category" });
    }
  });
  
  app.put('/api/menu-categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validatedData = insertMenuCategorySchema.partial().parse(req.body);
      const category = await storage.updateMenuCategory(id, validatedData);
      
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update category" });
    }
  });
  
  app.delete('/api/menu-categories/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      console.log(`API Request: Deleting menu category with ID: ${id}`);
      
      // First verify the category exists
      const category = await storage.getMenuCategory(id);
      if (!category) {
        console.log(`API Error: Menu category with ID ${id} not found`);
        return res.status(404).json({ error: "Category not found" });
      }
      
      // Then attempt to delete it along with all its items
      const result = await storage.deleteMenuCategory(id);
      
      if (!result) {
        console.log(`API Error: Failed to delete menu category with ID ${id}`);
        return res.status(500).json({ error: "Failed to delete the category" });
      }
      
      console.log(`API Success: Menu category with ID ${id} and all its items deleted successfully`);
      // Return JSON success response instead of empty 204
      return res.status(200).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error(`API Error: Exception when deleting menu category:`, error);
      res.status(500).json({ error: "Failed to delete category" });
    }
  });
  
  // Menu Items
  app.get('/api/menu-items', async (req: Request, res: Response) => {
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
    const menuItems = await storage.getMenuItems(categoryId);
    res.json(menuItems);
  });
  
  app.get('/api/menu-items/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const menuItem = await storage.getMenuItem(id);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to get menu item" });
    }
  });
  
  app.post('/api/menu-items', async (req: Request, res: Response) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create menu item" });
    }
  });
  
  app.put('/api/menu-items/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validatedData = insertMenuItemSchema.partial().parse(req.body);
      const menuItem = await storage.updateMenuItem(id, validatedData);
      
      if (!menuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update menu item" });
    }
  });
  
  app.delete('/api/menu-items/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      console.log(`API Request: Deleting menu item with ID: ${id}`);
      
      // First verify the item exists
      const item = await storage.getMenuItem(id);
      if (!item) {
        console.log(`API Error: Menu item with ID ${id} not found`);
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      // Then attempt to delete it
      const result = await storage.deleteMenuItem(id);
      
      if (!result) {
        console.log(`API Error: Failed to delete menu item with ID ${id}`);
        return res.status(500).json({ error: "Failed to delete the menu item" });
      }
      
      console.log(`API Success: Menu item with ID ${id} deleted successfully`);
      // Return JSON success response instead of empty 204
      return res.status(200).json({ 
        success: true, 
        message: "Menu item deleted successfully",
        itemId: id,
        categoryId: item.categoryId 
      });
    } catch (error) {
      console.error(`API Error: Exception when deleting menu item:`, error);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });
  
  // Tables
  app.get('/api/tables', async (req: Request, res: Response) => {
    const tables = await storage.getTables();
    res.json(tables);
  });
  
  app.post('/api/tables', async (req: Request, res: Response) => {
    try {
      const validatedData = insertTableSchema.parse(req.body);
      const table = await storage.createTable(validatedData);
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create table" });
    }
  });
  
  app.put('/api/tables/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const validatedData = insertTableSchema.partial().parse(req.body);
      const table = await storage.updateTable(id, validatedData);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      res.json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update table" });
    }
  });
  
  app.delete('/api/tables/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await storage.deleteTable(id);
      
      if (!result) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete table" });
    }
  });
  
  app.post('/api/tables/:id/activate', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const table = await storage.activateTable(id);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      broadcastToAll({
        type: "ACTIVATE_TABLE",
        payload: table
      });
      
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: "Failed to activate table" });
    }
  });
  
  app.post('/api/tables/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const table = await storage.deactivateTable(id);
      
      if (!table) {
        return res.status(404).json({ error: "Table not found" });
      }
      
      broadcastToAll({
        type: "DEACTIVATE_TABLE",
        payload: table
      });
      
      res.json(table);
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate table" });
    }
  });
  
  app.get('/api/tables/active', async (req: Request, res: Response) => {
    const tables = await storage.getActiveTables();
    res.json(tables);
  });
  
  // Orders
  app.get('/api/orders', async (req: Request, res: Response) => {
    const orders = await storage.getOrdersWithDetails();
    res.json(orders);
  });
  
  app.get('/api/orders/new', async (req: Request, res: Response) => {
    const orders = await storage.getNewOrders();
    res.json(orders);
  });
  
  app.get('/api/tables/:tableId/orders', async (req: Request, res: Response) => {
    try {
      const tableId = parseInt(req.params.tableId, 10);
      const orders = await storage.getOrdersWithDetailsByTable(tableId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to get orders for table" });
    }
  });
  
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      // Create a timestamp now for the order
      const orderData = {
        ...req.body,
        timestamp: new Date()
      };
      
      // Validate the data with the schema
      const validatedData = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(validatedData);
      
      // Get the order details for broadcast
      const menuItem = await storage.getMenuItem(order.menuItemId);
      const table = await storage.getTable(order.tableId);
      
      const orderWithDetails = {
        ...order,
        menuItemName: menuItem?.name || 'Unknown Item',
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || ''
      };
      
      // Broadcast new order to all clients
      broadcastToAll({
        type: "NEW_ORDER",
        payload: orderWithDetails
      });
      
      res.status(201).json(order);
    } catch (error) {
      console.error('Order creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });
  
  app.post('/api/orders/:id/complete', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const order = await storage.markOrderComplete(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      broadcastToAll({
        type: "COMPLETE_ORDER",
        payload: order
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark order as complete" });
    }
  });

  // Day Templates API Routes
  app.get('/api/day-templates', async (req: Request, res: Response) => {
    try {
      const templates = await storage.getDayTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch day templates" });
    }
  });

  app.get('/api/day-templates/templates', async (req: Request, res: Response) => {
    try {
      const templates = await storage.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get('/api/day-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const template = await storage.getDayTemplate(id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.get('/api/day-templates/date/:date', async (req: Request, res: Response) => {
    try {
      const dateParam = req.params.date;
      const date = new Date(dateParam);
      
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      const template = await storage.getDayTemplateByDate(date);
      
      if (!template) {
        return res.status(404).json({ error: "No template found for this date" });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch template by date" });
    }
  });

  app.post('/api/day-templates', async (req: Request, res: Response) => {
    try {
      const data = insertDayTemplateSchema.parse(req.body);
      const template = await storage.createDayTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create day template" });
    }
  });

  app.put('/api/day-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertDayTemplateSchema.partial().parse(req.body);
      const template = await storage.updateDayTemplate(id, data);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete('/api/day-templates/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteDayTemplate(id);
      
      if (!success) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.post('/api/day-templates/:id/apply', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { date } = req.body;
      
      if (!date) {
        return res.status(400).json({ error: "Date is required" });
      }
      
      const targetDate = new Date(date);
      
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      const result = await storage.applyTemplate(id, targetDate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to apply template" });
    }
  });
  
  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadDir));
  
  // Restaurant API endpoints
  app.get('/api/restaurants', async (req: Request, res: Response) => {
    try {
      const restaurants = await storage.getRestaurants();
      res.json(restaurants);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });
  
  app.get('/api/restaurants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const restaurant = await storage.getRestaurant(id);
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });
  
  app.post('/api/restaurants', async (req: Request, res: Response) => {
    try {
      const data = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(data);
      res.status(201).json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating restaurant:', error);
      res.status(500).json({ error: "Failed to create restaurant" });
    }
  });
  
  app.put('/api/restaurants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const data = insertRestaurantSchema.partial().parse(req.body);
      const restaurant = await storage.updateRestaurant(id, data);
      
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      res.json(restaurant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating restaurant:', error);
      res.status(500).json({ error: "Failed to update restaurant" });
    }
  });
  
  app.delete('/api/restaurants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteRestaurant(id);
      
      if (!success) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });
  
  // User Profile API endpoints
  app.get('/api/user-profile', async (req: Request, res: Response) => {
    try {
      // Check if a profile exists in storage first
      let profile = await storage.getUserProfile(1);
      
      // If no profile exists, create a default one
      if (!profile) {
        profile = await storage.createUserProfile({
          name: "John Doe",
          role: "Restaurant Manager",
          avatarUrl: null
        });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  
  // Profile update endpoint that persists data to storage
  app.post('/api/user-profile', upload.single('avatar'), async (req: Request, res: Response) => {
    try {
      console.log('Received profile update request:', req.body);
      
      const { name, role, avatarUrl } = req.body;
      
      if (!name || !role) {
        return res.status(400).json({ error: "Name and role are required" });
      }
      
      // Determine avatar URL - if a file was uploaded, use that, otherwise use existing or null
      let finalAvatarUrl = avatarUrl || null;
      
      // If file was uploaded, use the file path instead
      if (req.file) {
        finalAvatarUrl = `/uploads/${req.file.filename}`;
        console.log('File uploaded, new avatar URL:', finalAvatarUrl);
      } else if (avatarUrl && avatarUrl.startsWith('data:image')) {
        // Handle base64 image data
        const base64Data = avatarUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `avatar-${Date.now()}.png`;
        const filepath = path.join(process.cwd(), 'uploads', filename);
        
        // Ensure uploads directory exists
        const uploadDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Write the file
        fs.writeFileSync(filepath, buffer);
        finalAvatarUrl = `/uploads/${filename}`;
        console.log('Base64 image saved, new avatar URL:', finalAvatarUrl);
      }
      
      // Update the profile in storage
      const profileData = {
        name,
        role,
        avatarUrl: finalAvatarUrl
      };
      
      console.log('Updating profile with data:', profileData);
      
      // Check if profile exists
      let profile = await storage.getUserProfile(1);
      
      let updatedProfile;
      if (profile) {
        // Update existing profile
        updatedProfile = await storage.updateUserProfile(1, profileData);
      } else {
        // Create new profile if it doesn't exist
        updatedProfile = await storage.createUserProfile(profileData);
      }
      
      if (!updatedProfile) {
        throw new Error("Failed to update profile");
      }
      
      // Make sure the avatar URL is present in the response
      if (finalAvatarUrl && (!updatedProfile.avatarUrl || updatedProfile.avatarUrl !== finalAvatarUrl)) {
        updatedProfile.avatarUrl = finalAvatarUrl;
        console.log('Ensuring avatar URL is included in response:', finalAvatarUrl);
      }
      
      console.log('Returning updated profile:', updatedProfile);
      res.json(updatedProfile);
    } catch (error) {
      console.error('Error handling profile update:', error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  return httpServer;
}
