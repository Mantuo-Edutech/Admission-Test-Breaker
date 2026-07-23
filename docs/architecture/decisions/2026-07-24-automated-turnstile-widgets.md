# 2026-07-24：Turnstile widget 采用按环境隔离、可重复执行的控制面配置

**状态：** 已采用；真实 Cloudflare account/token 和生产 widget 尚待安全配置

## 背景

应用与 Supabase Auth 已经支持 Turnstile，但仅在 GUI 中人工创建 widget 会留下三个不可验证的漂移点：hostname 是否严格隔离、Managed mode 是否保持、公开 site key 与私密 secret 是否确实来自同一个 widget。把 secret 复制进浏览器变量还会破坏安全边界。

## 决策

- staging 与 production 各使用一个独立 Managed widget；staging 只允许 `staging.uktest.cc`，production 只允许 `uktest.cc` 和 `www.uktest.cc`。
- `scripts/configure-cloudflare-turnstile.ts` 通过 Cloudflare Turnstile Widget Management API 规划、检查和应用配置。默认模式只验证本地计划且不读取 token、不访问网络；`--check` 只读远端；`--apply` 还必须提供 `CONFIGURE_MANTUO_TURNSTILE_WIDGETS` 显式确认。
- widget 名称作为稳定身份。缺失时创建；hostname 或 mode 漂移时原地更新；region 是不可变字段，错误时失败关闭，不隐式创建第三个 widget。
- API token 和 widget secret 只从本机安全环境进入进程。secret 通过子进程 stdin 写入 GitHub Environment；公开 site key 写入对应 Environment variable。脚本不输出 token、site key 或 secret。
- 每次 apply 后重新 GET widget，精确比对 name、hostname、Managed mode、region 和凭据存在性，再读回 GitHub Environment 的公开值及 secret 名称。部分外部写入失败时可安全重跑，不旋转已有 secret。
- 生产 bootstrap 把 `TURNSTILE_SITE_KEY` 与 `TURNSTILE_SECRET_KEY` 都纳入机器门禁。Supabase 部署仍负责把 secret 应用到 Auth CAPTCHA，Web 运行时只接收公开 site key。

## 取舍

本阶段不引入 Terraform 或完整 Cloudflare 基础设施仓库。系统只有两个 widget，窄范围、可测试、幂等脚本已经能消除最关键的人工漂移；当 DNS、WAF、Workers 等 Cloudflare 资源也需要统一管理时，再迁移到 IaC。

官方依据：

- Cloudflare Turnstile widget management API：https://developers.cloudflare.com/turnstile/get-started/widget-management/api/
- Cloudflare Turnstile widget concepts：https://developers.cloudflare.com/turnstile/concepts/widget/
