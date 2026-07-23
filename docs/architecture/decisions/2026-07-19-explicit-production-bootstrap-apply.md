# 2026-07-19：生产控制面采用显式确认、密钥不落盘的自动配置

**背景：** 生产预检已经能准确报告 GitHub staging/production Environment、公开 origin、secret 名称和审批人缺口，但创始人并非技术人员，逐条复制 GitHub CLI 命令容易漏项、把 secret 放进 shell history，或在只有一部分输入时留下半配置环境。

**选项：**

1. 继续依赖 GitHub/Supabase GUI。学习成本低，但配置不可重复、无法进入验证层，也容易让真实状态只存在于截图和个人记忆。
2. 用一个包含所有明文 secret 的 JSON/YAML 自动配置。操作最少，但会产生高风险本地文件，容易误提交或进入备份、聊天和日志。
3. 配置文件只保存公开 origin、审批人和“secret 来自哪个本机环境变量”；默认只生成计划，只有 `--apply` 加精确确认文字才写入，并通过 stdin 把 secret 交给 GitHub CLI。**采用。**

**决策：** `buildProductionBootstrapPlan` 先按版本化 requirements 校验两套环境、正式 HTTPS origin、SMTP 非秘密身份、五项/环境的 secret 来源映射和 production reviewer。执行前必须一次性确认全部 secret 来源都有非空值；任一缺失时外部写入为零。真实值不进入计划、配置文件、命令参数、stdout/stderr 或前端变量。执行器的 Environment 创建、公开 variable、secret 和 reviewer 操作可安全重跑；任何外部失败立即停止，随后由独立只读 preflight 复核真实状态。

**影响：** 创始人只需复制模板、填写两个公开域名、SMTP 非秘密身份和 GitHub 审批人，并在当前终端安全导入十个值。自动化只配置 GitHub 控制面，不创建 Supabase 项目、SMTP 账号、Turnstile widget、DNS/TLS、备份、告警或责任人证据，也不把 Beta 结论改为 ready。若未来接入 Vault/1Password，应替换本机环境变量来源适配器，而不是改变计划与执行分离的领域契约。
