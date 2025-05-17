import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertMenuItemSchema, 
  insertTableSchema, 
  insertOrderSchema,
  insertDayTemplateSchema,
  userProfileSchema,
  WebSocketMessage 
} from "@shared/schema";
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
  // Menu Items
  app.get('/api/menu-items', async (req: Request, res: Response) => {
    const menuItems = await storage.getMenuItems();
    res.json(menuItems);
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
      const result = await storage.deleteMenuItem(id);
      
      if (!result) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
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
  
  // User Profile API endpoints
  app.get('/api/user-profile', async (req: Request, res: Response) => {
    try {
      const profile = await storage.getUserProfile(1); // For now, we're using a fixed ID
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  
  app.post('/api/user-profile', upload.single('avatar'), async (req: Request, res: Response) => {
    try {
      const { name, role } = req.body;
      
      if (!name || !role) {
        return res.status(400).json({ error: "Name and role are required" });
      }
      
      // Get the file path if an image was uploaded
      let avatarUrl = undefined;
      if (req.file) {
        avatarUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.avatarUrl) {
        // If no new file was uploaded but existing avatar URL was passed
        avatarUrl = req.body.avatarUrl;
      }
      
      const profileData = {
        name,
        role,
        avatarUrl
      };
      
      console.log('Updating profile with data:', profileData);
      
      // Try to update first, if not found, create new profile
      let profile = await storage.getUserProfile(1);
      if (profile) {
        profile = await storage.updateUserProfile(1, profileData);
      } else {
        profile = await storage.createUserProfile(profileData);
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: "Failed to update user profile" });
    }
  });

  return httpServer;
}
