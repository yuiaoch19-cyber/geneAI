# AGENT_INSTRUCTIONS — GeneAI 后续开发约束

> 本文件面向后续接手的 AI Agent / 开发者。**开始任何改动前必须阅读本文件与 `DESIGN_SYSTEM.md`。**
> 与用户最新指令冲突时，以用户最新指令为准，并在汇报中说明偏离原因。

---

## 1. 项目身份

- 名称：**GeneAI — DNA 智能序列分析与可视化平台**
- 性质：大学计算机学院课程项目，本地运行，课堂演示
- 基础：`satnaing/shadcn-admin` v2.2.1 二次开发（已在本仓库，**不是**空项目）
- 语言：界面中文；代码标识符、注释、提交信息英文

---

## 2. 绝对禁止

1. ❌ 新建 React 项目、`create-vite`、`create-next-app`、替换脚手架。
2. ❌ 替换 UI 框架（不得引入 Ant Design / MUI / Chakra / Bootstrap）。
3. ❌ 删除 `src/components/ui/*`、`src/components/data-table/*`、`src/components/layout/*` 中现有组件。
4. ❌ 手改 `src/routeTree.gen.ts`（由插件生成）。
5. ❌ 把 DNA 计算放到前端"假装"完成后端不实现；也不允许后端返回随机数。
6. ❌ 使用 `Math.random()` 生成图表数据；演示数据必须显式标注「演示数据」。
7. ❌ 在页面中硬编码颜色（`#hex`、`rgb()`、`bg-blue-500` 等 Tailwind 调色板类）。一律使用语义令牌：`bg-background`、`text-muted-foreground`、`bg-primary`、`border-border`、`text-chart-1`。
8. ❌ 引入认证/登录墙（本项目无用户系统）。
9. ❌ 做 AI 聊天、问答、大模型 API 调用。
10. ❌ 通过删除功能来"修复"报错。
11. ❌ 提交 `node_modules`、`.pnpm-store`、`dist`、`server/geneai.db*`、`.venv`。
12. ❌ 在 `src/components/ui` 中加业务逻辑（该目录保持 shadcn 原样，仅允许主题层调整）。

---

## 3. 必须遵守

1. ✅ **先读后写**：修改任何文件前先完整阅读；不确定就再读相关类型与调用点。
2. ✅ **一次一个阶段**：按 `DEVELOPMENT_PLAN.md` 推进，不提前实现下一阶段。
3. ✅ **复用优先**：先找 `src/components/ui`、`data-table`、`layout` 是否已有能力；没有再新建。
4. ✅ **所有主要按钮必须有真实行为**：请求、计算、导航、复制、下载，至少其一；纯装饰按钮删除。
5. ✅ **四态齐全**：空 / 加载 / 错误 / 成功。列表空态写引导文案，不要空白表格。
6. ✅ **构建必须通过**：每阶段结束运行 `pnpm build`、`pnpm lint`；后端改动运行 `pytest -q`。
7. ✅ **算法单一事实源**：本地即时计算函数与后端实现必须同公式，改动时两边同步并各加测试。
8. ✅ **契约同步**：改 API 字段时同时改 `server/app/schemas.py`、`src/types/api.ts`、`API_DESIGN.md`。
9. ✅ **提交粒度**：一个阶段一个 commit，信息用 `feat(phase-N): ...` / `fix: ...` / `docs: ...`。
10. ✅ **汇报格式**：七项（完成内容 / 修改文件 / 新增组件 / 实现功能 / 运行测试结果 / 当前问题 / 下阶段计划）。

---

## 4. 技术栈约束（锁定版本）

| 层       | 选型                            | 备注                                                   |
| -------- | ------------------------------- | ------------------------------------------------------ |
| 构建     | Vite 8 + Rolldown               | 不换 webpack                                           |
| 框架     | React 19                        | 函数组件 + hooks                                       |
| 类型     | TypeScript 6 strict             | 禁止 `any`（确需时用 `unknown` + 收窄并注释）          |
| 样式     | Tailwind v4（CSS-first）        | 无 `tailwind.config.js`，令牌在 `src/styles/theme.css` |
| 组件     | shadcn/ui（new-york）           | `components.json` 已配置                               |
| 路由     | TanStack Router（文件式）       | `src/routes/**`                                        |
| 数据     | TanStack Query                  | 服务端状态一律走 Query，不塞 zustand                   |
| 表格     | TanStack Table + `data-table/*` | 历史页复用                                             |
| 图表     | **ECharts 6**（阶段 6 安装）    | 移除 recharts 使用（依赖可留）                         |
| 表单     | react-hook-form + zod           | 分析页简单表单可直接受控组件                           |
| 图标     | lucide-react                    | 不引入第二个图标库                                     |
| 后端     | FastAPI + SQLAlchemy 2 + SQLite | `server/`                                              |
| 生物计算 | Biopython                       | `PairwiseAligner`、`Bio.Seq`                           |
| PDF      | ReportLab                       | 后端生成，前端只下载                                   |

新增依赖前必须：说明用途 → 检查是否已有替代 → 在汇报中列出。

---

## 5. 目录与命名

```
src/
  components/ui/          # shadcn 原子组件（不改）
  components/data-table/  # 表格通用件
  components/layout/      # Header/Main/Sidebar 等
  features/<module>/      # 业务页面：index.tsx + components/ + hooks/
  routes/_authenticated/  # 路由文件（薄，只做 createFileRoute + 渲染 feature）
  hooks/                  # 跨模块 hooks
  lib/
    api/                  # client.ts + 各资源请求
    dna.ts                # 前端本地计算（与后端同口径）
    utils.ts              # 通用工具（保留原有 cn 等）
  types/api.ts            # 与后端契约
  styles/theme.css        # 设计令牌（唯一颜色来源）
server/
  app/main.py  config.py  db.py  models.py  schemas.py
  app/services/sequence.py  alignment.py  statistics.py  report.py
  tests/
```

命名：

- 组件文件 kebab-case（`sequence-input.tsx`），导出 PascalCase。
- hook `use-xxx.ts` / `useXxx`。
- 类型 `PascalCase`；常量 `SCREAMING_SNAKE`。
- 一个文件只放一个主组件；子组件放同目录 `components/`。

---

## 6. 添加新页面的标准步骤

1. 在 `src/routes/_authenticated/` 新建路由文件：

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Analysis } from '@/features/analysis'

export const Route = createFileRoute('/_authenticated/analysis')({
  component: Analysis,
})
```

2. 在 `src/features/<module>/index.tsx` 写页面：`Header` + `Main`，结构对齐 `features/users/index.tsx`。
3. 在 `src/components/layout/data/sidebar-data.ts` 的 `navGroups` 加入导航项（用 Lucide 图标）。
4. 运行 `pnpm dev` 让插件生成路由；不要手动创建 `routeTree.gen.ts`。
5. `pnpm build` 验证类型与路由。

---

## 7. 修改导航与品牌

- 导航数据唯一来源：`src/components/layout/data/sidebar-data.ts:205` 的 `sidebarData`。
- 品牌名在 `src/components/layout/app-title.tsx` 与 `index.html` 的 `<title>`；两处一起改。
- 团队切换器（`TeamSwitcher`）在 GeneAI 中语义不符，替换为静态品牌块或保留但改名，**不要留 "Shadcn Admin" 字样**。

---

## 8. 主题与样式

1. 颜色只改 `src/styles/theme.css` 的 `:root` / `.dark` 变量。
2. 圆角统一 `--radius: 0.75rem`，组件用 `rounded-lg/xl` 派生值。
3. 阴影用 `shadow-card` / `shadow-popover`（已在 theme.css 定义），不写自定义 box-shadow。
4. 深色模式必须覆盖新组件；图表颜色从 CSS 变量读取，切换主题后重绘。
5. 禁止大面积渐变、玻璃拟态堆叠、无意义 DNA 螺旋装饰图。
6. 动画克制：150–200ms，`transition-colors` / `transition-shadow` 为主。

---

## 9. DNA 计算口径（不可擅自更改）

| 指标     | 口径                                                      |
| -------- | --------------------------------------------------------- |
| 规范化   | 去 FASTA 头、空白、数字、`-`；转大写；仅 ACGTN            |
| GC%      | `(G+C) / (A+T+G+C) × 100`，全 N 时为 0；保留 1 位小数     |
| AT%      | `(A+T) / (A+T+G+C) × 100`                                 |
| 互补     | A↔T、C↔G、N↔N，同向输出                                   |
| 反向互补 | 互补后反转                                                |
| RNA      | T→U，其余不变                                             |
| 比对     | 全局；match 2、mismatch −1、gap open −10、gap extend −0.5 |
| identity | 相同列 / 对齐总列 × 100                                   |
| 滑窗     | 默认 50/10，0-based 左闭右开，仅完整窗口                  |
| 位置展示 | 1-based                                                   |

后端与前端各有一份实现，**任何一处改动必须在同一 commit 内改另一处，并补测试**。

---

## 10. API 客户端规范

- `src/lib/api/client.ts`：axios 实例，`baseURL: '/api'`，15s 超时。
- 统一错误归一化：把 422 数组与 `{detail, code}` 两种结构转成 `{ message, code, field }`。
- 请求函数只做「参数 → 响应类型」，不含 UI 逻辑。
- 所有服务端状态通过 TanStack Query；mutation 成功后 invalidate 相关 key。
- 不在组件里直接 `fetch`。

---

## 11. 错误处理

| 场景           | 处理                                     |
| -------------- | ---------------------------------------- |
| 400 序列非法   | 表单下方红色提示，指出位置与字符         |
| 413 超长       | 提示上限，建议分段                       |
| 404            | 详情页显示"记录不存在" + 返回列表按钮    |
| 500 / 网络错误 | toast + 页内可重试块，不白屏             |
| 后端未启动     | 全局横幅提示"后端服务未运行"（健康检查） |

禁止 `catch {}` 吞错；至少 `console.error`（受 eslint 限制时用注释说明）或上报 toast。

---

## 12. 环境陷阱（本机已踩）

1. **node_modules 必须 hoisted**：`.npmrc` 已设 `node-linker=hoisted`。若要重装，必须 `cmd //c "rmdir /s /q node_modules"`（`rm -rf` 会因 junction 失败），再 `pnpm install --store-dir .pnpm-store`。
2. **不要在受限沙箱下构建**：Vite 需要派生子进程，受限模式会 `spawn EPERM`。使用 full-access 会话。
3. **dev server 可能只监听 `[::1]`**：探测用 `http://[::1]:<port>` 或 Node 原生 http，不要假设 `127.0.0.1`。
4. **curl 不可用**（schannel 证书错误）：用 Node `fetch` / `Invoke-RestMethod`。
5. **Python 不在 PATH**：使用完整路径 `C:\Users\语\AppData\Local\Programs\Python\Python314\python.exe`，或改用 `C:\Users\语\.local\bin\python3.12`。优先 3.12 以确保 Biopython/ReportLab 轮子可用。
6. **git 自动维护会失败**：已设 `gc.auto=0`、`maintenance.auto=false`，不要恢复。
7. **`pnpm test` 需要 Chromium**：先 `pnpm exec playwright install chromium`；未安装时不要声称测试通过。
8. **不要读取根目录 `.env.example`**（被凭据策略拦截）；后端另建 `server/.env.example`。

---

## 13. 质量门禁

阶段完成前必须全部为"是"：

- [ ] `pnpm build` 通过（tsc + vite）
- [ ] `pnpm lint` 无 error（warning 可接受但需说明）
- [ ] 后端 `pytest -q` 通过（阶段 3 起）
- [ ] 新增功能有对应测试或用例记录
- [ ] 无 `TODO` 留在主流程代码中（可用 `TODO(phase-N)` 标注计划）
- [ ] `git status` 干净或改动已说明
- [ ] 浏览器控制台无 error
- [ ] 深色模式检查过
- [ ] 390px 宽度检查过

---

## 14. 汇报模板

```markdown
## 阶段 N 完成报告

### A. 完成内容

- ...

### B. 修改/新增文件

| 文件 | 类型 | 说明 |

### C. 新增/复用组件

- 复用：...
- 新增：...

### D. 实现功能与验证方式

- ...

### E. 运行与测试结果

| 命令 | 结果 |

### F. 当前问题与风险

- ...

### G. 下阶段计划

- ...
```

---

## 15. 决策记录

已定且不要重新讨论的决策（详见 `PROJECT_ARCHITECTURE.md` ADR）：

1. ECharts 替代 recharts 做业务图表。
2. PDF 由后端 ReportLab 生成。
3. 不做登录认证，保留 `_authenticated` 路径命名空间但不加守卫。
4. SQLite + SQLAlchemy，单文件，不做用户隔离。
5. 前后端各一份序列计算，用于即时预览与服务端权威结果。
6. 图表颜色从 CSS 变量读取，跟随主题。
7. 示例数据仅在显式标注「演示数据」时出现，且不写入历史库。

---

_最后更新：阶段 1。每次阶段结束如规则变化，追加"变更记录"小节，不覆盖历史。_
