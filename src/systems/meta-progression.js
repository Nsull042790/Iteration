/**
 * ITERATION - Meta Progression System
 * Persistent upgrades that carry over between runs
 * Unlocked by spending "Data Cores" earned from deaths
 */

class MetaProgressionSystem {
    constructor() {
        // Available upgrades
        this.upgrades = [
            {
                id: 'health_boost',
                name: 'CORE INTEGRITY',
                description: '+10% Max Health',
                maxLevel: 5,
                cost: [50, 100, 200, 400, 800],
                effect: (level) => ({ healthBonus: 0.10 * level })
            },
            {
                id: 'damage_boost',
                name: 'BLADE AMPLIFIER',
                description: '+5% Damage',
                maxLevel: 5,
                cost: [75, 150, 300, 600, 1200],
                effect: (level) => ({ damageBonus: 0.05 * level })
            },
            {
                id: 'xp_boost',
                name: 'DATA PROCESSOR',
                description: '+10% XP Gain',
                maxLevel: 5,
                cost: [50, 100, 200, 400, 800],
                effect: (level) => ({ xpBonus: 0.10 * level })
            },
            {
                id: 'cycle_boost',
                name: 'CYCLE HARVESTER',
                description: '+10% Cycle Gain',
                maxLevel: 5,
                cost: [50, 100, 200, 400, 800],
                effect: (level) => ({ cycleBonus: 0.10 * level })
            },
            {
                id: 'crit_boost',
                name: 'PRECISION CORE',
                description: '+3% Crit Chance',
                maxLevel: 5,
                cost: [100, 200, 400, 800, 1600],
                effect: (level) => ({ critBonus: 0.03 * level })
            },
            {
                id: 'speed_boost',
                name: 'VELOCITY MODULE',
                description: '+5% Movement Speed',
                maxLevel: 3,
                cost: [100, 300, 900],
                effect: (level) => ({ speedBonus: 0.05 * level })
            },
            {
                id: 'starting_cycles',
                name: 'CYCLE RESERVE',
                description: '+100 Starting Cycles',
                maxLevel: 5,
                cost: [75, 150, 300, 600, 1200],
                effect: (level) => ({ startingCycles: 100 * level })
            },
            {
                id: 'lifesteal',
                name: 'SIPHON PROTOCOL',
                description: '+1% Lifesteal',
                maxLevel: 3,
                cost: [200, 500, 1500],
                effect: (level) => ({ lifestealBonus: 0.01 * level })
            }
        ];

        // Player progress
        this.dataCores = 0;
        this.totalDataCoresEarned = 0;
        this.purchasedLevels = {};

        // Initialize all upgrades to level 0
        for (const upgrade of this.upgrades) {
            this.purchasedLevels[upgrade.id] = 0;
        }

        // Load from storage
        this.loadFromStorage();
    }

    /**
     * Load progress from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('iteration_meta');
            if (saved) {
                const data = JSON.parse(saved);
                this.dataCores = data.dataCores || 0;
                this.totalDataCoresEarned = data.totalDataCoresEarned || 0;
                this.purchasedLevels = data.purchasedLevels || {};

                // Ensure all upgrades have a level
                for (const upgrade of this.upgrades) {
                    if (this.purchasedLevels[upgrade.id] === undefined) {
                        this.purchasedLevels[upgrade.id] = 0;
                    }
                }
            }
        } catch (e) {
            console.log('Could not load meta progression from storage');
        }
    }

    /**
     * Save progress to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                dataCores: this.dataCores,
                totalDataCoresEarned: this.totalDataCoresEarned,
                purchasedLevels: this.purchasedLevels
            };
            localStorage.setItem('iteration_meta', JSON.stringify(data));
        } catch (e) {
            console.log('Could not save meta progression to storage');
        }
    }

    /**
     * Award data cores on death (based on performance)
     */
    awardDataCores(level, kills, bossKills) {
        // Base cores from level reached
        let cores = level * 10;

        // Bonus from kills
        cores += Math.floor(kills * 0.5);

        // Bonus from boss kills
        cores += bossKills * 25;

        this.dataCores += cores;
        this.totalDataCoresEarned += cores;
        this.saveToStorage();

        return cores;
    }

    /**
     * Purchase an upgrade
     */
    purchaseUpgrade(upgradeId) {
        const upgrade = this.upgrades.find(u => u.id === upgradeId);
        if (!upgrade) return { success: false, message: 'Unknown upgrade' };

        const currentLevel = this.purchasedLevels[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) {
            return { success: false, message: 'Already maxed!' };
        }

        const cost = upgrade.cost[currentLevel];
        if (this.dataCores < cost) {
            return { success: false, message: 'Not enough Data Cores!' };
        }

        this.dataCores -= cost;
        this.purchasedLevels[upgradeId] = currentLevel + 1;
        this.saveToStorage();

        return { success: true, message: `${upgrade.name} upgraded to level ${currentLevel + 1}!` };
    }

    /**
     * Get upgrade level
     */
    getUpgradeLevel(upgradeId) {
        return this.purchasedLevels[upgradeId] || 0;
    }

    /**
     * Calculate all bonuses from purchased upgrades
     */
    calculateBonuses() {
        const bonuses = {
            healthBonus: 0,
            damageBonus: 0,
            xpBonus: 0,
            cycleBonus: 0,
            critBonus: 0,
            speedBonus: 0,
            startingCycles: 0,
            lifestealBonus: 0
        };

        for (const upgrade of this.upgrades) {
            const level = this.purchasedLevels[upgrade.id] || 0;
            if (level > 0) {
                const effect = upgrade.effect(level);
                for (const [key, value] of Object.entries(effect)) {
                    if (bonuses[key] !== undefined) {
                        bonuses[key] += value;
                    }
                }
            }
        }

        return bonuses;
    }

    /**
     * Apply bonuses to player at game start
     */
    applyToPlayer(player, game) {
        const bonuses = this.calculateBonuses();

        // Apply health bonus
        if (bonuses.healthBonus > 0) {
            const extraHealth = Math.floor(player.maxHealth * bonuses.healthBonus);
            player.maxHealth += extraHealth;
            player.health = player.maxHealth;
        }

        // Apply speed bonus
        if (bonuses.speedBonus > 0) {
            player.speed *= (1 + bonuses.speedBonus);
        }

        // Store bonuses for game systems to use
        player.metaBonuses = bonuses;

        // Apply starting cycles
        if (bonuses.startingCycles > 0 && game.cycles) {
            game.cycles.gain(bonuses.startingCycles);
        }
    }

    /**
     * Get all upgrades with current status
     */
    getUpgradeStatus() {
        return this.upgrades.map(upgrade => ({
            ...upgrade,
            currentLevel: this.purchasedLevels[upgrade.id] || 0,
            nextCost: this.purchasedLevels[upgrade.id] < upgrade.maxLevel
                ? upgrade.cost[this.purchasedLevels[upgrade.id]]
                : null,
            isMaxed: this.purchasedLevels[upgrade.id] >= upgrade.maxLevel
        }));
    }
}
