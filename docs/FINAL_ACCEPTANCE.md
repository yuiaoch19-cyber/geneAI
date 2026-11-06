# GeneAI 2.0 最终验收报告

> 验收日期：2026-11-06  
> 版本：`2.0.0`（提交后以 `git log -1` 为准）  
> 项目定位：面向课程展示的 DNA 转录翻译、突变分析与序列地图平台  
> 结论：**15 项验收清单全部通过**；未实现功能已在「8. 已知限制」中明确列出，不作为已实现功能报告。

---

## 1. 运行环境与启动

| 项目          | 要求 / 实际                                             |
| ------------- | ------------------------------------------------------- |
| 前端          | React 19 + Vite 8 + TypeScript 6 + Tailwind 4           |
| 后端          | Python 3.12（`server/.venv`）+ FastAPI 0.162 + Uvicorn  |
| 生物计算      | Biopython 1.88（翻译、ORF、比对、限制酶）               |
| 数据库        | SQLite，`server/geneai.db`                              |
| 图表 / 可视化 | ECharts 6（统计图）、原生 SVG（序列地图、转录翻译动画） |
| PDF / CSV     | ReportLab 5（中文字体 + 饼图）、UTF-8 BOM CSV           |

启动步骤：

```powershell
# 1. 前端依赖
pnpm install --store-dir .pnpm-store

# 2. 后端依赖（首次）
cd server
C:\Users\<你>\.local\bin\uv.exe pip install --python .venv\Scripts\python.exe -r requirements.txt

# 3. 启动后端
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# 4. 启动前端（新终端，项目根目录）
pnpm dev --host 127.0.0.1 --port 5208
```

打开 `http://127.0.0.1:5208`；接口文档 `http://127.0.0.1:8000/docs`；健康检查 `http://127.0.0.1:8000/api/health`。

---

## 2. 功能清单（按页面）

| 页面           | 路由                   | 已实现                                                                                                                                 |
| -------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 分析总览       | `/`                    | 真实统计、GC/AT 双线趋势、碱基环形图、分析构成、最近记录、6 个真实模块入口、演示数据明确标识                                           |
| DNA 序列分析   | `/analysis`            | 手动/FASTA 输入、长度、A/T/G/C/N、GC/AT、互补、反向互补、RNA、复制、保存历史、浏览器内校验                                             |
| 转录与翻译演示 | `/transcription`       | 双螺旋 SVG、RNA 聚合酶逐步转录、mRNA 密码子、核糖体/tRNA 翻译、多肽链、播放/暂停/上一步/下一步/重播/速度、移动端控制条、A/B/C 教学示例 |
| 突变模拟       | `/mutation`            | 替换/插入/缺失、1-based 坐标校验、DNA 差异、转录对比、蛋白逐位对比、同义/错义/无义/移码/整码/提前终止、分析报告、6 个预设              |
| DNA 序列地图   | `/map`                 | 正/反向 ORF、起始/终止、GC 曲线、限制酶、motif、突变、缩放/平移/框选/分段、ORF 与突变详情弹窗                                          |
| 变异数据库     | `/variants`            | ClinVar 基因/rs/VCV 查询、临床意义与审查状态、GRCh38 位置、转录本、表型、原始链接、缓存与限流、VUS 免责                                |
| 序列比对       | `/compare`             | Biopython 全局比对、替换/插入/缺失、参考坐标、对齐视图、差异表、评分与算法说明、保存记录                                               |
| 数据可视化     | `/visualization`       | 碱基环形图、数量柱状图、GC/AT 对比、可配置滑动窗口 GC 曲线、序列长度分布                                                               |
| 历史记录       | `/history`             | 搜索、本地日期筛选、分页、详情、删除确认、刷新、空态、PDF、CSV                                                                         |
| 系统设置       | `/settings/appearance` | 字体、浅色/深色主题、本地工作区说明                                                                                                    |

---

## 3. 技术架构

```
React SPA (Vite / TanStack Router / Query)
      │  REST /api（Vite 代理）
      ▼
FastAPI（routers: analyses, central_dogma, mutation, orfs, map,
         variants, comparisons, history, stats）
      │
      ├─ services: dna / transcription / translation / orf /
      │            mutation / alignment / map_features /
      │            clinvar / report / csv_export / fasta
      ├─ SQLAlchemy 2 → SQLite（analysis_records / comparisons / meta）
      └─ 外部：NCBI ClinVar E-utilities（缓存 10 分钟 + 0.35s 限流）
```

设计原则：

- **算法在后端**：前端只负责展示与播放，动画每一步都对应 `/api/transcribe`、`/api/translate` 的真实返回。
- **坐标统一**：所有区间为 1-based 闭区间；负链坐标在服务层换算为正链，并在返回体中说明。
- **错误统一**：`{ detail, code, field? }`；422 统一为 `VALIDATION_ERROR`。
- **可复现**：所有测试均为真实 API/函数调用，不 mock 算法结果。

---

## 4. 核心算法与验收数据

教学示例：

- A：`ATGGAACCTTGGTAA`
- B：`ATGTAACCTTGGTAA`
- C：`ATGAGAACCTTGGTAA`

| 项目    | A                     | B                 | C                     |
| ------- | --------------------- | ----------------- | --------------------- |
| 长度    | 15 bp                 | 15 bp             | 15 bp                 |
| 碱基    | A5 T4 G4 C2           | —                 | —                     |
| GC / AT | 40% / 60%             | —                 | —                     |
| RNA     | `AUGGAACCUUGGUAA`     | `AUGUAACCUUGGUAA` | `AUGAGAACCUUGGUAA`    |
| 蛋白    | `MEPW*`               | `M*`              | `MRTLV`               |
| 密码子  | `AUG GAA CCU UGG UAA` | `AUG UAA`         | `AUG AGA ACC UUG GUA` |

突变验证（以 A 为原始序列）：

| 操作             | 结果                             | 结论                    |
| ---------------- | -------------------------------- | ----------------------- |
| 第 6 位 A→G      | `MEPW* → MEPW*`                  | 同义                    |
| 第 7 位 C→T      | `MEPW* → MESW*`                  | 错义                    |
| 第 11 位 G→A     | `MEPW* → MEP*`（提前终止）       | 无义                    |
| 第 4 位插入 A    | `MEPW* → METLV`                  | 移码                    |
| 第 3 位插入 GGG  | `MEPW* → MGEPW*`                 | 整码插入                |
| 第 4 位缺失 3 bp | `MEPW* → MPW*`                   | 整码缺失                |
| A vs B 全局比对  | 1 替换、0 插入、0 缺失、score 27 | 与 PairwiseAligner 一致 |

其他算法：

- ORF：A 在六框扫描中命中 1 个 ORF（1–15，蛋白 `MEPW`），仅 ATG 起始、同框终止，标记 `is_potential=true`。
- 限制酶：`GAATTCAAAAGGATCCAAAGCTT` → EcoRI:2、BamHI:12、HindIII:19（1-based）。
- GC 滑窗：A 使用 5/5 窗口 → `40/40/40`，末尾不足一窗忽略。
- 模板链：`TACCTTGGAACCATT`（3′→5′）转录得到 `AUGGAACCUUGGUAA`。

---

## 5. 数据库设计

SQLite 文件：`server/geneai.db`。

| 表                 | 用途       | 关键字段                                                                                                                                                    |
| ------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `analysis_records` | 单序列分析 | `sequence_name`、`sequence_length`、`original_sequence`、`a/t/g/c/n_count`、`gc_content`、`at_content`、三条链、`source`、`algorithm_version`、`created_at` |
| `comparisons`      | 双序列比对 | `reference_sequence`、`query_sequence`、`score`、`identity`、差异计数、`alignment_json`、`differences_json`、`created_at`                                   |
| `meta`             | 结构版本   | `key`、`value`                                                                                                                                              |

约束：

- `a/t/g/c/n_count` 之和等于 `sequence_length`（CHECK）。
- `source ∈ (manual, fasta, demo)`。
- 索引：`created_at`、`sequence_hash`（用于去重与趋势查询）。
- 初始化：后端启动时 `init_db()` 自动建表；删除 `server/geneai.db` 可清空历史。

---

## 6. 测试报告

### 6.1 自动化测试

| 层级       | 命令                                                       | 结果                                                                 |
| ---------- | ---------------------------------------------------------- | -------------------------------------------------------------------- |
| 后端       | `cd server && .venv\Scripts\python.exe -m pytest tests -q` | **164 passed**（1 个 Starlette/httpx 弃用 warning）                  |
| 前端纯函数 | `pnpm test:unit`                                           | **29 passed**                                                        |
| 类型/构建  | `pnpm build`（`tsc -b && vite build`）                     | ✅ `built in 2.03s`                                                  |
| 代码检查   | `pnpm lint`                                                | ✅ 0 error / 1 warning（TanStack Table 与 React Compiler，模板既有） |

后端 164 例分布：

| 文件                    | 数量 | 覆盖                                     |
| ----------------------- | ---- | ---------------------------------------- |
| `test_dna.py`           | 13   | 清理、N、GC、链转换                      |
| `test_transcription.py` | 16   | 编码/模板链、方向、非法字符              |
| `test_translation.py`   | 18   | 密码子、终止、移码、N→X                  |
| `test_orf.py`           | 7    | 六框、负链坐标、嵌套                     |
| `test_mutation.py`      | 19   | 突变与后果分类                           |
| `test_mutation_api.py`  | 16   | `/api/mutate`                            |
| `test_orfs_api.py`      | 3    | `/api/orfs`                              |
| `test_map.py`           | 9    | 限制酶、motif、GC、突变图层              |
| `test_alignment.py`     | 9    | 全局比对                                 |
| `test_comparisons.py`   | 6    | 比对接口                                 |
| `test_clinvar.py`       | 13   | 解析、缓存、限流、错误                   |
| `test_central_dogma.py` | 13   | 转录/翻译接口                            |
| `test_api.py`           | 22   | 健康、分析、FASTA、历史、CSV、报告、统计 |

### 6.2 UI 与交互验收

- 10 个页面 × 3 档（1440 / 834 / 390）共 30 次加载：**0 控制台错误、0 HTTP ≥ 500、0 横向溢出**。
- 24 项交互检查全部通过：教学示例 B 载入、17 步播放、暂停保持 2/17、下一步 3/17、突变 B 无义、C 移码、历史 CSV 下载与内容、10 条路由无溢出。
- 截图证据：`docs/audit-v2/`、`docs/screenshots/`。

---

## 7. 动画验收

| 检查项                              | 结果                                          |
| ----------------------------------- | --------------------------------------------- |
| DNA 双螺旋（两条链、碱基对、5′/3′） | ✅ SVG 实时绘制，可展开/收拢                  |
| RNA 聚合酶移动、逐碱基生成          | ✅ 每步对应模板碱基与 RNA 碱基                |
| mRNA 密码子高亮                     | ✅ 当前密码子三联体高亮                       |
| 核糖体 + tRNA + 氨基酸链            | ✅ 当前 tRNA 反密码子、氨基酸、多肽链逐步增长 |
| 暂停 / 继续                         | ✅ 步数保持                                   |
| 上一步 / 下一步                     | ✅ 步数回退/推进                              |
| 重播                                | ✅ 回到 0 并自动播放                          |
| 速度                                | ✅ 0.5× / 1× / 1.5× / 2×                      |
| 与算法一致                          | ✅ 所有数据来自后端转录/翻译响应              |

---

## 8. 已知限制

1. ORF 仅识别 ATG 起始，未覆盖 GTG/TTG 等替代起始；结果为「潜在 ORF」，不等同已验证基因。
2. 序列地图一次只叠加一个突变；限制酶固定 15 种；motif 上限 500；克隆/酶切详情未做独立弹窗。
3. 突变分类是序列层面的启发式结果，不是临床判读，也不输出 HGVS 命名。
4. ClinVar 依赖外网；离线时返回 503；缓存为进程内内存，重启即失效；只查询已知变异，不接受纯 DNA 序列。
5. 模板链 5′→3′ 输入时，`affected_codon` 仍按输入坐标计算（页面已标明坐标规则）。
6. 移动端序列地图采用横向滚动（SVG 最小宽度 720px），不是压缩到一屏。
7. 开发态 TanStack Router 浮钮会遮挡部分控件；生产构建不存在该浮钮。
8. 前端 ECharts chunk 约 575 kB，构建有体积提示，未做进一步拆分。

---

## 9. 15 项验收清单

| #   | 检查项                          | 结果 | 证据                             |
| --- | ------------------------------- | ---- | -------------------------------- |
| 1   | 前后端与数据库可启动、通信正常  | ✅   | health `2.0.0`、`database: ok`   |
| 2   | 10 条路由可访问、无控制台错误   | ✅   | 30 次加载审计                    |
| 3   | DNA 校验、GC/AT、互补、反向互补 | ✅   | A 组数据、`test_dna`             |
| 4   | 转录（编码链/模板链/方向）      | ✅   | 模板链实测、`test_transcription` |
| 5   | 翻译（密码子/终止/移码）        | ✅   | A/B/C 蛋白、`test_translation`   |
| 6   | ORF 六框与反向坐标              | ✅   | 1–15 MEPW、`test_orf`            |
| 7   | 突变三类型与后果分类            | ✅   | 6 组突变、`test_mutation`        |
| 8   | 蛋白逐位对比与提前终止          | ✅   | `MEPW* → M*`、`protein_changes`  |
| 9   | 双序列比对                      | ✅   | A vs B、`test_alignment`         |
| 10  | 限制酶与 GC 滑窗                | ✅   | 2/12/19、40/40/40                |
| 11  | 转录翻译动画与算法一致          | ✅   | 17 步播放、暂停/步进             |
| 12  | ClinVar 真实来源与免责          | ✅   | BRCA1 16,166 条、rs80357906      |
| 13  | PDF 中文与图表                  | ✅   | `phase10-report.pdf`、预览图     |
| 14  | CSV 导出字段完整                | ✅   | 历史行导出、API 测试             |
| 15  | 构建、测试、Lint 全部通过       | ✅   | 164 / 29 / 0 error               |

---

## 10. 证据文件

- 自动化测试：`server/tests/`、`src/lib/dna.test.ts`
- 验收截图：`docs/audit-v2/`（30 张）、`docs/screenshots/`
- UI 精修记录：`docs/UI_POLISH_REPORT.md`
- 样例报告：`docs/screenshots/phase10-report.pdf`、`phase10-report-preview.png`
- 教学样本：`samples/`、`samples/README.md`
- 答辩演示稿：`docs/PRESENTATION.md`、`docs/GeneAI-2.0-答辩演示.pptx`

---

_本报告只列出已实现并通过测试的功能；未实现内容集中列在第 8 节。_
