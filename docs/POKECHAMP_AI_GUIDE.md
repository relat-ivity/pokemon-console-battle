# PokéChamp AI 集成指南

## 概述

**PokéChamp** 是一个获得 ICML 2025 创新奖的高级宝可梦对战 AI，采用 Minimax 树搜索和大语言模型融合的方法。

- **性能**: 84% 胜率（vs 规则类 AI）/ 76% 胜率（vs LLM 类 AI）
- **Elo 评分**: 1300-1500（Pokemon Showdown 排名）
- **论文**: "PokéChamp: an Expert-level Minimax Language Agent" (ICML 2025)
- **GitHub**: https://github.com/sethkarten/pokechamp

## 架构

```
Node.js 项目
    ↓ (JSON 通信)
pokechamp-service.py (Python 子进程)
    ↓ (API 调用)
LLM 模型 (GPT-4o, Gemini, Llama, 等)
    ↓ (推理)
对战决策
```

### 核心文件

1. **pokechamp-ai-player.ts** - TypeScript 包装器
   - 管理 Python 子进程
   - 处理 JSON 通信
   - 实现 Pokemon Showdown 请求处理

2. **pokechamp-service.py** - Python 服务脚本
   - 初始化 PokéChamp AI
   - 处理对战决策
   - 管理 LLM API 调用

3. **ai-player-factory.ts** - AI 工厂
   - 注册 PokéChamp AI 类型
   - 创建和管理实例

## 使用方法

### 1. 安装依赖

```bash
# 安装 PokéChamp 依赖
cd pokechamp-ai
uv sync
cd ..

# 或使用 pip
pip install -r pokechamp-ai/requirements.txt
```

### 2. 配置环境变量

**推荐方式：使用 .env 文件**

```bash
# 1. 复制 .env.example 为 .env
cp .env.example .env

# 2. 编辑 .env 文件，填写你的 API key
# OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
# POKECHAMP_LLM_BACKEND=deepseek/deepseek-chat-v3.1:free
```

**OpenRouter API Key 配置（必需）**

PokéChamp AI 需要 `OPENROUTER_API_KEY` 环境变量：

```bash
# 方式 1：在 .env 文件中配置（推荐）
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# 方式 2：直接导出环境变量
export OPENROUTER_API_KEY='sk-or-v1-your-api-key-here'
```

获取免费 OpenRouter API Key：
1. 访问 https://openrouter.ai/keys
2. 注册账号（免费）
3. 创建 API key
4. 复制 key 到 .env 文件

**选择 LLM 模型（可选）**

通过 `POKECHAMP_LLM_BACKEND` 环境变量选择模型：

```bash
# 在 .env 文件中配置（推荐）
POKECHAMP_LLM_BACKEND=deepseek/deepseek-chat-v3.1:free  # 默认，免费
```

如果不设置，默认使用免费的 `deepseek/deepseek-chat-v3.1:free` 模型。

### 3. 运行对战

```bash
npm start
# 选择对手时选择 "1. PokéChamp AI"
```

## 支持的 LLM 后端

**所有模型都通过 OpenRouter 访问，只需要一个 `OPENROUTER_API_KEY`**

### 免费模型（推荐）⭐

| 模型标识符 | 性能 | 说明 |
|-----------|------|------|
| `deepseek/deepseek-chat-v3.1:free` | ⭐⭐⭐⭐⭐ | **默认**，性能优秀，完全免费 |
| `meta-llama/llama-3.2-3b-instruct:free` | ⭐⭐⭐⭐ | Meta Llama，免费 |
| `google/gemma-2-9b-it:free` | ⭐⭐⭐⭐ | Google Gemma，免费 |

### 付费模型（高性能）

| 模型标识符 | 性能 | 成本 |
|-----------|------|------|
| `openai/gpt-4o` | ⭐⭐⭐⭐⭐ | 💰💰💰 |
| `openai/gpt-4o-mini` | ⭐⭐⭐⭐ | 💰 |
| `anthropic/claude-3.5-sonnet` | ⭐⭐⭐⭐⭐ | 💰💰 |
| `google/gemini-pro-1.5` | ⭐⭐⭐⭐⭐ | 💰💰 |

更多模型请访问：https://openrouter.ai/models

## 配置 LLM 模型

通过 `.env` 文件或环境变量配置：

### 使用免费的 DeepSeek（默认）⭐

```bash
# 在 .env 文件中（或不配置，使用默认值）
POKECHAMP_LLM_BACKEND=deepseek/deepseek-chat-v3.1:free
```

### 使用其他免费模型

```bash
# Meta Llama 3.2
POKECHAMP_LLM_BACKEND=meta-llama/llama-3.2-3b-instruct:free

# Google Gemma 2
POKECHAMP_LLM_BACKEND=google/gemma-2-9b-it:free
```

### 使用付费高性能模型

```bash
# OpenAI GPT-4o
POKECHAMP_LLM_BACKEND=openai/gpt-4o

# Claude 3.5 Sonnet
POKECHAMP_LLM_BACKEND=anthropic/claude-3.5-sonnet

# Google Gemini Pro
POKECHAMP_LLM_BACKEND=google/gemini-pro-1.5
```

## 性能指标

### 对手难度对比

```
随机 AI          [████░░░░░░] ~20%
本地智能 AI       [████████░░] ~60%
Master AI        [████████░░] ~70%
DeepSeek AI      [█████████░] ~80%
PokéChamp AI     [██████████] ~90%+ ⭐
```

### 对战时间

- **随机 AI**: ~30 秒/回合
- **本地智能 AI**: ~1 秒/回合
- **Master AI**: ~2 秒/回合
- **DeepSeek AI**: ~5-10 秒/回合（API 延迟）
- **PokéChamp AI**: ~10-15 秒/回合（复杂推理）

## API 成本估计

假设每场对战 20 回合：

| 模型 | 成本/回合 | 成本/对战 | 成本/月(100对战) |
|------|---------|---------|-----------------|
| DeepSeek | $0.001 | $0.02 | $2 | ⭐ 最便宜 |
| GPT-4o-mini | $0.02 | $0.40 | $40 |
| Gemini-2.5-flash | $0.01 | $0.20 | $20 |
| GPT-4o | $0.10 | $2.00 | $200 |
| Gemini-2.5-pro | $0.10 | $2.00 | $200 |
| 本地 Llama | $0.00 | $0.00 | $0 | 免费 |

## 故障排除

### 1. "OPENROUTER_API_KEY not set"

这是 PokéChamp AI 所需的必需环境变量。

```bash
# 检查密钥是否设置
echo $OPENROUTER_API_KEY

# 方式 1：在 .env 文件中配置（推荐）
# 编辑 .env 文件，添加：
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here

# 方式 2：直接导出环境变量
export OPENROUTER_API_KEY='sk-or-v1-your-api-key-here'

# 获取免费 API 密钥
# 访问 https://openrouter.ai/keys 注册并获取免费 API 密钥
```

### 2. "DEEPSEEK_API_KEY not set"（仅 DeepSeek AI 对手）

这个错误只在使用 DeepSeek AI 对手时出现，PokéChamp AI 不需要这个环境变量。

```bash
# 如果使用 DeepSeek AI 对手，在 .env 文件中添加：
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 获取 API 密钥
# 访问 https://platform.deepseek.com 注册并获取 API 密钥
```

### 3. Python 模块不找到

```bash
# 确保进入 pokechamp-ai 目录并安装
cd pokechamp-ai
uv sync
cd ..

# 或使用 pip
pip install -r pokechamp-ai/requirements.txt
```

### 4. 对战缓慢或超时

- 检查网络连接
- 确认 LLM API 是否正常
- 尝试使用免费的 `deepseek/deepseek-chat-v3.1:free`（默认，最快）
- 或其他免费模型如 `meta-llama/llama-3.2-3b-instruct:free`

### 5. 决策不佳

- 增加 `temperature` 参数（目前为 0.3）
- 尝试不同的 LLM 模型
- 检查是否有网络延迟导致状态过时

## 高级配置

### 调整 LLM 参数

编辑 `pokechamp-service.py`:

```python
# 温度参数（0.0-1.0）
# 低值 = 更确定性，高值 = 更创意性
temperature=0.3  # 改为 0.1-0.7

# 最大令牌数
max_tokens=2048

# Top-P 采样
top_p=0.9
```

### 自定义提示词

PokéChamp 使用优化的提示词。查看 `pokechamp-ai/pokechamp/prompts.py` 了解详情。

## 与其他 AI 的对比

| 特性 | 随机 AI | 智能 AI | Master AI | DeepSeek | PokéChamp |
|------|---------|---------|-----------|----------|-----------|
| 基础策略 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 属性克制 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 招式评分 | ❌ | ✅ | ✅ | ✅ | ✅ |
| LLM 推理 | ❌ | ❌ | ❌ | ✅ | ✅ |
| Minimax 搜索 | ❌ | ❌ | ❌ | ❌ | ✅ |
| 对手建模 | ❌ | ❌ | ❌ | ✅ | ✅ |
| 性能 | 💤 | 🟡 | 🟠 | 🔴 | 🔥 |

## 参考资源

- **论文**: https://arxiv.org/abs/2503.04094
- **GitHub**: https://github.com/sethkarten/pokechamp
- **官网**: https://sites.google.com/view/pokechamp-llm
- **会议**: ICML 2025 论文集

## 配置不同的 LLM 后端

PokéChamp AI 通过 OpenRouter 统一访问所有 LLM 模型，只需要配置：
1. `OPENROUTER_API_KEY` - OpenRouter API 密钥（必需）
2. `POKECHAMP_LLM_BACKEND` - 模型标识符（可选，默认使用免费的 DeepSeek）

### 快速开始（推荐）⭐

使用免费的 DeepSeek 模型：

```bash
# 1. 在 .env 文件中配置
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
POKECHAMP_LLM_BACKEND=deepseek/deepseek-chat-v3.1:free  # 可选，这是默认值

# 2. 运行对战
npm start
```

**优势**：
- ✅ 完全免费
- ✅ 性能优秀（接近 GPT-4 水平）
- ✅ 低延迟，响应快速
- ✅ 无需信用卡

### 使用其他免费模型

```bash
# 在 .env 文件中配置

# Meta Llama 3.2（免费）
POKECHAMP_LLM_BACKEND=meta-llama/llama-3.2-3b-instruct:free

# Google Gemma 2（免费）
POKECHAMP_LLM_BACKEND=google/gemma-2-9b-it:free
```

### 使用付费高性能模型

```bash
# 在 .env 文件中配置

# OpenAI GPT-4o（最强性能）
POKECHAMP_LLM_BACKEND=openai/gpt-4o

# Anthropic Claude 3.5 Sonnet（推理能力强）
POKECHAMP_LLM_BACKEND=anthropic/claude-3.5-sonnet

# Google Gemini Pro 1.5（多模态支持）
POKECHAMP_LLM_BACKEND=google/gemini-pro-1.5

# OpenAI GPT-4o-mini（性价比高）
POKECHAMP_LLM_BACKEND=openai/gpt-4o-mini
```

### 查看所有可用模型

访问 OpenRouter 模型列表：https://openrouter.ai/models

可以选择任何支持的模型，复制模型 ID 到 `POKECHAMP_LLM_BACKEND` 环境变量即可。

## 常见问题

### Q: PokéChamp AI 需要付费吗？
**A**: 不需要！默认使用完全免费的 `deepseek/deepseek-chat-v3.1:free` 模型。只需要在 OpenRouter 注册一个免费账号获取 API key 即可。

### Q: OpenRouter 是什么？
**A**: OpenRouter 是一个 LLM 聚合平台，提供统一的 API 访问多个 LLM 提供商（OpenAI、Anthropic、Google、Meta 等）。它提供多个免费模型，也支持付费模型。

### Q: 如何获取 OpenRouter API Key？
**A**:
1. 访问 https://openrouter.ai/keys
2. 注册账号（免费）
3. 创建 API key
4. 复制 key 到 `.env` 文件的 `OPENROUTER_API_KEY` 变量

### Q: 对战中可以切换 LLM 模型吗？
**A**: 不可以。需要重新启动程序。修改 `.env` 文件中的 `POKECHAMP_LLM_BACKEND` 变量后，重新运行 `npm start` 即可。

### Q: PokéChamp 支持哪些宝可梦世代？
**A**: 当前配置支持 Gen 9 随机对战（`gen9randombattle`）。原始 PokéChamp 项目还支持 Gen 1-4 和 Gen 9 OU 格式。

### Q: 如何获得最佳性能？
**A**:
- 免费选项：使用默认的 `deepseek/deepseek-chat-v3.1:free`
- 付费选项：使用 `openai/gpt-4o` 或 `anthropic/claude-3.5-sonnet`

### Q: 可以和 PokéChamp 进行多人对战吗？
**A**: 当前只支持 1v1。多人对战需要额外开发。

## 许可证

PokéChamp 原项目采用 MIT 许可证。此集成遵循相同许可证。
