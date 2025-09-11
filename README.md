# RWA Independent Site Backend

This starter gives you a minimal Node.js (Express) + Prisma + Webhooks backend and a Hardhat contracts workspace.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- Docker (for Postgres/Redis)  
- pnpm (or npm/yarn)

### Setup
```bash
# Start database
docker compose up -d

# Install dependencies
cd backend
pnpm install # or npm install

# Setup database
pnpm prisma:generate
pnpm prisma:migrate

# Copy environment file and fill values
cp .env.example .env

# Start development server
pnpm dev
```

### Smart Contracts
```bash
cd ../contracts
pnpm install
pnpm compile
pnpm test
pnpm deploy:sepolia
```

Then copy deployed addresses back into `backend/.env`.

## 📁 Project Structure

```
backend/          # Express API, webhooks, redemption, Prisma schema
contracts/        # Hardhat, ERC1155 RWA + optional ERC20 loyalty token
```

## 🎯 Features Implementation

### ✅ Phase 1: Stripe Checkout Integration

Create payment sessions for pending orders with Stripe integration.

#### 🔧 Configuration

Add to your `.env` file:
```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 📡 API Endpoints

**Create Stripe Checkout Session**
```bash
POST /payments/stripe/checkout
Content-Type: application/json

{
  "orderId": "order_123456",
  "successUrl": "https://yoursite.com/success",
  "cancelUrl": "https://yoursite.com/cancel"
}
```

Response:
```json
{
  "ok": true,
  "url": "https://checkout.stripe.com/c/pay/cs_test_xxxxx",
  "sessionId": "cs_test_xxxxx"
}
```

#### 🧪 Local Testing

1. **Create a test order first:**
```bash
curl -X POST http://localhost:4000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userEmail": "test@example.com",
    "productId": "your_product_id",
    "qty": 1
  }'
```

2. **Create Stripe checkout session:**
```bash
curl -X POST http://localhost:4000/payments/stripe/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "clxxxxxxxxxxxxxxx",
    "successUrl": "http://localhost:3000/success",
    "cancelUrl": "http://localhost:3000/cancel"
  }'
```

3. **Open the returned URL in browser to test payment flow**

#### ✅ Validation Rules

- Order must exist and be in `pending` status
- Order amount must be > $0
- Currency: USD (multi-currency support planned)
- Session expires in 30 minutes
- Metadata includes `orderId` and `userEmail` for webhook processing

#### 🚨 Error Handling

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Missing parameters | orderId, successUrl, or cancelUrl missing |
| 404 | Order not found | orderId doesn't exist |
| 400 | Invalid order status | Order is not in 'pending' status |
| 400 | Invalid amount | Order amount is ≤ 0 |
| 500 | Stripe API error | Stripe service unavailable |

#### 🧪 Running Tests

```bash
# Run all tests
pnpm test

# Run payments tests only
pnpm test:payments

# Run with verbose output
node --test src/tests/payments.test.js
```

### 🔄 Next Phases

- **Phase 2**: Stripe webhook security & order settlement
- **Phase 3**: Async NFT minting queue system

## 🛠️ Development

### Environment Variables

See `.env.example` for all required configuration.

**Critical for Phase 1:**
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signature verification
- `DATABASE_URL` - PostgreSQL connection string

### Database Schema

Current models: User, Order, Product, Commission, Referral, etc.
See `prisma/schema.prisma` for complete schema.

### API Documentation

- `GET /health` - Health check
- `POST /orders` - Create order
- `GET /orders/:id` - Get order details
- `POST /payments/stripe/checkout` - Create payment session (Phase 1)

## 🐛 Troubleshooting

### Common Issues

**Stripe Configuration:**
```bash
# Check if Stripe keys are properly set
curl http://localhost:4000/debug/env
```

**Database Connection:**
```bash
# Verify database is running
docker compose ps
```

**Missing Dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
pnpm install
```

### Logs

Development logs include:
- Stripe API calls and responses
- Order validation steps  
- Environment variable validation
- Error stack traces (non-production)

## 📞 Support

For issues related to:
- **Stripe Integration**: Check API keys and webhook configuration
- **Database**: Verify Docker containers and migration status
- **Blockchain**: Confirm RPC URL and contract addresses

---

Built with ❤️ for Real World Asset tokenization