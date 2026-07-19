# 2026-07-19：满托转化运营只读取匿名聚合 Journey

## 背景

网站已经记录“选择考试、完成本人档案、开始练习、完成练习、主动打开冰冰、邀请码核销”六类固定动作，但汇总函数此前只允许 service-role 调用，创始人和运营者没有可以安全使用的产品界面。把 service-role key 放进浏览器或把原始事件导出到表格会破坏最小权限，也会让流量分析逐渐演变为学生画像。

## 比较的方案

1. **浏览器直接读取原始漏斗事件。** 可以自由分析，但会暴露 Journey ID、时间和 context，并增加与其他数据拼接的风险，淘汰。
2. **把 service-role key 放进内部页面。** 能调用现有汇总函数，但任何浏览器泄露都可以扩大为后台权限事故，淘汰。
3. **独立可撤销 viewer capability + 固定聚合 RPC。** viewer 仍是普通认证账号，只能读取六类动作按考试聚合后的事件数和去重 Journey 数；原始表和 Learner Space 始终不可读。当前采用。

## 决策

- `product_funnel_viewer` 与 `invite_operator` 是两个独立 capability；拥有其中一个不会自动获得另一个。
- viewer 只能通过 `list_product_funnel_stage_summary` 读取最近 7、30 或 90 天内的固定聚合行。
- 返回列限定为考试 scope、固定 event type、事件数和去重 Journey 数，不返回 `journey_id`、`context_code`、时间戳或任意自由文本。
- viewer grant 只能由 service-role 显式授予和撤销，授予与撤销进入私有审计表。
- `/operations/funnel` 在账号会话和独立 capability 校验后加载；普通学生失败关闭。
- 看板把每个阶段描述为独立去重的 Journey 触达数，不把它称为学生人数、严格同 cohort 转化率、能力或销售名单。
- 分析服务不可用不能阻断学生定位、练习、联系冰冰或邀请码核销。

## 验证

- 25 项 pgTAP 覆盖匿名/普通学生拒绝、service-role 授予、聚合计数、Journey 去重、原始表拒绝、90 天窗口、RLS 保持、撤销立即生效和审计。
- 前端领域与服务测试拒绝未知考试、事件类型、负数和非安全整数。
- 页面测试覆盖未登录、普通学生、获批 viewer、五考试、六阶段和 7/30/90 天切换。
- 响应式契约验证四列指标在 iPad 变两列、手机变单列，考试卡片和阶段行随窄屏重排。

## 影响与后续复查

该看板使“满托流量入口”成为可以经营的产品能力，但不证明生产监控已上线。Beta 前仍需为真实批准账号启用 MFA、在云项目授予 capability、部署 migration、安排 90 天清理，并用真实设备完成可读性和无障碍 UAT。若未来需要 campaign 或渠道维度，必须先扩展固定 allowlist 与重识别风险评估，不能开放任意 context 查询。
