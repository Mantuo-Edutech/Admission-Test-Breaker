# 总路线图与验证矩阵

**状态：** 生效
**日期：** 2026-07-13
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
**成果：** 20 道已核验题、75 分钟会话、学习事件、版本化本地仓储、结果投影、学院插画风响应式界面、数据边界提示。
**边界：** 首次可体验版本允许本地存储，但领域事件必须携带 Learner Space；不得宣称已实现生产多租户。
**发布门：** V0、V1、V2-local、V3、V4-responsive/accessibility。

### Phase 2 — 私密账户与授权协作

**旅程：** 学生注册/登录 → 数据跨设备保存 → 分别授权老师查看、批注、制定计划或布置练习 → 查看审计并撤销。
**成果：** PostgreSQL、身份、RLS、Grant、审计、老师/家长协作视图、数据导出与删除。
**发布门：** 跨租户负面测试、权限组合测试、撤销时效、备份恢复、安全审查。任何真实学生数据进入系统前必须完成本阶段生产门。

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
| 记录所有有意义动作 | Event Ledger | 作答/修改/停留/标记/提交事件 | reducer/event schema/恢复测试 | 0–1 |
| 学生数据高度私密 | Learner Space + Consent | 明确归属，本地版数据提示 | 数据边界测试；后续 RLS 跨租户测试 | 1–2 |
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
| G3 Content | schema、题数、答案、来源和 revision | `pnpm test -- tests/content tests/features/practice/content` | P0 |
| G4 Architecture | 禁止依赖、模块公开 API、私密/公开域隔离 | `pnpm verify:architecture` | P0 |
| G5 Integration | 存储、RLS、AI provider、Webhook/MCP 合约 | 分阶段加入 `pnpm test:integration` | P0 |
| G6 Journey | 开始、恢复、提交、结果、授权闭环 | 分阶段加入 `pnpm test:e2e` | P0 |
| G7 UI Quality | 无障碍、手机/iPad/桌面、reduced motion | 组件测试 + Playwright 视口矩阵 + 人工截图评审 | P1；关键动作 P0 |
| G8 Security/Privacy | 越权、撤销、密钥、日志、导出/删除 | 安全套件 + 威胁模型复核 | 生产 P0 |
| G9 Build | 可重复生产构建 | `pnpm build` | P0 |
| G10 Docs | 上位契约、规格、路线图和状态一致 | 评审 checklist；后续自动链接检查 | P1；架构变更 P0 |

`P0` 失败禁止合并或发布；`P1` 必须在当前里程碑解决；`P2` 可以记录并排期但不能伪装成完成。

## 5. 当前进度基线（2026-07-13）

| 工作流 | 状态 | 证据 | 尚欠 |
| --- | --- | --- | --- |
| 母产品契约 | 已建立并进入自动执行 | 产品宪章、系统架构、路线图、`pnpm verify:architecture` | 后续模块加入时持续扩展禁止依赖规则 |
| TMUA 原始资料 | 已盘点本地 96 PDFs / 46 个唯一内容 | `docs/superpowers/specs/2026-07-12-tmua-content-corpus-design.md` | 全量 canonical manifest 与贡献发布流 |
| Content tooling | typed schema 基础已完成 | `src/content/tmua/`、schema tests | CLI 实现与全量 corpus build |
| Reference content | TMUA 2023 Paper 1 共 20 题已人工核验 | `src/features/practice/content/tmua-2023-p1.ts` | 后续解释和更多试卷 |
| Web runtime | React/Vite 与入口占位已完成 | app shell test、build | 品牌界面、会话、存储、结果 |
| Learner Space / Events | 核心领域契约已实现 | 稳定 ID、所有权、追加式事件、顺序与幂等测试 | Practice Session 接入和持久化适配器 |
| Consent / Grants | 纯策略契约已实现 | 精确 scope、资源、有效期、撤销和 actor 测试 | 持久化、授权界面与访问审计 |
| Benchmark / AI / Integrations | AI Job 核心契约已实现 | 投影引用、预算、委托授权和禁止 secret 校验 | Provider 适配器、Benchmark 与外部集成 |

## 6. 既有局部方案的归属

- `docs/superpowers/specs/2026-07-12-tmua-content-corpus-design.md` 和对应 Phase 1 plan 属于 **Content Commons 工作流**。
- `docs/superpowers/specs/2026-07-13-tmua-2023-paper-1-experience-design.md` 和对应 implementation plan 属于 **Reference Journey 工作流**。
- 局部方案中的 “Excluded” 只表示该工作流当次不交付，不表示这些能力不属于总产品。
- 如果局部设计与产品宪章或系统架构冲突，必须先修订局部设计再开发。

## 7. 接下来三个可验证增量

1. **Platform Contracts：** 建立 Learner Space、Grant、Learning Event、AI Job 类型与架构依赖测试。
2. **Practice Domain：** 用真实 20 题实现会话 reducer、deadline 计时、事件追加、幂等提交和结果投影。
3. **Reference UI：** 完成满托配色的暖学院风首页、练习页、结果页和手机/iPad/桌面适配。

完成以上三个增量后，用户第一次能够体验完整界面和真实题目；同时产生的数据已经能无损迁移到后续服务端账本，而不是一次性 Demo 状态。
