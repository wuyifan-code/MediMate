# MediMate 服务启动规范

## 为什么
需要提供一种可靠、可验证的方式来启动 MediMate 全栈应用的所有服务，确保数据库、后端 API 和前端界面能够正确启动并保持健康状态。

## 什么变化
- 使用 PowerShell 脚本自动启动所有服务（PostgreSQL、Backend、Frontend）
- 添加服务健康检查和启动验证
- 支持浏览器自动打开功能

## 影响
- 受影响的规范：无
- 受影响的代码：
  - `scripts/start-all-services.ps1` - 主启动脚本
  - `docker-compose.yml` - Docker 配置
  - `server/package.json` - 后端启动命令
  - `package.json` - 前端启动命令

## 添加要求

### 要求：服务启动流程
系统应该能够通过执行脚本自动启动所有必要的服务。

#### 场景：成功启动所有服务
- **WHEN** 执行 `start-all-services.ps1` 脚本
- **THEN** 应该按顺序启动 PostgreSQL、Backend API、Frontend UI
- **AND** 验证每个服务的健康状态
- **AND** 返回启动摘要信息

#### 场景：服务已运行
- **WHEN** 部分或全部服务已在运行
- **THEN** 脚本应检测现有服务状态
- **AND** 跳过已运行的服务
- **AND** 启动未运行的服务

#### 场景：服务启动失败
- **WHEN** 任何服务启动失败或超时
- **THEN** 脚本应抛出错误
- **AND** 终止启动流程
- **AND** 返回失败信息

### 要求：健康检查端点
系统应提供健康检查端点以验证服务状态。

#### 场景：后端健康检查
- **WHEN** 请求 `http://localhost:3001/api/health`
- **THEN** 返回 JSON 响应包含 `services` 对象
- **AND** 包含 `api` 和 `database` 健康状态

### 要求：端口验证
系统应在启动前验证所需端口可用性。

#### 场景：检测端口占用
- **WHEN** 检查端口 3000、3001、5432
- **THEN** 如果端口被占用应报告警告
- **AND** 继续尝试启动（可能被其他进程占用）
