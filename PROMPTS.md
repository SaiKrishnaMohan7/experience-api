# PROMPTS.md

This document contains the exact prompts given to Claude Code during implementation, along with notes about what was accepted or edited.

---

## Prompt 1: Project Setup and Infrastructure Layer

**Date/Time**: [Fill in when you run this]

**Prompt**:
```
Let's start implementing the Bell telecom cart API. 

## Phase 1: Project Setup

Set up the Node.js TypeScript project with:
1. package.json with all required dependencies
2. tsconfig.json with strict mode
3. Project directory structure as specified
4. npm scripts: dev, test, build

Stop after setup and show me the package.json and tsconfig.json for review.

## Phase 2: Infrastructure Layer - Models and Stores

Implement:
1. ProductType enum (src/domain/models/ProductType.ts)
2. Domain models: Cart, LineItem, Order (src/domain/models/)
3. In-memory stores: CartStore, ContextStore, OrderStore (src/infrastructure/stores/)

Stop and show me the key interfaces and store implementations for review.

## Phase 3: Infrastructure Layer - Salesforce Client

Implement SalesforceCartClient test double (src/infrastructure/salesforce/SalesforceCartClient.ts):
- Simulate context expiry (5 minute TTL)
- Throw SF_CONTEXT_EXPIRED when expired
- Maintain in-memory cart state per contextId
- All CRUD operations for cart

Stop and show me the SalesforceCartClient implementation for review.

## Phase 4: Write Infrastructure Tests

Write unit tests in tests/unit/:
1. SalesforceCartClient context expiry behavior
2. Store operations (add, get, delete)

Run tests and show me the results.

**STOP HERE and wait for my approval before proceeding to domain layer.**
```

**What I Accepted**:
- [Fill in after running]

**What I Edited**:
- [Fill in after running]

**Notes**:
- [Any observations]

---

## Prompt 2: Domain Layer (CartService)

**Date/Time**: [Fill in when you run this]

**Prompt**:
```
Great! Infrastructure layer looks good. Let's implement the domain layer.

## Phase 5: CartService Implementation

Implement CartService (src/domain/services/CartService.ts):

1. Constructor with dependency injection:
   - cartStore, contextStore, orderStore, salesforceClient

2. Implement all methods:
   - createCart()
   - getCart(cartId) 
   - addItem(cartId, item)
   - removeItem(cartId, itemId)
   - checkout(cartId)

3. **CRITICAL**: Implement transparent context refresh:
   - Check expiry before each SF operation
   - If expired: create new context, replay items, update mapping
   - Update lastAccessedAt on success

4. Error handling and business rules:
   - Transform SF errors to domain errors
   - Validate empty cart checkout
   - Validate already checked out cart

Stop and show me the CartService implementation, especially the context refresh logic.

## Phase 6: CartService Tests

Write comprehensive tests (tests/unit/CartService.test.ts):
1. Create cart successfully
2. Add item, verify totals
3. Remove item, verify totals
4. Get cart with expired context triggers refresh
5. Checkout success
6. Checkout empty cart fails
7. Checkout already checked out fails

Run tests and show results.

**STOP HERE and wait for my approval before proceeding to API layer.**
```

**What I Accepted**:
- [Fill in]

**What I Edited**:
- [Fill in]

**Notes**:
- [Fill in]

---

## Prompt 3: API Layer

**Date/Time**: [Fill in when you run this]

**Prompt**:
```
Excellent! Domain layer is working. Let's build the API layer.

## Phase 7: Validation Schemas

Create Zod schemas (src/domain/schemas/validation.ts):
- AddItemSchema
- CartIdParamSchema  
- ItemIdParamSchema

Stop and show me the validation schemas.

## Phase 8: Error Middleware

Implement error middleware (src/api/middleware/error.middleware.ts):
- Global error handler
- Transform domain errors → HTTP responses
- Map error codes → status codes
- Return consistent format: { error, message, details? }

Stop and show me the error middleware.

## Phase 9: Controllers and Routes

1. Cart controller (src/api/controllers/cart.controller.ts):
   - Thin controllers delegating to CartService
   - Use Zod for validation
   - Methods: createCart, getCart, addItem, removeItem, checkout

2. Routes (src/api/routes.ts):
   - Mount all 5 endpoints at /api/v1
   - Wire up controllers
   - Apply error middleware

3. App entry (src/index.ts):
   - Create Express app
   - Wire up dependencies
   - Start on port 3000

Stop and show me the controller and routes setup.

## Phase 10: Integration Test (Optional)

Create integration test (tests/integration/cart-api.test.ts):
- Full flow: create → add items → get → remove → checkout

Run all tests (unit + integration) and show results.

**STOP HERE and wait for final review.**
```

**What I Accepted**:
- [Fill in]

**What I Edited**:
- [Fill in]

**Notes**:
- [Fill in]

---

## Prompt 4: README, Docker, and Documentation

**Date/Time**: [Fill in when you run this]

**Prompt**:
```
Perfect! Implementation complete. Let's add Docker support and create the README.

## Phase 11: Docker Containerization

Create Docker support with multi-stage build:

1. Dockerfile (multi-stage):
   - **Stage 1 (builder)**:
     - Base: node:20-alpine
     - Install ALL dependencies (including devDependencies)
     - Build TypeScript to dist/
   - **Stage 2 (production)**:
     - Base: node:20-alpine
     - Install production deps only
     - Copy built dist/ from builder stage
     - Run as non-root user (USER node)
     - Expose port 3000
     - CMD: node dist/index.js

2. .dockerignore:
   - Exclude node_modules, dist, tests, docs

**Why multi-stage?** Smaller final image (no devDeps, no source), faster deploys, more secure.

Stop and show me the Dockerfile.

## Phase 12: README

Create README.md with:

1. **Project Overview**: Brief description
2. **Architecture**: High-level overview (reference specs)
3. **Setup**: `npm install`
4. **Run Locally**: `npm run dev`
5. **Run with Docker**: 
   ```bash
   docker build -t bell-cart-api .
   docker run -p 3000:3000 bell-cart-api
   ```
6. **Test**: `npm test`
7. **API Endpoints**: List all 5 endpoints
8. **Key Design Decisions**:
   - Transparent SF context refresh
   - In-memory stores
   - Three-layer architecture
   - ProductType enum
9. **Tradeoffs**:
   - No persistence (acceptable for demo)
   - No auth (out of scope)
   - Synchronous refresh
10. **Known Limitations**:
    - State lost on restart
    - No concurrency control
    - No rate limiting
11. **Testing Strategy**: Unit tests for critical paths

Keep concise but informative.

Show me the README for final review.
```

**What I Accepted**:
- [Fill in]

**What I Edited**:
- [Fill in]

**Notes**:
- [Fill in]

---

## Summary of Implementation Process

**Total Prompts Used**: 4 (plus this one if needed)

**Overall Approach**:
1. Bottom-up implementation (infrastructure → domain → API)
2. Test each layer before moving to the next
3. Incremental validation prevents compounding errors

**Things That Worked Well**:
- [Fill in after completion]

**Things I Had to Fix Manually**:
- [Fill in after completion]

**Time Breakdown**:
- Setup: [X minutes]
- Infrastructure + Tests: [X minutes]
- Domain + Tests: [X minutes]
- API + Tests: [X minutes]
- README: [X minutes]
- **Total**: [X hours]

**Final Thoughts**:
- [Your reflection on using Claude Code for this exercise]
