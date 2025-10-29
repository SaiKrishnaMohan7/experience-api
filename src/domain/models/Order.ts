import { LineItem } from './LineItem';

export interface Order {
  orderId: string;
  cartId: string;
  items: LineItem[];
  totalPrice: number;
  status: 'COMPLETED';
  completedAt: Date;
}
