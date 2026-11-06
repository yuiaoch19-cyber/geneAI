# GeneAI · DNA 智能序列分析与可视化平台

面向课程展示的 DNA 序列分析平台。输入或上传 DNA 序列，即可完成碱基组成、GC/AT 含量、互补链、反向互补链、RNA 转录与序列差异比较，并把分析结果保存在本机 SQLite 中，支持导出带碱基分布图的中文 PDF 报告。2.0 版本新增转录/翻译动态演示、基因突变模拟，以及基于 NCBI ClinVar 的已知变异注释查询；动画和对比结果每一步都来自后端真实算法。

前端基于 **shadcn-admin** 二次开发，保留下游的技术栈、组件体系与路由方案；不接入任何大模型或第三方序列服务。

![DNA 分析页面](docs/screenshots/phase4-analysis-result.png)

## 功能

| 模块           | 状态 | 说明                                                                          |
| -------------- | ---- | ----------------------------------------------------------------------------- |
| Dashboard 总览 | ✅   | 真实统计、碱基环形/柱状图、GC 趋势、最近记录与详情、快捷操作                  |
| DNA 序列分析   | ✅   | 手动/FASTA 输入、严格校验、A/T/G/C/N 统计、GC/AT、三条转换链、复制、保存历史  |
| 序列差异比较   | ✅   | Biopython 全局比对、替换/插入/缺失与参考坐标、对齐高亮、图例、保存比对记录    |
| 数据可视化     | ✅   | ECharts 环形/柱状/GC-AT 图、可配置滑动窗口曲线、长度分布，真实数据 + 演示标识 |
| 转录与翻译演示 | ✅   | DNA 双螺旋、RNA 聚合酶转录、mRNA 密码子、核糖体/tRNA 翻译、播放控制与状态机   |
| 基因突变模拟   | ✅   | 替换/插入/缺失、DNA/RNA/蛋白三层对比、后果分类与分析报告                      |
| DNA 序列地图   | ✅   | 正/反向 ORF、GC 曲线、限制酶、motif、突变位点；缩放/平移/框选与详情           |
| 变异数据库     | ✅   | NCBI ClinVar 查询、列表/详情、临床意义与审查状态、原始链接、缓存与频率控制    |
| ORF 分析       | 🚧   | 后端六阅读框算法与测试已完成；交互页面在 2.0 后续阶段接入                     |
| 历史记录与报告 | ✅   | 搜索、本地日期筛选、分页、详情、删除确认、刷新、中文 PDF 报告（含碱基分布图） |
| 系统设置       | ✅   | 外观/主题、本地工作区信息（中文）                                             |

计算口径：GC = (G + C) / (A + T + G + C)，N 计入长度与计数但不进分母；RNA 为同向转录（逐位 T→U）。所有演示数据均明确标注「演示数据」，不会写入数据库。

## 技术栈

- 前端：React 19、Vite 8、TypeScript 6、Tailwind CSS 4、TanStack Router/Query/Table、shadcn/ui、ECharts、Lucide
- 后端：Python 3.12、FastAPI、SQLAlchemy 2、Biopython、SQLite
- 报告：ReportLab（A4 PDF，含中文字体与碱基分布图）
- 测试：Vitest（纯函数）、pytest（DNA / 转录 / 翻译 / ORF / 突变 / ClinVar / 比对 / 地图 / API / 报告）

## 项目结构

```
├─ src/                     前端
│  ├─ features/             页面与业务组件（analysis / compare / dashboard / visualization / history / settings / transcription / mutation / map / variants）
│  ├─ components/           ui 基础组件 + geneai 业务组件（PageHeader/StatCard/ChartCard/SequenceInput…）
│  ├─ lib/                  dna.ts 算法、api 客户端、图表主题、演示数据
│  ├─ routes/               TanStack Router 文件式路由（自动生成 routeTree.gen.ts）
│  └─ styles/               theme.css 设计令牌
├─ server/                  后端
│  ├─ app/
│  │  ├─ routers/           analyze / history / comparisons / stats / central_dogma / mutation / map / variants
│  │  ├─ services/          dna.py、fasta.py、alignment.py、report.py、dates.py、genetic_code.py、transcription.py、translation.py、orf.py、mutation.py、map_features.py、clinvar.py
│  │  ├─ models.py          AnalysisRecord / Comparison / Meta
│  │  ├─ schemas.py         请求与响应模型
│  │  └─ main.py            FastAPI 入口
│  ├─ tests/                pytest（DNA / 转录 / 翻译 / ORF / 突变 / ClinVar / 比对 / 地图 / API / 报告）
│  ├─ requirements.txt
│  └─ .env.example
├─ docs/screenshots/        各阶段验收截图与示例报告
├─ docs/audit/              阶段 9 优化后页面截图（audit-before 为优化前）
├─ scripts/                 验收脚本（42 项接口断言 + 13 步业务流程）
├─ API_DESIGN.md            接口说明
├─ DATABASE_DESIGN.md       数据库设计
├─ TEST_PLAN.md             测试计划
├─ ANIMATION_DESIGN.md       转录/翻译动画的分镜、配色与交互规范
└─ PROJECT_SPEC.md 等       项目规格、架构、设计系统与开发计划
```

## 环境准备

| 依赖    | 版本要求                | 说明                                       |
| ------- | ----------------------- | ------------------------------------------ |
| Node.js | ≥ 22（开发验证 26.5.0） | 前端构建与开发服务器                       |
| pnpm    | ≥ 10（验证 10.34.9）    | 仓库使用 pnpm，不要混用 npm/yarn           |
| Python  | **3.12**                | 3.14 下 Biopython 无预编译轮子，安装会卡住 |
| SQLite  | 随 Python 自带          | 无需单独安装                               |
| 浏览器  | Chrome / Edge 最新版    | 图表与 PDF 下载                            |

默认端口：前端 `5208`，后端 `8000`。首次运行会自动创建数据库，无需手工建表。

## 快速开始

### 1. 安装前端依赖

```bash
pnpm install
```

如果提示 `ERR_PNPM_UNEXPECTED_STORE`，说明本机 pnpm store 不一致，可改用：

```bash
pnpm install --store-dir .pnpm-store
```

### 2. 启动后端

```bash
cd server
python --version   # 应为 3.12.x；若默认是 3.14，请用 py -3.12 -m venv .venv
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt   # macOS/Linux: .venv/bin/python -m pip
copy .env.example .env                                          # 可选，macOS/Linux: cp
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

启动后访问 http://127.0.0.1:8000/docs 查看 OpenAPI 文档；`GET /api/health` 应返回 `{"status":"ok"}`。健康检查请用浏览器或 curl 访问 **`/api/health`**。

### 3. 启动前端

另开一个终端：

```bash
pnpm dev --host 127.0.0.1 --port 5208
```

打开 http://127.0.0.1:5208 。Vite 已把 `/api` 代理到 `http://127.0.0.1:8000`。

### 4. 验证安装

```bash
# 前端
pnpm test:unit    # DNA 纯函数与滑动窗口 29 个用例
pnpm build
pnpm lint

# 验收脚本（需前后端均已启动）
pnpm test:api     # 42 项接口断言
pnpm test:e2e     # 13 步业务流程（Playwright + 系统 Edge），并输出截图

# 后端单元与接口测试
cd server
.venv\Scripts\python.exe -m pytest tests -q   # 159 个用例（DNA/转录/翻译/ORF/突变/ClinVar/比对/地图/API/报告）
```

## 数据库初始化

- 数据库文件：`server/geneai.db`，后端启动时由 SQLAlchemy 自动创建表（`analysis_records`、`comparisons`、`meta`）。
- 初始化 SQL 与字段说明见 [DATABASE_DESIGN.md](DATABASE_DESIGN.md)。
- 旧版本的 `analyses` 表会在启动时自动迁移为 `analysis_records`（SQLite `RENAME COLUMN`）。
- 清空全部数据（会丢失历史，请先备份）：

```bash
# 先停止后端
rm server/geneai.db server/geneai.db-wal server/geneai.db-shm   # Windows 用 del
# 重新启动后端，自动建空库
```

## 环境变量

后端读取 `server/.env`（`python-dotenv` 加载，不覆盖真实环境变量），见 `server/.env.example`：

| 变量                   | 默认                    | 说明                         |
| ---------------------- | ----------------------- | ---------------------------- |
| `GENEAI_DB_PATH`       | `server/geneai.db`      | SQLite 文件                  |
| `DATABASE_URL`         | `sqlite:///…/geneai.db` | 完整连接串，优先级更高       |
| `MAX_SEQUENCE_LENGTH`  | `100000`                | 单条序列上限（bp）           |
| `MAX_UPLOAD_BYTES`     | `2097152`               | FASTA 上传上限（2 MB）       |
| `MAX_ALIGNMENT_LENGTH` | `5000`                  | 单条比对序列上限（bp）       |
| `CORS_ORIGIN_REGEX`    | localhost 任意端口      | 开发期跨域白名单             |
| `NCBI_EMAIL`           | `dev@geneai.local`      | NCBI E-utilities 联系邮箱    |
| `NCBI_API_KEY`         | 空                      | 可选；填写后提高请求频率上限 |

前端可选 `VITE_API_BASE_URL`（默认 `/api`），见根目录 `.env.example`。

## API

全部接口已实现（版本 0.8.0）：

```
GET    /api/health
POST   /api/analyze                              {sequence, sequence_name?}
POST   /api/transcribe                            {sequence, strand, input_direction}
POST   /api/translate                             {sequence, strand, input_direction, frame, stop_at_stop}
POST   /api/mutate                                {sequence, mutation_type, position, alt?, ref?, length?, frame, strand, input_direction}
POST   /api/map                                    {sequence, window, step, min_orf_aa, enzymes, motifs, mutation?}
GET    /api/variants/search?q=&query_type=&limit=  ClinVar 查询（基因/rs/VCV/ID）
GET    /api/variants/{variation_id}               ClinVar 单条详情
POST   /api/upload/fasta                         multipart file，单条 FASTA
GET    /api/history?q=&page=&page_size=&date_from=&date_to=&include_sequence=
POST   /api/history
GET    /api/history/{id}
DELETE /api/history/{id}
GET    /api/history/{id}/gc-windows?window=&step=
GET    /api/history/{id}/report                  返回 application/pdf
GET    /api/stats/overview
POST   /api/compare                               只比对、不落库
POST   /api/comparisons
GET    /api/comparisons?q=&page=&page_size=&date_from=&date_to=
GET    /api/comparisons/{id}
DELETE /api/comparisons/{id}
```

错误统一为 `{ detail, code, field? }`。完整请求/响应示例见 [API_DESIGN.md](API_DESIGN.md)。

## 常见错误解决方法

1. **`ERR_PNPM_UNEXPECTED_STORE`**：pnpm 全局 store 不一致，使用 `pnpm install --store-dir .pnpm-store`。
2. **`pip install` 卡在 Biopython 编译**：当前解释器是 Python 3.14，改用 Python 3.12 建 `.venv`。
3. **页面提示「无法连接后端服务」**：确认 uvicorn 已在 8000 端口启动，且终端无报错；浏览器访问 `http://127.0.0.1:8000/api/health`。
4. **`Invalid host header` / 跨域失败**：若前端不在 5208 端口，修改 `server/.env` 的 `CORS_ORIGIN_REGEX` 后重启后端。
5. **端口被占用**：`netstat -ano | findstr :8000` 找到 PID 后结束进程，或改用其他端口（前端需同步修改 `vite.config.ts` 代理目标）。
6. **Vite 启动后请求一直转圈**：Windows 文件监听被大目录拖慢。仓库已忽略 `server/`、`.pnpm-store/`、`dist/`；若仍出现，关闭占用的文件同步/杀毒实时扫描。
7. **PDF 中文显示为方块**：优先使用 Windows 的微软雅黑（`msyh.ttc`）。Linux 服务器请安装 Noto Sans CJK 或宋体，代码会自动回退到 `STSong-Light`。
8. **`database is locked`**：同时有多个后端进程写同一个 `geneai.db`，结束多余进程后重试。
9. **`pnpm test` 报缺少浏览器**：默认 Vitest 使用浏览器模式。只跑算法测试请用 `pnpm test:unit`。
10. **比对报 413 `ALIGNMENT_TOO_LONG`**：单条序列超过 5,000 bp，请截短或调大 `MAX_ALIGNMENT_LENGTH`。

## 课程演示建议

1. 打开 Dashboard，指出统计数据、图表与「演示数据」标识。
2. 在 DNA 分析页粘贴示例序列 → 分析 → 展示 GC/AT、三条转换链 → 保存到历史。
3. 打开历史记录，演示搜索、日期筛选、详情、删除确认。
4. 在差异比较页载入示例，讲解 1 处替换 + 1 处插入及参考坐标，保存比对。
5. 进入数据可视化，切换记录并调整窗口/步长，说明末尾不足窗口的处理策略。
6. 导出一份 PDF，展示中文字体、指标表与碱基分布图。
7. 最后打开系统设置，切换深色主题。

## 说明

- 本项目不使用 AI 模型，所有 DNA 计算均由本地算法完成。
- 序列只保存在本机 SQLite，不上传第三方；日志不打印序列内容。
- 页面不提供疾病或临床结论，仅用于教学演示。

## 致谢

基于 [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin) 二次开发，保留其 MIT License 与组件设计。
