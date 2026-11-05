# GeneAI UI 设计规范（Design System）

| 项目     | 内容                                                               |
| -------- | ------------------------------------------------------------------ |
| 文档版本 | v1.0（阶段 1 交付）                                                |
| 适用     | 全部页面、组件、图表、邮件/PDF 中的视觉元素                        |
| 基线     | shadcn-admin v2.2.1 设计体系（Tailwind v4 + CSS 变量 + shadcn/ui） |
| 原则     | 科研感、克制、清晰、统一；装饰服务于信息                           |

> 实现入口：`src/styles/theme.css`（令牌）、`src/styles/index.css`（基础层）、`src/components/ui/*`（组件）。**不得在页面中硬编码颜色、阴影、圆角**，一律使用令牌对应的 Tailwind 类。

---

## 1. 设计定位

**关键词**：专业、冷静、精密、可信、轻盈。

参照对象：Linear 的信息密度、Vercel 的留白、Stripe 的数据卡片、Benchling 的科研气质。避免：传统后台模板的深色顶栏 + 高饱和色块、廉价渐变、大图标堆砌、无意义的 DNA 双螺旋背景图。

三条判断标准：

1. **去掉装饰后信息仍然清楚**——如果一张图/一段渐变删掉不影响理解，就删掉。
2. **数字比形容词重要**——指标卡必须有真实数值、单位和口径。
3. **一个页面只有一个视觉重心**——Dashboard 是数据概览，分析页是结果，比较页是对齐视图。

---

## 2. 色彩

### 2.1 设计令牌（浅色）

写入 `src/styles/theme.css` 的 `:root`，替换模板默认值：

```css
:root {
  --radius: 1rem;

  /* 中性色 */
  --background: oklch(0.977 0.004 264); /* 极浅冷灰白 */
  --foreground: oklch(0.22 0.03 258); /* 近墨蓝主文字 */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.22 0.03 258);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.22 0.03 258);
  --muted: oklch(0.962 0.008 255);
  --muted-foreground: oklch(0.54 0.028 258);
  --border: oklch(0.925 0.01 258);
  --input: oklch(0.905 0.012 258);

  /* 品牌主色：生物科技蓝 #2563EB */
  --primary: oklch(0.546 0.215 262.9);
  --primary-foreground: oklch(0.985 0.004 247.858);

  /* 辅助色：淡青 */
  --secondary: oklch(0.958 0.012 255);
  --secondary-foreground: oklch(0.32 0.05 260);
  --accent: oklch(0.955 0.02 210);
  --accent-foreground: oklch(0.32 0.05 230);

  /* 语义色 */
  --destructive: oklch(0.6 0.21 25);
  --success: oklch(0.66 0.15 158);
  --warning: oklch(0.76 0.15 70);
  --info: oklch(0.58 0.14 250);
  --ring: oklch(0.62 0.16 258);

  /* 图表色板：A 蓝 / T 紫 / C 绿 / G 琥珀 / N 灰 */
  --chart-1: oklch(0.546 0.215 262.9); /* A */
  --chart-2: oklch(0.606 0.22 292.7); /* T */
  --chart-3: oklch(0.696 0.16 162.5); /* C */
  --chart-4: oklch(0.769 0.16 70.1); /* G */
  --chart-5: oklch(0.704 0.035 256.8); /* N */

  /* 侧栏：两套主题均为深海军蓝 */
  --sidebar: oklch(0.205 0.035 262);
  --sidebar-foreground: oklch(0.93 0.012 250);
  --sidebar-primary: oklch(0.62 0.2 262);
  --sidebar-primary-foreground: oklch(0.99 0.003 250);
  --sidebar-accent: oklch(0.42 0.135 262);
  --sidebar-accent-foreground: oklch(0.985 0.004 250);
  --sidebar-border: oklch(1 0 0 / 9%);
}
```

### 2.2 深色模式

`.dark` 下保持同一色相，降低明度、提高图表对比：

```css
.dark {
  --background: oklch(0.17 0.02 258);
  --foreground: oklch(0.955 0.006 250);
  --card: oklch(0.215 0.024 258);
  --card-foreground: oklch(0.955 0.006 250);
  --popover: oklch(0.225 0.024 258);
  --popover-foreground: oklch(0.955 0.006 250);
  --muted: oklch(0.27 0.024 258);
  --muted-foreground: oklch(0.72 0.02 252);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 14%);

  --primary: oklch(0.66 0.17 258);
  --primary-foreground: oklch(0.16 0.02 258);
  --secondary: oklch(0.27 0.026 258);
  --secondary-foreground: oklch(0.955 0.006 250);
  --accent: oklch(0.29 0.035 240);
  --accent-foreground: oklch(0.955 0.006 250);
  --ring: oklch(0.64 0.14 258);

  --chart-1: oklch(0.66 0.19 262);
  --chart-2: oklch(0.7 0.18 292);
  --chart-3: oklch(0.74 0.14 162);
  --chart-4: oklch(0.8 0.14 72);
  --chart-5: oklch(0.66 0.03 256);

  --sidebar: oklch(0.155 0.03 262);
  --sidebar-accent: oklch(0.36 0.11 262);
  --sidebar-border: oklch(1 0 0 / 8%);
}
```

### 2.3 使用规则

| 场景                         | 用色                                                  |
| ---------------------------- | ----------------------------------------------------- |
| 页面背景                     | `bg-background`                                       |
| 卡片、弹窗、侧滑             | `bg-card` + `border`                                  |
| 主按钮 / 当前导航项          | `bg-primary text-primary-foreground`                  |
| 次按钮 / 标签底              | `bg-secondary` 或 `bg-muted`                          |
| 说明文字                     | `text-muted-foreground`                               |
| 链接 / 可点击强调            | `text-primary` + hover `underline underline-offset-4` |
| 成功（保存成功、GC 正常）    | `text-[var(--success)]` 或 Badge 自定义               |
| 警告（N 碱基偏多、序列过长） | `text-[var(--warning)]`                               |
| 错误（校验失败、请求失败）   | `text-destructive`                                    |
| 图表系列                     | `var(--chart-1..5)`                                   |

**碱基语义色（全站统一）**

| 碱基       | 变量        | 浅色模式观感 | 色值      |
| ---------- | ----------- | ------------ | --------- |
| A 腺嘌呤   | `--chart-1` | 生物科技蓝   | `#2563EB` |
| T 胸腺嘧啶 | `--chart-2` | 紫           | `#8B5CF6` |
| C 胞嘧啶   | `--chart-3` | 绿           | `#10B981` |
| G 鸟嘌呤   | `--chart-4` | 琥珀         | `#F59E0B` |
| N 未知     | `--chart-5` | 石板灰       | `#94A3B8` |

图表、图例、序列高亮、PDF 均使用同一映射，不能在不同页面换色。

### 2.4 禁用

- 大面积渐变（唯一允许：面积图填充 `color → transparent`，透明度 ≤ 0.18）。
- 纯黑 `#000`、纯白文字堆叠、饱和度过高的荧光色。
- 红绿同时表达"好/坏"以外的含义（色盲不友好）；分类信息必须配合文字或形状。
- 在深色模式使用浅色模式写死的十六进制颜色。

---

## 3. 字体与排版

### 3.1 字体家族

| 用途          | 字体                                                       | 说明                                                 |
| ------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| 正文 / UI     | Inter                                                      | 已通过 `index.html` 引入；离线回退 `system-ui`       |
| 数字 / 大标题 | Manrope                                                    | 仅用于指标数值、页面大标题、图表轴标签，避免全站花哨 |
| 等宽序列      | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` | 序列、对齐、位置号必须等宽                           |

中文回退：`"PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`。在 `--font-inter` / `--font-manrope` 的值后追加即可，不新增字体文件。

### 3.2 字阶

| Token   | 类名                                                | 字号 / 行高   | 用途                         |
| ------- | --------------------------------------------------- | ------------- | ---------------------------- |
| Display | `text-4xl font-semibold tracking-tight`             | 36 / 40       | 登录页、空状态大标题（少量） |
| H1      | `text-2xl font-semibold tracking-tight md:text-3xl` | 24–30 / 32–36 | 页面标题                     |
| H2      | `text-lg font-semibold`                             | 18 / 28       | 卡片标题、区块标题           |
| H3      | `text-base font-medium`                             | 16 / 24       | 小节标题                     |
| Body    | `text-sm`                                           | 14 / 22       | 默认正文                     |
| Small   | `text-xs`                                           | 12 / 18       | 辅助说明、时间、图例         |
| Metric  | `text-3xl font-semibold tabular-nums`               | 30 / 36       | 指标卡数值                   |
| Mono    | `font-mono text-sm leading-6`                       | 14 / 24       | 序列展示                     |

规则：

- 页面标题统一 `<h1>`，一个页面只出现一次。
- 指标数值使用 `tabular-nums`，避免数字跳动。
- 中文段落不使用 `uppercase`；英文标签可用 `text-xs uppercase tracking-wide text-muted-foreground`。
- 正文最大行宽约 72 字符（`max-w-prose`），说明文字不要铺满大屏。

### 3.3 间距

- 基础栅格 4px；只使用 4 的倍数（Tailwind 默认刻度）。
- 页面内边距由 `Main` 提供（`px-4 py-6`）；页面区块之间 `gap-6`（24px），小屏 `gap-4`。
- 卡片内边距 `p-5`（20px）或 `p-6`（24px）；表单单字段间距 `space-y-2`，字段组 `space-y-6`。
- 指标卡网格：`grid gap-4 sm:grid-cols-2 xl:grid-cols-4`。
- 主内容双栏：`grid gap-6 lg:grid-cols-7`，主图卡 `lg:col-span-4`，侧栏 `lg:col-span-3`。

### 3.4 圆角与阴影

| Token          | 值         | 用途                     |
| -------------- | ---------- | ------------------------ |
| `--radius`     | 1rem（16px） | 卡片、弹窗、Sheet        |
| `rounded-2xl`  | 16px       | 卡片、全局容器           |
| `rounded-xl`   | 12px       | 输入框、按钮、下拉       |
| `rounded-md`   | 8px        | Badge、小标签、图标按钮  |
| `rounded-full` | —          | 头像、状态点、环形图中心 |

阴影（新增 utility，写在 `index.css`）：

```css
@utility shadow-card {
  box-shadow:
    0 1px 2px 0 oklch(0.2 0.02 250 / 0.04),
    0 8px 24px -12px oklch(0.2 0.02 250 / 0.12);
}
@utility shadow-popover {
  box-shadow:
    0 2px 6px -1px oklch(0.2 0.02 250 / 0.08),
    0 16px 40px -16px oklch(0.2 0.02 250 / 0.18);
}
```

卡片默认 `border bg-card shadow-card`，不使用 `shadow-lg/xl`。悬停仅用于可点击卡片：`transition-shadow hover:shadow-popover`，位移不超过 1px。

---

## 4. 组件规范

### 4.1 按钮

| 类型        | 用法                         | 类                            |
| ----------- | ---------------------------- | ----------------------------- |
| Primary     | 页面唯一主操作（"开始分析"） | `Button` 默认                 |
| Secondary   | 次要操作（"加载示例"）       | `variant='secondary'`         |
| Outline     | 工具性操作（"导出"、"复制"） | `variant='outline'`           |
| Ghost       | 图标、行内操作               | `variant='ghost' size='icon'` |
| Destructive | 删除确认                     | `variant='destructive'`       |

- 高度：默认 `h-9`（36px），紧凑场景 `h-8`；移动端主按钮可 `h-10`。
- 图标按钮必须带 `aria-label` 与 Tooltip。
- 一个卡片/区块最多一个 Primary 按钮。
- 加载态：图标替换为 `Loader2` + `animate-spin`，按钮 `disabled`，文案用动词进行时（"分析中…"）。

### 4.2 卡片

```tsx
<Card className='shadow-card'>
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>一句口径说明</CardDescription>
  </CardHeader>
  <CardContent>…</CardContent>
</Card>
```

- 指标卡：左上标题 + 右上 16px Lucide 图标（`text-muted-foreground`），下方 30px 数值，最下方 12px 变化说明。
- 图表卡：Header 放标题与操作（切换、下载），Content 只放图表，图表高度 280–360px。
- 不要在每个卡片上加彩色左边框；用图标底色或 Badge 表达分类。

### 4.3 表单

- 使用 `react-hook-form` + `zodResolver` + `Form*` 组件，错误信息在字段下方 `text-xs text-destructive`。
- 序列输入用 `Textarea`，`font-mono text-sm`，`min-h-40`，带字符计数（右下角 `text-xs text-muted-foreground`）。
- 输入框聚焦：`focus-visible:ring-2 focus-visible:ring-ring/50`，不使用发光。
- 必填标记用 `*` + `text-destructive`，并在表单顶部说明"带 \* 为必填"。
- 校验时机：失焦 + 提交；输入时不打断，除非已出过错。

### 4.4 表格（历史记录）

- 表头 `h-10 text-xs font-medium text-muted-foreground`，行 `h-12`，hover `bg-muted/50`。
- 数值右对齐并使用 `tabular-nums`；序列摘要左对齐、截断 `max-w-[280px] truncate`。
- 类型列用 Badge：`序列分析`（青绿底）/ `序列比对`（紫底），不只用颜色区分，带文字。
- 行操作放最右列 `DropdownMenu`（查看、可视化、导出、删除），避免一排图标。
- 分页复用 `DataTablePagination`；空状态不用空表格，用 `EmptyState`。

### 4.5 弹窗 / Sheet

- 删除确认用 `AlertDialog`，标题写明对象（"删除这条分析记录？"），描述说明不可撤销。
- 详情用 `Sheet`（右侧，`sm:max-w-xl`），内部结构：标题 + 元信息 + 分区结果 + 底部操作。
- 表单弹窗最大宽度 `sm:max-w-lg`，底部按钮右对齐（取消在左）。
- 所有弹窗关闭后焦点回到触发元素（Radix 默认行为，勿覆盖）。

### 4.6 反馈

| 状态 | 表现                                                         |
| ---- | ------------------------------------------------------------ |
| 加载 | 骨架屏（`Skeleton`）用于首屏与表格；局部 loading 用按钮态    |
| 空   | 图标 + 一句说明 + 一个主操作，居中，垂直留白 ≥ 64px          |
| 错误 | `Alert`（destructive）+ 重试按钮；Toast 只用于瞬时错误       |
| 成功 | Toast（sonner），2–3 秒，文案含结果（"已保存 1 条分析记录"） |
| 危险 | `AlertDialog` 二次确认，不使用 `window.confirm`              |

Toast 位置：右下角（模板默认），同屏最多 3 条；不用 Toast 承载需要阅读的长文本。

---

## 5. 图表规范（ECharts）

### 5.1 通用

- 高度：主图 320px，侧图 280px，小图 200px；容器 `w-full`。
- 内边距：`grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true }`。
- 坐标轴：轴线 `--border`，刻度线隐藏，标签 `11–12px`、`--muted-foreground`。
- 网格线：仅 Y 轴，`splitLine.lineStyle.type='dashed'`，颜色 `--border`，透明度 0.8。
- Tooltip：白底（深色模式卡片底）、`shadow-popover`、12px 字号、数值带单位。
- 图例：底部或右上，圆点 8px，文字 12px；系列 ≤ 5 时不显示图例（标签直接标注）。
- 动画：`animationDuration: 300`，`animationEasing: 'cubicOut'`；`prefers-reduced-motion` 时关闭。
- 主题切换：监听 `useTheme().resolvedTheme`，重建 option，不从 DOM 读旧颜色缓存。

### 5.2 各图要求

| 图          | 类型                                      | 要点                                                                                               |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 碱基比例    | 环形图（`pie` + `radius: ['62%','82%']`） | 中心显示有效长度；标签显示百分比（≥5% 才显示），其余进 tooltip；A/T/C/G/N 用固定色                 |
| 碱基数量    | 柱状图                                    | 四根柱、圆角 4px、宽度 ≤ 28px；Y 轴从 0 开始，不截断                                               |
| GC/AT 对比  | 水平堆叠条                                | GC 用主色、AT 用青绿；直接标注百分比；总长 100%                                                    |
| 滑动窗口 GC | 折线/面积                                 | X 轴为窗口起点（bp），Y 轴 0–100%；线宽 2px；可加 `markLine` 标平均 GC；窗口/步长控件在卡片 Header |
| 首页趋势    | 面积折线                                  | 按日期聚合，缺失日期断开（`connectNulls: false`），不伪造 0                                        |

### 5.3 图表反模式

- 不用 3D、不用阴影柱、不用彩虹色板。
- 不在一个图里放超过 5 个系列。
- 不给每根柱子不同颜色（除非类别就是碱基）。
- Y 轴不从非零开始（GC 百分比必须 0–100 或明确标注截断）。
- 数据为空时不渲染空坐标系，显示 `EmptyState`。

---

## 6. 页面布局模式

### 6.1 页面头部

```tsx
<div className='flex flex-wrap items-end justify-between gap-3'>
  <div className='space-y-1'>
    <h1 className='text-2xl font-semibold tracking-tight'>DNA 序列分析</h1>
    <p className='text-sm text-muted-foreground'>
      输入或上传序列，获取碱基组成、GC 含量与转录结果。
    </p>
  </div>
  <div className='flex items-center gap-2'>…操作…</div>
</div>
```

- 标题 + 一句说明 + 右侧操作；移动端操作换行到下一行。
- 页面与 Header 之间不要额外加分割线；用留白分组。

### 6.2 Dashboard

1. 欢迎区（左：问候 + 日期；右：主操作"新建分析"）。
2. 四张指标卡（`grid sm:grid-cols-2 xl:grid-cols-4`）。
3. 主图区（7/5 分栏：GC 趋势 + 碱基分布）。
4. 最近记录（整宽表格或列表）+ 快捷操作。
5. 无数据时整页替换为空状态引导，不显示 0 值四联卡。

### 6.3 分析页

两栏（`lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`）：

- 左：输入卡（Tab：手动 / FASTA / 示例）、校验提示、操作按钮、保存开关。
- 右：结果区。未分析时显示说明与口径；分析后依次为概览指标（4 小卡）→ 碱基组成 → 链结果（互补/反向互补/RNA，等宽 + 复制）。
- 移动端：输入在上，结果在下，结果区可折叠。

### 6.4 比较页

- 顶部双输入（`grid md:grid-cols-2`），下方主按钮。
- 结果：摘要条（4–6 个指标）→ 对齐视图（等宽、分块、差异高亮）→ 差异表格（按类型 Tab 过滤）。
- 对齐视图必须可横向滚动，位置标尺固定；不要压缩字体到不可读。

### 6.5 可视化页

- 顶部：选择序列（Select / 来自历史）+ 窗口参数。
- 网格：环形图（4 列）+ 柱状图（8 列）；下方 GC 曲线整宽；再下方 GC/AT 与长度统计。
- 每个图表卡独立 loading，避免整页闪烁。

### 6.6 历史页

- 工具栏：搜索、时间筛选、类型筛选、导出（选中时）。
- 表格整宽；行点击打开详情 Sheet。
- 删除后行淡出并从列表移除，统计数字延迟 300ms 更新。

---

## 7. 动效

| 场景               | 时长 / 曲线                        |
| ------------------ | ---------------------------------- |
| 按钮 hover / focus | 150ms ease-out                     |
| 卡片 hover 阴影    | 200ms ease-out                     |
| 弹窗 / Sheet 进出  | 200ms ease-out（Radix 默认）       |
| 图表初次渲染       | 300ms cubicOut                     |
| 页面切换           | 不做整页动画；依赖路由即时切换     |
| 数字变化           | 不做滚动动画（避免演示时分散注意） |

必须遵守 `prefers-reduced-motion: reduce`：关闭图表动画与骨架脉冲。

---

## 8. 响应式

| 断点          | 布局                                          |
| ------------- | --------------------------------------------- |
| `< 640px`     | 单列；指标卡 1 列；表格横向滚动；侧边栏抽屉   |
| `640–1023px`  | 指标卡 2 列；双栏区域改单列；图表高度 260px   |
| `1024–1279px` | 侧边栏展开；分析页两栏；Dashboard 7/5 分栏    |
| `≥ 1280px`    | 内容最大宽 1280px；图表 320px；表格显示全部列 |

规则：

- 不使用固定像素宽度布局；序列区用 `overflow-x-auto`。
- 触控目标 ≥ 40×40px。
- 移动端隐藏次要表格列（用 `hidden md:table-cell`），不隐藏关键信息。

---

## 9. 可访问性

- 语义标签：`header/nav/main/section`；页面唯一 `h1`。
- 图标按钮 `aria-label`；装饰图标 `aria-hidden='true'`。
- 序列/对齐区域提供文字说明（"第 12 位：A → G 替换"），不能只靠颜色。
- 对比度：正文 ≥ 4.5:1，大字号 ≥ 3:1；Badge 文字与底色对比 ≥ 4.5:1。
- 键盘：Tab 顺序合理，弹窗焦点锁定，Esc 关闭，`SkipToMain` 保留。
- 图表提供 `aria-label` 摘要与数据表入口（详情页/表格）。

---

## 10. 文案规范

- 语言：简体中文为主；专业名词首次出现可中英并列，如"GC 含量（GC Content）"。
- 语气：陈述、克制，不用感叹号，不卖萌。
- 按钮：动词开头（"开始分析""导出报告""删除记录"），不用"确定/提交"这类空泛词。
- 错误：说明原因 + 下一步（"第 24 位出现非法字符 'X'，仅支持 A/T/G/C/N"）。
- 空状态：说明为什么空 + 怎么开始（"还没有分析记录。输入一条序列开始第一次分析。"）。
- 免责声明：结果页底部固定一行小字"结果仅用于教学演示，不构成生物学或医学结论"。

---

## 11. 交付检查清单

- [ ] 所有颜色来自 `theme.css`，无硬编码 hex。
- [ ] 所有卡片使用 `shadow-card` 与统一圆角。
- [ ] 页面标题、间距、按钮层级一致。
- [ ] 深色模式下图表、Badge、表格均可读。
- [ ] 碱基五色在所有页面一致。
- [ ] 空/错/加载三态齐全。
- [ ] 移动端 375px 宽度下无横向溢出（序列区除外，需可滚动）。
- [ ] 键盘可完成一次分析流程。
