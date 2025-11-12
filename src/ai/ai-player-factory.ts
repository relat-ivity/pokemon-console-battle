/**
 * AI 玩家工厂类
 */

import { SmartAIPlayer } from './ai-player/smart-ai-player';
import { DeepSeekAIPlayer } from './ai-player/deepseek-ai-player';
import { RandomAIPlayer } from './ai-player/random-ai-player';
import { MasterAIPlayer } from './ai-player/master-ai-player';
import { PokéChampAIPlayer } from './ai-player/pokechamp-ai-player';
import { AIPlayer } from './ai-player';

export enum AIType {
	SMART = 1,
	RANDOM = 2,
	DEEPSEEK = 3,
	MASTER = 4,
	POKECHAMP = 5
}

export const AI_CONFIG = {
	smart_ai: { id: AIType.SMART, name: 'Smart AI Player' },
	random_ai: { id: AIType.RANDOM, name: 'Random AI Player' },
	deepseek_ai: { id: AIType.DEEPSEEK, name: 'DeepSeek AI Player' },
	master_ai: { id: AIType.MASTER, name: 'Master AI Player' },
	pokechamp_ai: { id: AIType.POKECHAMP, name: 'PokéChamp AI Player (最强)' }
} as const;

/**
* AI 玩家工厂类
*/
export class AIPlayerFactory {
	/**
	 * 获取默认 AI (智能AI)
	 */
	static getDefaultAI(playerStream: any, debug: boolean = false): AIPlayer {
		return new SmartAIPlayer(playerStream, debug);
	}

	/**
	 * 获取 Master AI
	 */
	static getMasterAI(playerStream: any, debug: boolean = false): AIPlayer {
		return new MasterAIPlayer(playerStream, debug);
	}

	/**
	 * 显示所有可用的 AI
	 */
	static displayAllAI(): void {
		console.log('\n可用的 AI 类型:');
		Object.entries(AI_CONFIG).forEach(([type, config], index) => {
			console.log(`    ${index + 1}. ${config.name}`);
		});
	}

	/**
	 * 创建 AI 实例
	 * @param type AI类型
	 * @param playerStream 玩家流
	 * @param debug 是否开启调试
	 * @param opponentTeamData 对手队伍数据（仅DeepSeek AI使用）
	 * @param lang 语言（仅DeepSeek AI使用）
	 */
	static createAI(
		type: string,
		playerStream: any,
		debug: boolean = false,
		opponentTeamData: any[] | null = null,
	): AIPlayer {
		const config = AI_CONFIG[type as keyof typeof AI_CONFIG];
		if (!config) {
			throw new Error(`未知的 AI 类型: ${type}`);
		}

		// DeepSeek AI 特殊处理：如果没有API key，降级到智能AI
		if (type === 'deepseek_ai' && !process.env.DEEPSEEK_API_KEY) {
			console.log('⚠ 未设置 DEEPSEEK_API_KEY，使用 SmartAI');
			return this.getDefaultAI(playerStream, debug);
		}

		// PokéChamp AI 特殊处理：初始化时检查API key，如果没有则降级到 Master AI
		if (type === 'pokechamp_ai') {
			const llmBackend = process.env.POKECHAMP_LLM_BACKEND || 'deepseek';
			const requiresDeepSeekDirect = llmBackend === 'deepseek';
			const requiresOpenAI = llmBackend.startsWith('gpt');
			const requiresGemini = llmBackend.startsWith('gemini');
			const requiresOpenRouter = (llmBackend.startsWith('deepseek') && llmBackend !== 'deepseek') ||
			                            llmBackend.startsWith('openai/') ||
			                            llmBackend.startsWith('anthropic/') ||
			                            llmBackend.startsWith('meta/') ||
			                            llmBackend.startsWith('mistral/') ||
			                            llmBackend.startsWith('cohere/');

			let missingKey = null;
			if (requiresDeepSeekDirect && !process.env.DEEPSEEK_API_KEY) {
				missingKey = 'DEEPSEEK_API_KEY';
			} else if (requiresOpenAI && !process.env.OPENAI_API_KEY) {
				missingKey = 'OPENAI_API_KEY';
			} else if (requiresGemini && !process.env.GEMINI_API_KEY) {
				missingKey = 'GEMINI_API_KEY';
			} else if (requiresOpenRouter && !process.env.OPENROUTER_API_KEY) {
				missingKey = 'OPENROUTER_API_KEY';
			}

			if (missingKey) {
				console.log(`⚠ ${llmBackend} 需要 ${missingKey}，降级到 Master AI`);
				return this.getMasterAI(playerStream, debug);
			}
		}

		try {
			let ai: AIPlayer;
			switch (type) {
				case 'smart_ai':
					ai = new SmartAIPlayer(playerStream, debug);
					break;
				case 'random_ai':
					ai = new RandomAIPlayer(playerStream, {}, debug);
					break;
				case 'deepseek_ai':
					ai = new DeepSeekAIPlayer(playerStream, opponentTeamData, debug);
					break;
				case 'master_ai':
					ai = new MasterAIPlayer(playerStream, debug);
					break;
				case 'pokechamp_ai':
					// Support configurable LLM backend via environment variable
					// Default: deepseek (cheapest and fastest)
					// Options: deepseek, gpt-4o, gpt-4o-mini, gemini-2.5-flash, deepseek-ai/deepseek-llm-67b-chat, ollama/llama3.1:8b, etc.
					const llmBackend = process.env.POKECHAMP_LLM_BACKEND || 'deepseek';
					ai = new PokéChampAIPlayer(playerStream, llmBackend, debug);
					break;
				default:
					throw new Error(`未实现的 AI 类型: ${type}`);
			}

			return ai;
		} catch (error) {
			// 如果创建失败且不是智能AI，降级到智能AI
			if (type !== 'smart_ai') {
				console.log(`⚠ ${config.name} 创建失败，使用 SmartAI`);
				return this.getDefaultAI(playerStream, debug);
			}
			throw error;
		}
	}
}

