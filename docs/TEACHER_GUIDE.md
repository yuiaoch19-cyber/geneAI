# GeneAI 2.0 教师使用说明

> 给任课老师 / 验收老师的快速上手页。完整技术文档见 [README.md](../README.md)，验收数据见 [FINAL_ACCEPTANCE.md](FINAL_ACCEPTANCE.md)。

## 一、这是什么

GeneAI 是一个**本地运行**的 DNA 序列分析与教学演示平台：

- 输入一段 DNA，完成碱基统计、GC/AT、互补链、反向互补、RNA 转录；
- 把 DNA → RNA → 蛋白质做成**可暂停、可单步、可回放**的动画；
- 模拟替换 / 插入 / 缺失，并展示 DNA、RNA、蛋白质三层变化；
- 在同一坐标轴上查看 ORF、GC 曲线、限制酶、motif、突变位点；
- 查询 NCBI ClinVar 的真实变异注释；
- 把分析记录保存到本机 SQLite，并导出中文 PDF / CSV。

项目**不接入 AI 模型**，也**不提供疾病诊断**；所有计算在本地完成。

## 二、启动（约 2 分钟）

需要：Node.js ≥ 22、pnpm ≥ 10、Python **3.12**。

### 1. 前端依赖（只需一次）

在项目根目录打开终端：

```bash
pnpm install
```

### 2. 启动后端（终端 1）

```bash
cd server
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

如果 `server/.venv` 不存在，先执行：

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

> 必须使用 Python 3.12；Python 3.14 安装 Biopython 会卡在源码编译。

### 3. 启动前端（终端 2，回到项目根目录）

```bash
pnpm dev --host 127.0.0.1 --port 5208
```

浏览器打开：**http://127.0.0.1:5208**

后端接口文档：http://127.0.0.1:8000/docs

## 三、5 分钟演示路线

| 步骤 | 页面 | 操作 |
| --- | --- | --- |
| 1 | 分析总览 | 查看统计卡与图表；空库时可点「查看示例」 |
| 2 | DNA 序列分析 | 点「载入演示」→「分析序列」→ 查看三条转换链 |
| 3 | 转录与翻译 | 选教学示例 B → 开始演示 → 暂停在第 2 步 → 下一步 |
| 4 | 突变模拟 | 点「无义突变」预设 → 应用 → 看蛋白质从 `MEPW*` 变为 `M*` |
| 5 | DNA 序列地图 | 点「生成序列地图」→ 滚轮放大 → 点 ORF 查看详情 |
| 6 | 变异数据库 | 查询 `BRCA1` → 打开一条「意义未明（VUS）」详情 |
| 7 | 历史记录 | 打开一条记录 → 导出 PDF / CSV |

## 四、教学示例（可直接口述）

| 样本 | DNA | mRNA | 蛋白 | 说明 |
| --- | --- | --- | --- | --- |
| A | `ATGGAACCTTGGTAA` | `AUGGAACCUUGGUAA` | `MEPW*` | 正常 |
| B | `ATGTAACCTTGGTAA` | `AUGUAACCUUGGUAA` | `M*` | 第 2 个密码子提前终止 |
| C | `ATGAGAACCTTGGTAA` | `AUGAGAACCUUGGUAA` | `MRTLV` | 第 3 位插入 A，移码 |

对应操作：

- 转录/翻译页「教学示例」下拉框可选 A/B/C；
- 突变页预设含「示例 B · 无义」「示例 C · 移码」；
- 地图页默认 200 bp 示例包含 HBB 片段、EcoRI/BamHI/HindIII 位点。

## 五、数据与隐私

- 数据保存在 `server/geneai.db`，不上传第三方；
- 页面上的「演示数据」有明确标识，**不会写入数据库**；
- 删除 `server/geneai.db` 即可清空全部历史（下次启动自动重建）；
- ClinVar 查询会访问 NCBI 官方接口，需要联网；结果缓存 10 分钟。

## 六、常见问题

| 现象 | 处理 |
| --- | --- |
| 页面提示「无法连接后端服务」 | 确认终端 1 的 uvicorn 正在运行，访问 `http://127.0.0.1:8000/api/health` |
| `pip install` 卡在 Biopython | 当前是 Python 3.14，改用 3.12 建 `.venv` |
| 端口被占用 | 关闭占用 8000 / 5208 的进程，或改端口并同步 `vite.config.ts` 代理 |
| PDF 中文变方块 | Windows 需有微软雅黑；Linux 安装 Noto Sans CJK |
| ClinVar 查询超时 / 429 | 网络或 NCBI 限流，稍后重试；页面会给出明确错误 |
| 地图在手机上显示不全 | 地图支持左右滑动，这是设计行为 |

## 七、边界说明

- 仅用于课程展示与序列统计，**不构成任何临床或医学结论**；
- VUS 显示为「意义未明」，不会标成致病；
- ORF 均为「潜在 ORF」，不等同已验证基因；
- 未实现：账号体系、批量分析、ORF 独立页面、多突变叠加。

## 八、想先看效果

无需启动也可以查看：

- 页面截图：`docs/screenshots/`
- 示例 PDF：`docs/screenshots/phase10-report.pdf`
- 验收报告：`docs/FINAL_ACCEPTANCE.md`
- 答辩演示：`docs/GeneAI-2.0-答辩演示.pptx`
