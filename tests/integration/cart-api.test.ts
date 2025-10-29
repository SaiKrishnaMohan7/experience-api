import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import express, { Express } from 'express';
import { SalesforceCartClient } from '../../src/infrastructure/salesforce/SalesforceCartClient';
import { CartStore } from '../../src/infrastructure/stores/CartStore';
import { ContextStore } from '../../src/infrastructure/stores/ContextStore';
import { OrderStore } from '../../src/infrastructure/stores/OrderStore';
import { CartService } from '../../src/domain/services/CartService';
import { CartController } from '../../src/api/controllers/cart.controller';
import { createCartRoutes } from '../../src/api/routes';
import { errorHandler } from '../../src/api/middleware/error.middleware';
import { ProductType } from '../../src/domain/models/ProductType';

// Helper to make requests
async function request(app: Express, method: string, path: string, body?: any) {
  return new Promise((resolve, reject) => {
    const req = (app as any).request || {};
    const chunks: Buffer[] = [];

    const mockReq = {
      method,
      url: `/api/v1${path}`,
      path: `/api/v1${path}`,
      headers: { 'content-type': 'application/json' },
      body,
      params: {},
      on: vi.fn(),
      resume: vi.fn(),
    };

    const mockRes = {
      statusCode: 200,
      status: function (code: number) {
        this.statusCode = code;
        return this;
      },
      json: function (data: any) {
        resolve({ status: this.statusCode, body: data });
        return this;
      },
      setHeader: vi.fn(),
      end: vi.fn(),
    };

    // Parse path params manually for testing
    const cartIdMatch = path.match(/\/cart\/([^/]+)/);
    if (cartIdMatch) {
      mockReq.params.cartId = cartIdMatch[1];
    }

    const itemIdMatch = path.match(/\/items\/([^/]+)/);
    if (itemIdMatch) {
      mockReq.params.itemId = itemIdMatch[1];
    }

    app(mockReq as any, mockRes as any);
  });
}

describe('Cart API Integration Tests', () => {
  let app: Express;
  let sfClient: SalesforceCartClient;
  let cartStore: CartStore;
  let contextStore: ContextStore;
  let orderStore: OrderStore;
  let cartService: CartService;

  beforeEach(() => {
    vi.useFakeTimers();

    // Initialize dependencies
    sfClient = new SalesforceCartClient();
    cartStore = new CartStore();
    contextStore = new ContextStore();
    orderStore = new OrderStore();
    cartService = new CartService(sfClient, cartStore, contextStore, orderStore);

    const cartController = new CartController(cartService);

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1', createCartRoutes(cartController));
    app.use(errorHandler);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('POST /cart', () => {
    it('should create a new cart', async () => {
      const cart = await cartService.createCart();

      expect(cart.cartId).toBeDefined();
      expect(cart.items).toEqual([]);
      expect(cart.totalPrice).toBe(0);
      expect(cart.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('GET /cart/:cartId', () => {
    it('should retrieve an existing cart', async () => {
      const created = await cartService.createCart();
      const retrieved = await cartService.getCart(created.cartId);

      expect(retrieved.cartId).toBe(created.cartId);
      expect(retrieved.items).toEqual([]);
    });

    it('should return 404 for non-existent cart', async () => {
      try {
        await cartService.getCart('non-existent-id');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('CART_NOT_FOUND');
      }
    });
  });

  describe('POST /cart/:cartId/items', () => {
    it('should add an item to the cart', async () => {
      const cart = await cartService.createCart();

      const updated = await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Unlimited Data Plan',
        price: 75.0,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].name).toBe('Unlimited Data Plan');
      expect(updated.totalPrice).toBe(75.0);
    });

    it('should calculate correct total with multiple items', async () => {
      const cart = await cartService.createCart();

      await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const updated = await cartService.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'iPhone',
        price: 999.99,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(2);
      expect(updated.totalPrice).toBe(1074.99);
    });
  });

  describe('DELETE /cart/:cartId/items/:itemId', () => {
    it('should remove an item from the cart', async () => {
      const cart = await cartService.createCart();

      const withItem = await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const itemId = withItem.items[0].itemId;
      const updated = await cartService.removeItem(cart.cartId, itemId);

      expect(updated.items).toHaveLength(0);
      expect(updated.totalPrice).toBe(0);
    });

    it('should return 404 for non-existent item', async () => {
      const cart = await cartService.createCart();

      try {
        await cartService.removeItem(cart.cartId, 'non-existent-item');
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('ITEM_NOT_FOUND');
      }
    });
  });

  describe('POST /cart/:cartId/checkout', () => {
    it('should checkout a cart with items', async () => {
      const cart = await cartService.createCart();

      await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const order = await cartService.checkout(cart.cartId);

      expect(order.orderId).toBeDefined();
      expect(order.cartId).toBe(cart.cartId);
      expect(order.items).toHaveLength(1);
      expect(order.status).toBe('COMPLETED');
    });

    it('should return 400 for empty cart checkout', async () => {
      const cart = await cartService.createCart();

      try {
        await cartService.checkout(cart.cartId);
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('EMPTY_CART');
      }
    });

    it('should return 409 when checking out twice', async () => {
      const cart = await cartService.createCart();

      await cartService.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'Device',
        price: 500.0,
        quantity: 1,
      });

      await cartService.checkout(cart.cartId);

      try {
        await cartService.checkout(cart.cartId);
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('CART_ALREADY_CHECKED_OUT');
      }
    });
  });

  describe('End-to-end cart workflow', () => {
    it('should handle complete cart lifecycle', async () => {
      // Create cart
      const cart = await cartService.createCart();
      expect(cart.items).toHaveLength(0);

      // Add first item
      const withItem1 = await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Unlimited Plan',
        price: 75.0,
        quantity: 1,
      });
      expect(withItem1.items).toHaveLength(1);
      expect(withItem1.totalPrice).toBe(75.0);

      // Add second item
      const withItem2 = await cartService.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'iPhone 15 Pro',
        price: 1299.99,
        quantity: 1,
      });
      expect(withItem2.items).toHaveLength(2);
      expect(withItem2.totalPrice).toBe(1374.99);

      // Remove first item
      const itemId = withItem1.items[0].itemId;
      const afterRemoval = await cartService.removeItem(cart.cartId, itemId);
      expect(afterRemoval.items).toHaveLength(1);
      expect(afterRemoval.totalPrice).toBe(1299.99);

      // Checkout
      const order = await cartService.checkout(cart.cartId);
      expect(order.status).toBe('COMPLETED');
      expect(order.items).toHaveLength(1);
      expect(order.totalPrice).toBe(1299.99);

      // Verify can't modify after checkout
      try {
        await cartService.addItem(cart.cartId, {
          productType: ProductType.ADDON,
          name: 'Extra',
          price: 10.0,
          quantity: 1,
        });
        throw new Error('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe('CART_ALREADY_CHECKED_OUT');
      }
    });

    it('should handle context expiry transparently during workflow', async () => {
      // Create cart and add item
      const cart = await cartService.createCart();
      await cartService.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan',
        price: 50.0,
        quantity: 1,
      });

      // Expire context (6 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Add another item - should transparently refresh context
      const updated = await cartService.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'Device',
        price: 500.0,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(2);
      expect(updated.totalPrice).toBe(550.0);

      // Checkout should also work
      const order = await cartService.checkout(cart.cartId);
      expect(order.status).toBe('COMPLETED');
    });
  });
});
