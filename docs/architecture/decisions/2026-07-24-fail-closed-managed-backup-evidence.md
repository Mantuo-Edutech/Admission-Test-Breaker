# 生产数据库变更前验证可恢复的托管备份

**状态：** Accepted

**日期：** 2026-07-24

## 背景

“已打开备份”与“现在存在一个可以选择的恢复点”不是同一件事。Supabase Management API 会分别返回 WAL-G、PITR、已完成每日备份和物理恢复窗口；此前发布流程没有在数据库迁移前验证这些真实证据。

100 人封闭 Beta 的初始目标是 RPO 不超过 24 小时。考虑平台日备份的调度和检查时间，自动门禁接受最多 30 小时的最新恢复点；正式事故目标仍保持 24 小时。若产品升级为 PITR，同一门禁改为验证 PITR 的最早/最新恢复窗口。

## 决定

- 使用 Supabase 官方只读 `GET /v1/projects/{ref}/database/backups` Management API。
- `walg_enabled: true` 本身不构成通过；必须有最近的 `COMPLETED` 每日备份，或有效且最近的 PITR 恢复窗口。
- API 结构异常、时间在未来、备份过旧、PITR 窗口倒置或没有恢复点时一律失败关闭。
- `Deploy Supabase environment` 只在 production 执行该门禁，并且必须位于 migration apply 之前；staging 不因没有付费备份而被阻塞。
- 验证器只有读取权限，不调用任何 restore、create、update 或 delete endpoint，也不打印 access token。
- 自动门禁证明“恢复点存在”，不能证明“恢复成功”。真实恢复仍要在新建的非生产项目执行，并保留人工批准和验收证据。

## 后果

首次生产发布会在 Supabase 付费方案产生第一个可用恢复点之前失败，这是预期行为。PITR 在数据库长期无写入时最新 WAL 时间可能落后；发布责任人应结合最近写入证据判断，不能通过放宽代码或伪造时间绕过门禁。
