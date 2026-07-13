# Admission Test Breaker 系统架构

**状态：** 生效
**日期：** 2026-07-13
**架构形态：** API-first 模块化单体，事件账本与版本化投影
**上位约束：** `docs/product/PRODUCT_CHARTER.md`

## 1. 架构目标

系统首先支持一个完整而可信的学生旅程，同时为多考试、多人授权协作、公平 Benchmark、可配置 AI 和外部 Agent 接入保留稳定边界。初期采用模块化单体，避免在业务边界尚未稳定时引入微服务运维成本；模块之间通过领域接口和事件契约协作，未来可按负载或治理需要拆分。

## 2. 系统全景

```mermaid
flowchart LR
  Client["响应式 Web 客户端\n手机 / iPad / 电脑"]
  API["应用 API / BFF"]
  Content["Content Commons\n题目与版本"]
  Admissions["Admissions Registry\n考试、院校与专业要求"]
  Learner["Learner Space\n身份与私密空间"]
  Practice["Practice Engine\n会话与作答"]
  Ledger["Learning Event Ledger\n不可变学习事件"]
  Consent["Consent & Grants\n授权与审计"]
  Projection["Projection Engine\n历史、错题与能力投影"]
  Benchmark["Benchmark Engine\n分层样本与置信度"]
  AI["AI Gateway\n模型、成本与解释版本"]
  Integration["Integration Gateway\nOpenAPI / Webhook / MCP"]
  Mantou["Mantou Service Bridge\n用户主动选择的服务"]

  Client --> API
  API --> Content
  API --> Admissions
  API --> Learner
  API --> Practice
  Practice --> Ledger
  Ledger --> Projection
  Projection --> Benchmark
  Consent --> API
  Consent --> AI
  Consent --> Integration
  Projection --> AI
  API --> Mantou
  Integration --> Mantou
```

## 3. 信任域

### 3.1 Public Content Domain

包含题目、试卷、答案、标签、来源、审核和内容版本。可以在开源仓库中协作，不能依赖或引用任何真实学生记录。

### 3.2 Private Learner Domain

包含账户、学习空间、会话、作答、计时、错误、计划、批注、授权和 AI 运行。所有记录都必须带数据归属和租户边界；任何读取都经过身份与授权判定。

### 3.3 Aggregate Research Domain

包含达到门槛后的匿名聚合和 Benchmark 快照。它只能从受控投影生成，不能反向暴露单个学生或小群体。

三个信任域可以共享稳定 ID 和版本引用，但不能共享存储访问权限。

## 4. 领域模块

| 模块 | 责任 | 明确不负责 |
| --- | --- | --- |
| Identity & Learner Space | 登录身份、学生私密空间、成员关系、数据归属 | 具体练习逻辑、第三方授权 |
| Content Commons | 题目/试卷版本、来源、许可、审核、贡献工作流 | 学生作答与个体统计 |
| Admissions Registry | 按申请年度维护考试、院校、专业、必需模块、来源和历史参考 | 预测个人录取结果、用旧年度覆盖当前要求 |
| Practice Engine | 创建和完成练习会话、答案状态、计时、提交幂等性 | 长期分析、AI 解释 |
| Learning Event Ledger | 追加目的明确、带版本的学习事件 | 修改历史事实、直接渲染报告 |
| Projection Engine | 从事件生成会话结果、错题、频率、技能和时间投影 | 伪造缺失事件、替代原始账本 |
| Consent & Grants | 逐项授权、限时、撤销、委托主体和访问审计 | 用角色名称代替权限判定 |
| Benchmark Engine | 分层样本、资格规则、统计快照、置信信息 | 未达门槛的个体排名 |
| AI Gateway | 提供商适配、路由、提示策略、预算、运行与审计 | 直接拥有学生数据、绕过授权 |
| Integration Gateway | OpenAPI、Webhook、MCP、飞书和 Agent 连接 | 永久共享万能令牌 |
| Mantou Service Bridge | 学生主动发起的咨询、报告或服务衔接 | 隐形导流、未经同意复制档案 |
| Admin & Trust | 内容审核、运维、滥用处置、合规请求、审计调查 | 无理由浏览学生内容 |

## 5. 核心实体与归属

| 实体 | 归属/控制者 | 关键版本或边界 |
| --- | --- | --- |
| `User` | 身份主体 | 身份提供方、状态 |
| `LearnerSpace` | 学生 | `ownerUserId`，一个学生可有一个或多个空间 |
| `Grant` | 学生创建并可撤销 | 受权主体、scope、资源范围、起止时间、状态 |
| `ContentRevision` | Content Commons | 内容 ID、revision、来源、审核状态、许可 |
| `ItemBlueprint` | Content Commons | 考试规格、目标技能、难度、生成方式和发布门 |
| `CourseRequirementRevision` | Admissions Registry | 申请年度、院校/专业、考试要求、官方来源和核验时间 |
| `OfficialHistoricalReference` | Admissions Registry | 指标定义、申请人群、历史年度、来源和限制说明 |
| `PracticeSession` | Learner Space | 试卷 revision、状态、开始/截止/提交时间 |
| `LearningEvent` | Learner Space | 单调序号、schema version、actor、发生时间、payload |
| `ProjectionSnapshot` | Learner Space | 投影类型、算法版本、截止事件序号 |
| `BenchmarkSnapshot` | Aggregate Domain | cohort definition、样本量、时间窗、算法和置信信息 |
| `Annotation` / `Plan` / `Assignment` | Learner Space | 作者、创建依据的 grant、可见范围 |
| `AIRun` | Learner Space | purpose、data scopes、provider/model、策略版本、Token/成本、输出 |
| `AuditRecord` | 平台受托保存 | actor、action、resource、decision、reason、time |

内容修订只能被引用，不能在学生完成后静默改变历史会话。投影可以重建，但必须保留算法版本和消费到的事件位置。

## 6. 学习事件账本

### 6.1 事件信封

所有学习事件使用稳定信封：

```ts
interface LearningEvent<TType extends string, TPayload> {
  id: string;
  schemaVersion: 1;
  learnerSpaceId: string;
  sessionId: string;
  sequence: number;
  type: TType;
  actor: { kind: "guest" | "student" | "teacher" | "parent" | "agent" | "system"; id: string };
  occurredAt: string;
  payload: TPayload;
}
```

首批学生练习事件包括：`session_started`、`question_viewed`、`answer_selected`、`answer_changed`、`question_marked`、`question_unmarked`、`submission_opened`、`session_submitted` 和 `session_expired`。

### 6.2 规则

- 账本追加，不原地覆盖；纠正通过新事件表达。
- `guest` 只用于明确的本地 Guest Space；它不授予 Learner Space 权限，也不能被服务端当作匿名账户。
- 同一会话序号连续，事件 ID 幂等，重复请求不能产生双重提交。
- 客户端时间仅作为观测；服务端接收时间和会话截止规则共同参与可信判断。
- 事件 payload 禁止任意自由文本和无关设备指纹；新增字段需要 schema 版本。
- 产品读模型从投影获取，审计和重算才直接读取事件。

## 7. 授权模型

### 7.1 首批 Scope

- `progress:read`：查看聚合进度和历史；
- `responses:read`：查看题目级作答与用时；
- `annotations:write`：增加批注；
- `plans:write`：制定或修改训练计划；
- `assignments:write`：布置练习；
- `ai-insights:read`：查看指定 AI 解读；
- `ai-insights:run`：在授权数据范围内发起解读；
- `data:export`：导出明确资源；
- `integration:operate`：通过指定集成执行被允许动作。

### 7.2 授权判定

访问能力取决于：主体身份、Learner Space、scope、资源过滤器、有效期、授权状态和用途。`teacher`、`parent` 或 `agent` 角色本身不授予任何数据访问。

每次敏感读取和写入产生审计记录。撤销后新请求立即失败，长任务在下一安全检查点停止。外部 Token 使用短时凭证、最小 scope 和可轮换密钥。

## 8. 多租户与存储

生产目标存储为 PostgreSQL。私密表包含 `learner_space_id`，并同时实施：

1. 应用服务的授权策略；
2. 数据库 Row-Level Security；
3. 后台任务的显式租户上下文；
4. 跨租户负面测试与审计。

对象存储使用按租户和用途隔离的 key；日志默认不包含题目级答案、提示上下文或密钥。备份继承相同的加密、保留和删除策略。

第一阶段本地浏览器适配器只是 Reference Journey 的临时实现，必须实现与未来服务端仓储相同的领域接口，并在界面中明确标注“当前设备保存”。它不是生产多租户方案。

## 9. Benchmark 架构

Benchmark 采用版本化快照而不是实时扫描原始作答：

```text
已完成且符合条件的会话
→ 数据质量与环境资格过滤
→ 去标识化分层聚合
→ 最小样本/重识别门槛
→ 带 cohort、样本量、算法和置信度的快照
→ 个体结果按兼容条件比较
```

首批 cohort 至少区分考试、paper、内容 revision、完成模式、时间窗和备考阶段。低于发布阈值只返回 `insufficient_sample`，不返回占位百分位。训练时间估计必须表达区间和假设。

Benchmark 输出必须区分：原始会话事实、平台 cohort 参考、经校准的模拟准备度、院校官方历史参考。Admissions Registry 的历史数据可以与学生结果并列展示，但不能被 Benchmark Engine 改写成录取概率。未经 anchor、固定 form、完成条件和统计校准的短诊断不得映射为官方 1–9 分。

## 9.1 游客空间与账户接管

首次 5 题体验和初步诊断允许使用本地 `GuestSpace`。它拥有随机 ID、版本化事件和明确的本地边界，但不是已认证的 `LearnerSpace`，也不在服务端形成可跨设备追踪的匿名画像。

学生创建账户时，应用通过显式确认将选定 guest sessions 幂等迁移到学生 Learner Space。迁移成功后 guest source 标记为已接管，不能被第二个账户重复接管；迁移失败不能删除本地来源数据。生产跨设备存储仍必须先通过身份、RLS 和跨租户负面测试。

当前代码契约尚未接受 `guest` actor；Phase 1B 必须在同一变更中更新领域类型、迁移行为和架构测试。在该切片完成前，文档中的 `guest` 是已批准的目标契约，不是已上线能力。

## 10. AI Gateway

业务模块提交 `AIJob`，而不是直接调用模型 SDK：

```ts
interface AIJob {
  purpose: "session_review" | "longitudinal_review" | "teacher_assist";
  learnerSpaceId: string;
  requestedBy: string;
  grantId?: string;
  inputProjectionRefs: string[];
  policyVersion: string;
  budget: { maxInputTokens: number; maxOutputTokens: number; maxCostMinor: number };
}
```

Gateway 负责授权复核、上下文最小化、敏感字段处理、提供商路由、BYOK/平台密钥选择、重试、预算、提示策略版本和运行审计。输出写为独立的 `InsightSnapshot`，不改写学习事件或统计事实。

## 11. 外部平台与 Agent 接入

- OpenAPI 是稳定服务契约；Web 客户端也消费同一领域 API。
- Webhook 只发送事件摘要和资源引用，订阅者凭授权再读取详情。
- MCP/Agent 工具暴露任务级动作，例如“读取被授权的本周进度”或“创建训练计划”，不暴露数据库查询能力。
- 飞书等办公平台通过 Integration Gateway 映射身份和权限，不能绕过 Grant。
- 所有外部动作携带 actor、grant、purpose 和 idempotency key，并写入审计。

## 12. 客户端与响应式架构

客户端使用 React、Vite、成熟无障碍 primitives 和产品自有设计系统。采用内容优先的响应式布局，不为手机、iPad、桌面维护三套业务逻辑：

- 同一领域状态和组件语义；
- CSS token、container/breakpoint 和布局组合负责适配；
- 桌面持久侧栏、iPad 按方向收放、手机底部操作与弹层；
- 所有关键动作保持至少 44px 触控目标、键盘能力和可见焦点；
- 关键视口与 reduced-motion 进入自动化与人工视觉验证。

配色以满托紫 `#63528C`、深墨 `#282332`、灰 `#76777A`、暖纸 `#F7F1E7` 和抬升纸面 `#FFFDF8` 为基础。成熟组件提供行为，自有 token 与组合组件提供品牌和细节。

## 13. 依赖规则

```text
UI / Adapters
    ↓
Application Use Cases
    ↓
Domain Contracts

Content Domain ──仅通过 ContentRevision 引用──> Practice Domain
Private Learner Domain ──不得被──> Public Content tooling 导入
AI / Integration Adapters ──不得被──> Core domain 导入
Projections ──只消费事件，不反向修改──> Event Ledger
```

- 领域层不导入 React、浏览器存储、数据库或模型 SDK。
- 页面只调用用例/仓储接口，不直接操作持久化。
- Content Commons 不得依赖任何 learner、grant、session 私密模块。
- AI 和集成提供商代码位于适配器边缘。
- 跨模块引用和禁止依赖由架构测试自动扫描。

## 14. 独立验证层

每项功能有可由 Agent 单独运行的验证层：

| 层级 | 验证内容 | 失败效果 |
| --- | --- | --- |
| V0 静态契约 | TypeScript、JSON Schema、内容 schema、依赖边界 | 阻止合并 |
| V1 领域行为 | reducer、授权决策、事件幂等、投影、Benchmark 资格 | 阻止合并 |
| V2 适配器 | 本地存储、PostgreSQL/RLS、AI provider、Webhook 合约 | 阻止发布相关模块 |
| V3 用户旅程 | 真实题目的端到端开始/恢复/提交/报告/授权 | 阻止发布 |
| V4 非功能 | 无障碍、响应式、性能、安全、备份恢复 | 按风险阻止发布 |
| V5 架构审计 | 模块依赖、数据归属、权限覆盖、文档同步 | 阻止架构漂移 |

验证代码与生产实现分离；测试不能通过复制生产逻辑获得“假绿”。每个发布项必须在总验证矩阵中有负责人、命令和证据。

## 15. 初期部署形态

首个生产形态是一个可水平扩展的 Web/API 应用、PostgreSQL、对象存储和后台任务进程。事件投影、Benchmark 与 AI 任务通过持久任务队列异步执行。只有当独立伸缩、隔离或团队边界有实际证据时才拆分服务。

当前 Vite 应用是 Reference Journey 客户端，不代表最终后端已经完成。任何“本地可体验”能力都必须在界面和文档中区分原型存储与生产隐私保证。
