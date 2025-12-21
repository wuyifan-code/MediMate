## 实施计划

### 1. **添加 OpenAI SDK 依赖**
- 通过 npm 安装 OpenAI SDK

### 2. **更新 AI 服务 (`geminiService.ts`)**
- 使用 OpenAI SDK 替换自定义 fetch 实现
- 配置 DashScope 的 API 密钥和基础 URL
- 实现聊天补全的流式支持
- 更新流式响应的处理逻辑
- 保持现有函数签名的向后兼容性

### 3. **增强组件中的流式支持 (`AIChatOverlay.tsx`)**
- 修改 `handleSend` 函数以处理流式响应
- 更新状态管理以支持增量消息更新
- 实现流式文本的视觉反馈（打字效果）
- 确保流式连接的正确错误处理

### 4. **更新类型定义**
- 根据需要添加流式相关类型
- 确保与 OpenAI SDK 响应格式兼容

### 5. **测试集成**
- 验证流式传输正常工作
- 测试聊天历史功能
- 确保错误处理正常
- 测试不同聊天模式

### 关键变更
- 用 OpenAI SDK 替换自定义 API 调用，提高可维护性
- 添加实时流式传输，改善用户体验
- 在添加新功能的同时保持现有功能
- 更新 UI 以逐步显示流式文本

### 要修改的文件
1. `package.json` - 添加 OpenAI SDK 依赖
2. `services/geminiService.ts` - 实现带有流式支持的 OpenAI SDK
3. `components/AIChatOverlay.tsx` - 添加流式 UI 支持

### 预期结果
- AI 响应将实时流式传输，带有打字效果
- 更快的初始响应，改善用户体验
- 使用 OpenAI SDK 抽象提高可维护性
- 与现有功能完全向后兼容