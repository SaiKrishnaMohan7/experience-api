# Bell Telecom Cart API - Take-Home Exercise

## Project Overview
This is a take-home exercise for Bell (Senior Backend Developer role). The goal is to design and implement a thin Experience API that powers a telecom cart on top of a non-persistent Salesforce cart context.

## Specifications
Read these specification files for complete architectural and API details:
- @SPEC-A-architecture.md - System architecture, layers, abstractions, design decisions
- @SPEC-B-api.md - API endpoint contracts, request/response schemas, error handling

## Core Requirements

### Technology Stack
- **Language**: TypeScript on Node 20+
- **HTTP Framework**: Express (minimal, familiar)
- **Validation**: Zod (type-safe schemas)
- **Testing**: Vitest (fast, TypeScript-native)
- **UUID Generation**: `crypto.randomUUID()` (built-in Node)

### Key Constraints
- No real Salesforce calls - implement SalesforceCartClient test double
- No database - use in-memory stores only
- Write unit tests for critical paths
- Keep small and cohesive
- Correctness and clarity over production polish

## Coding Standards

### TypeScript
- Use strict mode
- Avoid `any` type - leverage TypeScript fully
- Export interfaces and types explicitly
- Use enums for fixed value sets (e.g., ProductType)

### Code Organization
- Separate concerns: thin controllers, logic in services
- Use dependency injection for testability
- Prefer pure functions and immutability
- No business logic in API layer
- No HTTP concerns in domain layer

### Naming Conventions
- Files: PascalCase for classes/interfaces (CartService.ts)
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: No "I" prefix (use `Cart` not `ICare`)

### Data Handling
- All prices: exactly 2 decimal places
- All timestamps: ISO 8601 format (`.toISOString()`)
- All IDs: UUID v4 format
- Cart totals: `sum(item.price * item.quantity)` for all items

### Error Handling
- Use specific error codes (see SPEC-A)
- Transform infrastructure errors to domain errors in service layer
- Transform domain errors to HTTP responses in API layer
- Always include `error` (code) and `message` (human-readable) in responses

## Project Structure
```
src/
├── api/
│   ├── routes.ts
│   ├── controllers/
│   │   └── cart.controller.ts
│   └── middleware/
│       └── error.middleware.ts
├── domain/
│   ├── models/
│   │   ├── Cart.ts
│   │   ├── LineItem.ts
│   │   ├── Order.ts
│   │   └── ProductType.ts
│   ├── services/
│   │   └── CartService.ts
│   └── schemas/
│       └── validation.ts
├── infrastructure/
│   ├── salesforce/
│   │   └── SalesforceCartClient.ts
│   └── stores/
│       ├── CartStore.ts
│       ├── ContextStore.ts
│       └── OrderStore.ts
└── index.ts

tests/
├── unit/
│   ├── CartService.test.ts
│   ├── SalesforceCartClient.test.ts
│   └── context-refresh.test.ts
└── integration/
    └── cart-api.test.ts
```

## Critical Implementation Details

### Salesforce Context Expiry
- Context expires after 5 minutes of inactivity
- Implement transparent refresh in CartService
- Before each SF operation: check if `(now - lastAccessedAt) > 5 minutes`
- If expired: create new context, replay all cart items, update mapping
- Update `lastAccessedAt` on every successful operation
- Client never sees context expiry errors

### Test Double Requirements
SalesforceCartClient must:
- Generate unique contextIds using `crypto.randomUUID()`
- Track context creation time
- Throw `SF_CONTEXT_EXPIRED` error when context expired
- Maintain in-memory cart state per contextId
- Expire contexts after 5 minutes of inactivity

### Testing Focus
Write unit tests for:
- SalesforceCartClient expiry behavior
- CartService context refresh logic
- Cart total calculations
- Error transformations
- Business rule validations (empty cart checkout, already checked out)

## Common Commands (once project is set up)
```bash
npm run dev     # Start development server on port 3000
npm test        # Run all tests
npm run build   # Compile TypeScript

# Docker commands
docker build -t bell-cart-api .
docker run -p 3000:3000 bell-cart-api
```

## Containerization

### Dockerfile Requirements
- **Multi-stage build**:
  - Stage 1 (builder): Install all deps, build TypeScript
  - Stage 2 (production): Copy only built artifacts and prod deps
- Base image: `node:20-alpine` (smaller size)
- Working directory: `/app`
- Stage 1: Install all dependencies (including devDependencies for build)
- Stage 1: Build TypeScript to `dist/`
- Stage 2: Install production dependencies only
- Stage 2: Copy built `dist/` from builder stage
- Run as non-root user (`USER node`) for security
- Expose port 3000
- Run compiled app: `node dist/index.js`

**Benefits of multi-stage build**:
- Smaller final image (no devDependencies, no TypeScript source)
- Faster deployments
- More secure (fewer packages, non-root user)

### .dockerignore
Exclude from Docker build:
- node_modules (will be reinstalled)
- dist (will be rebuilt)
- tests/ and *.test.ts files
- Documentation files (specs, README)
- Git files

## Working Style Preferences

### Development Approach
- **Bottom-up implementation**: Infrastructure → Domain → API
- **Incremental validation**: Test each layer before moving to next
- **Stop and review**: After each major phase, stop and wait for my approval before continuing

### When Implementing
- Show me your plan before writing code
- Explain key design decisions
- Flag any ambiguities or tradeoffs
- Ask questions if specs are unclear

### Code Review Checkpoints
After completing each phase:
1. Summarize what was implemented
2. Show key code snippets or decisions
3. Note any deviations from specs (with rationale)
4. Wait for my approval before proceeding

## Remember
- This is a take-home exercise - demonstrate architectural thinking
- Specs are comprehensive - follow them closely
- Transparent context refresh is the key technical challenge
- Tests validate correctness - don't skip them
- README should document decisions and tradeoffs
