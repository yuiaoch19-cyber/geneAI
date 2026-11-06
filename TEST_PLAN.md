# GeneAI 测试计划与执行记录

| 项目     | 内容                                                                 |
| -------- | -------------------------------------------------------------------- |
| 文档状态 | 阶段 10 验收版（按实际实现更新）                                     |
| 测试对象 | 前端 React 应用 + FastAPI 后端 + SQLite + PDF 报告                   |
| 测试环境 | Windows 11 / Node 26.5 / pnpm 10.34 / Python 3.12 / Edge（Chromium） |
| 执行方式 | pytest、Vitest、Playwright 脚本、手工验收                            |
| 通过标准 | 自动化用例全部通过；构建、类型检查、ESLint 无错误                    |

## 1. 测试目标与范围

### 1.1 目标

1. 验证 DNA 计算正确（与手算、Biopython 结果一致），而不是"能跑"。
2. 验证前后端契约一致（字段、错误码、GC/AT 与滑窗口径）。
3. 验证主要按钮都有真实行为，没有"点了没反应"。
4. 验证数据持久化、删除、日期筛选与 PDF 导出可用。
5. 验证 1440 / 834 / 390 三档宽度无横向溢出、无控制台错误。

### 1.2 范围内

- 序列输入、FASTA 解析、规范化与校验
- 碱基统计、GC/AT、互补、反向互补、RNA 转录
- Biopython 全局比对、替换/插入/缺失识别、参考坐标
- 滑动窗口 GC
- 历史记录 CRUD、搜索、日期筛选、分页、PDF
- 统计接口与 Dashboard
- 主题切换、响应式布局与空态/错误态

### 1.3 范围外

- 用户注册登录、权限（本项目不做认证）
- 真实基因数据库 / NCBI 比对
- 疾病风险解读
- 高并发与生产部署
- 浏览器兼容性（仅保证 Chromium 系 + 现代 Edge/Chrome）

## 2. 测试层级

| 层级      | 工具                     | 实际用例数 | 运行命令                                             |
| --------- | ------------------------ | ---------- | ---------------------------------------------------- |
| 后端单元  | pytest（`server/tests`） | 159        | `cd server && .venv/Scripts/python.exe -m pytest -q` |
| 前端单元  | Vitest（node 环境）      | 29         | `pnpm test:unit`                                     |
| 后端接口  | Node fetch 验收脚本      | 42 项断言  | `pnpm test:api`（需后端已启动）                      |
| 业务流程  | Playwright（系统 Edge）  | 13 步      | `pnpm test:e2e`（需前后端启动）                      |
| 类型/构建 | tsc / Vite               | —          | `pnpm exec tsc -b && pnpm build`                     |
| 静态检查  | ESLint                   | —          | `pnpm lint`                                          |
| 手工验收  | 清单（第 8 节）          | —          | 见第 8 节                                            |

> `pnpm test` 是 Vitest 浏览器模式，需要额外安装 Chromium；算法与纯函数测试统一使用 `pnpm test:unit`，不依赖浏览器。

## 3. 测试数据

| 编号 | 序列                         | 用途        | 期望                                                    |
| ---- | ---------------------------- | ----------- | ------------------------------------------------------- |
| T1   | `ATGC`                       | 最小常规    | len=4，GC=50%，互补 `TACG`，反向互补 `GCAT`，RNA `AUGC` |
| T2   | `AAAA`                       | GC=0 边界   | GC=0，AT=100，互补 `TTTT`                               |
| T3   | `GGGG`                       | GC=100 边界 | GC=100，AT=0，互补 `CCCC`                               |
| T4   | `NNNN`                       | 无有效碱基  | GC=0（不除零），N=4                                     |
| T5   | ` atg c\n`                   | 小写/空白   | 规范化为 `ATGC`                                         |
| T6   | `>seq1 test\nATGCATGC\n`     | FASTA       | name=`seq1`，序列 `ATGCATGC`                            |
| T7   | `ATGU`                       | RNA 误输入  | 400 `INVALID_SEQUENCE`，提示尿嘧啶                      |
| T8   | `ATGX`                       | 非法字符    | 400，指出第 4 位 X                                      |
| T9   | 100,001 bp                   | 超长        | 413 `SEQUENCE_TOO_LONG`                                 |
| T10  | `ATGCGTACGT` vs `ATGCGTTCGT` | 单替换      | substitution=1，identity=90                             |
| T11  | `ATGCGT` vs `ATGCGTT`        | 尾部插入    | insertion=1（按插入碱基计）                             |
| T12  | `ATGCGTT` vs `ATGCGT`        | 尾部缺失    | deletion=1                                              |
| T13  | `AAAA` vs `TTTT`             | 全替换      | identity=0，substitution=4                              |
| T14  | `ATGC` vs 空                 | 空查询      | 前端禁用；后端 422 `VALIDATION_ERROR`（Pydantic 长度）  |

> 比对差异按「碱基列」计数：连续插入 N 个碱基记为 N 个 insertion，不做事件合并。

## 4. 后端自动化用例

### 4.1 DNA 服务（`server/tests/test_dna.py`，13 个）

- 规范化：小写、空白、单条 FASTA、空输入、仅 FASTA 头、多条 FASTA 拒绝
- 校验：U 与数字的 1-based 位置、非法字符、超长 413
- 统计：A/T/G/C/N 计数、GC/AT（N 不进分母）、全 N
- 转换：互补、反向互补、RNA 同向转录
- 滑窗：完整窗口与末尾丢弃、非法窗口参数

### 4.2 全局比对（`server/tests/test_alignment.py`，9 个）

- 完全相同（identity=100、差异 0）
- 单替换、单插入坐标、单缺失、长度明显不同
- 连续差异、同分策略确定性
- 算法/评分参数返回、分数与匹配数关系

### 4.3 接口（`server/tests/test_api.py`，20 个）

- 健康检查（含数据库连通性）
- `/analyze`：正常、大小写空白、N 口径、非法、U、422 结构
- `/upload/fasta`：正常、无头、多记录、空文件、超 2 MB
- `/history`：创建、列表搜索、本地日期过滤、详情、删除、404
- `/history/{id}/report`：PDF 头、附件头、缺失记录 404
- `/stats/overview`：入库后计数变化

### 4.4 比对接口（`server/tests/test_comparisons.py`，6 个）

- `/compare` 仅预览不落库、字段级错误定位、超 5,000 bp → 413
- `/comparisons` 保存、列表搜索、详情、删除、404
- 统计口径：一次比对计 1 次分析、2 条序列

## 5. 前端单元测试（`src/lib/dna.test.ts`，29 个）

- `normalizeSequence`：正常/小写/空白/单条 FASTA/空/仅头/多头/非法位置/U/数字/缺口/IUPAC/超长
- `countBases` / `gcContent` / `atContent`：含 N、全 A、全 G、全 N
- `complement` / `reverseComplement` / `transcribe`
- `analyzeSequence`：正常、issue、FASTA
- `gcWindows`：完整窗口、末尾丢弃、N 分母、非法参数

## 6. 业务流程与响应式

13 步主流程（Playwright + 系统 Edge，实际执行通过）：

1. 打开 Dashboard → 2. 进入 DNA 分析 → 3. 输入 92 bp 序列 → 4. 执行分析（长度 92、GC 58.7%）→ 5. 查看四条结果链 → 6. 保存到历史（`已保存 #1`）→ 7. 打开历史记录（1 行）→ 8. 查看详情（含原始序列）→ 9. 导出 PDF（81,584 B，`%PDF-`，中文与饼图正常）→ 10. 进入差异比较 → 11. 载入演示并比对（1 替换 + 1 插入，共 2 处差异）→ 12. 打开数据可视化（5 个图表 canvas）→ 13. 返回 Dashboard 查看真实统计。

响应式：1440×1000、834×1000、390×844 三档逐页截图，六页均 `overflow false`，`errors []`。

## 7. 性能与限制

- 单条序列上限 100,000 bp；比对每条上限 5,000 bp；FASTA 上传 2 MB。
- 未做严格压力测试；本地 92 bp 分析、PDF 生成均在 1 秒内完成。
- 滑动窗口点数过多时折线使用 LTTB 采样，避免卡顿。

## 8. 手工验收清单

- [x] 导航六个页面可切换，面包屑正确
- [x] 分析页空序列禁用按钮、非法字符行内报错
- [x] 复制统计摘要/三条链有 toast
- [x] 历史搜索、日期筛选、分页、详情、删除确认、刷新
- [x] PDF 下载文件名含序列名，内容非空白
- [x] 比对页交换序列、载入演示、保存到历史
- [x] 可视化窗口/步长校验与末尾忽略提示
- [x] 深色主题下图表、表格、弹窗可读
- [x] 移动端抽屉导航与单列布局
- [x] 系统设置外观保存后立即生效

## 9. 已知测试缺口

- 未配置 CI；测试需在本机按第 2 节命令执行。
- 组件级测试未覆盖（Vitest 浏览器模式未安装 Chromium），当前以业务流程 E2E 替代。
- E2E 依赖系统安装的 Edge，Linux/macOS 需改为 Playwright Chromium。
- 并发写入、磁盘满、超大数据量未测试。
