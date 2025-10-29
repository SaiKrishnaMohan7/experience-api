import { Router } from 'express';
import { CartController } from './controllers/cart.controller';

export function createCartRoutes(cartController: CartController): Router {
  const router = Router();

  // POST /api/v1/cart - Create a new cart
  router.post('/cart', (req, res, next) => cartController.createCart(req, res, next));

  // GET /api/v1/cart/:cartId - Get cart by ID
  router.get('/cart/:cartId', (req, res, next) => cartController.getCart(req, res, next));

  // POST /api/v1/cart/:cartId/items - Add item to cart
  router.post('/cart/:cartId/items', (req, res, next) => cartController.addItem(req, res, next));

  // DELETE /api/v1/cart/:cartId/items/:itemId - Remove item from cart
  router.delete('/cart/:cartId/items/:itemId', (req, res, next) =>
    cartController.removeItem(req, res, next)
  );

  // POST /api/v1/cart/:cartId/checkout - Checkout cart
  router.post('/cart/:cartId/checkout', (req, res, next) => cartController.checkout(req, res, next));

  return router;
}
