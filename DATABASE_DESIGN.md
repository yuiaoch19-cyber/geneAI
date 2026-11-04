# GeneAI 数据库设计

| 项目     | 内容                                                          |
| -------- | ------------------------------------------------------------- |
| 数据库   | SQLite 3（单文件）                                            |
| 文件位置 | `server/geneai.db`（可用 `GENEAI_DB_PATH` 覆盖）              |
| 访问层   | SQLAlchemy 2.x ORM，参数化查询                                |
| 字符集   | UTF-8                                                         |
| 时间     | 统一以 UTC 写入，接口输出 `...Z` 的 ISO 8601 字符串           |
| 版本     | 阶段 5 已落地（`APP_VERSION=0.5.0`，`ALGORITHM_VERSION=1.0`） |

---

## 1. 设计目标

1. 一次分析一条记录：结果可追溯、可复现、可导出 PDF。
2. Dashboard 的统计与图表可在单次请求内完成。
3. 结构简单：两张业务表 + 一张元数据表，不建外键。
4. 可增量迁移：启动时自动补列并兼容旧版 `analyses` 表。
5. 序列原文完整保存；派生字段（GC、三条链）同时入库，便于 SQL 聚合与后续报告。

---

## 2. ER 概览

```
┌──────────────────────────┐      ┌──────────────────────────┐
│ analysis_records (分析)   │      │ comparisons (比对，阶段 6)│
├──────────────────────────┤      ├──────────────────────────┤
│ id PK                    │      │ id PK                    │
│ sequence_name            │      │ name                     │
│ sequence_length          │      │ reference_sequence       │
│ original_sequence        │      │ query_sequence           │
│ sequence_hash            │      │ reference_length         │
│ a_count … n_count        │      │ query_length             │
│ gc_content / at_content  │      │ alignment_score          │
│ complement               │      │ identity                 │
│ reverse_complement       │      │ substitutions            │
│ rna                      │      │ insertions / deletions   │
│ source / note            │      │ difference_*             │
│ algorithm_version        │      │ alignment_json           │
│ created_at               │      │ differences_json         │
└──────────────────────────┘      │ created_at               │
┌──────────────────────────┐      └──────────────────────────┘
│ meta (key PK / value)    │
└──────────────────────────┘
```

两表无外键关系：删除分析记录不影响比对记录；比对需要引用序列时由前端复制字符串。

---

## 3. 表结构

### 3.1 `analysis_records` — 序列分析记录

| 字段                 | 类型         | 约束                                   | 说明                                   |
| -------------------- | ------------ | -------------------------------------- | -------------------------------------- |
| `id`                 | INTEGER      | PK AUTOINCREMENT                       | 主键                                   |
| `sequence_name`      | VARCHAR(120) | NOT NULL                               | 记录名，默认 `DNA 分析 · MM-DD HH:MM`  |
| `sequence_length`    | INTEGER      | NOT NULL                               | 总长度（含 N）                         |
| `original_sequence`  | TEXT         | NOT NULL                               | 规范化后的序列（大写，仅 ACGTN）       |
| `sequence_hash`      | VARCHAR(64)  | NOT NULL, index                        | `sha256(sequence)`，用于检索与去重统计 |
| `a_count`            | INTEGER      | NOT NULL DEFAULT 0                     | A 数量                                 |
| `t_count`            | INTEGER      | NOT NULL DEFAULT 0                     | T 数量                                 |
| `g_count`            | INTEGER      | NOT NULL DEFAULT 0                     | G 数量                                 |
| `c_count`            | INTEGER      | NOT NULL DEFAULT 0                     | C 数量                                 |
| `n_count`            | INTEGER      | NOT NULL DEFAULT 0                     | N 数量                                 |
| `gc_content`         | REAL         | NOT NULL                               | GC 百分比，分母为 A+T+G+C              |
| `at_content`         | REAL         | NOT NULL                               | AT 百分比，分母同上                    |
| `complement`         | TEXT         | NOT NULL                               | 互补链，按 3′→5′ 方向与输入链反向平行  |
| `reverse_complement` | TEXT         | NOT NULL                               | 反向互补链，按 5′→3′ 输出              |
| `rna`                | TEXT         | NOT NULL                               | 同向转录：逐位 T→U                     |
| `source`             | VARCHAR(16)  | NOT NULL, IN ('manual','fasta','demo') | 输入来源                               |
| `note`               | TEXT         | NULL                                   | 备注，最长 500 字符                    |
| `algorithm_version`  | VARCHAR(16)  | NOT NULL DEFAULT '1.0'                 | 算法版本，便于口径变更后回溯           |
| `created_at`         | DATETIME     | NOT NULL, index                        | UTC 时间                               |

表级约束：

```sql
CHECK (a_count + t_count + g_count + c_count + n_count = sequence_length)
CHECK (source IN ('manual', 'fasta', 'demo'))
```

索引：`ix_analysis_records_created_at`、`ix_analysis_records_sequence_hash`。

> 全 N 序列的分母为 0，服务层将 `gc_content` / `at_content` 记为 `0.0`，数据库不做额外约束；前端会注明「N 不计入 GC/AT 分母」。

### 3.2 `comparisons` — 序列比对记录（阶段 6 使用）

字段与阶段 1 设计一致：`name`、`reference_sequence`、`query_sequence`、两条长度、`alignment_score`、`identity`、`substitutions/insertions/deletions`、`difference_count/ratio`、`alignment_json`、`differences_json`、`note`、`created_at`。当前阶段表已建但无写入。

### 3.3 `meta` — 元数据

| 字段    | 类型 | 约束     | 说明 |
| ------- | ---- | -------- | ---- |
| `key`   | TEXT | PK       | 键名 |
| `value` | TEXT | NOT NULL | 值   |

初始写入 `schema_version=1`、`app_name=GeneAI`、`initialized_at`。

### 3.4 JSON 字段结构（阶段 6）

`alignment_json`：

```json
{
  "reference": "ATGCGTACGT",
  "match": "|||||| |||",
  "query": "ATGCGTTCGT",
  "columns": 10,
  "truncated": false
}
```

`differences_json`：

```json
[
  {
    "type": "substitution",
    "ref_position": 7,
    "query_position": 7,
    "reference_base": "A",
    "query_base": "T"
  },
  {
    "type": "insertion",
    "ref_position": 10,
    "query_position": 11,
    "inserted": "AA"
  },
  { "type": "deletion", "ref_position": 6, "query_position": 6, "deleted": "T" }
]
```

位置均为 1-based；超过 6,000 列时只保留对齐片段前 6,000 列（`truncated=true`），差异事件仍完整保存。

---

## 4. 建表 SQL（与 ORM 等价的参考）

```sql
PRAGMA journal_mode = WAL;

CREATE TABLE analysis_records (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_name      VARCHAR(120) NOT NULL,
    sequence_length    INTEGER NOT NULL,
    original_sequence  TEXT NOT NULL,
    sequence_hash      VARCHAR(64) NOT NULL,
    a_count            INTEGER NOT NULL DEFAULT 0,
    t_count            INTEGER NOT NULL DEFAULT 0,
    g_count            INTEGER NOT NULL DEFAULT 0,
    c_count            INTEGER NOT NULL DEFAULT 0,
    n_count            INTEGER NOT NULL DEFAULT 0,
    gc_content         REAL NOT NULL,
    at_content         REAL NOT NULL,
    complement         TEXT NOT NULL,
    reverse_complement TEXT NOT NULL,
    rna                TEXT NOT NULL,
    source             VARCHAR(16) NOT NULL DEFAULT 'manual',
    note               TEXT,
    algorithm_version  VARCHAR(16) NOT NULL DEFAULT '1.0',
    created_at         DATETIME NOT NULL,
    CONSTRAINT ck_analysis_records_counts_sum
        CHECK (a_count + t_count + g_count + c_count + n_count = sequence_length),
    CONSTRAINT ck_analysis_records_source
        CHECK (source IN ('manual', 'fasta', 'demo'))
);

CREATE INDEX ix_analysis_records_created_at ON analysis_records (created_at);
CREATE INDEX ix_analysis_records_sequence_hash ON analysis_records (sequence_hash);
```

`comparisons` 与 `meta` 由 `Base.metadata.create_all()` 创建，字段见 `server/app/models.py`。

---

## 5. 关键查询

### 5.1 Dashboard 总览

```sql
SELECT COUNT(*) FROM analysis_records;
SELECT COUNT(*) FROM comparisons;
SELECT AVG(gc_content), MAX(created_at) FROM analysis_records;
SELECT SUM(a_count), SUM(t_count), SUM(g_count), SUM(c_count), SUM(n_count)
FROM analysis_records;
```

### 5.2 GC 趋势（最近 20 条，按时间升序返回）

```sql
SELECT id, sequence_name, gc_content, created_at
FROM analysis_records
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

> 服务层把结果反转后再返回；前端按记录时间绘制折线，不做按日聚合。

### 5.3 历史搜索与分页

```sql
SELECT *
FROM analysis_records
WHERE (:q IS NULL OR sequence_name LIKE :like OR note LIKE :like)
ORDER BY created_at DESC, id DESC
LIMIT :limit OFFSET :offset;
```

`LIKE` 通配符由服务层转义；课程规模（<10k 条）无需 FTS5。

### 5.4 滑动窗口 GC

由 `GET /history/{id}/gc-windows` 调用服务层 `gc_windows(sequence, window, step)` 逐窗口计算，不落库；仅完整窗口参与，末尾不足一个窗口的碱基忽略。

---

## 6. 数据生命周期

| 事件                 | 行为                                                               |
| -------------------- | ------------------------------------------------------------------ |
| `POST /history`      | 校验后插入一条 `analysis_records`，返回完整记录                    |
| `POST /analyze`      | 只计算、不写库（预览用）                                           |
| `POST /upload/fasta` | 只解析、返回序列与预览结果，不写库                                 |
| 删除                 | `DELETE /history/{id}` 物理删除，无级联                            |
| 清空                 | 不提供「清空全部」按钮；删除 `server/geneai.db` 即重置             |
| 备份                 | 复制 `geneai.db`；WAL 模式需同时复制 `-wal`/`-shm` 或先 checkpoint |

容量估算：1,000 bp 记录约 4–5 KB（含三条链），10,000 条约 50 MB。

---

## 7. 迁移与初始化

- 启动时 `init_db()`：
  1. 若存在旧表 `analyses` 且不存在 `analysis_records`，在事务内 `ALTER TABLE analyses RENAME TO analysis_records`，并把 `name→sequence_name`、`length→sequence_length`、`sequence→original_sequence`（SQLite ≥ 3.25 的 `RENAME COLUMN`）。
  2. `Base.metadata.create_all()` 补建缺失表。
  3. `_ensure_analysis_columns()` 为旧库补 `algorithm_version` 与两个索引。
- 不引入 Alembic；课程项目只做增量变更，破坏性调整通过删除 `geneai.db` 重建。
- `meta.schema_version` 当前为 `1`。

初始化命令：

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
python -c "from app.db import init_db; init_db()"
uvicorn app.main:app --reload --port 8000
```

首次启动生成 `server/geneai.db`（WAL 模式另有 `-wal`/`-shm`）。`.gitignore` 已忽略 `server/geneai.db`、`server/.venv/`。

---

## 8. 服务层一致性职责

- `original_sequence` 已规范化：全大写、无空白、仅 A/T/G/C/N。
- `sequence_length` 等于实际长度，五项计数之和相等（数据库 CHECK 兜底）。
- 三条链长度均等于 `sequence_length`；N 在互补链中保持 N。
- `gc_content + at_content ≤ 100`，仅在存在 N 时小于 100。
- 所有时间以 UTC 写入；接口统一输出 `Z`。
- `difference_count = substitutions + insertions + deletions`（阶段 6）。

---

## 9. 安全与隐私

- 所有 SQL 走 SQLAlchemy 参数绑定，禁止拼接 SQL。
- 序列仅保存在本机 SQLite，不上传第三方；请求日志不打印序列内容。
- 删除为物理删除；课程演示数据不含个人信息。
- 数据库文件权限依赖操作系统账户，不做额外加密。

---

_字段调整时同步 `API_DESIGN.md`、`src/types/api.ts` 与 `server/app/schemas.py`。_
