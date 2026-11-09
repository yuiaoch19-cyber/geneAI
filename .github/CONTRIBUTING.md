# 贡献指南 · GeneAI

欢迎参与 GeneAI 的建设。无论是报告 Bug、提出功能建议、改进文档，还是提交代码，都很有价值。

GeneAI 是一个面向教学的 DNA 序列分析与可视化项目：前端 React + Vite，后端 FastAPI + Python 3.12。请先阅读 [README](../README.md) 的「快速开始」把项目跑起来。

## 开始之前

| 依赖 | 版本 |
| ---- | ---- |
| Node.js | ≥ 22 |
| pnpm | ≥ 10 |
| Python | **3.12**（3.14 下 Biopython 无预编译轮子） |

```bash
git clone https://github.com/yuiaoch19-cyber/geneAI.git
cd geneAI
pnpm install
cd server && python -m venv .venv && .venv/Scripts/python.exe -m pip install -r requirements.txt
```

## 可以贡献什么

- **Bug 修复**：请附上明确的复现步骤、运行环境与截图。
- **功能建议**：先开一个 Issue 讨论方案，确认后再动手，避免重复实现。
- **文档改进**：README、`docs/` 下的说明、接口文档与常见问题都欢迎补充。
- **算法与测试**：DNA 计算口径变更必须同步更新 `server/tests/` 与前端纯函数测试。

> 本项目定位为教学演示：不接入大模型、不上传用户序列、不提供疾病或临床结论，请保持这三条边界。

## 代码规范

- 遵循仓库现有的 ESLint / Prettier / TypeScript 配置，保持类型安全。
- 前端新增页面放在 `src/features/`，后端新增算法放在 `server/app/services/`。
- 演示数据必须显式标注「演示数据」，且不得写入数据库。
- 提交信息沿用 Conventional Commits（如 `feat(map): ...`、`fix(api): ...`）。

## 提交前自检

```bash
# 前端
pnpm lint
pnpm format:check
pnpm test:unit
pnpm build

# 后端
cd server
.venv/Scripts/python.exe -m pytest tests -q
```

CI 会在 `main` 的 push 与 PR 上自动执行同样的检查。

## Pull Request

1. Fork 本仓库，新建分支（如 `feature/your-feature`）。
2. 按 [PR 模板](PULL_REQUEST_TEMPLATE.md) 填写变更说明，并关联相关 Issue。
3. 保持 PR 聚焦：一次 PR 只解决一个问题。
4. 等待 CI 通过后再请求评审。

## 报告问题

使用 [Bug 模板](ISSUE_TEMPLATE/🐞-bug-report.md) 或 [功能建议模板](ISSUE_TEMPLATE/✨-feature-request.md)。提交前请先查一下 README 的「常见错误解决方法」与已有 Issue。

## 社区约定

请保持友善、具体、就事论事，并遵守 [行为准则](CODE_OF_CONDUCT.md)。

感谢你让 GeneAI 变得更好。
