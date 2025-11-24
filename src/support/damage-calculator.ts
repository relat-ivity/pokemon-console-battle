/**
 * 宝可梦伤害计算器
 * 提供准确的伤害计算功能，供 AI 调用
 */

import { Dex } from 'pokemon-showdown/dist/sim/dex';
import { Translator } from './translator';

const translator = Translator.getInstance();

interface PokemonStats {
	hp: number;
	atk: number;
	def: number;
	spa: number;
	spd: number;
	spe: number;
}

interface PokemonData {
	species: string;
	level: number;
	nature: string;
	ivs: PokemonStats;
	evs: PokemonStats;
	ability?: string;
	item?: string;
	teraType?: string;
	isTerastallized?: boolean;
	boosts?: Partial<PokemonStats>;
	status?: string;
}

interface BattleConditions {
	weather?: string;
	terrain?: string;
	isReflect?: boolean;
	isLightScreen?: boolean;
	isCriticalHit?: boolean;
}

interface DamageResult {
	minDamage: number;
	maxDamage: number;
	minPercent: number;
	maxPercent: number;
	isOHKO: boolean;
	description: string;
}

interface MoveCalculation {
	moveName: string;
	result: DamageResult;
}

export class DamageCalculator {
	/**
	 * 属性克制关系表
	 */
	private static readonly TYPE_CHART: { [key: string]: { [key: string]: number } } = {
		'Normal': { 'Ghost': 0 },
		'Fire': { 'Grass': 2, 'Ice': 2, 'Bug': 2, 'Steel': 2, 'Fire': 0.5, 'Water': 0.5, 'Rock': 0.5, 'Dragon': 0.5 },
		'Water': { 'Fire': 2, 'Ground': 2, 'Rock': 2, 'Water': 0.5, 'Grass': 0.5, 'Dragon': 0.5 },
		'Grass': { 'Water': 2, 'Ground': 2, 'Rock': 2, 'Fire': 0.5, 'Grass': 0.5, 'Poison': 0.5, 'Flying': 0.5, 'Bug': 0.5, 'Dragon': 0.5, 'Steel': 0.5 },
		'Electric': { 'Water': 2, 'Flying': 2, 'Electric': 0.5, 'Grass': 0.5, 'Dragon': 0.5, 'Ground': 0 },
		'Ice': { 'Grass': 2, 'Ground': 2, 'Flying': 2, 'Dragon': 2, 'Fire': 0.5, 'Water': 0.5, 'Ice': 0.5, 'Steel': 0.5 },
		'Fighting': { 'Normal': 2, 'Ice': 2, 'Rock': 2, 'Dark': 2, 'Steel': 2, 'Poison': 0.5, 'Flying': 0.5, 'Psychic': 0.5, 'Bug': 0.5, 'Fairy': 0.5, 'Ghost': 0 },
		'Poison': { 'Grass': 2, 'Fairy': 2, 'Poison': 0.5, 'Ground': 0.5, 'Rock': 0.5, 'Ghost': 0.5 },
		'Ground': { 'Fire': 2, 'Electric': 2, 'Poison': 2, 'Rock': 2, 'Steel': 2, 'Grass': 0.5, 'Bug': 0.5, 'Flying': 0 },
		'Flying': { 'Grass': 2, 'Fighting': 2, 'Bug': 2, 'Electric': 0.5, 'Rock': 0.5, 'Steel': 0.5 },
		'Psychic': { 'Fighting': 2, 'Poison': 2, 'Psychic': 0.5, 'Steel': 0.5, 'Dark': 0 },
		'Bug': { 'Grass': 2, 'Psychic': 2, 'Dark': 2, 'Fire': 0.5, 'Fighting': 0.5, 'Poison': 0.5, 'Flying': 0.5, 'Ghost': 0.5, 'Steel': 0.5, 'Fairy': 0.5 },
		'Rock': { 'Fire': 2, 'Ice': 2, 'Flying': 2, 'Bug': 2, 'Fighting': 0.5, 'Ground': 0.5, 'Steel': 0.5 },
		'Ghost': { 'Psychic': 2, 'Ghost': 2, 'Dark': 0.5, 'Normal': 0 },
		'Dragon': { 'Dragon': 2, 'Steel': 0.5, 'Fairy': 0 },
		'Dark': { 'Psychic': 2, 'Ghost': 2, 'Fighting': 0.5, 'Dark': 0.5, 'Fairy': 0.5 },
		'Steel': { 'Ice': 2, 'Rock': 2, 'Fairy': 2, 'Fire': 0.5, 'Water': 0.5, 'Electric': 0.5, 'Steel': 0.5 },
		'Fairy': { 'Fighting': 2, 'Dragon': 2, 'Dark': 2, 'Poison': 0.5, 'Steel': 0.5 }
	};

	/**
	 * 性格修正表
	 */
	private static readonly NATURE_MODIFIERS: { [key: string]: { plus?: keyof PokemonStats; minus?: keyof PokemonStats } } = {
		'adamant': { plus: 'atk', minus: 'spa' },
		'lonely': { plus: 'atk', minus: 'def' },
		'brave': { plus: 'atk', minus: 'spe' },
		'naughty': { plus: 'atk', minus: 'spd' },
		'bold': { plus: 'def', minus: 'atk' },
		'relaxed': { plus: 'def', minus: 'spe' },
		'impish': { plus: 'def', minus: 'spa' },
		'lax': { plus: 'def', minus: 'spd' },
		'timid': { plus: 'spe', minus: 'atk' },
		'hasty': { plus: 'spe', minus: 'def' },
		'jolly': { plus: 'spe', minus: 'spa' },
		'naive': { plus: 'spe', minus: 'spd' },
		'modest': { plus: 'spa', minus: 'atk' },
		'mild': { plus: 'spa', minus: 'def' },
		'quiet': { plus: 'spa', minus: 'spe' },
		'rash': { plus: 'spa', minus: 'spd' },
		'calm': { plus: 'spd', minus: 'atk' },
		'gentle': { plus: 'spd', minus: 'def' },
		'sassy': { plus: 'spd', minus: 'spe' },
		'careful': { plus: 'spd', minus: 'spa' },
		'hardy': {},
		'docile': {},
		'serious': {},
		'bashful': {},
		'quirky': {}
	};

	/**
	 * 计算能力值
	 */
	private static calculateStat(
		baseStat: number,
		level: number,
		iv: number,
		ev: number,
		nature: string,
		statName: keyof PokemonStats
	): number {
		if (statName === 'hp') {
			// HP 计算公式
			return Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100 + level + 10);
		} else {
			// 其他能力值计算公式
			let stat = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100 + 5);

			// 性格修正
			const natureMod = this.NATURE_MODIFIERS[nature.toLowerCase()];
			if (natureMod) {
				if (natureMod.plus === statName) {
					stat = Math.floor(stat * 1.1);
				} else if (natureMod.minus === statName) {
					stat = Math.floor(stat * 0.9);
				}
			}

			return stat;
		}
	}

	/**
	 * 计算所有能力值
	 */
	private static calculateStats(pokemon: PokemonData): PokemonStats {
		const speciesData = Dex.species.get(pokemon.species);
		const baseStats = speciesData.baseStats;

		return {
			hp: this.calculateStat(baseStats.hp, pokemon.level, pokemon.ivs.hp, pokemon.evs.hp, pokemon.nature, 'hp'),
			atk: this.calculateStat(baseStats.atk, pokemon.level, pokemon.ivs.atk, pokemon.evs.atk, pokemon.nature, 'atk'),
			def: this.calculateStat(baseStats.def, pokemon.level, pokemon.ivs.def, pokemon.evs.def, pokemon.nature, 'def'),
			spa: this.calculateStat(baseStats.spa, pokemon.level, pokemon.ivs.spa, pokemon.evs.spa, pokemon.nature, 'spa'),
			spd: this.calculateStat(baseStats.spd, pokemon.level, pokemon.ivs.spd, pokemon.evs.spd, pokemon.nature, 'spd'),
			spe: this.calculateStat(baseStats.spe, pokemon.level, pokemon.ivs.spe, pokemon.evs.spe, pokemon.nature, 'spe')
		};
	}

	/**
	 * 应用能力变化（boost）
	 */
	private static applyBoosts(stat: number, boost: number): number {
		if (boost === 0) return stat;

		const multiplier = boost > 0
			? (2 + boost) / 2
			: 2 / (2 - boost);

		return Math.floor(stat * multiplier);
	}

	/**
	 * 计算属性克制倍率（支持双属性）
	 */
	private static getTypeEffectiveness(attackType: string, defenderTypes: string[]): number {
		let effectiveness = 1;

		for (const defType of defenderTypes) {
			const typeChart = this.TYPE_CHART[attackType];
			if (typeChart && typeChart[defType] !== undefined) {
				effectiveness *= typeChart[defType];
			}
			// 如果表中没有，默认为1倍
		}

		return effectiveness;
	}

	/**
	 * 计算招式伤害
	 */
	static calculateDamage(
		attacker: PokemonData,
		defender: PokemonData,
		moveName: string,
		conditions: BattleConditions = {}
	): DamageResult {
		const moveData = Dex.moves.get(moveName);
		const attackerSpecies = Dex.species.get(attacker.species);
		const defenderSpecies = Dex.species.get(defender.species);

		// 如果招式没有威力，返回0伤害
		if (!moveData.basePower || moveData.basePower === 0) {
			return {
				minDamage: 0,
				maxDamage: 0,
				minPercent: 0,
				maxPercent: 0,
				isOHKO: false,
				description: `${moveName} 变化招式`
			};
		}

		// 计算能力值
		const attackerStats = this.calculateStats(attacker);
		const defenderStats = this.calculateStats(defender);

		// 判断物理还是特殊
		const isPhysical = moveData.category === 'Physical';
		const attackStat = isPhysical ? 'atk' : 'spa';
		const defenseStat = isPhysical ? 'def' : 'spd';

		// 获取攻击和防御值
		let attack = attackerStats[attackStat];
		let defense = defenderStats[defenseStat];

		// 应用能力变化
		if (attacker.boosts && attacker.boosts[attackStat]) {
			attack = this.applyBoosts(attack, attacker.boosts[attackStat]!);
		}
		if (defender.boosts && defender.boosts[defenseStat]) {
			defense = this.applyBoosts(defense, defender.boosts[defenseStat]!);
		}

		// 基础伤害计算
		const level = attacker.level;
		const power = moveData.basePower;
		const baseDamage = Math.floor(((2 * level / 5 + 2) * power * attack / defense) / 50 + 2);

		// 计算修正值
		let modifier = 1;

		// STAB（属性一致加成）
		let attackerTypes = attackerSpecies.types;

		// 如果太晶化了，属性变为太晶属性
		if (attacker.isTerastallized && attacker.teraType) {
			attackerTypes = [attacker.teraType];
		}

		const hasSTAB = attackerTypes.includes(moveData.type);
		if (hasSTAB) {
			// 如果太晶化且属性一致，STAB是2.0；否则是1.5
			modifier *= (attacker.isTerastallized && attacker.teraType === moveData.type) ? 2.0 : 1.5;
		} else if (attacker.isTerastallized) {
			// 太晶化但属性不一致，仍然有1.5倍加成
			modifier *= 1.5;
		}

		// 属性克制
		let defenderTypes = defenderSpecies.types;

		// 如果防守方太晶化了，属性变为太晶属性
		if (defender.isTerastallized && defender.teraType) {
			defenderTypes = [defender.teraType];
		}

		let typeEffectiveness = this.getTypeEffectiveness(moveData.type, defenderTypes);

		// 气球道具使地面招式无效
		const defenderItem = defender.item ? defender.item.toLowerCase().replace(/\s+/g, '') : '';
		if (defenderItem === 'airballoon' && moveData.type === 'Ground') {
			typeEffectiveness = 0;
		}

		modifier *= typeEffectiveness;

		// 天气加成
		if (conditions.weather) {
			const weather = conditions.weather.toLowerCase();
			if (weather === 'sunnyday' || weather === 'desolateland') {
				if (moveData.type === 'Fire') modifier *= 1.5;
				if (moveData.type === 'Water') modifier *= 0.5;
			} else if (weather === 'raindance' || weather === 'primordialsea') {
				if (moveData.type === 'Water') modifier *= 1.5;
				if (moveData.type === 'Fire') modifier *= 0.5;
			}
		}

		// 场地加成
		if (conditions.terrain) {
			const terrain = conditions.terrain.toLowerCase().replace(/\s+/g, '');
			if (terrain === 'electricterrain' && moveData.type === 'Electric') modifier *= 1.3;
			if (terrain === 'grassyterrain' && moveData.type === 'Grass') modifier *= 1.3;
			if (terrain === 'psychicterrain' && moveData.type === 'Psychic') modifier *= 1.3;
			if (terrain === 'mistyterrain' && moveData.type === 'Dragon') modifier *= 0.5;
		}

		// 光墙/反射壁
		if (conditions.isReflect && isPhysical) {
			modifier *= 0.5;
		}
		if (conditions.isLightScreen && !isPhysical) {
			modifier *= 0.5;
		}

		// 会心一击
		if (conditions.isCriticalHit) {
			modifier *= 1.5;
		}

		// 烧伤状态会降低物理攻击
		if (attacker.status === 'brn' && isPhysical) {
			modifier *= 0.5;
		}

		// 计算最小和最大伤害（随机数 0.85 ~ 1.0）
		const minDamage = Math.floor(baseDamage * modifier * 0.85);
		const maxDamage = Math.floor(baseDamage * modifier * 1.0);

		// 计算伤害百分比
		const defenderHP = defenderStats.hp;
		const minPercent = (minDamage / defenderHP) * 100;
		const maxPercent = (maxDamage / defenderHP) * 100;

		// 判断是否一击必杀
		const isOHKO = minDamage >= defenderHP;

		// 生成描述
		let description = `${translator.translate(moveName, "moves")} 对 ${translator.translate(defender.species, "pokemon")} 造成 ${minDamage}-${maxDamage} 伤害 (${minPercent.toFixed(1)}%-${maxPercent.toFixed(1)}%)`;
		if (isOHKO) {
			description += ' [一击必杀!]';
		}

		return {
			minDamage,
			maxDamage,
			minPercent,
			maxPercent,
			isOHKO,
			description
		};
	}

	/**
	 * 计算攻击方所有招式对防守方的伤害
	 */
	static calculateAllMoves(
		attacker: PokemonData,
		defender: PokemonData,
		moves: string[],
		conditions: BattleConditions = {}
	): MoveCalculation[] {
		return moves.map(moveName => ({
			moveName,
			result: this.calculateDamage(attacker, defender, moveName, conditions)
		}));
	}

	/**
	 * 格式化伤害计算结果为文本（供 AI 调用）
	 */
	static formatCalculationResults(calculations: MoveCalculation[]): string {
		let output = '【伤害计算结果】\n';

		calculations.forEach((calc, index) => {
			output += `${index + 1}. ${calc.result.description}\n`;
		});

		return output;
	}
}
