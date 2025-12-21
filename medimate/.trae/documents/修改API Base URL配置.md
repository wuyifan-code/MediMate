## 修改API Base URL配置

### 1. 修改OpenAI客户端的baseURL
- **文件**: `services/geminiService.ts`
- **位置**: 第48行
- **修改内容**: 将当前的阿里云DashScope地址替换为用户提供的公网IP地址
- **修改前**: `baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1'`
- **修改后**: `baseURL: 'http://120.48.178.134:3000/'`

### 2. 无需其他修改
- 该项目是React Web应用，非Android原生应用
- 不需要修改AndroidManifest.xml或配置HTTP请求权限
- 浏览器环境自动处理HTTP请求，无需额外配置

### 3. 验证修改
- 修改后需要重启开发服务器或刷新页面
- 检查控制台是否有API连接错误
- 测试AI聊天功能是否正常工作

**注意事项**:
- 确保公网IP和端口号正确
- 确保后端服务正在运行且可访问
- 检查网络连接是否正常