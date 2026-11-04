# GeneAI API 设计

| 项目 | 内容                                                             |
| ---- | ---------------------------------------------------------------- |
| 风格 | REST + JSON                                                      |
| 基址 | `http://127.0.0.1:8000/api`（开发期由 Vite 代理 `/api`）         |
| 版本 | `0.8.0`（阶段 8：分析 / FASTA / 历史 / 比对 / PDF 报告均已实现） |
| 编码 | UTF-8；JSON 为 `application/json`，上传为 `multipart/form-data`  |
| 时间 | UTC ISO 8601，输出以 `Z` 结尾，如 `2026-11-05T00:09:00Z`         |
| 分页 | `page`（1-based）+ `page_size`（1–100），响应带 `total/pages`    |

> FastAPI 自动生成 `/docs` 与 `/openapi.json`；本文档与实现保持一致。

---

## 1. 通用约定

### 1.1 成功响应

- 单个资源：直接返回对象，不包 `data`。
- 列表：`{ "items": [...], "total": 1, "page": 1, "page_size": 10, "pages": 1 }`。
- 创建：`201 Created`；删除：`204 No Content`；预览分析：`200 OK`。

### 1.2 错误响应（统一结构）

```json
{
  "detail": "第 4 位出现非法字符 “X”，仅支持 A / T / G / C / N。",
  "code": "INVALID_SEQUENCE",
  "field": "sequence"
}
```

| 字段     | 类型    | 说明                           |
| -------- | ------- | ------------------------------ |
| `detail` | string  | 面向用户的中文说明，可直接展示 |
| `code`   | string  | 稳定错误码，前端据此分支       |
| `field`  | string? | 出错的请求字段（可选）         |

请求体校验失败（422）也使用同一结构：

```json
{
  "detail": "请求参数不合法：sequence：String should have at least 1 character",
  "code": "VALIDATION_ERROR",
  "field": "sequence"
}
```

HTTP 层错误（如未知路径）返回 `{ "detail": "Not Found", "code": "HTTP_404" }`。

### 1.3 错误码表

| code                | HTTP | 含义                               |
| ------------------- | ---- | ---------------------------------- |
| `INVALID_SEQUENCE`  | 400  | 空序列、非法字符、含 U、数字或 `-` |
| `INVALID_FASTA`     | 400  | FASTA 解析失败、0 条或多条记录     |
| `EMPTY_FILE`        | 400  | 上传文件为空                       |
| `INVALID_ENCODING`  | 400  | 上传文件不是 UTF-8 文本            |
| `FILE_TOO_LARGE`    | 413  | 上传文件超过 2 MB                  |
| `SEQUENCE_TOO_LONG` | 413  | 序列超过 100,000 bp                |
| `INVALID_WINDOW`    | 400  | 窗口/步长 ≤ 0 或窗口大于序列长度   |
| `NOT_FOUND`         | 404  | 历史记录不存在                     |
| `VALIDATION_ERROR`  | 422  | 请求体/查询参数不合法              |
| `DATABASE_ERROR`    | 500  | 数据库读写失败（预留）             |

### 1.4 限制

| 项               | 值                                            |
| ---------------- | --------------------------------------------- |
| 单条序列最大长度 | 100,000 bp（可由 `MAX_SEQUENCE_LENGTH` 覆盖） |
| 上传文件最大体积 | 2 MB（`MAX_UPLOAD_BYTES`）                    |
| FASTA 记录数     | 仅单条                                        |
| 列表 `page_size` | 1–100，默认 10                                |
| 前端请求超时     | 15s（axios/fetch 默认足够）                   |

### 1.5 CORS

开发期前端可能运行在 `http://127.0.0.1:5208`、`5173` 等端口。后端允许：

```python
allow_origin_regex = r"http://(localhost|127\.0\.0\.1):\d+"
allow_methods = ["*"]
allow_headers = ["*"]
```

可通过环境变量 `CORS_ORIGIN_REGEX` 覆盖；生产同源部署时无需放开。

### 1.6 环境变量（`server/.env.example`）

| 变量                  | 默认值                         | 说明                      |
| --------------------- | ------------------------------ | ------------------------- | -------------- |
| `GENEAI_DB_PATH`      | `server/geneai.db`             | SQLite 文件路径           |
| `DATABASE_URL`        | `sqlite:///…/server/geneai.db` | 完整 SQLAlchemy URL，优先 |
| `MAX_SEQUENCE_LENGTH` | `100000`                       | 单条序列上限              |
| `MAX_UPLOAD_BYTES`    | `2097152`                      | FASTA 上传上限            |
| `CORS_ORIGIN_REGEX`   | `http://(localhost             | 127\.0\.0\.1):\d+`        | 开发期跨域正则 |

前端可选 `VITE_API_BASE_URL`，默认走同源 `/api`（由 Vite 代理到 8000）。

---

## 2. 接口总览（阶段 6 已实现）

| 方法   | 路径                           | 说明                     |
| ------ | ------------------------------ | ------------------------ |
| GET    | `/api/health`                  | 健康检查与数据库连通性   |
| POST   | `/api/analyze`                 | 分析 DNA 序列（不写库）  |
| POST   | `/api/upload/fasta`            | 上传并解析单条 FASTA     |
| POST   | `/api/history`                 | 分析并保存一条历史记录   |
| GET    | `/api/history`                 | 历史列表（搜索 + 分页）  |
| GET    | `/api/history/{id}`            | 历史详情                 |
| DELETE | `/api/history/{id}`            | 删除历史记录             |
| GET    | `/api/history/{id}/gc-windows` | 滑动窗口 GC 数据         |
| GET    | `/api/history/{id}/report`     | 导出 PDF 分析报告        |
| GET    | `/api/stats/overview`          | Dashboard 聚合统计       |
| POST   | `/api/compare`                 | 双序列全局比对（不写库） |
| POST   | `/api/comparisons`             | 比对并保存一条记录       |
| GET    | `/api/comparisons`             | 比对列表（搜索 + 分页）  |
| GET    | `/api/comparisons/{id}`        | 比对详情（含对齐与差异） |
| DELETE | `/api/comparisons/{id}`        | 删除比对记录             |

所有接口均为相对路径，前端通过 Vite 代理 `/api` 访问 `http://127.0.0.1:8000`。

---

## 3. 健康检查

### `GET /api/health`

```json
{
  "status": "ok",
  "app": "GeneAI",
  "version": "0.8.0",
  "database": "ok"
}
```

- `database` 通过执行 `SELECT 1` 判断；成功为 `ok`，失败为 `error`。
- 该接口不依赖业务表，可在数据库为空时调用。

---

## 4. 序列分析

### 4.1 `POST /api/analyze`

请求：

```json
{
  "sequence": "ATGGCCATTGTAATGGG",
  "sequence_name": "示例序列 A"
}
```

| 字段            | 类型   | 必填 | 说明                                  |
| --------------- | ------ | ---- | ------------------------------------- |
| `sequence`      | string | 是   | 原始输入，可为纯序列或单条 FASTA 文本 |
| `sequence_name` | string | 否   | ≤120 字符，仅用于响应展示             |

响应 `200`：

```json
{
  "sequence": "ATGGCCATTGTAATGGG",
  "sequence_length": 16,
  "counts": { "a": 3, "t": 5, "g": 5, "c": 3, "n": 0 },
  "gc_content": 50.0,
  "at_content": 50.0,
  "complement": "TACCGGTAACATTACCC",
  "reverse_complement": "CCCATTACAATGGCCAT",
  "rna": "AUGGCCAUUGUAAUGGG",
  "sequence_name": "示例序列 A",
  "algorithm_version": "1.0"
}
```

校验规则（前后端一致）：

1. 允许单个 `>` 头行；多个头返回 `INVALID_FASTA`。
2. 忽略空白、换行、制表符；小写自动转大写。
3. 仅接受 A/T/G/C/N；`U` 提示「可能是 RNA」、`-` 提示比对缺口、数字提示编号，其余字符报 1-based 位置。
4. 长度超过 100,000 返回 `SEQUENCE_TOO_LONG`。
5. `N` 计入 `sequence_length` 与 `counts.n`，但不进 GC/AT 分母；全 N 时 GC/AT 为 `0.0`。

### 4.2 `POST /api/upload/fasta`

`multipart/form-data`，字段名 `file`。仅接受单条 FASTA（或纯序列文本），UTF-8，≤2 MB。

响应 `200`：

```json
{
  "filename": "demo.fasta",
  "sequence_name": "demo",
  "sequence": "ATGCATGC",
  "analysis": {
    "sequence": "ATGCATGC",
    "sequence_length": 8,
    "counts": { "a": 2, "t": 2, "g": 2, "c": 2, "n": 0 },
    "gc_content": 50.0,
    "at_content": 50.0,
    "complement": "TACGTACG",
    "reverse_complement": "CGTACGTA",
    "rna": "AUGCAUGC",
    "sequence_name": "demo",
    "algorithm_version": "1.0"
  }
}
```

FASTA 头取 `record.id` 的首个空白词，截断到 120 字符；无头时用文件名去掉扩展名。

错误：空文件 `EMPTY_FILE`、多条记录 `INVALID_FASTA`（提示实际条数）、超过 2 MB `FILE_TOO_LARGE`、非 UTF-8 `INVALID_ENCODING`。

---

## 5. 历史记录

### 5.1 `POST /api/history`

请求：

```json
{
  "sequence_name": "HBB 片段",
  "original_sequence": "ATGGTGCATCTGACTCCTGA",
  "source": "manual",
  "note": "课堂演示"
}
```

| 字段                | 类型   | 必填 | 默认     | 说明                          |
| ------------------- | ------ | ---- | -------- | ----------------------------- |
| `sequence_name`     | string | 否   | 自动生成 | 默认 `DNA 分析 · MM-DD HH:MM` |
| `original_sequence` | string | 是   | —        | 原始输入，后端规范化与校验    |
| `source`            | enum   | 否   | `manual` | `manual` / `fasta` / `demo`   |
| `note`              | string | 否   | null     | ≤500 字符                     |

响应 `201`（`HistoryRecord`）：

```json
{
  "id": 1,
  "sequence_name": "HBB 片段",
  "sequence_length": 20,
  "original_sequence": "ATGGTGCATCTGACTCCTGA",
  "a_count": 6,
  "t_count": 7,
  "g_count": 4,
  "c_count": 3,
  "n_count": 0,
  "gc_content": 35.0,
  "at_content": 65.0,
  "complement": "TACCACGTAGACTGAGGACT",
  "reverse_complement": "TCAGGAGTCAGATGCACCAT",
  "rna": "AUGGUGCAUCUGACUCCUGA",
  "source": "manual",
  "note": "课堂演示",
  "algorithm_version": "1.0",
  "created_at": "2026-11-05T00:09:00Z"
}
```

错误：非法序列 `INVALID_SEQUENCE`；请求体缺字段 `VALIDATION_ERROR`。

### 5.2 `GET /api/history`

查询参数：

| 参数               | 类型   | 默认 | 说明                                                 |
| ------------------ | ------ | ---- | ---------------------------------------------------- |
| `q`                | string | —    | 匹配 `sequence_name` 或 `note`（LIKE）               |
| `page`             | int    | 1    | 页码                                                 |
| `page_size`        | int    | 10   | 1–100                                                |
| `include_sequence` | bool   | true | 是否返回完整 `original_sequence`；列表拉取建议 false |
| `date_from`        | date   | —    | 起始本地日期（含），格式 `YYYY-MM-DD`                |
| `date_to`          | date   | —    | 结束本地日期（含），格式 `YYYY-MM-DD`                |

日期按 **本地时区** 的自然日解释：后端把 `date_from` 的本地 00:00 与 `date_to` 次日的本地 00:00 转成 UTC 后比较，因此东八区凌晨保存的记录不会被漏掉。

响应 `200`：

```json
{
  "items": [
    {
      "id": 1,
      "sequence_name": "HBB 片段",
      "sequence_length": 20,
      "gc_content": 35.0,
      "created_at": "2026-11-05T00:09:00Z",
      "...": "完整字段同 5.1"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 10,
  "pages": 1
}
```

按 `created_at DESC, id DESC` 排序。`include_sequence=false` 时列表项仍保留 `sequence_length` 等统计字段，只把 `original_sequence` 置为空字符串，供图表选择器与历史列表减少响应体积。

### 5.3 `GET /api/history/{id}`

响应 `200`：完整 `HistoryRecord`。不存在返回 `404 NOT_FOUND`。

### 5.4 `DELETE /api/history/{id}`

响应 `204`（无 body）。不存在返回 `404 NOT_FOUND`。物理删除，不级联。

### 5.5 `GET /api/history/{id}/gc-windows`

查询参数：`window`（默认 50，1–100000）、`step`（默认 10，1–100000）。

响应 `200`：

```json
{
  "window": 50,
  "step": 10,
  "points": [
    { "start": 0, "end": 50, "gc": 46.0 },
    { "start": 10, "end": 60, "gc": 48.0 }
  ]
}
```

- `start`/`end` 为 0-based、左闭右开；只返回完整窗口。
- 窗口内 ACGT 为 0 时 `gc` 为 `0.0`（格式化前为 `null` 的约定在阶段 6 统一）。

### 5.6 `GET /api/history/{id}/report`

按指定历史记录生成 A4 PDF 报告，内容来自数据库中的真实记录，不使用前端数据。

响应 `200`，`Content-Type: application/pdf`：

```
Content-Disposition: attachment; filename="GeneAI-report-1.pdf"; filename*=UTF-8''GeneAI-%E5%88%86%E6%9E%90%E6%8A%A5%E5%91%8A-1.pdf
Cache-Control: no-store
```

- 报告包含：GeneAI 标题、序列名称、分析时间、数据来源、算法版本、序列长度、A/T/C/G/N 数量与占比、GC/AT、A/T/G/C 饼图、原始序列、互补链、反向互补链、RNA 转录、GC 口径与免责声明。
- 中文字体优先使用 Windows `msyh.ttc` / `msyhbd.ttc`，退回 `simhei.ttf`、`simsun.ttc`，最终退回 ReportLab `STSong-Light`。
- 序列超过 5,000 bp 时仅展示前 5,000 bp 并注明；其余统计仍按完整序列计算。
- 记录不存在返回 `404 NOT_FOUND`；生成失败或结果异常返回 `500 REPORT_FAILED`。

---

## 6. Dashboard 统计

### `GET /api/stats/overview`

```json
{
  "total_analyses": 12,
  "total_sequences": 16,
  "average_gc": 48.73,
  "last_analyzed_at": "2026-11-05T00:09:00Z",
  "base_counts": { "a": 1820, "t": 1765, "g": 1902, "c": 1855, "n": 12 },
  "gc_trend": [
    {
      "id": 3,
      "name": "HBB 片段",
      "gc_content": 58.7,
      "created_at": "2026-11-05T00:09:00Z"
    }
  ],
  "recent": [
    {
      "id": 3,
      "name": "HBB 片段",
      "length": 92,
      "gc_content": 58.7,
      "created_at": "2026-11-05T00:09:00Z"
    }
  ]
}
```

口径：

| 字段               | 计算                                                       |
| ------------------ | ---------------------------------------------------------- |
| `total_analyses`   | `count(analysis_records) + count(comparisons)`             |
| `total_sequences`  | `count(analysis_records) + 2 × count(comparisons)`         |
| `average_gc`       | 仅分析记录 `gc_content` 平均值，保留 2 位；无记录为 `null` |
| `last_analyzed_at` | 分析记录 `created_at` 最大值；无记录为 `null`              |
| `base_counts`      | 分析记录五项计数求和                                       |
| `gc_trend`         | 最近 20 条分析记录，按时间升序返回                         |
| `recent`           | 最近 5 条分析记录                                          |

---

## 7. 序列比对（阶段 6 已实现）

### `POST /api/compare`

只比对、不写库，用于页面即时预览。

请求：

```json
{
  "reference": "ATGGCCTAA",
  "query": "ATGGACCTAA",
  "reference_name": "参考序列",
  "query_name": "待比较序列"
}
```

响应 `200`（节选）：

```json
{
  "reference_sequence": "ATGGCCTAA",
  "query_sequence": "ATGGACCTAA",
  "reference_length": 9,
  "query_length": 10,
  "alignment_length": 10,
  "aligned_reference": "ATGG-CCTAA",
  "aligned_query": "ATGGACCTAA",
  "score": 8,
  "identity": 90.0,
  "substitutions": 0,
  "insertions": 1,
  "deletions": 0,
  "difference_count": 1,
  "difference_ratio": 10.0,
  "differences": [
    {
      "type": "insertion",
      "ref_position": 4,
      "query_position": 5,
      "ref_base": null,
      "query_base": "A"
    }
  ],
  "algorithm": "Biopython PairwiseAligner (global, Needleman-Wunsch)",
  "scoring": {
    "mode": "global",
    "match_score": 2,
    "mismatch_score": -1,
    "open_gap_score": -10,
    "extend_gap_score": -0.5
  },
  "tie_break": "取 PairwiseAligner 返回的第一条最优比对（同分时由回溯顺序决定）",
  "coordinate_rule": "参考坐标 1-based；替换/缺失指向参考碱基位置，插入指向插入点前一个参考碱基（0 表示序列开头）。"
}
```

算法与口径：

- Biopython `PairwiseAligner`，`mode='global'`（Needleman–Wunsch），`match=2`、`mismatch=-1`、`open_gap=-10`、`extend_gap=-0.5`。
- 差异按对齐列提取：两列均为碱基且不同 → 替换；参考为 `-` → 插入；查询为 `-` → 缺失。
- 计数按碱基事件计（连续插入 2 个碱基记为 2 处插入），不是按连续片段计。
- `identity = 相同列数 / alignment_length × 100`；`difference_ratio = difference_count / alignment_length × 100`。
- 同分策略固定为「取第一条最优比对」，并在响应与页面中明示。
- 每条序列上限 `MAX_ALIGNMENT_LENGTH=5000 bp`，超出返回 `413 ALIGNMENT_TOO_LONG`。
- 差异是算法对齐推断，不等同于真实生物学突变；接口与页面均不输出疾病/临床结论。

### `POST /api/comparisons`

请求体同 `/api/compare`，另可传 `reference_name`、`query_name`。成功返回 `201`，响应在 `/api/compare` 基础上增加：

```json
{
  "id": 1,
  "name": "参考序列 vs 待比较序列",
  "created_at": "2026-11-05T00:18:00Z"
}
```

- 保存对齐串、评分、算法版本与差异 JSON；`name` 缺省为「参考名 vs 查询名」。
- 保存后计入 `/api/stats/overview`：比对记录 +1，序列数 +2。

### `GET /api/comparisons`

查询参数：`q`（匹配 `name`）、`page`、`page_size`。列表项包含计数与标量指标，**不返回** `aligned_*` 与 `differences` 以控制体积。

### `GET /api/comparisons/{id}`

返回完整比对结果（含 `aligned_reference`、`aligned_query`、`differences`）。

### `DELETE /api/comparisons/{id}`

成功 `204`；不存在 `404 NOT_FOUND`。

---

## 8. 前端调用映射

| 页面/功能 | 前端函数                        | 接口                           |
| --------- | ------------------------------- | ------------------------------ |
| Dashboard | `useStatsOverview`              | `GET /stats/overview`          |
| 分析预览  | `analyzeSequence`（本地纯函数） | —（不请求后端）                |
| 保存分析  | `createAnalysis`                | `POST /history`                |
| 历史列表  | `listAnalyses`                  | `GET /history`                 |
| 记录详情  | `getAnalysis`                   | `GET /history/{id}`            |
| 删除      | `deleteAnalysis`                | `DELETE /history/{id}`         |
| 滑窗 GC   | `getGcWindows`                  | `GET /history/{id}/gc-windows` |
| 比对预览  | `compareSequences`              | `POST /compare`                |
| 保存比对  | `saveComparison`                | `POST /comparisons`            |
| 比对列表  | `listComparisons`               | `GET /comparisons`             |
| 删除比对  | `deleteComparison`              | `DELETE /comparisons/{id}`     |
| 健康检查  | `fetch('/api/health')`          | `GET /health`                  |

Query keys：`['stats','overview']`、`['analysis', id]`。写操作成功后 invalidate `['stats','overview']`。

> 分析页的即时计算在前端完成，保存时后端用同一套规则重新校验，避免「前端显示通过、后端拒绝」的口径分裂。

---

## 9. 测试与调试

```bash
# 后端单元 + API 测试
cd server
.venv/Scripts/python.exe -m pytest tests -q

# 手动检查
curl http://127.0.0.1:8000/api/health
curl -X POST http://127.0.0.1:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"sequence":"ATGC"}'
curl -F "file=@demo.fasta" http://127.0.0.1:8000/api/upload/fasta
```

---

## 10. 契约同步

1. 先改 `server/app/schemas.py` 与路由。
2. 同步 `src/types/api.ts` 与 `src/lib/api/geneai.ts`（手写映射，不引入代码生成）。
3. 同步本文档示例与错误码。
4. `pnpm build` 的 tsc 检查作为最后一道闸门。

---

## 11. 非目标

- 不做 GraphQL、WebSocket/SSE、OAuth、API Key（本地单机课程项目）。
- 不做批量上传、软删除、回收站。
- 不在日志中打印完整序列或请求体。

---

_实现以 `server/app/routers/` 与 FastAPI `/docs` 为准；文档与代码不一致时先修文档。_
