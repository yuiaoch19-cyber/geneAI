# GeneAI 项目技术架构

| 项目     | 内容                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 文档版本 | v1.0（阶段 1 交付）                                                          |
| 基线     | `satnaing/shadcn-admin` v2.2.1（commit `bf1d467`）                           |
| 前端     | React 19 + Vite 8 + TypeScript 6 + Tailwind v4 + shadcn/ui + TanStack Router |
| 后端     | Python + FastAPI + Biopython + SQLite + ReportLab                            |
| 状态     | 前端基线可构建可运行；后端尚未创建                                           |

---

## 1. 现有模板架构分析（实测，非推测）

### 1.1 运行与构建

`package.json` 实测版本：

| 类别    | 依赖                                                          | 版本                   |
| ------- | ------------------------------------------------------------- | ---------------------- |
| 框架    | react / react-dom                                             | 19.2.5                 |
| 构建    | vite                                                          | 8.0.8（Rolldown 内核） |
| 语言    | typescript                                                    | ~6.0.3                 |
| 样式    | tailwindcss / @tailwindcss/vite                               | 4.2.2                  |
| 路由    | @tanstack/react-router                                        | 1.168.22               |
| 数据    | @tanstack/react-query / react-table                           | 5.99.0 / 8.21.3        |
| 图表    | recharts                                                      | 3.8.1                  |
| 表单    | react-hook-form / zod / @hookform/resolvers                   | 7.72.1 / 4.3.6 / 5.2.2 |
| UI 基础 | radix-ui 系列、lucide-react、cmdk、sonner（未使用 vaul）      | 见 package.json        |
| 状态    | zustand                                                       | 5.0.12                 |
| HTTP    | axios                                                         | 1.15.0                 |
| 测试    | vitest 4.1.4 + @vitest/browser-playwright + playwright 1.59.1 | 浏览器模式             |
| 质量    | eslint 10.2.1、prettier 3.8.3、knip 6.4.1                     | —                      |

脚本（`package.json:5-17`）：

```bash
pnpm dev        # vite
pnpm build      # tsc -b && vite build
pnpm lint       # eslint .
pnpm preview    # vite preview
pnpm test       # vitest run --browser.headless
pnpm format     # prettier --write .
```

关键事实：

- **Tailwind 为 v4，无 `tailwind.config.js`**。主题全部在 `src/styles/theme.css` 用 CSS 变量 + `@theme inline` 定义；`components.json` 的 `tailwind.config` 为空字符串。
- **Vite 8 使用 Rolldown**。本地必须保持 `node-linker=hoisted`（`.npmrc`），否则 pnpm 的 Windows junction 在 Node 26 下不被 realpath，导致 `Cannot find package 'rolldown'`。
- 沙箱禁止 Node 派生子进程时，`vite build` 会报 `spawn EPERM` 与 Tailwind oxide 原生模块加载失败；这不是代码问题，需在完整权限终端执行。
- `vite.config.ts:10-23`：`tanstackRouter({ target: 'react', autoCodeSplitting: true })` + `react()` + `tailwindcss()`，别名 `@ → ./src`。
- `vite.config.ts:24-43`：Vitest 使用真实浏览器（Chromium）；纯函数测试也会在浏览器环境跑。

### 1.2 应用入口与 Provider 顺序

`src/main.tsx`（107 行）：

```
StrictMode
└─ QueryClientProvider (staleTime 10s, retry 自定义)
   └─ ThemeProvider (cookie: vite-ui-theme)
      └─ FontProvider (cookie: font)
         └─ DirectionProvider (RTL)
            └─ RouterProvider
```

- QueryClient 全局错误处理：401 重置 auth 并跳 `/sign-in`；500 在生产环境跳 `/500`。
- `createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent' })`。
- 路由类型注册：`declare module '@tanstack/react-router' { interface Register { router: typeof router } }`。

### 1.3 路由体系（文件式）

```
src/routes/
├── __root.tsx                    # createRootRouteWithContext；NotFound/GeneralError
├── (auth)/                       # 无布局前缀：sign-in、sign-up、otp、forgot-password
├── (errors)/                     # 401/403/404/500/503
├── _authenticated/               # 主应用命名空间（实际无登录守卫）
│   ├── route.tsx                 # createFileRoute('/_authenticated')({ component: AuthenticatedLayout })
│   ├── index.tsx                 # '/' → Dashboard
│   ├── apps|chats|tasks|users|help-center/
│   └── settings/                 # route.tsx + index/account/appearance/display/notifications
└── clerk/                        # Clerk 演示路由（可选依赖，未配置密钥）
```

- `routeTree.gen.ts` 由插件生成，**禁止手改**；新增页面只需新增文件。
- `_authenticated` 没有 `beforeLoad` 守卫，不会因未登录跳转——这对课程项目是合适的，**不要新增登录门槛**。
- 每个页面通过 `getRouteApi('/_authenticated/xxx/')` 读取 typed search params。

### 1.4 布局系统

`src/components/layout/authenticated-layout.tsx:15-41`：

```
SearchProvider
└─ LayoutProvider
   └─ SidebarProvider (defaultOpen 来自 cookie 'sidebar_state')
      ├─ SkipToMain
      ├─ AppSidebar
      └─ SidebarInset (@container/content, fixed 布局高度处理)
         └─ <Outlet />
```

| 组件                                    | 文件                    | 作用                                                                     |
| --------------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `AppSidebar`                            | `app-sidebar.tsx:15-36` | 组合 SidebarHeader(TeamSwitcher) / Content(NavGroup[]) / Footer(NavUser) |
| `sidebarData`                           | `data/sidebar-data.ts`  | 唯一导航数据源：user、teams、navGroups                                   |
| 导航类型                                | `layout/types.ts:44`    | `NavItem = NavCollapsible \| NavLink`，`NavLink.url` 为路由字面量        |
| `Header`                                | `header.tsx:11-49`      | 固定高 64px，滚动超过 10px 加阴影与背景模糊                              |
| `Main`                                  | `main.tsx:9-26`         | `px-4 py-6`，非 fluid 时 `max-w-7xl` 居中                                |
| `NavGroup` / `NavUser` / `TeamSwitcher` | 同目录                  | 折叠分组、用户菜单、团队切换                                             |

布局约定：页面 = `<> <Header>…</Header> <Main>…</Main> </>`；需要全高滚动时给 `Main` 传 `fixed`。

### 1.5 主题与样式

- `src/styles/index.css:1-3` 引入 `tailwindcss`、`tw-animate-css`、`./theme.css`。
- `index.css:7-39`：base 层统一边框色、滚动条、body 背景；移动端输入框 16px 防缩放。
- `theme.css:1-35` 为 `:root` 令牌（全部 oklch），`theme.css:37-61` 为 `.dark` 覆盖。
- `theme.css:63-102` 为 `@theme inline`，把 `--background` 等映射为 `--color-background`，因此可直接写 `bg-background`、`text-muted-foreground`。
- `theme.css` 还定义 `--radius` 与 `--font-inter`、`--font-manrope`；字体列表在 `src/config/fonts.ts`，Google Fonts 在 `index.html:66-71`。
- **改品牌色只改 theme.css，不在组件里写死颜色**。

### 1.6 UI 组件库存（`src/components/ui`，30 个）

alert、alert-dialog、avatar、badge、button、calendar、card、checkbox、collapsible、command、dialog、dropdown-menu、form、input、input-otp、label、popover、radio-group、scroll-area、select、separator、sheet、sidebar、skeleton、sonner、switch、table、tabs、textarea、tooltip。

定制说明（README）：scroll-area / sonner / separator 有本地修改；alert-dialog、calendar、command、dialog、dropdown-menu、select、table、sheet、sidebar、switch 含 RTL 适配。**用 shadcn CLI 更新这些组件会覆盖本地改动**，禁止批量 `shadcn add --overwrite`。

### 1.7 表格、表单、弹窗模式

**数据表格**（`src/components/data-table`）：

- `DataTableToolbar`（`toolbar.tsx:23`）：搜索框 + 分面筛选 + 重置 + 列显隐。
- `DataTablePagination`（`pagination.tsx:23`）：页码、每页条数、首尾页。
- `DataTableColumnHeader`：排序表头；`DataTableBulkActions`：批量操作；`faceted-filter`、`view-options`。
- 页面级封装参考 `src/features/users/components/users-table.tsx:36-89`：`useReactTable` + `getCoreRowModel/getFilteredRowModel/getSortedRowModel/getPaginationRowModel/getFaceted*`。
- URL 同步：`useTableUrlState`（`src/hooks/use-table-url-state.ts:68`）把分页、全局搜索、列筛选写进 search params，默认键 `page/pageSize/filter`。

**表单**：`ui/form.tsx` 封装 react-hook-form + `FormField/FormItem/FormLabel/FormControl/FormMessage`；zod schema 模式见 `features/auth/sign-in/components/user-auth-form.tsx:23-52`。

**弹窗**：`ui/dialog.tsx`（模态）、`ui/alert-dialog.tsx`（危险确认）、`ui/sheet.tsx`（侧滑，适合详情）。批量弹窗编排参考 `features/users/components/users-dialogs.tsx` + `UsersProvider`（context 保存 `open/currentRow`），也可用 `useDialogState`（`src/hooks/use-dialog-state.tsx:9`）。

### 1.8 图表现状

- 依赖只有 **recharts 3.8.1**（`features/dashboard/components/overview.tsx` 用 `BarChart`）。
- 模板图表数据是 `Math.random()`，属于必须替换的假数据。
- **ECharts 未安装**，需在可视化阶段新增。

### 1.9 认证现状

- `src/stores/auth-store.ts:24` 为 zustand 内存态 + cookie 假 token（`'thisisjustarandomstring'`）。
- 登录表单 `onSubmit` 用 `sleep(2000)` 模拟，无真实后端。
- Clerk 路由存在但无密钥，不参与主流程。
- 结论：**本项目不做认证**；保留登录页作为 UI 资产，不加入导航，不设路由守卫。

### 1.10 工具函数与测试资产

| 文件                              | 内容                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| `src/lib/utils.ts`                | `cn()`、`sleep()`、`getPageNumbers()`、`getDisplayNameInitials()` |
| `src/lib/cookies.ts`              | get/set/remove cookie                                             |
| `src/lib/handle-server-error.ts`  | Axios 错误统一 Toast                                              |
| `src/lib/show-submitted-data.tsx` | 表单调试输出                                                      |
| `src/hooks/use-mobile.tsx`        | 断点判断                                                          |
| `src/test-utils/`                 | 表格与 cookie 测试辅助                                            |
| `src/features/*/data/*`           | 模板假数据（users/tasks/apps/chats）                              |

现有测试：`utils.test.ts`、`cookies.test.ts`、`handle-server-error.test.ts`、`use-table-url-state.test.ts`、`auth-store.test.ts`、`search-provider.test.tsx`。

---

## 2. 目标架构

### 2.1 总体结构

```
┌─────────────────────────────────────────────┐
│ 浏览器 (React 19 + TanStack Router)          │
│  ├─ 页面 / 功能模块 (src/features)            │
│  ├─ 数据请求 (TanStack Query + axios)         │
│  └─ 图表 (ECharts, 按需引入)                  │
└───────────────┬─────────────────────────────┘
                │ REST /api/*  (Vite dev proxy → 127.0.0.1:8000)
┌───────────────▼─────────────────────────────┐
│ FastAPI                                      │
│  ├─ routers: analyses / comparisons / stats   │
│  ├─ services: dna / comparison / report       │
│  ├─ schemas: Pydantic v2                      │
│  └─ db: SQLAlchemy 2.x (或 sqlite3) + 事务    │
└───────────────┬─────────────────────────────┘
                │
        ┌───────▼────────┐      ┌──────────────┐
        │ SQLite geneai.db│      │ PDF (ReportLab)│
        └────────────────┘      └──────────────┘
```

选择说明：

- **SQLAlchemy 2.x + `sqlite3` 驱动**：模型清晰、参数化查询天然安全、便于后续换库；课程展示也更容易讲清 ORM。
- **ReportLab**：纯 Python wheel，无需系统级依赖（对比 WeasyPrint 需要 GTK/Pango）；中文用 `UnicodeCIDFont('STSong-Light')`，无需外挂字体文件。
- **ECharts 直接封装**：新增 `echarts` 依赖，按需注册 `BarChart/LineChart/PieChart/GridComponent/TooltipComponent/LegendComponent/CanvasRenderer`，自写 `EChart` 组件（约 80 行），避免引入额外 wrapper 依赖并便于统一主题。
- **不引入新的状态管理库**：服务端数据用 TanStack Query，UI 偏好用现有 cookie/localStorage + zustand。

### 2.2 前端目录规划（在现有结构上增量）

```
src/
├── components/
│   ├── ui/                     # 保留，不批量覆盖
│   ├── layout/                 # 保留，改 sidebar-data 与品牌区
│   ├── data-table/             # 保留
│   ├── charts/                 # 新增：EChart 封装、图表主题、Tooltip
│   ├── dna/                    # 新增：SequenceViewer、BaseBadge、CopyButton
│   └── feedback/               # 新增：EmptyState、ErrorState、PageSkeleton（如缺）
├── features/
│   ├── dashboard/              # 重写：真实统计
│   ├── analysis/               # 新增：输入、结果、示例数据
│   ├── comparison/             # 新增：双输入、对齐视图、差异表
│   ├── visualization/          # 新增：四类图表
│   ├── history/                # 新增：表格、筛选、详情 sheet、删除
│   ├── settings/               # 改造：主题 + 偏好 + 系统信息
│   └── (auth|users|tasks|...)  # 保留文件，移出导航
├── lib/
│   ├── api/
│   │   ├── client.ts           # axios 实例、错误归一化
│   │   ├── analyses.ts
│   │   ├── comparisons.ts
│   │   ├── stats.ts
│   │   └── query-keys.ts
│   ├── dna/
│   │   ├── sequence.ts         # 规范化/校验（与后端同口径）
│   │   ├── fasta.ts            # FASTA 解析
│   │   └── gc-window.ts        # 滑动窗口（可视化用）
│   └── utils.ts                # 保留
├── types/
│   ├── api.ts                  # 响应类型（手写，与 Pydantic 对齐）
│   └── dna.ts
├── routes/_authenticated/
│   ├── index.tsx               # /
│   ├── analysis/index.tsx
│   ├── comparison/index.tsx
│   ├── visualization/index.tsx
│   ├── history/index.tsx
│   └── settings/…              # 复用现有子路由
└── styles/theme.css            # 改品牌令牌
```

约定：一个功能一个 `features/<name>/index.tsx` 入口，内部拆 `components/`、`api/`（可选）、`data/`（仅示例数据）、`schema.ts`（zod）。跨功能复用才提升到 `src/components`。

### 2.3 后端目录规划

```
server/
├── app/
│   ├── main.py                 # FastAPI 实例、CORS、异常处理、路由挂载
│   ├── config.py               # 环境变量、路径、限制常量
│   ├── db.py                   # engine/session、init_db、依赖注入
│   ├── models.py               # ORM 模型：Analysis、Comparison
│   ├── schemas.py              # Pydantic：请求/响应/分页
│   ├── services/
│   │   ├── dna.py              # 规范化、校验、统计、互补、转录、滑窗
│   │   ├── comparison.py       # PairwiseAligner + 差异提取
│   │   └── report.py           # ReportLab PDF
│   └── routers/
│       ├── analyses.py
│       ├── comparisons.py
│       ├── stats.py
│       └── health.py
├── tests/
│   ├── test_dna_service.py
│   ├── test_comparison_service.py
│   ├── test_api_analyses.py
│   ├── test_api_stats.py
│   └── test_report.py
├── requirements.txt
├── .env.example                # 独立于前端模板的 .env.example
└── README.md                   # 后端启动说明
```

### 2.4 请求链路与错误处理

```
组件 → useQuery/useMutation (features/*)
     → lib/api/*.ts (typed axios)
     → /api/* → Vite proxy (dev) / 同源反代 (prod)
     → FastAPI router → service → ORM → SQLite
     ← Pydantic response → JSON
```

- axios 实例统一 `baseURL: '/api'`、超时 15s、响应拦截调用现有 `handleServerError`（`src/lib/handle-server-error.ts`）逻辑。
- Query key 统一在 `query-keys.ts` 管理，写操作成功后 `invalidateQueries`。
- 错误响应统一 `{ detail: string, code: string }`；422 校验错误由前端归一化为可读文案。
- 前端不允许吞错：每个 `useQuery` 都要渲染 error 状态或 Toast。

### 2.5 开发期联调

- 后端：`uvicorn app.main:app --reload --port 8000`（工作目录 `server/`）。
- 前端：`pnpm dev`，在 `vite.config.ts` 增加：

```ts
server: {
  proxy: { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true } },
}
```

- 注意本机开发服务器可能监听 `[::1]`；后端绑定 `127.0.0.1` 时，代理目标写 `http://127.0.0.1:8000` 即可，浏览器只访问前端同源地址。

---

## 3. 数据流设计

### 3.1 分析数据流

1. 用户输入 → `normalizeSequence()`（前端）→ 校验。
2. `POST /api/analyses` 传 `{ sequence, name?, source }`。
3. 后端再次规范化/校验（后端是唯一可信边界），计算全部字段，写入 `analyses`。
4. 返回完整结果（含 `id`、`created_at`）。
5. 前端缓存返回结果并 `invalidate ['stats','analyses']`。
6. 可视化页用 `?id=` 或最近记录读取同一份数据。

### 3.2 比对数据流

1. 两个输入 → 前端规范化 → 校验。
2. `POST /api/comparisons`。
3. 后端 `PairwiseAligner` 全局比对 → 提取对齐块 → 生成差异列表 → 计算统计 → 存库。
4. 返回摘要 + 对齐文本 + 差异数组（长序列只返回摘要与差异，对齐按需分页）。

### 3.3 统计聚合

`GET /api/stats/overview` 单次查询完成：

- `count(analyses)`、`count(comparisons)`；
- `avg(gc_content)`；
- `max(created_at)`；
- 碱基累计（`sum(a_count)` 等）；
- 按日期分组的 GC 均值（最近 14 天，无数据日期补 null）；
- 最近 5 条（UNION 两张表，按时间倒序）。

避免前端发多个请求再拼装，减少不一致窗口。

---

## 4. 技术决策记录（ADR 摘要）

| 编号   | 决策                                               | 理由                                              | 影响                                                     |
| ------ | -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| ADR-01 | 保留 `_authenticated` 路由命名空间，不添加登录守卫 | 改名会波及全部路由与类型；课程项目无需认证        | 路径带 `_authenticated` 前缀，但 URL 为 `/analysis` 等   |
| ADR-02 | 用 ECharts 替换 recharts 作为主图表库              | 课程要求；ECharts 对大数据、交互、导出支持更好    | 新增 `echarts` 依赖；recharts 保留（模板其它图表仍引用） |
| ADR-03 | PDF 由后端 ReportLab 生成                          | 前端 jsPDF 中文字体与分页处理麻烦；后端可直接读库 | 需要 `/report` 接口与中文 CID 字体                       |
| ADR-04 | SQLite + SQLAlchemy，单文件 `server/geneai.db`     | 零配置、易演示、易备份                            | 并发写入低，课程场景足够                                 |
| ADR-05 | 不接入认证、不接入大模型                           | 明确的项目限制                                    | 删除/隐藏模板登录入口                                    |
| ADR-06 | 序列校验口径前后端各实现一次，后端为准             | 前端即时反馈，后端保证可信                        | 两份实现必须有相同测试用例                               |
| ADR-07 | 图表颜色使用 theme 变量而非硬编码                  | 支持深色模式与统一品牌                            | ECharts 需读取 CSS 变量并随主题重绘                      |

---

## 5. 风险与缓解

| 风险                                         | 概率 | 影响         | 缓解                                                          |
| -------------------------------------------- | ---- | ------------ | ------------------------------------------------------------- |
| Python 3.14 无 Biopython/reportlab wheel     | 中   | 后端无法安装 | 优先 3.12 建 venv；requirements 固定可用版本；记录实测结果    |
| PairwiseAligner 对超长序列内存/耗时高        | 中   | 请求超时     | 限制 10,000 bp；超限返回 413 并提示分段                       |
| 中文 PDF 乱码                                | 中   | 报告不可读   | 使用 `UnicodeCIDFont('STSong-Light')`；测试用例断言文本可提取 |
| ECharts 体积过大                             | 中   | 首屏变慢     | 按需注册组件 + 路由懒加载 + `manualChunks`                    |
| 模板假数据残留被误认为真实数据               | 高   | 评审质疑     | 全部替换；示例序列显式标注"示例数据"                          |
| 深色模式图表配色失效                         | 中   | 视觉不一致   | 图表主题从 CSS 变量读取，`useTheme` 变化时 `setOption`        |
| 沙箱限制导致构建失败被误判为代码错误         | 中   | 阻塞交付     | 构建失败先看是否 `spawn EPERM`，在完整权限终端复跑            |
| 直接改 `routeTree.gen.ts` 或批量覆盖 ui 组件 | 低   | 破坏模板     | 写入 AGENT_INSTRUCTIONS 禁令；review 时检查 diff              |

---

## 6. 启动与验证（目标状态）

```bash
# 前端
pnpm install
pnpm dev            # http://localhost:5173（端口被占用时 Vite 自动+1）
pnpm build
pnpm lint

# 后端
cd server
python -m venv .venv
.venv/Scripts/activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest
```

验收脚本（手工）：分析一条序列 → 比对两条序列 → 查看历史 → 导出 PDF → 刷新首页确认统计变化。

---

_架构变更必须更新本文档与 `AGENT_INSTRUCTIONS.md`，并在阶段汇报中说明原因。_
