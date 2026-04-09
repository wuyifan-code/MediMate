# 消息中心 UI 重新设计 Spec

## Why
当前消息中心的聊天框使用通用的 Tailwind 类名组合，视觉效果粗糙、缺乏品牌特色。需要重新设计消息卡片，使其更加精致、专业、有品牌识别度。

## What Changes
- 重新设计消息卡片组件样式
- 优化消息气泡样式（发送/接收不同样式）
- 设计专业的好友/用户头像容器
- 优化时间戳显示
- 统一操作按钮样式
- 添加微交互动画

## Impact
- Affected specs: 专业 UI 设计重构
- Affected code: Messages.tsx, Notifications.tsx, 所有聊天相关组件

## ADDED Requirements
### Requirement: 专业消息卡片
系统 SHALL 提供精致的消息卡片设计。

#### Scenario: 新消息卡片
- **WHEN** 用户查看消息列表时
- **THEN** 每条消息以精致的卡片形式展示
- **AND** 包含用户头像、名称、消息摘要、时间戳
- **AND** 有优雅的阴影和圆角

#### Scenario: 未读消息高亮
- **WHEN** 消息未读时
- **THEN** 显示主色调的圆点指示器
- **AND** 文字加粗显示

### Requirement: 消息气泡
系统 SHALL 提供区分发送和接收消息的气泡样式。

#### Scenario: 发送的消息
- **WHEN** 用户查看自己发送的消息时
- **THEN** 气泡右对齐，使用主色调渐变背景

#### Scenario: 接收的消息
- **WHEN** 用户查看收到的消息时
- **THEN** 气泡左对齐，使用柔和的背景色

### Requirement: 操作按钮样式
系统 SHALL 提供一致的操作按钮设计。

#### Scenario: 消息操作
- **WHEN** 用户悬停消息卡片时
- **THEN** 显示操作按钮（标记已读、删除等）
- **AND** 按钮使用图标形式，带有悬停效果

## MODIFIED Requirements
无

## REMOVED Requirements
无
