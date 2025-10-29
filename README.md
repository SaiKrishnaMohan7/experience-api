# Bell Telecom Cart API

Experience API for Bell Telecom shopping cart that provides transparent abstraction over Salesforce cart context management.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- Docker (optional, for containerized deployment)

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd experience-api
npm install
```

2. **Set up environment variables**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if needed (defaults work for local development)
```

Default `.env` configuration:
```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

3. **Run the application**

**Development mode** (auto-restart on file changes):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

4. **Verify it's running**
```bash
# Check health endpoint
curl http://localhost:3000/health

# Should return:
{
  "status": "healthy",
  "timestamp": "2025-10-29T01:22:43.552Z",
  "version": "1.0.0",
  "infrastructure": {
    "salesforceClient": "ok",
    "cartStore": "ok",
    "contextStore": "ok",
    "orderStore": "ok"
  }
}
```

---

## 📦 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-restart (tsx watch) |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Run production server (requires build first) |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run type-check` | Run TypeScript type checking |

---

## 🐳 Docker

### Build and Run

```bash
# Build the image
docker build -t bell-cart-api .

# Run the container
docker run -p 3000:3000 bell-cart-api

# Or run with custom environment variables
docker run -p 3000:3000 -e LOG_LEVEL=debug bell-cart-api
```

### Docker Compose (optional)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

Run with:
```bash
docker-compose up
```

---

## 📡 API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Create Cart
```bash
POST /cart

# Example
curl -X POST http://localhost:3000/api/v1/cart

# Response (201 Created)
{
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [],
  "totalPrice": 0,
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:30:00.000Z"
}
```

### Get Cart
```bash
GET /cart/:cartId

# Example
curl http://localhost:3000/api/v1/cart/550e8400-e29b-41d4-a716-446655440000
```

### Add Item to Cart
```bash
POST /cart/:cartId/items

# Example
curl -X POST http://localhost:3000/api/v1/cart/550e8400-e29b-41d4-a716-446655440000/items \
  -H "Content-Type: application/json" \
  -d '{
    "productType": "MOBILE_PLAN",
    "name": "Unlimited Data Plan",
    "price": 75.00,
    "quantity": 1
  }'

# Response (200 OK)
{
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
  "createdAt": "2025-10-28T10:30:00.000Z",
  "updatedAt": "2025-10-28T10:32:00.000Z"
}
```

### Remove Item from Cart
```bash
DELETE /cart/:cartId/items/:itemId

# Example
curl -X DELETE http://localhost:3000/api/v1/cart/550e8400-e29b-41d4-a716-446655440000/items/item-123
```

### Checkout Cart
```bash
POST /cart/:cartId/checkout

# Example
curl -X POST http://localhost:3000/api/v1/cart/550e8400-e29b-41d4-a716-446655440000/checkout

# Response (200 OK)
{
  "orderId": "order-abc123",
  "cartId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [...],
  "totalPrice": 75.00,
  "status": "COMPLETED",
  "completedAt": "2025-10-28T10:45:00.000Z"
}
```

### Health Check
```bash
GET /health

# Example
curl http://localhost:3000/health
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Coverage
- 52 passing tests
- Unit tests: SalesforceCartClient (17), CartService (23)
- Integration tests: Full API workflows (12)

---

## 🏗️ Architecture

### Layers

1. **API Layer** (Express)
   - Routes and controllers
   - Request validation (Zod)
   - Error handling middleware

2. **Domain/Service Layer**
   - CartService (business logic)
   - Transparent Salesforce context refresh
   - Domain models

3. **Infrastructure Layer**
   - SalesforceCartClient (test double)
   - In-memory stores (Cart, Context, Order)
   - Pino logger

### Key Features

- **Transparent Context Refresh**: Salesforce contexts expire after 5 minutes. The API automatically refreshes expired contexts and replays cart state - clients never see expiry errors.

- **Stable Item IDs**: Item IDs remain stable across context refreshes, allowing clients to reliably reference items.

- **Structured Logging**: Pino logger with pretty-printing in development, JSON in production.

- **Type-Safe Errors**: Custom error classes for domain and infrastructure layers.

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode (`development` or `production`) |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |

### Logging

**Development**: Pretty-printed colored logs
```
[2025-10-28 21:19:10.356 -0400] INFO: Bell Cart API server started
    port: 3000
```

**Production**: Structured JSON logs
```json
{"level":30,"time":1761701330761,"pid":1,"port":3000,"msg":"Bell Cart API server started"}
```

---

## 📂 Project Structure

```
src/
├── api/
│   ├── routes.ts                  # Express route definitions
│   ├── controllers/
│   │   └── cart.controller.ts     # HTTP request/response handling
│   └── middleware/
│       └── error.middleware.ts    # Centralized error handling
├── domain/
│   ├── models/                    # Domain models (Cart, LineItem, Order)
│   ├── services/
│   │   └── CartService.ts         # Core business logic
│   └── schemas/
│       └── validation.ts          # Zod validation schemas
├── infrastructure/
│   ├── salesforce/
│   │   └── SalesforceCartClient.ts # Salesforce test double
│   ├── stores/                    # In-memory stores
│   └── logger/
│       └── logger.ts              # Pino logger configuration
└── index.ts                       # Application entry point

tests/
├── unit/                          # Unit tests
└── integration/                   # Integration tests
```

---

## ⚠️ Error Handling

All errors return consistent JSON format:

```json
{
  "error": "CART_NOT_FOUND",
  "message": "Cart with id 'xyz' not found",
  "details": ["optional validation details"]
}
```

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created (cart creation) |
| 400 | Validation error, empty cart, business rule violation |
| 404 | Cart or item not found |
| 409 | Conflict (cart already checked out) |
| 503 | Salesforce service unavailable |

---

## 💻 Development Workflow

1. **Make changes** to TypeScript files
2. **Auto-restart** happens automatically (if using `npm run dev`)
3. **Check logs** for pretty-printed output
4. **Run tests** to verify changes
5. **Type check** before committing

---

## ⚡ Known Limitations

This is a take-home exercise implementation with intentional limitations:

- No persistence (in-memory storage only)
- No authentication/authorization
- No rate limiting
- No concurrency control
- Test double only (no real Salesforce integration)
- No pre-commit hooks or linting configured

See `SPEC-A-architecture.md` for complete list of limitations and rationale.

---

## 📚 Documentation

- `SPEC-A-architecture.md` - Architecture specification
- `SPEC-B-api.md` - API endpoint specifications
- `CLAUDE.md` - Project instructions and coding standards

---

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Environment Variables Not Loading
Make sure `.env` file exists:
```bash
cp .env.example .env
```

### Docker Container Fails to Start
Check logs:
```bash
docker logs <container-id>
```

Make sure `NODE_ENV=production` is set in Dockerfile.

---

## 📄 License

ISC

---

## 👥 Authors

**Sai Mohan** & **Claude Code** (Anthropic)

A collaborative implementation for the Bell Telecom Senior Backend Developer take-home exercise.

**Special thanks** to the amazing Claude Code team at Anthropic for building such a powerful development tool that made this implementation possible!

---

Built with ❤️ using [Claude Code](https://claude.com/claude-code)
