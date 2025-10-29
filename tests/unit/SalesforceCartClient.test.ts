import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SalesforceCartClient, SalesforceCartClientError } from '../../src/infrastructure/salesforce/SalesforceCartClient';
import { ProductType } from '../../src/domain/models/ProductType';

describe('SalesforceCartClient', () => {
  let client: SalesforceCartClient;

  beforeEach(() => {
    client = new SalesforceCartClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createContext', () => {
    it('should create a new context and return a contextId', () => {
      const contextId = client.createContext();

      expect(contextId).toBeDefined();
      expect(typeof contextId).toBe('string');
      expect(contextId.length).toBeGreaterThan(0);
    });

    it('should create unique contextIds for multiple contexts', () => {
      const contextId1 = client.createContext();
      const contextId2 = client.createContext();

      expect(contextId1).not.toBe(contextId2);
    });
  });

  describe('addItem', () => {
    it('should add an item to the cart', () => {
      const contextId = client.createContext();

      const item = client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Unlimited Data Plan',
        price: 75.0,
        quantity: 1,
      });

      expect(item.itemId).toBeDefined();
      expect(item.productType).toBe(ProductType.MOBILE_PLAN);
      expect(item.name).toBe('Unlimited Data Plan');
      expect(item.price).toBe(75.0);
      expect(item.quantity).toBe(1);
    });

    it('should throw SF_INVALID_CONTEXT for invalid contextId', () => {
      expect(() => {
        client.addItem('invalid-context', {
          productType: ProductType.DEVICE,
          name: 'iPhone',
          price: 999.0,
          quantity: 1,
        });
      }).toThrow(SalesforceCartClientError);

      try {
        client.addItem('invalid-context', {
          productType: ProductType.DEVICE,
          name: 'iPhone',
          price: 999.0,
          quantity: 1,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_INVALID_CONTEXT');
      }
    });

    it('should throw SF_CONTEXT_EXPIRED for expired context', () => {
      const contextId = client.createContext();

      // Fast-forward time by 6 minutes (context expires after 5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      try {
        client.addItem(contextId, {
          productType: ProductType.ADDON,
          name: 'Extra Storage',
          price: 10.0,
          quantity: 1,
        });
        throw new Error('Should have thrown SF_CONTEXT_EXPIRED');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_CONTEXT_EXPIRED');
      }
    });
  });

  describe('getCart', () => {
    it('should return empty array for new context', () => {
      const contextId = client.createContext();
      const items = client.getCart(contextId);

      expect(items).toEqual([]);
    });

    it('should return all items in the cart', () => {
      const contextId = client.createContext();

      client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 50.0,
        quantity: 1,
      });

      client.addItem(contextId, {
        productType: ProductType.DEVICE,
        name: 'Device 1',
        price: 500.0,
        quantity: 1,
      });

      const items = client.getCart(contextId);

      expect(items).toHaveLength(2);
      expect(items[0].name).toBe('Plan 1');
      expect(items[1].name).toBe('Device 1');
    });

    it('should throw SF_CONTEXT_EXPIRED for expired context', () => {
      const contextId = client.createContext();

      vi.advanceTimersByTime(6 * 60 * 1000);

      try {
        client.getCart(contextId);
        throw new Error('Should have thrown SF_CONTEXT_EXPIRED');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_CONTEXT_EXPIRED');
      }
    });
  });

  describe('removeItem', () => {
    it('should remove an item from the cart', () => {
      const contextId = client.createContext();

      const item = client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 50.0,
        quantity: 1,
      });

      client.removeItem(contextId, item.itemId);

      const items = client.getCart(contextId);
      expect(items).toHaveLength(0);
    });

    it('should throw SF_ITEM_NOT_FOUND for non-existent item', () => {
      const contextId = client.createContext();

      try {
        client.removeItem(contextId, 'non-existent-item');
        throw new Error('Should have thrown SF_ITEM_NOT_FOUND');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_ITEM_NOT_FOUND');
      }
    });

    it('should throw SF_CONTEXT_EXPIRED for expired context', () => {
      const contextId = client.createContext();

      const item = client.addItem(contextId, {
        productType: ProductType.ADDON,
        name: 'Addon 1',
        price: 10.0,
        quantity: 1,
      });

      vi.advanceTimersByTime(6 * 60 * 1000);

      try {
        client.removeItem(contextId, item.itemId);
        throw new Error('Should have thrown SF_CONTEXT_EXPIRED');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_CONTEXT_EXPIRED');
      }
    });
  });

  describe('checkout', () => {
    it('should successfully checkout a cart with items', () => {
      const contextId = client.createContext();

      client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 75.0,
        quantity: 1,
      });

      const result = client.checkout(contextId);

      expect(result.orderId).toBeDefined();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Plan 1');
    });

    it('should throw SF_EMPTY_CART when checking out empty cart', () => {
      const contextId = client.createContext();

      try {
        client.checkout(contextId);
        throw new Error('Should have thrown SF_EMPTY_CART');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_EMPTY_CART');
      }
    });

    it('should throw SF_ALREADY_CHECKED_OUT when checking out twice', () => {
      const contextId = client.createContext();

      client.addItem(contextId, {
        productType: ProductType.DEVICE,
        name: 'Device 1',
        price: 999.0,
        quantity: 1,
      });

      client.checkout(contextId);

      try {
        client.checkout(contextId);
        throw new Error('Should have thrown SF_ALREADY_CHECKED_OUT');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_ALREADY_CHECKED_OUT');
      }
    });

    it('should throw SF_CONTEXT_EXPIRED for expired context', () => {
      const contextId = client.createContext();

      client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 50.0,
        quantity: 1,
      });

      vi.advanceTimersByTime(6 * 60 * 1000);

      try {
        client.checkout(contextId);
        throw new Error('Should have thrown SF_CONTEXT_EXPIRED');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_CONTEXT_EXPIRED');
      }
    });
  });

  describe('context expiry behavior', () => {
    it('should NOT expire if accessed within 5 minutes', () => {
      const contextId = client.createContext();

      client.addItem(contextId, {
        productType: ProductType.MOBILE_PLAN,
        name: 'Plan 1',
        price: 50.0,
        quantity: 1,
      });

      // Advance 4 minutes
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Access the cart (refreshes lastAccessedAt)
      const items = client.getCart(contextId);
      expect(items).toHaveLength(1);

      // Advance another 4 minutes (8 minutes total, but only 4 since last access)
      vi.advanceTimersByTime(4 * 60 * 1000);

      // Should still be valid
      const items2 = client.getCart(contextId);
      expect(items2).toHaveLength(1);
    });

    it('should expire after 5 minutes of inactivity', () => {
      const contextId = client.createContext();

      // No activity for 6 minutes
      vi.advanceTimersByTime(6 * 60 * 1000);

      try {
        client.getCart(contextId);
        throw new Error('Should have thrown SF_CONTEXT_EXPIRED');
      } catch (error) {
        expect(error).toBeInstanceOf(SalesforceCartClientError);
        expect((error as SalesforceCartClientError).code).toBe('SF_CONTEXT_EXPIRED');
      }
    });
  });
});
