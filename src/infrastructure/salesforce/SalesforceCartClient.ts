import { randomUUID } from 'crypto';
import { LineItem } from '../../domain/models/LineItem';

const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface SFCartContext {
  contextId: string;
  items: LineItem[];
  createdAt: Date;
  lastAccessedAt: Date;
  checkedOut: boolean;
}

export class SalesforceCartClientError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'SalesforceCartClientError';
  }
}

export class SalesforceCartClient {
  private contexts: Map<string, SFCartContext> = new Map();

  createContext(): string {
    const contextId = randomUUID();
    const now = new Date();

    this.contexts.set(contextId, {
      contextId,
      items: [],
      createdAt: now,
      lastAccessedAt: now,
      checkedOut: false,
    });

    return contextId;
  }

  addItem(contextId: string, item: Omit<LineItem, 'itemId'>): LineItem {
    this.validateContext(contextId);
    const context = this.contexts.get(contextId)!;

    const itemId = randomUUID();
    const newItem: LineItem = {
      itemId,
      ...item,
    };

    context.items.push(newItem);
    context.lastAccessedAt = new Date();

    return newItem;
  }

  getCart(contextId: string): LineItem[] {
    this.validateContext(contextId);
    const context = this.contexts.get(contextId)!;
    context.lastAccessedAt = new Date();
    return [...context.items]; // Return copy
  }

  removeItem(contextId: string, itemId: string): void {
    this.validateContext(contextId);
    const context = this.contexts.get(contextId)!;

    const index = context.items.findIndex((item) => item.itemId === itemId);
    if (index === -1) {
      throw new SalesforceCartClientError(
        'SF_ITEM_NOT_FOUND',
        `Item with id '${itemId}' not found`
      );
    }

    context.items.splice(index, 1);
    context.lastAccessedAt = new Date();
  }

  checkout(contextId: string): { orderId: string; items: LineItem[] } {
    this.validateContext(contextId);
    const context = this.contexts.get(contextId)!;

    if (context.checkedOut) {
      throw new SalesforceCartClientError(
        'SF_ALREADY_CHECKED_OUT',
        'Context already checked out'
      );
    }

    if (context.items.length === 0) {
      throw new SalesforceCartClientError(
        'SF_EMPTY_CART',
        'Cannot checkout empty cart'
      );
    }

    context.checkedOut = true;
    context.lastAccessedAt = new Date();

    return {
      orderId: randomUUID(),
      items: [...context.items],
    };
  }

  private validateContext(contextId: string): void {
    const context = this.contexts.get(contextId);

    if (!context) {
      throw new SalesforceCartClientError(
        'SF_CONTEXT_NOT_FOUND',
        `Context '${contextId}' not found`
      );
    }

    const now = new Date();
    const timeSinceLastAccess = now.getTime() - context.lastAccessedAt.getTime();

    if (timeSinceLastAccess > CONTEXT_TTL_MS) {
      throw new SalesforceCartClientError(
        'SF_CONTEXT_EXPIRED',
        `Context '${contextId}' has expired`
      );
    }
  }

  // Test helper to clear all contexts
  clearAll(): void {
    this.contexts.clear();
  }
}
