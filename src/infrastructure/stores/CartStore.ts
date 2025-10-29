import { Cart } from '../../domain/models/Cart';

export class CartStore {
  private carts: Map<string, Cart> = new Map();

  set(cartId: string, cart: Cart): void {
    this.carts.set(cartId, cart);
  }

  get(cartId: string): Cart | undefined {
    return this.carts.get(cartId);
  }

  has(cartId: string): boolean {
    return this.carts.has(cartId);
  }

  delete(cartId: string): boolean {
    return this.carts.delete(cartId);
  }

  clear(): void {
    this.carts.clear();
  }
}
