# MediMate 代码审查与整理方案

## Why

当前项目经过多次迭代后存在以下问题需要系统性解决：
- 组件和类型定义存在重复，需要统一管理
- 前后端接口定义缺乏一致性文档
- 代码组织结构需要优化以支持长期维护
- 某些功能模块设计不一致

## What Changes

### 1. 代码组织结构优化
- 重构 `components/` 目录结构，按业务模块划分
- 统一组件导出方式
- 优化 `types.ts` 类型定义结构
- 整理 `server/src/` 模块组织

### 2. UI 设计与前后端对齐
- 建立 Design Token 规范
- 统一前后端接口响应格式
- 创建组件与 API 的映射文档

### 3. 代码冗余审查
- 识别并合并重复组件（如 `PatientDashboard.tsx` 和 `components/patient/PatientDashboard.tsx`）
- 统一示例文件管理
- 合并重复的类型定义

### 4. 功能完整性审查
- 审查现有功能模块的完整性
- 识别缺失的边界情况处理
- 检查安全相关实现

## Impact
- Affected specs: 产品功能完整性
- Affected code: 全局代码组织

## ADDED Requirements

### Requirement: 代码组织标准
系统 SHALL 建立清晰的代码组织标准，支持长期维护和多 Agent 协作

#### Scenario: 目录结构标准化
- **WHEN** 新增代码文件时
- **THEN** 按照既定目录结构放置，遵循命名规范

### Requirement: 类型系统统一
系统 SHALL 统一类型定义，消除重复类型

#### Scenario: 类型定义一致性
- **WHEN** 定义新类型时
- **THEN** 检查现有类型，避免重复定义

### Requirement: 前后端接口对齐
前后端 SHALL 保持接口定义一致

#### Scenario: API 响应格式统一
- **WHEN** 后端定义新接口时
- **THEN** 提供 TypeScript 类型定义供前端使用

## MODIFIED Requirements

### Requirement: 组件导出方式
组件导出方式从多出口改为单入口

## REMOVED Requirements

### Requirement: 重复代码文件
删除以下重复/冗余文件：
- `components/PatientDashboard.tsx` (与 `components/patient/PatientDashboard.tsx` 重复)
- `components/IncomeDetail.example.tsx` (示例文件需归档)
- `components/RefundModal.example.tsx` (示例文件需归档)
- `components/OrderConfirmation.example.tsx` (示例文件需归档)
- `components/EditProfile.example.tsx` (示例文件需归档)

**Reason**: 减少维护负担，避免代码不同步

**Migration**: 将有价值的示例代码迁移到 `docs/` 目录作为参考文档
