# MediMate 参赛交付包

本目录保存 2026 年全国大学生数字媒体科技作品及创意竞赛的提交准备材料。比赛版本只主张当前代码已经实现并能演示的能力：

> 面向异地就医家庭的可解释陪诊匹配与可信协作系统。

核心闭环是：需求结构化、陪诊师匹配、节点化服务记录、家属进度查看和基于记录的陪诊纪要。

## 提交前检查

1. 设置前端 `VITE_API_URL` 为正式 HTTPS API 地址。
2. 设置后端 `DATABASE_URL`、`JWT_SECRET`、`FRONTEND_URL` 和服务端 `MINIMAX_API_KEY`。
3. 执行 `cd server && npx prisma migrate deploy && npm run prisma:seed`。
4. 执行 `npm run contest:verify`。
5. 在陌生电脑上打开前端，使用合成演示账号完成 `docs/contest/DEMO_SCRIPT.md`。
6. 将 README、作品说明、截图、视频、原创性声明、知识产权说明和 AI 工具使用说明一起提交。

演示数据必须明确标注为合成数据。不得把演示数据、完整性指纹或 AI 生成文本表述为真实医疗诊断、真实到院事实或区块链上链结果。
