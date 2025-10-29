// Load environment variables first
import 'dotenv/config';

import express from 'express';
import { SalesforceCartClient } from './infrastructure/salesforce/SalesforceCartClient';
import { CartStore } from './infrastructure/stores/CartStore';
import { ContextStore } from './infrastructure/stores/ContextStore';
import { OrderStore } from './infrastructure/stores/OrderStore';
import { CartService } from './domain/services/CartService';
import { CartController } from './api/controllers/cart.controller';
import { createCartRoutes } from './api/routes';
import { errorHandler } from './api/middleware/error.middleware';
import { logger } from './infrastructure/logger/logger';

const PORT = process.env.PORT || 3000;

// Initialize infrastructure
const sfClient = new SalesforceCartClient();
const cartStore = new CartStore();
const contextStore = new ContextStore();
const orderStore = new OrderStore();

// Initialize service
const cartService = new CartService(sfClient, cartStore, contextStore, orderStore);

// Initialize controller
const cartController = new CartController(cartService);

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

// API routes
app.use('/api/v1', createCartRoutes(cartController));

// Health check endpoint - validates infrastructure components
app.get('/health', (_req, res) => {
  const healthChecks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    infrastructure: {
      salesforceClient: 'ok',
      cartStore: 'ok',
      contextStore: 'ok',
      orderStore: 'ok',
    },
  };

  try {
    // Verify stores are accessible
    if (!cartStore || !contextStore || !orderStore) {
      throw new Error('Store unavailable');
    }

    // Verify SF client can create contexts
    const testContextId = sfClient.createContext();
    if (!testContextId) {
      throw new Error('Salesforce client unavailable');
    }

    res.status(200).json(healthChecks);
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Infrastructure check failed',
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Experience API server started');
});

export { app };
