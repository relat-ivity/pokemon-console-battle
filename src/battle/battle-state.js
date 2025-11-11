/**
 * 战斗状态管理
 * 负责管理战斗中的所有状态数据
 */

/**
 * 规范化宝可梦名称，用于匹配
 * 处理各种格式：
 * - "Qwilfish-Hisui (Qwilfish)" -> "Qwilfish-Hisui"
 * - "Minior-Yellow" -> "Minior-Yellow"
 * - "Bulbasaur" -> "Bulbasaur"
 */
function normalizeSpeciesName(name) {
	if (!name) return name;
	// 如果有括号，提取括号前的部分
	const match = name.match(/^(.+?)\s*\(/);
	if (match) {
		return match[1].trim();
	}
	return name;
}

/**
 * 场地状态
 */
class BattleField {
	constructor() {
		this.weather = null;
		this.terrain = []; // 场地效果数组，支持多个叠加
		this.p1Side = []; // 我方场地效果
		this.p2Side = []; // 对手场地效果
	}

	/**
	 * 设置天气
	 */
	setWeather(weather) {
		this.weather = (weather && weather !== 'none') ? weather : null;
	}

	/**
	 * 添加场地效果
	 */
	addTerrain(terrain) {
		if (!this.terrain.includes(terrain)) {
			this.terrain.push(terrain);
		}
	}

	/**
	 * 移除场地效果
	 */
	removeTerrain(terrain) {
		const index = this.terrain.indexOf(terrain);
		if (index > -1) {
			this.terrain.splice(index, 1);
		}
	}

	/**
	 * 添加己方场地效果
	 */
	addP1SideEffect(effect) {
		if (!this.p1Side.includes(effect)) {
			this.p1Side.push(effect);
		}
	}

	/**
	 * 移除己方场地效果
	 */
	removeP1SideEffect(effect) {
		this.p1Side = this.p1Side.filter(e => e !== effect);
	}

	/**
	 * 添加对手场地效果
	 */
	addP2SideEffect(effect) {
		if (!this.p2Side.includes(effect)) {
			this.p2Side.push(effect);
		}
	}

	/**
	 * 移除对手场地效果
	 */
	removeP2SideEffect(effect) {
		this.p2Side = this.p2Side.filter(e => e !== effect);
	}

	/**
	 * 检查是否有场地效果
	 */
	hasEffects() {
		return this.weather ||
		       this.terrain.length > 0 ||
		       this.p1Side.length > 0 ||
		       this.p2Side.length > 0;
	}
}

/**
 * 宝可梦状态
 */
class PokemonState {
	constructor(species, name = null) {
		this.species = species; // 基础名称（如 "Indeedee"），用于太晶化比较
		this.name = name || species; // 完整名称（如 "Indeedee-F"），用于显示
		this.condition = null; // HP状态
		this.status = null; // 异常状态
		this.boosts = {}; // 能力变化
	}

	/**
	 * 更新HP状态
	 */
	setCondition(condition) {
		this.condition = condition;
	}

	/**
	 * 设置异常状态
	 */
	setStatus(status) {
		this.status = status;
	}

	/**
	 * 清除异常状态
	 */
	clearStatus() {
		this.status = null;
	}

	/**
	 * 增加能力等级
	 */
	boost(stat, amount) {
		this.boosts[stat] = (this.boosts[stat] || 0) + amount;
	}

	/**
	 * 降低能力等级
	 */
	unboost(stat, amount) {
		this.boosts[stat] = (this.boosts[stat] || 0) - amount;
	}

	/**
	 * 清除所有能力变化
	 */
	clearBoosts() {
		this.boosts = {};
	}

	/**
	 * 获取非零的能力变化列表
	 */
	getNonZeroBoosts() {
		const result = [];
		for (const stat in this.boosts) {
			const boost = this.boosts[stat];
			if (typeof boost === 'number' && boost !== 0) {
				result.push({ stat, boost });
			}
		}
		return result;
	}
}

/**
 * 玩家状态
 */
class PlayerState {
	constructor(team) {
		this.team = team; // 队伍信息
		this.currentPokemon = null; // 当前出战的宝可梦状态
		this.boosts = {}; // 当前宝可梦的能力变化
		this.status = null; // 当前宝可梦的异常状态
		this.terastallizedPokemon = null; // 太晶化的宝可梦species
		this.teraType = null; // 太晶化的属性
	}

	/**
	 * 切换宝可梦（重置能力变化和状态）
	 */
	switchPokemon(species, name, hp) {
		this.boosts = {};
		// 从HP字符串中提取状态
		if (hp && hp.includes(' ')) {
			const hpParts = hp.split(' ');
			if (hpParts.length > 1) {
				this.status = hpParts[1];
			} else {
				this.status = null;
			}
		} else {
			this.status = null;
		}
		// 太晶化状态不重置
	}

	/**
	 * 太晶化
	 */
	terastallize(species, teraType) {
		this.terastallizedPokemon = species;
		this.teraType = teraType;
	}

	/**
	 * 检查宝可梦是否已太晶化
	 */
	isTerastallized(species) {
		return this.terastallizedPokemon === species;
	}

	/**
	 * 设置异常状态
	 */
	setStatus(status) {
		this.status = status;
	}

	/**
	 * 清除异常状态
	 */
	clearStatus() {
		this.status = null;
	}

	/**
	 * 增加能力等级
	 */
	boost(stat, amount) {
		this.boosts[stat] = (this.boosts[stat] || 0) + amount;
	}

	/**
	 * 降低能力等级
	 */
	unboost(stat, amount) {
		this.boosts[stat] = (this.boosts[stat] || 0) - amount;
	}

	/**
	 * 清除所有能力变化
	 */
	clearBoosts() {
		this.boosts = {};
	}

	/**
	 * 获取非零的能力变化列表
	 */
	getNonZeroBoosts() {
		const result = [];
		for (const stat in this.boosts) {
			const boost = this.boosts[stat];
			if (typeof boost === 'number' && boost !== 0) {
				result.push({ stat, boost });
			}
		}
		return result;
	}
}

/**
 * 对手状态
 */
class OpponentState extends PokemonState {
	constructor() {
		super(null, null);
		this.faintedPokemon = new Set(); // 已昏厥的宝可梦
		this.terastallizedPokemon = null; // 太晶化的宝可梦species
		this.teraType = null; // 太晶化的属性
	}

	/**
	 * 切换宝可梦
	 */
	switchPokemon(species, name, hp) {
		this.species = species;
		this.name = name;
		this.condition = hp;
		this.status = null;
		this.boosts = {};
	}

	/**
	 * 标记宝可梦昏厥
	 */
	markFainted(species) {
		// 规范化名称后再存储
		const normalizedSpecies = normalizeSpeciesName(species);
		this.faintedPokemon.add(normalizedSpecies);
	}

	/**
	 * 太晶化
	 */
	terastallize(species, teraType) {
		this.terastallizedPokemon = species;
		this.teraType = teraType;
	}

	/**
	 * 检查宝可梦是否已太晶化
	 */
	isTerastallized(species) {
		return this.terastallizedPokemon === species;
	}
}

/**
 * 战斗总状态
 */
class BattleState {
	constructor(playerTeam, opponentTeam) {
		this.currentTurn = 0;
		this.battleEnded = false;
		this.battleInitialized = false;
		this.isProcessingChoice = false;

		this.currentRequest = null;
		this.lastRequest = null;
		this.pendingTeamPreviewRequest = null;

		this.field = new BattleField();
		this.player = new PlayerState(playerTeam);
		this.opponent = new OpponentState();
		this.opponentTeam = opponentTeam;

		// 追踪上一回合的天气和场地状态（用于判断是否显示变化消息）
		this.lastWeather = null;
		this.lastTerrains = new Set();
	}

	/**
	 * 开始新回合
	 */
	startTurn(turnNumber) {
		this.currentTurn = turnNumber;
		this.lastTerrains = new Set(this.field.terrain);
	}

	/**
	 * 结束战斗
	 */
	endBattle() {
		this.battleEnded = true;
	}

	/**
	 * 设置当前请求
	 */
	setCurrentRequest(request) {
		this.currentRequest = request;
	}

	/**
	 * 保存上一个请求
	 */
	saveLastRequest() {
		if (this.currentRequest) {
			this.lastRequest = this.currentRequest;
		}
	}

	/**
	 * 清除当前请求
	 */
	clearCurrentRequest() {
		this.currentRequest = null;
	}

	/**
	 * 开始处理选择
	 */
	startProcessingChoice() {
		this.isProcessingChoice = true;
	}

	/**
	 * 结束处理选择
	 */
	endProcessingChoice() {
		this.isProcessingChoice = false;
	}

	/**
	 * 获取对手剩余存活的宝可梦
	 */
	getOpponentAlivePokemon() {
		if (!this.opponentTeam) return [];
		return this.opponentTeam.filter(p => {
			// 规范化名称后再检查
			const normalizedSpecies = normalizeSpeciesName(p.species);
			return !this.opponent.faintedPokemon.has(normalizedSpecies);
		});
	}
}

module.exports = {
	BattleState,
	BattleField,
	PokemonState,
	PlayerState,
	OpponentState
};
