# MinerU 内容导入基础

**状态：** 规范化基础已实现，真实资料解析试点待执行
**日期：** 2026-07-15

## 决策

MinerU 作为 Content Commons 的可替换解析适配器使用，不成为平台题目或资料的数据模型。当前实现不调用 MinerU 云服务，也不上传本地 PDF；它读取已经生成的 `content_list_v2.json`，转换为平台稳定的 `NormalizedImportedDocument`。

选择这一边界的原因：

- MinerU 能保留公式、图像、表格、阅读顺序与坐标，适合替代当前低保真的纯文本提取步骤；
- MinerU 的不同 backend 与版本可能改变原始输出结构，平台不能把 provider JSON 直接暴露给题库业务；
- 自动解析只能减少转录劳动，不能替代答案、公式、图形、来源和许可审核；
- 解析工作属于公开内容域，不得读取或携带学生学习数据。

## 当前数据契约

规范化输出包含：

- 原始来源 ID 与 SHA-256；
- MinerU provider 版本、backend 和解析时间；
- 页码、页内顺序、内容类型与 0–1000 坐标；
- 文本或资源路径；
- 未识别类型、空块与非法坐标警告；
- 固定的 `reviewStatus: needs_review` 和 `publishable: false`。

类型定义位于 `src/content/imports/types.ts`，JSON Schema 位于 `content/imports/schemas/normalized-document.schema.json`。

## 本地命令

```bash
pnpm content:normalize-mineru \
  --input path/to/content_list_v2.json \
  --output content/imports/staging/source-id/document.json \
  --source-id source-id \
  --source-sha256 <64-character-lowercase-sha256> \
  --provider-version 3.4.0 \
  --backend hybrid \
  --parsed-at 2026-07-15T08:00:00.000Z
```

独立验证：

```bash
pnpm verify:content-imports
```

## 真实资料试点

首批只使用已在本地来源登记中的四类资料：

1. TMUA 2022 Paper 1；
2. 对应 Answer Key；
3. 对应 Worked Solution；
4. Student Textbook。

试点同时保留 Poppler 与 MinerU 输出，比较：20 题定位成功率、公式还原、图形捕获、答案关联、页码与坐标追溯、每题人工修订分钟数和重复运行稳定性。任何文件上传第三方前必须另行确认传输许可与隐私条件；默认方向是私有部署。

## 尚未实现

- MinerU 本地服务或云 API 调用；
- 原始解析产物与图片的对象存储；
- 持久任务队列、重试和任务审计；
- PDF 与结构化内容并排的人工审核工作台；
- 从规范化文档到通用题目/资料 revision 的发布流程。

以上能力完成前，不得把“支持 MinerU”描述为自动录题或一键发布。

## 外部依据

- MinerU 官方网站：https://mineru.net/
- 官方使用文档：https://opendatalab.github.io/MinerU/zh/usage/quick_usage/
- 输出格式：https://opendatalab.github.io/MinerU/reference/output_files/
- 开源许可：https://github.com/opendatalab/MinerU/blob/master/LICENSE.md
