# Admission Test Breaker · 入学考试练习场

Admission Test Breaker 是由满托发起的开源英国大学入学考试学习基础设施。项目以学生拥有的私密学习空间为核心，把可信题目、练习过程、授权协作、公平 Benchmark 和可审计的 AI 解读连接起来，帮助学生更从容地准备 TMUA、ESAT、TARA、UCAT 等考试。

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
识别 TMUA / ESAT / TARA / UCAT
→ 进入 TMUA 公开考试介绍
→ 填写课程体系、模块与练习经历
→ 查看课程已经覆盖和仍需确认的知识
→ 在个人准备首页直接开始 2023 Paper 1
→ 按需查看历年真题、知识覆盖、模考或复习资料
→ 查看基于本次证据的结果
```

首页使用满托配色的暖纸招生简章风格，以“不再为升学考试而焦虑”为首要承诺，并直接提供四项考试入口。TMUA 不再把课程信息、练习、真题和资料塞在同一长页面，而是拆为公开介绍、课程信息、知识覆盖、个人准备首页、30 分钟诊断说明、历年真题资料馆和模考/笔记入口等独立路由。历年真题页向所有访客公开 18 套已收录试卷的完整目录，并把“资料已收录”与“已经核验、可在线作答”分开显示；当前只有 2023 Paper 1 开放在线练习。个人准备首页只把这套已经可以完成的练习作为推荐动作；尚未开放的诊断和院校要求只显示审核状态。ESAT、TARA、UCAT 诚实显示为建设中，不提供虚假训练入口。

当前真正结构化、逐题核验并可在线作答的历年真题仍只有 TMUA 2023 Paper 1 的 20 道题。可以体验 CAIE 9709/9231 或 Pearson IAL Mathematics/Further Mathematics 的精确资格与模块档案，以及基于课程规格的首版确定性覆盖映射。覆盖报告用中英文同时展示每个知识领域，并明确区分“课程已覆盖，先复习且暂不需要额外知识课”“部分覆盖，先查缺口”和“课程档案未显示覆盖”；每项列出具体复习/补学主题和保守的教师备课时间区间。它不会把课程覆盖冒充实际掌握，也不会把时间区间冒充能力 Benchmark。完整练习继续支持计时、公式与图形、作答/改答/标记、本地自动保存与恢复、明确提交和证据型结果页。

PDF 数据化流水线已经开始运行。TMUA 2022 Paper 1 已生成第一套 20 题结构化 staging bundle，包含页级原文、题干与选项草稿、官方答案、Worked Solution、来源哈希和页码。项目同时提供 MinerU `content_list_v2.json` 的本地规范化适配层，把标题、正文、公式、图片、表格、页码和坐标转换成平台稳定 JSON。解析结果无论来自哪种 MinerU backend，都强制保持 `needs_review` 和 `publishable: false`，不会因为自动提取而进入在线题库。详细决策见 [MinerU 内容导入基础](docs/content/MINERU_CONTENT_IMPORT_FOUNDATION.md)。

当前版本仍是本地预览：已有本地 Supabase 身份、邀请码、内容 entitlement、Learner Space、PostgreSQL/RLS 和追加式学习事件底座，并提供“邀请码 → 注册/登录 → 自动解锁”的页面闭环。邀请码只授予内容权限，不会授权冰冰、老师或家长读取学习数据。数据库的 26 项 pgTAP 隔离测试和真实本地 HTTP 核销链路均可独立运行。

这还不是生产上线：尚未创建或绑定满托的云端 Supabase 项目，正式域名、SMTP、验证码/滥用防护、备份恢复、Guest 数据接管、服务端练习仓储和学生逐项 Grant 仍待完成；现有练习与课程信息仍保存在当前浏览器。因此当前版本不能用于收集真实学生的长期私密数据。30 分钟/8 题固定诊断也仍处于原创题审核阶段，现有真题不会被拆出冒充诊断。原始 PDF 保持只读且不进入 Git。

## 本地运行

需要 Node.js `^22.13.0` 或 `>=24.0.0`，以及 pnpm `10.14.0`。

```bash
pnpm install
pnpm supabase:start
pnpm supabase:reset
pnpm dev
```

网站固定打开在 `http://127.0.0.1:57145/`。首次本地配置可从 `.env.example` 复制浏览器公开配置；只允许填写 Supabase URL 和 publishable key，严禁把 service-role key 写进任何 `VITE_*` 变量。

完整独立验证：

```bash
pnpm verify
```

该命令依次检查架构边界、机器可读功能主张与证据、MinerU 内容规范化、TMUA corpus 一致性、PDF 提取 staging、全部测试、严格 TypeScript 和生产构建。功能验证层也可以单独运行：

```bash
pnpm verify:features
pnpm verify:supabase-contracts
pnpm verify:content-imports
pnpm verify:tmua-extractions
```

需要 Docker 和正在运行的本地 Supabase 时，可以额外执行完整数据库与 HTTP 集成验证：

```bash
pnpm verify:supabase
```

## 文档层级

文档冲突时，遵循以下优先级：

1. `docs/product/PRODUCT_CHARTER.md`：使命、商业和信任边界；
2. `docs/architecture/SYSTEM_ARCHITECTURE.md`：系统模块、数据所有权和依赖规则；
3. `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`：阶段、发布门和验证责任；
4. `docs/superpowers/specs/`：具体工作流设计；
5. `docs/superpowers/plans/`：可执行开发步骤。

局部功能不得通过自己的规格绕过上位契约。
