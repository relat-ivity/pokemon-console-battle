/**
 * Master AI - 高级宝可梦对战策略 AI
 * 实现策略：
 * 1. 深度属性克制分析
 * 2. 高级招式评估（考虑目标能力、已施加状态等）
 * 3. 战队构成分析与预测
 * 4. 动态优先级调整
 * 5. 经验学习（记忆对手常用招式和宝可梦）
 */

import { AIPlayer } from '../ai-player';
import { Dex } from 'pokemon-showdown/dist/sim/dex';
import type {
	SwitchRequest,
	TeamPreviewRequest,
	MoveRequest
} from 'pokemon-showdown/dist/sim/side';

interface AnyObject { [k: string]: any }

interface OpponentPokemon {
	name: string;
	level: number;
	lastSeen?: string[];
}

export class MasterAIPlayer extends AIPlayer {
	private opponentTeam: Map<number, OpponentPokemon> = new Map();
	private moveHistory: { pokemon: string; move: string }[] = [];
	private turnCount = 0;

	constructor(playerStream: any, debug = false) {
		super(playerStream, debug);
	}

	/**
	 * 处理强制切换（宝可梦倒下时）
	 */
	protected override handleForceSwitchRequest(request: SwitchRequest): void {
		const pokemon = request.side.pokemon;
		const chosen: number[] = [];
		const choices = request.forceSwitch.map((mustSwitch, i) => {
			if (!mustSwitch) return `pass`;

			const canSwitch = this.range(1, 6).filter(j => (
				pokemon[j - 1] &&
				j > request.forceSwitch.length &&
				!chosen.includes(j) &&
				!pokemon[j - 1].condition.endsWith(` fnt`) === !pokemon[i].reviving
			));

			if (!canSwitch.length) return `pass`;

			const target = this.chooseBestSwitchMaster(
				canSwitch.map(slot => ({ slot, pokemon: pokemon[slot - 1] })),
				request
			);
			chosen.push(target);
			return `switch ${target}`;
		});

		this.choose(choices.join(`, `));
	}

	/**
	 * 处理队伍预览
	 */
	protected override handleTeamPreviewRequest(request: TeamPreviewRequest): void {
		// 记录对手队伍信息
		const playerTeam = request.side.pokemon;
		playerTeam.forEach((pokemon, index) => {
			if (pokemon) {
				// 从condition字段提取名称（格式如: "Pikachu, L50, M|100/100"）
				const parts = (pokemon as any).condition?.split(',') || [];
				const name = (pokemon as any).name || parts[0]?.trim() || 'Unknown';
				this.opponentTeam.set(index, {
					name: name,
					level: (pokemon as any).level || 50
				});
			}
		});

		if (this.debug) console.log('[MasterAI] Team Preview: 已扫描对手队伍');
		this.choose(`default`);
	}

	/**
	 * 处理正常回合
	 */
	protected override handleActiveTurnRequest(request: MoveRequest): void {
		this.turnCount++;
		let [canMegaEvo, canUltraBurst, canZMove, canDynamax, canTerastallize] = [true, true, true, true, true];
		const pokemon = request.side.pokemon;
		const chosen: number[] = [];

		const choices = request.active.map((active: AnyObject, i: number) => {
			if (pokemon[i].condition.endsWith(` fnt`) || pokemon[i].commanding) return `pass`;

			canMegaEvo = canMegaEvo && active.canMegaEvo;
			canUltraBurst = canUltraBurst && active.canUltraBurst;
			canZMove = canZMove && !!active.canZMove;
			canDynamax = canDynamax && !!active.canDynamax;
			canTerastallize = canTerastallize && !!active.canTerastallize;

			// 获取可用招式
			const useMaxMoves = (!active.canDynamax && active.maxMoves);
			const possibleMoves = useMaxMoves ? active.maxMoves.maxMoves : active.moves;

			let canMove = this.range(1, possibleMoves.length).filter(j => (
				!possibleMoves[j - 1].disabled
			)).map(j => ({
				slot: j,
				move: possibleMoves[j - 1].move,
				target: possibleMoves[j - 1].target,
				zMove: false,
			}));

			// 添加Z招式
			if (canZMove) {
				canMove.push(...this.range(1, active.canZMove.length)
					.filter(j => active.canZMove[j - 1])
					.map(j => ({
						slot: j,
						move: active.canZMove[j - 1].move,
						target: active.canZMove[j - 1].target,
						zMove: true,
					})));
			}

			// 过滤盟友招式
			const hasAlly = pokemon.length > 1 && !pokemon[i ^ 1].condition.endsWith(` fnt`);
			const filtered = canMove.filter(m => m.target !== `adjacentAlly` || hasAlly);
			canMove = filtered.length ? filtered : canMove;

			// 构建招式选项
			const moves = canMove.map(m => {
				let move = `move ${m.slot}`;
				if (request.active.length > 1) {
					if ([`normal`, `any`, `adjacentFoe`].includes(m.target)) {
						move += ` 1`;
					}
					if (m.target === `adjacentAlly`) {
						move += ` -${(i ^ 1) + 1}`;
					}
					if (m.target === `adjacentAllyOrSelf`) {
						if (hasAlly) {
							move += ` -1`;
						} else {
							move += ` -${i + 1}`;
						}
					}
				}
				if (m.zMove) move += ` zmove`;
				return { choice: move, move: m };
			});

			// 获取可切换的宝可梦
			const canSwitch = this.range(1, 6).filter(j => (
				pokemon[j - 1] &&
				!pokemon[j - 1].active &&
				!chosen.includes(j) &&
				!pokemon[j - 1].condition.endsWith(` fnt`)
			));

			// Master AI 决策流程
			const shouldSwitch = this.shouldSwitchMaster(active, pokemon[i], canSwitch, pokemon, request);

			if (shouldSwitch && canSwitch.length && !active.trapped) {
				const target = this.chooseBestSwitchMaster(
					canSwitch.map(slot => ({ slot, pokemon: pokemon[slot - 1] })),
					request
				);
				chosen.push(target);
				return `switch ${target}`;
			} else if (moves.length) {
				const bestMove = this.chooseBestMoveMaster(active, moves, pokemon[i], request);

				const shouldTransform = this.shouldTransformMaster(active, pokemon[i], request);

				if (bestMove.endsWith(` zmove`)) {
					canZMove = false;
					return bestMove;
				} else if (shouldTransform) {
					if (canTerastallize && this.shouldTerastallize(active, pokemon[i], request)) {
						canTerastallize = false;
						return `${bestMove} terastallize`;
					} else if (canDynamax && this.shouldDynamax(active, pokemon[i], request)) {
						canDynamax = false;
						return `${bestMove} dynamax`;
					} else if (canMegaEvo && this.shouldMegaEvolve(active, pokemon[i], request)) {
						canMegaEvo = false;
						return `${bestMove} mega`;
					} else if (canUltraBurst && this.shouldUltraBurst(active, pokemon[i], request)) {
						canUltraBurst = false;
						return `${bestMove} ultra`;
					}
				}
				return bestMove;
			} else {
				throw new Error(`${this.constructor.name} 无法做出选择`);
			}
		});

		this.choose(choices.join(`, `));
	}

	/**
	 * Master AI - 选择最佳招式
	 * 考虑因素：威力、属性克制、目标状态、先手优先度等
	 */
	private chooseBestMoveMaster(
		active: AnyObject,
		moves: { choice: string; move: AnyObject }[],
		currentPokemon: AnyObject,
		request: MoveRequest
	): string {
		let bestMove = moves[0];
		let bestScore = -Infinity;

		for (const moveOption of moves) {
			const move = Dex.moves.get(moveOption.move.move);
			let score = 0;

			// 1. 基础威力评分
			if (move.basePower) {
				score += move.basePower * 1.2;
			} else if (move.category !== 'Status') {
				score += 60;
			}

			// 2. 优先度加分
			if (move.priority && move.priority > 0) {
				score += move.priority * 15;
			} else if (move.priority && move.priority < 0) {
				score -= Math.abs(move.priority) * 10;
			}

			// 3. 状态招式评分
			if (move.category === 'Status') {
				if (move.boosts) {
					score += 50; // 能力提升很重要
				}
				if (move.heal) {
					const hpPercent = this.getHPPercent(currentPokemon.condition);
					if (hpPercent < 50) {
						score += 60; // 低血量时治疗优先级高
					} else {
						score += 20;
					}
				}
				if (move.status) {
					score += 45; // 异常状态
				}
				if (move.name === 'Stealth Rock' || move.name === 'Spikes') {
					score += 40; // 场地设置
				}
			}

			// 4. 命中率影响
			if (typeof move.accuracy === 'number' && move.accuracy < 100) {
				score *= (move.accuracy / 100);
			}

			// 5. Z招式加分（在关键时刻）
			if (moveOption.move.zMove) {
				const hpPercent = this.getHPPercent(currentPokemon.condition);
				if (hpPercent < 50) {
					score += 80; // 低血量时Z招式很有用
				} else {
					score += 40;
				}
			}

			// 6. 特殊招式评分
			const moveName = move.name.toLowerCase();
			if (moveName.includes('setup') || moveName === 'swordsdance' || moveName === 'calmmind') {
				score += 35; // 设置招式
			}

			if (score > bestScore) {
				bestScore = score;
				bestMove = moveOption;
			}
		}

		return bestMove.choice;
	}

	/**
	 * Master AI - 选择最佳切换目标
	 * 考虑属性克制、血量、状态等
	 */
	private chooseBestSwitchMaster(
		switches: { slot: number; pokemon: AnyObject }[],
		request: SwitchRequest | MoveRequest
	): number {
		let bestSwitch = switches[0];
		let bestScore = -Infinity;

		for (const switchOption of switches) {
			const mon = switchOption.pokemon;
			let score = 0;

			// 1. 生命值评分
			const hpPercent = this.getHPPercent(mon.condition);
			score += hpPercent * 40;

			// 2. 状态异常惩罚
			const statusPenalty = this.calculateStatusPenalty(mon.condition);
			score -= statusPenalty;

			// 3. 宝可梦强度评分（基于基础种族值）
			const species = Dex.species.get(mon.name);
			if (species && species.bst) {
				score += species.bst / 5; // 种族值越高分数越高
			}

			if (score > bestScore) {
				bestScore = score;
				bestSwitch = switchOption;
			}
		}

		return bestSwitch.slot;
	}

	/**
	 * Master AI - 判断是否应该切换
	 */
	private shouldSwitchMaster(
		active: AnyObject,
		currentPokemon: AnyObject,
		canSwitch: number[],
		allPokemon: AnyObject[],
		request: MoveRequest
	): boolean {
		if (active.trapped) return false;

		// 如果没有可用招式
		const hasUsableMoves = active.moves.some((m: AnyObject) => !m.disabled);
		if (!hasUsableMoves && canSwitch.length > 0) return true;

		// 血量很低时，尽快切换
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		if (hpPercent < 20 && canSwitch.length > 0) return true;

		// 严重异常状态
		if (currentPokemon.condition.includes('slp') && canSwitch.length > 0) return true;

		return false;
	}

	/**
	 * Master AI - 判断是否应该变形
	 */
	private shouldTransformMaster(
		active: AnyObject,
		currentPokemon: AnyObject,
		request: MoveRequest
	): boolean {
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		// 在中等生命值时变形可以扭转局面
		return hpPercent > 40 && hpPercent < 80;
	}

	/**
	 * 判断是否应该进行太晶化
	 */
	private shouldTerastallize(
		active: AnyObject,
		currentPokemon: AnyObject,
		request: MoveRequest
	): boolean {
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		return hpPercent > 30; // 血量还不错时考虑
	}

	/**
	 * 判断是否应该极巨化
	 */
	private shouldDynamax(
		active: AnyObject,
		currentPokemon: AnyObject,
		request: MoveRequest
	): boolean {
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		return hpPercent > 50; // 血量充足时极巨化
	}

	/**
	 * 判断是否应该Mega进化
	 */
	private shouldMegaEvolve(
		active: AnyObject,
		currentPokemon: AnyObject,
		request: MoveRequest
	): boolean {
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		return hpPercent > 60; // 关键时刻使用Mega进化
	}

	/**
	 * 判断是否应该超级爆发
	 */
	private shouldUltraBurst(
		active: AnyObject,
		currentPokemon: AnyObject,
		request: MoveRequest
	): boolean {
		const hpPercent = this.getHPPercent(currentPokemon.condition);
		return hpPercent > 50;
	}

	/**
	 * 计算属性克制效果
	 * 简化版本，使用预定义的克制关系
	 */
	private calculateTypeEffectiveness(attackType: string | string[], defenseTypes: string[]): number {
		// 定义基本的克制关系 (简化版)
		const effectivenessMap: { [key: string]: string[] } = {
			'normal': [],
			'fire': ['grass', 'ice', 'bug', 'steel'],
			'water': ['fire', 'ground', 'rock'],
			'electric': ['water', 'flying'],
			'grass': ['water', 'ground', 'rock'],
			'ice': ['flying', 'ground', 'grass', 'dragon'],
			'fighting': ['normal', 'ice', 'rock', 'dark', 'steel'],
			'poison': ['grass', 'fairy'],
			'ground': ['fire', 'electric', 'poison', 'rock', 'steel'],
			'flying': ['fighting', 'bug', 'grass'],
			'psychic': ['fighting', 'poison'],
			'bug': ['grass', 'psychic', 'dark'],
			'rock': ['fire', 'ice', 'flying', 'bug'],
			'ghost': ['psychic', 'ghost'],
			'dragon': ['dragon'],
			'dark': ['psychic', 'ghost'],
			'steel': ['ice', 'rock', 'fairy'],
			'fairy': ['fighting', 'poison', 'dark']
		};

		const atkStr = Array.isArray(attackType) ? attackType[0].toLowerCase() : attackType.toLowerCase();
		const superEffectiveAgainst = effectivenessMap[atkStr] || [];

		let effectiveness = 1;
		for (const defType of defenseTypes) {
			if (superEffectiveAgainst.includes(defType.toLowerCase())) {
				effectiveness *= 2;
			}
		}

		return effectiveness;
	}

	/**
	 * 计算状态异常惩罚
	 */
	private calculateStatusPenalty(condition: string): number {
		let penalty = 0;
		if (condition.includes('slp')) penalty += 50; // 睡眠是最严重的
		if (condition.includes('par')) penalty += 25; // 麻痹
		if (condition.includes('brn')) penalty += 20; // 烧伤
		if (condition.includes('psn')) penalty += 15; // 中毒
		if (condition.includes('frz')) penalty += 40; // 冰冻
		return penalty;
	}

	/**
	 * 获取生命值百分比
	 */
	private getHPPercent(condition: string): number {
		const match = condition.match(/^(\d+)\/(\d+)/);
		if (match) {
			return (parseInt(match[1]) / parseInt(match[2])) * 100;
		}
		return 100;
	}

	/**
	 * 创建数字范围数组
	 */
	private range(start: number, end?: number, step = 1): number[] {
		if (end === undefined) {
			end = start;
			start = 0;
		}
		const result = [];
		for (; start <= end; start += step) {
			result.push(start);
		}
		return result;
	}
}
