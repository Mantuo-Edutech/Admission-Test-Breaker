# 满托英国大学入学考试练习场：品牌与信任阶梯设计

**状态：** 对话方案已批准，等待书面规格复核

**日期：** 2026-07-13

**范围：** 重构平台首页定位，并定义从首次看题、游客诊断、免费报告、目标专业参考，到长期训练与自愿求助的完整产品路径。TMUA 是首个完整考试空间，但不是平台品牌本身。

**上位约束：**

- `docs/product/PRODUCT_CHARTER.md`
- `docs/architecture/SYSTEM_ARCHITECTURE.md`
- `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`

**替代关系：** 本规格替代 `2026-07-13-tmua-2023-paper-1-experience-design.md` 中未来首页定位与视觉方向；既有 20 题练习、计时、恢复、提交和结果行为继续有效，直到各自后续规格明确替代。

**官方研究核验日期：** 2026-07-13

## 1. 决策摘要

本规格记录以下已确认决定：

1. 主品牌使用“满托”，正式产品名为“满托英国大学入学考试练习场”，界面简称为“满托考试练习场”，`Admission Test Breaker` 作为辅助英文名。
2. 核心标语固定为“**不再为升学考试而焦虑**”。
3. 首页是多考试统一入口。TMUA、ESAT、TARA、UCAT 在首屏拥有同等品牌层级；内容状态可以不同。
4. 首次访问不要求注册。学生先做 5 道原创代表题，再选择是否完成约 30 分钟的原创诊断。
5. 首次诊断的基础报告免费；长期、跨训练 AI 解读和真人服务可以收费。
6. 学生先看自己的训练证据，再选择目标院校和专业。院校数据不在做题前制造压力。
7. 模拟题采用“教研蓝图主导、AI 辅助生产、独立验证、人工审核、真实数据校准”的发布模式。
8. 历年真题被视为有限验证资源，不作为第一次接触考试的默认材料。
9. 真人服务不在首页硬推。只有学生主动请求，或系统发现有证据的持续困难时，才提供可选择、需授权的协作入口。

## 2. 要解决的问题

当前 Reference Journey 证明了 2023 TMUA Paper 1 可以被准确、响应式地完成，但首页仍是“一套 TMUA 试卷的落地页”。这造成三个错位：

- 平台定位覆盖 TMUA、ESAT、TARA、UCAT，首屏却让 TMUA 代表整个品牌；
- 页面解释来源、隐私和诚实原则，却没有先回答学生“这里能否完成我的备考”；
- 第一次动作是完整真题模考，要求高、消耗真题，也没有照顾尚不了解考试难度的学生。

新版产品首先回答：

1. 这是不是我需要参加的考试？
2. 它到底有多难？
3. 我可以先用模拟题试试，而不浪费真题吗？
4. 做完以后，我到底哪里有问题？
5. 相对真实人群和目标专业，我现在处在哪里？
6. 下一步该练什么，大概还需要怎样的投入？
7. 如果自己解决不了，我怎样安全地请 AI 或真人帮助？

## 3. 备选路线与决策

### 3.1 题库优先

首页直接展示题目数量、年份和开始刷题。优点是开发路径短，缺点是容易成为同质化题库，无法解释何时使用真题、结果是否可信，也无法建立长期信任。

### 3.2 目标院校优先

先选择 Imperial、UCL 等院校与专业，再展示分数目标。优点是意图强，缺点是在学生尚无自身证据时放大焦虑，并容易把历史统计误读为录取线。

### 3.3 信任阶梯（采用）

产品先用低成本体验证明价值，再逐渐要求时间、账户、数据授权和付费投入：

```text
识别自己的考试
→ 看 5 道原创代表题
→ 完成原创初步诊断
→ 免费理解自身证据
→ 选择目标专业
→ 查看带来源的历史参考
→ 保存长期学习记录
→ 专题训练、原创模拟与真题验证
→ 自愿购买深度解读或授权真人协作
```

## 4. 品牌与统一叙事

### 4.1 品牌层级

| 层级 | 表达 |
| --- | --- |
| 主品牌 | 满托 |
| 正式名称 | 满托英国大学入学考试练习场 |
| 界面简称 | 满托考试练习场 |
| 英文辅助名 | Admission Test Breaker |
| 核心标语 | 不再为升学考试而焦虑 |
| 一句话解释 | 从了解考试、诊断水平，到系统训练、模考复盘和准备进度判断，都在这里完成。 |

首页不得再使用“知识不是围墙”“内容有出处”“结论保持诚实”等抽象句子作为主要说服内容。这些原则继续存在于产品行为和关于页面，但学生首屏只看到与自身任务直接相关的信息。

### 4.2 视觉方向

采用“大学招生简章”的品牌张力和“学院阅览室”的内容秩序：

- 满托紫作为大面积品牌色，但只用于建立层级，不作为渐变装饰；
- 宋体/衬线标题、清晰目录、细分隔线、出版物式编号和暖纸背景；
- 不使用目的不明的 AI 风插画、漂浮卡片、抽象格言或泛化三栏价值卡；
- 学院感来自排版、目录、档案状态和真实材料，而不是仿古装饰；
- 手机、iPad 和桌面保持同一叙事顺序和业务语义。

## 5. 信息架构

### 5.1 平台首页 `/`

首屏包含：

1. 满托品牌与产品名称；
2. 标语“不再为升学考试而焦虑”；
3. 一句话完整产品解释；
4. 问句“你正在准备哪一项考试？”；
5. TMUA、ESAT、TARA、UCAT 四个直接入口；
6. 每个考试的真实状态，如“现已开放”“资料馆建设中”。

TMUA 可以因已开放而拥有更明确的动作，但不能拥有更高品牌层级。首页下方不重复列考试，而是展示所有考试共用的路径：

```text
了解考试 → 完成诊断 → 系统训练 → 模考复盘 → 判断准备进度
```

### 5.2 考试空间

每项考试使用同一信息骨架：

- 考试是什么、结构与时间；
- 哪些院校和专业在指定申请年度使用；
- 5 题难度体验；
- 初步模拟诊断；
- 专题训练；
- 原创完整模拟；
- 历年真题资料馆；
- 学习记录、目标专业和进度判断。

未开放考试仍可提供经核验的基本信息与建设状态，但不能出现不可用的“开始训练”动作。

### 5.3 TMUA 首个完整空间

TMUA 页面不以某一套真题作为首页。其首屏动作依次为：

1. “先做 5 道题，看看 TMUA 有多难”；
2. “完成约 30 分钟初步诊断”；
3. “进入我的训练”；
4. “查看历年真题资料馆”；
5. “哪些学校和专业需要 TMUA”。

TMUA 资料馆的第一版必须先建立完整档案真相层：18 套 paper、360 个题目档案壳、答案与 worked-solution 关联，以及本地 96 份 PDF/46 份唯一文件内容的 canonical manifest。题目档案壳可以尚未包含可渲染题面，但必须诚实标注处理状态。

## 6. 首次访问旅程

### 6.1 第一步：5 题难度体验

- 5 道平台原创题，不使用历年真题；
- 无需登录；
- 默认不设置强制倒计时，预计约 10 分钟；
- 固定、经核验的首版题组，保证所有用户看到同一质量基准；
- Paper 1 应用与 Paper 2 推理均有代表；
- 提交每题后可以查看答案、解法、考查能力和常见错误；
- 结束只显示“体验事实”，不显示正式 TMUA 分数或录取概率。

体验结束回答：

- 你答对了几题；
- 哪类题看起来陌生；
- 哪些错误来自知识，哪些来自推理或时间；
- 为什么 5 题不足以判断完整准备度；
- 完成初步诊断能新增哪些证据。

### 6.2 第二步：约 30 分钟原创诊断

首版使用 8 道固定原创题，时限 30 分钟：

- 4 道侧重数学知识应用；
- 4 道侧重数学推理和逻辑；
- 覆盖多个知识与技能标签；
- 题目顺序、答案和计时条件固定，以保留可比性；
- 重做会话必须标记 attempt number，不能与首次完成条件无说明混合；
- 不使用正式历年真题；
- 开始前明确“这是一份平台初步诊断，不是官方 TMUA 分数”。

8 题不足以支持高精度能力估计。报告必须显示证据充分度，并把不确定性作为结果的一部分。

### 6.3 游客数据与账户接管

5 题体验和初步诊断都不要求账户。事件先写入版本化本地 Guest Space：

- 有随机 guest space ID 和 session ID；
- 使用与 Learner Space 相同的事件语义，但不冒充已认证学生；
- 不在服务器建立可跨设备识别的匿名画像；
- 不收集设备指纹或跨站信息；
- 学生创建账户时，界面列明将接管的会话，再由学生确认迁移到 Learner Space；
- 迁移幂等，来源 guest space 进入已接管状态，不能被第二个账户重复接管。

如果学生不注册，本地数据仍可继续使用，但清除浏览器数据会失去记录，界面必须明确说明。

## 7. 免费诊断报告

首次完整基础报告免费，包含：

- 原始得分和答题完成度；
- 每题用时、修改、跳过和标记；
- 数学知识与推理技能证据；
- 初步错误类型；
- 当前证据充分度；
- 3 个以内的下一步训练建议；
- 哪些结论当前不能确定。

报告不包含：

- 伪造的官方 1–9 分；
- 未经校准的百分位；
- “你能/不能被某大学录取”的概率；
- 以单次短诊断推断所需精确训练小时。

学生先看到自身报告，之后才选择目标院校和专业。

## 8. 院校、专业与申请要求注册表

### 8.1 数据模型

院校要求属于 Public Content Domain，并按版本记录：

```ts
interface CourseRequirementRevision {
  id: string;
  admissionsCycle: "2027";
  institutionId: string;
  courseName: string;
  ucasCode: string;
  exam: "TMUA" | "ESAT" | "TARA" | "UCAT";
  requirement: "compulsory" | "recommended" | "optional";
  modules?: string[];
  sourceUrl: string;
  sourcePublishedAt?: string;
  verifiedAt: string;
  effectiveFrom: string;
  effectiveTo?: string;
  supersedesRevisionId?: string;
}
```

任何页面都必须显示申请年度和来源核验日期。新年度发布后新增 revision，不静默覆盖旧申请季。

### 8.2 首批范围

- 导入 UAT-UK 2027 Entry 官方 22 页课程清单；
- 建立 Imperial、Cambridge、Oxford、LSE、Warwick、Durham、UCL 的 UAT-UK 要求；
- 为 TMUA 页面提供完整的学校、专业、UCAS code、必需/推荐状态；
- UCAT 使用 UCAT Consortium 当届官方大学与课程代码清单；
- 院校自己的课程页用于二次核验和补充，不以搜索摘要作为发布依据。

### 8.3 当前官方事实基线

- UAT-UK 的 2027 课程清单列出七所参与院校及所需测试；
- Imperial 的 Computing、Mathematics、Economics, Finance and Data Science 等课程使用 TMUA；
- UCL 2027 年 Economics 使用 TMUA，Electronic and Electrical Engineering 使用 ESAT，部分 Computer Science 和 Mechanical Engineering 使用 TARA；
- 要求会按申请周期变化，必须以具体课程页为最终确认来源。

## 9. Benchmark 分层

“Benchmark”不能表示单一数字。产品使用四类明确对象：

| 类型 | 含义 | 最低展示条件 |
| --- | --- | --- |
| Session Evidence | 本次练习的原始事实 | 会话有效完成 |
| Platform Cohort Reference | 与兼容平台用户的分布比较 | cohort 兼容、最小样本和隐私门 |
| Mock Readiness Estimate | 经校准模拟卷给出的准备度区间 | 固定 form、anchor、统计校准和置信区间 |
| Official Historical Reference | 院校/主办方公开的历史结果 | 官方来源、明确申请年度和限制说明 |

首版 8 题诊断只提供 Session Evidence。它不能输出 Platform Cohort 百分位或 Mock Readiness Estimate。

### 9.1 官方量尺边界

UAT-UK 明确说明：

- TMUA/ESAT 没有通过线；
- 正式分数依赖当届考生能力分布和统计等值；
- 官方 specimen/sample test 不提供正式分数；
- 当前量尺以中位数 4.5、90 百分位 7.0 为参照。

因此，平台只有在建立稳定 form、anchor item、真实完成条件和外部校准数据后，才能提供带区间的“模拟准备度”。即使成熟，也不得称为官方分数。

### 9.2 院校历史参考

允许展示的例子包括：

- Imperial 官方匿名历史申请与结果分布；
- Warwick 官方披露的历史多数 offer holder 分数区间；
- UCL/UCAT 官方披露的当届 interview threshold 或历史均值；
- UCAT Consortium 当届均值、decile 和 percentile。

每条记录包含：申请年度、申请人群、指标定义、样本量（如有）、来源、发布时间、限制说明。没有官方数据时显示“尚无可验证历史参考”，不得用培训机构宣传口径填空。

## 10. 原创模拟题生产与发布

### 10.1 内容类别

| 类别 | 用途 | 可否直接发布 |
| --- | --- | --- |
| `official_archive` | 历年真题与官方材料 | 完成来源、许可和逐题核验后 |
| `licensed_original` | 已获许可的教研材料 | 完成授权记录和逐题核验后 |
| `platform_original` | 满托/社区原创题 | 完成全套验证后 |
| `generated_variant` | 基于已审蓝图和参数模板的变式 | 通过生成约束和抽样/全量审核后 |
| `ai_assisted_draft` | AI 辅助草稿 | 永不直接发布 |

### 10.2 每题必须具备

- 目标考试、paper/module 与内容规格版本；
- 知识标签、技能标签、目标难度和预期用时；
- 唯一正确答案；
- 完整解法和替代验证方法；
- 每个干扰项对应的错误假设；
- 来源与生成方式；
- 作者、AI 策略版本（如使用）、验证者和审核者；
- 内容 revision；
- 上线后的正确率、区分度、用时分布和异常标记。

### 10.3 发布门

```text
考试蓝图
→ 人工/AI 辅助草稿
→ 公式与数值验证
→ 边界条件和唯一答案检查
→ 干扰项合理性检查
→ 独立教研审核
→ 小规模试测
→ 统计质量检查
→ 发布 revision
```

AI 不能自己审核自己生成的题。程序验证也不能替代教研审核。市场资料只有在许可明确时才能作为内容来源；否则只能用于了解公开题型，不得改写式复制。

## 11. 历年真题策略与 TMUA 资料馆

当前事实状态：

- 本地有 96 份 PDF、46 份唯一文件内容；
- 历史范围覆盖 Specimen、2016 Practice 和 2017–2023 的 Paper 1/2，共 18 套、360 道题；
- 专题工作册约有 270 道按知识领域重组的历史题；
- 当前真正结构化、逐题核验且可在线作答的只有 2023 Paper 1 的 20 题。

首批 corpus 工作必须与 UAT-UK 当前官方档案再次对账，补齐本地缺失的官方 worked solutions 或记录官方链接，并生成：

- 96 个原始文件路径记录；
- 46 个 canonical source 记录及 duplicate map；
- 18 个 paper 记录；
- 360 个稳定 question shell；
- 每套 paper 的 question、answer key、worked solution 完整度；
- 机器可验证 manifest 和人类可读审计报告。

资料馆必须区分：

- `discovered`：文件已发现；
- `indexed`：来源、年份、paper、答案/解答关系已建立；
- `extracted`：题面已结构化；
- `verified`：公式、图表、选项和答案逐题核验；
- `published`：可在线使用。

学生看到的是状态诚实的完整目录，而不是把“PDF 已存在”写成“题库已开放”。

真题使用建议：

- 初次体验和初步诊断不用真题；
- 专题学习可以引用已经使用过或明确选择的历史题；
- 系统允许学生把部分完整真题标记为“保留卷”；
- 真题首次完成条件、重做次数和答案接触状态进入结果解释；
- 使用过的真题不能与首次全真条件数据无说明混合。

## 12. 付费 AI 与真人服务

### 12.1 免费层

- 5 题体验；
- 初步原创诊断；
- 首次基础报告；
- 基础专题训练、历史和个人趋势；
- 目标专业官方要求与可验证历史参考；
- 数据接管、导出、删除和授权控制。

### 12.2 可收费层

- 多次训练的长期能力变化解释；
- 跨考试/跨能力综合报告；
- 结构化上下文驱动的 AI 深度复盘；
- 老师工作台高级编排；
- 满托人工教研、课程或顾问服务。

### 12.3 自然出现原则

首页不使用“预约老师”“立即咨询”等主 CTA。真人帮助只在以下情形出现：

- 学生主动点击“我需要另一种解释”；
- 同类错误在足够样本中反复出现；
- 学生希望制定计划或复核 AI 结论；
- 学生主动选择将指定数据授权给老师。

提示必须先解释触发依据，并提供“继续自己练习”。任何真人、家长、老师或 Agent 都不能因提示而自动获得数据。

## 13. 事件与结果数据

新增旅程事件仍遵守 Learning Event Ledger：

- `exam_space_viewed`;
- `preview_started`;
- `preview_item_viewed`;
- `preview_answer_selected`;
- `preview_completed`;
- `diagnostic_started`;
- `diagnostic_completed`;
- `report_viewed`;
- `course_target_selected`;
- `guest_claim_requested`;
- `guest_claim_completed`;
- `help_option_viewed`;
- `help_requested`.

营销分析不得复制题目级私密事件。平台级漏斗只使用符合最小化原则的聚合投影。

## 14. 错误与安全降级

- 游客本地存储不可用时，允许继续当前内存体验，并在开始诊断前说明无法恢复；
- 题目验证状态不合格时整组不发布，不能随机跳过造成蓝图失衡；
- 院校来源过期时显示“等待本申请季复核”，不继续展示旧要求为当前事实；
- Benchmark 样本不足时返回 `insufficient_sample`；
- 统计校准失效时降级为原始会话证据；
- AI 失败不影响原始报告；
- 账户接管失败不删除 guest 数据，可安全重试；
- 任何付费失败不应锁住已经免费生成的基础报告。

## 15. 响应式与无障碍

- 首屏四个考试入口在桌面为四列，iPad 为两列或紧凑四列，手机为清晰单列/双列；
- 所有入口具有至少 44px 触控目标、键盘焦点和状态文本；
- “建设中”不能只靠颜色表达；
- 数学内容继续使用 KaTeX 与语义化选项；
- 计时提醒不持续打扰屏幕阅读器；
- 关键旅程覆盖 390×844、820×1180、1180×820 和 1440×1000；
- 视觉验证检查首屏承诺、四考试可见性、诊断报告和来源标签。

## 16. 独立验证矩阵

| 验证层 | 必须证明 |
| --- | --- |
| 品牌/文案契约 | 首屏包含固定标语、完整产品解释和四个考试入口；无旧抽象格言 |
| 路由与状态 | 未开放考试不能进入假训练；TMUA 可进入 5 题体验 |
| Guest Space | 无登录可完成、刷新可恢复、接管幂等、不可被第二账户接管 |
| 原创题内容 | 题数、蓝图、唯一答案、解法、来源、审核状态和 revision |
| 诊断行为 | 30 分钟、固定 8 题、提交幂等、报告只引用存在证据 |
| Benchmark | 首版不返回官方分、百分位或录取概率；不足时明确降级 |
| 院校注册表 | 申请年度、source URL、verifiedAt、revision 和过期处理完整 |
| 商业边界 | 免费基础报告不被付费失败或登录墙阻断 |
| 隐私授权 | 目标专业选择不向老师/家长/Agent 自动共享 |
| 响应式/a11y | 手机、iPad、桌面入口和练习路径均可用 |

## 17. 首个交付切片

本规格拆为四个连续、可独立验证的增量：

### Slice A：TMUA Corpus 真相层

- 建立 96 文件/46 canonical source manifest 与 duplicate map；
- 建立 18 套 paper 和 360 个 question shell；
- 与 UAT-UK 当前官方档案对账并记录缺失/补齐状态；
- 资料馆可按 discovered/indexed/extracted/verified/published 展示真实进度。

### Slice B：品牌首页与考试入口

- 重写首页品牌和统一叙事；
- 首屏四考试入口；
- TMUA 进入真实考试空间；
- ESAT/TARA/UCAT 显示经核验的建设状态；
- 删除旧插画与抽象承诺卡。

### Slice C：TMUA 5 题体验与 Guest Space

- 5 道经全套验证的原创代表题；
- 无登录体验、答案解释和初步证据；
- Guest Space 版本化本地存储；
- 从体验进入诊断的清晰解释。

### Slice D：8 题诊断、免费报告与专业注册表

- 8 道固定原创诊断题、30 分钟；
- 免费基础报告和证据充分度；
- UAT-UK 2027 TMUA 院校/专业要求注册表；
- 完成报告后选择目标专业；
- 只展示可验证的官方历史参考和限制说明。

生产级跨设备保存、账户接管、RLS 和真实学生数据收集仍受 Private Account Slice 的安全门约束。Slice A–D 可以本地验证，但不能把本地 Guest Space 宣称为生产账户。

## 18. 验收标准

规格实施完成时：

1. 新用户第一屏能看见标语、完整产品含义和四个考试入口；
2. TMUA 不再代表平台品牌，而是第一个已开放考试空间；
3. TMUA 资料馆包含 18 套 paper、360 个 question shell 和可验证 canonical source manifest；
4. 用户无需登录即可完成 5 题体验和 8 题诊断；
5. 两组题均为已验证原创内容，不消耗历年真题；
6. 首次基础报告免费且不输出未经校准的官方分、百分位或录取概率；
7. 学生在看完自身报告后才选择目标专业；
8. 2027 TMUA 专业要求记录带官方来源、申请年度和核验日期；
9. TMUA 资料馆诚实区分发现、索引、抽取、核验和发布状态；
10. 付费与真人帮助不阻断免费旅程，也不自动获得学生数据；
11. 架构、内容、领域、响应式、无障碍、隐私与文档门禁全部通过。

## 19. 官方研究基线

- UAT-UK 2027 Entry Course List: <https://uat-wp.s3.eu-west-2.amazonaws.com/wp-content/uploads/2026/04/01172717/Course_List_2027_Entry_Final.pdf>
- UAT-UK Prepare and score-scale explanation: <https://esat-tmua.ac.uk/prepare/>
- UAT-UK TMUA preparation archive: <https://esat-tmua.ac.uk/tmua-preparation-materials/>
- Imperial TMUA requirements: <https://www.imperial.ac.uk/study/apply/undergraduate/process/admissions-tests/tmua/>
- Imperial historical score dashboard explanation: <https://www.imperial.ac.uk/study/apply/undergraduate/process/admissions-tests/understanding-your-esat-and-tmua-scores/>
- UCL 2027 tests, tasks and interviews: <https://www.ucl.ac.uk/study/prospective-students/school-teachers-and-counsellors/tests-tasks-and-interviews>
- Warwick TMUA admissions guidance: <https://warwick.ac.uk/study/undergraduate/applying/admissions-tests/>
- UCAT participating universities: <https://www.ucat.ac.uk/about-ucat/universities/>
- UCAT annual test statistics: <https://www.ucat.ac.uk/results/test-statistics/>

这些链接是首版研究基线，不替代每个申请年度的重新核验。
