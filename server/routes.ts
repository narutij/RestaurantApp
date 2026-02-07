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
  insertMenuCategorySchema,
  insertWorkdaySchema,
  insertRestaurantWorkerSchema,
  insertReminderSchema
} from "@shared/schema";
import { eq } from "drizzle-orm"; // Add eq import for database queries
import { log } from "./vite";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";

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

  // Store connected clients with their user info
  interface ConnectedUser {
    ws: WebSocket;
    name: string;
    connectedAt: Date;
    photoUrl?: string;
  }
  const connectedUsers = new Map<WebSocket, ConnectedUser>();

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    // Add with default values - will be updated when client sends USER_CONNECT
    connectedUsers.set(ws, { ws, name: 'Anonymous', connectedAt: new Date() });

    // Send connected users info
    broadcastConnectedUsers();

    // Handle client disconnect
    ws.on('close', () => {
      connectedUsers.delete(ws);
      broadcastConnectedUsers();
    });

    // Handle messages from client
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        switch(message.type) {
          case "USER_CONNECT":
            // Update user info when client identifies itself
            if (message.payload && typeof message.payload === 'object' && 'name' in message.payload) {
              const existing = connectedUsers.get(ws);
              if (existing) {
                const payload = message.payload as any;
                connectedUsers.set(ws, { ...existing, name: payload.name, photoUrl: payload.photoUrl || undefined });
                broadcastConnectedUsers();
              }
            }
            break;
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
    connectedUsers.forEach(user => {
      if (user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }

  // Function to broadcast connected users info
  function broadcastConnectedUsers() {
    const usersList = Array.from(connectedUsers.values()).map(u => ({
      name: u.name,
      connectedAt: u.connectedAt.toISOString(),
      photoUrl: u.photoUrl || null
    }));
    console.log('[WS] Broadcasting users:', usersList.length, 'users');
    broadcastToAll({
      type: "CONNECTED_USERS",
      payload: { count: connectedUsers.size, users: usersList }
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
    try {
      const layoutId = req.query.layoutId ? parseInt(req.query.layoutId as string, 10) : undefined;
      let tables;
      if (layoutId) {
        const allTables = await storage.getTables();
        tables = allTables.filter(t => (t.layoutId ?? null) === layoutId);
      } else {
        tables = await storage.getTables();
      }
      res.json(tables);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tables" });
    }
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
      
      // NOTE: Do NOT clear orders - they need to remain for history tracking
      // Orders from closed tables are filtered to show in history
      
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
      const menuItem = order.menuItemId ? await storage.getMenuItem(order.menuItemId) : null;
      const table = await storage.getTable(order.tableId);

      const orderWithDetails = {
        ...order,
        menuItemName: order.isSpecialItem && order.specialItemName ? order.specialItemName : (menuItem?.name || 'Unknown Item'),
        tableNumber: table?.number || 'Unknown Table',
        tableLabel: table?.label || '',
        peopleCount: table?.peopleCount ?? 0
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

  app.post('/api/orders/:id/uncomplete', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const order = await storage.markOrderIncomplete(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      broadcastToAll({
        type: "UNCOMPLETE_ORDER",
        payload: order
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark order as incomplete" });
    }
  });

  // Cancel an order (when table is closed with unfinished orders)
  app.post('/api/orders/:id/cancel', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const order = await storage.cancelOrder(id);
      
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      broadcastToAll({
        type: "CANCEL_ORDER",
        payload: order
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel order" });
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

  // Restaurant image upload route
  app.post('/api/restaurants/:id/upload-image', upload.single('image'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const restaurant = await storage.updateRestaurant(id, { imageUrl });
      
      if (!restaurant) {
        // Delete the uploaded file if restaurant not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      res.json({ imageUrl, restaurant });
    } catch (error) {
      // Delete the uploaded file on error
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      console.error('Error uploading restaurant image:', error);
      res.status(500).json({ error: "Failed to upload restaurant image" });
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

  // Fetch menu items for a specific menu
  app.get('/api/menus/:id/items', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const menuItems = await storage.getMenuItemsByMenuId(id);
      
      if (!menuItems) {
        return res.status(404).json({ error: "Menu items not found" });
      }
      
      res.json(menuItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to get menu items" });
    }
  });

  // Table Layouts
  app.get('/api/table-layouts', async (req: Request, res: Response) => {
    try {
      const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId as string, 10) : undefined;
      console.log(`API Request: Getting table layouts ${restaurantId ? `for restaurant ${restaurantId}` : 'for all restaurants'}`);
      
      const layouts = await storage.getTableLayouts(restaurantId);
      console.log(`API Response: Found ${layouts.length} table layouts:`, layouts);
      
      res.json(layouts);
    } catch (error) {
      console.error('API Error: Failed to fetch table layouts:', error);
      res.status(500).json({ error: "Failed to fetch table layouts" });
    }
  });

  app.get('/api/table-layouts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const layout = await storage.getTableLayout(id);
      if (!layout) {
        return res.status(404).json({ error: "Table layout not found" });
      }
      res.json(layout);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch table layout" });
    }
  });

  app.post('/api/table-layouts', async (req: Request, res: Response) => {
    try {
      console.log('API Request: Creating table layout with data:', req.body);
      
      // No specific validation schema yet – assume body matches InsertTableLayout
      const layout = await storage.createTableLayout(req.body);
      console.log('API Response: Created table layout:', layout);
      
      res.status(201).json(layout);
    } catch (error) {
      console.error('API Error: Failed to create table layout:', error);
      res.status(500).json({ error: "Failed to create table layout" });
    }
  });

  app.put('/api/table-layouts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const layout = await storage.updateTableLayout(id, req.body);
      if (!layout) {
        return res.status(404).json({ error: "Table layout not found" });
      }
      res.json(layout);
    } catch (error) {
      res.status(500).json({ error: "Failed to update table layout" });
    }
  });

  app.delete('/api/table-layouts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteTableLayout(id);
      if (!success) {
        return res.status(404).json({ error: "Table layout not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete table layout" });
    }
  });

  // ============================================
  // Workday API endpoints
  // ============================================

  // Get active workday for a restaurant
  app.get('/api/workdays/active/:restaurantId', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.params.restaurantId, 10);
      const workday = await storage.getActiveWorkday(restaurantId);
      if (!workday) {
        return res.status(404).json({ error: "No active workday found" });
      }
      res.json(workday);
    } catch (error) {
      console.error('Error getting active workday:', error);
      res.status(500).json({ error: "Failed to get active workday" });
    }
  });

  // Get all workdays (optionally filter by restaurant)
  app.get('/api/workdays', async (req: Request, res: Response) => {
    try {
      const restaurantId = req.query.restaurantId ? parseInt(req.query.restaurantId as string, 10) : undefined;
      const workdaysList = await storage.getWorkdays(restaurantId);
      res.json(workdaysList);
    } catch (error) {
      console.error('Error getting workdays:', error);
      res.status(500).json({ error: "Failed to get workdays" });
    }
  });

  // Get a specific workday
  app.get('/api/workdays/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const workday = await storage.getWorkday(id);
      if (!workday) {
        return res.status(404).json({ error: "Workday not found" });
      }
      res.json(workday);
    } catch (error) {
      console.error('Error getting workday:', error);
      res.status(500).json({ error: "Failed to get workday" });
    }
  });

  // Create a new workday
  app.post('/api/workdays', async (req: Request, res: Response) => {
    try {
      const validatedData = insertWorkdaySchema.parse(req.body);
      const workday = await storage.createWorkday(validatedData);
      res.status(201).json(workday);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating workday:', error);
      res.status(500).json({ error: "Failed to create workday" });
    }
  });

  // Start a workday
  app.post('/api/workdays/:id/start', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const workday = await storage.startWorkday(id);
      if (!workday) {
        return res.status(404).json({ error: "Workday not found" });
      }

      // Broadcast to all clients
      broadcastToAll({
        type: "WORKDAY_STARTED",
        payload: workday
      });

      res.json(workday);
    } catch (error) {
      console.error('Error starting workday:', error);
      res.status(500).json({ error: "Failed to start workday" });
    }
  });

  // End a workday
  app.post('/api/workdays/:id/end', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const workday = await storage.endWorkday(id);
      if (!workday) {
        return res.status(404).json({ error: "Workday not found" });
      }

      // Broadcast to all clients
      broadcastToAll({
        type: "WORKDAY_ENDED",
        payload: workday
      });

      res.json(workday);
    } catch (error) {
      console.error('Error ending workday:', error);
      res.status(500).json({ error: "Failed to end workday" });
    }
  });

  // ============================================
  // Workday Workers API endpoints
  // ============================================

  // Get workers for a workday
  app.get('/api/workdays/:id/workers', async (req: Request, res: Response) => {
    try {
      const workdayId = parseInt(req.params.id, 10);
      const workers = await storage.getWorkdayWorkers(workdayId);
      res.json(workers);
    } catch (error) {
      console.error('Error getting workday workers:', error);
      res.status(500).json({ error: "Failed to get workday workers" });
    }
  });

  // Add worker to workday
  app.post('/api/workdays/:id/workers', async (req: Request, res: Response) => {
    try {
      const workdayId = parseInt(req.params.id, 10);
      const { workerId } = req.body;

      if (!workerId) {
        return res.status(400).json({ error: "Worker ID is required" });
      }

      const worker = await storage.addWorkdayWorker({ workdayId, workerId });

      // Broadcast to all clients
      broadcastToAll({
        type: "WORKER_JOINED",
        payload: { workdayId, workerId }
      });

      res.status(201).json(worker);
    } catch (error) {
      console.error('Error adding workday worker:', error);
      res.status(500).json({ error: "Failed to add workday worker" });
    }
  });

  // Update worker status in workday
  app.put('/api/workdays/:id/workers/:workerId/status', async (req: Request, res: Response) => {
    try {
      const workdayId = parseInt(req.params.id, 10);
      const { workerId } = req.params;
      const { status, totalWorkedMs, totalRestedMs } = req.body;

      if (!status || !['working', 'resting', 'released'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updated = await storage.updateWorkdayWorkerStatus(
        workdayId, workerId, status,
        totalWorkedMs || 0, totalRestedMs || 0
      );

      if (!updated) {
        return res.status(404).json({ error: "Worker not found in workday" });
      }

      // Broadcast to all clients so other users see the change
      broadcastToAll({
        type: "WORKER_STATUS_CHANGED",
        payload: { workdayId, workerId, status, totalWorkedMs: totalWorkedMs || 0, totalRestedMs: totalRestedMs || 0 }
      });

      res.json(updated);
    } catch (error) {
      console.error('Error updating worker status:', error);
      res.status(500).json({ error: "Failed to update worker status" });
    }
  });

  // Remove worker from workday
  app.delete('/api/workdays/:id/workers/:workerId', async (req: Request, res: Response) => {
    try {
      const workdayId = parseInt(req.params.id, 10);
      const { workerId } = req.params;

      const success = await storage.removeWorkdayWorker(workdayId, workerId);
      if (!success) {
        return res.status(404).json({ error: "Worker not found in workday" });
      }

      // Broadcast to all clients
      broadcastToAll({
        type: "WORKER_LEFT",
        payload: { workdayId, workerId }
      });

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error removing workday worker:', error);
      res.status(500).json({ error: "Failed to remove workday worker" });
    }
  });

  // ============================================
  // Restaurant Workers API endpoints
  // ============================================

  // Get workers for a restaurant
  app.get('/api/restaurants/:id/workers', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.params.id, 10);
      const workers = await storage.getRestaurantWorkers(restaurantId);
      res.json(workers);
    } catch (error) {
      console.error('Error getting restaurant workers:', error);
      res.status(500).json({ error: "Failed to get restaurant workers" });
    }
  });

  // Add worker to restaurant
  app.post('/api/restaurants/:id/workers', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.params.id, 10);
      const workerData = { ...req.body, restaurantId };

      const validatedData = insertRestaurantWorkerSchema.parse(workerData);
      const worker = await storage.createRestaurantWorker(validatedData);
      res.status(201).json(worker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating restaurant worker:', error);
      res.status(500).json({ error: "Failed to create restaurant worker" });
    }
  });

  // Update restaurant worker
  app.put('/api/restaurant-workers/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const worker = await storage.updateRestaurantWorker(id, req.body);
      if (!worker) {
        return res.status(404).json({ error: "Restaurant worker not found" });
      }
      res.json(worker);
    } catch (error) {
      console.error('Error updating restaurant worker:', error);
      res.status(500).json({ error: "Failed to update restaurant worker" });
    }
  });

  // Delete restaurant worker
  app.delete('/api/restaurant-workers/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteRestaurantWorker(id);
      if (!success) {
        return res.status(404).json({ error: "Restaurant worker not found" });
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting restaurant worker:', error);
      res.status(500).json({ error: "Failed to delete restaurant worker" });
    }
  });

  // ============================================
  // Worker Statistics API endpoints
  // ============================================

  // Get top workers by working time for a restaurant
  app.get('/api/statistics/top-workers', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const timeframe = (req.query.timeframe as string) || 'week';

      if (!restaurantId || isNaN(restaurantId)) {
        return res.status(400).json({ error: "restaurantId is required" });
      }

      // Calculate date range based on timeframe (calendar boundaries)
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week': {
          // Current week: Monday to Sunday
          const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
          break;
        }
        case 'month':
          // Current calendar month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          // Current calendar year
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default: {
          // Default to current week
          const dow = now.getDay();
          const diff = dow === 0 ? 6 : dow - 1;
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
        }
      }

      const topWorkers = await storage.getTopWorkersByTime(restaurantId, startDate, now);
      res.json({ workers: topWorkers });
    } catch (error) {
      console.error('Error getting top workers:', error);
      res.status(500).json({ error: "Failed to get top workers" });
    }
  });

  // Get detailed statistics for a specific worker
  app.get('/api/workers/:workerId/statistics', async (req: Request, res: Response) => {
    try {
      const workerId = req.params.workerId;
      const period = (req.query.period as string) || 'week';

      if (!workerId) {
        return res.status(400).json({ error: "workerId is required" });
      }

      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const statistics = await storage.getWorkerStatistics(workerId, startDate, now);
      res.json(statistics);
    } catch (error) {
      console.error('Error getting worker statistics:', error);
      res.status(500).json({ error: "Failed to get worker statistics" });
    }
  });

  // Get shift dates for a worker in a given month (for mini calendar)
  app.get('/api/workers/:workerId/shift-dates', async (req: Request, res: Response) => {
    try {
      const workerId = req.params.workerId;
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);

      if (!workerId || isNaN(year) || isNaN(month)) {
        return res.status(400).json({ error: "workerId, year, and month are required" });
      }

      const dates = await storage.getWorkerShiftDates(workerId, year, month);
      res.json({ dates });
    } catch (error) {
      console.error('Error getting worker shift dates:', error);
      res.status(500).json({ error: "Failed to get worker shift dates" });
    }
  });

  // ============================================
  // History API endpoints
  // ============================================

  // Get orders for a specific date
  app.get('/api/history/orders', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const date = req.query.date as string;

      if (!restaurantId || !date) {
        return res.status(400).json({ error: "Restaurant ID and date are required" });
      }

      const orders = await storage.getOrdersByDate(restaurantId, date);
      res.json(orders);
    } catch (error) {
      console.error('Error getting history orders:', error);
      res.status(500).json({ error: "Failed to get history orders" });
    }
  });

  // Get summary for a specific date
  app.get('/api/history/summary', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const date = req.query.date as string;

      if (!restaurantId || !date) {
        return res.status(400).json({ error: "Restaurant ID and date are required" });
      }

      const summary = await storage.getHistorySummary(restaurantId, date);
      res.json(summary);
    } catch (error) {
      console.error('Error getting history summary:', error);
      res.status(500).json({ error: "Failed to get history summary" });
    }
  });

  // Get detailed history with shifts for a specific date
  app.get('/api/history/detailed', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const date = req.query.date as string;

      if (!restaurantId || !date) {
        return res.status(400).json({ error: "Restaurant ID and date are required" });
      }

      const detailedHistory = await storage.getDetailedHistory(restaurantId, date);
      res.json(detailedHistory);
    } catch (error) {
      console.error('Error getting detailed history:', error);
      res.status(500).json({ error: "Failed to get detailed history" });
    }
  });

  // ============================================
  // Update table activation to include people count
  // ============================================
  app.post('/api/tables/:id/activate-with-count', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { peopleCount } = req.body;

      // First update the people count
      await storage.updateTable(id, { peopleCount: peopleCount || 0 });

      // Then activate the table
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
      console.error('Error activating table with count:', error);
      res.status(500).json({ error: "Failed to activate table" });
    }
  });

  // Kitchen notification endpoint
  app.post('/api/kitchen/notify', async (req: Request, res: Response) => {
    try {
      const { orderId, tableNumber, message } = req.body;

      broadcastToAll({
        type: "KITCHEN_NOTIFICATION",
        payload: { orderId, tableNumber, message }
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error sending kitchen notification:', error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // Reminders API
  app.get('/api/reminders', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      if (isNaN(restaurantId)) {
        return res.status(400).json({ error: "restaurantId is required" });
      }
      const reminders = await storage.getReminders(restaurantId);
      res.json(reminders);
    } catch (error) {
      console.error('Error getting reminders:', error);
      res.status(500).json({ error: "Failed to get reminders" });
    }
  });

  app.post('/api/reminders', async (req: Request, res: Response) => {
    try {
      const validatedData = insertReminderSchema.parse(req.body);
      const reminder = await storage.createReminder(validatedData);
      res.status(201).json(reminder);
    } catch (error) {
      console.error('Error creating reminder:', error);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  app.delete('/api/reminders/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      const success = await storage.deleteReminder(id);
      if (!success) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting reminder:', error);
      res.status(500).json({ error: "Failed to delete reminder" });
    }
  });

  // Statistics API
  app.get('/api/statistics', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const timeframe = req.query.timeframe as 'week' | 'month' | 'quarter' | 'year';

      if (isNaN(restaurantId)) {
        return res.status(400).json({ error: "restaurantId is required" });
      }

      if (!['week', 'month', 'quarter', 'year'].includes(timeframe)) {
        return res.status(400).json({ error: "timeframe must be week, month, quarter, or year" });
      }

      const statistics = await storage.getStatistics(restaurantId, timeframe);
      res.json(statistics);
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ error: "Failed to get statistics" });
    }
  });

  // Download Report API - Direct download (no email)
  app.get('/api/reports/download', async (req: Request, res: Response) => {
    try {
      const restaurantId = parseInt(req.query.restaurantId as string, 10);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!startDate || !endDate || isNaN(restaurantId)) {
        return res.status(400).json({ error: "startDate, endDate, and restaurantId are required" });
      }

      // Get restaurant info
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Generate date range
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Collect data for each day
      const dailyData: Array<{
        date: string;
        revenue: number;
        orderCount: number;
        tablesServed: number;
        peopleServed: number;
        shifts: number;
      }> = [];

      let totalRevenue = 0;
      let totalOrders = 0;
      let totalTables = 0;
      let totalPeople = 0;
      let totalShifts = 0;

      for (const date of dates) {
        try {
          const history = await storage.getDetailedHistory(restaurantId, date);
          const dayData = {
            date,
            revenue: history.totals.revenue,
            orderCount: history.totals.orderCount,
            tablesServed: history.totals.tablesServed,
            peopleServed: history.totals.peopleServed,
            shifts: history.shifts.length,
          };
          dailyData.push(dayData);

          totalRevenue += dayData.revenue;
          totalOrders += dayData.orderCount;
          totalTables += dayData.tablesServed;
          totalPeople += dayData.peopleServed;
          totalShifts += dayData.shifts;
        } catch (e) {
          // Day has no data, add zeros
          dailyData.push({
            date,
            revenue: 0,
            orderCount: 0,
            tablesServed: 0,
            peopleServed: 0,
            shifts: 0,
          });
        }
      }

      // Collect top items across all days and staff data
      const globalItemCounts = new Map<string, { count: number; revenue: number }>();
      const staffMap = new Map<string, {
        name: string;
        daysWorked: number;
        totalShifts: number;
        dates: string[];
      }>();

      // Aggregate item and staff data from all days
      for (const date of dates) {
        try {
          const history = await storage.getDetailedHistory(restaurantId, date);
          // Aggregate items
          for (const shift of history.shifts) {
            for (const order of shift.orders) {
              const itemName = order.isSpecialItem && order.specialItemName
                ? order.specialItemName
                : (order.menuItemName || 'Unknown Item');
              const existing = globalItemCounts.get(itemName) || { count: 0, revenue: 0 };
              globalItemCounts.set(itemName, {
                count: existing.count + 1,
                revenue: existing.revenue + order.price,
              });
            }
            // Aggregate staff
            for (const worker of shift.workers) {
              const existing = staffMap.get(worker.workerId);
              if (existing) {
                existing.totalShifts++;
                if (!existing.dates.includes(date)) {
                  existing.dates.push(date);
                  existing.daysWorked++;
                }
              } else {
                staffMap.set(worker.workerId, {
                  name: worker.workerId,
                  daysWorked: 1,
                  totalShifts: 1,
                  dates: [date],
                });
              }
            }
          }
        } catch (e) {
          // skip
        }
      }

      const topItems = Array.from(globalItemCounts.entries())
        .map(([name, data]) => ({ name, count: data.count, revenue: data.revenue }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Helper to add borders to a sheet
      const addBordersToSheet = (sheet: XLSX.WorkSheet, rows: number, cols: number, startRow = 0) => {
        const border = {
          top: { style: 'thin', color: { rgb: 'CCCCCC' } },
          bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
          left: { style: 'thin', color: { rgb: 'CCCCCC' } },
          right: { style: 'thin', color: { rgb: 'CCCCCC' } },
        };
        for (let r = startRow; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cellRef = XLSX.utils.encode_cell({ r, c });
            if (!sheet[cellRef]) sheet[cellRef] = { t: 's', v: '' };
            if (!sheet[cellRef].s) sheet[cellRef].s = {};
            sheet[cellRef].s.border = border;
          }
        }
      };

      // ─── Summary Sheet ───
      const summaryData = [
        ['Restaurant Report'],
        [''],
        ['Restaurant:', restaurant.name],
        ['Report Period:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['PERIOD TOTALS'],
        [''],
        ['Total Revenue', `€${totalRevenue.toFixed(2)}`],
        ['Total Orders', totalOrders],
        ['Tables Served', totalTables],
        ['Guests Served', totalPeople],
        ['Total Shifts', totalShifts],
        [''],
        ['Average Revenue/Day', `€${dates.length > 0 ? (totalRevenue / dates.length).toFixed(2) : '0.00'}`],
        ['Average Orders/Day', dates.length > 0 ? (totalOrders / dates.length).toFixed(1) : '0'],
        [''],
        [''],
        ['TOP 10 MOST POPULAR DISHES'],
        [''],
        ['Rank', 'Dish Name', 'Times Ordered', 'Revenue'],
      ];
      topItems.forEach((item, idx) => {
        summaryData.push([
          `${idx + 1}` as any,
          item.name,
          item.count as any,
          `€${item.revenue.toFixed(2)}`,
        ]);
      });
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 22 }, { wch: 30 }, { wch: 16 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // ─── Daily Details Sheet (auto-filter enabled) ───
      const dailyHeaders = ['Date', 'Revenue (€)', 'Orders', 'Tables', 'Guests', 'Shifts'];
      const dailyRows = dailyData.map(d => [
        d.date,
        parseFloat(d.revenue.toFixed(2)),
        d.orderCount,
        d.tablesServed,
        d.peopleServed,
        d.shifts,
      ]);
      const dailySheetData = [dailyHeaders, ...dailyRows];
      const dailySheet = XLSX.utils.aoa_to_sheet(dailySheetData);
      dailySheet['!cols'] = [
        { wch: 14 }, { wch: 14 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }
      ];
      // Enable auto-filter for sorting/filtering
      dailySheet['!autofilter'] = { ref: `A1:F${dailyRows.length + 1}` };
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Details');

      // ─── Staff Sheet ───
      const staffHeaders = ['Staff Member', 'Days Worked', 'Total Shifts', 'Dates Active'];
      const staffRows = Array.from(staffMap.values())
        .sort((a, b) => b.daysWorked - a.daysWorked)
        .map(s => [
          s.name,
          s.daysWorked,
          s.totalShifts,
          s.dates.join(', '),
        ]);
      const staffSheetData = [staffHeaders, ...staffRows];
      const staffSheet = XLSX.utils.aoa_to_sheet(staffSheetData);
      staffSheet['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 50 }];
      staffSheet['!autofilter'] = { ref: `A1:D${staffRows.length + 1}` };
      XLSX.utils.book_append_sheet(workbook, staffSheet, 'Staff');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Set headers for file download
      const filename = `${restaurant.name.replace(/[^a-z0-9]/gi, '_')}_Report_${startDate}_to_${endDate}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Export Report API (with email - kept for future use)
  app.post('/api/reports/export', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, email, restaurantId } = req.body;

      if (!startDate || !endDate || !email || !restaurantId) {
        return res.status(400).json({ error: "startDate, endDate, email, and restaurantId are required" });
      }

      // Get restaurant info
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Generate date range
      const dates: string[] = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Collect data for each day
      const dailyData: Array<{
        date: string;
        revenue: number;
        orderCount: number;
        tablesServed: number;
        peopleServed: number;
        shifts: number;
      }> = [];

      let totalRevenue = 0;
      let totalOrders = 0;
      let totalTables = 0;
      let totalPeople = 0;
      let totalShifts = 0;

      for (const date of dates) {
        try {
          const history = await storage.getDetailedHistory(restaurantId, date);
          const dayData = {
            date,
            revenue: history.totals.revenue,
            orderCount: history.totals.orderCount,
            tablesServed: history.totals.tablesServed,
            peopleServed: history.totals.peopleServed,
            shifts: history.shifts.length,
          };
          dailyData.push(dayData);

          totalRevenue += dayData.revenue;
          totalOrders += dayData.orderCount;
          totalTables += dayData.tablesServed;
          totalPeople += dayData.peopleServed;
          totalShifts += dayData.shifts;
        } catch (e) {
          // Day has no data, add zeros
          dailyData.push({
            date,
            revenue: 0,
            orderCount: 0,
            tablesServed: 0,
            peopleServed: 0,
            shifts: 0,
          });
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        ['Restaurant Report'],
        [''],
        ['Restaurant:', restaurant.name],
        ['Report Period:', `${startDate} to ${endDate}`],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['PERIOD TOTALS'],
        [''],
        ['Total Revenue', `$${(totalRevenue / 100).toFixed(2)}`],
        ['Total Orders', totalOrders],
        ['Tables Served', totalTables],
        ['Guests Served', totalPeople],
        ['Total Shifts', totalShifts],
        [''],
        ['Average Revenue/Day', `$${dates.length > 0 ? ((totalRevenue / 100) / dates.length).toFixed(2) : '0.00'}`],
        ['Average Orders/Day', dates.length > 0 ? (totalOrders / dates.length).toFixed(1) : '0'],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      
      // Set column widths
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
      
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Daily Details Sheet
      const dailyHeaders = ['Date', 'Revenue', 'Orders', 'Tables', 'Guests', 'Shifts'];
      const dailyRows = dailyData.map(d => [
        d.date,
        `$${(d.revenue / 100).toFixed(2)}`,
        d.orderCount,
        d.tablesServed,
        d.peopleServed,
        d.shifts,
      ]);
      const dailySheetData = [dailyHeaders, ...dailyRows];
      const dailySheet = XLSX.utils.aoa_to_sheet(dailySheetData);
      
      // Set column widths
      dailySheet['!cols'] = [
        { wch: 12 }, { wch: 12 }, { wch: 10 }, 
        { wch: 10 }, { wch: 10 }, { wch: 10 }
      ];
      
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Details');

      // Generate buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      // Create email transporter
      // Note: In production, use real SMTP credentials from environment variables
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASS || '',
        },
      });

      // Send email with attachment
      const filename = `${restaurant.name.replace(/[^a-z0-9]/gi, '_')}_Report_${startDate}_to_${endDate}.xlsx`;
      
      try {
        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'noreply@restaurant.app',
          to: email,
          subject: `Restaurant Report: ${restaurant.name} (${startDate} to ${endDate})`,
          html: `
            <h2>Restaurant Report</h2>
            <p><strong>Restaurant:</strong> ${restaurant.name}</p>
            <p><strong>Period:</strong> ${startDate} to ${endDate}</p>
            <p><strong>Total Revenue:</strong> $${(totalRevenue / 100).toFixed(2)}</p>
            <p><strong>Total Orders:</strong> ${totalOrders}</p>
            <p><strong>Guests Served:</strong> ${totalPeople}</p>
            <p>Please find the detailed report attached.</p>
          `,
          attachments: [
            {
              filename,
              content: buffer,
              contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ],
        });

        res.json({ success: true, message: `Report sent to ${email}` });
      } catch (emailError: any) {
        console.error('Email sending failed:', emailError);
        // If email fails, still return success but indicate the issue
        // In development without SMTP, we'll just log the data
        console.log('Report data generated successfully for:', email);
        console.log('Total Revenue:', totalRevenue, 'Total Orders:', totalOrders);
        
        // For development, return success even if email fails
        res.json({ 
          success: true, 
          message: `Report generated. Email sending requires SMTP configuration.`,
          dev_note: 'Configure SMTP_HOST, SMTP_USER, SMTP_PASS environment variables for email delivery'
        });
      }
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  return httpServer;
}
