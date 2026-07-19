# 100 人封闭 Beta 上线评估

**评估版本：** 2026-07-19.58
**目标：** 允许约 100 名真实学生完成“选择考试 → 定位 → 练习 → 保存数据 → 联系冰冰 → 邀请码注册 → 获得真实资料”的完整闭环。
**当前结论：** **不具备上线条件，发布准备度 80/100。**

这里的 78 分是生产发布准备度，不是页面完成率。除页面、TMUA 内容、账号、数据权利和两项真实私密资料外，CAIE/Pearson/IB/AP 的版本化零 Token 定位与课程来源 registry、不会消耗历年真题的 TMUA 8 题/30 分钟原创起点诊断、不可变 Web 镜像、CI、本地全数据库恢复、100 用户容量、真实 URL 定时冒烟契约、站内纠错/技术反馈、ESAT 五模块 50 道原创短诊断、五模块各 27 题/40 分钟的完整模考与覆盖 50 个一级单元的 Notes、TARA 10 题短诊断加 Critical Thinking/Problem Solving 各 22 题完整模考、Writing Task 与 21 单元 Notes、LNAT 12 题短诊断加 12 篇/42 题/95 分钟完整结构 Section A、Section B 写作与 21 单元 Notes、UCAT 四模块短诊断及四套完整结构模考（VR 44、DM 35、QR 36、SJT 69 题）和 25 单元 Notes、五考试私密学习记录，以及账号入口失败关闭的 Turnstile 契约也已经获得机器证据；ESAT、TARA、LNAT、UCAT 的五套 Notes 还新增了与网页同源、共 79 页并经过全页渲染检查的 A4 教学预览。独立产品发布审计进一步确认 40/40 个公开产品的自动主张均已通过，但没有把未留痕的人工审核当成通过，因此当前仍是 0/40 完成封闭 Beta 的内容发布门。全部待审项已经去重并落入 68 项工作清单：25 项学科/双语/权利、12 项学生理解与用时标定、31 项真机/响应式/无障碍；每项都绑定产品版本、路由、负责人角色、源文件数量、证据要求和当前 SHA-256 指纹。审核决定与报告现在进入不随浏览器发布的独立账本：只有 owner role、适任审核者、独立性、attestation、证据哈希和当前源指纹同时有效才会放行；旧版决定会 stale，要求修改的决定不会通过，证据被事后改写会直接使验证失败。这完成的是审核基础设施，不是代替老师签字，所以 0/40 不上调。邀请码核销成功页与账号页现在会从统一产品目录解析全部已发布资料，不再把某个 TMUA 权限包写死。创始人另有独立、可撤销的匿名转化看板能力：`/operations/funnel` 只返回按考试和六个阶段汇总的 7/30/90 天 Journey 数，不返回学生身份或原始事件，也不自动获得邀请码运营权限。但云项目、真实 SMTP/Turnstile 身份、未成年人运营/法律责任、平台恢复、支持负责人和真实告警仍未完成，不能用本地验证抵消生产 P0。

**2026-07-19.57 评分更新：** 上段的 78 分为上一 revision 叙事；学生逐项授权的老师/家长协作切片通过本地数据库、服务、页面和响应式验证后，当前机器计算为 **80/100**。新功能包含五项独立 scope、考试/有效期边界、一次性协作码、老师/家长工作区、schema-v4 导出、审计和立即撤销。它只提升了本地完整性；生产部署、双账号 MFA/真机 UAT 和隐私终审未完成，所以结论仍是 `not-ready`。

**2026-07-19.58 审核执行更新：** 已增加独立权限的私有内容审核台和 server-only 当前队列同步，能让非技术审核者处理 68 个审核组、打开真实产品并下载未签署证据包；本地数据库、页面、服务和回滚边界已有机器证据。它不提供浏览器批准或发布 RPC，生产尚未同步，真实审核者尚未签字，因此人工门仍是 **0/40**，总分仍为 **80/100，not-ready**。

机器可读的同一结论保存在 `content/platform/beta-100-readiness.json`。运行：

```bash
pnpm beta:audit
pnpm beta:gate
```

`beta:audit` 用于随时看进度并保持成功退出；`beta:gate` 是严格发布门，只要任何 P0 未验证就必须失败。

## 1. 已经可以真实体验的部分

| 能力 | 当前证据 | 判断 |
| --- | --- | --- |
| 首页定位 | 五项考试入口、清晰备考路径、满托品牌 | 可体验 |
| TMUA 课程定位 | CAIE/Pearson IAL、IB AA/AI SL/HL、AP Precalculus/Calculus 固定规则，不实时消耗 Token；AP 官方 CED 已本地哈希，IB 自动下载阻断状态如实登记 | 可体验 |
| TMUA 起点诊断 | 8 道满托原创题、30 分钟、覆盖代数/几何/数列/三角/微积分/证明，不消耗历年真题；接入计时、保存、标记、提交、基础结果与学习记录 | 可体验；不输出官方尺度分、百分位或录取概率，仍需独立数学复核与真实学生用时标定 |
| TMUA 真题 | 18 套、360 道逐题在线排版；无公开原卷 PDF | 已验证 |
| TMUA Notes | 7 章双语教学预览、9 道原创例题、12 道主动回忆题，网页与 25 页 PDF 同源 | 独立学科、相似度、双语术语与实机终审仍待完成 |
| ESAT 定位、练习与五模块 Notes | 4 所院校、56 项 2027 专业要求、50 个知识单元；五模块各 10 道、共 50 道原创短诊断；Mathematics 1/2、Physics、Chemistry、Biology 各有 27 题/40 分钟完整模考，分别覆盖 M1–M7、MM1–MM8、P1–P7、C1–C17 与 B1–B11；五套完整模考加短诊断共 185 道原创在线题；数学 15 单元与理化生 35 单元 Notes 共提供 15 套方法、5 道原创例题、15 组主动回忆与 10 + 16 页同源 A4 PDF | 按专业和本人课程档案筛选后只显示需要的模块；五套完整模考和 Notes 仍是满托原创 teaching preview，不是官方卷，不输出虚构的 1–9 分、录取 Benchmark 或录取概率；独立学科、双语、相似度、学生标定与真机终审待完成 |
| TARA / LNAT / UCAT 起点定位 | 本人档案后逐模块列出可迁移课程、具体双语缺口、第一轮时间和练习入口；固定规则、0 Token | 可体验；课程背景不是能力证据，第一轮时间不是总训练时长 |
| TARA 推理、写作与 Notes | 10 道原创推理短诊断；Critical Thinking 与 Problem Solving 各有一套 22 题/40 分钟原创完整模考，合计 54 道在线推理题；Writing Task 3 道原创题三选一；复习笔记覆盖 CT 七类、PS 三类、写作与中英术语共 4 模块/21 单元，并有 17 页同源 A4 PDF | 练习可私密保存和提交，Notes 与下载在本人档案后开放；只报告原始正确数，写作不生成自动分数；仍需细颗粒题组、难度/用时标定、人工 rubric 与独立教师终审 |
| LNAT Section A、B 与 Notes | Section A 有 3 篇/12 题短诊断，以及单独的 12 篇/42 题/95 分钟完整结构模考，合计 54 道原创题；Section B 3 道原创题三选一；Notes 覆盖论证阅读、写作、EAL 和 95+40 分钟节奏共 4 模块/21 单元，并有 16 页同源 A4 PDF | 练习可私密保存和提交，Notes 与下载在本人档案后开放；42 题全卷只报告原始正确数，不冒充官方等值难度或 Benchmark，仍需独立教师、语言、干扰项、学生用时与三端人工终审；写作 rubric、标定、细颗粒章节和人工反馈未完成 |
| UCAT 四模块与 Notes | VR 有 3 篇/12 题短诊断及单独的 11 篇/44 题/22 分钟完整模考；DM 有 8 题短诊断及单独的 35 题/37 分钟完整模考，含 6 组五陈述题；QR 有 4 组数据/10 题短诊断及单独的 9 组数据/36 题/26 分钟完整模考；SJT 有 3 个情境/10 题短诊断及单独的 21 情境/69 题/26 分钟完整模考，含 30 道适当性、30 道重要性和 9 道 Most/Least；合计 224 道原创题；Notes 覆盖 VR、DM、QR、SJT 和工具/节奏共 5 模块/25 单元，并有 20 页同源 A4 PDF | 均可计时、保存、提交并看基础结果，Notes 与下载在本人档案后开放；VR 与 QR 全卷只报告原始正确数，DM 全卷按 2/1/0 规则报告最高 41 原始分，SJT 等级题完全匹配 1 分、相邻 0.5 分，Most/Least 两项全匹配 1 分；不换算 300–900、百分位或正式 Band，全部内容仍需独立 UCAT、英国医疗/牙科专业和设备终审 |
| 邀请码账户 | 本地 Supabase 可预检、注册、确认、核销 entitlement | 本地底座已验证；未完成生产配置 |
| 私密学习数据 | Guest → 本人 Learner Space；按考试隔离背景档案，事务保存快照与事件 | 本地数据库与 HTTP 已验证；未部署生产 |
| 私密学习记录 | 五考试分别汇总最近练习、频率、活跃时间、改答、原始结果、模块和 147 个双语知识主题；可重开历史结果 | 电脑/iPad/手机 Chromium 已验证；不生成官方换算分、百分位或能力定论；生产跨设备仍待完成 |
| 数据权利 | 双语分层说明、本人 JSON 导出、密码确认删除 | 本地已验证；最终法定信息与运营流程未完成 |
| 学生授权协作 | 学生逐项选择老师/家长、五项权限、考试和有效期；对方登录兑换一次性协作码，在独立工作区按权读写 | 44 项专项 pgTAP 和 27 项领域/服务/页面契约已通过；生产 migration、双 MFA 账号、真机/屏幕阅读器 UAT 待完成 |
| 纠错与技术反馈 | 题目级入口、私密回执、P1-P4 规则分级、跨账号隔离、处理审计 | 本地已验证；生产负责人、告警和 staging 演练待完成 |
| 满托转化漏斗 | 只记录选择考试、完成档案、开始/完成练习、主动打开冰冰与邀请码成功；随机 session Journey 不连接账号或学习数据 | 238 项整套 pgTAP 中包含漏斗追加、独立看板授权/撤销和普通学生拒绝；生产部署、MFA、真机验收和 90 天清理待完成 |
| 资料产品 | 40 项网页产品、1 项内部组合 Notes 蓝图；35 个不同站内路由逐一运行时加载；23 项免费原生练习统一先完成人档案；TMUA 25 页 PDF 与其余五套 79 页 PDF 均与网页同源；六周计划与 Specimen P1 全 20 题解析由服务端按 entitlement 交付 | 40/40 公开产品的自动证据通过；0/40 完成人工签字，因此尚未达到封闭 Beta 内容门。68 个去重审核任务已绑定责任角色、版本、路由、源指纹和证据要求；`review:prepare`/`review:record` 与独立 ledger 会拒绝 stale、changes-requested 或证据哈希漂移。两项真实 gated asset、PDF 哈希/页数、资产→产品完整性及“无未发布模考销售承诺”均已本地验证；真实审核、各考试细颗粒章节与生产部署待完成 |
| 发布与恢复 | 非 root/只读镜像、runtime config、CI、首屏性能预算、全库恢复、100 用户容量；只读生产预检安全核对真实状态，显式确认的自动配置器可在 secret 不落盘、不进 argv/日志的前提下配置 GitHub 控制面 | 本地与代码证据已验证；staging/production GitHub Environment 已创建，但 Supabase 云项目、八个 secret、两个公开 origin、production reviewer、正式域名与生产运行环境尚未配置；Environment 存在不等于已经部署 |

## 2. 架构选择

本轮比较了三种实现：

1. **继续按考试逐页补功能。** 改动最小，但会继续产生不同状态、不同文案、不同访问逻辑，无法判断“某份资料是否真的上线”。不采用。
2. **版本化资料产品注册表 + 通用资料馆。** 每项产品统一记录版本、核验日期、考试、类型、状态、访问方式、权限包、交付方式、权利基础、内部路由、指标和验证证据；每个 content 文件同时具有唯一生命周期分类。未来可平滑迁移到后台管理。**当前采用。**
3. **立即建设完整 CMS 与运营后台。** 长期正确，但对 100 人 Beta 过重，会推迟生产数据与隐私 P0。等注册表和审核工作流稳定后再做。

这个选择的核心约束是：`discovered`、`downloaded`、`publishable`、`published` 必须是不同状态。页面不能再用“建设中”掩盖未完成，也不能把官网链接当作本站产品。

## 3. 上线前必须关闭的 P0

### P0-01 生产账号与邮件

- 绑定正式 Supabase 项目和域名；
- 账号页、退出登录和密码重置 UI 已实现；仍需用可信域名 SMTP 验证邮件确认和重置全链路；
- 注册、登录和密码重置现在共用 Turnstile：生产缺少 site key 时按钮失败关闭，token 会交给 Supabase Auth 服务端验证，并在每次请求后重置；
- `pnpm supabase:auth-protection:apply` 可通过 Management API 启用云端 Turnstile，并锁定正式 site URL、确认/重置 redirect allowlist、邮件确认、10 位大小写字母加数字密码规则和 refresh-token rotation；GitHub Supabase 发布也会自动执行。仍需创建满托真实 hostname widget、配置 site key/secret，并在云项目运行 apply/check；
- 验证匿名、已登录、已授权、已撤销四种状态。

当前实现遵循 Supabase 的 Auth CAPTCHA 与生产检查清单，并只在 CSP 中放行 Cloudflare 官方 challenge 域名。它证明实现和部署契约，不证明真实云项目已经保护；生产还必须覆盖 challenge 过期、token 重复使用、429 限流和真实邮件失败。

### P0-02 学习数据进入 Learner Space

当前代码已经完成以下部分：

- 未登录时只使用随机 Guest Space；登录后由 auth-aware adapter 切换到本人 Learner Space；
- TARA、LNAT、UCAT 的最小背景档案按 `Guest/Learner Space + exam` 隔离；练习路由先识别考试，TMUA、ESAT 和其他考试不再误用同一档案门禁；
- 课程档案通过受认证 RPC 写入，练习快照与事件后缀在一个事务中保存；
- 同一事件重复重放不重复写入，同一 Guest Space 不能被第二个账号认领；
- 当前会话与完整历史快照分开保存；匿名设备最多保留最近 30 份，登录后只从本人 RLS Learner Space 读取，并可在开始新练习后继续打开旧结果；
- 保存失败会明确显示“尚未保存”、保留当前页答案并提供重试，恢复联网后自动补存；提交快照未持久化时不会进入结果页；
- 五项考试的学习记录只展示频率、活跃用时、改答、原始结果、写作字数、模块和双语知识主题事实，不输出官方换算分或伪 Benchmark；
- 学生可逐项授权老师/家长查看进度、查看具体作答、添加批注、制定计划或布置练习，并限定考试与 1–180 天有效期；一次性协作码兑换、审计和立即撤销已在本地验证；
- 当前 8 个数据库文件中的 238 项 pgTAP 覆盖 RLS、邀请运营、匿名漏斗/看板、考试档案、幂等保存、A/B 跨租户拒绝、数据权利、反馈、资料权限和 44 项老师/家长协作 Grant 专项边界；现有真实本地 HTTP 流程继续覆盖账号、运营、学习数据、反馈、漏斗和私有资料。

上线前仍必须把仓库中的 migration 部署到满托云项目，并用两台设备完成“登录 → 恢复课程 → 继续练习 → 断网失败提示与重试 → 提交 → 再次恢复”的生产验证。本地通过不能替代生产持久性证据。

### P0-03 未成年人隐私与用户权利

本产品很可能由未满 18 岁学生使用，应按高隐私默认来设计，而不是等用户声明年龄后才保护。当前已实现：

- `/privacy` 的中英文分层说明和注册/账号入口；
- 登录用户取得完整机器可读 JSON 副本；
- 导出 schema v4 包含协作邀请、Grant、协作内容与审计，不包含协作码摘要；
- 密码二次验证 + 精确文字确认的账号删除，活动数据库级联和本机已知学习数据清理；
- 邀请码、冰冰/满托咨询与学习数据读取继续严格分离。
- 老师/家长协作只能来自学生创建的 Grant；“家长”协作身份不自动等于法定监护或代理身份。
- `/feedback` 只保存学生主动填写的内容和受限页面标识；题目级入口提供私密回执，联系方式被拒收，反馈随本人数据导出并随账号删除。

上线前仍需补全法定控制者与数据权利邮箱、lawful basis、DPIA、生产数据地区/子处理者/跨境机制、具体保留与备份删除期限，以及纠正、限制、异议、代理请求、投诉和泄露响应的人工流程。隐私文字还需要不同年龄学生可理解性测试和英国专业人士终审。

ICO 的 Children’s Code 要求可能由儿童访问的在线服务考虑 15 项标准，并强调高隐私默认、最少收集和清晰透明；当前 ICO 也注明相关指南因 2025 年法律变化正在复核，因此上线前还需要英国隐私专业人士确认最终文本与流程。参考：

- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/designing-products-that-protect-privacy/childrens-code-design-guidance/

### P0-04 发布、恢复与监控

当前已经完成：

- 同一 commit SHA 的不可变镜像可从 staging 提升到 production，启动时只注入 URL 与 publishable key；
- 非 root/只读 nginx、Caddy/TLS 编排、`/healthz`、`/version.json`、CSP 和部署后验证脚本；
- 部署后验证会拒绝空值、占位值、错误 Supabase project、runtime/version 不一致或缺失 Turnstile，并直接请求托管 Auth health/settings 确认注册开放、邮件确认启用；
- GitHub CI 同时执行应用、238 项 pgTAP/现有 HTTP 验证、Chromium 三视口关键旅程、全数据库恢复、100 用户容量和实际容器检查；Supabase 部署工作流先 dry-run migration，再 apply 并部署 Edge Function；
- `Deployment smoke` 可人工检查 staging，并在 production 每日两次运行真实 URL preflight 与桌面/手机公开路径；它已在本机部署上验证，但 GitHub Environment 尚未配置真实 `PUBLIC_APP_ORIGIN`，所以不能宣称线上监控已生效；
- 本地全数据库恢复比对 Auth 标记用户、Learner Space、7 项资源、2 份私密 payload 和 16 条 RLS policy；
- 100 个隔离用户、并发 10 完成邀请码、档案、开始、提交和站内反馈，最近一次本机 p50 24ms、p95 62ms、最大 103ms。
- `pnpm production:preflight` 已把生产控制面变成独立失败关闭检查：只读取 GitHub Environment 中 secret 的名称和公开变量，不读取 secret 值；分别判断 GitHub setup 与当前 commit 是否为干净、已推送的 release candidate，并继续把 SMTP、Turnstile hostname、域名/TLS、平台恢复/告警/责任人列为人工证据。2026-07-19 的最新真实只读运行确认 GitHub 仓库/CLI 权限、四个工作流以及 `staging`、`production` Environment 均存在，但八个 environment secrets、两个公开 origin 和 production required reviewer 仍全部缺失。
- `production:bootstrap-plan`/`production:bootstrap-apply` 已把上述 GitHub 控制面配置变为默认 dry-run、显式确认才写入的重复流程。配置文件只有公开 origin、审批人和 secret 来源环境变量名；执行前少一个值都会零写入，真实值只经 stdin 进入 GitHub CLI，失败即停，完成后由独立只读 gate 复核。该工具尚未在真实环境执行，也不会代替创建 Supabase 项目、SMTP/Turnstile widget、DNS、备份、告警和责任人。

仍必须完成：

- 实际建立满托 staging 与 production，并由 GitHub Environment 审批执行一次发布提升；
- 配置外部可用性、Supabase 错误告警、隐私安全的关键旅程指标和真实接收人；
- 从 Supabase 平台备份恢复到新项目，记录并达到初始 RPO ≤ 24 小时、RTO ≤ 4 小时；
- 在真实地区网络、SMTP 与生产数据库上重复容量和关键旅程验证。

完整命令、回滚与事故边界见 `docs/operations/PRODUCTION_BETA_RUNBOOK.md`。本地恢复和负载通过使该 P0 从 **incomplete** 变为 **partial**，但不能变成 verified。

Supabase 的正式上线清单明确要求复核 RLS、安全顾问、SSL/网络限制、MFA、可信 SMTP、备份、负载测试和 CAPTCHA。参考：https://supabase.com/docs/guides/deployment/going-into-prod

### P0-05 邀请码必须解锁真实资产

`tmua-full-access` 已绑定真实的 `TMUA 六周精确训练计划`；`tmua-deep-review` 与 `tmua-full-access` 又绑定 `Early Specimen Paper 1 逐题深度解析`。后者先逐页核对原 PDF 并修复 12 道旧转录错误，再为 20 道题分别提供方法、推导、易错点和下一步训练。两份正文均不进入前端 bundle；未授权和第二账号得到空结果，授权后返回完整结构正文，相关 entitlement 撤销后立即停止返回。数据库签发函数还要求每个权限包至少具有一项真实 published entitled 资源，只有草稿的 ESAT/TARA/LNAT/UCAT 包会以 `invite_package_unpublished` 失败。邀请码成功页与账号页从同一产品注册表把 package 映射到全部可打开资料；单独核销 `tmua-deep-review` 不会再被误报为“尚未找到权限”。发布门同时验证每个 invite 产品和逐包映射真实存在于 migration。238 项 pgTAP、组件测试与真实 HTTP 流程已经验证这些边界。

Specimen P1 结果页现在从产品目录的 `relatedPracticeIds` 取得真实解析产品，并要求产品 ID 与 20 道题的服务端资源映射完全一致；未发布或冲突时不显示销售承诺。锁定学生可直接打开冰冰二维码，或输入已有邀请码；邀请码预检、注册、登录与邮件确认会保存安全的站内结果地址，核销后返回原结果页并清除该地址。单元测试与电脑/iPad/手机 E2E 覆盖这条本地闭环；生产冰冰账号、MFA、正式邮件、云端 entitlement、撤销复验和真机 UAT 仍未完成，所以 P0-05 和总分保持不变。

ESAT、TARA、LNAT 与 UCAT 的公开页面都不会把尚无真实正文的深度解析包装成“按需解锁”；draft package 只保留为内部未来契约，不构成公开产品，也不能再签发邀请码。

冰冰运营身份的后端边界与本人队列页面已经完成：只有由 service-role 明确授予且可随时撤销的 `invite_operator` 才能调用运营 RPC；账号页只在二次角色检查通过后显示 `/operations/invites` 入口。页面只列出具有已发布 entitled 资源的资料包，只能签发最长 90 天有效、1–20 次核销、1–365 天资料权限的有限邀请码，只能列表和撤销自己创建的代码；明文 code 只在签发成功后于当前内存状态显示一次。第二位运营者看不到冰冰的记录，普通学生无法自授权，审计日志不保存明文代码或学生身份；运营身份仍按普通学生 RLS 访问其他表，因此看不到学生答案、课程档案、学习事件或 entitlement。创始人或受批准的事故负责人另有只授予 service-role 的限时、限量全局审计 RPC，冰冰及普通浏览器不能调用。44 项专门 pgTAP、真实 HTTP 流程与 15 项运营页面/服务组件测试已验证授权、签发、草稿包拒绝、本人范围、跨运营者拒绝、一次性明文提示、撤销和审计。

该 P0 仍为 **partial**：还要完成 `/operations/invites` 在桌面、iPad、手机、键盘和屏幕阅读器下的人工验收；随后为冰冰建立真实已验证账号、启用 MFA、在生产项目授予角色，并在正式域名重复正常学生、第二运营者、签发、注册、撤销运营角色和恢复演练。共享运营队列不是现有页面的隐藏能力；未来若需要，必须另建团队 scope 与审批模型。

## 4. P1：Beta 可以开始前同批完成

- 站内题目纠错、技术/账号/隐私反馈、本人回执、P1-P4 分级和私有审计已完成；上线前还要明确主/备责任人、接入告警，并在 staging 演练三类工单；
- `/operations/funnel` 已提供按考试、阶段和 7/30/90 天窗口查看的匿名 Journey 汇总；账号入口只在独立 `product_funnel_viewer` 复核通过后出现。上线前还要为批准的创始人账号启用 MFA、部署并授予该角色、安排 90 天自动清理，并在正式域名证明普通学生无法读取汇总、批准者无法读取原始行；
- Playwright 已在 Chromium 的手机、iPad 和电脑尺寸完成“首页 → UCAT 档案 → 原生练习 → 保存/刷新 → 提交/专用计分 → 私密学习记录/历史结果入口”关键旅程，以及 ESAT Mathematics 1/2、Physics、Chemistry、Biology 五套完整模考、TARA Critical Thinking/Problem Solving 两套完整模块、LNAT 12 篇/42 题 Section A 全卷、UCAT 11 篇/44 题 Verbal Reasoning、35 题 Decision Making、9 组数据/36 题 Quantitative Reasoning 和 21 情境/69 题 Situational Judgement 四套全卷的资料页进入、原生作答、专属交互和刷新恢复；仍需真实 iPhone/iPad Safari、Android、键盘、屏幕阅读器和 reduced-motion 人工 UAT；
- 完成 ESAT 五模块 50 道短诊断、五模块各 27 题完整模考及 50 单元 Notes、TARA 54 道推理题/写作及 21 单元 Notes、LNAT 54 道 Section A 原创题/Section B 写作及 21 单元 Notes、UCAT 224 道原创练习（含 VR 44 题、DM 35 题、QR 36 题与 SJT 69 题全卷）及 25 单元 Notes 的独立学科、语言、英国医疗/牙科专业判断、术语和多设备终审；五套顶层下载版 79 页已经落地，下一步继续细化为完整章节，并建设 TARA/LNAT 写作 rubric、标定与人工反馈；
- 按 `content/products/manual-review-worklist.json` 执行 68 项分组人工审核：先统一完成 31 项真机/响应式/无障碍检查，再完成 25 项 Notes/练习的独立学科、双语、权利/相似度检查，最后完成 12 项真实学生理解度与用时标定；每项先生成当前源指纹审核包，再把 owner role、适任审核者、独立性、日期、结论、attestation 与证据 SHA 写入 `verification/reviews/` 决定账本，重建发布门后确认旧决定没有被当前版本误用；
- 建立内容发布的双人复核与回滚；`pnpm verify:content-release-readiness` 必须保持通过，且封闭 Beta 目标产品不能再有待处理人工阻塞项；
- 第一方漏斗已经只记录选择考试、完成档案、开始/完成练习、主动打开冰冰和邀请码成功；随机 Journey ID 仅存在当前浏览器 session，不连接账号、Learner Space、邮箱、IP、设备、课程或答案。生产仍要部署 migration、安排 90 天清理并只开放聚合报表。

## 5. 建议的四个发布切片

| 切片 | 可验证结果 | 严格出口 |
| --- | --- | --- |
| A. 生产账户 | 真实邮箱注册、登录、重置、退出、邀请码核销 | P0-01 全绿 |
| B. 私密数据 | 已通过本地事务/RLS；生产跨设备恢复和故障重试通过 | P0-02 生产证据全绿 |
| C. 权利与真实资料 | 隐私/删除/导出可用；邀请码解锁真实终审资产 | P0-03、P0-05 全绿 |
| D. 发布运营 | CI/本地恢复与容量已通过；staging/production、真实监控和平台恢复完成 | P0-04 + 响应式 UAT 全绿 |

四个切片完成后才进入 100 人封闭 Beta。多考试全量题库和成熟 Benchmark/AI 解读可以继续迭代，但不能用来延迟以上生产底座，也不能在样本不足时提前给出伪精确结论。

## 6. 安全验证基线

应用安全验证采用 OWASP ASVS 作为技术控制清单基线；ASVS 提供可测试的 Web 应用安全要求，可用于把“安全”转换成独立 Agent 能执行的验证项。参考：https://owasp.org/www-project-application-security-verification-standard/

上线判断只由证据改变：页面文案、演示数据或“已经写了表结构”都不能把门禁从 incomplete 改成 verified。
