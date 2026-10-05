<div align="center">
<img width="1200" height="475" alt="MediMate Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MediMate 医伴：面向异地就医家庭的可解释陪诊匹配与可信协作系统

当子女无法陪在身边时，MediMate 帮助家属完成陪诊需求整理、服务匹配、节点记录、进度查看和陪诊纪要回溯。

## 核心能力

- **可解释的多维陪诊匹配**：在档期、预算等硬约束后，综合专长、距离、信任、经验和负载，展示推荐理由与限制。
- **节点化的过程记录**：服务拆成可追踪节点，证据绑定到具体订单和节点，并生成可复算的完整性指纹。
- **证据驱动的家属纪要**：模型负责组织已有记录，信息不足时明确提示，不替医疗专业人员做诊断。
- **跨端基础**：提供响应式 Web 页面，并保留 Capacitor 移动端构建能力。

比赛定位、AI 使用披露、隐私边界、演示脚本和测试报告见 [docs/contest](docs/contest/README.md)。

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

### 比赛版本检查

```bash
npm run contest:verify
```

该命令会依次检查前端构建、前端类型、后端构建、后端类型和后端测试。

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
VITE_WS_URL=ws://localhost:3001/chat
```

生产环境必须将 `VITE_API_URL` 设置为正式 HTTPS API 地址，不能依赖访问者电脑的 localhost。

## License

MIT
