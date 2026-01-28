import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 加载环境变量
    const env = loadEnv(mode, '.', '');
    
    return {
      // 核心修复：设置 base 为相对路径，解决 GitHub Pages 部署后的资源路径 404 问题
      base: './', 
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      // 这里的 API_KEY 会从环境变量 GEMINI_API_KEY 中读取
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      
      resolve: {
        alias: {
          // 设置 @ 符号指向当前根目录
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
