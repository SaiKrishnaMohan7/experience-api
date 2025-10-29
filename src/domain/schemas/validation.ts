import { z } from 'zod';
import { ProductType } from '../models/ProductType';

export const AddItemSchema = z.object({
  productType: z.nativeEnum(ProductType, {
    errorMap: () => ({ message: 'productType must be one of: MOBILE_PLAN, DEVICE, ADDON' }),
  }),
  name: z.string().min(1).max(200, 'name must be between 1 and 200 characters'),
  price: z.number().positive('price must be greater than 0'),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
});

export type AddItemInput = z.infer<typeof AddItemSchema>;
