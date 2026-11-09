# GeneAI 2.0 项目审查与升级方案

> 审查日期：2026-11-06
> 审查对象：GeneAI 仓库本地工作副本（当前版本 GeneAI 1.x，HEAD `569acd9`）
> 审查方式：只读检查代码、依赖、路由、数据库、测试；未修改业务代码。

---

## 1. 结论摘要

当前项目是一个**可运行、已通过验收的 GeneAI 1.x**：

- 前端：6 个真实页面，统一设计系统，深色侧栏 + 蓝色主视觉已完成。
- 后端：FastAPI + SQLAlchemy + SQLite + Biopython，9 组接口，PDF 报告可用。
- 测试：前端 29 个单元测试、后端 48 个 pytest 全部通过。
- 数据库：3 张表，当前 0 条记录。

**可以在此基础上迭代 2.0，不需要重建项目。** 但 2.0 的 10 个模块中有 5 个是全新能力（转录翻译动画、ORF、突变、蛋白质对比、变异数据库、序列地图），其中 3 个是展示重点，建议按 8 个阶段逐段交付，不做一次性大改。

**建议优先级：**

1. 转录/翻译算法 + 动画页（差异化核心）
2. 突变模拟 + 蛋白质变化（同一套流程）
3. ORF + 序列地图
4. ClinVar 关联查询（外部依赖，需缓存与免责声明）
5. 批量分析、CSV、报告整合

---

## 2. 现状盘点

### 2.1 技术栈与运行环境

| 项 | 现状 |
| --- | --- |
| 前端 | React 19.2.5、Vite 8、TypeScript 6、Tailwind CSS 4、shadcn/ui、TanStack Router 1.168 |
| 图表 | ECharts 6.1（已按需引入 Bar/Line/Pie） |
| 动画 | **未安装 framer-motion**；可用 SVG + CSS + React 状态实现 |
| 后端 | FastAPI 0.162、SQLAlchemy 2.1.8、Pydantic 2、Biopython 1.88、ReportLab 5.1 |
| Python | `server/.venv` 使用 Python **3.12**（不要用 3.14，Biopython 轮子不完整） |
| 数据库 | SQLite `server/geneai.db`，3 张表、0 行 |
| 测试 | Vitest 29 passed；pytest 48 passed |
| 构建 | `pnpm build` 约 1.7s；ECharts chunk 约 575 kB（已有体积警告） |
| 仓库 | 工作区干净，HEAD `569acd9` |

### 2.2 前端页面

已有真实页面：

| 路由 | 页面 | 状态 |
| --- | --- | --- |
| `/` | 分析总览（Dashboard） | ✅ Hero、KPI、GC/AT 趋势、环形图、最近记录、分析构成、6 宫格 |
| `/analysis` | DNA 序列分析 | ✅ 输入/FASTA、校验、统计、互补/反向互补/RNA、保存 |
| `/compare` | 序列比对 | ✅ PairwiseAligner、差异高亮、保存比对 |
| `/visualization` | 数据可视化 | ✅ 5 张 ECharts 图、窗口 GC、长度分布 |
| `/history` | 历史记录 | ✅ 搜索、日期、分页、详情、删除、PDF |
| `/settings` | 系统设置 | ✅ 外观、本地工作区 |

模板残留但未挂导航：`apps`、`chats`、`tasks`、`users`、`help-center`、`(auth)` 登录页。

**缺少的 2.0 页面**：`/transcription`、`/orf`、`/mutation`、`/protein`、`/variants`、`/map`、`/batch`（或 `/compare` 的批量模式）。

### 2.3 现有后端接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查（含数据库） |
| POST | `/api/analyze` | DNA 分析（不落库） |
| POST | `/api/upload/fasta` | 解析单条 FASTA |
| POST | `/api/history` | 保存分析 |
| GET | `/api/history` | 分页/搜索/本地日期过滤/`include_sequence` |
| GET | `/api/history/{id}` | 分析详情 |
| DELETE | `/api/history/{id}` | 删除分析 |
| GET | `/api/history/{id}/gc-windows` | 滑动窗口 GC |
| GET | `/api/history/{id}/report` | 中文 PDF 报告 |
| POST | `/api/compare` | 双序列全局比对（预览） |
| POST | `/api/comparisons` | 保存比对 |
| GET | `/api/comparisons` | 比对列表/搜索/日期 |
| GET | `/api/comparisons/{id}` | 比对详情 |
| DELETE | `/api/comparisons/{id}` | 删除比对 |
| GET | `/api/stats/overview` | Dashboard 统计 |

### 2.4 现有算法能力

`server/app/services/`：

- `dna.py`：归一化/校验、A/T/G/C/N 计数、GC/AT、互补、反向互补、RNA 转录、滑窗 GC。
- `alignment.py`：Biopython 全局比对（match 2 / mismatch -1 / gap open -10 / extend -0.5）。
- `fasta.py`：单条 FASTA 解析。
- `report.py`：ReportLab A4 中文 PDF。
- `dates.py`：本地自然日 → UTC 边界。

**尚不存在**：密码子表 / 翻译、六阅读框 ORF、突变应用与分类、蛋白质差异、限制性酶切、ClinVar 客户端。

### 2.5 数据库现状

表：`analysis_records`、`comparisons`、`meta`，均 0 行。

`analysis_records` 已保存：原始序列、长度、A/T/G/C/N、GC/AT、互补、反向互补、RNA、来源、备注、算法版本、创建时间。

---

## 3. 与 GeneAI 2.0 的差距矩阵

| # | 2.0 模块 | 现状 | 差距 |
| --- | --- | --- | --- |
| 01 | Dashboard | ✅ 基本完成 | 统计口径扩展到转录/突变任务即可 |
| 02 | DNA 综合分析 | ✅ 完成 | 增加“进入转录/突变”入口 |
| 03 | 转录与翻译演示 | ❌ 仅 DNA→RNA；无翻译、无动画 | 翻译算法、密码子分组、SVG 动画、播放控制 |
| 04 | ORF 分析 | ❌ | 六阅读框、起止坐标、长度、筛选 |
| 05 | 基因突变模拟 | ❌ | 替换/插入/缺失、坐标、前后序列 |
| 06 | 蛋白质变化对比 | ❌ | 翻译差异、同义/错义/无义/移码、氨基酸位置 |
| 07 | 疾病关联探索 | ❌ | ClinVar 查询、缓存、证据展示、免责声明 |
| 08 | DNA 序列地图 | ❌ | ORF/突变/GC/酶切位点轨道 + 缩放 |
| 09 | 序列比对与批量分析 | 🟡 单对已完成 | 多序列 FASTA、批量统计 |
| 10 | 历史记录与报告 | ✅ PDF 已有 | CSV 导出、突变/ORF 记录入历史 |

图例：✅ 可用；🟡 部分可用；❌ 未实现。

---

## 4. 关键升级决策（建议）

### 4.1 保持现有工程结构

不把仓库改成 `frontend/ + backend/` 双目录，避免拆散已跑通的 Vite/TanStack/Vitest 配置。继续使用：

- 前端 `src/features/<module>`、`src/routes/_authenticated/*`、`src/lib/api`。
- 后端 `server/app/{routers,services,models,schemas}`。
- 文档保留根目录现有 8 份，新增 `ALGORITHM_DESIGN.md` 与 `PROJECT_AUDIT.md`。

### 4.2 动画实现

**建议不新增 framer-motion**，第一版用 SVG + CSS transition + React 状态机实现：

- 动画播放由“步骤数组”驱动（每个步骤包含：DNA 窗口、mRNA 窗口、当前密码子、已生成氨基酸、说明文字）。
- 播放/暂停/上一步/下一步/重播 = 改变 `stepIndex`，CSS 负责淡入与位移。
- 后端只返回**真实计算数据**（mRNA、密码子、氨基酸、坐标）；动画层不做任何生物学推断。
- 如果后续确需更细腻的缓动，再评估安装 `motion`（framer-motion 新包名），不提前引入。

### 4.3 生物学口径（必须固定）

| 项 | 规则 |
| --- | --- |
| 坐标 | 界面统一 1-based、闭区间；内部计算 0-based；接口显式标注 `coordinate_system: "1-based"` |
| 链方向 | 用户在转录/翻译页显式选择 `strand: "+" / "-"` 与 `frame: 1/2/3` |
| 编码链 | 默认把输入链当作编码链（5′→3′），输出 mRNA 与输入同向（T→U） |
| 模板链 | 若用户选择模板链，先反向互补得到编码链，再转录 |
| 翻译 | 标准遗传密码表；`*` 表示终止；不完整密码子不翻译并标注“末尾不完整密码子已忽略” |
| 模糊碱基 | 含 N 的密码子翻译为 `X`，并提示“包含未知氨基酸” |
| ORF | 六阅读框；默认 ATG 起始、TAA/TAG/TGA 终止；最短长度可配置；结果标注“潜在 ORF，不等于已验证基因” |
| 突变 | 序列层类型：substitution / insertion / deletion；功能层分类：synonymous / missense / nonsense / frameshift / in-frame indel；两层分开存储与展示 |
| 插入坐标 | 1-based，表示“在第 N 位之后插入”；N=0 表示插在序列开头 |
| ClinVar | 只查已知基因/变异记录；不把任意输入序列推断为疾病；展示 accession、临床意义、条件、来源、查询时间与原始链接 |

### 4.4 数据库：不照搬 11 张表

2.0 方案中的 11 张表对单用户课程项目偏重。建议保留现有 3 张表，新增 3 张，按“结果可追溯”原则落库：

| 2.0 建议表 | 本项目处理 |
| --- | --- |
| users | 不需要（本地单用户，无登录） |
| projects | 暂不做；如后续需要，加 `project_id` 可空外键 |
| sequences | 复用 `analysis_records.original_sequence` |
| analysis_tasks | 复用 `analysis_records` |
| transcription_results | 不单独落库；由 analysis + 链/框参数按需重算 |
| translation_results | 同上（可由 mRNA + 遗传密码表确定性重算） |
| mutation_records | **新增**：原始/突变序列、位置、类型、替换碱基、链/框、功能分类、蛋白前后、算法版本 |
| protein_comparisons | 合并进 `mutation_records` 的 `protein_before/after` 与差异 JSON，避免 1:1 冗余 |
| orf_results | 不落库（可由序列 + 参数重算）；如报告需要固定快照，再加 `orf_snapshot` |
| variant_annotations | **新增**：查询键、基因、ClinVar ID、标题、临床意义、条件、accession、来源、查询时间、原始 JSON |
| reports | 暂不建表；PDF/CSV 由记录实时生成 |

新增表（草案）：

```sql
CREATE TABLE mutation_records (
  id INTEGER PRIMARY KEY,
  analysis_id INTEGER REFERENCES analysis_records(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  original_sequence TEXT NOT NULL,
  mutated_sequence TEXT NOT NULL,
  position INTEGER NOT NULL,
  mutation_type TEXT NOT NULL,      -- substitution / insertion / deletion
  ref_base TEXT,
  alt_base TEXT,
  strand TEXT NOT NULL DEFAULT '+',
  frame INTEGER NOT NULL DEFAULT 1,
  effect_type TEXT,                 -- synonymous / missense / nonsense / frameshift / in-frame
  protein_before TEXT,
  protein_after TEXT,
  protein_diff_json TEXT,
  algorithm_version TEXT NOT NULL DEFAULT '2.0',
  created_at DATETIME NOT NULL
);

CREATE TABLE variant_annotations (
  id INTEGER PRIMARY KEY,
  query_key TEXT NOT NULL UNIQUE,   -- 例如 BRCA1:c.3370T>A 或 VCV005037508
  gene TEXT,
  variant_id TEXT,
  title TEXT,
  clinical_significance TEXT,
  conditions TEXT,
  accession TEXT,
  source TEXT NOT NULL DEFAULT 'ClinVar',
  fetched_at DATETIME NOT NULL,
  raw_json TEXT
);
```

迁移方式：`init_db()` 中 `create_all` 追加新表；旧表不动。现有 `analysis_records` 已从 `analyses` 迁移过，不再二次改名。

---

## 5. 页面与信息架构（2.0）

建议导航最终为 10 项，但**分阶段上线**，未完成前不放“即将上线”的死入口：

```
分析工作台
  01 分析总览            /
  02 DNA 综合分析        /analysis
  03 转录与翻译演示      /transcription
  04 ORF 分析            /orf
  05 基因突变模拟        /mutation
  06 蛋白质变化对比      /protein
  07 变异数据库查询      /variants
  08 DNA 序列地图        /map
  09 序列比对与批量分析  /compare
系统
  10 历史记录与报告      /history
      系统设置           /settings
```

说明：

- 09 先保留现有 `/compare` 单对比对，批量模式以 Tab 或 `/compare?mode=batch` 扩展。
- 06 与 05 共用一次突变结果，`/protein` 可接收 `?mutationId=` 展示；无参数时展示说明与最近突变。
- 07 命名用“变异数据库查询”，不用“疾病诊断”。

### 5.1 转录与翻译页（重点）

- 四区布局：输入 / 双螺旋 / 转录翻译轨道 / 控制条。
- SVG 双链：两条骨架 + 碱基横档；播放到第 N 个碱基时高亮对应位置并显示 RNA 聚合酶/核糖体示意。
- 三行序列：DNA 编码链、mRNA、氨基酸；密码子每 3 个分组，当前密码子描边。
- 控制：开始 / 暂停 / 继续 / 上一步 / 下一步 / 重播 / 速度（0.5×、1×、2×）/ 自动播放。
- 状态：加载、错误（非法序列）、空（未输入）、完成（蛋白质序列 + 终止密码子标记）。

### 5.2 突变模拟页（重点）

- 左：正常序列 + 突变配置（位置、类型、替换/插入/删除内容）。
- 右：突变前后 DNA、mRNA、蛋白质对照；差异位置高亮。
- 结果卡：突变类型（序列层）、功能分类（同义/错义/无义/移码）、受影响密码子、氨基酸位置、蛋白长度变化。
- 明确横幅：模拟结果仅用于教学，不构成致病性判断。

### 5.3 序列地图

- 单条序列的横向坐标轴（1-based）。
- 轨道：GC 曲线、ORF（正/反向）、突变位点、常见酶切位点、Motif。
- 交互：缩放（ECharts dataZoom）、hover tooltip、点击查看详情。
- 空态与超长序列降采样策略。

---

## 6. 新增 API 设计（草案）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/transcribe` | 输入序列/链/框，返回 mRNA、密码子、氨基酸、坐标 |
| POST | `/api/translate` | 仅翻译（可被前端动画分步调用） |
| POST | `/api/orfs` | 六阅读框 ORF 列表（frame、start、end、length、start/stop codon） |
| POST | `/api/mutate` | 应用突变，返回突变序列、mRNA、蛋白、分类、密码子差异 |
| POST | `/api/protein/compare` | 两段蛋白/两组 CDS 的差异与影响 |
| GET | `/api/variants/search?q=BRCA1` | ClinVar 基因/变异查询（缓存优先） |
| GET | `/api/variants/{accession}` | 单条注释详情 |
| POST | `/api/map` | ORF/GC/酶切/Motif 轨道数据 |
| GET | `/api/history/{id}/export.csv` | CSV 导出 |
| POST | `/api/batch/analyze` | 多序列 FASTA 批量统计（阶段 7） |

所有新接口沿用现有错误结构 `{detail, code, field?}`、分页结构与 `algorithm_version`。

---

## 7. 算法设计要点

1. **密码子表**：64 个密码子 → 氨基酸，单独常量表；`*` 为终止；含 N → `X`。
2. **翻译**：按 frame 取模切分；末尾不足 3 个碱基忽略并标注；遇到终止密码子停止并记录位置。
3. **ORF**：对正链 3 个框、反链 3 个框分别扫描；记录起止（1-based）、长度（aa）、是否完整（有起始/终止）；允许嵌套，但 UI 默认按长度排序并可筛选。
4. **突变应用**：先校验位置与碱基；替换/插入/删除后重新归一化并校验；插入位置语义固定为“第 N 位后”。
5. **功能分类**：在用户选定的链与框下翻译突变前后 CDS；比较密码子与氨基酸：
   - 无氨基酸变化 → synonymous；
   - 提前出现终止 → nonsense；
   - 长度变化非 3 倍数 → frameshift；
   - 其他长度变化 → in-frame indel；
   - 单个氨基酸改变 → missense。
6. **蛋白质对比**：同一阅读框下逐位比较；若长度不同，用 PairwiseAligner 做蛋白全局比对并映射回密码子位置。
7. **ClinVar**：先 `esearch`（gene/variant），再 `esummary`；缓存 24h；超时 8s、失败返回 `VARIANT_SERVICE_UNAVAILABLE`，不阻塞其他模块。已实测 NCBI E-utilities 可访问（BRCA1 命中 16,166 条；esummary 返回 title / germline classification / accession）。
8. **酶切位点**：Biopython `Restriction` 酶库，限制常用酶集合，避免一次扫描过多酶。

---

## 8. 分阶段开发计划（建议）

| 阶段 | 内容 | 验收 |
| --- | --- | --- |
| 1 | 审查 + 2.0 文档 + 数据库迁移脚本 + 算法骨架与测试清单 | `PROJECT_AUDIT.md`、字段/接口冻结；旧测试全绿 |
| 2 | 密码子表、翻译、ORF、突变核心纯函数 + pytest | 覆盖正常/边界/非法；与手工样例一致 |
| 3 | 转录翻译页 + SVG 动画 + 播放控制 | 动画与后端结果逐步一致；暂停/上一步/重播可用 |
| 4 | 突变模拟页 + 保存 mutation_records | 替换/插入/删除、坐标、前后序列、分类正确 |
| 5 | 蛋白质变化页 + 差异高亮 + 突变详情联动 | 同义/错义/无义/移码样例全部通过 |
| 6 | ClinVar 查询 + 缓存 + 免责声明 + 失败态 | 有网/断网两种情况都可解释；不出现“诊断”措辞 |
| 7 | ORF/序列地图 + CSV + 历史整合 | 地图缩放/悬浮/点击；导出内容与页面一致 |
| 8 | 全站回归 + 性能 + 答辩演示脚本 | 构建/lint/单元/E2E 全绿；演示 10 分钟可走完 |

每阶段结束执行：`pnpm build`、`pnpm lint`、`pnpm test:unit`、`pytest`，并汇报真实结果。

---

## 9. 风险清单

| 风险 | 影响 | 应对 |
| --- | --- | --- |
| ClinVar 网络/限流 | 页面不可用或超时 | 24h 缓存、8s 超时、错误态、可选离线示例缓存；请求加 User-Agent |
| 变异注释语义被误解 | 学术严谨性 | 只做已知变异查询；固定免责声明；不提供致病性预测 |
| ORF 被当成基因 | 概念错误 | UI 统一写“潜在 ORF”；报告注明未验证 |
| 动画与算法不一致 | 展示翻车 | 动画只消费后端/纯函数结果；步骤数组快照测试 |
| 坐标/链/框混淆 | 结果错误 | 接口显式字段；页面固定显示“1-based / 链 / 框”；单测覆盖反链 |
| 范围过大 | 无法按时完成 | 按 8 阶段；优先 3 个展示模块；批量/地图可后置 |
| ECharts 体积 | 首屏变慢 | 保持按需引入；地图页懒加载 |
| DB 迁移 | 旧数据丢失 | 只新增表；迁移前备份 `geneai.db`；不重命名旧表 |
| Windows 开发环境 | 启动/构建异常 | 不用 Python 3.14；dev server 监听需忽略 `server/`；已有 Vite 配置经验 |
| 中文 PDF 字体 | 报告乱码 | 沿用 msyh.ttc 回退链；新增蛋白序列块需验证换行 |

---

## 10. 需要确认的 5 个问题

1. **ClinVar 模式**：在线实时查询 + 本地缓存（推荐），还是只内置离线示例数据？
2. **蛋白质页**：独立 `/protein` 页面（推荐，导航 10 项），还是并入 `/mutation` 作为结果 Tab？
3. **动画依赖**：先用纯 SVG/CSS（推荐，零新依赖），还是安装 framer-motion？
4. **批量分析**：本期是否必须支持多序列 FASTA？还是先保留单对比对，批量放到最后？
5. **数据库**：接受“新增 2 张表 + 复用现有表”的精简方案，还是坚持 11 张表的完整建模？

---

## 11. 审查结论

- 现有 1.x 的工程质量足以支撑 2.0，不需要重写。
- 2.0 的真正难点不是页面数量，而是**生物学口径统一**与**动画/算法一致性**。
- 建议先确认第 10 节的 5 个问题，再进入阶段 1：冻结文档、字段和测试清单，然后开始算法实现。
