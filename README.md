# dsh-memory-toolkit

> DeepSeek Harness 记忆与 Token 优化插件工具包：跨会话知识图谱记忆 + 五层省 Token 编排。

Memory and token-optimization plugin toolkit for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Two independent plugins that compose or stand alone:

| Plugin | Package | Purpose |
|---|---|---|
| **graph-memory** | `@123caiji/dsh-graph-memory` | Cross-session knowledge graph memory: typed nodes, causal relations, PageRank, communities, dual-path recall (vector + FTS5) |
| **lean-context** | `@123caiji/dsh-lean-context` | Token-saving orchestration: five orthogonally-layered capabilities (discipline, convergence, routing, audit, rebuild) |

---

## 实测数据

以下数据来自实际运行（2026-08-18，Node v24.15.0，Windows 11）：

### 代码规模

| 指标 | graph-memory | lean-context | 合计 |
|---|---|---|---|
| TypeScript 源码行数 | 5,813 | 448 | **6,261** |
| 测试文件数 | 11 | — | 11 |
| 测试用例数 | 107 | — | 107 |

### 测试结果

```
Test Files  1 failed | 10 passed (11)
     Tests  1 failed | 106 passed (107)
  Duration  8.52s
```

- **106/107 测试通过**（99.1% 通过率）
- 唯一失败：`migration.test.ts` 的临时目录清理（Windows EPERM 权限问题，非代码缺陷）

### graph-memory Benchmark

插入 15 个渗透测试知识节点后的实际运行数据：

```
数据库大小: 4 KB
节点总数: 15 (TASK: 8, SKILL: 6, EVENT: 1)
关系总数: 14 (USED_SKILL: 3, SOLVED_BY: 3, REQUIRES: 3, PATCHES: 3, CONFLICTS_WITH: 2)
向量索引: 15 条 (128 维)

FTS5 搜索 "nmap 扫描" → 返回 3 条:
  - [TASK] nmap-端口扫描: 对 192.168.1.0/24 执行 nmap -sS -sV 全端口扫描
  - [TASK] wpscan-wordpress-扫描: 对 WordPress 站点执行 wpscan
  - [TASK] nikto-web-扫描: 执行 nikto 对 Web 服务进行漏洞扫描

向量搜索 → 返回 5 条:
  - [TASK] nmap-端口扫描
  - [TASK] hydra-smb-暴力破解
  - [SKILL] nuclei-漏洞扫描模板
  - [TASK] sqlmap-注入检测
  - [SKILL] burp-suite-代理抓包
```

### lean-context Token 节约实测

纪律层注入成本（一次性）：

```
Discipline prompt: 2,914 bytes ≈ 911 tokens
```

对 DSH 仓库的 `context_audit` 实测（指令链 token 成本）：

```
./AGENTS.md                                    15,997 bytes ≈  4,999 tokens
./docs/AGENTS.md                               10,635 bytes ≈  3,323 tokens
./.agents/skills/dsh-find-simplifications/      14,680 bytes ≈  4,588 tokens
./.agents/skills/dsh-prose-standard/            9,139 bytes ≈  2,856 tokens
./.agents/skills/dsh-translate-docs/           10,316 bytes ≈  3,224 tokens
./.agents/skills/record-browser-gif/           12,195 bytes ≈  3,811 tokens
./.agents/skills/dsh-code-review/                8,278 bytes ≈  2,587 tokens
...（共 14 个文件）
TOTAL: 123,784 bytes ≈ 38,684 tokens
```

ZeroToken 模式下的输出节约（实测对比）：

| 场景 | 冗长输出 | 精简输出 | 节约 | 降幅 |
|---|---|---|---|---|
| A: "帮我看看这个函数做什么" | 213 tokens | 27 tokens | **186 tokens** | **88%** |
| B: 代码修复任务 | 214 tokens | 65 tokens | **149 tokens** | **70%** |

综合估算（100 轮会话）：

```
平均每轮节约:  168 tokens
纪律层成本:    911 tokens（一次性注入）
100 轮净节约:  15,889 tokens
ROI:          17x（投入 1 倍 token 换回 17 倍节约）
纪律层占比:    2.4%（相对于 38,684 tokens 指令链）
```

**结论**：纪律层仅占指令链 2.4% 的 token 成本，但通过 ZeroToken 模式可在每个会话中节约 70%-88% 的输出 token，100 轮会话 ROI 达 17 倍。

---

## 目录

- [快速安装](#快速安装)
- [插件一：graph-memory（跨会话记忆）](#插件一graph-memory跨会话记忆)
- [插件二：lean-context（省 Token 编排）](#插件二lean-context省-token-编排)
- [配置参考](#配置参考)
- [开发指南](#开发指南)
- [验证与排查](#验证与排查)
- [许可证与致谢](#许可证与致谢)

---

## 快速安装

### 方式 A：从 GitHub 安装（推荐）

```bash
# 安装整个工具包
dsh plugin add github:123caiji/dsh-memory-toolkit

# 或只安装单个插件
dsh plugin add github:123caiji/dsh-memory-toolkit --subdir packages/graph-memory
dsh plugin add github:123caiji/dsh-memory-toolkit --subdir packages/lean-context
```

### 方式 B：从本地路径安装（开发模式）

```bash
git clone https://github.com/123caiji/dsh-memory-toolkit.git
cd dsh-memory-toolkit
pnpm install

# 从本地路径加载到 DSH
dsh plugin add ./packages/graph-memory
dsh plugin add ./packages/lean-context
```

### 方式 C：网页端安装

1. 启动 DSH Web：`dsh web`
2. 访问 `http://127.0.0.1:3080`
3. 进入 **设置 → 插件 → 添加**
4. 填入 `github:123caiji/dsh-memory-toolkit`
5. 选择要加载的子包

### 验证安装

```bash
dsh plugin list    # 确认 graph-memory 和 lean-context 处于 active 状态
dsh doctor         # 诊断插件加载错误
```

---

## 插件一：graph-memory（跨会话记忆）

### 是什么

为 DeepSeek Harness 提供跨会话的长期记忆能力。基于 SQLite 知识图谱，将任务（TASK）、技能（SKILL）、事件（EVENT）存储为节点，通过五种因果关系连接，使用 PageRank 和社区检测进行相关性排序。

**核心特性**：
- 三类节点：TASK（任务）/ SKILL（技能）/ EVENT（事件）
- 五种因果关系：`USED_SKILL` / `SOLVED_BY` / `REQUIRES` / `PATCHES` / `CONFLICTS_WITH`
- 双路召回：向量检索（可选）→ 社区扩展 → PageRank 排序；未配置向量时回退 SQLite FTS5 全文检索
- 自动注入：相关记忆在 Prompt Assembly 阶段自动注入上下文

### 使用方法

**自动模式（无需操作）**：插件加载后，相关记忆会自动注入到新会话的系统提示中。

**工具调用**：

| 工具 | 说明 | 示例 |
|---|---|---|
| `gm_status` | 查看数据库状态、节点数、关系数 | `gm_status()` |
| `gm_search` | 检索相关记忆 | `gm_search(query="nmap 扫描", limit=5)` |
| `gm_record` | 记录新节点 | `gm_record(type="TASK", title="端口扫描", content="对 192.168.1.0/24 执行 nmap")` |
| `gm_stats` | 查看图谱统计 | `gm_stats()` |

### 向量检索配置（可选）

不配置时自动回退 FTS5 全文检索。配置后启用语义向量召回，召回精度更高：

```bash
# 设置环境变量（DeepSeek Embedding API 示例）
setx GRAPH_MEMORY_EMBEDDING_API_KEY "your-api-key"
setx GRAPH_MEMORY_EMBEDDING_BASE_URL "https://api.deepseek.com/v1"
setx GRAPH_MEMORY_EMBEDDING_MODEL "text-embedding-v1"
setx GRAPH_MEMORY_EMBEDDING_DIMENSIONS "1024"
```

重启 DSH 后生效。验证：调用 `gm_status`，`vectorEnabled` 应为 `true`。

### 数据库位置

默认：`~/.dsh/graph-memory/graph-memory.db`

覆盖：在 profile 的 `cordis.patch.yml` 中修改 `dbPath`：

```yaml
- insert:
    - id: graph-memory
      name: '@123caiji/dsh-graph-memory'
      config:
        dbPath: /your/custom/path/graph-memory.db
```

完整文档见 [packages/graph-memory/README_CN.md](packages/graph-memory/README_CN.md)。

---

## 插件二：lean-context（省 Token 编排）

### 是什么

五层正交的 Token 优化能力，每层独立开关。内置纪律层和审计层，开箱即用；收敛、路由、重建层委托上游社区插件。

### 五层架构

| 层 | 作用机制 | 实现来源 | 默认 | 风险 |
|---|---|---|---|---|
| **discipline**（纪律） | systemPrompt 注入六模式决策表 | 内置 | 开 | 低 |
| **convergence**（收敛） | MCP 工具 schema 压缩 | 委托 dsh-mcp-lens | 关 | 低 |
| **routing**（路由） | 简单问题 flash 直答 | 委托 dsh-model-router | 关 | 中 |
| **audit**（审计） | 只读上下文成本审计 | 内置（`context_audit` 工具） | 开 | 低 |
| **rebuild**（重建） | Agent Loop 切片重建 | 委托 dsh-slice-agent-loop | 关 | 高 |

### 使用方法

**纪律层（自动）**：
- 插件加载后自动注入六模式决策表到系统提示
- 对 Agent 说"省 token"强化 ZeroToken 模式
- 说"详细解释"退出省 token 模式

**审计层**：
```bash
# 调用 context_audit 工具审计上下文 token 成本
context_audit(cwd=".")
```
输出：`AGENTS.md` / `CLAUDE.md` / `.agents/skills/*/SKILL.md` 的 token 成本 + 重复检测。

**收敛 / 路由 / 重建层**：
安装上游插件后在配置中开启：

```bash
dsh plugin add github:labmimors/dsh-mcp-lens          # 收敛层
dsh plugin add github:tianji-qingtian/dsh-model-router # 路由层
dsh plugin add github:TT-Wang/dsh-slice-agent-loop     # 重建层（高风险，单独验证）
```

完整文档见 [packages/lean-context/README.md](packages/lean-context/README.md)。

---

## 配置参考

两个插件的配置都在各自的 `cordis.patch.yml` 中。可在 profile 层覆盖：

```yaml
# ~/.dsh/profiles/web/cordis.patch.yml
- insert:
    - id: graph-memory
      name: '@123caiji/dsh-graph-memory'
      config:
        recallMaxNodes: 10        # 召回最大节点数（默认 6）
        recallMaxDepth: 3         # 召回深度（默认 2）
        maintenanceInterval: 12   # 维护周期（小时，默认 6）

    - id: lean-context
      name: '@123caiji/dsh-lean-context'
      config:
        discipline:
          enabled: true
        audit:
          enabled: true
          cacheSeconds: 120
        convergence:
          enabled: true             # 需先安装 dsh-mcp-lens
        routing:
          enabled: false
        rebuild:
          enabled: false            # 高风险，默认关
```

---

## 开发指南

### 环境要求

- Node.js `>= 20`（推荐 22.19+ 或 24+）
- pnpm `>= 9`
- DSH 源码仓库（用于本地集成测试）

### 本地开发

```bash
git clone https://github.com/123caiji/dsh-memory-toolkit.git
cd dsh-memory-toolkit
pnpm install

# 构建
pnpm run build

# 测试
pnpm run test

# 单个包
pnpm --filter @123caiji/dsh-graph-memory run build
pnpm --filter @123caiji/dsh-lean-context run test
```

### 目录结构

```
dsh-memory-toolkit/
├── package.json                 # workspace 根
├── pnpm-workspace.yaml
├── LICENSE                      # MIT
├── README.md                     # 本文件
├── .gitignore
└── packages/
    ├── graph-memory/             # 跨会话知识图谱记忆 (5,813 行 TS)
    │   ├── package.json
    │   ├── cordis.patch.yml      # DSH 插件注册
    │   ├── dsh.ts                # DSH 工具注册入口 (428 行)
    │   ├── index.ts              # 导出入口 (872 行)
    │   ├── src/
    │   │   ├── engine/           # LLM/Embedding 引擎
    │   │   ├── extractor/        # 节点提取器
    │   │   ├── format/           # 格式化与组装
    │   │   ├── graph/            # 图算法（PageRank/社区/去重/维护）
    │   │   ├── recaller/         # 召回逻辑
    │   │   ├── store/            # SQLite 存储层 (643+ 行)
    │   │   └── types.ts          # 类型定义
    │   ├── test/                 # Vitest 测试 (107 用例)
    │   ├── docs/                 # 文档与图片
    │   ├── README.md             # 英文文档
    │   ├── README_CN.md           # 中文文档
    │   └── LICENSE               # MIT（双版权：adoresever + 123caiji）
    └── lean-context/             # 省 Token 编排 (448 行 TS)
        ├── package.json
        ├── cordis.patch.yml
        ├── src/
        │   ├── index.ts          # 统一入口 (126 行)
        │   ├── discipline.ts      # 纪律层：六模式决策表 (65 行)
        │   └── audit.ts          # 审计层：context_audit 工具 (257 行)
        ├── README.md             # 完整文档
        └── LICENSE               # MIT
```

---

## 验证与排查

### 安装验证

```bash
dsh plugin list
# graph-memory    active
# lean-context    active
```

### graph-memory 验证

```bash
# 在 DSH 会话中调用
gm_status()
# 期望输出：dbPath, nodeCount, relationCount, vectorEnabled
```

### lean-context 验证

```bash
# 纪律层：新会话的系统提示应包含 "Lean Context — Six-Mode Discipline"
# 审计层：context_audit 工具应可用
context_audit(cwd=".")
```

### 常见问题

| 问题 | 原因 | 解决 |
|---|---|---|
| `Cannot find module '@photostructure/sqlite'` | native binding 未编译 | `pnpm install` 时确认 allowBuilds 包含该包 |
| `gm_status` 返回 `vectorEnabled: false` | 未配置 embedding 环境变量 | 设置 `GRAPH_MEMORY_EMBEDDING_*` 后重启 DSH |
| 纪律层未生效 | systemPrompt section 未注入 | 检查 `cordis.patch.yml` 的 `discipline.enabled: true` |
| 委托层报 `not wired yet` | 上游插件未安装 | 按上文安装 dsh-mcp-lens / dsh-model-router / dsh-slice-agent-loop |

### 排查命令

```bash
dsh doctor                # 诊断插件加载错误
dsh plugin list           # 列出全部插件
dsh plugin reload         # 重载插件
dsh plugin remove <name>  # 卸载
```

---

## 许可证与致谢

### 许可证

MIT。详见 [LICENSE](LICENSE)。

### 致谢

- **graph-memory** 衍生自 [adoresever/graph-memory](https://github.com/adoresever/graph-memory)（MIT），感谢原作者的知识图谱记忆设计
- **lean-context** 的纪律层参考了 [phoenixlucky/zerotoken-skill](https://github.com/phoenixlucky/zerotoken-skill) 的 ZeroToken 六模式决策表
- 感谢 [DeepSeek](https://github.com/deepseek-ai) 团队的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 提供的插件化 Agent 框架

### 上游插件（可选依赖）

| 插件 | 用途 | 仓库 |
|---|---|---|
| dsh-mcp-lens | MCP 工具 schema 收敛 | `labmimors/dsh-mcp-lens` |
| dsh-model-router | 模型路由 | `tianji-qingtian/dsh-model-router` |
| dsh-slice-agent-loop | Agent Loop 切片重建 | `TT-Wang/dsh-slice-agent-loop` |

---

## 贡献

欢迎提交 Issue 和 PR：

- Issue：https://github.com/123caiji/dsh-memory-toolkit/issues
- PR：https://github.com/123caiji/dsh-memory-toolkit/pulls

提交前请确保 `pnpm run build` 和 `pnpm run test` 通过。
