import { Request, Response, NextFunction } from 'express';
import { CartService } from '../../domain/services/CartService';
import { AddItemSchema } from '../../domain/schemas/validation';
import { Cart } from '../../domain/models/Cart';
import { Order } from '../../domain/models/Order';

/**
 * Cart controller - thin layer that handles HTTP requests/responses.
 * All business logic is delegated to CartService.
 */
export class CartController {
  constructor(private cartService: CartService) {}

  async createCart(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await this.cartService.createCart();
      res.status(201).json(this.formatCartResponse(cart));
    } catch (error) {
      next(error);
    }
  }

  async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cartId } = req.params;
      const cart = await this.cartService.getCart(cartId);
      res.status(200).json(this.formatCartResponse(cart));
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cartId } = req.params;

      // Validate request body with Zod
      const validatedData = AddItemSchema.parse(req.body);

      const cart = await this.cartService.addItem(cartId, validatedData);
      res.status(200).json(this.formatCartResponse(cart));
    } catch (error) {
      next(error);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cartId, itemId } = req.params;
      const cart = await this.cartService.removeItem(cartId, itemId);
      res.status(200).json(this.formatCartResponse(cart));
    } catch (error) {
      next(error);
    }
  }

  async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cartId } = req.params;
      const order = await this.cartService.checkout(cartId);
      res.status(200).json(this.formatOrderResponse(order));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format cart for API response with ISO timestamps and 2 decimal places for prices
   */
  private formatCartResponse(cart: Cart) {
    return {
      cartId: cart.cartId,
      items: cart.items.map((item) => ({
        itemId: item.itemId,
        productType: item.productType,
        name: item.name,
        price: Number(item.price.toFixed(2)),
        quantity: item.quantity,
      })),
      totalPrice: Number(cart.totalPrice.toFixed(2)),
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }

  /**
   * Format order for API response with ISO timestamps and 2 decimal places for prices
   */
  private formatOrderResponse(order: Order) {
    return {
      orderId: order.orderId,
      cartId: order.cartId,
      items: order.items.map((item) => ({
        itemId: item.itemId,
        productType: item.productType,
        name: item.name,
        price: Number(item.price.toFixed(2)),
        quantity: item.quantity,
      })),
      totalPrice: Number(order.totalPrice.toFixed(2)),
      status: order.status,
      completedAt: order.completedAt.toISOString(),
    };
  }
}
