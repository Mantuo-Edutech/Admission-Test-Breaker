# 2026-07-18：不可变 Web 发布与分层恢复

**状态：** 已采纳；本地容器、恢复和 100 用户容量已验证，满托 staging/production 尚未部署。

## 背景

本地 Vite 页面、Supabase migration 和测试通过，不能证明网站可以稳定发布。100 人封闭 Beta 至少需要可追溯版本、环境隔离、健康检查、数据库恢复和容量证据；同时不能为了 staging 与 production 分别编译两份行为可能漂移的前端，也不能把 Supabase service-role key 写入浏览器配置。

## 选项

1. 每个环境在服务器重新执行 Vite build：简单，但同一 commit 会产生不同产物，回滚和审计困难。
2. 构建一次不可变镜像，启动时注入浏览器安全配置：多一个 runtime config 边界，但同一镜像可以从 staging 原样提升到 production。
3. 立即改成 SSR/BFF：可以增加服务端控制，但当前学习旅程不依赖服务端 HTML，会显著扩大运维面。

## 决策

采用选项 2：

- 多阶段 Docker build 运行 TypeScript、Vite 和私密正文 bundle 泄露门禁；运行阶段只保留静态文件与 nginx。
- 容器以非 root 用户、只读根文件系统和临时 `/tmp` 运行；`/healthz` 与 `/version.json` 分别用于可用性和版本追溯。
- `SUPABASE_URL` 与 publishable key 通过启动时生成的 `/runtime-config.js` 注入；service-role、数据库密码和访问令牌永不进入 Web 镜像。
- GitHub Actions 分开验证应用、数据库/RLS、全数据库恢复、100 用户容量和真实容器；发布镜像只使用 commit SHA 标签。
- Supabase migration 与 Edge Function 由受 GitHub Environment 审批保护的独立工作流部署，先 dry-run 再 apply。
- 生产灾备以 Supabase 平台物理备份/新项目恢复为主；CLI 逻辑导出作为异地补充。原因是普通 CLI dump 默认不包含托管 `auth`、`storage` 等 schema，不能单独承担账号恢复。

## 影响

- 代码已经证明“可构建、可运行、可本地恢复、可承载 100 个隔离数据旅程”，但这不等于满托生产环境已经建立。
- staging/production 域名、Supabase 项目、SMTP、CAPTCHA、告警接收人、平台备份恢复和远程权限旅程仍是发布 P0。
- 如果未来引入 BFF、文件上传或 AI job，仍沿用不可变产物、运行时非敏感配置、服务端秘密和环境审批边界。
