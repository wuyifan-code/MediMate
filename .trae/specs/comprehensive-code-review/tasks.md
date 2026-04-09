# 任务列表

## 阶段一：代码结构审查与规划

- [ ] Task 1: 组件结构审查
  - 审查 `components/` 目录下的所有组件
  - 识别重复组件
  - 生成组件清单和依赖关系图
  - 分析组件复杂度

- [ ] Task 2: 类型系统审查
  - 检查 `types.ts` 中的类型定义
  - 识别重复类型定义
  - 检查 `server/src/modules/*/dto/` 中的 DTO 定义
  - 生成统一类型管理方案

- [ ] Task 3: 前后端接口审查
  - 对比前端 API 调用与后端 Controller 定义
  - 检查请求/响应类型一致性
  - 识别潜在的不匹配问题

## 阶段二：代码整理实施

- [ ] Task 4: 重复组件合并
  - 合并 `PatientDashboard.tsx` 相关重复文件
  - 处理其他重复组件
  - 更新导入引用

- [ ] Task 5: 示例文件归档
  - 将 `*.example.tsx` 文件迁移到 `docs/examples/` 目录
  - 或直接删除无价值的示例
  - 更新相关文档

- [ ] Task 6: 组件目录重构
  - 按业务模块重组 `components/` 目录
  - 建立 `components/index.ts` 统一导出
  - 更新所有导入路径

## 阶段三：类型与接口规范化

- [ ] Task 7: 统一类型定义
  - 重构 `types.ts` 结构
  - 提取公共类型到 `types/common/` 目录
  - 为后端 DTO 生成前端类型

- [ ] Task 8: 接口文档生成
  - 创建 `docs/API_CONTRACT.md` 接口契约文档
  - 定义前后端共同遵守的接口规范
  - 生成 TypeScript 类型导出供前端使用

## 阶段四：代码质量提升

- [ ] Task 9: 代码冗余清理
  - 识别并移除无用的导入
  - 合并相似的逻辑代码
  - 提取公共工具函数

- [ ] Task 10: 功能完整性检查
  - 检查各模块边界情况处理
  - 审查错误处理逻辑
  - 检查安全相关实现（认证、授权）

## 阶段五：文档与规范

- [ ] Task 11: 代码规范文档
  - 更新 `CODE_STANDARDS.md`
  - 添加组件开发规范
  - 添加类型定义规范

- [ ] Task 12: 变更总结报告
  - 生成代码整理总结
  - 列出所有变更
  - 提供后续维护建议

# 任务依赖关系

- Task 4 依赖 Task 1
- Task 5 依赖 Task 1
- Task 6 依赖 Task 1
- Task 7 依赖 Task 2
- Task 8 依赖 Task 3
- Task 9 依赖 Task 4, 5, 6
- Task 10 可与 Task 4-9 并行执行
- Task 11 依赖 Task 9, 10
- Task 12 依赖所有其他任务
