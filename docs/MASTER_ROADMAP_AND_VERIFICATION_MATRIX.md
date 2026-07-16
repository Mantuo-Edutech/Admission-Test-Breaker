# 总路线图与验证矩阵

**状态：** 生效
**日期：** 2026-07-17
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

**旅程：** 学生进入 Learner Space → 开始 TMUA 2023 Paper 1 → 作答/标记/恢复 → 提交 → 查看基于本次证据的结果。
**成果：** 20 道已核验题、75 分钟会话、学习事件、版本化本地仓储、结果投影、暖纸招生简章风响应式界面、数据边界提示。
**边界：** 首次可体验版本允许本地存储，但领域事件必须携带 Learner Space；不得宣称已实现生产多租户。
**发布门：** V0、V1、V2-local、V3、V4-responsive/accessibility。

**当前状态：** 本地预览闭环已于 2026-07-13 实现；生产发布仍受 Phase 2 身份、RLS、授权和安全门约束。

### Phase 1B — 多考试首页与 TMUA 信任阶梯

**旅程：** 学生在首屏识别 TMUA/ESAT/TARA/UCAT → 填写不含联系方式的本地课程信息 → 查看知识覆盖 → 立即完成当前已开放练习 → 免费理解自身证据 → 自主选择真题、模考或资料；30 分钟诊断达到原创题审核门后再加入主路径。
**成果：** 满托统一品牌、四考试入口、TMUA 分阶段独立页面、18 套/360 题完整资料档案、本地 Guest Space、首版确定性课程映射、8 道经验证原创诊断题、免费基础报告、UAT-UK 2027 TMUA 专业要求注册表。
**边界：** 首版不输出官方 1–9 分、百分位、录取概率或精确训练小时；Guest Space 只在当前设备，不能用于生产匿名追踪。
**发布门：** 品牌/文案契约、原创题发布门、Guest 恢复、诊断结果诚实性、申请年度/来源验证、响应式与无障碍。

**当前状态：** Slice A/B 已于 2026-07-13 交付：多考试首页、96 路径/46 canonical source manifest、18 套试卷/360 道题目目录和诚实资料馆已完成。2026-07-14 又完成证据安全计时、本地 Guest Space 隔离、CAIE/Pearson 精确课程信息、首版零 Token 知识覆盖映射，以及“公开介绍 → 课程信息 → 知识覆盖 → 个人准备首页”的独立页面流程。2026-07-17，全部 18 套真题均已接入 75 分钟在线会话：2023 Paper 1 为原生逐题排版，其余 17 套为经过来源哈希和官方答案核验的原卷 PDF + 在线答题卡；360 道均可作答、标记、计时、提交和评分。覆盖报告也升级为中英文教师建议。8 道原创诊断题、正式诊断报告和专业注册表仍待实施。

### Phase 2 — 私密账户与授权协作

**旅程：** 学生注册/登录 → 数据跨设备保存 → 分别授权老师查看、批注、制定计划或布置练习 → 查看审计并撤销。
**成果：** PostgreSQL、身份、RLS、Grant、审计、老师/家长协作视图、数据导出与删除。
**发布门：** 跨租户负面测试、权限组合测试、撤销时效、备份恢复、安全审查。任何真实学生数据进入系统前必须完成本阶段生产门。

**当前状态：** Slice 2A 本地底座已于 2026-07-15 完成：Supabase Auth、邀请码预检与原子核销、内容 entitlement、`app_users`/`learner_spaces`、课程档案/会话/事件表、RLS、追加式事件约束，以及邀请码优先的注册/登录页面已经接通。26 项 pgTAP 数据库测试和真实本地 HTTP 核销验证已通过。云端项目绑定、正式 SMTP/域名、滥用防护、备份恢复、服务端练习仓储、Guest 接管、Grant/审计和协作视图仍未完成，所以 Phase 2 仍是 partial。

### Phase 3 — 内容 Commons 与完整 TMUA

**旅程：** 贡献者提交或修订题目 → 自动检查 → 人工复核 → 发布内容 revision → 学生选择更多 TMUA 练习。
**成果：** 全量资料清单、past papers、许可/来源记录、去重、题目维护工具、贡献工作流和发布版本。
**发布门：** 文件不可变验证、schema、答案完整性、来源路径安全、双人复核抽样、内容 revision 回归。

### Phase 4 — 公平 Benchmark 与付费 AI 解读

**旅程：** 学生积累合格数据 → 查看带样本与置信信息的相对位置和训练时间区间 → 自愿购买深度 AI 解读。
**成果：** cohort 规则、资格过滤、Benchmark 快照、AI Gateway、模型/提示/成本审计、计费权益和解释报告。
**发布门：** 最小样本、重识别检查、统计复核、模型回归、Token/成本上限、授权与删除传播、付费前后权益测试。

### Phase 5 — 外部平台、Agent 与多考试扩展

**旅程：** 学生授权飞书、Hermes/OpenClaw 或其他 Agent 执行指定任务；学生在同一 Learner Space 准备 ESAT、TARA、UCAT。
**成果：** OpenAPI、Webhook、MCP 工具、短时授权、集成审计、通用考试/内容模型。
**发布门：** scope 收敛、重放/撤销测试、外部动作幂等、速率与预算、跨考试数据隔离、集成降级。

## 3. 目标—模块—证据矩阵

| 产品目标 | 主模块 | 首个可见成果 | 独立验证证据 | 阶段 |
| --- | --- | --- | --- | --- |
| 迅速体验好用 | Practice + Web | 首页一键进入真实 20 题 | 首题时间、E2E、响应式截图 | 1 |
| 第一次访问先建立安全感 | Web + Practice + Admissions Registry | 四考试入口、课程定位、可完成的推荐动作 | 首屏识别、Guest Journey、无点击死路 | 1B |
| 查清院校和专业要求 | Admissions Registry | 2027 TMUA 官方专业清单 | 来源、申请年度、revision 和过期测试 | 1B–5 |
| 不浪费真题完成诊断 | Content Commons + Practice | 原创体验题和诊断题 | 蓝图、答案、独立审核和发布状态 | 1B–3 |
| 记录所有有意义动作 | Event Ledger | 作答/修改/停留/标记/提交事件 | reducer/event schema/恢复测试 | 0–1 |
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

## 4. 验证矩阵

| Gate | 自动化范围 | 当前/目标命令 | 阻断级别 |
| --- | --- | --- | --- |
| G0 Package | Node/pnpm/脚本和锁文件契约 | `pnpm test -- tests/package-contract.test.ts` | P0 |
| G1 Types | 严格 TypeScript | `pnpm typecheck` | P0 |
| G2 Unit | 领域 reducer、授权、事件、投影、计时 | `pnpm test -- tests/features tests/platform` | P0 |
| G3 Content | schema、题数、答案、来源和 revision | `pnpm verify:tmua-corpus` + content tests | P0 |
| G3a Document import | MinerU 输出规范化、页码/坐标、不可发布边界 | `pnpm verify:content-imports` | P0 |
| G3b Extraction | PDF 页级证据、题目 bundle、答案/解析关联、非发布边界 | `pnpm verify:tmua-extractions` | P0 |
| G3c Online papers | 18 份原卷字节哈希、页码、官方答案、360 题运行时契约 | `pnpm verify:tmua-online-papers` | P0 |
| G4 Architecture | 禁止依赖、模块公开 API、私密/公开域隔离 | `pnpm verify:architecture` | P0 |
| G4b Feature claims | 机器可读用户结果、证据路径、命令与限制 | `pnpm verify:features` | P0 |
| G4c Supabase static | RLS 开启、服务端函数权限、认证与密钥边界 | `pnpm verify:supabase-contracts` | P0 |
| G5 Integration | 存储、RLS、真实 HTTP 邀请码/登录/核销链路 | `pnpm verify:supabase`；后续扩展 AI/Webhook/MCP | P0 |
| G6 Journey | 开始、恢复、提交、结果、授权闭环 | 分阶段加入 `pnpm test:e2e` | P0 |
| G7 UI Quality | 无障碍、手机/iPad/桌面、reduced motion | 组件测试 + Playwright 视口矩阵 + 人工截图评审 | P1；关键动作 P0 |
| G8 Security/Privacy | 越权、撤销、密钥、日志、导出/删除 | 安全套件 + 威胁模型复核 | 生产 P0 |
| G9 Build | 可重复生产构建 | `pnpm build` | P0 |
| G10 Docs | 上位契约、规格、路线图和状态一致 | 评审 checklist；后续自动链接检查 | P1；架构变更 P0 |

`P0` 失败禁止合并或发布；`P1` 必须在当前里程碑解决；`P2` 可以记录并排期但不能伪装成完成。

## 5. 当前进度基线（2026-07-17）

| 工作流 | 状态 | 证据 | 尚欠 |
| --- | --- | --- | --- |
| 母产品契约 | 已建立并进入自动执行 | 产品宪章、系统架构、路线图、`pnpm verify:architecture` | 后续模块加入时持续扩展禁止依赖规则 |
| TMUA 原始资料 | 18 papers / 360 题均可使用原卷模式在线练习；1 套已原生结构化 | `content/tmua/online-papers.json`、`public/papers/tmua/`、`pnpm verify:tmua-online-papers` | 其余 340 道题的原生结构化、知识标注和解析发布 |
| Content tooling | inventory、官方补充、PDF 题目提取、MinerU 稳定 JSON 规范化与独立 gate 已完成 | `src/content/tmua/`、`src/content/imports/`、schemas、CLI tests、2022 Paper 1 staging bundle | 真实资料 MinerU 对比试点、公式/图形审核工作台、贡献审核、许可治理和发布后台 |
| Reference content | TMUA 2023 Paper 1 共 20 题已人工核验 | `src/features/practice/content/tmua-2023-p1.ts` | 后续解释和更多试卷 |
| Reference Journey Web | 本地预览闭环、多考试前门、18 套在线真题和邀请码账户页面已完成 | 四考试首页、TMUA 中心、360 题可作答与评分、邀请码/注册/登录；视口与 a11y 契约 | 云端身份、正式邮件和服务端练习持久化后再收集真实数据 |
| Private Account / Entitlement | Slice 2A 本地底座通过 | Supabase migration、Edge Function、邀请码页面、26 项 pgTAP 与真实 HTTP gate | 云项目、SMTP/CAPTCHA、备份、Guest 接管、正式内容资源映射 |
| Learner Space / Events | 领域契约与本地 Supabase 表/约束已实现 | 稳定 ID、所有权、追加式事件、连续序号、RLS 跨租户负面测试 | 前端练习仓储切换、后台投影与云端生产验证 |
| Consent / Grants | 纯策略契约已实现 | 精确 scope、资源、有效期、撤销和 actor 测试 | 持久化、授权界面与访问审计 |
| Benchmark / AI / Integrations | AI Job 核心契约已实现 | 投影引用、预算、委托授权和禁止 secret 校验 | Provider 适配器、Benchmark 与外部集成 |
| 品牌与完整准备旅程 | 分阶段页面与首版课程映射已交付 | 多考试首页、课程信息优先流程、零 Token 覆盖报告、个人准备首页、独立资料馆与资料入口、本地 Guest 隔离 | 扩展 AP/IB 映射、原创 8 题诊断、复习资料、免费报告与院校注册表 |

## 6. 既有局部方案的归属

- `docs/superpowers/specs/2026-07-12-tmua-content-corpus-design.md` 和对应 Phase 1 plan 属于 **Content Commons 工作流**。
- `docs/superpowers/specs/2026-07-13-tmua-2023-paper-1-experience-design.md` 和对应 implementation plan 属于 **Reference Journey 工作流**。
- 局部方案中的 “Excluded” 只表示该工作流当次不交付，不表示这些能力不属于总产品。
- 如果局部设计与产品宪章或系统架构冲突，必须先修订局部设计再开发。

## 7. 接下来三个可验证增量

1. **TMUA 完整纵向闭环（先 B）：** 在已交付的课程信息优先页面和 CAIE/Pearson 首版确定性映射上，扩展 AP/IB 准确档案与映射，完成 8 题/30 分钟固定诊断、免费证据报告、复习资料样本、专业要求和现有 2023 Paper 1 的一体化旅程。
2. **MinerU 真实资料试点与 TMUA 原生结构化（后 A）：** 18 套已经能以原卷模式练习；下一步用 Question Paper、Answer Key、Worked Solution 和 Student Textbook 对比现有 Poppler 与 MinerU 输出，再逐套完成剩余约 340 题的公式/图形恢复、知识标注、解析和原生发布。
3. **Private Account Slice 2B：** 在已通过的本地 Supabase/Auth/RLS/entitlement 底座上绑定满托云项目，配置正式域名、SMTP、滥用防护和备份；再完成服务端练习仓储与显式 Guest 数据接管。

前两个增量可以作为明确标注“当前设备保存”的本地 Reference Journey 交付，但不得公开收集真实学生的长期私密数据。任何真实用户服务端数据必须等待 Private Account Slice 的生产门。Benchmark、付费 AI 解读和外部 Agent 接入继续依赖真实、合规、经授权的数据基础，不会越过以上生产门提前伪装上线。
