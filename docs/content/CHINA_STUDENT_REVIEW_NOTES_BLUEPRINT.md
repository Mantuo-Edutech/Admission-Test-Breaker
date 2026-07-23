# 面向中国学生的完整复习 Notes 蓝图

**状态：** 内容架构完成；TMUA、ESAT、TARA、LNAT 与 UCAT 顶层教学预览及同源 A4 下载版均已落地，细颗粒正文与独立终审待分批教研
**日期：** 2026-07-19
**机器可读版本：** `content/notes/china-student-review-notes-blueprint.json`

## 1. 目标不是“翻译官方 Guide”

Notes 应该回答中国学生最实际的五个问题：

1. 这个考试具体考什么，我需要哪些模块？
2. 我正在读的 A-Level/IAL、IB 或 AP 已覆盖哪些内容？
3. 哪些只是术语不同，哪些是真正没有学过？
4. 每一种题型应该怎样思考、怎样分配时间、怎样复盘？
5. 做完题以后，下一步应该复习知识、训练方法，还是提高英语处理速度？

官方资料只作为结构事实、知识范围和题型证据。满托 Notes 必须重新组织、独立撰写、增加中国课程体系桥接与常见误区，不能把官方 PDF 翻译、改写后直接当成付费内容。

## 2. 每套 Notes 的统一结构

每个考试或模块都采用同一套学习结构：

1. **一页定位 / Exam Map**：考试结构、模块、题量、时间、是否使用计算器、与申请专业的关系。
2. **课程覆盖 / Curriculum Bridge**：A-Level/IAL、IB、AP 分别显示“已覆盖、术语不同、需要补学”。
3. **核心知识 / Core Knowledge**：中英文术语、定义、最小例题和常见错误。
4. **题型方法 / Question Methods**：识别信号、标准思路、选项排除、时间决策。
5. **原创例题 / Original Worked Examples**：不复制官方题面，以同一知识与推理蓝图原创。
6. **真题复盘 / Past-paper Review**：引用题号、年份和知识标签，不在 Notes 中重新发布未经许可的官方题面。
7. **行动建议 / Next Action**：依据课程信息与作答证据推荐复习、补学或限时训练。

一开始不调用实时 AI。课程映射、知识展示和基础路径由版本化规则生成；AI 只在学生授权后读取结构化档案与练习投影，生成个性化解读。

## 3. 分考试内容产品

### TMUA

第一版拆成七册：考试与无计算器策略；代数/函数/图像；数列/坐标/几何；微积分与建模；逻辑/证明/反例；数学推理与选项辨析；历年真题复盘系统。

课程桥接重点：

- A-Level/IAL 学生通常知识覆盖较高，主要补逻辑语言、证明习惯和 Paper 2 推理；
- IB AA 学生要核对数列、坐标和代数技巧的熟练度，IB AI 不应被默认视为完整覆盖；
- AP 学生需要单独补齐英国课程中的代数、三角、数列与证明语言，不能因为修过 Calculus 就判定全部覆盖。

### ESAT

Notes 必须按学生申请专业筛选，只呈现需要的模块。Math 1、Math 2、Physics、Chemistry、Biology 各自成册，另有“模块组合与 40 分钟策略”。每册按 A-Level/IAL、IB、AP 三个入口解释课程差异，并把官方一级知识单元细化为可复习的小节。

### TARA

不按学科知识组织，而是按 Critical Thinking、Problem Solving、Writing Task 和中英论证术语桥接组织。中国学生版重点解释 assumption、inference、flaw、qualifier、counterargument 等词在题目中的精确含义，并提供英文限时论证的句法与段落骨架。

### LNAT

Section A 重点是文章论证结构、语气、范围、推断和干扰项；Section B 重点是 thesis、assumption、counterargument、paragraph logic 与 500-600 词控制。英语桥接专章处理长难句、限定词、指代和“不能把外部知识带进文章题”的习惯。

### UCAT

按 Verbal Reasoning、Decision Making、Quantitative Reasoning、Situational Judgement 和工具/节奏五册组织。SJT 必须增加英国医疗职业规范背景，但不能把文化印象冒充评分规则；所有判断应有可引用的职业规范来源。UCAT 官方题库为互动网页，本站 Notes 需要原创题型训练，不能抓取并重新发布互动题库。

## 4. 免费与增值边界

永久免费：考试地图、知识目录、课程缺口图、学习清单、每册样章，以及当前版本中完成人档案后开放的顶层 A4 教学预览。

邀请码或正式 entitlement：未来的完整细颗粒 Notes、更多原创逐步例题、模块训练集、终审复习包和基于本人数据的解读。真题、答案和事实型练习结果本身不应因 Notes 权限被隐藏。

## 5. 生产流程

```text
官方规格 / Guide / 历史题证据
→ Source Claim：只记录可引用的结构事实与知识范围
→ 中国课程体系映射
→ 原创双语教研稿
→ 学科教师独立复核
→ 权利与相似度检查
→ 中国学生可理解性测试
→ Web 内容 revision + 下载版 PDF
→ 作答数据验证与版本迭代
```

任何一章都必须保留：来源 claim、作者、复核者、适用考试周期、课程体系、知识标签、发布 revision 和变更记录。自动生成内容只能进入 draft，不能直接发布。

## 6. 建设顺序

1. TMUA Notes v1：利用已有 360 道原生题和官方 worked answers 建立完整模板。
2. ESAT Mathematics 1 / 2：复用数学知识体系，重点制作 A-Level/IB/AP 差异。
3. ESAT Physics / Chemistry / Biology：基于官方 Guide 与 ENGAA/NSAA 证据逐模块建设。
4. LNAT / TARA：建立英语附加语言学生的阅读、论证与写作方法体系。
5. UCAT：先完成题型与工具 Notes，再建立原创题库和评分验收。

每一步都必须同时交付 Web 章节、下载版、来源矩阵、教师审核和可独立运行的验证；不能只写完一份 PDF 就算完成。

## 7. 已落地 revision

### TMUA Foundations v2（2026-07-18）

`tmua-foundations-v2` 已完成可体验的 7 章学习链路：考试结构与无计算器策略、逻辑/证明/反例、代数/函数/图像、数列/坐标几何/三角、指数/对数/微积分、数学推理/选项辨析，以及真题训练/证据化复盘；包含 A-Level/IAL、IB AA HL/SL、IB AI HL、AP Precalculus + Calculus 的具体课程衔接，9 道满托原创逐步例题和 12 道主动回忆题。版本化源位于 `content/notes/tmua/foundations-v2.json`，Web 路由与 25 页 A4 PDF 共用该源。

该 revision 状态仍为 `teaching-preview`。核心学习章节已经补齐，但独立学科教师逐章复核、权利/相似度、双语术语，以及手机、平板、电脑和 A4 PDF 的实机终审仍是升级为正式发布版的必要门。

### ESAT Mathematics Starting Review Notes v0.1.0（2026-07-19）

`esat-mathematics-foundations-v1` 已完成 Mathematics 1 与 Mathematics 2 的首个站内学习切片：15 个一级知识单元与课程覆盖引擎使用同一组稳定 ID，学生先选择专业模块并填写 A-Level/IAL、IB 或 AP 课程，页面才显示相应的课程桥接、6 套“识别信号 → 标准动作 → 最后检查”方法、2 道满托原创逐步例题和 6 组主动回忆。版本化源位于 `content/notes/esat/mathematics-foundations-v1.json`，站内路由为 `/exams/esat/notes/mathematics`。

该 revision 使用 ESAT Content Specification 与 Notes on Mathematics 的本地 SHA-256 锚点核对考试事实、M1–M7、MM1–MM8 和术语，不复制官方题面、例题或讲解。网页与 10 页 A4 PDF 共用同一 JSON revision。它仍是 `teaching-preview`：细颗粒章节，以及独立数学教师、双语术语、权利/相似度、中国学生理解和三类设备终审仍未完成。通用数据模型和页面/PDF 渲染器已经独立验证，后续考试不得另造一套不兼容 Notes 页面。

### ESAT Science Starting Review Notes v0.1.0（2026-07-19）

`esat-sciences-foundations-v1` 已完成 Physics、Chemistry 与 Biology 的首个站内学习切片：覆盖 P1–P7、C1–C17、B1–B11 共 35 个一级知识单元，并依据学生的专业计划只显示需要参加的理科模块。页面在完成专业与课程档案后，提供 A-Level/IAL、IB、AP 课程桥接、9 套“识别信号 → 标准动作 → 最后检查”方法、3 道满托原创逐步例题和 9 组主动回忆。版本化源位于 `content/notes/esat/sciences-foundations-v1.json`，站内路由为 `/exams/esat/notes/sciences`。

该 revision 使用 ESAT Content Specification 以及 Physics、Chemistry、Biology 三份 Guide 的本地 SHA-256 锚点核对范围和术语，不复制官方题面、例题或讲解。网页与 16 页 A4 PDF 共用同一 JSON revision。与数学 revision 合并后，ESAT 五个模块的 50 个一级知识单元已有完整顶层入口；但这仍不是完整教材。细颗粒章节，以及独立理化生教师、双语术语、权利/相似度、中国学生理解和实机终审仍未完成。

### TARA Reasoning and Writing Starting Review Notes v0.1.0（2026-07-19）

`tara-reasoning-writing-foundations-v1` 已完成 TARA 的首个站内学习切片：Critical Thinking 七类能力、Problem Solving 三类能力、Writing Task 三问结构与中英论证术语共同组成 4 个模块、21 个顶层知识单元；学生必须先填写本人 TARA 背景档案，页面才开放 4 类课程桥接、12 套“识别信号 → 标准动作 → 最后检查”方法、4 道满托原创逐步例题和 12 组主动回忆。版本化源位于 `content/notes/tara/reasoning-writing-foundations-v1.json`，站内路由为 `/exams/tara/notes/foundations`。

该 revision 使用 TARA Content Specification 与 Question Guide 的本地 SHA-256 锚点核对三模块结构、题型名称、40 分钟、22+22 道选择题、三题选一、750 词和工具限制，不复制官方题面或讲解。网页与 17 页 A4 PDF 共用同一 JSON revision。Critical Thinking 与 Problem Solving 现已各有一套 22 题/40 分钟满托原创完整模考，覆盖官方七类与三类能力。它仍是 `teaching-preview`：七类批判思维逐类训练、Problem Solving Appendix 细颗粒基础题组、完整写作范文与人工 rubric，以及独立推理/写作教师、双语、权利/相似度、难度/用时、学生理解和实机终审仍未完成。

### LNAT Argument Reading and Writing Starting Review Notes v0.1.0（2026-07-19）

`lnat-reading-writing-foundations-v1` 已完成 LNAT 的首个站内学习切片：Section A 论证阅读、Section B 限时写作、EAL 长句与证据边界、95+40 分钟节奏共同组成 4 个模块、21 个顶层知识单元；学生必须先填写本人 LNAT 背景档案，页面才开放 4 类课程桥接、12 套方法、4 道满托原创逐步例题和 12 组主动回忆。版本化源位于 `content/notes/lnat/reading-writing-foundations-v1.json`，站内路由为 `/exams/lnat/notes/foundations`。

该 revision 使用本地 LNAT Preparation Guide 与 Practice Test Commentary 的 SHA-256 锚点核对不要求法律知识、文章论证阅读、文本证据、选题、写作结构和节奏原则，不复制官方文章、题目、选项或讲解。网页与 16 页 A4 PDF 共用同一 JSON revision。它仍是 `teaching-preview`：逐题型题组、更多长文章、完整写作范文与人工 rubric，以及独立阅读/写作教师、双语、权利/相似度、学生理解和实机终审仍未完成。

### UCAT Four-Subtest and High-Speed Pacing Starting Review Notes v0.1.0（2026-07-19）

`ucat-four-subtest-foundations-v1` 已完成 UCAT 的首个站内学习切片：Verbal Reasoning、Decision Making、Quantitative Reasoning、Situational Judgement 与工具/极限节奏共同组成 5 个模块、25 个顶层知识单元；学生必须先填写本人 UCAT 背景档案，页面才开放 4 类课程桥接、15 套方法、5 道满托原创逐步例题和 15 组主动回忆。版本化源位于 `content/notes/ucat/four-subtest-foundations-v1.json`，站内路由为 `/exams/ucat/notes/foundations`。

该 revision 使用本地 2026 Test Format、Test Tools 网页快照与 Preparation Checklist 的 SHA-256 锚点核对四模块、题量、时长、计分边界、计算器/快捷键/标记和官方准备顺序，不复制官方互动题库、文章、情境、选项或讲解。网页与 20 页 A4 PDF 共用同一 JSON revision。四模块的原创短诊断和完整结构模考已经全部进入站内练习，其中 SJT 全卷为 21 情境/69 题/26 分钟，并覆盖等级与 Most/Least 两类交互；这些内容仍是 `teaching-preview`，独立 UCAT 教师、英国医疗/牙科专业判断、双语、权利/相似度、学生理解和实机终审仍未完成。官方一般准备建议只可作为群体参考，不是个人训练或成绩承诺。

### 跨考试 A4 生成与验证（2026-07-19）

ESAT 数学、ESAT 理科、TARA、LNAT、UCAT 五套下载版共 79 页，由 `scripts/build-review-notes-pdfs.py` 从上述五份 JSON 确定性生成。`content/products/review-notes-pdf-assets.json` 锁定每份源 JSON 的 SHA-256、输出与公开路径、页数、字节数和 PDF SHA-256；`pnpm verify:review-notes-pdfs` 会校验源、文件、目录和产品注册表的一致性。生成器嵌入经过哈希固定、按 OFL 保存许可文本的 Noto Sans CJK SC，避免不同机器替换中文字体。79 页已经全部渲染并检查分页；真实设备、物理打印和独立教研终审仍是最终 publication revision 的必要门。
