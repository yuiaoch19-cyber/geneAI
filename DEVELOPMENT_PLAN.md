# GeneAI 开发计划

| 项目     | 内容                                     |
| -------- | ---------------------------------------- |
| 文档版本 | v1.0（阶段 1 交付）                      |
| 总阶段数 | 8（阶段 0 与阶段 1 已完成）              |
| 当前状态 | 阶段 1 收尾，等待确认进入阶段 2          |
| 交付形态 | 本地可运行的前后端分离项目 + 文档 + 测试 |

---

## 1. 阶段总览

| 阶段 | 名称                    | 核心产出                               | 状态        |
| ---- | ----------------------- | -------------------------------------- | ----------- |
| 0    | 基线导入                | 模板可安装、可构建、可启动、Git 基线   | ✅ 已完成   |
| 1    | 架构分析                | 8 份设计与约束文档                     | ✅ 本次交付 |
| 2    | 设计系统与壳体          | 品牌色、导航、路由骨架、Dashboard 骨架 | ⏳ 待开始   |
| 3    | 后端基础与 DNA 分析 API | FastAPI + SQLite + 分析算法 + 接口测试 | ⏳          |
| 4    | DNA 分析页面            | 真实分析闭环（输入 → 结果 → 保存）     | ⏳          |
| 5    | 序列差异比较            | 比对算法 + 对齐视图 + 差异表           | ⏳          |
| 6    | 数据可视化              | ECharts 四图 + 序列选择                | ⏳          |
| 7    | 历史记录与首页联动      | 列表、筛选、详情、删除、真实 Dashboard | ⏳          |
| 8    | PDF、设置与交付         | 报告导出、偏好、README、最终验收       | ⏳          |

原则：**一次只做一个阶段**；上一阶段的构建/测试未通过不进入下一阶段；每阶段结束提交一次 Git commit。

---

## 2. 阶段 2：设计系统与壳体

**目标**：让项目"看起来是 GeneAI"，但不写业务逻辑。

### 任务

1. 改写 `src/styles/theme.css`：按 `DESIGN_SYSTEM.md` 落地浅色/深色令牌、`--radius: 0.75rem`、图表色板。
2. 在 `src/styles/index.css` 增加 `shadow-card`、`shadow-popover` 两个 utility；调整 body 背景。
3. 更新 `index.html`：`lang="zh-CN"`、title、description、theme-color、favicon 文案。
4. 重写 `src/components/layout/data/sidebar-data.ts`：
   - 品牌：GeneAI / DNA Sequence Analysis
   - 导航：总览 `/`、序列分析 `/analysis`、差异比较 `/comparison`、数据可视化 `/visualization`、历史记录 `/history`、设置 `/settings`
   - 用户区改为课程项目信息（不出现真实个人信息）
5. 品牌区：用 `AppTitle` 替代 `TeamSwitcher`（`app-sidebar.tsx:22-24` 已预留），或保留 TeamSwitcher 但只放一个 GeneAI 团队项；二选一，以视觉更简洁为准。
6. 新建 5 个路由占位页（`analysis/comparison/visualization/history`），每个页面有真实标题、说明、空状态与主操作按钮（按钮先跳转到自身锚点或禁用并注明"阶段 X 实现"——**不允许假交互**，优先只放"即将开放"说明）。
7. Dashboard 重写为静态骨架：欢迎区 + 4 指标卡（显示 `—`）+ 图表卡空状态 + 最近记录空状态。
8. 移除导航中的 Clerk/Tasks/Apps/Chats/Users 入口；文件保留。

### 验收

- `pnpm build`、`pnpm lint` 通过。
- 六个路由可访问，侧边栏高亮正确，移动端抽屉正常。
- 深色/浅色切换后无不可读元素。
- 页面无假数据数字，全部为 `—` 或空状态。

### 不做

后端、ECharts、真实算法、PDF。

---

## 3. 阶段 3：后端基础与 DNA 分析 API

**目标**：后端可独立跑通分析接口并落库。

### 任务

1. 创建 `server/` 目录与 venv；实测 Python 版本与依赖 wheel，确定 3.12 或 3.14。
2. `requirements.txt`：fastapi、uvicorn[standard]、sqlalchemy、pydantic、biopython、reportlab、pytest、httpx。
3. `app/config.py`：数据库路径、最大长度（100,000）、CORS、版本号。
4. `app/db.py`：engine（`check_same_thread=False`）、SessionLocal、`get_db`、`init_db`。
5. `app/models.py`：`Analysis`、`Comparison`、`Meta`（见 `DATABASE_DESIGN.md`）。
6. `app/services/dna.py`：
   - `normalize_sequence(raw) -> str`（去空白/数字/FASTA 头，大写）
   - `validate_sequence(seq)`（字符集、长度、空序列）
   - `analyze(seq) -> dict`（长度、计数、GC/AT、互补、反向互补、RNA）
   - `gc_windows(seq, window, step)`
7. `app/routers/analyses.py`：POST / GET 列表 / GET 详情 / DELETE。
8. `app/routers/health.py`。
9. `tests/test_dna_service.py`、`tests/test_api_analyses.py`。

### 验收

- `pytest` 全绿。
- `curl`/httpx 调 POST 返回正确结果，SQLite 中有记录。
- 非法字符、空序列、超长序列返回规定错误码。

### 关键测试数据

- `ATGC` → A1 T1 G1 C1，GC 50%。
- `AAAA` → GC 0%，AT 100%。
- `GGCC` → GC 100%。
- `NNNN` → GC 0%，有效长度 0。
- 小写 + 换行 + 空格输入 → 规范化后与纯大写一致。
- 长度 100,001 → 413。

---

## 4. 阶段 4：DNA 分析页面

**目标**：前端完成一次真实分析并保存。

### 任务

1. `vite.config.ts` 增加 `/api` 代理。
2. `src/lib/api/client.ts`（axios 实例 + 错误归一化）、`analyses.ts`、`query-keys.ts`。
3. `src/types/api.ts` 与后端响应对齐。
4. `src/lib/dna/fasta.ts`：解析单条 FASTA（`>header` + 序列），处理 CRLF。
5. `src/features/analysis/`：
   - `components/sequence-input.tsx`（Tabs：手动/FASTA/示例，字符计数）
   - `components/analysis-result.tsx`（指标 + 碱基 + 三条链）
   - `components/copy-button.tsx`
   - `index.tsx`（两栏布局、TanStack Query mutation、Toast）
6. 示例序列：明确标注"示例数据"，使用短序列（≤ 120bp），不伪造分析结果。
7. 空/错/加载三态。

### 验收

- 输入 → 分析 → 结果展示 → 刷新历史接口能看到记录。
- 非法字符在第 N 位提示。
- 复制按钮写入剪贴板并有 Toast。
- 刷新页面后最近一次结果可从历史进入。

---

## 5. 阶段 5：序列差异比较

**目标**：真实全局比对与差异展示。

### 任务

1. `app/services/comparison.py`：
   - `PairwiseAligner`（global，match 2，mismatch -1，open gap -10，extend -0.5）
   - `compare(ref, query) -> {score, identity, substitutions, insertions, deletions, differences, alignment}`
   - 差异提取基于 `alignment.aligned` 块，禁止逐位比较
2. `POST /api/comparisons`、列表/详情/删除接口。
3. 前端 `features/comparison/`：双输入、摘要指标、对齐视图（60 列分块）、差异表（类型 Tab）、保存。
4. 对齐视图组件支持横向滚动与位置标尺。

### 验收

- 等长单碱基替换：1 substitution，位置正确。
- 长度不同（含插入/缺失）：分类正确，位置以参考序列为准。
- 完全相同的序列：0 差异，identity 100%。
- 两端都带缺口的情况不出现负位置。
- 页面不出现疾病/功能结论。

### 关键测试数据

```
ref:   ATGCGTACGT
query: ATGCGTTCGT      → 1 substitution (pos 7, A→T)
ref:   ATGCGTACGT
query: ATGCGTACGTAA    → 2 insertions (末端)
ref:   ATGCGTACGT
query: ATGCGACGT       → 1 deletion (pos 6)
```

---

## 6. 阶段 6：数据可视化

**目标**：ECharts 四类图由真实序列驱动。

### 任务

1. 安装 `echarts`（不装 wrapper），`src/components/charts/echart.tsx` 按需注册 + resize observer + 主题同步。
2. `src/lib/charts/theme.ts`：从 CSS 变量读取颜色，提供 `baseChartOption`。
3. `features/visualization/`：
   - 序列选择器（最近 20 条 + URL `?id=`）
   - 环形图、柱状图、GC/AT 堆叠条、滑动窗口曲线
   - 窗口大小/步长控件（前端计算，复用 `lib/dna/gc-window.ts`）
4. 图表空状态、加载骨架、错误重试。
5. 路由懒加载，确认构建产物分包。

### 验收

- 四张图数据与后端返回一致（手工核对一条短序列）。
- 切换序列/窗口后图表更新，无残留旧数据。
- 深色模式图表可读。
- 移动端图表不溢出。

---

## 7. 阶段 7：历史记录与首页联动

**目标**：完整的历史管理与真实 Dashboard。

### 任务

1. `GET /api/analyses`、`/api/comparisons` 支持 `q/from/to/type/page/page_size`；`/api/stats/overview`。
2. 统一历史视图：Tabs（全部/分析/比对）或合并接口；推荐前端两个 query 合并为一张表。
3. `features/history/`：DataTable、搜索防抖、时间筛选（Select）、详情 Sheet、删除 AlertDialog、导出入口。
4. `useTableUrlState` 同步筛选到 URL。
5. Dashboard 接入 `/api/stats/overview`：指标、碱基分布、GC 趋势、最近 5 条、快捷入口。
6. 写操作后 invalidate `stats` 与列表。

### 验收

- 搜索"ATG"、筛选"近 7 天"结果正确。
- 删除后列表、统计、最近记录同步更新。
- 刷新页面筛选条件保留。
- Dashboard 数字与分析/比对操作次数一致（按口径核对）。

---

## 8. 阶段 8：PDF、设置与交付

**目标**：可演示、可交付、可复现。

### 任务

1. `app/services/report.py`：ReportLab 生成分析报告与比对报告，中文字体 `STSong-Light`，含页眉页脚、指标表、序列分块、差异表。
2. `GET /api/analyses/{id}/report`、`/api/comparisons/{id}/report`。
3. 设置页改造：主题、字体、窗口默认值、自动保存开关、系统信息（`/api/health`）、关于项目。
4. README：环境要求、安装、启动、端口、常见问题、目录说明、验收步骤。
5. `server/README.md`、`requirements.txt`、`server/.env.example`、数据库说明。
6. 全量测试、lint、build；清理模板残留（未使用依赖不删、未引用页面保留）。
7. 最终验收演示脚本（5 分钟）。

### 验收

- PDF 在 Windows 默认阅读器中打开无乱码，内容与记录一致。
- 设置修改后刷新仍生效。
- 按 README 从零启动成功（删除 node_modules 与 geneai.db 的极端场景至少验证一次）。
- 所有验收清单项勾选。

---

## 9. 依赖与顺序

```
阶段 2 ──► 阶段 3 ──► 阶段 4 ──► 阶段 5 ──► 阶段 6 ──► 阶段 7 ──► 阶段 8
   │          │          │          │          │          │
   └ 设计令牌  └ 数据库    └ API 客户端 └ 比对服务  └ ECharts   └ 统计接口
```

- 阶段 3 可与阶段 2 并行（不同目录），但建议顺序执行，便于逐阶段验收。
- 阶段 6 依赖阶段 4 的记录结构；阶段 7 依赖 4/5 的写接口；阶段 8 依赖 7 的详情数据。

---

## 10. 每阶段汇报模板

```markdown
## 阶段 N 汇报

### A. 完成的功能

- …

### B. 修改和新增的文件

- 修改：`path:line` — 说明
- 新增：`path` — 说明

### C. 使用的现有组件

- …

### D. 运行和测试结果

| 命令       | 结果                |
| ---------- | ------------------- |
| pnpm build | 通过 / 失败（原因） |
| pnpm lint  | …                   |
| pytest     | …                   |

### E. 遗留问题

- …

### F. 下一阶段建议

- …
```

要求：结果必须来自实际执行，不得写"应该通过"。

---

## 11. 风险与应对

| 风险                     | 触发阶段 | 应对                                            |
| ------------------------ | -------- | ----------------------------------------------- |
| Python 3.14 依赖不可用   | 3        | 改用 3.12 venv；在 README 记录                  |
| PairwiseAligner 长序列慢 | 5        | 限制 10,000bp；前端提示；必要时分段             |
| ECharts 包体过大         | 6        | 按需注册 + 懒加载 + 手动分包                    |
| ReportLab 中文乱码       | 8        | CID 字体 + 文本抽取测试                         |
| 阶段膨胀                 | 全程     | 严格按本文档范围，超范围记入"后续增强"          |
| 模板残留假数据           | 2/7      | 全局搜索 `Math.random`、`faker`，逐处替换或标注 |

---

## 12. 后续增强（不在本次范围）

- 多序列比对与进化树。
- 序列编辑/反向翻译。
- 批量 FASTA 上传与批量分析。
- 用户账户与云端同步。
- 报告模板自定义。
- 国际化（i18n）。

---

_计划变更需在阶段汇报中说明原因，并同步更新本文档。_
