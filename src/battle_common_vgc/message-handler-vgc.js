/**
 * 双打战斗消息处理器
 * 专门用于处理VGC双打对战的消息
 */

const Sim = require('pokemon-showdown');

class DoublesMessageHandler {
	constructor(battleState, translator, debugMode = false) {
		this.state = battleState;
		this.translator = translator;
		this.debugMode = debugMode;
	}

	/**
	 * 解析宝可梦位置标签 (p1a, p1b, p2a, p2b)
	 * @returns {{ isPlayer: boolean, slot: number, player: string }}
	 */
	parsePlayerTag(playerTag) {
		const isPlayer = playerTag.startsWith('p1');
		const slot = playerTag.includes('b:') ? 1 : 0;
		const player = isPlayer ? '【你】' : '【对手】';
		return { isPlayer, slot, player };
	}

	/**
	 * 格式化位置显示
	 * 对手：位置0(p1a,左侧) -> +1, 位置1(p1b,右侧) -> +2
	 * 己方：位置0(p2a,左侧) -> -1, 位置1(p2b,右侧) -> -2
	 */
	formatPosition(slot, isPlayer) {
		return slot === 0 ? '左' : '右';
	}

	/**
	 * 翻译辅助方法
	 */
	translate(text, type) {
		return this.translator.translate(text, type);
	}

	/**
	 * 处理单行消息
	 */
	handleMessage(line) {
		if (this.debugMode) {
			console.log("[Debug] " + line);
		}

		// 战斗初始化
		if (line === '|start') {
			this.state.battleInitialized = true;
			return;
		}

		// 战斗结束
		if (line.startsWith('|win|')) {
			const winner = line.split('|win|')[1];
			this.state.endBattle();
			console.log('\n战斗结束！');
			console.log(`胜者: ${winner}`);
			return;
		}

		if (line === '|tie') {
			this.state.endBattle();
			console.log('\n战斗结束！平局！');
			return;
		}

		// 宝可梦切换
		if (line.startsWith('|switch|')) {
			this.handleSwitch(line);
			return;
		}

		// 强制切换
		if (line.startsWith('|drag|')) {
			this.handleDrag(line);
			return;
		}

		// 招式使用
		if (line.startsWith('|move|')) {
			this.handleMove(line);
			return;
		}

		// 伤害
		if (line.startsWith('|-damage|')) {
			this.handleDamage(line);
			return;
		}

		// 治疗
		if (line.startsWith('|-heal|')) {
			this.handleHeal(line);
			return;
		}

		// 倒下
		if (line.startsWith('|faint|')) {
			this.handleFaint(line);
			return;
		}

		// 能力变化
		if (line.startsWith('|-boost|')) {
			this.handleBoost(line);
			return;
		}

		if (line.startsWith('|-unboost|')) {
			this.handleUnboost(line);
			return;
		}

		// 状态异常
		if (line.startsWith('|-status|')) {
			this.handleStatus(line);
			return;
		}

		if (line.startsWith('|-curestatus|')) {
			this.handleCureStatus(line);
			return;
		}

		// 天气
		if (line.startsWith('|-weather|')) {
			this.handleWeather(line);
			return;
		}

		// 场地效果
		if (line.startsWith('|-fieldstart|')) {
			this.handleFieldStart(line);
			return;
		}

		if (line.startsWith('|-fieldend|')) {
			this.handleFieldEnd(line);
			return;
		}

		// 单方场地效果
		if (line.startsWith('|-sidestart|')) {
			this.handleSideStart(line);
			return;
		}

		if (line.startsWith('|-sideend|')) {
			this.handleSideEnd(line);
			return;
		}

		// 太晶化
		if (line.startsWith('|-terastallize|')) {
			this.handleTerastallize(line);
			return;
		}
	}

	/**
	 * 处理宝可梦切换
	 */
	handleSwitch(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const details = parts[3];
		const hp = parts[4] || '';

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const species = playerTag.split(': ')[1];
		const name = details.split(',')[0];
		const nameCN = this.translate(name, 'pokemon');

		console.log(`\n${player} 派出了 ${nameCN} ${hp ? '(HP: ' + hp + ')' : ''}`);

		if (isPlayer) {
			this.state.player.switchPokemon(slot, species, name, hp, details);
			if (this.debugMode) {
				console.log(`[Debug] 玩家切换: slot=${slot}, name='${name}', species='${species}'`);
			}
		} else {
			this.state.opponent.switchPokemon(slot, species, name, hp, details);
			if (this.debugMode) {
				console.log(`[Debug] 对手切换: slot=${slot}, name='${name}', species='${species}', hp='${hp}'`);
			}
		}
	}

	/**
	 * 处理强制切换
	 */
	handleDrag(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const details = parts[3];
		const hp = parts[4] || '';

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const species = playerTag.split(': ')[1];
		const name = details.split(',')[0];
		const nameCN = this.translate(name, 'pokemon');

		console.log(`\n${player} ${nameCN} 被强制拖入战斗! ${hp ? '(HP: ' + hp + ')' : ''}`);

		if (isPlayer) {
			this.state.player.switchPokemon(slot, species, name, hp, details);
		} else {
			this.state.opponent.switchPokemon(slot, species, name, hp, details);
		}
	}

	/**
	 * 处理招式使用
	 */
	handleMove(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const move = parts[3];
		const target = parts[4];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const moveCN = this.translate(move, 'moves');

		let targetInfo = '';
		if (target) {
			const targetName = target.split(': ')[1];
			const targetCN = this.translate(targetName, 'pokemon');
			targetInfo = ` 目标: ${targetCN}`;
		}

		console.log(`${player} ${pokemonCN} 使用了 ${moveCN}${targetInfo}`);
	}

	/**
	 * 处理伤害
	 */
	handleDamage(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const hp = parts[3];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');

		console.log(`  → ${player} ${pokemonCN} 受到伤害! (HP: ${hp})`);

		if (isPlayer) {
			const activePokemon = this.state.player.getPokemon(slot);
			if (activePokemon) {
				activePokemon.condition = hp;
			}
		} else {
			const activePokemon = this.state.opponent.getPokemon(slot);
			if (activePokemon) {
				activePokemon.condition = hp;
			}
		}
	}

	/**
	 * 处理治疗
	 */
	handleHeal(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const hp = parts[3];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');

		console.log(`  → ${player} ${pokemonCN} 恢复了HP! (HP: ${hp})`);

		if (isPlayer) {
			const activePokemon = this.state.player.getPokemon(slot);
			if (activePokemon) {
				activePokemon.condition = hp;
			}
		} else {
			const activePokemon = this.state.opponent.getPokemon(slot);
			if (activePokemon) {
				activePokemon.condition = hp;
			}
		}
	}

	/**
	 * 处理倒下
	 */
	handleFaint(line) {
		const parts = line.split('|');
		const playerTag = parts[2];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');

		console.log(`  → ${player} ${pokemonCN} 倒下了!`);

		if (!isPlayer) {
			this.state.opponent.markFainted(pokemon);
		}
	}

	/**
	 * 处理能力提升
	 */
	handleBoost(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const stat = parts[3];
		const amount = parseInt(parts[4]);

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const statCN = this.translate(stat, 'boosts');

		console.log(`  → ${player} ${pokemonCN} 的 ${statCN} 提升了 ${amount} 级!`);

		if (isPlayer) {
			this.state.player.boost(slot, stat, amount);
		} else {
			this.state.opponent.boost(slot, stat, amount);
		}
	}

	/**
	 * 处理能力下降
	 */
	handleUnboost(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const stat = parts[3];
		const amount = parseInt(parts[4]);

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const statCN = this.translate(stat, 'boosts');

		console.log(`  → ${player} ${pokemonCN} 的 ${statCN} 下降了 ${amount} 级!`);

		if (isPlayer) {
			this.state.player.unboost(slot, stat, amount);
		} else {
			this.state.opponent.unboost(slot, stat, amount);
		}
	}

	/**
	 * 处理状态异常
	 */
	handleStatus(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const status = parts[3];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const statusCN = this.translate(status, 'status');

		console.log(`  → ${player} ${pokemonCN} 陷入了 ${statusCN} 状态!`);

		if (isPlayer) {
			this.state.player.setStatus(slot, status);
		} else {
			this.state.opponent.setStatus(slot, status);
		}
	}

	/**
	 * 处理状态治愈
	 */
	handleCureStatus(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const status = parts[3];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const statusCN = this.translate(status, 'status');

		console.log(`  → ${player} ${pokemonCN} 的 ${statusCN} 状态解除了!`);

		if (isPlayer) {
			this.state.player.clearStatus(slot);
		} else {
			this.state.opponent.clearStatus(slot);
		}
	}

	/**
	 * 处理天气
	 */
	handleWeather(line) {
		const parts = line.split('|');
		const weather = parts[2];

		if (weather && weather !== 'none') {
			const weatherCN = this.translate(weather, 'weathers');
			console.log(`  → 天气变为: ${weatherCN}`);
			this.state.field.setWeather(weather);
		} else {
			this.state.field.setWeather(null);
		}
	}

	/**
	 * 处理场地效果开始
	 */
	handleFieldStart(line) {
		const parts = line.split('|');
		const field = parts[2];

		const fieldName = field.replace('move: ', '');
		const fieldCN = this.translate(fieldName, 'terrains');
		console.log(`  → 场地效果 ${fieldCN} 开始了!`);

		this.state.field.addTerrain(fieldName);
	}

	/**
	 * 处理场地效果结束
	 */
	handleFieldEnd(line) {
		const parts = line.split('|');
		const field = parts[2];

		const fieldName = field.replace('move: ', '');
		const fieldCN = this.translate(fieldName, 'terrains');
		console.log(`  → 场地效果 ${fieldCN} 消失了!`);

		this.state.field.removeTerrain(fieldName);
	}

	/**
	 * 处理单方场地效果开始
	 */
	handleSideStart(line) {
		const parts = line.split('|');
		const side = parts[2];
		const effect = parts[3];

		const effectName = effect.replace('move: ', '');
		const effectCN = this.translate(effectName, 'moves');

		if (side.startsWith('p1:')) {
			console.log(`  → 【你】 的场地上散布了 ${effectCN}!`);
			this.state.field.addP1SideEffect(effectName);
		} else {
			console.log(`  → 【对手】 的场地上散布了 ${effectCN}!`);
			this.state.field.addP2SideEffect(effectName);
		}
	}

	/**
	 * 处理单方场地效果结束
	 */
	handleSideEnd(line) {
		const parts = line.split('|');
		const side = parts[2];
		const effect = parts[3];

		const effectName = effect.replace('move: ', '');
		const effectCN = this.translate(effectName, 'moves');

		if (side.startsWith('p1:')) {
			console.log(`  → 【你】 的 ${effectCN} 消失了!`);
			this.state.field.removeP1SideEffect(effectName);
		} else {
			console.log(`  → 【对手】 的 ${effectCN} 消失了!`);
			this.state.field.removeP2SideEffect(effectName);
		}
	}

	/**
	 * 处理太晶化
	 */
	handleTerastallize(line) {
		const parts = line.split('|');
		const playerTag = parts[2];
		const teraType = parts[3];

		const { isPlayer, slot, player } = this.parsePlayerTag(playerTag);
		const pokemon = playerTag.split(': ')[1];
		const pokemonCN = this.translate(pokemon, 'pokemon');
		const teraTypeCN = this.translate(teraType, 'types');

		console.log(`\n${player} ${pokemonCN} 太晶化了! 属性变为: ${teraTypeCN}`);

		if (isPlayer) {
			this.state.player.terastallize(pokemon, teraType);
		} else {
			this.state.opponent.terastallize(pokemon, teraType);
		}
	}
}

module.exports = {
	MessageHandlerVGC: DoublesMessageHandler
};
