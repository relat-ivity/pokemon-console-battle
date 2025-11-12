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

### 2. 配置 LLM 密钥

根据选择的 LLM 后端配置环境变量：

```bash
# DeepSeek (推荐，最便宜最快)
export DEEPSEEK_API_KEY="sk-..."

# OpenAI (GPT 系列)
export OPENAI_API_KEY="sk-..."

# Google Gemini
export GEMINI_API_KEY="..."

# OpenRouter (用于 DeepSeek/Anthropic/Meta 等多个提供商)
export OPENROUTER_API_KEY="sk-or-v1-..."
```

### 3. 运行对战

```bash
npm start
# 选择对手时选择 "1. PokéChamp AI"
```

## 支持的 LLM 后端

### 高性能模型（推荐）

| 模型 | 提供商 | 环境变量 | 性能 | 成本 |
|------|--------|---------|------|------|
| DeepSeek | DeepSeek API | DEEPSEEK_API_KEY | ⭐⭐⭐⭐⭐ | 💰 ⭐ |
| GPT-4o | OpenAI | OPENAI_API_KEY | ⭐⭐⭐⭐⭐ | 💰💰💰 |
| GPT-4o-mini | OpenAI | OPENAI_API_KEY | ⭐⭐⭐⭐ | 💰 |
| Gemini-2.5-pro | Google | GEMINI_API_KEY | ⭐⭐⭐⭐⭐ | 💰💰 |
| Gemini-2.5-flash | Google | GEMINI_API_KEY | ⭐⭐⭐⭐ | 💰 |
| Claude-3.5-sonnet | Anthropic | OPENROUTER_API_KEY | ⭐⭐⭐⭐⭐ | 💰💰 |

### 本地模型（免费）

| 模型 | 框架 | 要求 |
|------|------|------|
| Llama 3.1 (70B) | Ollama | 32GB+ VRAM |
| Llama 3.1 (8B) | Ollama | 8GB+ VRAM |
| Mistral | Ollama | 8GB+ VRAM |

## 配置 LLM

### 使用 OpenAI GPT-4o

```python
# 默认配置
LLM_BACKEND = "gpt-4o-mini"  # 推荐用于快速测试
LLM_BACKEND = "gpt-4o"       # 最强性能
```

### 使用 Google Gemini

```python
LLM_BACKEND = "gemini-2.5-pro"    # 最强
LLM_BACKEND = "gemini-2.5-flash"  # 平衡
```

### 使用本地 Llama（通过 Ollama）

```bash
# 安装 Ollama: https://ollama.ai

# 运行模型
ollama run llama2
ollama run mistral

# 在代码中
LLM_BACKEND = "ollama/llama3.1:70b"
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

### 1. "DEEPSEEK_API_KEY not set"

```bash
# 检查密钥是否设置
echo $DEEPSEEK_API_KEY

# 设置密钥
export DEEPSEEK_API_KEY="sk-your-deepseek-api-key"

# 或在 .env 文件中
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 获取 API 密钥
# 访问 https://platform.deepseek.com 注册并获取 API 密钥
```

### 2. "OPENAI_API_KEY not set"

```bash
# 检查密钥是否设置
echo $OPENAI_API_KEY

# 设置密钥
export OPENAI_API_KEY="sk-your-openai-api-key"

# 或在 .env 文件中
OPENAI_API_KEY=sk-your-openai-api-key
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
- 尝试使用 `gpt-4o-mini` 或 `gemini-2.5-flash` 等较快的模型
- 或使用 DeepSeek（最快最便宜）
- 考虑使用本地 Llama 模型

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

PokéChamp AI 支持通过环境变量 `POKECHAMP_LLM_BACKEND` 配置不同的 LLM 模型。

### 使用 DeepSeek 直接 API（推荐）

DeepSeek 是一个高性能、低成本的 LLM，可直接通过官方 API 调用：

```bash
# 首先获取 DeepSeek API 密钥
# 访问 https://platform.deepseek.com 获取 API 密钥

# 然后设置环境变量并运行
export DEEPSEEK_API_KEY="sk-..."
export POKECHAMP_LLM_BACKEND="deepseek"
npm start
```

**优势**：
- 极低成本（价格最便宜）
- 性能接近 GPT-4，超过 GPT-4-turbo
- 低延迟，响应快速
- 直接调用，无中间商

### 使用 DeepSeek（通过 OpenRouter）

也可以通过 OpenRouter 平台使用 DeepSeek：

```bash
# 首先获取 OpenRouter API 密钥
# 访问 https://openrouter.ai 获取免费 API 密钥

# 然后设置环境变量并运行
export OPENROUTER_API_KEY="sk-or-v1-..."
export POKECHAMP_LLM_BACKEND="deepseek-ai/deepseek-llm-67b-chat"
npm start
```

**成本对比**：
- DeepSeek (直接): 极低成本，最便宜 ⭐
- DeepSeek (OpenRouter): 极低成本
- GPT-4o-mini: 低成本，快速
- Gemini-2.5-flash: 低成本，快速

### 使用其他 OpenRouter 模型

OpenRouter 支持多个 LLM 提供商：

```bash
# Meta Llama models
export POKECHAMP_LLM_BACKEND="meta-llama/llama-3.1-70b-instruct"

# Mistral
export POKECHAMP_LLM_BACKEND="mistralai/mistral-7b-instruct"

# Cohere
export POKECHAMP_LLM_BACKEND="cohere/command-r-plus"

# 然后运行
npm start
```

### 使用本地模型（Ollama）

```bash
# 先运行 Ollama
ollama run llama3.1:8b

# 然后
export POKECHAMP_LLM_BACKEND="ollama/llama3.1:8b"
npm start
```

## 常见问题

### Q: PokéChamp 可以离线使用吗？
**A**: 可以，使用本地 Llama 模型或 Ollama。但需要足够的 GPU 内存（建议 32GB+ 用于 70B 模型）。

### Q: 对战中可以切换 LLM 模型吗？
**A**: 不可以。需要重新启动程序。但可以通过修改 `POKECHAMP_LLM_BACKEND` 环境变量来切换模型。

### Q: PokéChamp 支持哪些宝可梦世代？
**A**: 主要支持 Gen 1-4 和 Gen 9（OU 格式）。VGC Doubles 支持还在开发中。

### Q: 如何降低成本？
**A**: 使用 `gpt-4o-mini` 或 `gemini-2.5-flash` 等成本低廉的模型，或者使用本地 Llama。

### Q: 可以和 PokéChamp 进行多人对战吗？
**A**: 当前只支持 1v1。多人对战需要额外开发。

## 许可证

PokéChamp 原项目采用 MIT 许可证。此集成遵循相同许可证。
