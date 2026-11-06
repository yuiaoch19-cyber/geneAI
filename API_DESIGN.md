# GeneAI API 设计

| 项目 | 内容                                                                  |
| ---- | --------------------------------------------------------------------- |
| 风格 | REST + JSON                                                           |
| 基址 | `http://127.0.0.1:8000/api`（开发期由 Vite 代理 `/api`）              |
| 版本 | `2.0.0`（阶段 8 基础 API + 2.0 中心法则 / 突变 / ClinVar / 序列地图） |
| 编码 | UTF-8；JSON 为 `application/json`，上传为 `multipart/form-data`       |
| 时间 | UTC ISO 8601，输出以 `Z` 结尾，如 `2026-11-05T00:09:00Z`              |
| 分页 | `page`（1-based）+ `page_size`（1–100），响应带 `total/pages`         |

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

## 2. 接口总览（已实现，2.0.0）

| 方法   | 路径                           | 说明                                 |
| ------ | ------------------------------ | ------------------------------------ |
| GET    | `/api/health`                  | 健康检查与数据库连通性               |
| POST   | `/api/analyze`                 | 分析 DNA 序列（不写库）              |
| POST   | `/api/transcribe`              | DNA → RNA 转录                       |
| POST   | `/api/translate`               | DNA → 蛋白质翻译                     |
| POST   | `/api/mutate`                  | 应用突变并预测后果                   |
| POST   | `/api/orfs`                    | 六阅读框 ORF 扫描                    |
| POST   | `/api/map`                     | 序列地图图层（ORF/GC/酶/motif/突变） |
| GET    | `/api/variants/search`         | ClinVar 变异查询                     |
| GET    | `/api/variants/{id}`           | ClinVar 单条详情                     |
| POST   | `/api/compare`                 | 双序列全局比对（不写库）             |
| POST   | `/api/upload/fasta`            | 上传并解析单条 FASTA                 |
| POST   | `/api/history`                 | 分析并保存一条历史记录               |
| GET    | `/api/history`                 | 历史列表（搜索 + 分页）              |
| GET    | `/api/history/{id}`            | 历史详情                             |
| DELETE | `/api/history/{id}`            | 删除历史记录                         |
| GET    | `/api/history/{id}/gc-windows` | 滑动窗口 GC 数据                     |
| GET    | `/api/history/{id}/report`     | 导出 PDF 分析报告                    |
| GET    | `/api/history/{id}/csv`        | 导出 CSV 分析数据                    |
| GET    | `/api/stats/overview`          | Dashboard 聚合统计                   |
| POST   | `/api/comparisons`             | 比对并保存一条记录                   |
| GET    | `/api/comparisons`             | 比对列表（搜索 + 分页）              |
| GET    | `/api/comparisons/{id}`        | 比对详情（含对齐与差异）             |
| DELETE | `/api/comparisons/{id}`        | 删除比对记录                         |

所有接口均为相对路径，前端通过 Vite 代理 `/api` 访问 `http://127.0.0.1:8000`。

---

## 3. 健康检查

### `GET /api/health`

```json
{
  "status": "ok",
  "app": "GeneAI",
  "version": "2.0.0",
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

### 5.7 `GET /api/history/{id}/csv`

按历史记录导出 CSV，字段与 PDF 报告一致，便于在 Excel / pandas 中继续分析。

响应 `200`，`Content-Type: text/csv; charset=utf-8`：

```
Content-Disposition: attachment; filename="GeneAI-analysis-1.csv"
```

- 文件以 UTF-8 BOM 开头，Excel 可直接识别中文。
- 两列结构：`字段,值`；包含名称、编号、分析时间、长度、A/T/G/C/N、GC/AT、来源、算法版本、原始序列、互补链、反向互补链、RNA。
- 记录不存在返回 `404 NOT_FOUND`。

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

## 8. 中心法则与突变（2.0）

### `POST /api/transcribe`

```json
{
  "sequence": "ATGGAACCTTGGTAA",
  "strand": "coding",
  "input_direction": "5to3"
}
```

`strand` 为 `coding` / `template`，`input_direction` 为 `5to3` / `3to5`；编码链输入必须为 5′→3′。返回 `rna`（统一 5′→3′）、`coding_sequence`、`template_sequence`、`coding_direction`、`template_direction`、`rna_direction`、`length`、`note`。

### `POST /api/translate`

```json
{
  "sequence": "ATGGAACCTTGGTAA",
  "strand": "coding",
  "input_direction": "5to3",
  "frame": 1,
  "stop_at_stop": true
}
```

返回 `rna`、`protein`（含 `*` 终止符）、`three_letters`、`codons[]`（`index/rna/amino_acid/three_letter/start/end/is_stop/is_start/ambiguous`）、`start_codon`、`stop_codon`、`stopped_at`、`ignored_bases`、`ambiguous_codons`、`warnings`。

### `POST /api/mutate`

```json
{
  "sequence": "ATGGAACCTTGGTAA",
  "mutation_type": "substitution",
  "position": 7,
  "alt": "T",
  "frame": 1,
  "strand": "coding",
  "input_direction": "5to3"
}
```

`mutation_type` 为 `substitution` / `insertion` / `deletion`；替换与缺失使用 1-based 起始坐标，插入坐标为「第 N 位之后」，`0` 表示序列开头。缺失可用 `ref` 指定被删片段，或 `length` 指定长度。

响应包含 `original_sequence`、`mutated_sequence`、`mutation`（坐标与规则）、`original_rna` / `mutated_rna`、`original_protein` / `mutated_protein`、`protein_changes[]`、`consequence` / `label`、`is_premature_stop`、蛋白长度与变化、`affected_codon`、`changed_amino_acids[]`、免责 `note`。

非法序列返回 `400 INVALID_SEQUENCE`，坐标/碱基不合法返回 `400 INVALID_MUTATION`，参数类型错误返回 `422 VALIDATION_ERROR`。所有坐标相对于请求中的输入序列。

---

## 9. 变异数据库（ClinVar，2.0）

### `GET /api/variants/search`

| 参数         | 说明                                             |
| ------------ | ------------------------------------------------ |
| `q`          | 基因名、rs 编号、VCV 编号或 ClinVar Variation ID |
| `query_type` | `auto`（默认）/ `gene` / `variant` / `id`        |
| `limit`      | 1–20，默认 10                                    |

查询词在发送给 NCBI 前会转换为对应检索式（如 `BRCA1[gene]`、`rs80357906`）。纯 DNA 序列缺少参考基因组、染色体位置与转录本，会直接返回 `400 UNSUPPORTED_QUERY`，不做模糊匹配。

成功响应：

```json
{
  "query": "BRCA1",
  "query_type": "gene",
  "source": "ClinVar",
  "total": 16166,
  "returned": 3,
  "retrieved_at": "2026-11-06T11:36:13Z",
  "cached": false,
  "items": [
    {
      "id": "5037508",
      "accession": "VCV005037508.1",
      "title": "NM_007294.4(BRCA1):c.3370T>A (p.Phe1124Ile)",
      "gene": "BRCA1",
      "variant_type": "single nucleotide variant",
      "ref_allele": "A",
      "alt_allele": "T",
      "genome_build": "GRCh38",
      "location": {
        "chromosome": "17",
        "start": 43092161,
        "stop": 43092161,
        "ref": "A",
        "alt": "T",
        "band": "17q21.31"
      },
      "transcript": "NM_007294.4",
      "reference_sequence": "NC_000017.11",
      "clinical_significance": "Uncertain significance",
      "significance_class": "vus",
      "review_status_label": "单提交者提供标准",
      "last_evaluated": "2026-04-23",
      "phenotypes": ["not provided"],
      "source": "ClinVar",
      "url": "https://www.ncbi.nlm.nih.gov/clinvar/variation/5037508/",
      "retrieved_at": "2026-11-06T11:36:13Z",
      "missing_fields": ["表型"]
    }
  ],
  "warnings": ["1 条记录存在缺失字段，已用「未提供」或空值标注。"]
}
```

`significance_class` 取值：`pathogenic` / `likely_pathogenic` / `vus` / `likely_benign` / `benign` / `conflicting` / `drug_response` / `risk_factor` / `other` / `unknown`。**VUS 固定映射为 `vus`，前端不得显示成致病。**

### `GET /api/variants/{variation_id}`

仅接受数字 Variation ID，返回单条记录与 `retrieved_at`、`missing_fields`。不存在时 `404 NOT_FOUND`。

### 缓存、限流与错误

- 内存缓存 10 分钟（搜索结果与单条详情分别缓存），命中时 `cached: true`；不持久化。
- 请求间隔控制在约 0.35s（无 API key）或 0.11s（有 key）。
- `429` → `503 RATE_LIMITED`；`5xx` → `503 DATABASE_UNAVAILABLE`；超时 → `503 DATABASE_TIMEOUT`。
- 第三方字段缺失不会导致整条失败，而是写入 `missing_fields` 并在 `warnings` 中提示。
- 临床意义、审查状态与表型均来自 ClinVar 提交者，页面必须同时展示来源、查询时间与原始链接；不得据此给出诊断或用药建议。

---

## 10. 前端调用映射

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
| 转录演示  | `transcribeSequence`            | `POST /transcribe`             |
| 翻译演示  | `translateSequence`             | `POST /translate`              |
| 突变模拟  | `mutateSequence`                | `POST /mutate`                 |
| 变异查询  | `searchVariants`                | `GET /variants/search`         |
| 变异详情  | `getVariant`                    | `GET /variants/{id}`           |
| 保存比对  | `saveComparison`                | `POST /comparisons`            |
| 比对列表  | `listComparisons`               | `GET /comparisons`             |
| 删除比对  | `deleteComparison`              | `DELETE /comparisons/{id}`     |
| 健康检查  | `fetch('/api/health')`          | `GET /health`                  |

Query keys：`['stats','overview']`、`['analysis', id]`。写操作成功后 invalidate `['stats','overview']`。

> 分析页的即时计算在前端完成，保存时后端用同一套规则重新校验，避免「前端显示通过、后端拒绝」的口径分裂。

---

## 11. 测试与调试

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

## 12. 契约同步

1. 先改 `server/app/schemas.py` 与路由。
2. 同步 `src/types/api.ts` 与 `src/lib/api/geneai.ts`（手写映射，不引入代码生成）。
3. 同步本文档示例与错误码。
4. `pnpm build` 的 tsc 检查作为最后一道闸门。

---

## 13. 序列地图（2.0）

### `POST /api/map`

请求：

```json
{
  "sequence": "ATGGAACCTTGGTAA",
  "window": 50,
  "step": 10,
  "min_orf_aa": 0,
  "enzymes": ["EcoRI", "BamHI"],
  "motifs": ["TATA", "GCGC"],
  "mutation": { "mutation_type": "substitution", "position": 4, "alt": "A" }
}
```

响应（节选）：

```json
{
  "sequence_length": 15,
  "gc": {
    "window": 50,
    "step": 10,
    "points": [],
    "strategy": "仅统计完整窗口"
  },
  "orfs": [
    {
      "strand": "+",
      "frame": 1,
      "start": 1,
      "end": 15,
      "length_aa": 4,
      "is_potential": true
    }
  ],
  "orf_total": 1,
  "restriction_sites": [
    {
      "enzyme": "EcoRI",
      "recognition_site": "GAATTC",
      "cut_position": 6,
      "strand": "+"
    }
  ],
  "motifs": [{ "pattern": "TATA", "start": 9, "end": 12, "strand": "+" }],
  "mutation": { "label": "错义突变", "position": 4, "ref": "G", "alt": "A" },
  "warnings": [],
  "coordinate_rule": "所有区间为 1-based 闭区间；负链坐标已换算为正链；ORF 为潜在开放阅读框。"
}
```

要点：

- 限制酶位点为 Biopython `enzyme.search` 的 1-based 切割位点。
- motif 同时搜索正链与反向互补链；负链坐标换算回正链。
- GC 只输出完整窗口；窗口过大时 `strategy` 与 `warnings` 说明。
- ORF 仅 ATG 起始、同框终止结束，均标记 `is_potential: true`，不等同已验证基因。
- 突变可选；提供时返回与 `/api/mutate` 一致的后果标签与蛋白质变化摘要。

---

## 14. ORF 扫描（2.0）

### `POST /api/orfs`

```json
{
  "sequence": "ATGGAACCTTGGTAA",
  "min_length_aa": 0,
  "include_nested": true,
  "require_stop": true
}
```

响应 `200`：

```json
{
  "sequence_length": 15,
  "orfs": [
    {
      "strand": "+",
      "frame": 1,
      "start": 1,
      "end": 15,
      "length_nt": 15,
      "length_aa": 4,
      "start_codon": "ATG",
      "stop_codon": "TAA",
      "protein": "MEPW",
      "is_complete": true,
      "is_potential": true
    }
  ],
  "count": 1,
  "frames_scanned": 6,
  "strategy": "仅 ATG 起始、同框终止密码子结束；include_nested=true 时内部 ATG 也各自成 ORF。",
  "warnings": []
}
```

- 六阅读框（正链 3 + 反链 3）；负链坐标换算回正链 1-based 闭区间。
- `is_potential: true` 表示潜在 ORF，不等同已验证基因。
- `require_stop=false` 时允许没有终止密码子的 ORF。
- 非法序列返回 `400 INVALID_SEQUENCE`。

---

## 15. 非目标

- 不做 GraphQL、WebSocket/SSE、OAuth、API Key（本地单机课程项目）。
- 不做批量上传、软删除、回收站。
- 不在日志中打印完整序列或请求体。

---

_实现以 `server/app/routers/` 与 FastAPI `/docs` 为准；文档与代码不一致时先修文档。_
