# 2026-07-24：生产 Auth 邮件采用供应商中立、失败关闭的 SMTP 配置

**状态：** 已采用；staging/production 真实凭据、发件域名 DNS 和邮件旅程尚待配置

## 背景

Supabase 默认邮件服务只适合演示环境：它只向项目团队预授权地址发送，当前默认上限也很低，不能支撑真实学生注册、邮箱确认和密码重置。只把“配置 SMTP”留在人工清单或 Supabase GUI 中，会产生一个无法由发布 Agent 独立复核的生产漂移点。

## 决策

- 保持 managed Supabase Auth，不增加独立邮件微服务。
- `scripts/configure-supabase-auth-smtp.ts` 通过 Supabase Management API 对批准项目执行窄范围 Auth PATCH；默认只检查，只有 `--apply` 才写入。
- SMTP host、port、发件地址和发件名称存放在 GitHub Environment variables；SMTP user/password 只存放在 Environment secrets。脚本、日志、计划和浏览器构建都不得输出或携带凭据。
- 配置器不绑定 Resend、Aliyun DirectMail 或其他厂商，只接受 SMTP 协议。生产端口限制为 465、587 或 2525，发件域名和 hostname 拒绝 placeholder。
- 同一 PATCH 强制启用外部邮件、邮箱确认和安全邮箱变更。写入后重新读取远端配置，逐项比对非秘密身份并确认凭据已存储；任何缺失都会令部署失败。
- `deploy/bootstrap-requirements.json` 将两套环境的 SMTP 变量与 secret 纳入机器门禁；Supabase 部署工作流在迁移和 Turnstile 后自动应用 SMTP。
- 机器配置成功仍不等于邮件可交付。SPF、DKIM、DMARC、真实确认邮件、重置邮件、退信与供应商控制台证据继续作为人工生产门。

## 取舍

这一阶段不使用 Send Email Hook、队列或多供应商自动故障切换，因为 100 人封闭 Beta 尚无相应流量和可靠性证据。若后续需要品牌化模板、发送审计或跨供应商切换，再把发送职责迁移到 Auth Hook；调用方和用户旅程无需改变。

官方依据：

- Supabase custom SMTP：https://supabase.com/docs/guides/auth/auth-smtp
- Supabase Management API：https://supabase.com/docs/reference/api/getting-started
- Supabase Auth 邮件模板：https://supabase.com/docs/guides/auth/auth-email-templates
