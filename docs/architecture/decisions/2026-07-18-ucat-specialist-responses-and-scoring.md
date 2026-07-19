# ADR: UCAT 专业题型响应与原始分计分

日期：2026-07-18
状态：Accepted

## 决策

Decision Making 的五陈述题与 Situational Judgement 的等级题、Most/Least 配对题进入共享 Practice Session，但不被压扁为普通单选：

- 五陈述题把每一项 Yes / No 以稳定 statement id 保存为版本化 JSON；五项全部完成后才计为已作答。
- 五陈述题全对得 2 个原始分，恰好错一项得 1 分，其余得 0 分。
- SJT 题声明有序选项与 `adjacent-partial` 规则；完全匹配得 1 分，相邻等级得 0.5 分，其余得 0 分。
- SJT Most/Least 题把同一组三个行动分别保存为 `most` 与 `least`；两项必须不同且全部选择后才计为已作答。只有两项都与本卷参考键一致才得 1 个原始分，其余得 0 分。
- 结果同时保存 `points`、`maxPoints` 和 `partial` 状态；总百分比使用 `score / maxScore`，不能再假设一题恒等于一分。
- 练习结果只展示原始分。短诊断和 69 题完整结构原创模考都不生成 UCAT 300–900 尺度分或 SJT Band。

## 原因

把专业题型伪装成普通单选会破坏作答完整性，也会让结果页错误地把部分得分归类为“答错”。显式响应模式与版本化计分规则既能保持一次会话、一套隐私和事件契约，也允许完整模考、评分版本和审计记录继续使用同一内核。

## 约束

- statement id、选项顺序和计分规则均属于内容版本的一部分，发布后不可在原版本内静默改写。
- 自动保存只保存学生响应，不生成逐次点击明细或额外画像事件。
- 教学预览必须明确原创、非官方题库、非正式标定；独立 UCAT 教研与医疗专业判断审核完成前不得标为最终发布。
- 每个新题型必须同时提供 validator、领域计分测试、交互测试、结果测试和窄屏契约。

## 验证

- `pnpm verify:ucat-starter`
- `pnpm verify:ucat-situational-full-mock`
- `pnpm verify:features`
- `pnpm typecheck`
- `verification/features/ucat-specialist-starters.yaml`
- `verification/features/ucat-situational-judgement-full-mock.yaml`
