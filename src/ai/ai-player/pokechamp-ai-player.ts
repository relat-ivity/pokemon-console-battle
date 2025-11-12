/**
 * PokéChamp AI Player - 最强的宝可梦对战AI
 * 完全委托给官方 PokéChamp ICML 2025 论文的实现
 *
 * 特性：
 * - Minimax 树搜索 + LLM 辅助决策
 * - 84% 胜率（vs 规则类AI）
 * - 支持多个LLM后端（GPT-4o、Gemini、Llama等）
 * - Elo评分：1300-1500
 *
 * 本实现完全依赖 PokéChamp 的对战逻辑，所有决策均由其 AI 引擎完成
 */

import { AIPlayer } from '../ai-player';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import type {
	SwitchRequest,
	TeamPreviewRequest,
	MoveRequest
} from 'pokemon-showdown/dist/sim/side';

interface AnyObject { [k: string]: any }

export class PokéChampAIPlayer extends AIPlayer {
	private serviceProcess: ChildProcess | null = null;
	private initialized = false;
	private llmBackend: string;
	private responseBuffer: string = '';
	private pendingResponse: ((data: any) => void) | null = null;

	constructor(
		playerStream: any,
		llmBackend: string = 'deepseek',
		debug: boolean = false
	) {
		super(playerStream, debug);
		this.llmBackend = llmBackend;
	}

	/**
	 * 启动 PokéChamp Python 服务
	 */
	private async startService(): Promise<void> {
		if (this.initialized) {
			return;
		}

		return new Promise((resolve, reject) => {
			try {
				const servicePath = path.join(__dirname, '../../..', 'pokechamp-service.py');

				this.serviceProcess = spawn('python3', [servicePath], {
					stdio: ['pipe', 'pipe', 'pipe'],
					cwd: path.join(__dirname, '../../..')
				});

				if (!this.serviceProcess.stdout || !this.serviceProcess.stderr) {
					throw new Error('Failed to create service process');
				}

				// 处理 stdout
				this.serviceProcess.stdout.on('data', (data: Buffer) => {
					this.responseBuffer += data.toString();
					const lines = this.responseBuffer.split('\n');
					this.responseBuffer = lines[lines.length - 1];

					for (let i = 0; i < lines.length - 1; i++) {
						const line = lines[i].trim();
						if (line && this.pendingResponse) {
							try {
								const response = JSON.parse(line);
								this.pendingResponse(response);
								this.pendingResponse = null;
							} catch (e) {
								if (this.debug) console.error('[PokéChamp] JSON parse error:', e);
							}
						}
					}
				});

				// 处理错误输出
				this.serviceProcess.stderr?.on('data', (data: Buffer) => {
					if (this.debug) {
						console.error('[PokéChamp Service Error]', data.toString());
					}
				});

				// 初始化 AI
				this.sendCommand({
					action: 'init',
					backend: this.llmBackend
				}).then((result: any) => {
					if (result.status === 'ok') {
						this.initialized = true;
						if (this.debug) console.log('[PokéChamp] Service initialized with backend:', this.llmBackend);
						resolve();
					} else {
						reject(new Error(`PokéChamp init failed: ${result.message}`));
					}
				}).catch(reject);

			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * 向服务发送命令
	 */
	private sendCommand(command: AnyObject): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.serviceProcess?.stdin) {
				reject(new Error('Service not running'));
				return;
			}

			this.pendingResponse = resolve;

			const timeout = setTimeout(() => {
				this.pendingResponse = null;
				reject(new Error('PokéChamp service timeout'));
			}, 60000); // 60秒超时（考虑到 LLM API 调用延迟）

			this.serviceProcess.stdin.write(JSON.stringify(command) + '\n', (err) => {
				if (err) {
					clearTimeout(timeout);
					reject(err);
				}
			});
		});
	}

	/**
	 * 处理强制切换 - 委托给 PokéChamp AI
	 */
	protected override handleForceSwitchRequest(request: SwitchRequest): void {
		try {
			// 异步初始化服务并发送请求
			this.initializeAndChoose(async () => {
				const result = await this.sendCommand({
					action: 'choose_switch',
					request: request
				});

				if (result.status === 'ok' && result.choice) {
					this.choose(result.choice);
				} else {
					// 失败直接输出错误
					console.error('❌ [PokéChamp] Switch decision failed:', result.message);
				}
			});
		} catch (error) {
			console.error('❌ [PokéChamp] Error in switch request:', error);
		}
	}

	/**
	 * 处理队伍预览 - 委托给 PokéChamp AI
	 */
	protected override handleTeamPreviewRequest(request: TeamPreviewRequest): void {
		try {
			// 异步初始化服务并发送请求
			this.initializeAndChoose(async () => {
				const result = await this.sendCommand({
					action: 'choose_team_preview',
					request: request
				});

				if (result.status === 'ok' && result.choice) {
					this.choose(result.choice);
					if (this.debug) console.log('[PokéChamp] Team Preview chosen:', result.choice);
				} else {
					// 失败直接输出错误
					console.error('❌ [PokéChamp] Team preview decision failed:', result.message);
				}
			});
		} catch (error) {
			console.error('❌ [PokéChamp] Error in team preview request:', error);
		}
	}

	/**
	 * 初始化服务后执行异步操作
	 */
	private async initializeAndChoose(callback: () => Promise<void>): Promise<void> {
		try {
			if (!this.initialized) {
				await this.startService();
			}
			await callback();
		} catch (error) {
			console.error('❌ [PokéChamp] Initialization or execution error:', error);
		}
	}

	/**
	 * 处理正常回合 - 完全委托给 PokéChamp AI 的 Minimax + LLM 引擎
	 */
	protected override async handleActiveTurnRequest(request: MoveRequest): Promise<void> {
		try {
			// 确保服务已启动
			if (!this.initialized) {
				await this.startService();
			}

			// 将整个请求发送给 PokéChamp，让它进行完整的 Minimax 搜索 + LLM 推理
			const result = await this.sendCommand({
				action: 'choose_move',
				request: request
			});

			if (result.status === 'ok' && result.choice) {
				// PokéChamp 的完整 AI 决策
				this.choose(result.choice);
				if (this.debug) console.log('[PokéChamp] AI Decision:', result.choice);
			} else {
				// 失败直接输出错误
				console.error('❌ [PokéChamp] AI decision failed:', result.message);
			}

		} catch (error) {
			console.error('❌ [PokéChamp] Error in move request:', error);
		}
	}

	/**
	 * 清理资源
	 */
	destroy(): void {
		if (this.serviceProcess) {
			this.serviceProcess.kill();
			this.serviceProcess = null;
		}
	}
}
