# 学生隐私与数据权利底座

**状态：** 本地实现已验证；不是最终法律隐私声明，也不构成法律意见。
**核对日期：** 2026-07-19
**适用产品：** Admission Test Breaker / 满托考试练习场

## 1. 为什么按未成年人高隐私默认设计

本产品面向大学入学考试学生，用户中很可能包括未满 18 岁人士。ICO 的 Children’s Code 说明，可能由儿童访问的商业在线服务需要考虑该 Code 的 15 项标准；范围明确包括教育网站，并强调高隐私默认、数据映射、年龄相关判断和避免诱导儿童提供更多个人信息。

因此首版不以“用户没有填写年龄”为理由降低保护，也不为了年龄核验额外收集生日。当前最小化策略是不要求真实姓名、学校、生日、地址、家长联系方式、定位、通讯录或设备指纹即可完成练习。正式 Beta 前仍需由英国合格隐私专业人士决定年龄保障方法、控制者信息、lawful basis、DPIA 和跨境处理安排。

官方依据：

- ICO, Introduction to the Children’s code: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code
- ICO, Data (Use and Access) Act 2025 — public summary: https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-how-does-this-affect-me/

## 2. 当前处理的数据与目的

| 数据 | 必要目的 | 当前边界 |
| --- | --- | --- |
| 邮箱与认证凭证 | 注册、登录、恢复账号 | 密码由 Supabase Auth 处理，应用不读取明文 |
| 考试、课程体系和模块选择 | 生成确定性知识覆盖初判 | 不把课程覆盖冒充实际能力 |
| 答案、改答、标记和活跃用时 | 恢复会话、给出事实结果 | 默认仅本人 Learner Space 可读 |
| 站内反馈 | 纠正题目、排查故障、处理账号或隐私问题 | 只保存主动填写文字和受限上下文；拒收联系方式，不自动附加作答 |
| 匿名产品漏斗 | 判断学生是否能走完定位、练习和主动联系路径 | session-scoped 随机 Journey ID；六类固定动作；不连接账号/Learner Space，不保存 IP、设备、课程、答案或自由文本；最长 90 天 |
| 内容 entitlement | 决定可访问的增值资料 | 不产生满托/老师的数据读取权 |
| 老师/家长协作 Grant | 由学生逐项授权进度、具体作答、批注、计划或作业 | 限定对象、考试和有效期；可立即撤销；敏感动作进入学生可见审计 |
| 未来 Benchmark/AI | 尚未投入生产 | 必须另过样本、用途、授权、成本和隐私门 |

## 3. 已实现的数据权利工具

- `/privacy` 提供面向学生的中英双语分层说明；
- 登录账号可以导出 schema-v4 机器可读 JSON，包含账号标识、课程档案、练习快照、完整事件、内容权限、本人反馈、协作邀请、Grant、协作内容与审计；不导出协作码摘要；
- 学生可在 `/account/sharing` 分别选择老师/家长、五项权限、考试与 1–180 天有效期；撤销后对方下一次读写立即失败；
- 删除账号前必须重新验证当前密码并输入精确确认文字；
- 删除当前认证用户会通过外键级联移除活动数据库中的 Learner Space、档案、会话、事件、权益和邀请码核销记录；
- 删除成功后尝试清除浏览器中属于本产品的 Guest、练习、课程和待处理邀请码数据，不清除无关站点偏好；
- 匿名产品漏斗不建立账号或 Learner Space 外键，因此不能归入某个学生的数据导出，也不能由运营反查个人；关闭浏览器 session 会结束该 Journey，生产原始计数最长保留 90 天；批准的 `product_funnel_viewer` 也只能读取按考试和固定阶段汇总的数量，不能读取 Journey ID、账号、课程、答案、时间戳或原始行；
- 8 个数据库文件中的 238 项 pgTAP 与现有真实本地 HTTP 流程验证本人导出、运营者无学习数据访问、匿名漏斗、反馈、跨租户、账号删除和私有资料边界；其中 44 项协作专项测试证明老师/家长正向权限、scope 不继承、第三账号拒绝、审计和立即撤销。

ICO 说明数据可携权涉及可访问、机器可读的格式；删除权在特定条件下适用，儿童在线数据受到特别保护，组织通常需要在一个月内处理权利请求，但可能存在法定例外。自助工具提高速度，不取代组织对人工请求、身份核验、例外判断和投诉的责任。

官方依据：

- ICO, Your right to data portability: https://ico.org.uk/for-the-public/your-right-to-data-portability/
- ICO, Your right to get your data deleted: https://ico.org.uk/for-the-public/your-right-to-get-your-data-deleted/
- ICO, Getting a response to a subject access request: https://ico.org.uk/for-the-public/getting-copies-of-your-information-subject-access-request/getting-a-response-to-your-subject-access-request/

## 4. 生产上线前仍未完成

1. 公示法定数据控制者名称、注册地址和专用数据权利/投诉邮箱；
2. 确定各处理目的的 lawful basis，并完成儿童最佳利益与 DPIA 记录；
3. 配置并公示生产数据地区、子处理者、跨境机制、备份保留天数和删除传播时限；部署匿名漏斗 90 天自动清理并证明原始行不向运营浏览器开放；
4. 为纠正、限制、异议、人工访问请求和监护/代理请求建立工单、身份核验、一个月期限与例外复核；不得把“家长”协作 Grant 自动视为法定代理身份；
5. 建立数据泄露响应、投诉确认和监管升级流程；
6. 完成面向不同年龄理解能力的可用性测试和英国隐私律师终审；使用学生与协作者两个 MFA 账号在生产环境演练限权读写、审计和即时撤销。

在以上项目完成前，`B100-P0-03` 只能保持 `partial`，不能因为页面存在就标记为合规或 Beta-ready。
