import { ProductType } from './ProductType';

export interface LineItem {
  itemId: string;
  productType: ProductType;
  name: string;
  price: number;
  quantity: number;
}
