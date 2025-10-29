# SPEC-B-api.md

## API Endpoint Specifications

Base URL: `http://localhost:3000/api/v1`

All requests and responses use `Content-Type: application/json`

---

## 1. Create Cart

**Endpoint**: `POST /cart`

**Description**: Creates a new shopping cart and returns a unique cart identifier.

**Request Body**: 
```json
{}
```
Empty body or omit body entirely.

**Success Response** (201 Created):
```json
{
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [],
  "totalPrice": 0,
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:30:00.000Z"
}
```

**Error Responses**:
- `503 Service Unavailable`: Salesforce service error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to create cart. Please try again."
}
```

---

## 2. Get Cart

**Endpoint**: `GET /cart/:cartId`

**Description**: Retrieves current cart state including all items and total price.

**Path Parameters**:
- `cartId` (string, UUID): The cart identifier

**Success Response** (200 OK):
```json
{
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "item-123",
      "productType": "MOBILE_PLAN",
      "name": "Unlimited Data Plan",
      "price": 75.00,
      "quantity": 1
    },
    {
      "itemId": "item-456",
      "productType": "DEVICE",
      "name": "iPhone 15 Pro",
      "price": 1299.99,
      "quantity": 1
    }
  ],
  "totalPrice": 1374.99,
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:35:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Cart does not exist
```json
{
  "error": "CART_NOT_FOUND",
  "message": "Cart with id '550e8400-e29b-41d4-a716-446655440000' not found"
}
```

- `503 Service Unavailable`: Salesforce service error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to retrieve cart. Please try again."
}
```

---

## 3. Add Item to Cart

**Endpoint**: `POST /cart/:cartId/items`

**Description**: Adds a telecom product (plan, device, or addon) to the cart.

**Path Parameters**:
- `cartId` (string, UUID): The cart identifier

**Request Body**:
```json
{
  "productType": "MOBILE_PLAN",
  "name": "Unlimited Data Plan",
  "price": 75.00,
  "quantity": 1
}
```

**Field Validations**:
- `productType` (required): Must be one of: `MOBILE_PLAN`, `DEVICE`, `ADDON` (use ProductType enum)
- `name` (required): String, 1-200 characters
- `price` (required): Number, must be > 0
- `quantity` (required): Integer, must be >= 1

**Success Response** (200 OK):
```json
{
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "item-789",
      "productType": "MOBILE_PLAN",
      "name": "Unlimited Data Plan",
      "price": 75.00,
      "quantity": 1
    }
  ],
  "totalPrice": 75.00,
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:32:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid request body
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid product data",
  "details": [
    "productType must be one of: MOBILE_PLAN, DEVICE, ADDON",
    "price must be greater than 0"
  ]
}
```

- `404 Not Found`: Cart does not exist
```json
{
  "error": "CART_NOT_FOUND",
  "message": "Cart with id '550e8400-e29b-41d4-a716-446655440000' not found"
}
```

- `503 Service Unavailable`: Salesforce service error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to add item to cart. Please try again."
}
```

---

## 4. Remove Item from Cart

**Endpoint**: `DELETE /cart/:cartId/items/:itemId`

**Description**: Removes a specific item from the cart.

**Path Parameters**:
- `cartId` (string, UUID): The cart identifier
- `itemId` (string): The item identifier to remove

**Success Response** (200 OK):
```json
{
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "item-456",
      "productType": "DEVICE",
      "name": "iPhone 15 Pro",
      "price": 1299.99,
      "quantity": 1
    }
  ],
  "totalPrice": 1299.99,
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:40:00.000Z"
}
```

**Error Responses**:
- `404 Not Found`: Cart does not exist
```json
{
  "error": "CART_NOT_FOUND",
  "message": "Cart with id '550e8400-e29b-41d4-a716-446655440000' not found"
}
```

- `404 Not Found`: Item does not exist in cart
```json
{
  "error": "ITEM_NOT_FOUND",
  "message": "Item with id 'item-999' not found in cart"
}
```

- `503 Service Unavailable`: Salesforce service error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to remove item from cart. Please try again."
}
```

---

## 5. Checkout Cart

**Endpoint**: `POST /cart/:cartId/checkout`

**Description**: Finalizes the cart and creates an order. Cart cannot be modified after checkout.

**Path Parameters**:
- `cartId` (string, UUID): The cart identifier

**Request Body**:
```json
{}
```
Empty body or omit body entirely.

**Success Response** (200 OK):
```json
{
  "orderId": "order-abc123",
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "itemId": "item-123",
      "productType": "MOBILE_PLAN",
      "name": "Unlimited Data Plan",
      "price": 75.00,
      "quantity": 1
    }
  ],
  "totalPrice": 75.00,
  "status": "COMPLETED",
  "completedAt": "2025-10-28T10:45:00.000Z"
}
```

**Error Responses**:
- `400 Bad Request`: Cart is empty
```json
{
  "error": "EMPTY_CART",
  "message": "Cannot checkout an empty cart"
}
```

- `404 Not Found`: Cart does not exist
```json
{
  "error": "CART_NOT_FOUND",
  "message": "Cart with id '550e8400-e29b-41d4-a716-446655440000' not found"
}
```

- `409 Conflict`: Cart already checked out
```json
{
  "error": "CART_ALREADY_CHECKED_OUT",
  "message": "This cart has already been checked out"
}
```

- `503 Service Unavailable`: Salesforce service error
```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "Unable to complete checkout. Please try again."
}
```

---

## Common Data Types

### ProductType (Enum)
```typescript
enum ProductType {
  MOBILE_PLAN = 'MOBILE_PLAN',
  DEVICE = 'DEVICE',
  ADDON = 'ADDON'
}
```

### Cart
```typescript
{
  cartId: string;           // UUID v4
  items: LineItem[];
  totalPrice: number;       // Sum of all item prices * quantities, 2 decimal places
  createdAt: string;        // ISO 8601 datetime
  updatedAt: string;        // ISO 8601 datetime
}
```

### LineItem
```typescript
{
  itemId: string;           // Unique item identifier
  productType: ProductType; // MOBILE_PLAN | DEVICE | ADDON
  name: string;             // 1-200 characters
  price: number;            // Must be > 0, 2 decimal places
  quantity: number;         // Integer >= 1
}
```

### Order (Checkout Response)
```typescript
{
  orderId: string;          // Unique order identifier
  cartId: string;           // Original cart UUID
  items: LineItem[];
  totalPrice: number;
  status: "COMPLETED";
  completedAt: string;      // ISO 8601 datetime
}
```

---

## HTTP Status Codes Summary

- `200 OK`: Successful GET, POST (add item), DELETE (remove item), POST (checkout)
- `201 Created`: Successful cart creation
- `400 Bad Request`: Validation errors, empty cart checkout
- `404 Not Found`: Cart or item not found
- `409 Conflict`: Cart already checked out
- `503 Service Unavailable`: Downstream Salesforce service errors

---

## Implementation Notes for Claude Code

1. **Price Handling**: Always store and return prices with exactly 2 decimal places
2. **UUID Generation**: Use `crypto.randomUUID()` for cartId and itemId generation
3. **Timestamp Format**: All timestamps must be ISO 8601 format (`.toISOString()`)
4. **Total Calculation**: `totalPrice = sum(item.price * item.quantity)` for all items
5. **Error Responses**: Always include `error` (error code) and `message` (human-readable) fields
6. **Validation**: Use Zod schemas to validate request bodies before processing
