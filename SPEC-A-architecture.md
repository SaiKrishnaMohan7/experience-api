# SPEC-A-architecture.md

## System Overview

Build an Experience API for a telecom shopping cart that abstracts Salesforce cart operations. The API must handle Salesforce context expiry transparently, ensuring clients never need to know about underlying Salesforce implementation details.

---

## Architecture Layers

### 1. API Layer (HTTP)
- **Framework**: Express (minimal, well-documented, familiar)
- **Responsibilities**:
  - Route handling and request parsing
  - Request validation using Zod schemas
  - Error transformation (internal errors → HTTP responses)
  - Response formatting (consistent JSON structure)
- **No business logic**: Controllers delegate to CartService

### 2. Domain/Service Layer
- **CartService**: Core business logic
  - Operations: createCart, getCart, addItem, removeItem, checkout
  - Handles Salesforce context refresh transparently
  - Calculates cart totals
  - Pure business logic, no HTTP or infrastructure concerns
- **Domain Models**: 
  - Cart: Represents customer shopping cart
  - LineItem: Individual products in cart
  - Order: Result of checkout operation

### 3. Infrastructure Layer
- **SalesforceCartClient** (test double)
  - Simulates Salesforce Commerce Cloud cart API
  - Implements realistic context expiry behavior (5 minutes)
  - Methods: `createContext()`, `addItem()`, `getCart()`, `removeItem()`, `checkout()`
  - Throws specific errors: `SF_CONTEXT_EXPIRED`, `SF_ITEM_NOT_FOUND`, `SF_SERVICE_ERROR`
- **CartContextStore** (in-memory)
  - Maps `cartId → SalesforceContext`
  - Tracks context creation time and last access time
  - Provides context expiry detection

---

## Key Abstractions

### Cart (Domain Model)
```typescript
interface Cart {
  cartId: string;           // UUID - our API's identifier
  items: LineItem[];
  totalPrice: number;       // Computed: sum of all item totals
  createdAt: Date;
  updatedAt: Date;
}
```

### ProductType (Enum)
```typescript
enum ProductType {
  MOBILE_PLAN = 'MOBILE_PLAN',
  DEVICE = 'DEVICE',
  ADDON = 'ADDON'
}
```

### LineItem (Domain Model)
```typescript
interface LineItem {
  itemId: string;           // UUID - unique per item
  productType: ProductType;
  name: string;
  price: number;            // Unit price
  quantity: number;
}
```

### SalesforceContext (Internal)
```typescript
interface SalesforceContext {
  sfContextId: string;      // Salesforce's context token
  cartId: string;           // Maps back to our Cart
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;          // createdAt + 5 minutes
}
```

### Order (Domain Model)
```typescript
interface Order {
  orderId: string;
  cartId: string;
  items: LineItem[];
  totalPrice: number;
  status: 'COMPLETED';
  completedAt: Date;
}
```

---

## Context Expiry Strategy: Transparent Refresh

**Problem**: Salesforce cart contexts expire after 5 minutes of inactivity. Clients should not be aware of this.

**Solution**: Automatic context refresh with state replay.

### Implementation Flow:

```
1. Client makes request with cartId
2. CartService retrieves SalesforceContext from store
3. Check if context expired: (now - lastAccessedAt) > 5 minutes
4. If expired:
   a. Call SF to create new context → get new sfContextId
   b. Replay cart state: re-add all items from stored cart
   c. Update context mapping: cartId → new sfContextId
   d. Update lastAccessedAt
5. If not expired:
   a. Proceed with operation
   b. Update lastAccessedAt on success
6. Return result to client
```

### Tradeoffs:
- ✅ **Pro**: Clients never see Salesforce complexity
- ✅ **Pro**: Seamless user experience across expiry boundaries
- ⚠️ **Con**: Slight latency spike on first request after expiry (one-time cost)
- ⚠️ **Con**: Must maintain cart state in memory to replay

---

## Error Handling Strategy

### Salesforce Client Errors → API Errors

| SF Error | HTTP Status | API Error Code | Action |
|----------|-------------|----------------|---------|
| `SF_CONTEXT_EXPIRED` | N/A | N/A | Trigger transparent refresh, retry |
| `SF_ITEM_NOT_FOUND` | 404 | `ITEM_NOT_FOUND` | Return to client |
| `SF_INVALID_PRODUCT` | 400 | `VALIDATION_ERROR` | Return to client |
| `SF_SERVICE_ERROR` | 503 | `SERVICE_UNAVAILABLE` | Return to client |

### Business Logic Errors

| Condition | HTTP Status | Error Code |
|-----------|-------------|------------|
| Cart not found | 404 | `CART_NOT_FOUND` |
| Item not found in cart | 404 | `ITEM_NOT_FOUND` |
| Invalid product data | 400 | `VALIDATION_ERROR` |
| Empty cart checkout | 400 | `EMPTY_CART` |
| Cart already checked out | 409 | `CART_ALREADY_CHECKED_OUT` |

### Error Response Format
All errors return:
```typescript
{
  error: string;      // Machine-readable error code
  message: string;    // Human-readable description
  details?: string[]; // Optional validation details
}
```

---

## State Management

### In-Memory Stores

**CartStore**: `Map<cartId, Cart>`
- Stores complete cart state
- Used for context replay after expiry
- Updated on every cart modification

**ContextStore**: `Map<cartId, SalesforceContext>`
- Maps our cartId to Salesforce contextId
- Tracks expiry timing
- Updated on context creation/refresh

**OrderStore**: `Map<orderId, Order>`
- Stores completed orders
- Prevents cart modification after checkout

### Why In-Memory?
- Exercise constraint: "No database"
- Acceptable for test/demo: state lost on restart
- Real production would use Redis/persistent store

---

## Testing Strategy

### Unit Tests Required

**CartService Tests**:
- ✅ Create cart successfully
- ✅ Add item to cart, verify total calculation
- ✅ Remove item from cart, verify total recalculation
- ✅ Get cart with expired context → triggers refresh
- ✅ Checkout with items succeeds
- ✅ Checkout empty cart fails with 400
- ✅ Checkout already checked out cart fails with 409

**SalesforceCartClient Tests**:
- ✅ Context expires after 5 minutes
- ✅ Operations with expired context throw `SF_CONTEXT_EXPIRED`
- ✅ Cart state persists within valid context
- ✅ Multiple contexts can coexist

**Context Refresh Logic Tests**:
- ✅ Detects expired context correctly
- ✅ Creates new context and replays items
- ✅ Updates context mapping after refresh

### Test Double Behavior

**SalesforceCartClient must simulate**:
- Generate unique contextIds (UUID)
- Store context creation time
- Check expiry on every operation (5 min TTL)
- Throw `SF_CONTEXT_EXPIRED` for expired contexts
- Maintain in-memory cart state per contextId
- Support all cart operations: create, add, remove, get, checkout

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| HTTP Framework | Express 4.x | Minimal, well-documented, standard choice |
| Language | TypeScript 5.x | Type safety, better tooling |
| Runtime | Node 20+ | Exercise requirement |
| Validation | Zod 3.x | Type-safe schema validation, great TS integration |
| Testing | Vitest | Fast, native TS support, modern API |
| UUID | `crypto.randomUUID()` | Built-in Node 20+, no dependencies |

---

## Project Structure

```
src/
├── api/
│   ├── routes.ts              # Express route definitions
│   ├── controllers/
│   │   └── cart.controller.ts # Request/response handling
│   └── middleware/
│       └── error.middleware.ts # Global error handler
├── domain/
│   ├── models/
│   │   ├── Cart.ts
│   │   ├── LineItem.ts
│   │   ├── Order.ts
│   │   └── ProductType.ts     # Enum definition
│   ├── services/
│   │   └── CartService.ts     # Core business logic
│   └── schemas/
│       └── validation.ts       # Zod schemas
├── infrastructure/
│   ├── salesforce/
│   │   └── SalesforceCartClient.ts  # Test double
│   └── stores/
│       ├── CartStore.ts
│       ├── ContextStore.ts
│       └── OrderStore.ts
└── index.ts                   # App entry point

tests/
├── unit/
│   ├── CartService.test.ts
│   ├── SalesforceCartClient.test.ts
│   └── context-refresh.test.ts
└── integration/
    └── cart-api.test.ts       # Optional: full API tests
```

---

## Design Decisions & Tradeoffs

### 1. Context Refresh Strategy
**Decision**: Transparent refresh with state replay
**Alternative**: Force client to create new cart
**Rationale**: Better UX, hides SF implementation details

### 2. In-Memory Stores
**Decision**: Simple Maps for cart/context/order storage
**Alternative**: Redis, database
**Rationale**: Exercise constraint, adequate for demo

### 3. Synchronous Context Refresh
**Decision**: Block request while refreshing expired context
**Alternative**: Background refresh, eventual consistency
**Rationale**: Simpler, ensures data consistency, acceptable latency for demo

### 4. No Authentication
**Decision**: Assume auth handled upstream (API gateway)
**Alternative**: Implement JWT/session auth
**Rationale**: Out of scope, focus on cart logic

### 5. Express Over Fastify
**Decision**: Express for HTTP framework
**Alternative**: Fastify (faster), Hono (modern)
**Rationale**: More familiar, adequate performance for demo

---

## Known Limitations (Acceptable for Exercise)

1. **No Persistence**: All state lost on restart
2. **No Concurrency Control**: Race conditions possible with concurrent requests
3. **No Rate Limiting**: Could be abused in production
4. **No Authentication**: Anyone can access any cart
5. **No Input Sanitization**: Beyond Zod validation
6. **No Logging/Observability**: No structured logging or metrics
7. **No Retry Logic**: Single attempt for SF operations (besides context refresh)
8. **Memory Leak in Context Refresh**: When a context expires and is refreshed, the old `SFInternalCartState` remains in `SalesforceCartClient.contexts` Map. Production solutions:
   - Auto-delete expired contexts when `SF_CONTEXT_EXPIRED` is thrown
   - Implement lazy garbage collection (periodic sweep of expired entries)
   - Use TTL-based cache like Redis with automatic eviction
   - The cleanup should remain internal to SalesforceCartClient - CartService should never manage SF's internal storage

---

## Implementation Notes for Claude Code

1. **Start with infrastructure**: Build SalesforceCartClient first (easiest to test)
2. **Then domain**: Implement CartService with context refresh logic
3. **Finally API**: Wire up Express routes to CartService
4. **Test as you go**: Write unit tests for each layer before moving to next
5. **Use dependency injection**: Pass stores/clients to services for testability
6. **Separate concerns**: Controllers should be thin, services contain logic
7. **Immutability**: Prefer pure functions, avoid mutating inputs
8. **Type everything**: Leverage TypeScript, avoid `any`
