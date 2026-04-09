# Tasks

- [x] Task 1: 配置 Windows 服务自动启动
  - [x] SubTask 1.1: 将 PostgreSQL 服务设置为 Automatic 启动类型
  - [x] SubTask 1.2: 验证服务自动启动配置

- [ ] Task 2: 创建数据库健康检查脚本
  - [ ] SubTask 2.1: 创建 PowerShell 脚本检查 PostgreSQL 状态
  - [ ] SubTask 2.2: 添加自动重启功能到脚本

- [ ] Task 3: 创建启动辅助脚本
  - [ ] SubTask 3.1: 创建启动所有服务的脚本 (PostgreSQL + 后端 + 前端)
  - [ ] SubTask 3.2: 添加使用说明文档

- [x] Task 4: 在后端添加数据库连接健康检查
  - [x] SubTask 4.1: 在 HealthController 中添加数据库连接检查
  - [x] SubTask 4.2: 验证健康检查端点工作正常

# Task Dependencies
- Task 1 和 Task 2 可以并行执行
- Task 3 可以在 Task 1 和 Task 2 完成后进行
- Task 4 独立于其他任务
