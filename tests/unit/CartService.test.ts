import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CartService, CartServiceError } from '../../src/domain/services/CartService';
import { SalesforceCartClient } from '../../src/infrastructure/salesforce/SalesforceCartClient';
import { CartStore } from '../../src/infrastructure/stores/CartStore';
import { ContextStore } from '../../src/infrastructure/stores/ContextStore';
import { OrderStore } from '../../src/infrastructure/stores/OrderStore';
import { ProductType } from '../../src/domain/models/ProductType';

describe('CartService', () => {
  let service: CartService;
  let sfClient: SalesforceCartClient;
  let cartStore: CartStore;
  let contextStore: ContextStore;
  let orderStore: OrderStore;

  beforeEach(() => {
    sfClient = new SalesforceCartClient();
    cartStore = new CartStore();
    contextStore = new ContextStore();
    orderStore = new OrderStore();
    service = new CartService(sfClient, cartStore, contextStore, orderStore);

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createCart', () => {
    it('should create a new cart successfully', async () => {
      const cart = await service.createCart();

      expect(cart.cartId).toBeDefined();
      expect(cart.items).toEqual([]);
      expect(cart.totalPrice).toBe(0);
      expect(cart.createdAt).toBeInstanceOf(Date);
      expect(cart.updatedAt).toBeInstanceOf(Date);
    });

    it('should create unique cart IDs', async () => {
      const cart1 = await service.createCart();
      const cart2 = await service.createCart();

      expect(cart1.cartId).not.toBe(cart2.cartId);
    });
  });

  describe('getCart', () => {
    it('should retrieve an existing cart', async () => {
      const created = await service.createCart();
      const retrieved = await service.getCart(created.cartId);

      expect(retrieved.cartId).toBe(created.cartId);
      expect(retrieved.items).toEqual([]);
    });

    it('should throw CART_NOT_FOUND for non-existent cart', async () => {
      try {
        await service.getCart('non-existent-cart-id');
        throw new Error('Should have thrown CART_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_NOT_FOUND');
      }
    });
  });

  describe('addItem', () => {
    it('should add an item to the cart', async () => {
      const cart = await service.createCart();

      const updated = await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Unlimited Data Plan',
        price: 75.0,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].name).toBe('Unlimited Data Plan');
      expect(updated.items[0].price).toBe(75.0);
      expect(updated.totalPrice).toBe(75.0);
    });

    it('should calculate total price correctly with multiple items', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const updated = await service.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'iPhone',
        price: 999.99,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(2);
      expect(updated.totalPrice).toBe(1074.99);
    });

    it('should throw CART_NOT_FOUND for non-existent cart', async () => {
      try {
        await service.addItem('non-existent', {
          productType: ProductType.ADDON,
          name: 'Extra',
          price: 10.0,
          quantity: 1,
        });
        throw new Error('Should have thrown CART_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_NOT_FOUND');
      }
    });

    it('should throw CART_ALREADY_CHECKED_OUT if cart was checked out', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan',
        price: 50.0,
        quantity: 1,
      });

      await service.checkout(cart.cartId);

      try {
        await service.addItem(cart.cartId, {
          productType: ProductType.ADDON,
          name: 'Extra',
          price: 10.0,
          quantity: 1,
        });
        throw new Error('Should have thrown CART_ALREADY_CHECKED_OUT');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_ALREADY_CHECKED_OUT');
      }
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', async () => {
      const cart = await service.createCart();

      const withItem = await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const itemId = withItem.items[0].itemId;

      const updated = await service.removeItem(cart.cartId, itemId);

      expect(updated.items).toHaveLength(0);
      expect(updated.totalPrice).toBe(0);
    });

    it('should recalculate total after removing item', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const withTwoItems = await service.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'iPhone',
        price: 999.99,
        quantity: 1,
      });

      const firstItemId = withTwoItems.items[0].itemId;

      const updated = await service.removeItem(cart.cartId, firstItemId);

      expect(updated.items).toHaveLength(1);
      expect(updated.items[0].name).toBe('iPhone');
      expect(updated.totalPrice).toBe(999.99);
    });

    it('should throw ITEM_NOT_FOUND for non-existent item', async () => {
      const cart = await service.createCart();

      try {
        await service.removeItem(cart.cartId, 'non-existent-item');
        throw new Error('Should have thrown ITEM_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('ITEM_NOT_FOUND');
      }
    });

    it('should throw CART_NOT_FOUND for non-existent cart', async () => {
      try {
        await service.removeItem('non-existent-cart', 'some-item');
        throw new Error('Should have thrown CART_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_NOT_FOUND');
      }
    });
  });

  describe('checkout', () => {
    it('should successfully checkout a cart with items', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const order = await service.checkout(cart.cartId);

      expect(order.orderId).toBeDefined();
      expect(order.cartId).toBe(cart.cartId);
      expect(order.items).toHaveLength(1);
      expect(order.totalPrice).toBe(75.0);
      expect(order.status).toBe('COMPLETED');
      expect(order.completedAt).toBeInstanceOf(Date);
    });

    it('should throw EMPTY_CART when checking out empty cart', async () => {
      const cart = await service.createCart();

      try {
        await service.checkout(cart.cartId);
        throw new Error('Should have thrown EMPTY_CART');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('EMPTY_CART');
      }
    });

    it('should throw CART_ALREADY_CHECKED_OUT when checking out twice', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'Device',
        price: 500.0,
        quantity: 1,
      });

      await service.checkout(cart.cartId);

      try {
        await service.checkout(cart.cartId);
        throw new Error('Should have thrown CART_ALREADY_CHECKED_OUT');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_ALREADY_CHECKED_OUT');
      }
    });

    it('should throw CART_NOT_FOUND for non-existent cart', async () => {
      try {
        await service.checkout('non-existent-cart');
        throw new Error('Should have thrown CART_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(CartServiceError);
        expect((error as CartServiceError).code).toBe('CART_NOT_FOUND');
      }
    });
  });

  describe('context refresh (transparent expiry handling)', () => {
    it('should transparently refresh expired context on getCart', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      // Advance time by 6 minutes to expire context
      vi.advanceTimersByTime(6 * 60 * 1000);

      // This should trigger context refresh and succeed
      const retrieved = await service.getCart(cart.cartId);

      expect(retrieved.items).toHaveLength(1);
      expect(retrieved.items[0].name).toBe('Plan 1');
    });

    it('should transparently refresh expired context on addItem', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      // Expire context
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Adding item should trigger refresh and succeed
      const updated = await service.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'iPhone',
        price: 999.0,
        quantity: 1,
      });

      expect(updated.items).toHaveLength(2);
    });

    it('should transparently refresh expired context on removeItem', async () => {
      const cart = await service.createCart();

      const withItems = await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const itemId = withItems.items[0].itemId;

      // Expire context
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Removing item should trigger refresh and succeed
      const updated = await service.removeItem(cart.cartId, itemId);

      expect(updated.items).toHaveLength(0);
    });

    it('should transparently refresh expired context on checkout', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      // Expire context
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Checkout should trigger refresh and succeed
      const order = await service.checkout(cart.cartId);

      expect(order.items).toHaveLength(1);
      expect(order.status).toBe('COMPLETED');
    });

    it('should NOT refresh context if within 5 minutes', async () => {
      const cart = await service.createCart();

      // Advance 4 minutes (still valid)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Should succeed without refresh
      await service.addItem(cart.cartId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      // Advance another 4 minutes (8 total, but only 4 since last access)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Should still be valid
      const retrieved = await service.getCart(cart.cartId);
      expect(retrieved.items).toHaveLength(1);
    });
  });

  describe('total calculation', () => {
    it('should round total to 2 decimal places', async () => {
      const cart = await service.createCart();

      await service.addItem(cart.cartId, {
        productType: ProductType.ADDON,
        name: 'Item 1',
        price: 10.555,
        quantity: 1,
      });

      await service.addItem(cart.cartId, {
        productType: ProductType.ADDON,
        name: 'Item 2',
        price: 20.444,
        quantity: 1,
      });

      const retrieved = await service.getCart(cart.cartId);

      // 10.555 + 20.444 = 30.999, rounded to 31.00
      expect(retrieved.totalPrice).toBe(31.0);
    });

    it('should calculate total with quantity', async () => {
      const cart = await service.createCart();

      const updated = await service.addItem(cart.cartId, {
        productType: ProductType.DEVICE,
        name: 'Device',
        price: 100.0,
        quantity: 3,
      });

      expect(updated.totalPrice).toBe(300.0);
    });
  });
});
