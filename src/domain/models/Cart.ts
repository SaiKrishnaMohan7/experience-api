import { LineItem } from './LineItem';

export interface Cart {
  cartId: string;
  items: LineItem[];
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}
