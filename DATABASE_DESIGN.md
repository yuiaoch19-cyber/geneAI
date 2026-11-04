# GeneAI 数据库设计（初稿）

| 项目     | 内容                                               |
| -------- | -------------------------------------------------- |
| 数据库   | SQLite 3（单文件）                                 |
| 文件位置 | `server/geneai.db`（可通过 `GENEAI_DB_PATH` 覆盖） |
| 访问层   | SQLAlchemy 2.x ORM，参数化查询                     |
| 字符集   | UTF-8                                              |
| 时间     | UTC，ISO 8601 字符串（`2026-11-04T13:20:00.000Z`） |
| 状态     | 初稿，阶段 3 落地并在实现中校正                    |

---

## 1. 设计目标

1. **一次分析一条记录**：结果可追溯、可复现、可导出。
2. **统计查询高效**：Dashboard 的四个指标与两张图能在单次请求内完成。
3. **结构简单**：两张业务表 + 一张元数据表，不用复杂关联。
4. **可迁移**：保留 `schema_version`，后续加字段不需要重建库。
5. **不存冗余计算结果**：GC 含量等派生值可存（便于 SQL 聚合），但不存前端展示格式。

---

## 2. ER 概览

```
┌────────────────────┐        ┌──────────────────────────┐
│ analyses           │        │ comparisons              │
│ (序列分析记录)      │        │ (序列比对记录)            │
├────────────────────┤        ├──────────────────────────┤
│ id PK              │        │ id PK                    │
│ name               │        │ name                     │
│ sequence           │        │ reference_sequence       │
│ sequence_hash      │        │ query_sequence           │
│ length             │        │ reference_length         │
│ a_count … n_count  │        │ query_length             │
│ gc_content         │        │ alignment_score          │
│ at_content         │        │ identity                 │
│ complement         │        │ substitutions            │
│ reverse_complement │        │ insertions               │
│ rna                │        │ deletions                │
│ source             │        │ difference_count         │
│ created_at         │        │ difference_ratio         │
└────────────────────┘        │ alignment_json           │
                              │ differences_json         │
┌────────────────────┐        │ created_at               │
│ meta               │        └──────────────────────────┘
│ key PK / value     │
└────────────────────┘
```

两表无外键关系（比对不引用分析记录，避免历史记录被删除后比对失效）。需要"从历史带入序列"时由前端复制字符串。

---

## 3. 表结构

### 3.1 `analyses` — 序列分析记录

| 字段                 | 类型     | 约束                                         | 说明                                       |
| -------------------- | -------- | -------------------------------------------- | ------------------------------------------ |
| `id`                 | INTEGER  | PK AUTOINCREMENT                             | 主键                                       |
| `name`               | TEXT     | NOT NULL, len ≤ 120                          | 记录名，默认 `序列分析 2026-11-04 21:30`   |
| `sequence`           | TEXT     | NOT NULL, len ≤ 100000                       | 规范化后的序列（大写 ACGTN）               |
| `sequence_hash`      | TEXT(64) | NOT NULL, index                              | `sha256(sequence)`，用于去重统计与快速检索 |
| `length`             | INTEGER  | NOT NULL, CHECK > 0                          | 总长度（含 N）                             |
| `a_count`            | INTEGER  | NOT NULL DEFAULT 0, CHECK ≥ 0                | A 数量                                     |
| `t_count`            | INTEGER  | NOT NULL DEFAULT 0, CHECK ≥ 0                | T 数量                                     |
| `g_count`            | INTEGER  | NOT NULL DEFAULT 0, CHECK ≥ 0                | G 数量                                     |
| `c_count`            | INTEGER  | NOT NULL DEFAULT 0, CHECK ≥ 0                | C 数量                                     |
| `n_count`            | INTEGER  | NOT NULL DEFAULT 0, CHECK ≥ 0                | N 数量                                     |
| `gc_content`         | REAL     | NOT NULL, CHECK 0–100                        | GC 百分比（分母为 ACGT）                   |
| `at_content`         | REAL     | NOT NULL, CHECK 0–100                        | AT 百分比                                  |
| `complement`         | TEXT     | NOT NULL                                     | 互补链（5'→3'，与输入同向）                |
| `reverse_complement` | TEXT     | NOT NULL                                     | 反向互补链                                 |
| `rna`                | TEXT     | NOT NULL                                     | 转录产物（T→U）                            |
| `source`             | TEXT     | NOT NULL, CHECK IN ('manual','fasta','demo') | 输入来源                                   |
| `note`               | TEXT     | NULL, len ≤ 500                              | 备注（预留，前端第一阶段不用）             |
| `created_at`         | TEXT     | NOT NULL, index DESC                         | UTC ISO 8601                               |

约束补充：

```sql
CHECK (length = a_count + t_count + g_count + c_count + n_count)
```

> GC 分母为 0（全 N）时 `gc_content = 0`，由服务层保证，数据库不额外约束。

### 3.2 `comparisons` — 序列比对记录

| 字段                 | 类型    | 约束                  | 说明                      |
| -------------------- | ------- | --------------------- | ------------------------- |
| `id`                 | INTEGER | PK AUTOINCREMENT      | 主键                      |
| `name`               | TEXT    | NOT NULL, len ≤ 120   | 记录名                    |
| `reference_sequence` | TEXT    | NOT NULL, len ≤ 10000 | 参考序列                  |
| `query_sequence`     | TEXT    | NOT NULL, len ≤ 10000 | 待比较序列                |
| `reference_length`   | INTEGER | NOT NULL              | 参考序列长度              |
| `query_length`       | INTEGER | NOT NULL              | 待比较序列长度            |
| `alignment_score`    | REAL    | NOT NULL              | PairwiseAligner 得分      |
| `identity`           | REAL    | NOT NULL, CHECK 0–100 | 一致性百分比              |
| `substitutions`      | INTEGER | NOT NULL DEFAULT 0    | 替换数                    |
| `insertions`         | INTEGER | NOT NULL DEFAULT 0    | 插入数（Query 多出）      |
| `deletions`          | INTEGER | NOT NULL DEFAULT 0    | 缺失数（Query 缺少）      |
| `difference_count`   | INTEGER | NOT NULL DEFAULT 0    | 差异事件总数              |
| `difference_ratio`   | REAL    | NOT NULL, CHECK ≥ 0   | 差异列数 ÷ 对齐列数 × 100 |
| `alignment_json`     | TEXT    | NOT NULL              | 对齐结果 JSON（见 3.4）   |
| `differences_json`   | TEXT    | NOT NULL              | 差异数组 JSON（见 3.5）   |
| `created_at`         | TEXT    | NOT NULL, index DESC  | UTC ISO 8601              |

### 3.3 `meta` — 元数据

| 字段    | 类型 | 约束     | 说明 |
| ------- | ---- | -------- | ---- |
| `key`   | TEXT | PK       | 键名 |
| `value` | TEXT | NOT NULL | 值   |

初始数据：

| key              | value               |
| ---------------- | ------------------- |
| `schema_version` | `1`                 |
| `app_name`       | `GeneAI`            |
| `initialized_at` | 首次建库时间（UTC） |

### 3.4 `alignment_json` 结构

```json
{
  "reference": "ATGCGTACGT",
  "match": "|||||| |||",
  "query": "ATGCGTTCGT",
  "columns": 10,
  "truncated": false
}
```

- `reference`/`query` 为带 `-` 的对齐字符串；`match` 用 `|` 表示相同、`.` 表示替换、空格表示缺口。
- 序列 > 6,000 列时只存前 6,000 列，`truncated: true`；完整差异列表仍保留全部。
- 前端按 60 列分块展示，不直接渲染整串。

### 3.5 `differences_json` 结构

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
  {
    "type": "deletion",
    "ref_position": 6,
    "query_position": 6,
    "deleted": "T"
  }
]
```

- `type` 枚举：`substitution | insertion | deletion`。
- 位置均为 1-based；插入的 `ref_position` 表示"在该位置之后插入"（0 表示序列开头）。
- 相邻差异不合并成"复杂变异"，保持一一对应，便于教学解释。

---

## 4. 建表 SQL（参考实现）

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS analyses (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    sequence           TEXT    NOT NULL,
    sequence_hash      TEXT    NOT NULL,
    length             INTEGER NOT NULL CHECK (length > 0),
    a_count            INTEGER NOT NULL DEFAULT 0 CHECK (a_count >= 0),
    t_count            INTEGER NOT NULL DEFAULT 0 CHECK (t_count >= 0),
    g_count            INTEGER NOT NULL DEFAULT 0 CHECK (g_count >= 0),
    c_count            INTEGER NOT NULL DEFAULT 0 CHECK (c_count >= 0),
    n_count            INTEGER NOT NULL DEFAULT 0 CHECK (n_count >= 0),
    gc_content         REAL    NOT NULL CHECK (gc_content >= 0 AND gc_content <= 100),
    at_content         REAL    NOT NULL CHECK (at_content >= 0 AND at_content <= 100),
    complement         TEXT    NOT NULL,
    reverse_complement TEXT    NOT NULL,
    rna                TEXT    NOT NULL,
    source             TEXT    NOT NULL CHECK (source IN ('manual', 'fasta', 'demo')),
    note               TEXT,
    created_at         TEXT    NOT NULL,
    CHECK (length = a_count + t_count + g_count + c_count + n_count)
);

CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_hash       ON analyses (sequence_hash);

CREATE TABLE IF NOT EXISTS comparisons (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT    NOT NULL,
    reference_sequence TEXT    NOT NULL,
    query_sequence     TEXT    NOT NULL,
    reference_length   INTEGER NOT NULL,
    query_length       INTEGER NOT NULL,
    alignment_score    REAL    NOT NULL,
    identity           REAL    NOT NULL CHECK (identity >= 0 AND identity <= 100),
    substitutions      INTEGER NOT NULL DEFAULT 0,
    insertions         INTEGER NOT NULL DEFAULT 0,
    deletions          INTEGER NOT NULL DEFAULT 0,
    difference_count   INTEGER NOT NULL DEFAULT 0,
    difference_ratio   REAL    NOT NULL DEFAULT 0,
    alignment_json     TEXT    NOT NULL,
    differences_json   TEXT    NOT NULL,
    created_at         TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_comparisons_created_at ON comparisons (created_at DESC);

CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

SQLAlchemy 模型对应 `Base.metadata.create_all(engine)`，SQL 仅作文档与手工排查参考。

---

## 5. 关键查询

### 5.1 Dashboard 总览

```sql
-- 计数
SELECT
  (SELECT COUNT(*) FROM analyses)    AS analysis_count,
  (SELECT COUNT(*) FROM comparisons) AS comparison_count;

-- 平均 GC 与最近时间
SELECT AVG(gc_content), MAX(created_at) FROM analyses;

-- 碱基累计
SELECT SUM(a_count), SUM(t_count), SUM(g_count), SUM(c_count), SUM(n_count)
FROM analyses;
```

### 5.2 GC 趋势（最近 14 天）

```sql
SELECT substr(created_at, 1, 10) AS day,
       AVG(gc_content)           AS avg_gc,
       COUNT(*)                  AS count
FROM analyses
WHERE created_at >= :since
GROUP BY day
ORDER BY day;
```

> 缺失日期由服务层补 `null`，前端折线断开，不用 0 填充。

### 5.3 历史搜索

```sql
SELECT id, name, length, gc_content, created_at
FROM analyses
WHERE (:q IS NULL OR name LIKE :like OR sequence LIKE :like)
  AND (:from IS NULL OR created_at >= :from)
ORDER BY created_at DESC
LIMIT :limit OFFSET :offset;
```

- `LIKE` 通配符由服务层转义（`%`、`_`）。
- 序列全文搜索在大数据量下会慢；课程规模（<10k 条）可接受。后续可加 FTS5。

### 5.4 合并最近记录

```sql
SELECT id, 'analysis' AS kind, name, length, gc_content, created_at FROM analyses
UNION ALL
SELECT id, 'comparison' AS kind, name, reference_length AS length, identity AS gc_content, created_at FROM comparisons
ORDER BY created_at DESC
LIMIT 5;
```

> 比对记录的 `gc_content` 列在此仅占位为 `identity`，前端按 `kind` 渲染不同标签，不混淆语义。

---

## 6. 数据生命周期

| 事件                   | 行为                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| 分析成功且 `save=true` | 插入一条 `analyses`                                                   |
| 分析 `save=false`      | 不写库，仅在响应中返回结果（`id = null`）                             |
| 比对成功               | 插入一条 `comparisons`                                                |
| 删除                   | 物理删除，不级联（无外键）                                            |
| 清空                   | 不提供"清空全部"按钮，避免误操作                                      |
| 备份                   | 复制 `geneai.db`（WAL 模式下同时复制 `-wal`、`-shm` 或先 checkpoint） |

容量估算：单条 1,000bp 分析记录约 4–5KB（含三条链）；10,000 条约 50MB，SQLite 完全可承受。

---

## 7. 迁移策略

1. `meta.schema_version` 当前为 `1`。
2. 启动时 `init_db()`：
   - `create_all` 补齐缺失表；
   - 读取 `schema_version`；
   - 若小于代码版本，按顺序执行 `MIGRATIONS` 列表中的 `ALTER TABLE` / `UPDATE`；
   - 更新版本号。
3. 课程项目只做**增量加列**，不做破坏性变更；需要改结构时提供 `server/scripts/reset_db.py` 并由 README 说明会丢失数据。
4. 不引入 Alembic（超出课程范围），但迁移函数需可测试。

---

## 8. 一致性约束（服务层职责）

数据库只能保证格式，以下由服务层保证：

- `sequence` 已规范化（无空白、全大写、仅 ACGTN）。
- `length` 等于序列实际长度。
- 五个计数之和等于 `length`。
- `complement` / `reverse_complement` / `rna` 长度均等于 `length`。
- `gc_content + at_content ≤ 100`（存在 N 时小于 100）。
- `difference_count = substitutions + insertions + deletions`。
- `identity` 与 `difference_ratio` 在 0–100 之间（比例可能因插入事件多于列数超过 100，存库时截断为 100 并在 `alignment_json` 中保留原始事件数）。
- 所有时间写入 UTC，展示时转本地时区。

---

## 9. 初始化方式

```bash
cd server
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
python -c "from app.db import init_db; init_db()"
# 或直接启动，应用启动钩子自动建表
uvicorn app.main:app --reload --port 8000
```

首次启动后应存在：

```
server/geneai.db
server/geneai.db-wal
server/geneai.db-shm
```

`.gitignore` 需忽略 `server/geneai.db*` 与 `server/.venv/`。

---

## 10. 安全与隐私

- 所有 SQL 通过 SQLAlchemy 参数绑定，禁止 f-string 拼 SQL。
- 序列内容只在本机数据库，不上传第三方。
- 删除为物理删除；课程演示数据不含个人信息。
- 数据库文件权限依赖操作系统账户，不做额外加密。

---

_实现阶段如字段调整，必须同步 `API_DESIGN.md` 的响应结构与 `src/types/api.ts`。_
