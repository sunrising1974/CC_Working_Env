# CC_Working_Env - Claude Code 工作环境状态栏插件

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

**CC_Working_Env** - Claude Code 状态栏插件，实时显示模型、上下文、Token、Skill 和 Agent 使用情况

[![GitHub repo](https://img.shields.io/badge/GitHub-sunrising1974%2FCC_Working_Env-181717?style=for-the-badge&logo=github)](https://github.com/sunrising1974/CC_Working_Env)

</div>

---

CC_Working_Env 是一个轻量级的 Claude Code 状态栏插件，实时显示当前工作环境的各种指标。

## ✨ 功能特性

- 📊 **当前模型** - 显示正在使用的 AI 模型
- 🧠 **上下文占用率** - 实时追踪会话 token 占模型上下文窗口的百分比
- 💰 **Token 消耗** - 追踪总 Token 消耗量（输入 + 输出）
- 🔢 **调用次数** - 统计 API 调用总次数
- 🔧 **当前 Skill** - 显示正在使用的 Skill
- 🤖 **当前 Agent** - 显示正在调用的 Agent

## 🚀 快速安装

### 从 GitHub 克隆并安装

```bash
# 克隆仓库
git clone https://github.com/sunrising1974/CC_Working_Env.git
cd CC_Working_Env

# Windows PowerShell
.\install.ps1

# Linux/Mac
bash install.sh
```

### Windows (本地开发)

```powershell
# 方法 1: 使用 /plugin install 命令（推荐）
/plugin install .

# 方法 2: 运行 PowerShell 安装脚本
.\install.ps1

# 方法 3: 使用 Node.js 安装脚本
node scripts/install.js
```

### Linux/Mac (本地开发)

```bash
# 方法 1: 使用 /plugin install 命令（推荐）
/plugin install .

# 方法 2: 运行安装脚本
bash install.sh

# 方法 3: 使用 Node.js 安装脚本
node scripts/install.js
```

## 状态栏显示

重启 Claude Code 后，状态栏会自动显示：

```
📊 Modelscope_Qwen3 | 🧠 24.2% | 💰 62.0K | 🔢 42 | 🔧 code-reviewer | 🤖 planner
```

| 图标 | 字段 | 说明 |
|------|------|------|
| 📊 | Modelscope_Qwen3 | 正在使用的模型 |
| 🧠 | 24.2% | 上下文占用率（会话 token / 模型窗口） |
| 💰 | 62.0K | 累计消耗的总 token 数 |
| 🔢 | 42 | API 调用总次数 |
| 🔧 | code-reviewer | 当前使用的 Skill（无则显示 `-`） |
| 🤖 | planner | 正在调用的 Agent（无则显示 `-`） |

## 使用说明

### 插件命令

安装后可在 Claude Code 中使用以下命令：

```
/plugin cc-working-env status    # 显示当前状态（简洁模式）
/plugin cc-working-env show      # 显示详细统计信息
/plugin cc-working-env reset     # 重置所有统计数据
/plugin cc-working-env clear     # 清除当前 Skill/Agent
```

### CLI 工具

也可以直接使用命令行工具：

```bash
# 查看详细统计
node dist/cli.js show

# 更新 Token 统计
node dist/cli.js update 1000 500 Qwen3

# 更新会话上下文（实时更新占用率）
node dist/cli.js session 50000 12000

# 设置当前 Skill
node dist/cli.js skill code-reviewer

# 设置当前 Agent
node dist/cli.js agent planner

# 清除当前上下文
node dist/cli.js clear

# 重置所有统计
node dist/cli.js reset
```

### 查看详细统计

```bash
node dist/index.js --detailed
```

输出示例：

```
📊 模型统计
├─ 当前模型：Modelscope_Qwen3
├─ 上下文窗口：256K tokens
├─ 会话输入：50.0K tokens
├─ 会话输出：12.0K tokens
├─ 上下文占用：24.2%
├─ 总消耗：62.0K tokens
├─ 总调用：42 次
├─ 当前 Skill: code-reviewer
├─ 当前 Agent: planner
├─ Skill 使用:
│  ├─ code-reviewer: 5 次
│  └─ security-reviewer: 2 次
├─ Agent 使用:
│  ├─ planner: 3 次
│  └─ tdd-guide: 2 次
└─ 最后更新：2026/5/12 09:33:28
```

## 配置说明

### settings.json 配置

安装后会自动配置 `~/.claude/settings.json`：

```json
{
  "statusLine": {
    "command": "node ~/.claude/plugins/cc-working-env/dist/index.js",
    "interval": 3000
  }
}
```

### Hook 配置（自动追踪）

如需自动追踪 Skill 和 Agent 使用情况，添加以下 hooks 配置：

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Skill",
        "command": "node ~/.claude/plugins/cc-working-env/dist/cli.js skill \"$TOOL_NAME\"",
        "description": "Track Skill usage"
      },
      {
        "matcher": "Agent",
        "command": "node ~/.claude/plugins/cc-working-env/dist/cli.js agent \"${TOOL_NAME:-general-purpose}\"",
        "description": "Track Agent calls"
      }
    ],
    "Stop": [
      {
        "command": "node ~/.claude/plugins/cc-working-env/dist/cli.js clear",
        "description": "Clear current Skill/Agent on session end"
      }
    ]
  }
}
```

## 数据存储

插件将数据保存在以下位置：

| 文件 | 路径 | 说明 |
|------|------|------|
| 统计数据 | `~/.claude/modelstats.json` | 主统计信息 |
| 会话状态 | `~/.claude/modelstats-session.json` | Skill/Agent 使用记录 |

### 数据格式

**modelstats.json:**
```json
{
  "totalTokens": 62000,
  "callCount": 42,
  "currentModel": "Modelscope_Qwen3",
  "sessionInputTokens": 50000,
  "sessionOutputTokens": 12000,
  "currentSkill": "code-reviewer",
  "currentAgent": "planner",
  "lastUpdated": "2026-05-12T09:33:28.000Z"
}
```

**modelstats-session.json:**
```json
{
  "currentSkill": "code-reviewer",
  "currentAgent": "planner",
  "skillUsage": {
    "code-reviewer": 5,
    "security-reviewer": 2
  },
  "agentUsage": {
    "planner": 3,
    "tdd-guide": 2
  },
  "lastUpdated": "2026-05-12T09:33:28.000Z"
}
```

## 卸载插件

### Windows

```powershell
.\uninstall.ps1
```

### Linux/Mac

```bash
bash uninstall.sh
```

或使用插件命令：

```
/plugin uninstall cc-working-env
```

## 开发

### 环境要求

- Node.js >= 18.0.0
- TypeScript >= 5.3.0

### 构建

```bash
npm install
npm run build
```

### 开发模式

```bash
npm run dev
```

### 项目结构

```
cc-working-env/
├── src/
│   ├── index.ts          # 核心逻辑和状态栏输出
│   ├── cli.ts            # 命令行工具
│   └── auto-track.ts     # 自动追踪钩子
├── scripts/
│   ├── install.js        # 安装脚本 (Node)
│   └── uninstall.js      # 卸载脚本 (Node)
├── dist/                 # 编译输出
├── plugin.json           # 插件配置
├── package.json
├── tsconfig.json
├── install.ps1           # Windows 安装脚本
├── install.sh            # Unix 安装脚本
├── uninstall.ps1         # Windows 卸载脚本
└── uninstall.sh          # Unix 卸载脚本
```

## 故障排除

### 状态栏不显示

1. 确保已重启 Claude Code
2. 检查 `settings.json` 中的 `statusLine` 配置
3. 运行测试：`node dist/index.js`
4. 检查插件目录权限

### 数据显示不正确

1. 检查数据文件是否存在且格式正确
2. 尝试重置：`node dist/cli.js reset`
3. 重新构建插件

### Skill/Agent 不更新

1. 检查 hooks 配置是否正确
2. 手动测试：`node dist/cli.js skill test`
3. 查看日志输出

## 注意事项

⚠️ **重要**：由于 Claude Code 的架构限制，插件无法自动捕获每次 API 调用的 token 使用情况。建议：

1. 使用 `session` 命令定期更新会话上下文
2. 配置 hooks 自动追踪 Skill 和 Agent
3. 在应用层面集成统计逻辑

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
