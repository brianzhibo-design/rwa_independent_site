
# RWA Independent Site – Backend & Contracts Starter

This starter gives you a minimal **Node.js (Express) + Prisma + Webhooks** backend and a **Hardhat** contracts workspace.

## Quick Start

### Prereqs
- Node.js >= 18
- Docker (for Postgres/Redis)
- pnpm (or npm/yarn)

### 1) Spin up infra
```bash
docker compose up -d
```

### 2) Backend
```bash
cd backend
pnpm install    # or npm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

Env file: copy `.env.example` to `.env` and fill values.

### 3) Contracts (Testnet)
```bash
cd ../contracts
pnpm install
pnpm compile
pnpm test
pnpm deploy:sepolia
```

Then copy deployed addresses back into `backend/.env`.

---

## Folders
- `backend/` – Express API, webhooks, redemption, Prisma schema
- `contracts/` – Hardhat, ERC1155 RWA + optional ERC20 loyalty token
