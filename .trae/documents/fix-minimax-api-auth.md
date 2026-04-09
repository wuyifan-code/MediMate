# 修复MiniMax API调用失败问题

## 问题诊断

### 症状
用户在PatientDashboard输入症状（如"胃疼"）后，"AI 导诊建议"区域显示：
> "Service temporarily unavailable. Please visit a hospital."

### 根因分析
1. **AI导诊API需要登录认证**
   - 端点: `POST /api/ai/triage`
   - 使用了 `@UseGuards(JwtAuthGuard)` 守卫
   - 未登录用户调用返回401错误

2. **前端错误处理逻辑**
   - 文件: `services/aiService.ts`
   - catch块返回fallback消息: "Service temporarily unavailable"
   
3. **对比正常工作的功能**
   - `POST /api/ai/web-search` 无需认证 → 正常工作
   - MiniMax API本身配置正确（URL、Key均有效）

## 修复方案

### 方案：移除AI导诊的强制登录要求

将 `/api/ai/triage` 和其他AI端点的认证要求改为可选，允许未登录用户体验AI功能。

#### 修改文件
1. **server/src/modules/ai/ai.controller.ts**
   - 移除 `triage`、`match-reasoning`、`assistant` 端点的 `@UseGuards(JwtAuthGuard)`
   - 保留 `web-search` 的无认证状态

2. **验证修改**
   - 未登录状态下测试AI导诊功能
   - 确认返回正常的AI响应而非fallback消息

## 预期结果
- 未登录用户可以使用AI导诊功能
- 输入症状后显示真实的AI医疗建议
- 不再出现"Service temporarily unavailable"错误
