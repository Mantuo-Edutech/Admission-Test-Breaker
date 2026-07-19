# ADR: 文章与题目采用稳定引用，而不是逐题复制

**状态：** Accepted
**日期：** 2026-07-18

## 背景

LNAT Section A、未来的 UCAT Verbal Reasoning，以及其他阅读型考试会让多道题共享同一篇文章。若把全文复制到每一道题的 `prompt`，内容修订容易漂移，前端也无法稳定实现真实考试的“文章区 + 题目区”布局。

## 决策

- `PracticePaper` 可以保存可选的 `passages`；每篇文章具有稳定 ID、标题和结构化 block 内容。
- `PracticeQuestion.passageId` 只引用同一 paper 内的文章，不复制正文。
- 发布验证拒绝重复文章 ID、缺失引用、空文章，以及 structured 产品中的 `source-pdf` 文章块。
- 桌面练习界面让文章与当前题目独立滚动；在 iPad 窄布局和手机上改为文章在前、题目在后的自然文档顺序，避免双重横向滚动。
- 文章、题目和选项仍遵循同一权利与来源边界；引用模型不改变官方 PDF 的不可公开状态。

## 结果

首个使用者是 `LNAT Section A Starter v1`：3 篇满托原创英文论证文本、12 道四选一题；随后 `UCAT Verbal Reasoning Starter v1` 复用同一模型交付 3 篇/12 题。模型复用不能自动证明某个考试的专属题型、完整计时或评分规则已经交付；每套内容仍需独立教研、权利和响应式验收。
