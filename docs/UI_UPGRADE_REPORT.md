# GeneAI UI 质感升级报告（P0 + P1）

> 目标：在不改变功能与信息架构的前提下，统一视觉语言、提升卡片与排版质感，并建立可持续复用的 DNA 视觉系统。
>
> 对应任务：m07947 / m07948。执行方式：按此前给出的“UI 升级执行提示词”先做设计令牌与全局组件，再落到外壳、Dashboard、转录页与空态；未重写页面、未引入新依赖。

## 1. 本轮改了什么

### 1.1 设计令牌

`src/styles/theme.css`

| 令牌 | 调整 |
| --- | --- |
| `--shadow-card` | 双层阴影，近距离描边感 + 远距离柔和投影 |
| `--shadow-float` | 新增，用于 KPI 卡 hover 与浮层 |
| 圆角 | 保持 `--radius: 1rem`，卡片统一 `rounded-2xl` |
| 边框 | 卡片使用 `border-border/70`，降低“表格框”感 |

### 1.2 全局组件

| 文件 | 变化 |
| --- | --- |
| `src/components/ui/card.tsx` | `rounded-2xl` + `shadow-card` + 更轻的边框 |
| `src/components/geneai/chart-card.tsx` | 标题 15px、说明 11.5px、头部 `bg-muted/20`、统一内边距 |
| `src/components/geneai/stat-card.tsx` | 微渐变表面、顶部高光、`rounded-xl` 图标、hover 上浮 + `shadow-float` |
| `src/components/geneai/page-header.tsx` | 标题 26/28px、eyebrow 10.5px/0.2em、描述 13.5px + `text-pretty` |
| `src/components/geneai/empty-state.tsx` | `rounded-2xl`、淡蓝径向底、DNA 水印、12px 图标容器 |
| `src/components/skip-to-main.tsx` | 仅键盘 Tab 后显示，避免鼠标/自动聚焦时遮挡页面 |

### 1.3 应用外壳

- **侧栏**：三段深蓝渐变 + 内阴影，当前项改蓝色渐变胶囊 + 左侧 2px 青色指示条，hover 微亮。
- **品牌**：`DnaMark` 取代通用图标，双股 + 4 条横档，20–40px 仍清晰。
- **顶栏**：`bg-background/70 backdrop-blur-xl`，搜索框 `max-w-2xl`，与内容区形成玻璃分层。
- **宣传卡**：DNA 曲线 + 横档底纹，保持低对比，不抢导航。

## 2. DNA 视觉系统

新增 `src/components/geneai/dna/`：

- `dna-mark.tsx`：32×32 双股螺旋，用于 Logo/小尺寸标识。
- `dna-hero.tsx`：760×420，sin 双股 + 25 条按碱基着色的横档，端点圆点、柔光与装饰圆环，整体旋转 −14°。
- 转录页 `dna-helix.tsx`：横档按编码碱基着色，当前窗口加粗高亮，焦点圆点 5px。
- 空态 `EmptyState`：右下角 6% 透明度 DNA 水印。

统一碱基语义色：

| 碱基 | 颜色 |
| --- | --- |
| A 腺嘌呤 | `#2563EB` 蓝 |
| T 胸腺嘧啶 | `#8B5CF6` 紫 |
| G 鸟嘌呤 | `#F59E0B` 琥珀 |
| C 胞嘧啶 | `#10B981` 绿 |
| N | `#94A3B8` 灰 |

Dashboard Hero 在移动端把图形透明度降到 40%，避免 DNA 线干扰标题与按钮。

## 3. 页面级效果

| 页面 | 升级前 | 升级后 |
| --- | --- | --- |
| Dashboard | 通用螺旋插画、平面统计卡、白色图表头 | 碱基配色 DNA Hero、渐变 KPI、浮起交互、muted 图表头、统一模块宫格 |
| DNA 分析 | 卡片边界重、结果区层级平 | 2xl 卡片 + 分层阴影、结果统计与链转换分组更清晰、按钮主次明确 |
| 转录翻译 | 双螺旋横档单色、播放器普通卡片 | 横档按碱基着色、当前碱基高亮、播放器 sticky、暗色适配 |
| 突变模拟 | 预设与结果卡片接近 | 预设 chip 化、结果指标卡统一、DNA/RNA/蛋白三层视觉分区 |
| 变异数据库 | 列表卡片边界硬 | 2xl 证据卡、临床意义 Badge 与来源按钮层级更清楚 |
| 序列地图 | 工具卡与轨道卡风格不一 | 统一卡片表面、图例/坐标说明更安静，轨道区更突出 |
| 历史记录 | 表格外框重、日期筛选弱 | 轻边框表格、日期“开始/结束”标签、空态 DNA 水印 |
| 系统设置 | 标题与页面不一致、内容悬浮 | 统一 PageHeader、设置卡 2xl 表面、标题层级与全站一致 |

## 4. 验证

| 项目 | 结果 |
| --- | --- |
| `pnpm build` | ✅ 1.67 s（tsc + vite） |
| `pnpm lint` | ✅ 0 error，1 条既有 warning（`data-table.tsx` useReactTable） |
| `pnpm test:unit` | ✅ 29 passed |
| `pytest server/tests -q` | ✅ 164 passed（1 条依赖弃用 warning） |
| Playwright 视觉复核 | 10 页 × 1440、7 页 dark、Dashboard/历史/转录/设置 390：0 console error、0 横向溢出 |

截图：

- `docs/screenshots/ui2-dashboard-desktop.png`
- `docs/screenshots/ui2-dashboard-dark.png`
- `docs/screenshots/ui2-dashboard-mobile.png`
- `docs/screenshots/ui2-analysis.png`
- `docs/screenshots/ui2-transcription.png`
- `docs/screenshots/ui2-mutation.png`
- `docs/screenshots/ui2-variants.png`
- `docs/screenshots/ui2-map.png`
- `docs/screenshots/ui2-history.png`

## 5. 已知问题与边界

1. TanStack Devtools 改为显式开启：`VITE_SHOW_DEVTOOLS=true pnpm dev`，默认不渲染，避免遮挡右下角卡片。
2. 固定侧栏在超长 full-page 截图中会出现底部空白，这是截图拼接伪影，非页面布局问题；Dashboard 采用视口截图。
3. 设置页在 1440×1100 下内容较少，卡片下方仍有留白，后续可增加“关于/数据存储”信息块。
4. Toast 为 5 秒浮层，截图时偶发覆盖右下角内容，属预期交互。
5. DNA Hero 是装饰性科学插画，不是分子结构模拟，不参与计算。

## 6. P2 补强（本轮继续）

### 6.1 设置页右栏
- 设置内容改为 `xl:grid-cols-[minmax(0,1fr)_280px]`。
- 右栏增加「本地优先」信息卡：数据库路径、PDF/CSV 来源、清理浏览器缓存不删库；下方是版本与技术栈。
- 设置页在 1440 下不再是单张窄卡悬空。

### 6.2 转录页初始态
- 未分析时新增「中心法则概览」：DNA 双螺旋 → mRNA → 蛋白质三步卡片，带 DnaMark 水印。
- 移动端纵向排列、箭头旋转 90°；分析后自动隐藏，避免与动画区重复。

### 6.3 交互与稳定性
- Skip 链接仅在键盘 Tab 后出现。
- TanStack Devtools 改为 `VITE_SHOW_DEVTOOLS=true` 才渲染，截图与生产视图不再被浮钮遮挡。
- 空态加入 DNA 水印，保持与 Hero/转录一致的视觉语言。
- `LoadingState` / `ErrorState` 统一到 `rounded-xl/2xl`，错误态加入淡红径向底。

### 6.4 移动端
- 转录页未分析时不再显示 0/0 的底部播放器；分析后才出现。
- 新增 390px 设置页、转录初始态复核，`scrollWidth == 390`。

P2 执行提示词见 [UI_UPGRADE_P2_PROMPT.md](UI_UPGRADE_P2_PROMPT.md)。

### 6.5 历史页短列表平衡
- 表格卡改为 `rounded-2xl`，顶部新增三格概览：本机记录、累计碱基、平均 GC；空库时自动隐藏，避免与「共 0 条」重复。
- 移动端名称列收窄到 150px，CSV 导出按钮在 `<sm` 隐藏，保留查看/PDF/删除，操作区不再被裁切。
- 空态复用 DNA 水印，新增 `ui2-history-empty-mobile.png` 作为边界证据。

### 6.6 暗色与响应式复核
- 新增 7 张暗色截图：分析、转录、突变、变异、地图、历史、设置；深色卡片、输入框、表头与图例均保持可读。
- 1440、390 两档检查 `scrollWidth`，无页面级横向溢出；历史表格在 390 下四个操作收敛为三个。
- 移动端转录页在未分析时不再出现 0/0 播放条。

### 6.7 PDF 报告 DNA 水印
- `server/app/services/report.py` 新增 `_draw_helix_watermark()`：在每页右下角以 6% 透明度绘制双股正弦曲线与横档，压在正文之下。
- 不改变正文边距、字体与统计口径；水印为装饰，不参与分析结论。
- 已通过 `python -m pytest` 全量回归（164 passed），并实际生成报告复核：`docs/screenshots/ui2-report-watermark.png`。水印在页面右侧呈低对比双螺旋，不遮挡正文。

## 7. 验收结论与剩余边界

已完成 P0–P2 的视觉与交互升级：设计令牌、卡片/图表/统计/页头/空态、侧栏与顶栏、Hero 与转录 DNA 图形、设置右栏、转录初始态、历史概览与移动端操作、暗色复核、PDF 水印。

- 提交：`42682a6 feat(ui): upgrade interface quality and DNA visuals`
- Gitee：已推送 `42682a6` 到 `main`
- 预览：`http://127.0.0.1:5208/`（本地开发服务）

仍待处理：

1. GitHub：已推送到 `yuiaoch19-cyber/geneAI` 的 `main`（走 SSH，HTTPS 在本机不通）。
2. 设置页在超宽屏仍有一定留白；移动端地图保留横向滚动；DNA 图形为装饰插画，不参与计算。
3. TanStack Devtools 默认关闭，需要时用 `VITE_SHOW_DEVTOOLS=true pnpm dev` 打开。

## 8. 本轮新增证据

- `docs/screenshots/ui2-history.png` / `ui2-history-dark.png` / `ui2-history-mobile.png` / `ui2-history-empty-mobile.png`
- `docs/screenshots/ui2-analysis-dark.png`、`ui2-transcription-dark.png`、`ui2-mutation-dark.png`、`ui2-variants-dark.png`、`ui2-map-dark.png`、`ui2-settings-dark.png`
- `docs/screenshots/ui2-transcription-idle.png`、`ui2-transcription-idle-mobile.png`
- `docs/screenshots/ui2-settings.png`、`ui2-settings-mobile.png`
- `docs/screenshots/ui2-report-watermark.png`（PDF 水印实拍）
- 构建 1.67 s；lint 0 error / 1 warning；Vitest 29；pytest 164。
