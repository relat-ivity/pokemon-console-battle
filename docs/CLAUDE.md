# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本仓库中工作提供指导。

## 项目概述

**宝可梦控制台对战** 是一个 TypeScript/JavaScript 项目，在控制台中模拟第九代宝可梦对战。玩家可以与多种 AI 对手进行对战：**PokéChamp AI**（Minimax + LLM，84% 胜率）、DeepSeek AI、Master AI、智能 AI 或随机 AI，支持太晶化、能力变化和中文本地化。

**关键点：**
- 基于 Pokemon Showdown 模拟器
- 完整的第九代规则支持 (gen9randombattle)
- 多种 AI 实现，难度不同
- 完整的中文语言支持和翻译系统
- 需要 Node.js 18+

## 项目结构

### 核心目录

```
src/
├── battle/              # 主战斗系统（游戏循环、消息解析、UI）
├── ai/                  # AI 玩家实现
├── support/             # 工具模块（翻译系统）
└── types/               # TypeScript 类型定义

pokechamp-ai/
├── pokechamp/          # PokéChamp AI 核心库
├── pokechamp-service.py # PokéChamp AI 服务（Python 子进程）
└── ...                 # 其他 Python 依赖

dist/                   # 编译后的 JavaScript 输出（自动生成）
data/                   # 翻译数据文件
docs/                   # 文档文件
tests/                  # 测试文件
.env.example            # 环境变量配置示例
```

### 战斗系统 (`src/battle/`)

战斗系统是核心游戏引擎，包含 4 个关键文件：

1. **pve-battle.js** (342 行)
   - 主入口和游戏编排器
   - 处理 Pokemon Showdown 消息流
   - 管理玩家输入和队伍选择
   - 入口函数：`startPVEBattle()` 异步函数
   - 使用 readline 进行交互式 CLI 输入

2. **message-handler.js** (537 行)
   - 解析 20+ 种 Pokemon Showdown 战斗消息类型
   - 根据战斗事件更新游戏状态（切换、招式、伤害、倒下、状态等）
   - `BattleMessageHandler` 类通过 `handle*` 方法处理各类消息
   - 将宝可梦名称和招式翻译为中文

3. **battle-state.js** (412 行)
   - 完整的游戏状态管理，包含多个类：
     - `BattleState`：主状态容器
     - `BattleField`：天气、地形、场地效果
     - `PlayerState` / `OpponentState`：个别玩家状态
     - `PokemonState`：单只宝可梦数据（HP、状态、能力变化、太晶化）
   - 管理能力变化、状态异常、队伍组成

4. **ui-display.js** (377 行)
   - 控制台渲染函数
   - 显示：队伍信息、可用选择、战斗状态、宝可梦数据
   - 函数：`displayChoices()`、`displaySwitchChoices()`、`displayTeamInfo()` 等

### AI 系统 (`src/ai/`)

**架构：** 抽象工厂模式，包含基类和具体实现

- **ai-player.ts**：抽象 `AIPlayer` 类，继承 Pokemon Showdown 的 BattlePlayer
- **ai-player-factory.ts**：根据类型创建 AI 实例的工厂
- **ai-player/pokechamp-ai-player.ts**：PokéChamp AI，Minimax 树搜索 + LLM 混合决策（84% 胜率）
  - 使用 Python 子进程运行 PokéChamp LLMPlayer
  - 通过 JSON 进行进程间通信
  - 需要 `OPENROUTER_API_KEY` 环境变量
  - 支持多种免费和付费 LLM 模型（默认使用免费的 DeepSeek）
- **ai-player/master-ai-player.ts**：高级智能 AI，使用更复杂的启发式算法
- **ai-player/smart-ai-player.ts**：本地智能 AI，评估招式威力和属性克制
- **ai-player/deepseek-ai-player.ts**：基于 LLM 的 AI，使用 DeepSeek API（有本地 AI 降级）
- **ai-player/random-ai-player.ts**：随机选择招式/切换，用于测试

**关键方法：**
- `start()`：异步初始化（连接战斗流）
- `receiveRequest()`：处理 Pokemon Showdown 请求消息
- `choosePokemon()` / `chooseMove()`：决策方法

### 支持模块 (`src/support/`)

- **translator.ts**：单例翻译器，用于中文本地化
  - 翻译：宝可梦名称、招式、特性、携带物品、属性、状态异常
  - 使用 `data/translations-cn.json` 进行翻译映射

## 构建和运行命令

### 构建
```bash
npm run build          # 将 TypeScript 编译到 dist/
npm run build:watch   # 开发模式下的监视编译
```

### 运行
```bash
npm start             # 构建 + 运行 pve-battle.js（推荐）
npm run battle        # 仅运行 pve-battle.js
npm run simple        # 运行 simple-battle.js
npm test              # 运行 deepseek 测试
```

**注意：** `postinstall` 钩子会在 `npm install` 后自动运行 `npm run build`

## 重要的消息流程

### pve-battle.js 中的请求处理

请求处理分为三种情况：

**1. teamPreview（队伍预览）：**
- 收到后立即处理（发送队伍顺序到 Showdown）
- 这是初始化消息，不会与其他消息混淆

**2. forceSwitch（强制切换）：**
- 当收到 `|request|` 消息 → 保存到 `currentRequest`
- 使用 `process.nextTick()` 注册延迟处理回调
- 两种情况：
  - 正常情况：`|turn|` 消息到达时（第 190-203 行），检查并处理保存的 forceSwitch 请求
  - 异常情况：没有 `|turn|` 消息（刚上场就倒下），`process.nextTick()` 的延迟回调会处理它

**3. active（普通招式）：**
- 当收到 `|request|` 消息 → 保存到 `currentRequest`
- 等待 `|turn|` 消息到达后（第 190-203 行）处理

这种方式解决了两个问题：
1. request 消息比 move/turn 消息更早到达导致的显示格式混乱
2. 刚上场就倒下时没有 `|turn|` 消息导致的卡死

**关键处理代码：**
- 第 221-225 行：teamPreview 立即处理
- 第 226-235 行：forceSwitch 保存并注册延迟处理
- 第 236-238 行：active 只保存，不需要延迟
- 第 190-203 行：|turn| 消息处理后统一处理保存的请求

### 回合处理（第 182-203 行）

- 以 `|` 开头的战斗消息在消息循环中被处理
- `|turn|` 消息触发回合开始提示（等待用户按回车）
- 在 `|turn|` 消息处理后，检查是否有待处理的请求（forceSwitch 或 active）
- 如果有，立即显示菜单并获取玩家输入
- 这样所有当前 chunk 中的消息都已显示完毕，菜单顺序正确

## 战斗消息解析

Pokemon Showdown 协议使用管道分隔的消息：
- `|switch|p1a: Pikachu|Pikachu, L50, M|156/156` → 玩家切换皮卡丘上场
- `|-damage|p1a: Pikachu|75/156` → 皮卡丘受伤
- `|faint|p1a: Pikachu` → 皮卡丘倒下
- `|move|p2a: Charizard|Flamethrower|p1a: Pikachu` → 使用招式
- `|request|{"active":[...], "side":{...}}` → 玩家选择的 JSON 请求

## 队伍生成

- 使用 Pokemon Showdown 的 `Sim.Teams.generate('gen9randombattle')`
- 使用 `TeamValidator` 验证队伍
- 标准化所有宝可梦：50 级，勤奋性格，所有属性 IV 31，EV 85

## 关键函数

### pve-battle.js
- `startPVEBattle()` - 主入口
- `startMessageLoop()` - 从 Pokemon Showdown 异步处理消息
- `getPlayerChoice()` - 读取玩家输入并验证
- `createPlayerChoiceHandler()` - 为选择处理器创建工厂，通过闭包捕获 battleState

### message-handler.js
- `handleMessage()` - 所有消息类型的分派器
- `handleSwitch()`、`handleMove()`、`handleFaint()`、`handleDamage()` 等 - 消息处理器

### battle-state.js
- `switchPokemon()` - 切换时更新状态
- `markFainted()` - 跟踪倒下的宝可梦
- `boost()` / `unboost()` - 管理能力变化
- `setCurrentRequest()`、`clearCurrentRequest()` - 管理待处理的选择请求

### ui-display.js
- `displayChoices()` - 显示可用招式和切换选项
- `displaySwitchChoices()` - 显示可切换的宝可梦
- `displayTeamInfo()` - 显示完整队伍信息

## 状态管理模式

```
Pokemon Showdown 流
         ↓
消息循环 (pve-battle.js)
         ↓
消息解析器 (message-handler.js)
         ↓
游戏状态更新 (battle-state.js)
         ↓
UI 渲染 (ui-display.js)
         ↓
玩家输入 (readline)
         ↓
写回流
```

`battleState` 对象贯穿整个管道，随着对战进行而不断更新。

## AI 配置

### PokéChamp AI 配置（推荐）⭐

**环境变量配置（使用 .env 文件）：**

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 编辑 .env 文件，填写以下内容：
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
POKECHAMP_LLM_BACKEND=deepseek/deepseek-chat-v3.1:free  # 可选，这是默认值
```

**特性：**
- 需要 `OPENROUTER_API_KEY` 环境变量（获取免费 API key: https://openrouter.ai/keys）
- 默认使用完全**免费**的 `deepseek/deepseek-chat-v3.1:free` 模型
- 支持多种免费模型（Llama、Gemma）和付费模型（GPT-4o、Claude）
- 如果未设置 API key，自动降级到 Master AI
- Minimax 树搜索（K=2）+ LLM 评估
- 84% 胜率（vs 规则类 AI）
- 详见 `docs/POKECHAMP_AI_GUIDE.md` 了解完整配置

### DeepSeek AI 配置

- 需要 `DEEPSEEK_API_KEY` 环境变量
- 如果 API 失败或未设置密钥，则降级到智能 AI
- 详见 `docs/DEEPSEEK-AI.md` 了解详细设置
- 配置有关于宝可梦对战策略的系统提示词
- 维护 3 轮对话历史以保持上下文

## 常见开发任务

### 添加新的消息处理器
1. 在 `message-handler.js` 的 `handleMessage()` 分派器中添加 case
2. 创建 `handle[MessageType]()` 方法
3. 解析管道分隔的部分：`const parts = line.split('|')`
4. 相应地更新 `battleState`
5. 通过 `this.translate()` 显示中文输出

### 修复战斗逻辑错误
- 从理解 `pve-battle.js` 中的消息流开始
- 检查 `message-handler.js` 中的正确消息解析
- 验证 `battle-state.js` 中的状态更新
- 测试 `ui-display.js` 中的 UI 显示

### 测试 AI 行为
- 使用随机 AI 进行快速调试
- 使用智能 AI 进行可预测的测试用例
- 使用 Master AI 测试更复杂的策略
- PokéChamp AI 需要 `OPENROUTER_API_KEY`；可使用免费的 DeepSeek 模型测试
- DeepSeek AI 需要 `DEEPSEEK_API_KEY`；先使用本地 AI 测试

### 处理翻译
- 编辑 `data/translations-cn.json` 添加新翻译
- 使用 `translator.translate(name, type)`，type 为：'pokemon'、'moves'、'abilities'、'items'、'types'、'status'
- 使用 `npm run build` 重建

## TypeScript 编译

- **配置：** tsconfig.json
- **目标：** ES2020、CommonJS 模块
- **严格模式：** 启用
- **输出：** dist/ 目录
- **源代码映射：** 为调试生成
- **排除：** node_modules、tests

## 关键依赖

### Node.js 依赖
- **pokemon-showdown**：战斗模拟器和宝可梦数据库
- **axios**：HTTP 客户端（用于 DeepSeek API 调用）
- **readline**：Node.js 模块，用于 CLI 输入/输出
- **@types/node**：TypeScript 类型定义
- **dotenv**：环境变量加载（用于 .env 文件）

### Python 依赖（PokéChamp AI）
- **pokechamp**：PokéChamp AI 库（位于 pokechamp-ai/ 子目录）
- **poke-env**：Pokemon Showdown 的 Python 接口
- **openai**：OpenAI/OpenRouter API 客户端
- 详细依赖见 `pokechamp-ai/pyproject.toml` 或 `pokechamp-ai/requirements.txt`

## 最近的更改和已知问题

### PokéChamp AI 集成（最新）⭐
- **新增 PokéChamp AI**：集成了 ICML 2025 获奖的高级对战 AI
- **环境变量配置**：改用 `.env` 文件配置（`OPENROUTER_API_KEY`、`POKECHAMP_LLM_BACKEND`）
- **免费 LLM 支持**：默认使用免费的 `deepseek/deepseek-chat-v3.1:free` 模型
- **Python 子进程**：通过 `pokechamp-service.py` 运行 PokéChamp LLMPlayer
- **进程间通信**：使用 JSON 格式在 Node.js 和 Python 之间通信
- 详见 `docs/POKECHAMP_AI_GUIDE.md` 了解完整文档

### 请求处理机制修复
最近的修复改进了请求处理机制：
- **teamPreview**：收到后立即发送队伍顺序
- **forceSwitch**：保存请求并注册 `process.nextTick()` 延迟处理回调，在 `|turn|` 消息后立即处理，或如果没有 `|turn|` 消息（刚上场就倒下）则由延迟回调处理
- **active**：保存请求，等待 `|turn|` 消息到达后处理
- 这样确保所有消息都显示完毕后，才显示选择菜单
- 解决了 request 消息提前到达导致的显示格式混乱问题
- 解决了刚上场就倒下导致的卡死问题（有 `process.nextTick()` 作为备用）

请查看 TODO.md 了解当前问题和待办工作。

## 测试入口

- `npm start` - 启动完整对战（推荐），可选择任何 AI 对手
- `npm run battle` - 直接运行对战
- `npm test` - 运行 `tests/test-deepseek.js` 进行 DeepSeek AI 测试
- 使用随机 AI 或智能 AI 测试而无需 API 依赖
- 使用 PokéChamp AI 测试需要在 `.env` 文件中配置 `OPENROUTER_API_KEY`
