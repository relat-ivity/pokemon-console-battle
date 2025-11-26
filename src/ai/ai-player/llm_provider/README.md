# LLM Provider 模块

这个模块提供了一个统一的接口来调用不同的 LLM API 提供商。

## 架构

```
LLMProvider (抽象基类)
├── DeepSeekProvider (DeepSeek API)
└── OpenRouterProvider (OpenRouter API，支持多种模型)
```

## 使用方法

### 1. DeepSeek Provider

```typescript
import { DeepSeekProvider } from './llm_provider';

const provider = new DeepSeekProvider(apiKey, debug);

// 检查可用性
if (provider.isAvailable()) {
    const response = await provider.callAPI(prompt, systemPrompt);
    if (response.success) {
        console.log(response.content);
    }
}
```

### 2. OpenRouter Provider

```typescript
import { OpenRouterProvider } from './llm_provider';

// 支持多种模型
const provider = new OpenRouterProvider('anthropic/claude-3.5-sonnet', apiKey, debug);

const response = await provider.callAPI(prompt, systemPrompt);
```

### 3. 在 LLMAIPlayer 中使用

```typescript
import { LLMAIPlayer } from './llm-ai-player';
import { DeepSeekProvider } from './llm_provider';

// 创建 Provider
const provider = new DeepSeekProvider();

// 创建 AI 玩家
const ai = new LLMAIPlayer(playerStream, provider, teamData, opponentTeamData, debug);
```

## 环境变量

- `DEEPSEEK_API_KEY`: DeepSeek API 密钥
- `OPENROUTER_API_KEY`: OpenRouter API 密钥
- `DEEPSEEK_CHEAT_PROBABILITY`: 作弊概率 (0-1)

## 添加新的 LLM Provider

1. 创建新的类继承 `LLMProvider`
2. 实现抽象方法：
   - `callAPI(prompt, systemPrompt)`
   - `isAvailable()`
   - `getName()`
3. 在 `index.ts` 中导出
4. 在 `AIPlayerFactory` 中添加创建方法

## 示例：添加 Anthropic Provider

```typescript
import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider';

export class AnthropicProvider extends LLMProvider {
    private readonly apiKey: string;
    private readonly apiUrl: string = 'https://api.anthropic.com/v1/messages';

    constructor(apiKey?: string, debugMode: boolean = false) {
        super(debugMode);
        this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    }

    isAvailable(): boolean {
        return this.apiKey !== '';
    }

    getName(): string {
        return 'Anthropic';
    }

    async callAPI(prompt: string, systemPrompt: string): Promise<LLMResponse> {
        // 实现 Anthropic API 调用逻辑
        // ...
    }
}
```
