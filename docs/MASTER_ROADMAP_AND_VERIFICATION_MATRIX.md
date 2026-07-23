# 总路线图与验证矩阵

**状态：** 生效
**日期：** 2026-07-19
**目标：** 让每次开发同时回答“离完整产品更近了吗”和“如何独立证明它没有偏离架构”。

## 1. 发布原则

路线图采用纵向闭环，不按“先把所有题做完，再做账户，再做数据”横向堆积。第一个 Reference Journey 就必须展示内容、练习、事件、结果和数据边界；后续再把临时适配器替换为生产级身份、存储与授权。

任何阶段只有在以下四项都满足时才算完成：

1. 用户能完成该阶段声明的真实旅程；
2. 产生的数据符合产品宪章与系统架构；
3. 自动化验证可以由独立 Agent 从干净环境运行；
4. README、规格、决策和当前状态同步。

## 2. 路线阶段

### Phase 0 — 母架构与开发护栏

**成果：** 产品宪章、模块边界、核心领域契约、架构依赖测试和统一验证命令。
**用户价值：** 间接；确保后续功能不会把题库原型错误地固化成系统架构。
**发布门：** V0、V1、V5 全绿。

### Phase 1 — TMUA Reference Journey

**旅程：** 学生进入 Learner Space → 开始 TMUA 2023 Paper 1 → 作答/标记/恢复 → 提交 → 查看基于本次证据的结果 → 在本人学习记录回看历史。
**成果：** 20 道已核验题、75 分钟会话、学习事件、版本化本地仓储、结果投影、暖纸招生简章风响应式界面、数据边界提示。
**边界：** 首次可体验版本允许本地存储，但领域事件必须携带 Learner Space；不得宣称已实现生产多租户。
**发布门：** V0、V1、V2-local、V3、V4-responsive/accessibility。

**当前状态：** 本地预览闭环已于 2026-07-13 实现；生产发布仍受 Phase 2 身份、RLS、授权和安全门约束。

### Phase 1B — 多考试首页与 TMUA 信任阶梯

**旅程：** 学生在首屏识别 TMUA/ESAT/TARA/LNAT/UCAT → 填写不含联系方式的本地课程信息 → 查看知识覆盖 → 完成不消耗历年真题的 30 分钟起点诊断 → 免费理解自身事实型证据 → 自主选择真题、模考或资料。
**成果：** 满托统一品牌、五考试入口、TMUA 分阶段独立页面、18 套/360 题完整资料档案、本地 Guest Space、首版确定性课程映射、8 道经验证原创诊断题、免费基础报告、UAT-UK 2027 TMUA 专业要求注册表。
**边界：** 首版不输出官方 1–9 分、百分位、录取概率或精确训练小时；Guest Space 只在当前设备，不能用于生产匿名追踪。
**发布门：** 品牌/文案契约、原创题发布门、Guest 恢复、诊断结果诚实性、申请年度/来源验证、响应式与无障碍。

**当前状态：** Slice A/B 已于 2026-07-13 交付：多考试首页、96 路径/46 canonical source manifest、18 套试卷/360 道题目目录和诚实资料馆已完成。2026-07-14 又完成证据安全计时、本地 Guest Space 隔离、CAIE/Pearson 精确课程信息、首版零 Token 知识覆盖映射，以及“公开介绍 → 课程信息 → 知识覆盖 → 个人准备首页”的独立页面流程。2026-07-17，全部 18 套、360 道真题完成原生逐题排版并接入 75 分钟在线会话；公式使用 KaTeX、图形使用仓库内安全 SVG，公开完整原卷 PDF 已全部移除。历年真题改为九个年份卡片、Paper 1/2 直接进入练习；全站导航按当前考试切换。ESAT 已加入覆盖四所院校、56 项 2027 UCAS 专业要求的本地确定性模块选择器，并完成“专业/模块 → A-Level/IAL、IB、AP 课程 → 知识单元覆盖初判 → 个人准备 → 真题/模考与笔记入口”的独立路由。官方 Content Specification 的 50 个一级知识单元已经版本化保存，页面可逐项列出已覆盖、需要确认和需要补充的中英文知识缺口。该覆盖层仍是保守的课程范围初判，不是具体考试局逐条规格核验或能力诊断。39 份官方 ESAT 文件已全部进入内部研究归档并完成本地路径、文件大小与 SHA-256 校验，但 0 份获准公开发布，仍等待书面权利确认。官方资料采用本地 provenance registry 与权利门，不复制未获商业使用许可的文件。Mathematics 1、Mathematics 2、Physics、Chemistry、Biology 五个模块现各有 10 道短诊断和一套 27 题/40 分钟满托原创完整模考，并按学生专业筛选后接入作答、保存、提交、事实型结果和纠错链路；五套完整模考分别覆盖 M1–M7、MM1–MM8、P1–P7、C1–C17 与 B1–B11，只报告事实型原始结果，不伪造官方 1–9 分。ESAT 原创在线题现合计 185 道。数学 Notes 覆盖 15 个一级单元，理化生 Notes 按专业覆盖另外 35 个一级单元，五模块的顶层练习和复习入口均已完整。数学 10 页与理科 16 页 A4 下载版已经由同一 JSON 生成并完成全页渲染检查；独立学科终审、细颗粒章节和正式诊断报告仍待实施。TMUA 覆盖报告也已升级为中英文教师建议。

2026-07-19，TMUA 课程档案进一步补齐 IB Mathematics AA/AI 的 SL/HL 与 AP Precalculus、Calculus AB/BC。学生选择实际完成单元，固定映射分别给出直接覆盖、需要确认和未显示覆盖；IB AI 与计算器主导内容保持保守迁移判断，AP Calculus 不被当作 Algebra II、Geometry 或 Paper 2 formal logic 的替代证据。相同枚举已进入受认证 Supabase RPC，并通过本地真实 HTTP 保存验证。课程来源另有独立 registry：两份 AP CED 已保存到内部 raw workspace 并通过 PDF header、字节数和 SHA-256 验证；两份 IB 2021 subject brief 的官方内容已核对，但源站对自动下载返回 403，所以明确登记为 origin-blocked，不把链接冒充本地资产。

### Phase 2 — 私密账户与授权协作

**旅程：** 学生注册/登录 → 数据跨设备保存 → 分别授权老师查看、批注、制定计划或布置练习 → 查看审计并撤销。
**成果：** PostgreSQL、身份、RLS、Grant、审计、老师/家长协作视图、数据导出与删除。
**发布门：** 跨租户负面测试、权限组合测试、撤销时效、备份恢复、安全审查。任何真实学生数据进入系统前必须完成本阶段生产门。

**当前状态：** Slice 2A 本地底座和学习数据适配器已于 2026-07-18 完成：Supabase Auth、邀请码预检与原子核销、内容 entitlement、`app_users`/`learner_spaces`、RLS、追加式事件约束，以及邀请码优先的注册/登录页面已经接通。登录后，课程档案、会话快照和事件由 auth-aware adapter 写入本人 Learner Space；Guest claim、快照更新和缺失事件追加采用受认证事务，成功后清除未隔离的本地副本。2026-07-19 又加入五考试私密学习记录：匿名设备保留最近 30 份验证过的完整会话快照，登录后归入本人 Learner Space；学生可以按考试回看练习频率、活跃用时、改答、原始结果、模块、147 个双语知识主题和历史结果。该读模型不生成官方换算分或伪 Benchmark。TARA、LNAT、UCAT 又加入按考试隔离的最小学生背景档案；保存后先进入逐模块、零 Token 的起点定位页，明确列出可迁移课程、具体中英文缺口、第一轮建议时间和对应短诊断，再由学生进入免费在线练习。练习路由先解析试卷所属考试，不再把非 TMUA 学生送入 TMUA 数学档案。学生隐私页、本人 JSON 导出、密码二次验证后的账号删除，以及题目级站内纠错/技术反馈也已接入；反馈使用确定性分级、本人 RLS、重复提交去重与私有处理审计。满托转化漏斗现在也有独立实现，只匿名统计选择考试、完成档案、开始/完成练习、主动打开冰冰与邀请码成功，不连接账号或 Learner Space，不保存课程、答案、联系方式、IP 或自由文本；service-role 可另行授予、撤销 `product_funnel_viewer`，批准账号通过 `/operations/funnel` 只读取按考试和固定阶段汇总的 7/30/90 天数量，不会取得邀请码运营或学习数据权限。真实私有资料已经扩展为 `TMUA 六周精确训练计划` 与 `Early Specimen Paper 1 逐题深度解析`；后者在修复 12 道旧转录错误并逐页视觉核验后，通过服务端向有权限账号交付 20 道结构化解析。邀请码签发现在还要求每个 package 具有至少一项真实 published entitled 资源，草稿占位包在数据库事务层直接失败。238 项 pgTAP 数据库测试和真实本地 HTTP 流程已证明考试档案隔离、匿名漏斗追加、聚合看板独立授权/撤销与普通学生拒绝、幂等重放、第二账号隔离、导出与级联删除、反馈分诊审计、草稿包拒绝签发，以及两项资料的未授权、授权和撤销状态。账号入口又加入失败关闭的 Turnstile 契约：注册、登录和重置都会传递一次性 token，staging/production 缺少 site key 时停止提交，Supabase 发布工作流可通过 Management API 写入 secret 并复核 provider。云端项目绑定、真实 SMTP/域名/Turnstile key 的执行证据、备份恢复、最终法定隐私信息/人工权利流程、反馈负责人/生产告警、生产角色 bootstrap、邀请码与转化看板真机验收仍未完成，所以 Phase 2 仍是 partial。

**运营权限更新：** 当前整套 238 项 pgTAP 包含邀请运营、匿名转化看板、学生协作及其相互独立的权限验证。冰冰账号可由 service-role 显式授予和撤销邀请运营能力，只能选择具有已发布真实资料的 package、签发有限期代码、查看与撤销本人代码及本人审计；普通学生、第二运营者、草稿包、私有表与学生 Learner Space 均保持拒绝。创始人/受批准运维另有仅 service-role 可调用的限时、限量全局邀请审计，仍不包含明文邀请码或学生身份。`/operations/invites` 本人队列已经接入账号二次角色校验、已发布资料选择、有限签发、一次性明文、状态统计、本人审计和带原因撤销；另一项独立 `product_funnel_viewer` capability 只开启 `/operations/funnel` 的匿名聚合数，不会相互继承权限。数据库、服务、页面与响应式契约已覆盖普通学生拒绝、授权、7/30/90 天筛选和撤销；生产账号 bootstrap、MFA、真实域名演练与多设备人工验收仍待执行。

**学生 Grant 更新：** 本地切片已经关闭老师/家长 Grant 及协作视图缺口。`/account/sharing`、`/collaboration/redeem`、`/collaboration` 和 `/collaboration/:grantId` 已接入一次性协作码、老师/家长两类对象、五项独立 scope、考试/有效期过滤、审计和即时撤销。学生数据导出升级为 schema v4；内容 entitlement、冰冰运营权和漏斗查看权都不隐含学习数据权。当前整套数据库验证为 238 项，其中 44 项专门覆盖协作 Grant。未关闭的是云端部署、双账号 MFA/真域名演练和真实设备/无障碍 UAT，因此 Phase 2 仍是 partial。

### Phase 3 — 内容 Commons 与完整 TMUA

**旅程：** 贡献者提交或修订题目 → 自动检查 → 人工复核 → 发布内容 revision → 学生选择更多 TMUA 练习。
**成果：** 全量资料清单、past papers、许可/来源记录、去重、题目维护工具、贡献工作流和发布版本。
**发布门：** 文件不可变验证、schema、答案完整性、来源路径安全、双人复核抽样、内容 revision 回归。

### Phase 4 — 公平 Benchmark 与付费 AI 解读

**旅程：** 学生积累合格数据 → 查看带样本与置信信息的相对位置和训练时间区间 → 自愿购买深度 AI 解读。
**成果：** cohort 规则、资格过滤、Benchmark 快照、AI Gateway、模型/提示/成本审计、计费权益和解释报告。
**发布门：** 最小样本、重识别检查、统计复核、模型回归、Token/成本上限、授权与删除传播、付费前后权益测试。

### Phase 5 — 外部平台、Agent 与多考试扩展

**旅程：** 学生授权飞书、Hermes/OpenClaw 或其他 Agent 执行指定任务；学生在同一 Learner Space 准备 ESAT、TARA、LNAT、UCAT。
**成果：** OpenAPI、Webhook、MCP 工具、短时授权、集成审计、通用考试/内容模型。
**发布门：** scope 收敛、重放/撤销测试、外部动作幂等、速率与预算、跨考试数据隔离、集成降级。

## 3. 目标—模块—证据矩阵

| 产品目标 | 主模块 | 首个可见成果 | 独立验证证据 | 阶段 |
| --- | --- | --- | --- | --- |
| 迅速体验好用 | Practice + Web | 首页一键进入真实 20 题 | 首题时间、E2E、响应式截图 | 1 |
| 第一次访问先建立安全感 | Web + Practice + Admissions Registry | 五考试入口、课程定位、可完成的推荐动作 | 首屏识别、Guest Journey、无点击死路 | 1B |
| 查清院校和专业要求 | Admissions Registry | 2027 TMUA 官方专业清单 | 来源、申请年度、revision 和过期测试 | 1B–5 |
| 不浪费真题完成诊断 | Content Commons + Practice | 原创体验题和诊断题 | 蓝图、答案、独立审核和发布状态 | 1B–3 |
| 记录所有有意义动作 | Event Ledger | 作答/修改/停留/标记/提交事件 | reducer/event schema/恢复测试 | 0–1 |
| 让学生看懂自己的真实积累 | Learning Record Projection | 五考试频率、时间、改答、模块、双语知识主题和历史结果 | `pnpm verify:learning-record` + 三视口 E2E | 1–2 |
| 学生数据高度私密 | Learner Space + Consent | 明确归属，本地版数据提示 | 本地 Supabase RLS 与跨租户负面测试；后续云端安全门 | 1–2 |
| 老师/家长分别授权 | Consent & Grants | Scope 模型和授权界面 | 权限组合与撤销测试 | 0–2 |
| 衡量训练时间 | Projection + Benchmark | 个人会话时间；后续区间估计 | 时间确定性；cohort/置信度统计复核 | 1–4 |
| 题目易维护 | Content Commons | 20 题 typed content 与验证器 | schema、来源、答案、revision 测试 | 1–3 |
| 开放共建 | Content Commons | 贡献规则和审核轨迹 | license/source/审核发布门 | 3 |
| AI 接口可定义 | AI Gateway | 稳定 `AIJob` 契约 | provider contract、预算、版本审计 | 0–4 |
| Token 更值钱 | Projection + AI | 使用结构化投影而非原始堆料 | 上下文选择、成本与输出质量回归 | 4 |
| 为满托自然引流 | Mantou Bridge | 发起者身份与自愿服务入口 | 免费旅程不阻断、转化事件合规检查 | 1–4 |
| 飞书/Agent 接入 | Integration Gateway | scope 化工具契约 | 授权、重放、幂等、审计 | 5 |
| 手机/iPad/电脑适配 | Web client | 同一练习旅程多布局 | 视口矩阵、触控、键盘、a11y | 1 |
| Agent 开发不漂移 | Validation System | 架构测试和统一门禁 | 干净环境一键验证、文档同步检查 | 0–5 |

### 资料产品与 100 人 Beta 门禁（2026-07-18）

全站已增加版本化资料产品注册表与统一学习资料馆。TMUA、ESAT、TARA、LNAT、UCAT 不再各自定义“资料是否上线”；每项产品记录独立版本、核验日期、访问方式、真实权限包、内部路由、权利基础和可运行证据，`internal-review` 默认不可见。当前有 40 项学生可打开产品和 1 项内部组合 Notes 蓝图，按“了解考试 → 完成本人定位 → 在线练习 → 复习与深度解析”自动排序；35 个不同产品路由会逐一运行时加载，23 项原生练习统一要求先完成不含联系方式的本人档案。所有 `content/` 文件还必须且只能进入产品来源、内部蓝图、研究、规范化暂存、平台模型、Schema、文档或发布控制生命周期，`pnpm verify:product-lineage` 会阻止“有文件、无产品归属”。TMUA 已加入 8 道/30 分钟原创起点诊断，不消耗历年真题，并复用计时、保存、提交、事实型结果和学习记录链路；`TMUA 六周精确训练计划` 与 `Early Specimen Paper 1 逐题深度解析` 已通过 invite-bound 发布门并同时进入公开产品目录：正文不进入前端 bundle，由后端根据当前账号 entitlement 交付，学生入口不再把尚未发布的完整模考作为邀请码利益点。ESAT 已加入五模块、50 道原创原生 teaching preview、五套各 27 题/40 分钟的完整模考，以及覆盖全部 50 个一级单元的数学和理化生 Review Notes；TARA 已加入 10 道原创推理短诊断、Critical Thinking 与 Problem Solving 各 22 题/40 分钟的完整模考、3 道 Writing Task 题，以及 4 模块/21 单元推理与写作 Notes，合计 54 道原创在线推理题；LNAT 已加入 3 篇/12 道 Section A 短诊断、12 篇/42 道/95 分钟完整结构模考、3 道 Section B 和 4 模块/21 单元论证阅读与写作 Notes，Section A 合计 54 道原创在线题；UCAT 已加入四模块短诊断与四套完整结构模考：11 篇/44 题/22 分钟 Verbal Reasoning、35 题/37 分钟 Decision Making、9 组数据/36 题/26 分钟 Quantitative Reasoning、21 情境/69 题/26 分钟 Situational Judgement，以及 5 模块/25 单元四模块与工具节奏 Notes，合计 224 道原创在线题。上述 Notes 都必须先完成专业计划或相应考试本人档案。TARA/LNAT 写作共用私密自动保存编辑器并明确不生成自动分数；LNAT/UCAT 阅读复用响应式左文右题模型，UCAT QR 有数据表与基础计算器，DM 有完整五陈述交互和 2/1/0 原始分，SJT 等级题有相邻 0.5 部分得分、Most/Least 使用精确配对原始分。功能证据另见各考试 Review Notes 与 practice manifest。

100 人封闭 Beta 的独立评估保存在 `content/platform/beta-100-readiness.json`，当前发布准备度为 **78/100，not-ready**。账号生命周期、本地验证过的私密学习数据事务、五考试学习记录与历史结果、保存失败重试与提交持久化门、本人导出/删除、站内反馈隔离与审计、两项真实 invite-bound asset、产品目录驱动的核销成功/账号资料入口、独立且可撤销的匿名转化聚合看板、TMUA 的 CAIE/Pearson/IB/AP 版本化零 Token 定位与 8 道/30 分钟原创起点诊断、ESAT 五模块 50 道原创短诊断、五套各 27 题/40 分钟完整模考及 50 个一级单元 Notes、TARA 54 道推理题（含两套 22 题完整模块）/写作及 21 单元 Notes、LNAT 54 道 Section A 原创题（含 12 篇/42 题/95 分钟完整结构模考）/Section B 写作及 21 单元 Notes、UCAT 四模块 224 道原创练习（含 VR 44 题、DM 35 题、QR 36 题与 SJT 69 题全卷）及 25 单元 Notes、不可变发布镜像、本地全数据库恢复、100 用户容量和每日两次真实 URL 冒烟验证契约已经接通；`pnpm beta:audit` 输出非阻断审计，`pnpm beta:gate` 在生产身份与邮件、学习数据生产部署/跨设备恢复、未成年人最终隐私/运营权利流程、entitlement 生产部署、平台恢复和真实监控等 P0 全部验证前保持失败。逐产品发布审计同时给出更细的内容判断：40/40 个公开产品的自动证据通过，但 0/40 完成学科、双语、权利/相似度、真机或真实学生标定等人工签字，因此不能把“页面可体验”误报成“内容可进入封闭 Beta”。68 个去重审核任务已经形成固定工作清单，分为 25 项学科/双语/权利、12 项学生理解度/用时标定和 31 项设备/无障碍验收，并绑定责任角色、产品版本、全部路由、证据要求、源文件数量和当前 SHA-256 指纹。审核包、隐私安全的角色引用、独立性、结论、attestation 与证据哈希已经形成可执行账本；内容变化会让旧决定自动失效，但不会伪造任何人工通过，所以当前数量仍诚实保持 0/40。真实 URL 尚未配置，所以冒烟 workflow 目前只证明可执行契约，不是线上运行证据。详细判断与四个发布切片见 `docs/BETA_100_LAUNCH_READINESS.md`。

**2026-07-19.57 更新：** 上段 78/100 为上一评估 revision；学生 Grant 切片通过本地验证后，当前机器计算为 **80/100，not-ready**。生产 P0 没有因此自动关闭。

**2026-07-19.58 更新：** 私有内容审核台和 server-only 当前队列同步已进入本地验证；它只把 68 项人工任务变成可执行工作流，不代替真实签字。人工发布门仍为 0/40，生产队列与 MFA 审核账号仍待配置，因此维持 **80/100，not-ready**。

## 4. 验证矩阵

| Gate | 自动化范围 | 当前/目标命令 | 阻断级别 |
| --- | --- | --- | --- |
| G0 Package | Node/pnpm/脚本和锁文件契约 | `pnpm test -- tests/package-contract.test.ts` | P0 |
| G1 Types | 严格 TypeScript | `pnpm typecheck` | P0 |
| G2 Unit | 领域 reducer、授权、事件、投影、计时 | `pnpm test -- tests/features tests/platform` | P0 |
| G3 Content | schema、题数、答案、来源和 revision | `pnpm verify:tmua-corpus` + content tests | P0 |
| G3a Document import | MinerU 输出规范化、页码/坐标、不可发布边界 | `pnpm verify:content-imports` | P0 |
| G3b Extraction | PDF 页级证据、题目 bundle、答案/解析关联、非发布边界 | `pnpm verify:tmua-extractions` | P0 |
| G3c Online papers | 18 套来源/答案、360 题运行时契约、原生题禁用完整 PDF、公式与 SVG 资源策略 | `pnpm verify:tmua-online-papers` | P0 |
| G3e Manual review ledger | 当前源指纹、owner role、审核者独立性、证据 SHA、stale/changes-requested 失败关闭 | `pnpm verify:manual-review-ledger` + `pnpm verify:content-release-readiness` | P0 |
| G3d Curriculum provenance | IB/AP 课程版本、资格关联、下载状态、权利边界与本地哈希 | `pnpm verify:curriculum-sources` + 内部 `pnpm verify:curriculum-files` | P0 |
| G3d Official content rights | `discovered`、`downloaded`、`publishable` 独立数量，许可状态和发布门 | ESAT source inventory tests + 法务/权利书面确认 | 生产 P0 |
| G4 Architecture | 禁止依赖、模块公开 API、私密/公开域隔离 | `pnpm verify:architecture` | P0 |
| G4b Feature claims | 机器可读用户结果、证据路径、命令与限制 | `pnpm verify:features` | P0 |
| G4c Supabase static | RLS 开启、服务端函数权限、认证与密钥边界 | `pnpm verify:supabase-contracts` | P0 |
| G5 Integration | 存储、RLS、真实 HTTP 邀请码/登录/核销链路 | `pnpm verify:supabase`；后续扩展 AI/Webhook/MCP | P0 |
| G5a Learning record | 完整历史快照、Guest claim、结果回看、考试隔离、双语标签全集 | `pnpm verify:learning-record` + `pnpm verify:e2e` | P0 |
| G5b Production platform | 不可变镜像、runtime config、安全头、CI、首屏/异步资源预算、全数据库恢复与 100 用户容量；生产预检只读核对 GitHub Environment、secret 名称、公开 origin、审批人与 pushed SHA | `pnpm verify:production-platform` + `pnpm verify:production-bootstrap` + `pnpm production:preflight` + 恢复/容量命令 | 生产 P0 |
| G6 Journey | 开始、恢复、提交、结果、授权闭环 | 分阶段加入 `pnpm test:e2e` | P0 |
| G7 UI Quality | 无障碍、手机/iPad/桌面、reduced motion | Chromium 三视口 Playwright 关键旅程已接入 CI；真实设备 + 键盘/屏幕阅读器/reduced-motion 人工评审仍待完成 | P1；关键动作 P0 |
| G8 Security/Privacy | 越权、撤销、密钥、日志、导出/删除 | 安全套件 + 威胁模型复核 | 生产 P0 |
| G9 Build | 可重复生产构建 | `pnpm build` | P0 |
| G9b Deployment | 实际域名健康、版本和安全头 | `pnpm verify:deployment` | 生产 P0 |
| G10 Docs | 上位契约、规格、路线图和状态一致 | 评审 checklist；后续自动链接检查 | P1；架构变更 P0 |

`P0` 失败禁止合并或发布；`P1` 必须在当前里程碑解决；`P2` 可以记录并排期但不能伪装成完成。

## 5. 当前进度基线（2026-07-17）

| 工作流 | 状态 | 证据 | 尚欠 |
| --- | --- | --- | --- |
| 母产品契约 | 已建立并进入自动执行 | 产品宪章、系统架构、路线图、`pnpm verify:architecture` | 后续模块加入时持续扩展禁止依赖规则 |
| TMUA 原始资料 | 18 papers / 360 题均已原生结构化并可在线练习 | `content/tmua/online-papers.json`、18 套 typed content、KaTeX/SVG、`pnpm verify:tmua-online-papers` | 逐题解析、知识标签精修与生产私有内容交付 |
| Content tooling | inventory、官方补充、PDF 题目提取、MinerU 稳定 JSON 规范化与独立 gate 已完成 | `src/content/tmua/`、`src/content/imports/`、schemas、CLI tests、2022 Paper 1 staging bundle | 真实资料 MinerU 对比试点、公式/图形审核工作台、贡献审核、许可治理和发布后台 |
| Asset → Product lifecycle | 40 项可用产品、1 项内部组合 Notes 蓝图与全部 content 文件的唯一生命周期归属已建立 | `content/products/catalog.json`、`asset-lifecycle.json`、`pnpm verify:product-lineage` | CMS/运营后台、双人内容发布审批和生产指标 |
| Product release readiness | 41 项产品逐项连接一个主 feature manifest；40/40 公开产品自动证据通过，0/40 完成人工审核门；68 个待审组已按三类活动去重，绑定角色、版本、路由、源文件指纹和证据要求；独立 `/operations/content-review` 审核台可由 server-only 同步当前队列、按考试/活动筛选、打开真实产品并下载未签署审核包，但没有浏览器批准能力；决定账本仍会拒绝 stale、changes-requested 或证据被改写的结论 | `content/products/release-readiness.json`、`manual-review-worklist.json`、`verification/reviews/`、`verification/features/content-review-operations-workbench.yaml`、`pnpm verify:content-review-operations`、`pnpm verify:manual-review-ledger`、`pnpm verify:content-release-readiness` | 在生产同步当前队列并为 MFA 审核账号授予独立权限；由真实责任人完成 25 项学科/双语/权利、12 项学生标定、31 项真机/无障碍审核并记录决定 |
| 官方教研资料底座 | 23 个官方页面、184 份 PDF/RTF 已进入本地内部研究快照 | research inventory、SHA-256、本机校验命令、权利状态与 Git-ignore 边界 | UAT/UCAT 商业使用书面许可、年度更新审计、互动题库的原创替代方案 |
| 中国学生复习 Notes | TMUA Foundations v2 的 7 章已可在线阅读并下载 25 页 A4 PDF；ESAT、TARA、LNAT、UCAT 五套网页教学预览也已有同源 79 页 A4 下载版，覆盖 50 + 21 + 21 + 25 个顶层单元 | 六套版本化 JSON、通用 Review Notes validator/renderer/PDF generator、课程桥接、TMUA 9 + ESAT 5 + TARA 4 + LNAT 4 + UCAT 5 道原创例题、主动回忆、独立页面、PDF 资产 manifest、嵌入字体许可与测试 | 独立学科/医疗专业/相似度/双语/实机终审；细颗粒章节；写作 rubric 和人工反馈 |
| Reference content | TMUA 18 套、360 题已完成原生排版；Specimen P1 完成逐页题面复核与 20 道深度解析；基础 Notes 首版已接入 | typed content、来源页、答案序列、题面基准、服务端解析 payload、SVG 安全测试 | 其余 17 套逐题解析、教师复核工作台与完整 Review Notes 系列 |
| Reference Journey Web | 本地预览闭环、多考试前门、上下文导航、23 套原生在线练习和邀请码账户页面已完成 | 五考试首页、九个 TMUA 年份卡片、360 题可作答与评分、ESAT 185 道原创题、TARA 54 道推理题与写作、LNAT 54 道 Section A 原创题与 Section B、UCAT 四模块 224 题（含 VR、DM、QR、SJT 全卷）；Specimen P1 结果按产品目录显示真实解析、冰冰/邀请码双入口，并在核销后安全返回原结果；视口与 a11y 契约 | 云端身份、正式邮件、entitlement 撤销复验和服务端练习持久化后再收集真实数据 |
| 多考试免费练习内核 | 共享会话和五考试适配层已交付；客观题、文章题、数据表题、陈述组题、等级部分得分题、Most/Least 配对题和 TARA/LNAT 三选一写作都进入同一原生会话 | 五考试结构 registry、动态题量/时长、文章/数据引用模型、响应式 table block、基础计算器、DM 2/1/0、SJT 等级相邻 0.5 与 Most/Least 精确配对、TARA 两套 22 题完整推理模块、LNAT 12 篇/42 题完整结构 Section A、UCAT 11 篇/44 题完整 VR、35 题完整 DM、9 组数据/36 题完整 QR 与 21 情境/69 题完整 SJT、私密写作快照、事实型结果、免费/增值权限测试 | 原创内容独立终审、写作 rubric/教师标定/人工反馈，正式 UCAT 尺度分/Band 不在教学预览范围 |
| ESAT 定位与课程覆盖 | 2027 本地规则、多志愿求解器、A-Level/IAL/IB/AP 课程表单和模块覆盖初判已交付 | 4 所院校、56 项 UCAS 专业要求、确定/可选/冲突组合、课程存储和覆盖状态测试 | 具体考试局/科目版本、全量知识点映射、能力诊断、年度更新工作流 |
| ESAT 内容 | 39 份官方研究原件已本地归档并逐项通过大小/SHA 校验，0 份获准公开；五模块已有原创 50 题原生 teaching preview，并各有 27 题/40 分钟完整模考，分别覆盖 M1–M7、MM1–MM8、P1–P7、C1–C17 与 B1–B11，合计 185 道原创在线题；数学与理化生已有覆盖全部 50 个一级单元的 Review Notes 网页与 26 页 A4 教学预览 | source inventory builder/verify、公开安全摘要、十份原创题 JSON、两份 Notes JSON/validator/站内页面与同源 PDF、答案序列、产品注册表、专业筛选入口、组件测试、三端 E2E 与权利风险评估 | 五模块独立教研、术语与多设备终审，Notes 细颗粒章节与官方资料书面许可 |
| Private Account / Entitlement | Slice 2A、本地数据权利、反馈、考试档案、匿名漏斗/看板、学生逐项 Grant、两项真实资料、冰冰运营角色和 Turnstile 契约通过 | Supabase migration、受认证 RPC、一次性协作码、schema-v4 导出、238 项 pgTAP、组件与现有真实 HTTP gate | 云项目、SMTP/Turnstile、生产角色/MFA bootstrap、学生+协作者双账号真机 UAT、备份、告警和隐私运营 |
| Feedback / Content correction | 题目级入口、本人回执、确定性 P1-P4、去重、PII 拒收、RLS 与私有审计已本地验证 | `pnpm verify:feedback`、16 项专项 pgTAP、真实 HTTP 双账号/分诊、独立运行手册 | 指定主/备负责人，接入 P1/P2 告警，在 staging 演练隐私、登录和来源纠错 |
| Learner Space / Events | auth-aware 适配器、考试档案、事务仓储、五考试学习记录和授权投影已在本地实现 | Guest claim、按 exam 分区、稳定 ID、事件幂等、本机历史、RLS 跨租户与 Grant 负面测试、三视口布局契约 | 云端 migration、生产跨设备恢复、双账号真机/无障碍 UAT |
| Production platform | 不可变 Web 镜像、runtime config、Caddy/TLS 编排、GitHub CI/发布/Supabase 部署工作流、Turnstile 失败关闭与自动配置、本地全库恢复与 100 用户容量已验证；只读 preflight 将 GitHub setup、release candidate 与最终 Beta 明确分离；默认 dry-run、显式确认、secret 只经 stdin 的 apply 可重复配置 GitHub 控制面 | 非 root/只读容器、健康/版本/安全头、Auth protection contract、生产 bootstrap requirement/plan/apply 专项测试、反馈恢复指纹、100 用户并发 10 完成反馈且最近 p50 24ms、p95 62ms、最大 103ms；真实 preflight 确认两套 GitHub Environment 已创建，但八个 secret、两个公开 origin 和 production reviewer 尚未配置 | 准备真实输入后执行 apply，创建 staging/production Supabase 云项目，配置正式域名、SMTP/Turnstile、平台恢复、外部监控与真实接收人 |
| Consent / Grants | 持久 Grant、一次性兑换、学生管理、老师/家长工作区、审计和导出已在本地实现 | `pnpm verify:collaboration`、44 项专项 pgTAP、五 scope/考试/有效期/立即撤销测试 | 生产 migration、MFA 双账号演练、真机/屏幕阅读器 UAT；Agent 仍未接入 |
| Benchmark / AI / Integrations | AI Job 核心契约已实现 | 投影引用、预算、委托授权和禁止 secret 校验 | Provider 适配器、Benchmark 与外部集成 |
| 品牌与完整准备旅程 | 分阶段页面、CAIE/Pearson/IB/AP 课程映射、TMUA 30 分钟起点诊断、三项逐模块起点定位与五考试顶层 Notes/下载版已交付 | 多考试首页、实际课程单元优先流程、零 Token 覆盖/起点报告、原创诊断、个人准备首页、独立资料馆与资料入口、Guest/Learner Space 隔离 | 完整长度模考、诊断教师复核与学生标定、Notes 细颗粒章节、真实数据校准报告与年度院校注册表 |

## 6. 既有局部方案的归属

- `docs/superpowers/specs/2026-07-12-tmua-content-corpus-design.md` 和对应 Phase 1 plan 属于 **Content Commons 工作流**。
- `docs/superpowers/specs/2026-07-13-tmua-2023-paper-1-experience-design.md` 和对应 implementation plan 属于 **Reference Journey 工作流**。
- 局部方案中的 “Excluded” 只表示该工作流当次不交付，不表示这些能力不属于总产品。
- 如果局部设计与产品宪章或系统架构冲突，必须先修订局部设计再开发。

## 7. 接下来三个可验证增量

1. **五考试 Notes 与原创全卷独立终审及细化：** ESAT 50 单元、TARA 21 单元、LNAT 21 单元、UCAT 25 单元的顶层教学预览都已进入通用内容模型，五套同源下载版共 79 页并已完成全页渲染检查；下一步由对应学科/推理/写作/英国医疗与牙科专业、双语和权利相似度审核者完成方法、例题、术语、难度和多设备终审，再沿同一 schema 建设细颗粒章节与写作 rubric。LNAT 的 12 篇/42 题全卷与 UCAT 的 11 篇/44 题 VR、35 题 DM、9 组数据/36 题 QR、21 情境/69 题 SJT 全卷均已进入人工终审门。官方归档只用于范围核对，不越过权利边界。
2. **TMUA Notes 教师终审：** Foundations v2 已补齐数列、几何、三角、指数对数、微积分、函数图像和真题复盘；下一步完成独立学科、相似度、双语术语与响应式终审，再升级 publication revision。
3. **集中关闭产品人工门：** 直接按 `manual-review-worklist.json` 执行 68 个审核组，不再按页面零散“看一遍”。先一次完成 31 项三端真机与无障碍检查，再按考试组织 25 项 Notes/原创题的独立学科、双语、权利/相似度复核，最后完成 12 项真实学生理解度和用时标定；每项用 `review:prepare` 生成当前版本审核包，以 `review:record` 固定角色、独立性、结论、attestation 与证据 SHA，再重建发布报告验证没有遗漏或陈旧签字。
4. **Private Account Slice 2B：** 使用不可变镜像与 GitHub Environment 工作流，把 Supabase/Auth/RLS/entitlement、learner-data 和 collaboration migrations 部署到满托 staging/production，配置正式域名、SMTP、MFA、滥用防护和平台备份；完成生产跨设备恢复、学生+老师/家长双账号 Grant 创建/限权读写/审计/撤销演练、隐私权利、深度解析交付、外部告警和新项目恢复演练。

前两个增量可以作为明确标注“当前设备保存”的本地 Reference Journey 交付，但不得公开收集真实学生的长期私密数据。任何真实用户服务端数据必须等待 Private Account Slice 的生产门。Benchmark、付费 AI 解读和外部 Agent 接入继续依赖真实、合规、经授权的数据基础，不会越过以上生产门提前伪装上线。
