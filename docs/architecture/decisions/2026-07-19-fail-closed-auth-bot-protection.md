# 决策：账号入口使用可自动部署、失败关闭的 Turnstile

**日期：** 2026-07-19
**状态：** 已采用；真实云项目尚待配置

## 背景

100 人封闭 Beta 会把注册、登录和密码重置暴露到公网。只依赖按钮禁用或 Supabase 默认邮件频率不足以证明防滥用，因为浏览器可以被绕过，而且生产环境可能忘记启用服务端 CAPTCHA。与此同时，本地开发不能强依赖外部挑战，否则独立 Agent 和离线测试无法稳定运行。

## 决策

- 使用 Supabase Auth 原生支持的 Cloudflare Turnstile，覆盖注册、登录和密码重置。
- 浏览器只接收公开 site key；secret 只通过 Supabase Management API 写入 Auth 配置，绝不进入 Web 镜像、runtime config 或日志。
- `staging` 和 `production` 必须提供 runtime site key；缺失时页面明确停用账号操作。`local` 和 `ci` 默认可不启用，以保留确定性测试。
- 前端 challenge token 只使用一次，并在每次请求后重置；Supabase Auth 负责服务端验证。客户端校验只是清晰反馈，不被当成安全边界。
- `pnpm supabase:auth-protection:apply` 明确修改批准的云项目；除 Turnstile 外，同一次窄范围 PATCH 还锁定正式 site URL、确认/重置 redirect allowlist、强制邮件确认、10 位大小写字母加数字密码规则与 refresh-token rotation。`pnpm supabase:auth-protection:check` 只检查。GitHub Supabase 发布工作流在 migration 后自动执行 apply。
- CSP 只新增 Turnstile 官方要求的 `script-src`、`frame-src` 和连接来源，不放宽其他第三方脚本。

## 结果与边界

代码现在能阻止“生产忘记 CAPTCHA 仍照常注册”的静默降级，也让服务端密码与确认规则不能被绕过页面，并且不要求创始人逐次使用 GUI。它仍不能证明真实 Turnstile widget、hostname allowlist、Supabase secret、SMTP 和生产限流已经配置；只有在真实域名执行 apply/check 并完成过期 token、重复 token、429 和邮件旅程后，P0-01 才能关闭。

官方依据：

- Supabase Auth CAPTCHA：https://supabase.com/docs/guides/auth/auth-captcha
- Supabase Auth 限流：https://supabase.com/docs/guides/auth/rate-limits
- Supabase Management API：https://supabase.com/docs/reference/api/management
- Cloudflare Turnstile CSP：https://developers.cloudflare.com/turnstile/reference/content-security-policy/
