# UI 升级 P2 执行提示词（给开发 Agent 自己看）

> 角色：GeneAI 项目的前端设计工程师 + 全栈工程师。
> 前提：P0/P1 已完成（设计令牌、卡片、外壳、DNA Hero/Logo/转录双螺旋、空态水印）。现在只做**局部精修**，不重写页面、不新增虚假功能、不引入 UI 依赖。

## 0. 必读文件

- `src/styles/theme.css`
- `src/components/ui/card.tsx`
- `src/components/geneai/{page-header,chart-card,stat-card,empty-state}.tsx`
- `src/components/geneai/dna/{dna-mark,dna-hero}.tsx`
- `src/features/settings/index.tsx`
- `src/features/transcription/index.tsx`
- `src/features/history/index.tsx`
- `src/routes/__root.tsx`
- `docs/UI_UPGRADE_REPORT.md`

## 1. 硬约束

1. 不新增 npm 依赖，不更换 UI 框架。
2. 不写死演示统计；所有数字来自 API 或明确标注的演示数据。
3. 不改业务算法、API 契约、数据库结构。
4. 所有新组件遵守现有 `cn()`、Tailwind 令牌、深浅色双主题。
5. 不为了填满页面堆无意义卡片；每块内容必须有信息价值。
6. 修改后必须跑 `pnpm build`、`pnpm lint`、`pnpm test:unit`、`pytest server/tests -q`。
7. 截图必须排除 TanStack Devtools；`VITE_SHOW_DEVTOOLS=true` 才启用。
8. 每次只做一个小阶段，能回滚。

## 2. 目标（按优先级）

### P2-1 设置页留白
- 外观页在 1440 下右侧/下方大量留白。
- 采用 `xl:grid-cols-[minmax(0,1fr)_280px]`，右栏放“本地优先”信息卡（数据库、报告、隐私）+ 版本文本；内容必须真实。
- 卡片统一 `rounded-2xl`、`shadow-card`、`border-border/70`。

### P2-2 转录页初始态
- 未分析时页面只有表单，空旷。
- 在输入卡与“演示与算法口径”之间加入“中心法则概览”：DNA → mRNA → 蛋白质三步，用 DnaMark 做低透明度水印。
- 移动端纵向排列，箭头旋转 90°；不遮挡上传/示例按钮。
- 分析后隐藏该卡，避免重复。

### P2-3 历史页短列表
- 5 条记录时表格下方空白过大。
- 不加假统计；可选方案：
  - 在表格底部增加“记录仅保存在本机 · 可导出 PDF/CSV”的说明条；或
  - 表格卡 `min-h` 与屏幕高度协调，空态仍使用 DNA 水印。
- 日期筛选“开始/结束”标签保留。

### P2-4 深色模式与对比度
- 逐页检查 `dashboard / analysis / transcription / mutation / variants / map / history / settings` 的 1440 深色。
- 修复：文本低于 4.5:1、边框消失、图表网格线过亮、DNA 横档过饱和。
- 不改变亮色配色。

### P2-5 空/错/载入态统一
- `EmptyState` 已有 DNA 水印；补齐 `LoadingState`、`ErrorState` 的圆角、图标尺寸、文案层级。
- 所有页面 loading 不使用裸文本。
- 错误态保留重试按钮；不可重试的错误不显示无效重试。

### P2-6 PDF DNA 水印（可选，低风险）
- 在报告页脚上方绘制 6% 透明度双螺旋/横档，不遮挡正文。
- 中文字体、分页、现有测试不得回退。
- 先加单测/快照验证页数与关键字。

## 3. 交互微调

- 卡片 hover 仅用于可点击卡片；纯展示卡不上浮。
- 统一 focus-visible ring：2px primary/40 + offset 2。
- 图表 tooltip 的坐标单位、窗口大小必须与页面说明一致。
- 移动端底部固定播放器不遮挡最后一行：主内容 `pb-28`。

## 4. 验收

| 项 | 标准 |
| --- | --- |
| 1440 亮/暗 | 页面无明显单侧空洞；卡片间距 16/24 统一 |
| 834 | 不出现横向滚动；工具栏不挤压 |
| 390 | 同上；Hero 文字不被 DNA 线干扰 |
| Console | 0 error |
| HTTP | 0 个 ≥500 |
| 构建 | 通过 |
| 测试 | Vitest 29+、pytest 164+ |
| 截图 | `docs/screenshots/ui3-*`，亮/暗/三档 |

## 5. 交付格式

1. 修改文件清单。
2. 每页 before/after 一句话。
3. 构建、lint、测试输出。
4. 截图路径。
5. 未完成项与风险。
6. 不提交 Git，等用户说“可以推”再提交/推送。
