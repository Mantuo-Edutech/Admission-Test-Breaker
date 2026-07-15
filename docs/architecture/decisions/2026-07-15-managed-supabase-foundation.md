# 2026-07-15: 首个生产账户底座采用 managed hosted Supabase

**背景：** 项目需要生产级身份、PostgreSQL/RLS、内容 entitlement 和未来的对象存储，同时创始人希望大部分配置可由 CLI 和 Agent 自动执行，而不是依赖手工 GUI。

**选项：**

1. managed hosted Supabase：上线快，Auth、PostgreSQL、备份和 Edge Function 由官方运维；存在平台费用与部分托管依赖。
2. 自托管 Supabase：控制更完整，但需要自行承担数据库升级、备份、邮件、监控、安全补丁和故障恢复。
3. 自建 Auth/API/PostgreSQL：自由度最高，但会显著推迟学生可用的纵向闭环。

**决策：** 首个生产账户底座选择满托账号下的 managed hosted Supabase。数据库 migration、seed、Edge Function、RLS 和验证脚本全部保存在仓库并通过 Supabase CLI 执行；前端只使用 publishable key，service-role key 仅存在于可信服务端环境。

**影响：** 本地开发和 CI 使用 Supabase CLI/Docker 复现生产兼容结构；云项目绑定前不宣称生产已上线。未来如出现数据驻留、成本或运维证据，可以复用 PostgreSQL schema 和领域接口迁移到自托管或拆分服务。
