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
→ 进入 TMUA 备考中心
→ 建立可跳过的精确课程与练习经历档案
→ 查看历年资料状态
→ 完成 2023 Paper 1 的 75 分钟练习
→ 查看基于本次证据的结果
```

首页使用满托配色的暖纸招生简章风格，以“不再为升学考试而焦虑”为首要承诺，并直接提供四项考试入口。TMUA 备考中心展示 96 个导入 PDF 路径、46 个规范来源、18 套试卷和 360 道题目档案的公开摘要；ESAT、TARA、UCAT 诚实显示为建设中，不提供虚假训练入口。

当前真正结构化、逐题核验并可在线作答的历年真题仍只有 TMUA 2023 Paper 1 的 20 道题。可以体验 CAIE 9709/9231 或 Pearson IAL Mathematics/Further Mathematics 的精确资格与模块档案，以及完整计时、数学公式与图形、作答/改答/标记、手机与 iPad 导航、本地自动保存与恢复、明确提交和证据型结果页。练习与档案都绑定到当前设备的稳定 Guest Space；结果页不会伪造课程覆盖、群体 Benchmark、官方分数或 AI 解释。

当前版本仍是本地预览：练习数据只保存在当前浏览器。5 题原创体验、8 题诊断、免费诊断报告和 2027 院校专业注册表尚未实现；生产级账户、PostgreSQL/RLS、多租户隔离和学生逐项授权也尚未接入，因此不能用于收集真实学生数据。原始 PDF 保持只读且不进入 Git。

## 本地运行

需要 Node.js `^22.13.0` 或 `>=24.0.0`，以及 pnpm `10.14.0`。

```bash
pnpm install
pnpm dev
```

完整独立验证：

```bash
pnpm verify
```

该命令依次检查架构边界、机器可读功能主张与证据、TMUA corpus 一致性、全部测试、严格 TypeScript 和生产构建。功能验证层也可以单独运行：

```bash
pnpm verify:features
```

## 文档层级

文档冲突时，遵循以下优先级：

1. `docs/product/PRODUCT_CHARTER.md`：使命、商业和信任边界；
2. `docs/architecture/SYSTEM_ARCHITECTURE.md`：系统模块、数据所有权和依赖规则；
3. `docs/MASTER_ROADMAP_AND_VERIFICATION_MATRIX.md`：阶段、发布门和验证责任；
4. `docs/superpowers/specs/`：具体工作流设计；
5. `docs/superpowers/plans/`：可执行开发步骤。

局部功能不得通过自己的规格绕过上位契约。
