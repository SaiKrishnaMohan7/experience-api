import { randomUUID } from 'crypto';
import { Cart } from '../models/Cart';
import { LineItem } from '../models/LineItem';
import { Order } from '../models/Order';
import { SalesforceCartClient, SalesforceCartClientError, SFCheckoutResult } from '../../infrastructure/salesforce/SalesforceCartClient';
import { CartStore } from '../../infrastructure/stores/CartStore';
import { ContextStore, SalesforceContext } from '../../infrastructure/stores/ContextStore';
import { OrderStore } from '../../infrastructure/stores/OrderStore';

const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CartServiceError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CartServiceError';
  }
}

export class CartService {
  constructor(
    private sfClient: SalesforceCartClient,
    private cartStore: CartStore,
    private contextStore: ContextStore,
    private orderStore: OrderStore
  ) {}

  async createCart(): Promise<Cart> {
    try {
      const cartId = randomUUID();
      const sfContextId = this.sfClient.createContext();

      const now = new Date();
      const context: SalesforceContext = {
        sfContextId,
        cartId,
        createdAt: now,
        lastAccessedAt: now,
        expiresAt: new Date(now.getTime() + CONTEXT_TTL_MS),
        itemIdMapping: new Map(),
      };

      const cart: Cart = {
        cartId,
        items: [],
        totalPrice: 0,
        createdAt: now,
        updatedAt: now,
      };

      this.contextStore.set(cartId, context);
      this.cartStore.set(cartId, cart);

      return cart;
    } catch (error) {
      if (error instanceof SalesforceCartClientError) {
        throw new CartServiceError('SERVICE_UNAVAILABLE', 'Unable to create cart. Please try again.');
      }
      throw error;
    }
  }

  async getCart(cartId: string): Promise<Cart> {
    const cart = this.cartStore.get(cartId);
    if (!cart) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    try {
      await this.ensureValidContext(cartId);
      return { ...cart };
    } catch (error) {
      if (error instanceof SalesforceCartClientError) {
        throw new CartServiceError('SERVICE_UNAVAILABLE', 'Unable to retrieve cart. Please try again.');
      }
      throw error;
    }
  }

  async addItem(cartId: string, item: Omit<LineItem, 'itemId'>): Promise<Cart> {
    const cart = this.cartStore.get(cartId);
    if (!cart) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    // Check if cart has been checked out
    if (this.orderStore.hasCartBeenCheckedOut(cartId)) {
      throw new CartServiceError('CART_ALREADY_CHECKED_OUT', 'This cart has already been checked out');
    }

    try {
      const sfContextId = await this.ensureValidContext(cartId);
      const context = this.contextStore.get(cartId)!;

      // Generate our own stable item ID
      const ourItemId = randomUUID();

      // Add item to Salesforce
      const sfItem = this.sfClient.addItem(sfContextId, item);

      // Map our item ID to SF's item ID
      context.itemIdMapping.set(ourItemId, sfItem.itemId);
      this.contextStore.set(cartId, context);

      // Create item with our stable ID
      const newItem: LineItem = {
        ...sfItem,
        itemId: ourItemId, // Use our stable ID, not SF's
      };

      // Update local cart
      cart.items.push(newItem);
      cart.totalPrice = this.calculateTotal(cart.items);
      cart.updatedAt = new Date();

      this.cartStore.set(cartId, cart);

      return { ...cart };
    } catch (error) {
      if (error instanceof SalesforceCartClientError) {
        throw new CartServiceError('SERVICE_UNAVAILABLE', 'Unable to add item to cart. Please try again.');
      }
      throw error;
    }
  }

  async removeItem(cartId: string, itemId: string): Promise<Cart> {
    const cart = this.cartStore.get(cartId);
    if (!cart) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    // Check if cart has been checked out
    if (this.orderStore.hasCartBeenCheckedOut(cartId)) {
      throw new CartServiceError('CART_ALREADY_CHECKED_OUT', 'This cart has already been checked out');
    }

    // Check if item exists in local cart
    const itemIndex = cart.items.findIndex((item) => item.itemId === itemId);
    if (itemIndex === -1) {
      throw new CartServiceError('ITEM_NOT_FOUND', `Item with id '${itemId}' not found in cart`);
    }

    try {
      const sfContextId = await this.ensureValidContext(cartId);
      const context = this.contextStore.get(cartId)!;

      // Translate our item ID to SF's item ID
      const sfItemId = context.itemIdMapping.get(itemId);
      if (!sfItemId) {
        throw new CartServiceError('ITEM_NOT_FOUND', `Item with id '${itemId}' not found in cart`);
      }

      // Remove from Salesforce using SF's item ID
      this.sfClient.removeItem(sfContextId, sfItemId);

      // Remove mapping
      context.itemIdMapping.delete(itemId);
      this.contextStore.set(cartId, context);

      // Update local cart
      cart.items.splice(itemIndex, 1);
      cart.totalPrice = this.calculateTotal(cart.items);
      cart.updatedAt = new Date();

      this.cartStore.set(cartId, cart);

      return { ...cart };
    } catch (error) {
      if (error instanceof SalesforceCartClientError) {
        if (error.code === 'SF_ITEM_NOT_FOUND') {
          throw new CartServiceError('ITEM_NOT_FOUND', `Item with id '${itemId}' not found in cart`);
        }
        throw new CartServiceError('SERVICE_UNAVAILABLE', 'Unable to remove item from cart. Please try again.');
      }
      throw error;
    }
  }

  async checkout(cartId: string): Promise<Order> {
    const cart = this.cartStore.get(cartId);
    if (!cart) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    // Check if cart has been checked out
    if (this.orderStore.hasCartBeenCheckedOut(cartId)) {
      throw new CartServiceError('CART_ALREADY_CHECKED_OUT', 'This cart has already been checked out');
    }

    // Check if cart is empty
    if (cart.items.length === 0) {
      throw new CartServiceError('EMPTY_CART', 'Cannot checkout an empty cart');
    }

    try {
      const sfContextId = await this.ensureValidContext(cartId);

      // Checkout in Salesforce
      const sfResult: SFCheckoutResult = this.sfClient.checkout(sfContextId);

      // Create order
      const order: Order = {
        orderId: sfResult.orderId,
        cartId,
        items: [...cart.items],
        totalPrice: cart.totalPrice,
        status: 'COMPLETED',
        completedAt: new Date(),
      };

      this.orderStore.set(order.orderId, order);

      return order;
    } catch (error) {
      if (error instanceof SalesforceCartClientError) {
        if (error.code === 'SF_EMPTY_CART') {
          throw new CartServiceError('EMPTY_CART', 'Cannot checkout an empty cart');
        }
        if (error.code === 'SF_ALREADY_CHECKED_OUT') {
          throw new CartServiceError('CART_ALREADY_CHECKED_OUT', 'This cart has already been checked out');
        }
        throw new CartServiceError('SERVICE_UNAVAILABLE', 'Unable to complete checkout. Please try again.');
      }
      throw error;
    }
  }

  /**
   * Ensures the Salesforce context is valid and refreshes if expired.
   * Returns the valid SF context ID.
   */
  private async ensureValidContext(cartId: string): Promise<string> {
    const context = this.contextStore.get(cartId);
    if (!context) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    const now = new Date();
    const timeSinceLastAccess = now.getTime() - context.lastAccessedAt.getTime();

    // Check if context has expired
    if (timeSinceLastAccess > CONTEXT_TTL_MS) {
      // Context expired - refresh transparently
      return await this.refreshContext(cartId);
    }

    // Context is still valid, update last accessed time
    context.lastAccessedAt = now;
    this.contextStore.set(cartId, context);

    return context.sfContextId;
  }

  /**
   * Creates a new Salesforce context and replays cart state.
   */
  private async refreshContext(cartId: string): Promise<string> {
    const cart = this.cartStore.get(cartId);
    if (!cart) {
      throw new CartServiceError('CART_NOT_FOUND', `Cart with id '${cartId}' not found`);
    }

    // Create new SF context
    const newSfContextId = this.sfClient.createContext();

    // Replay all items and update the item ID mapping with new SF item IDs
    const newItemIdMapping = new Map<string, string>();

    for (const item of cart.items) {
      const { itemId, ...itemData } = item;
      // Add item to SF and get new SF item
      const newSfItem = this.sfClient.addItem(newSfContextId, itemData);

      // Map our stable item ID to the new SF item ID
      newItemIdMapping.set(itemId, newSfItem.itemId);
    }

    // Update context with new SF context ID and updated mapping
    const now = new Date();
    const newContext: SalesforceContext = {
      sfContextId: newSfContextId,
      cartId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + CONTEXT_TTL_MS),
      itemIdMapping: newItemIdMapping,
    };

    this.contextStore.set(cartId, newContext);

    return newSfContextId;
  }

  private calculateTotal(items: LineItem[]): number {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }
}
