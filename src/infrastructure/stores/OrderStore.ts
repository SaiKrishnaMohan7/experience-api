import { Order } from '../../domain/models/Order';

export class OrderStore {
  private orders: Map<string, Order> = new Map();
  private cartToOrder: Map<string, string> = new Map();

  set(orderId: string, order: Order): void {
    this.orders.set(orderId, order);
    this.cartToOrder.set(order.cartId, orderId);
  }

  get(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getByCartId(cartId: string): Order | undefined {
    const orderId = this.cartToOrder.get(cartId);
    return orderId ? this.orders.get(orderId) : undefined;
  }

  hasCartBeenCheckedOut(cartId: string): boolean {
    return this.cartToOrder.has(cartId);
  }

  clear(): void {
    this.orders.clear();
    this.cartToOrder.clear();
  }
}
