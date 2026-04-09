<div align="center">
<img width="1200" height="475" alt="MediMate Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 基于多模态数据协同的智慧医疗陪护全流程管理系统

不再是简单的劳务撮合平台，而是**面向空巢老人的医疗触达辅助决策引擎**。
重点突破算法驱动的智能系统、多模态存证协议以及叙事医学的人文关怀。

## 核心创新特性 (Core Innovations)

- **AI 驱动的知识图谱预案 (Intelligent Pathways)** - 通过 MiniMax 大语言模型自动生成结构化的导诊与陪护路径图。
- **数字信用资产存证 (Digital Evidence Protocol)** - 利用手机传感器与多模态分析，沉淀整个陪护过程的信任画像，解决职业信任黑箱。
- **叙事医学引擎 (Narrative Medicine Engine)** - 用 AI 为患者家属提炼带有情绪价值和抚慰感的康复备忘录。
- **贵州模式赋能 (Regional Transit Model)** - 专为山地地形设计的城乡医疗接力接驳支持，助力分级诊疗。
- **Android & Web跨端 (Mobile Ready)** - 借助 Capacitor 实现端到端覆盖。

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | NestJS, TypeScript, Prisma |
| Database | PostgreSQL |
| Auth | JWT + Refresh Token |
| AI | MiniMax |
| Mobile | Capacitor |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker Desktop with `docker compose`

### Local Development

This repo expects:

- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:3001/api`
- PostgreSQL from Docker on `localhost:5432`

1. **Start PostgreSQL**
   ```bash
   docker compose up -d postgres
   ```

2. **Configure and start the backend**
   If `server/.env` does not exist yet, create it from the example first:
   ```bash
   cd server
   cp .env.example .env
   ```

   Then install dependencies, generate Prisma client, run migrations, and start Nest:
   ```bash
   npm install
   npx prisma generate
   npx prisma migrate dev
   npm run start:dev
   ```

3. **Verify the backend before testing auth**
   In a separate terminal:
   ```bash
   curl http://localhost:3001/api/health
   ```

   The endpoint should return HTTP `200` and report both `api` and `database` as healthy.

4. **Start the frontend**
   In another terminal from the project root:
   ```bash
   cd ..
   npm install
   npm run dev
   ```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| API Docs | http://localhost:3001/api/docs |
| Health Check | http://localhost:3001/api/health |

## Project Structure

```
medimate/
├── client/                 # React frontend
│   ├── components/        # UI components
│   ├── services/          # API services
│   └── ...
├── server/                # NestJS backend
│   ├── src/
│   │   ├── modules/       # Feature modules
│   │   ├── prisma/        # Database service
│   │   └── main.ts        # Entry point
│   └── prisma/
│       └── schema.prisma  # Database schema
├── docker-compose.yml     # Docker services
├── SPEC.md               # Technical specification
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token

### Core
- `GET /api/hospitals` - List hospitals
- `GET /api/escorts` - List escorts
- `POST /api/orders` - Create order
- `GET /api/messages` - Get messages

See `SPEC.md` for complete API documentation.

## Environment Variables

**Server (.env):**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medimate?schema=public
JWT_SECRET=your-secret-key
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:3001/api
```

## License

MIT
