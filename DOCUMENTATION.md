# Bite Back Backend - Complete Documentation

## Table of Contents
1. [Technology Stack & Why](#technology-stack--why)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Core Components](#core-components)
5. [Feature Modules](#feature-modules)
6. [Database Schema](#database-schema)
7. [Authentication Flow](#authentication-flow)
8. [API Endpoints](#api-endpoints)
9. [Frontend Implementation Guide](#frontend-implementation-guide)

---

## Technology Stack & Why

### Backend: NestJS + TypeScript

| Technology | Why We Chose It |
|------------|-----------------|
| **NestJS** | Enterprise-grade Node.js framework with built-in support for dependency injection, modularity, and TypeScript. Perfect for scalable APIs. |
| **TypeScript** | Type safety catches bugs at compile time, better IDE support, easier refactoring, and self-documenting code. |
| **PostgreSQL** | Robust relational database with excellent support for complex queries, transactions, and JSON data types. |
| **Prisma ORM** | Type-safe database queries, automatic migrations, visual database explorer, and excellent developer experience. |
| **Redis** | In-memory cache for session management, token blacklisting, OTP storage, and rate limiting. Extremely fast. |
| **JWT** | Stateless authentication tokens that work perfectly with mobile apps and can be easily verified without database calls. |
| **Docker** | Containerization ensures consistent environments across development, staging, and production. |

### Why Not Other Options?

- **Express.js alone**: Lacks structure for large applications, no built-in dependency injection
- **Django/Python**: Slower runtime, harder to share types with TypeScript frontend
- **Spring Boot/Java**: Heavier, longer startup times, more verbose code
- **MongoDB**: Food ordering needs relational data (users → orders → items), PostgreSQL handles this better

---

## Architecture Overview

```mermaid
graph TB
    subgraph Client["📱 Mobile App / Web"]
        FE[React Native / Next.js]
    end
    
    subgraph API["🔧 NestJS API"]
        GW[API Gateway]
        AUTH[Auth Module]
        REST[Restaurants]
        MENU[Menu]
        CART[Cart]
        ORDERS[Orders]
        PAY[Payments]
    end
    
    subgraph Data["💾 Data Layer"]
        PG[(PostgreSQL)]
        RD[(Redis)]
    end
    
    FE --> GW
    GW --> AUTH
    GW --> REST
    GW --> MENU
    GW --> CART
    GW --> ORDERS
    GW --> PAY
    
    AUTH --> PG
    AUTH --> RD
    REST --> PG
    CART --> PG
    ORDERS --> PG
    PAY --> PG
```

### Request Flow

1. **Client** sends HTTP request with JWT token
2. **Global Middleware** adds request ID for tracing
3. **ThrottlerGuard** checks rate limits
4. **JwtAuthGuard** validates token, checks Redis blacklist
5. **RolesGuard** verifies user has required role
6. **Controller** receives validated request
7. **Service** executes business logic
8. **Prisma** queries database
9. **TransformInterceptor** wraps response in standard format
10. **HttpExceptionFilter** catches errors and formats them

---

## Project Structure

```
bite-back/
├── apps/api/src/
│   ├── main.ts                    # Application entry point
│   ├── app.module.ts              # Root module - imports all features
│   │
│   ├── common/                    # Shared utilities
│   │   ├── decorators/            # Custom decorators (@CurrentUser, @Roles)
│   │   ├── filters/               # Exception handlers
│   │   ├── guards/                # Auth & role guards
│   │   ├── interceptors/          # Response transformers
│   │   ├── middleware/            # Request ID middleware
│   │   ├── prisma/                # Database service
│   │   ├── redis/                 # Cache service
│   │   └── health/                # Health check endpoint
│   │
│   └── modules/                   # Feature modules
│       ├── auth/                  # Authentication
│       ├── users/                 # User profiles
│       ├── restaurants/           # Restaurant listings
│       ├── menu/                  # Menu items
│       ├── cart/                  # Shopping cart
│       ├── orders/                # Order management
│       ├── payments/              # Payment methods
│       ├── locations/             # Saved addresses
│       ├── search/                # Search functionality
│       ├── offers/                # Promotions
│       └── settings/              # User preferences
│
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Test data seeder
│   └── migrations/                # Database migrations
│
├── docker-compose.yml             # PostgreSQL + Redis containers
└── .env                           # Environment variables
```

---

## Core Components

### 1. Main Entry Point (`main.ts`)

```typescript
// Sets up the application with:
app.setGlobalPrefix('api');           // All routes start with /api
app.enableVersioning({ defaultVersion: '1' }); // /api/v1/...
app.enableCors({ credentials: true }); // Allow cross-origin requests
app.useGlobalPipes(new ValidationPipe()); // Validate all inputs
app.useGlobalFilters(new HttpExceptionFilter()); // Format errors
app.useGlobalInterceptors(new TransformInterceptor()); // Format responses
SwaggerModule.setup('api/docs', app, document); // API documentation
```

### 2. JWT Auth Guard (`jwt-auth.guard.ts`)

Every protected endpoint goes through this guard:

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Extract token from "Authorization: Bearer <token>" header
    const token = this.extractTokenFromHeader(request);
    
    // 2. Check if token is in Redis blacklist (logged out tokens)
    const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
    
    // 3. Verify JWT signature and expiration
    const payload = await this.jwtService.verifyAsync(token);
    
    // 4. Verify user still exists in database
    const user = await this.prismaService.user.findUnique({ where: { id: payload.sub } });
    
    // 5. Attach user to request for use in controllers
    request['user'] = user;
    
    return true;
}
```

### 3. Response Transformer (`transform.interceptor.ts`)

Wraps all responses in a consistent format:

```typescript
// All successful responses become:
{
    "success": true,
    "data": { /* actual response */ },
    "meta": {
        "timestamp": "2026-02-09T...",
        "path": "/api/v1/restaurants",
        "requestId": "uuid"
    }
}
```

### 4. Exception Filter (`http-exception.filter.ts`)

Catches all errors and formats them:

```typescript
// All errors become:
{
    "success": false,
    "error": {
        "code": "UNAUTHORIZED",
        "message": "Invalid token",
        "details": null
    },
    "meta": { ... }
}
```

### 5. Redis Service (`redis.service.ts`)

Handles caching and temporary data:

| Function | Purpose |
|----------|---------|
| `setOtp(userId, code, minutes)` | Store OTP for phone verification |
| `getOtp(userId)` | Retrieve OTP for validation |
| `blacklistToken(token, seconds)` | Invalidate logout tokens |
| `isTokenBlacklisted(token)` | Check if token was revoked |
| `setResendCooldown(userId, seconds)` | Prevent OTP spam |

---

## Feature Modules

### Auth Module (`/api/v1/auth/...`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/signup` | POST | Register new user, returns tokens |
| `/login` | POST | Login with email/phone + password |
| `/verify-phone` | POST | Verify phone with OTP code |
| `/resend-otp` | POST | Request new OTP code |
| `/forgot-password` | POST | Request password reset email |
| `/reset-password` | POST | Reset password with token |
| `/refresh` | POST | Get new access token using refresh token |
| `/logout` | POST | Invalidate all tokens |

**Token Strategy**:
- **Access Token**: 15 minutes, stored in memory
- **Refresh Token**: 7 days, stored in database
- Token rotation on refresh (old token revoked, new one issued)

### Restaurants Module (`/api/v1/restaurants/...`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | List restaurants with filters |
| `/categories` | GET | Get all restaurant categories |
| `/recommended` | GET | Get top-rated restaurants |
| `/:id` | GET | Get restaurant details with menu |
| `/slug/:slug` | GET | Get restaurant by URL slug |

**Query Parameters**:
- `page`, `limit` - Pagination
- `categoryId` - Filter by category
- `rating` - Minimum rating filter
- `search` - Text search
- `sortBy` - rating, deliveryTime, deliveryFee

### Cart Module (`/api/v1/cart/...`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Get current cart with totals |
| `/items` | POST | Add item to cart |
| `/items/:id` | PATCH | Update item quantity |
| `/items/:id` | DELETE | Remove item from cart |
| `/` | DELETE | Clear entire cart |

**Cart Rules**:
- One cart per user
- Items must be from same restaurant
- Validates add-ons belong to menu item

### Orders Module (`/api/v1/orders/...`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/checkout` | POST | Create order from cart |
| `/` | GET | List user's orders |
| `/:id` | GET | Get order details |
| `/:id/status` | PATCH | Update order status |

**Order Statuses**:
`PENDING_PAYMENT` → `PLACED` → `CONFIRMED` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED`

---

## Database Schema

### Core Entities

```mermaid
erDiagram
    User ||--o{ Order : places
    User ||--o| Cart : has
    User ||--o{ Location : saves
    User ||--o{ PaymentMethod : stores
    
    Restaurant ||--o{ MenuCategory : has
    Restaurant ||--o{ Order : receives
    Restaurant }|--|| RestaurantCategory : belongs_to
    
    MenuCategory ||--o{ MenuItem : contains
    MenuItem ||--o{ AddOnGroup : has
    AddOnGroup ||--o{ AddOnOption : contains
    
    Cart ||--o{ CartItem : contains
    CartItem }|--|| MenuItem : references
    
    Order ||--o{ OrderItem : contains
    Order ||--o| PaymentTransaction : has
```

### Key Models

| Model | Purpose |
|-------|---------|
| `User` | Account with email, phone, password hash |
| `RefreshToken` | JWT refresh tokens with rotation tracking |
| `PhoneVerificationOtp` | OTP codes for phone verification |
| `Restaurant` | Store with category, hours, delivery info |
| `MenuItem` | Food item with price, add-ons |
| `Cart/CartItem` | User's shopping cart |
| `Order/OrderItem` | Placed orders with status tracking |
| `PaymentTransaction` | Payment records |

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant API as NestJS API
    participant DB as PostgreSQL
    participant Redis as Redis
    
    Note over App,Redis: SIGNUP FLOW
    App->>API: POST /auth/signup {email, phone, password}
    API->>DB: Check email/phone exists
    API->>DB: Create user
    API->>DB: Create notification settings
    API->>Redis: Store OTP (5 min TTL)
    API->>App: {user, accessToken, refreshToken}
    
    Note over App,Redis: LOGIN FLOW
    App->>API: POST /auth/login {email, password}
    API->>DB: Find user, verify password
    API->>DB: Store refresh token
    API->>App: {user, accessToken, refreshToken}
    
    Note over App,Redis: PROTECTED REQUEST
    App->>API: GET /profile (Bearer token)
    API->>Redis: Check token not blacklisted
    API->>DB: Verify user exists
    API->>App: {user profile}
    
    Note over App,Redis: TOKEN REFRESH
    App->>API: POST /auth/refresh {refreshToken}
    API->>DB: Validate refresh token
    API->>DB: Revoke old, create new tokens
    API->>App: {new accessToken, new refreshToken}
    
    Note over App,Redis: LOGOUT
    App->>API: POST /auth/logout (Bearer token)
    API->>Redis: Blacklist access token
    API->>DB: Revoke all refresh tokens
    API->>App: {success}
```

---

## Frontend Implementation Guide

### Recommended Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Mobile** | React Native + Expo | Cross-platform, JavaScript ecosystem |
| **Web** | Next.js 14 | SSR, App Router, excellent DX |
| **State** | Zustand or Redux Toolkit | Simple, TypeScript-friendly |
| **API Client** | Axios or TanStack Query | Cache, retry, loading states |
| **Forms** | React Hook Form + Zod | Validation, TypeScript types |
| **UI** | Tailwind CSS + shadcn/ui | Rapid development, consistent design |

### Project Structure (React Native)

```
src/
├── api/
│   ├── client.ts          # Axios instance with interceptors
│   ├── auth.ts            # Auth API calls
│   ├── restaurants.ts     # Restaurant API calls
│   └── orders.ts          # Order API calls
│
├── stores/
│   ├── authStore.ts       # User & tokens
│   ├── cartStore.ts       # Shopping cart
│   └── locationStore.ts   # Saved addresses
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── VerifyPhoneScreen.tsx
│   ├── home/
│   │   ├── HomeScreen.tsx
│   │   └── RestaurantScreen.tsx
│   ├── cart/
│   │   ├── CartScreen.tsx
│   │   └── CheckoutScreen.tsx
│   └── orders/
│       ├── OrdersScreen.tsx
│       └── OrderDetailScreen.tsx
│
├── components/
│   ├── RestaurantCard.tsx
│   ├── MenuItemCard.tsx
│   ├── CartItem.tsx
│   └── OrderStatusBadge.tsx
│
└── navigation/
    └── AppNavigator.tsx
```

### API Client Setup

```typescript
// api/client.ts
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
    baseURL: 'http://localhost:3000/api/v1',
    timeout: 10000,
});

// Add token to all requests
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh on 401
api.interceptors.response.use(
    (response) => response.data.data, // Unwrap data
    async (error) => {
        if (error.response?.status === 401) {
            const refreshToken = useAuthStore.getState().refreshToken;
            if (refreshToken) {
                try {
                    const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
                    useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
                    // Retry original request
                    error.config.headers.Authorization = `Bearer ${data.accessToken}`;
                    return api(error.config);
                } catch {
                    useAuthStore.getState().logout();
                }
            }
        }
        throw error;
    }
);

export default api;
```

### Auth Store (Zustand)

```typescript
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/client';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    
    login: (email: string, password: string) => Promise<void>;
    signup: (data: SignupData) => Promise<void>;
    logout: () => void;
    setTokens: (access: string, refresh: string) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            
            login: async (emailOrPhone, password) => {
                const data = await api.post('/auth/login', { emailOrPhone, password });
                set({
                    user: data.user,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                });
            },
            
            signup: async (signupData) => {
                const data = await api.post('/auth/signup', signupData);
                set({
                    user: data.user,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                });
            },
            
            logout: () => {
                set({ user: null, accessToken: null, refreshToken: null });
            },
            
            setTokens: (accessToken, refreshToken) => {
                set({ accessToken, refreshToken });
            },
        }),
        { name: 'auth-storage' }
    )
);
```

### Example Screens

```tsx
// screens/home/HomeScreen.tsx
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';

export function HomeScreen() {
    const { data: restaurants, isLoading } = useQuery({
        queryKey: ['restaurants'],
        queryFn: () => api.get('/restaurants'),
    });
    
    const { data: categories } = useQuery({
        queryKey: ['categories'],
        queryFn: () => api.get('/restaurants/categories'),
    });
    
    if (isLoading) return <LoadingSpinner />;
    
    return (
        <ScrollView>
            {/* Categories horizontal scroll */}
            <FlatList
                horizontal
                data={categories}
                renderItem={({ item }) => <CategoryChip category={item} />}
            />
            
            {/* Restaurant list */}
            <FlatList
                data={restaurants.items}
                renderItem={({ item }) => <RestaurantCard restaurant={item} />}
            />
        </ScrollView>
    );
}
```

### Cart Flow

```tsx
// stores/cartStore.ts
export const useCartStore = create<CartState>((set, get) => ({
    cart: null,
    
    fetchCart: async () => {
        const cart = await api.get('/cart');
        set({ cart });
    },
    
    addItem: async (menuItemId: string, quantity: number, addOns?: AddOn[]) => {
        await api.post('/cart/items', { menuItemId, quantity, addOns });
        get().fetchCart(); // Refresh cart
    },
    
    updateQuantity: async (itemId: string, quantity: number) => {
        await api.patch(`/cart/items/${itemId}`, { quantity });
        get().fetchCart();
    },
    
    checkout: async (locationId: string, paymentMethodId: string) => {
        const order = await api.post('/orders/checkout', {
            deliveryLocationId: locationId,
            paymentMethodId,
        });
        set({ cart: null });
        return order;
    },
}));
```

---

## Environment Variables

```bash
# .env (Backend)
DATABASE_URL="postgresql://user:pass@localhost:5432/biteback"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=another-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
VAT_PERCENTAGE=14

# Frontend (.env)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## Running the Project

```bash
# 1. Start databases
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npm run prisma:generate

# 4. Run migrations
npm run prisma:migrate

# 5. Seed test data
npm run prisma:seed

# 6. Start dev server
npm run start:dev

# 7. Open API docs
# http://localhost:3000/api/docs
```

---

## Summary

This backend provides a complete, production-ready API for a food ordering app with:

✅ **Secure Authentication** - JWT with refresh token rotation  
✅ **Role-Based Access** - USER, ADMIN, RESTAURANT_OWNER  
✅ **Rate Limiting** - Prevents abuse  
✅ **Input Validation** - All requests validated  
✅ **Consistent Responses** - Standard success/error format  
✅ **API Documentation** - Swagger UI included  
✅ **Docker Ready** - Easy deployment  
