import { Request, Response, NextFunction } from 'express';
import { CartServiceError } from '../../domain/services/CartService';
import { ZodError } from 'zod';
import { logger } from '../../infrastructure/logger/logger';

interface ErrorResponse {
  error: string;
  message: string;
  details?: string[];
}

const HTTP_STATUS_MAP: Record<string, number> = {
  CART_NOT_FOUND: 404,
  ITEM_NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  EMPTY_CART: 400,
  CART_ALREADY_CHECKED_OUT: 409,
  SERVICE_UNAVAILABLE: 503,
};

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle CartService errors
  if (err instanceof CartServiceError) {
    const statusCode = HTTP_STATUS_MAP[err.code] || 500;
    const response: ErrorResponse = {
      error: err.code,
      message: err.message,
    };

    // Log business errors at appropriate level
    if (statusCode >= 500) {
      logger.error({ err, method: req.method, path: req.path }, 'Service error occurred');
    } else {
      logger.warn({ code: err.code, method: req.method, path: req.path }, err.message);
    }

    res.status(statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      error: 'VALIDATION_ERROR',
      message: 'Invalid product data',
      details: err.errors.map((e) => e.message),
    };

    logger.warn({ errors: err.errors, method: req.method, path: req.path }, 'Validation error');
    res.status(400).json(response);
    return;
  }

  // Handle unknown errors - these should be investigated
  logger.error(
    {
      err,
      method: req.method,
      path: req.path,
      body: req.body,
      params: req.params,
    },
    'Unexpected error occurred'
  );

  const response: ErrorResponse = {
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };
  res.status(500).json(response);
}
