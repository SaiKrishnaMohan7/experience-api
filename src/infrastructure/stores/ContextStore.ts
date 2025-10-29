export interface SalesforceContext {
  sfContextId: string;
  cartId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  itemIdMapping: Map<string, string>; // Our itemId -> SF itemId
}

export class ContextStore {
  private contexts: Map<string, SalesforceContext> = new Map();

  set(cartId: string, context: SalesforceContext): void {
    this.contexts.set(cartId, context);
  }

  get(cartId: string): SalesforceContext | undefined {
    return this.contexts.get(cartId);
  }

  has(cartId: string): boolean {
    return this.contexts.has(cartId);
  }

  delete(cartId: string): boolean {
    return this.contexts.delete(cartId);
  }

  clear(): void {
    this.contexts.clear();
  }
}
