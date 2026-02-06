# Bite Back API

A complete production-ready backend for a mobile food ordering application built with NestJS, PostgreSQL, and Redis.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Clone and Install

```bash
cd bite-back
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
```

### 3. Start Services with Docker

```bash
docker-compose up -d postgres redis
```

### 4. Run Database Migrations

```bash
npx prisma migrate dev
```

### 5. Seed Demo Data

```bash
npx prisma db seed
```

### 6. Start the API

```bash
npm run start:dev
```

🎉 API running at: http://localhost:3000
📚 Swagger docs at: http://localhost:3000/api/docs

---

## 📧 Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@biteback.com | Admin123! |
| Restaurant Owner | owner@restaurant.com | Owner123! |
| User | user@test.com | User123! |

---

## 🧪 Sample API Flow (curl)

### 1. Signup

```bash
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "Password123!",
    "phone": "+201234567890"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "emailOrPhone": "user@test.com",
    "password": "User123!"
  }'
```

Save the `accessToken` from response for subsequent requests.

### 3. Browse Restaurants

```bash
curl http://localhost:3000/api/v1/restaurants \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Get Restaurant Menu

```bash
curl http://localhost:3000/api/v1/restaurants/RESTAURANT_ID/menu \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Add Item to Cart

```bash
curl -X POST http://localhost:3000/api/v1/cart/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menuItemId": "MENU_ITEM_ID",
    "quantity": 2,
    "addOns": []
  }'
```

### 6. Get Cart

```bash
curl http://localhost:3000/api/v1/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Checkout (Create Order)

```bash
curl -X POST http://localhost:3000/api/v1/orders/checkout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethodId": "PAYMENT_METHOD_ID",
    "deliveryLocationId": "LOCATION_ID",
    "deliveryInstructions": "Please ring the bell"
  }'
```

### 8. View Orders

```bash
curl http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 📁 Project Structure

```
bite-back/
├── apps/api/src/
│   ├── main.ts                 # Bootstrap
│   ├── app.module.ts           # Root module
│   ├── common/                 # Shared code
│   │   ├── decorators/         # Custom decorators
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth & RBAC guards
│   │   ├── interceptors/       # Response transformers
│   │   ├── middleware/         # Request logging
│   │   ├── prisma/             # Database service
│   │   └── redis/              # Cache/OTP service
│   └── modules/                # Feature modules
│       ├── auth/               # Authentication
│       ├── users/              # Profile management
│       ├── restaurants/        # Restaurant listing
│       ├── menu/               # Menu items
│       ├── cart/               # Shopping cart
│       ├── orders/             # Order & checkout
│       ├── payments/           # Payment methods
│       ├── locations/          # Saved addresses
│       ├── search/             # Search & history
│       ├── offers/             # Promotions
│       └── settings/           # Notifications
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Demo data
├── docker-compose.yml
└── .env.example
```

---

## 🔐 Authentication

- JWT Access Token (15 min expiry)
- JWT Refresh Token (7 days, with rotation)
- OTP Phone Verification (5 min expiry, 5 attempts, 60s cooldown)
- Password Reset via Email Token
- Token Blacklisting on Logout

---

## 👥 Roles & Permissions

| Role | Permissions |
|------|-------------|
| USER | Own orders, cart, profile, locations, payment methods |
| RESTAURANT_OWNER | Above + manage own restaurant menu/orders |
| ADMIN | Full access to all resources |

---

## 💰 Business Rules

- **VAT**: Configurable (default 14%)
- **Delivery Fee**: Per restaurant
- **Price Calculation**: `subtotal + delivery_fee + VAT`
- **Cart**: One active cart per user, single restaurant per cart
- **Recent Searches**: Last 10 unique queries

---

## 🧪 Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

---

## 📄 API Documentation

Interactive Swagger UI available at `/api/docs` when running locally.

All endpoints are versioned under `/api/v1/`.
