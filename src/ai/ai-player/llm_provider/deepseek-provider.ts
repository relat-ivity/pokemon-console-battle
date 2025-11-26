/**
 * DeepSeek LLM Provider
 * 使用 DeepSeek API 进行智能决策
 */

import axios from 'axios';
import { LLMProvider, LLMResponse } from './llm-provider';

export class DeepSeekProvider extends LLMProvider {
	private readonly apiKey: string;
	private readonly apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
	private readonly model: string = 'deepseek-chat';
	private readonly temperature: number = 0;
	private readonly maxTokens: number = 500;
	private readonly timeout: number = 60000;

	constructor(apiKey?: string, debugMode: boolean = false) {
		super(debugMode);
		this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
	}

	/**
	 * 检查 DeepSeek API 是否可用
	 */
	isAvailable(): boolean {
		return this.apiKey !== '';
	}

	/**
	 * 获取 Provider 名称
	 */
	getName(): string {
		return 'DeepSeek';
	}

	/**
	 * 调用 DeepSeek API
	 */
	async callAPI(prompt: string, systemPrompt: string): Promise<LLMResponse> {
		if (this.debugMode) {
			console.log('CallDeepSeek:', systemPrompt, '\n', prompt);
		}

		if (!this.isAvailable()) {
			return {
				content: '',
				success: false,
				error: 'DeepSeek API key not configured'
			};
		}

		try {
			const messages = this.buildMessages(prompt, systemPrompt);

			const response = await axios.post(
				this.apiUrl,
				{
					model: this.model,
					messages: messages,
					temperature: this.temperature,
					max_tokens: this.maxTokens
				},
				{
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.apiKey}`
					},
					timeout: this.timeout
				}
			);

			const aiResponse = response.data.choices[0].message.content;

			// 保存到对话历史
			this.addToHistory(prompt, aiResponse);

			return {
				content: aiResponse,
				success: true
			};
		} catch (error) {
			if (this.debugMode) {
				console.error('DeepSeek API 调用失败:', error);
			}
			return {
				content: '',
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}
}
