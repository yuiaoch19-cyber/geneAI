# GeneAI API 设计（初稿）

| 项目 | 内容                                                     |
| ---- | -------------------------------------------------------- |
| 风格 | REST + JSON                                              |
| 基址 | `http://127.0.0.1:8000/api`（开发期由 Vite 代理 `/api`） |
| 版本 | 无 URL 版本号；破坏性变更在课程范围内直接同步前后端      |
| 编码 | UTF-8；`Content-Type: application/json`                  |
| 时间 | UTC ISO 8601，例如 `2026-11-04T13:20:00.000Z`            |
| 分页 | `page`（1-based）+ `page_size`，响应带 `total/pages`     |
| 状态 | 初稿，阶段 3 实现并以 OpenAPI 为最终准绳                 |

> FastAPI 自动生成 `/docs` 与 `/openapi.json`。本文档描述约定与示例，字段以 `src/types/api.ts` 对齐。

---

## 1. 通用约定

### 1.1 成功响应

- 单个资源：直接返回对象，不包 `data`。
- 列表：`{ "items": [...], "total": 42, "page": 1, "page_size": 10, "pages": 5 }`。
- 创建：`201 Created`；删除：`204 No Content`（无 body）。
- 无操作成功（如 `save=false`）：`200 OK`。

### 1.2 错误响应

```json
{
  "detail": "第 24 位出现非法字符 'X'，仅支持 A/T/G/C/N。",
  "code": "INVALID_SEQUENCE",
  "field": "sequence"
}
```

| 字段     | 类型    | 说明                           |
| -------- | ------- | ------------------------------ |
| `detail` | string  | 面向用户的中文说明，可直接展示 |
| `code`   | string  | 稳定错误码，前端据此分支       |
| `field`  | string? | 出错的请求字段（可选）         |

FastAPI 请求体校验失败（422）保持框架默认结构：

```json
{
  "detail": [
    { "loc": ["body", "sequence"], "msg": "Field required", "type": "missing" }
  ]
}
```

前端 `client.ts` 需把两种结构归一化为 `{ message, code, field }`。

### 1.3 错误码表

| code                 | HTTP | 含义                                |
| -------------------- | ---- | ----------------------------------- |
| `INVALID_SEQUENCE`   | 400  | 空序列、非法字符、含 U              |
| `SEQUENCE_TOO_LONG`  | 413  | 超过 100,000 bp                     |
| `ALIGNMENT_TOO_LONG` | 413  | 任一条超过 10,000 bp                |
| `INVALID_WINDOW`     | 400  | 窗口 ≤ 0、步长 ≤ 0、窗口 > 序列长度 |
| `NOT_FOUND`          | 404  | 记录不存在                          |
| `VALIDATION_ERROR`   | 422  | 请求体/查询参数不合法               |
| `REPORT_ERROR`       | 500  | PDF 生成失败                        |
| `DATABASE_ERROR`     | 500  | 数据库读写失败                      |

### 1.4 限制

| 项               | 值                 |
| ---------------- | ------------------ |
| 单条序列最大长度 | 100,000 bp（分析） |
| 比对序列最大长度 | 10,000 bp / 条     |
| 列表 `page_size` | 1–100，默认 10     |
| 请求体大小       | 2 MB               |
| 超时（前端）     | 15s                |

### 1.5 CORS

开发期前端 `http://localhost:5173`（或 5188 等 Vite 自动端口）。后端允许：

```python
allow_origin_regex = r"http://(localhost|127\.0\.0\.1):\d+"
allow_methods = ["*"]
allow_headers = ["*"]
```

生产同源部署时不需要 CORS；保留配置不影响。

---

## 2. 接口总览

| 方法   | 路径                        | 说明                           |
| ------ | --------------------------- | ------------------------------ |
| GET    | `/health`                   | 健康检查与版本                 |
| POST   | `/analyses`                 | 分析序列（可选保存）           |
| GET    | `/analyses`                 | 分析记录列表（搜索/筛选/分页） |
| GET    | `/analyses/{id}`            | 分析详情                       |
| DELETE | `/analyses/{id}`            | 删除分析记录                   |
| GET    | `/analyses/{id}/gc-windows` | 滑动窗口 GC 数据               |
| GET    | `/analyses/{id}/report`     | 分析 PDF 报告                  |
| POST   | `/comparisons`              | 全局比对（保存）               |
| GET    | `/comparisons`              | 比对记录列表                   |
| GET    | `/comparisons/{id}`         | 比对详情                       |
| DELETE | `/comparisons/{id}`         | 删除比对记录                   |
| GET    | `/comparisons/{id}/report`  | 比对 PDF 报告                  |
| GET    | `/stats/overview`           | Dashboard 聚合统计             |

---

## 3. 健康检查

### `GET /api/health`

响应 `200`：

```json
{
  "status": "ok",
  "app": "GeneAI",
  "version": "1.0.0",
  "python": "3.12.7",
  "biopython": "1.85",
  "database": "ok",
  "time": "2026-11-04T13:20:00.000Z"
}
```

- `database` 为 `ok` / `error`；`error` 时 HTTP 仍 200，前端显示警告而不是整页报错。
- 设置页"系统信息"使用该接口。

---

## 4. 序列分析

### 4.1 `POST /api/analyses`

请求：

```json
{
  "sequence": "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG",
  "name": "示例序列 A",
  "source": "manual",
  "save": true
}
```

| 字段       | 类型    | 必填 | 默认     | 说明                                         |
| ---------- | ------- | ---- | -------- | -------------------------------------------- |
| `sequence` | string  | 是   | —        | 原始输入，可含空白/换行/FASTA 头，后端规范化 |
| `name`     | string  | 否   | 自动生成 | ≤ 120 字符                                   |
| `source`   | enum    | 否   | `manual` | `manual` / `fasta` / `demo`                  |
| `save`     | boolean | 否   | `true`   | 是否写入历史                                 |

响应 `201`（`save=true`）或 `200`（`save=false`）：

```json
{
  "id": 12,
  "saved": true,
  "name": "示例序列 A",
  "sequence": "ATGGCCATTGTAATGGGCCGCTGAAAGGGTGCCCGATAG",
  "length": 40,
  "a_count": 10,
  "t_count": 9,
  "g_count": 12,
  "c_count": 9,
  "n_count": 0,
  "gc_content": 52.5,
  "at_content": 47.5,
  "complement": "TACCGGTAACATTACCCGGCGACTTTCCCACGGGCTATC",
  "reverse_complement": "CTATCGGGCACCCTTTCAGCGGCCCATTACAATGGCCAT",
  "rna": "AUGGCCAUUGUAAUGGGCCGCUGAAAGGGUGCCCGAUAG",
  "source": "manual",
  "created_at": "2026-11-04T13:20:00.000Z"
}
```

`save=false` 时 `id`、`created_at` 为 `null`，`saved` 为 `false`。

错误：

| 情况                      | 状态 | code                |
| ------------------------- | ---- | ------------------- |
| 空序列/仅空白             | 400  | `INVALID_SEQUENCE`  |
| 含非 ACGTN（如 `X`、`U`） | 400  | `INVALID_SEQUENCE`  |
| 长度 > 100,000            | 413  | `SEQUENCE_TOO_LONG` |

校验规则：

1. 去除 FASTA 头行（`>` 开头至行尾）、空白、数字、`-`。
2. 转大写。
3. 若含 `U`，提示"检测到 U，可能是 RNA 序列；本工具仅分析 DNA"。
4. 若含其他字符，返回第一个非法字符及其 1-based 位置（规范化后的位置）。

### 4.2 `GET /api/analyses`

查询参数：

| 参数        | 类型   | 默认         | 说明                                         |
| ----------- | ------ | ------------ | -------------------------------------------- |
| `q`         | string | —            | 匹配 `name` 或 `sequence`（LIKE，转义 `%_`） |
| `from`      | date   | —            | `YYYY-MM-DD`，本地日期的 UTC 起点            |
| `to`        | date   | —            | `YYYY-MM-DD`，含当天                         |
| `page`      | int    | 1            | 页码                                         |
| `page_size` | int    | 10           | 1–100                                        |
| `sort`      | enum   | `created_at` | `created_at` / `gc_content` / `length`       |
| `order`     | enum   | `desc`       | `asc` / `desc`                               |

响应 `200`：

```json
{
  "items": [
    {
      "id": 12,
      "name": "示例序列 A",
      "length": 40,
      "gc_content": 52.5,
      "at_content": 47.5,
      "a_count": 10,
      "t_count": 9,
      "g_count": 12,
      "c_count": 9,
      "n_count": 0,
      "source": "manual",
      "created_at": "2026-11-04T13:20:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "pages": 1
}
```

### 4.3 `GET /api/analyses/{id}`

响应 `200`：同 4.1 的完整对象（`saved=true`）。不存在返回 `404 NOT_FOUND`。

### 4.4 `DELETE /api/analyses/{id}`

响应 `204`。不存在返回 `404`。删除不影响比对记录。

### 4.5 `GET /api/analyses/{id}/gc-windows`

查询参数：`window`（默认 50，5–1000）、`step`（默认 10，1–1000）。

响应 `200`：

```json
{
  "sequence_length": 120,
  "window": 50,
  "step": 10,
  "average_gc": 48.2,
  "points": [
    { "start": 0, "end": 50, "gc": 46.0 },
    { "start": 10, "end": 60, "gc": 48.0 }
  ]
}
```

- `start`/`end` 为 0-based、左闭右开，前端 X 轴用 `start + 1` 显示。
- 窗口内有效碱基（ACGT）为 0 时 `gc` 为 `null`，曲线断开。
- 该接口用于 PDF 与"服务端计算"校验；前端可视化默认本地计算以获得即时响应，两者必须用同一公式。

### 4.6 `GET /api/analyses/{id}/report`

响应 `200`，`Content-Type: application/pdf`：

```
Content-Disposition: attachment; filename="geneai-analysis-12.pdf"; filename*=UTF-8''geneai-%E5%88%86%E6%9E%90-12.pdf
```

内容：标题、生成时间、序列名、完整序列（60 列分行）、指标表、碱基表、三条链、滑动窗口 GC 表（默认 50/10）、免责声明。

失败返回 JSON 错误（`REPORT_ERROR`），不得返回 0 字节文件。

---

## 5. 序列比对

### 5.1 `POST /api/comparisons`

请求：

```json
{
  "reference": "ATGCGTACGT",
  "query": "ATGCGTTCGT",
  "name": "示例比对 1"
}
```

| 字段        | 类型   | 必填 | 说明                         |
| ----------- | ------ | ---- | ---------------------------- |
| `reference` | string | 是   | 参考序列                     |
| `query`     | string | 是   | 待比较序列                   |
| `name`      | string | 否   | 默认 `比对 2026-11-04 21:30` |

响应 `201`：

```json
{
  "id": 3,
  "name": "示例比对 1",
  "reference_sequence": "ATGCGTACGT",
  "query_sequence": "ATGCGTTCGT",
  "reference_length": 10,
  "query_length": 10,
  "alignment_score": 18.0,
  "identity": 90.0,
  "substitutions": 1,
  "insertions": 0,
  "deletions": 0,
  "difference_count": 1,
  "difference_ratio": 10.0,
  "alignment": {
    "reference": "ATGCGTACGT",
    "match": "|||||| |||",
    "query": "ATGCGTTCGT",
    "columns": 10,
    "truncated": false
  },
  "differences": [
    {
      "type": "substitution",
      "ref_position": 7,
      "query_position": 7,
      "reference_base": "A",
      "query_base": "T"
    }
  ],
  "created_at": "2026-11-04T13:22:00.000Z"
}
```

算法与统计：

- `PairwiseAligner`：`mode='global'`，`match_score=2`，`mismatch_score=-1`，`open_gap_score=-10`，`extend_gap_score=-0.5`。
- 差异从 `alignment.aligned` 块提取：
  - 块内等长且都非空 → 逐位比较，不同为 `substitution`；
  - 参考块为空、Query 非空 → `insertion`（`inserted` 为 Query 片段）；
  - Query 块为空、参考非空 → `deletion`（`deleted` 为参考片段）；
  - 块不等长且都非空 → 先按较短长度记替换，剩余记为插入/缺失（保证事件可解释）。
- `identity = 相同列数 / 对齐总列数 × 100`（对齐总列数含缺口列，不含双缺口）。
- `difference_ratio = 差异事件数 / 对齐总列数 × 100`，超过 100 时响应保留真实值，前端展示截断并提示。
- 空序列或非法字符 → 400；任一条 > 10,000 → 413 `ALIGNMENT_TOO_LONG`。

错误示例：

```json
{
  "detail": "参考序列包含非法字符 'X'（第 5 位）。",
  "code": "INVALID_SEQUENCE",
  "field": "reference"
}
```

### 5.2 `GET /api/comparisons`

参数同 4.2（`q` 匹配 `name`/两条序列）。

响应 `200`：

```json
{
  "items": [
    {
      "id": 3,
      "name": "示例比对 1",
      "reference_length": 10,
      "query_length": 10,
      "identity": 90.0,
      "substitutions": 1,
      "insertions": 0,
      "deletions": 0,
      "difference_count": 1,
      "created_at": "2026-11-04T13:22:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "pages": 1
}
```

### 5.3 `GET /api/comparisons/{id}`

响应 `200`：同 5.1 完整对象。列表不返回 `alignment`/`differences`，详情才返回，控制体积。

### 5.4 `DELETE /api/comparisons/{id}`

响应 `204`。

### 5.5 `GET /api/comparisons/{id}/report`

同 4.6，文件名为 `geneai-comparison-{id}.pdf`；内容含两条序列、对齐片段、差异表、统计指标、免责声明。

---

## 6. 统计

### `GET /api/stats/overview`

响应 `200`：

```json
{
  "total_analyses": 12,
  "total_sequences": 16,
  "average_gc": 48.7,
  "last_analysis_at": "2026-11-04T13:22:00.000Z",
  "base_distribution": {
    "a": 1820,
    "t": 1765,
    "g": 1902,
    "c": 1855,
    "n": 12
  },
  "gc_trend": [
    { "date": "2026-10-22", "average_gc": 47.2, "count": 1 },
    { "date": "2026-10-23", "average_gc": null, "count": 0 },
    { "date": "2026-10-24", "average_gc": 50.1, "count": 2 }
  ],
  "recent": [
    {
      "id": 3,
      "kind": "comparison",
      "name": "示例比对 1",
      "length": 10,
      "metric": 90.0,
      "created_at": "2026-11-04T13:22:00.000Z"
    },
    {
      "id": 12,
      "kind": "analysis",
      "name": "示例序列 A",
      "length": 40,
      "metric": 52.5,
      "created_at": "2026-11-04T13:20:00.000Z"
    }
  ]
}
```

口径（必须与前端文案一致）：

| 字段                | 计算                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `total_analyses`    | `count(analyses) + count(comparisons)`，即"总操作次数"               |
| `total_sequences`   | `count(analyses) + 2 × count(comparisons)`                           |
| `average_gc`        | 仅 `analyses.gc_content` 平均，保留 1 位；无记录为 `null`            |
| `last_analysis_at`  | 两表 `created_at` 最大值；无记录为 `null`                            |
| `base_distribution` | 仅 `analyses` 的计数求和                                             |
| `gc_trend`          | 最近 14 天，按 UTC 日期聚合；无数据日期 `count=0`、`average_gc=null` |
| `recent`            | 两表合并按时间倒序取 5 条；`metric` 对分析是 GC、对比较是 identity   |

空库响应：

```json
{
  "total_analyses": 0,
  "total_sequences": 0,
  "average_gc": null,
  "last_analysis_at": null,
  "base_distribution": { "a": 0, "t": 0, "g": 0, "c": 0, "n": 0 },
  "gc_trend": [],
  "recent": []
}
```

---

## 7. 前端调用映射

| 页面/功能  | Hook                                | 接口                            |
| ---------- | ----------------------------------- | ------------------------------- |
| Dashboard  | `useOverview()`                     | `GET /stats/overview`           |
| 分析提交   | `useAnalyze()`（mutation）          | `POST /analyses`                |
| 分析结果   | `useAnalysis(id)`                   | `GET /analyses/{id}`            |
| 历史列表   | `useAnalyses(filters)`              | `GET /analyses`                 |
| 历史详情   | `useAnalysis(id)`                   | `GET /analyses/{id}`            |
| 删除       | `useDeleteAnalysis()`               | `DELETE /analyses/{id}`         |
| 比对提交   | `useCompare()`                      | `POST /comparisons`             |
| 比对详情   | `useComparison(id)`                 | `GET /comparisons/{id}`         |
| 可视化滑窗 | 本地计算或 `useGcWindows(id, w, s)` | `GET /analyses/{id}/gc-windows` |
| PDF        | `downloadReport(kind, id)`          | `GET /{kind}/{id}/report`       |
| 系统信息   | `useHealth()`                       | `GET /health`                   |

Query keys：

```ts
['stats']
['analyses', filters]
['analysis', id]
['comparisons', filters]
['comparison', id]
['health']
```

写操作成功后 invalidate：`['stats']`、对应列表；详情被删时 `removeQueries(['analysis', id])`。

---

## 8. 契约同步流程

1. 后端先改 `schemas.py`。
2. 同步 `src/types/api.ts`（手写，不用代码生成，保持可读）。
3. 同步本文档示例。
4. 前端类型检查 `pnpm build`（tsc）作为最后一道校验。
5. 若字段重命名，必须一次性改完，不允许"后端新字段 + 前端读旧字段"并存。

---

## 9. 非目标

- 不做 GraphQL。
- 不做 WebSocket / SSE（无长任务）。
- 不做 API Key / OAuth（本地单机）。
- 不做批量上传接口（前端逐条提交即可）。
- 不做软删除与回收站。

---

_实现后以 FastAPI `/docs` 为准；本文档与实现不一致时，先修文档再继续开发。_
