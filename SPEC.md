# MediMate Technical Specification

## Project Overview

**MediMate** is a medical escort service platform connecting patients with professional escort services.

## Architecture

```
┌─────────────────────────────────────────┐
│  Client (React + Vite + TypeScript)     │
│  - Mobile-first responsive design        │
│  - Capacitor for mobile packaging        │
└──────────────────┬──────────────────────┘
                   │ HTTP + WebSocket
┌──────────────────▼──────────────────────┐
│  Server (NestJS + TypeScript)           │
│  - REST API                             │
│  - JWT Authentication                   │
│  - WebSocket Gateway (Socket.io)       │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│  Database (PostgreSQL + Prisma ORM)     │
└─────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT + Refresh Token |
| Real-time | Socket.io |
| Mobile | Capacitor |
| AI | MiniMax |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Users
- `GET /api/users/me` - Get current user
- `PATCH /api/users/profile` - Update profile

### Hospitals
- `GET /api/hospitals` - List hospitals
- `GET /api/hospitals/:id` - Get hospital details

### Escorts
- `GET /api/escorts` - List verified escorts
- `GET /api/escorts/nearby` - Get nearby escorts
- `GET /api/escorts/:id` - Get escort details

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders/:id/accept` - Accept order (escort)
- `PATCH /api/orders/:id` - Update order status

### Messages
- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/:partnerId` - Get conversation
- `POST /api/messages` - Send message

## Database Schema

See `server/prisma/schema.prisma` for complete schema.

### Core Entities
- `User` - User accounts
- `UserProfile` - Extended profile info
- `EscortProfile` - Escort-specific data
- `Hospital` - Hospital database
- `Service` - Available service types
- `Order` - Service orders
- `Message` - Chat messages
- `Review` - Order reviews

## Getting Started

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (optional, can use Docker)

### Development Setup

1. **Start database:**
   ```bash
   docker-compose up -d postgres
   ```

2. **Setup backend:**
   ```bash
   cd server
   cp .env.example .env
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run start:dev
   ```

3. **Setup frontend:**
   ```bash
   cd client
   cp .env.example .env
   npm install
   npm run dev
   ```

### Environment Variables

**Server (.env):**
```
DATABASE_URL=postgresql://user:pass@localhost:5432/medimate
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Client (.env):**
```
VITE_API_URL=http://localhost:3001/api
VITE_GEMINI_API_KEY=your-gemini-key
```

## Security Considerations

- Passwords hashed with bcrypt
- JWT tokens with short expiry (15min)
- Refresh tokens with longer expiry (7 days)
- CORS configured for specific origins
- Input validation with class-validator
- SQL injection prevention via Prisma

## Deployment

See `docker-compose.yml` for production deployment configuration.
