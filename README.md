# Admission Test Breaker · 入学考试练习场

Admission Test Breaker 是由满托发起的开源英国大学入学考试学习基础设施。项目以学生拥有的私密学习空间为核心，把可信题目、练习过程、授权协作、公平 Benchmark 和可审计的 AI 解读连接起来，帮助学生更从容地准备 TMUA、ESAT、TARA、LNAT、UCAT 等考试。

## 产品边界

- 题目内容、数据结构和贡献工具可以开放协作；学生学习数据永不作为开放数据发布。
- 基础练习与训练尽可能免费；未来的深度 AI 解读和满托专业服务可以收费。
- 学生是数据拥有者。老师、家长和外部 Agent 只能在学生逐项、限时、可撤销的授权下访问。
- Benchmark 只在样本、分层与置信度足够时展示，不制造虚假排名或焦虑。
- 满托是发起者、运营者与可选择的服务提供方，而不是学生数据的所有者。

完整产品原则见 [产品宪章](docs/product/PRODUCT_CHARTER.md)，模块和数据边界见 [系统架构](docs/architecture/SYSTEM_ARCHITECTURE.md)，交付顺序和独立验证层见 [总路线图与验证矩阵](docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md)。

## 当前可运行成果

当前版本已经交付公开多考试入口、TMUA 资料真相层和第一个可本地体验的 Reference Journey：

```text
识别 TMUA / ESAT / TARA / LNAT / UCAT
→ 进入 TMUA 公开考试介绍
→ 填写课程体系、模块与练习经历
→ 查看课程已经覆盖和仍需确认的知识
→ 在个人准备首页直接开始一套完整在线真题
→ 从 18 套历年真题中选择原卷练习
→ 查看基于本次证据的结果
→ 在本人学习记录中回看频率、活跃用时、改答、模块和中英知识主题
→ 在 Early Specimen Paper 1 结果页按权限查看 20 道逐题深度解析
→ 从具体题号提交站内纠错并获得本人可见回执
→ 在线阅读 TMUA 双语基础 Notes 或下载 A4 PDF
```

首页使用满托配色的暖纸招生简章风格，以“不再为升学考试而焦虑”为首要承诺，并直接提供五项考试入口。进入考试后，顶部导航会随当前考试切换，例如显示“TMUA 概览”或“ESAT 专业定位”，同时保留一个轻量考试切换器。TMUA 不再把课程信息、练习、真题和资料塞在同一长页面，而是拆为公开介绍、课程信息、知识覆盖、个人准备首页、30 分钟诊断说明、历年真题和模考/笔记入口等独立路由。历年真题页用九个醒目年份卡片呈现 Early Specimen、2016 Practice 与 2017—2023，每张卡片直接提供 Paper 1 和 Paper 2；18 套均可进入 75 分钟在线会话，完成作答、改答、标记、计时、提交和评分。

ESAT 已增加 2027 Entry 本地专业要求库：覆盖 Cambridge、Imperial、Oxford 和 UCL 的 56 项 UCAS 专业要求，学生可以同时加入最多五个选择，系统不用实时 AI 即可计算确定模块、可选组合或互相冲突的申请组合。ESAT 采用独立页面的分阶段路径：“选择专业与模块 → 填写 A-Level/IAL、IB 或 AP 课程 → 查看所选模块的课程覆盖初判 → 进入个人准备 → 真题 / 模考与笔记入口”。专业选择和课程信息保存在当前设备；覆盖层已按官方 Content Specification 保存 50 个一级知识单元，并逐项显示“已覆盖、需要确认、需要补充”的中英文清单。固定课程映射不会消耗实时 Token，也不能替代具体考试局课程规格核验或能力诊断。

TARA、LNAT、UCAT 也采用分阶段路径：“填写本人背景 → 查看逐模块起点定位 → 选择免费在线练习”。起点定位是独立页面和版本化 `preparation-map` 产品，由固定规则分别列出每个模块可迁移的课程基础、具体中英文缺口、第一轮入门/复习/短诊断时间以及直接练习入口，全程不调用实时 AI。第一轮时间不是总备考时长，课程背景也不是能力证据；学生提交练习后，五项考试各自的“学习记录”页面才使用保存次数、频率、每题活跃用时、改答、原始结果、模块和中英知识主题形成下一层事实报告。147 个当前已发布知识标签全部进入版本化双语词表；发布测试会阻止未翻译的机器标签进入界面。该报告不输出官方换算分、百分位、能力定论、录取概率或总训练时长。

ESAT 五个模块现在都已有一套满托原创的 10 题、20 分钟原生短诊断，共 50 道题。学生完成专业/模块定位后，页面只显示该专业需要的 Mathematics 1、Mathematics 2、Physics、Chemistry 或 Biology 模块，并直接进入共享在线练习内核，保存作答、改答、计时、提交、事实型得分与题目纠错。五套当前均为 `teaching-preview`：不是官方 ESAT 真题，也不根据 10 题推断录取概率或正式百分位；对应学科教师、双语术语和三类设备终审完成前不会冒充终审产品。

ESAT 五个模块都已有按专业模块和本人课程档案显示的站内复习笔记。`/exams/esat/notes/mathematics` 呈现 Mathematics 1/2 全部 15 个一级单元；`/exams/esat/notes/sciences` 按专业只呈现需要的 Physics、Chemistry、Biology 模块，共覆盖另外 35 个一级单元。两页合计提供 A-Level/IAL、IB、AP 课程桥接、15 套“识别信号 → 标准动作 → 检查”方法、5 道满托原创逐步例题和 15 组主动回忆。页面和 A4 PDF 读取同一份版本化 JSON：数学 10 页、理科 16 页；Content Specification 及四份模块 Guide 的本地 SHA-256 只作为范围锚点，官方题面和讲解没有被复制。这些 revision 仍是 `teaching-preview`，细颗粒章节以及独立学科、双语、相似度、学生理解和实机终审仍待完成。

练习层已经采用 A 方案：一个共享会话内核负责考试无关的开始、计时、作答、标记、提交和事件记录；版本化考试 registry 分别配置 TMUA、ESAT、TARA、LNAT、UCAT 的模块、题量、时间、题型和计算器规则；单选、多选、五陈述、SJT 等级/Most-Least 与写作使用显式响应适配器。题目、正确答案和事实型结果保持免费，但 23 项原生练习都会先要求完成不含联系方式的本人档案，以便按考试保存可解释的准备证据；逐题完整解析、错误类型和个性化解读使用独立的考试级 entitlement。权限只控制增值解读，不能用来遮挡已经发布的题目或基础结果；没有真实已发布正文的考试页面不会显示“按需解锁”承诺。

官方 ESAT 来源清单的 39 份文件已经全部进入 Git 忽略的内部研究快照，并逐项核验本地路径、文件大小和 SHA-256；其中包括课程清单、Content Specification、5 份模块 Guide，以及 2016—2023 ENGAA/NSAA 的 16 组题目与答案。当前仍是 **39 份内部研究归档、0 份获准公开发布**，不能把下载完成等同于拥有商业再发布权。五套短诊断，以及 Mathematics 1、Mathematics 2、Physics、Chemistry、Biology 五套各 27 题/40 分钟的完整模考，均为满托独立创作；五套完整模考分别覆盖 M1–M7、MM1–MM8、P1–P7、C1–C17 与 B1–B11，只报告原始正确数，不冒充官方 1–9 分。连同短诊断，ESAT 已有 185 道原创在线题。覆盖数学、物理、化学、生物全部 50 个一级单元的 Notes 教学预览也已经上线；当前剩余的是五模块独立人工终审、细颗粒 Notes 章节与历史题面权利确认，而不是顶层模块缺失。TARA 现在有 10 道满托原创推理短诊断，以及 Critical Thinking、Problem Solving 各 22 题/40 分钟的完整模块模考，合计 54 道原创在线推理题；Writing Task 也已提供 3 道原创题三选一、40 分钟、750 词上限的私密自动保存编辑器和事实型提交结果。两套完整推理模考覆盖官方七类 Critical Thinking 和三类 Problem Solving 能力，只报告原始正确数。`/exams/tara/notes/foundations` 在本人 TARA 档案后提供 4 模块、21 个顶层知识单元、12 套方法、4 道原创逐步例题与 12 组主动回忆，并可下载同源 17 页 A4 教学预览。官方 Content Specification 和 Question Guide 只作为范围与结构锚点；当前剩余的是细颗粒题组、独立推理/写作教师终审、难度与用时标定，以及写作 rubric 和人工反馈。

LNAT 的 12 份官方可下载 PDF/RTF 已进入同一内部研究层并记录 SHA-256，其中包含两套 Practice Test、Mark Scheme、Commentary、三份 Sample Essay 与 Preparation Guide；原件均保持 `rights_review_required_before_republication`，不会进入浏览器资源。本站 Section A 内容完全独立命题：先有 3 篇/12 题/30 分钟短诊断，再有单独的 12 篇/42 道四选一题/95 分钟完整结构模考，合计 54 道原创在线题；电脑端使用左文右题界面，手机和平板顺序阅读。完整模考只报告 42 分原始正确数，不冒充官方卷、官方等值难度或院校 Benchmark。Section B 已提供 3 道原创题三选一、40 分钟、建议 500–600 词、750 词上限的私密自动保存编辑器；提交后只返回题目、正文、字数和活跃用时，不虚构自动写作分数。`/exams/lnat/notes/foundations` 在本人 LNAT 档案后提供 Section A、Section B、EAL 证据边界和 95+40 分钟节奏共 4 模块/21 单元、12 套方法、4 道原创例题与 12 组主动回忆，并可下载同源 16 页 A4 教学预览。42 题全卷仍需独立 LNAT 教师、英语、干扰项、学生用时和三端人工终审；写作 rubric、标定样例、细颗粒章节和人工反馈也仍未完成。

UCAT 的 2026 Flyer、Preparation Checklist、Poster、官网快照和 GDC 职业规范锚点已进入内部研究层并保持商业使用需另行许可。本站四个分测验都已有满托原创原生短诊断与完整结构模考：Verbal Reasoning 为 3 篇/12 题短诊断加 11 篇/44 题/22 分钟全卷；Decision Making 为 8 道短诊断加 35 题/37 分钟全卷，其中 6 组五陈述题按全对 2 分、错一项 1 分计；Quantitative Reasoning 为 4 组数据/10 题短诊断加 9 组数据/36 题/26 分钟全卷，并提供响应式表格和基础计算器；Situational Judgement 为 3 个情境/10 题短诊断加 21 个情境/69 题/26 分钟全卷，包含 30 道适当性、30 道重要性等级题和 9 道 Most/Least 配对题。八套共 224 题，均可计时、私密保存、提交和查看事实型原始结果。SJT 等级题完全匹配得 1 分、相邻等级得 0.5 分，Most/Least 两项全部匹配得 1 分；页面只报告满托原创卷原始分，不换算 300–900、百分位或正式 SJT Band。`/exams/ucat/notes/foundations` 在本人 UCAT 档案后提供 VR、DM、QR、SJT 和工具/节奏共 5 模块/25 单元、15 套方法、5 道原创例题与 15 组主动回忆，并可下载同源 20 页 A4 教学预览。四套全卷仍是 `teaching-preview`；独立 UCAT 教研、英国医疗/牙科专业判断、语言、学生用时、细颗粒章节和设备终审仍未完成。

TMUA 的 18 套、360 道历年题已经全部采用原生逐题结构化排版，以 KaTeX 渲染公式、以仓库内安全 SVG 呈现需要的图形；浏览器不再获得任何一套完整原卷 PDF。所有题目的来源 SHA-256、原卷页码和官方答案均进入机器可读 manifest 与独立验证。学生在消耗历年真题前还可以完成 8 道/30 分钟满托原创起点诊断，覆盖代数、几何、数列、三角、微积分和证明推理，并复用计时、保存、标记、提交、基础结果和学习记录链路；它不会伪造官方尺度分、百分位或录取概率，独立数学教师复核和真实学生用时标定仍待完成。Early Specimen Paper 1 又完成了逐页 PDF 视觉复核，修正 12 道旧转录错误；其 20 道原创中文教学解析逐题包含方法、推导、易错点和下一步训练，并只在服务端确认 `tmua-deep-review` 或 `tmua-full-access` 后返回。可以体验 CAIE 9709/9231 或 Pearson IAL Mathematics/Further Mathematics 的精确资格与模块档案，以及基于课程规格的首版确定性覆盖映射。覆盖报告用中英文同时展示每个知识领域，并明确区分“课程已覆盖，先复习且暂不需要额外知识课”“部分覆盖，先查缺口”和“课程档案未显示覆盖”；每项列出具体复习/补学主题和保守的教师备课时间区间。它不会把课程覆盖冒充实际掌握，也不会把时间区间冒充能力 Benchmark。

UAT-UK、Pearson VUE、LNAT 与 UCAT 的当前官方资料来源已经进入本地版本化 registry。由于官方使用条款对商业使用、修改和再发布有限制，未经书面许可的官方 PDF 不会进入可发布内容库、公开 Web 资源或被转换为可发布题目。ESAT 权利风险与解锁门见 [ESAT 内容权利风险评估](docs/legal/ESAT_OFFICIAL_CONTENT_RIGHTS_RISK.md)。

内部研究层已另外保存 23 个官方备考页面快照和 184 份可下载 PDF/RTF，并逐项记录 SHA-256、大小、来源页面和权利状态；第 184 份是只用于 UCAT SJT 原创内容覆盖审计的 GDC 职业规范，不是 UCAT 答案键。原件位于 Git 忽略的 `content/official/raw/`，不会进入开源仓库或公开网站；`content/official/research-asset-inventory.json` 只保存可审计的清单。可通过 `pnpm official:sync-research` 更新、用 `pnpm verify:official-research` 校验本机原件。面向中国学生的原创 Notes 模块、课程体系桥接、免费/增值边界和审核顺序见 [复习 Notes 蓝图](docs/content/CHINA_STUDENT_REVIEW_NOTES_BLUEPRINT.md)。

公开 CI 和生产构建不会读取上述 raw 目录。Feature manifest 只能引用进入 Git 的 inventory、SHA-256 记录和原创转换产物；这样官方原件继续留在内部教研层，同时任何干净 GitHub checkout 都能独立复验产品主张。

`pnpm verify:esat-assets` 只核对进入 Git 的 39 项 ESAT 来源记录、research inventory、SHA-256 和公开摘要，不读取私有原件；内部教研机器需要额外运行 `pnpm verify:esat-raw-assets` 才会逐文件重算大小和摘要。两者不能互相冒充。

TMUA Notes `2026.07-v2` 已经从首版模板扩展为完整学习链路：`/exams/tmua/notes/foundations` 提供考试地图、逻辑与证明、代数与函数、数列/几何/三角、指数/对数/微积分、数学推理和真题复盘 7 章，明确列出 A-Level/IAL、IB AA/AI 与 AP 学生通常已经覆盖和仍需确认的具体知识。正文、9 道逐步例题和 12 道主动回忆题均为满托原创；官方资料只用于核对考试事实与范围。网页和 25 页 A4 PDF 读取同一份版本化 JSON，避免两套内容漂移。当前仍标记为 `teaching-preview`：可用于学习体验，但在独立学科教师、相似度、双语术语和实机版面终审前不冒充正式终审版。

全站资料已经从“按页面临时拼接”迁移到版本化资料产品：`content/products/catalog.json` 统一记录单项版本、核验日期、考试、内容类型、发布状态、访问方式、真实权限包、本站路由、权利基础和验证证据；`/library` 以及各考试的“题库与资料”页面只展示真正能够在本站打开的产品。当前注册表有 40 项可用产品和 1 项仅内部审核的组合 Notes 蓝图，其中包括 TMUA 30 分钟起点诊断、ESAT 五模块短诊断与五模块完整模考、ESAT 数学与理化生 Notes、TARA 推理短诊断、两套完整推理模考、写作与 Notes、LNAT Section A 短诊断与 42 题完整结构模考、Section B 写作、UCAT 四模块短诊断与四套完整结构模考及节奏复习笔记，以及 TARA、LNAT、UCAT 三项逐模块起点定位；35 个不同站内产品路由会逐一完成运行时加载。TMUA 25 页 PDF 加上 ESAT、TARA、LNAT、UCAT 的五套 79 页 PDF 都与网页正文共用版本化源；后五套的 source/output/public SHA、页数和大小由 `content/products/review-notes-pdf-assets.json` 锁定。两个真实邀请码资产分别是 `TMUA 六周精确训练计划` 与 `Early Specimen Paper 1 逐题深度解析`。逐题解析产品通过 `relatedPracticeIds` 与真实练习建立目录级关系；结果页同时核对产品 ID、题目资源映射与已发布权限包，关系不一致就停止承诺。学生完成对应练习后可以直接联系冰冰或输入已有邀请码，注册、登录或邮件确认完成后会返回原结果页；返回地址只接受站内路径并在兑换后清除，不能成为站外跳转或授权旁路。`content/products/asset-lifecycle.json` 进一步要求每个 content 文件具有唯一生命周期归属，`pnpm verify:product-lineage` 会阻止“有文件、无产品”的漂移。`content/products/release-readiness.json` 再把目录、功能证据和人工检查合成逐产品发布门：目前 40/40 个公开产品的自动主张均通过，但 0/40 完成封闭 Beta 所需的人工签字；学科、双语、权利/相似度和真机检查不会被 E2E 自动冒充为人工通过。`content/products/manual-review-worklist.json` 把重复阻塞项合并为 68 个可执行审核任务：25 个学科/双语/权利任务、12 个真实学生理解与用时标定任务、31 个设备/无障碍任务；每项列出负责人角色、产品版本、全部路由、证据要求和回写位置。已通过的人工项必须同时记录审核者、角色、日期和证据，生成清单本身不能代签。私密正文都由服务端按 entitlement 交付，不进入前端 bundle 或公开目录；授权撤销后服务端立即停止返回。数据库签发门要求每个邀请码权限包至少包含一项已经发布的真实私有资料；只有草稿占位的 ESAT、TARA、LNAT、UCAT 深度解析包不能生成邀请码。逐题解析以本地 JSON 为唯一内容源，`pnpm content:build-tmua-deep-review` 自动计算摘要并生成对应数据库 migration，避免教研正文与数据库副本漂移。

PDF 数据化流水线保存逐题来源页、选项草稿、官方答案、解析引用和异常警告；自动提取 staging 始终保持 `needs_review` 和 `publishable: false`，发布内容另存为审核后的 typed dataset。项目同时提供 MinerU `content_list_v2.json` 的本地规范化适配层，把标题、正文、公式、图片、表格、页码和坐标转换成平台稳定 JSON。任何解析 backend 都不能绕过独立审核进入在线题库。详细决策见 [MinerU 内容导入基础](docs/content/MINERU_CONTENT_IMPORT_FOUNDATION.md)。

当前版本仍是本地预览：已有本地 Supabase 身份、邀请码、内容 entitlement、Learner Space、PostgreSQL/RLS 和追加式学习事件底座，并提供“邀请码 → 注册/登录 → 自动解锁 → 打开真实资料”的页面闭环。未登录时，课程与练习只进入随机的本机 Guest Space；最近 30 份完整练习快照保存在当前浏览器，并与“当前会话”指针分离，因此提交后仍可打开历史结果。登录后，auth-aware 适配器会把当前设备上的 Guest 档案、当前会话和历史快照幂等归入学生自己的 Learner Space，成功后清除未隔离的本地副本；同步失败不删除来源数据。TARA、LNAT、UCAT 练习会先要求填写各自的最小背景档案，按 `Guest/Learner Space + exam` 隔离；TMUA 与 ESAT 继续使用各自更精确的课程路径。邀请码只授予内容权限，不会授权冰冰、老师或家长读取学习数据。冰冰现在可以由 service-role 显式授予可撤销的邀请运营能力：只能看到可真实交付的资料包，只能签发、查看和撤销自己创建的有限邀请码，审计不保存明文 code 或学生身份；该角色不会取得任何学生档案、答案、学习事件或他人邀请码权限。通过账号页的二次运营角色校验后，冰冰可以进入 `/operations/invites` 签发有限邀请码、复制一次性明文、查看核销次数与本人审计，并撤销本人代码。`/privacy` 已提供学生可理解的中英双语分层说明，账号页可以导出机器可读 JSON，并在重新验证密码和精确文字确认后删除本人账号及活动数据库学习记录。`/feedback` 允许学生从具体题号提交内容错误、技术、账号或隐私问题，使用确定性 P1-P4 分级，提供本人可见回执和私有审计；它不自动附加答案或学习记录，并拒收邮箱和手机号。满托关键转化另有不连接账号的第一方漏斗，只允许六个固定动作和 session-scoped 随机 Journey ID；没有邮箱、IP、设备、课程、答案或任意 payload，所有浏览器角色都不能读取原始行。创始人可由 service-role 单独授予、立即撤销 `product_funnel_viewer`，通过账号页进入 `/operations/funnel`；页面只展示按考试与阶段汇总的 7/30/90 天匿名 Journey 数，不会取得邀请码运营或学生数据权限。数据库的 157 项 pgTAP 测试和真实本地 HTTP 流程已验证邀请运营与转化看板分别授予/撤销、普通学生拒绝、第二运营者隔离、明文 code 不进入审计、匿名漏斗追加与聚合最小权限、按考试隔离的背景档案、课程档案/会话写入、事件重复同步、本人导出、反馈隔离/去重/分诊、第二账号隔离、账号删除、草稿权限包拒绝签发，以及六周计划和 20 题解析在未授权、授权、跨用户与撤销状态下的读取边界。本地 Supabase 的确认邮件不会发送到真实邮箱；注册完成页会提供 `http://127.0.0.1:54324` 的本地确认邮箱入口。

生产发布底座已经进入仓库：多阶段 Docker 镜像以非 root、只读根文件系统运行，在启动时注入 browser-safe Supabase 配置，并提供 `/healthz`、`/version.json`、CSP 和 HTTPS compose；GitHub CI 会分别执行应用、数据库、Chromium 桌面/iPad/手机关键旅程、全数据库恢复、100 用户容量和真实容器检查。真题注册表与 360 道 TMUA 正文只在练习路由加载，KaTeX 样式只在公式内容出现时加载；`pnpm verify:web-performance` 独立阻止首屏入口、首屏 JS/CSS 或任一异步包越过固定预算。2026-07-18 的本地恢复演练完整比对了 Auth 用户、Learner Space、7 项内容资源、2 份私密 payload、反馈/审计标记与 16 条 RLS policy；100 个隔离用户以并发 10 完成邀请码、课程档案、开始练习、提交和反馈，本机 p95 为 51ms。运行手册见 [100 人 Beta 发布与恢复手册](docs/operations/PRODUCTION_BETA_RUNBOOK.md)和[站内反馈与题目纠错运行手册](docs/operations/FEEDBACK_AND_CONTENT_CORRECTION_RUNBOOK.md)。这些是代码和本地容量证据，不是真实设备或生产环境证据。

这还不是生产上线：尚未创建或绑定满托的云端 Supabase 项目，正式域名与 SMTP 尚未配置；注册、登录和密码重置已经接入失败关闭的 Cloudflare Turnstile 前端、CSP、runtime 配置和 Supabase Management API 自动化，但真实 hostname site key/secret 尚未写入云项目并完成端到端验证。平台备份恢复、反馈主/备负责人和真实告警接收人仍待完成；隐私控制者/联系信息、lawful basis、DPIA、数据地区与跨境机制、具体保留期限、正式数据纠正/限制/投诉流程和学生逐项 Grant 也未终审。新迁移还没有在满托的云项目上通过跨设备恢复和备份删除验证。因此当前版本仍不能用于收集真实学生的长期私密数据。30 分钟/8 题固定诊断已经作为明确标注边界的原创 teaching preview 开放，现有真题不会被拆出冒充诊断；在教师复核和学生标定前，它只返回事实型原始结果。完整原始资料库继续只读并留在仓库外，公开 Web 资源中不再包含完整原卷 PDF；生产环境仍需按题授权、限速、异常抓取检测、水印和访问审计。浏览器已经显示的内容无法做到绝对防复制。

### 学生授权协作的当前状态

上文的 157 项为协作切片之前的历史数量。当前整套是 **201 项 pgTAP**，其中新增 44 项专门证明学生创建老师/家长一次性协作码、五项权限分离、考试和有效期范围、第三账号拒绝、schema-v4 导出、学生可见审计和即时撤销。学生从账号页进入 `/account/sharing`；接收者登录自己账号后在 `/collaboration/redeem` 兑换，再进入只含学生明确授权的工作区。这不会让冰冰运营角色、资料 entitlement 或漏斗看板自动获得学习数据。

这一切仍是本地验证，并不意味着学生 Grant 已在生产上线。上线前必须部署三项 collaboration migration，使用学生和协作者两个 MFA 账号在真实域名演练限权读写/审计/撤销，并完成手机、iPad、电脑与屏幕阅读器 UAT。

## 本地运行

需要 Node.js `^22.13.0` 或 `>=24.0.0`，以及 pnpm `10.14.0`。

```bash
pnpm install
pnpm supabase:start
pnpm supabase:reset
pnpm dev
```

网站固定打开在 `http://127.0.0.1:57145/`。首次本地配置可从 `.env.example` 复制浏览器公开配置；浏览器只允许填写 Supabase URL、publishable key 和可公开的 Turnstile site key，严禁把 service-role key 或 Turnstile secret 写进任何 `VITE_*` 变量。本地未填写 site key 时账号流程保持可测试；staging/production 缺少 runtime site key 会直接停止账号提交。

完整独立验证：

```bash
pnpm verify
```

100 人封闭 Beta 的当前发布准备度和严格门禁：

```bash
pnpm beta:audit
pnpm beta:gate
pnpm production:preflight
pnpm production:bootstrap-plan -- --config deploy/bootstrap-input.local.json
```

当前 `beta:gate` 预期失败：两项真实 entitlement 资料、本地全数据库恢复和 100 用户容量已经闭环，未发布的多考试深度解析承诺也已从公开页面删除；但生产 Supabase/邮件、学习数据的生产部署与跨设备验证、未成年人最终隐私权利、平台备份恢复和真实监控接收人仍有 P0 未关闭。详见 [100 人封闭 Beta 上线评估](docs/BETA_100_LAUNCH_READINESS.md)。

`production:preflight` 是只读且不泄密的生产配置检查：它读取 GitHub Environment 中已配置的 secret **名称**和公开 variable，不读取 secret 值，并分别报告 GitHub setup、当前 release candidate 与仍需人工证明的生产条件。当前真实检查显示 `staging` 与 `production` Environment 都尚未创建。配置完成后可使用 `pnpm production:bootstrap-gate` 和 `pnpm production:release-candidate-gate` 作为更严格的子门；它们不能替代最终 `beta:gate`。

不熟悉 GitHub GUI 时，复制 `deploy/bootstrap-input.example.json` 为被 Git 忽略的 `deploy/bootstrap-input.local.json`，只填写两个公开 HTTPS origin、production reviewer 和八个本机 secret 环境变量的**名称**。`production:bootstrap-plan` 默认只输出计划；只有 `pnpm production:bootstrap-apply -- --config deploy/bootstrap-input.local.json --confirm CONFIGURE_MANTUO_PRODUCTION_CONTROL_PLANE` 才执行外部写入。执行前会一次检查全部 secret 来源，任一缺失则零写入；secret 值只通过 stdin 进入 GitHub CLI，不写配置文件、命令参数或日志。完整边界见生产运行手册。

该命令依次检查架构边界、机器可读功能主张与证据、MinerU 内容规范化、TMUA corpus 一致性、PDF 提取 staging、18 套在线真题资源、全部测试、严格 TypeScript 和生产构建。功能验证层也可以单独运行：

```bash
pnpm verify:features
pnpm verify:supabase-contracts
pnpm verify:production-platform
pnpm verify:production-bootstrap
pnpm verify:web-performance
pnpm verify:content-imports
pnpm verify:tmua-extractions
pnpm verify:tmua-online-papers
pnpm verify:review-notes
pnpm verify:review-notes-pdfs
pnpm verify:content-release-readiness
pnpm verify:manual-review-worklist
pnpm verify:manual-review-ledger
pnpm verify:tmua-notes
pnpm verify:entitled-content
pnpm verify:feedback
pnpm verify:product-funnel
pnpm verify:funnel-analytics
pnpm verify:learning-record
pnpm verify:e2e
pnpm verify:private-content-bundle
```

Notes PDF 可按结构化源重新生成：

```bash
pnpm notes:build-tmua-pdf
pnpm notes:build-review-pdfs
pnpm content:build-release-readiness
pnpm content:build-manual-review-worklist
```

68 项人工内容/学生标定/真机审核不是自动测试。先查看并生成当前版本审核包：

非技术教研人员现在可以在独立权限的 `/operations/content-review` 内部审核台按考试和审核类型查看同一份 68 项当前队列、打开实际产品页面并下载证据 Markdown 与决定草稿。队列只由 `SUPABASE_SERVICE_ROLE_KEY` 通过 `pnpm content-review:sync:apply` 同步；普通学生、邀请码运营者和转化看板查看者都不能读取。审核台不会直接批准产品：草稿默认 `changes-requested`、`attested: false` 且没有证据哈希，最终仍必须由内容负责人使用 `review:record` 进入版本化账本。当前人工通过数量因此仍是 0/40，而不是因新增页面自动上调。

```bash
pnpm review:list
pnpm review:prepare -- --review-key <feature/check> --output output/manual-review
```

完成隐私安全的审核报告并放入 `verification/reviews/evidence/` 后，填写 draft 中的角色引用、审核者、结论和 attestation，再记录并重建发布视图：

```bash
pnpm review:record -- --input <decision-draft.json>
pnpm content:build-release-readiness
pnpm content:build-manual-review-worklist
```

决定会固定当前源文件和证据 SHA-256；旧决定在内容变化后自动失效，`changes-requested` 不会放行，证据被修改会使发布验证失败。命令提供证据链，不代替真实审核者。

需要 Docker 和正在运行的本地 Supabase 时，可以额外执行完整数据库与 HTTP 集成验证：

```bash
pnpm verify:supabase
pnpm verify:recovery-local
pnpm verify:beta-load-local
```

实际容器或云端部署可另外验证：

```bash
DEPLOYMENT_BASE_URL=https://practice.example.com \
EXPECTED_RELEASE=<commit-sha> \
EXPECTED_ENVIRONMENT=production \
EXPECTED_SUPABASE_PROJECT_REF=<production-project-ref> \
pnpm verify:deployment
```

该验证会拒绝空值、占位 key、错误 Supabase project、release/environment 漂移或缺失 Turnstile，并请求真实托管 Auth health/settings；它不以“配置文件里出现字段名”代替线上证据。

## 文档层级

文档冲突时，遵循以下优先级：

1. `docs/product/PRODUCT_CHARTER.md`：使命、商业和信任边界；
2. `docs/architecture/SYSTEM_ARCHITECTURE.md`：系统模块、数据所有权和依赖规则；
3. `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`：阶段、发布门和验证责任；
4. `docs/superpowers/specs/`：具体工作流设计；
5. `docs/superpowers/plans/`：可执行开发步骤。

局部功能不得通过自己的规格绕过上位契约。
