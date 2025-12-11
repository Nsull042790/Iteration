/**
 * ITERATION - Upgrade System
 * Roguelike upgrades with risk/reward tradeoffs
 */

class UpgradeSystem {
    constructor() {
        // Player's active upgrades
        this.activeUpgrades = [];

        // Stat modifiers from upgrades
        this.modifiers = {
            damageMultiplier: 1.0,
            maxHealthMultiplier: 1.0,
            speedMultiplier: 1.0,
            xpMultiplier: 1.0,
            cycleGainMultiplier: 1.0,
            damageTakenMultiplier: 1.0,
            lifestealBonus: 0,
            critChance: 0,
            critMultiplier: 2.0,
            thornsPercent: 0,
            itemPickupRange: 60,
            attackSpeedMultiplier: 1.0
        };

        // All available upgrades
        this.allUpgrades = [
            // === PURE POSITIVE ===
            {
                id: 'health_up',
                name: 'VITALITY BOOST',
                description: '+25 Max Health',
                rarity: 'common',
                icon: '❤',
                color: '#ff4444',
                positive: ['+25 Max HP'],
                negative: [],
                apply: (game) => {
                    game.player.maxHealth += 25;
                    game.player.health += 25;
                }
            },
            {
                id: 'damage_up',
                name: 'POWER SURGE',
                description: '+15% Damage',
                rarity: 'common',
                icon: '⚔',
                color: '#ff8800',
                positive: ['+15% Damage'],
                negative: [],
                apply: (game) => {
                    this.modifiers.damageMultiplier *= 1.15;
                }
            },
            {
                id: 'speed_up',
                name: 'QUICK STEP',
                description: '+12% Move Speed',
                rarity: 'common',
                icon: '💨',
                color: '#00ff88',
                positive: ['+12% Speed'],
                negative: [],
                apply: (game) => {
                    this.modifiers.speedMultiplier *= 1.12;
                }
            },
            {
                id: 'xp_boost',
                name: 'RAPID EVOLUTION',
                description: '+30% Blade XP Gain',
                rarity: 'uncommon',
                icon: '✧',
                color: '#aa00ff',
                positive: ['+30% Blade XP'],
                negative: [],
                apply: (game) => {
                    this.modifiers.xpMultiplier *= 1.30;
                }
            },

            // === RISK/REWARD ===
            {
                id: 'glass_cannon',
                name: 'GLASS CANNON',
                description: 'High risk, high reward',
                rarity: 'rare',
                icon: '💀',
                color: '#ff0066',
                positive: ['+50% Damage'],
                negative: ['-30% Max HP'],
                apply: (game) => {
                    this.modifiers.damageMultiplier *= 1.50;
                    this.modifiers.maxHealthMultiplier *= 0.70;
                    const newMax = Math.floor(game.player.maxHealth * 0.70);
                    game.player.maxHealth = newMax;
                    game.player.health = Math.min(game.player.health, newMax);
                }
            },
            {
                id: 'berserker',
                name: 'BERSERKER',
                description: 'Stronger when wounded',
                rarity: 'rare',
                icon: '🔥',
                color: '#ff4400',
                positive: ['+40% DMG below 50% HP'],
                negative: ['-15% Max HP'],
                isBerserker: true,
                apply: (game) => {
                    this.modifiers.maxHealthMultiplier *= 0.85;
                    const newMax = Math.floor(game.player.maxHealth * 0.85);
                    game.player.maxHealth = newMax;
                    game.player.health = Math.min(game.player.health, newMax);
                }
            },
            {
                id: 'tank',
                name: 'JUGGERNAUT',
                description: 'Slow but sturdy',
                rarity: 'uncommon',
                icon: '🛡',
                color: '#4488ff',
                positive: ['+50% Max HP'],
                negative: ['-20% Speed'],
                apply: (game) => {
                    this.modifiers.maxHealthMultiplier *= 1.50;
                    this.modifiers.speedMultiplier *= 0.80;
                    const bonus = Math.floor(game.player.maxHealth * 0.50);
                    game.player.maxHealth += bonus;
                    game.player.health += bonus;
                }
            },
            {
                id: 'risky_business',
                name: 'RISKY BUSINESS',
                description: 'Fortune favors the bold',
                rarity: 'rare',
                icon: '🎲',
                color: '#ffdd00',
                positive: ['+50% XP & Cycles'],
                negative: ['+25% Damage Taken'],
                apply: (game) => {
                    this.modifiers.xpMultiplier *= 1.50;
                    this.modifiers.cycleGainMultiplier *= 1.50;
                    this.modifiers.damageTakenMultiplier *= 1.25;
                }
            },
            {
                id: 'vampiric',
                name: 'VAMPIRIC BLADE',
                description: 'Drain life from enemies',
                rarity: 'rare',
                icon: '🩸',
                color: '#880044',
                positive: ['+8% Lifesteal'],
                negative: ['-10% Max HP'],
                apply: (game) => {
                    this.modifiers.lifestealBonus += 0.08;
                    this.modifiers.maxHealthMultiplier *= 0.90;
                    const newMax = Math.floor(game.player.maxHealth * 0.90);
                    game.player.maxHealth = newMax;
                    game.player.health = Math.min(game.player.health, newMax);
                }
            },
            {
                id: 'critical_strike',
                name: 'PRECISION PROTOCOL',
                description: 'Chance for massive damage',
                rarity: 'uncommon',
                icon: '✖',
                color: '#ff00ff',
                positive: ['20% Crit Chance', '2x Crit Damage'],
                negative: ['-8% Base Damage'],
                apply: (game) => {
                    this.modifiers.critChance += 0.20;
                    this.modifiers.damageMultiplier *= 0.92;
                }
            },
            {
                id: 'thorns',
                name: 'REACTIVE ARMOR',
                description: 'Hurt those who hurt you',
                rarity: 'uncommon',
                icon: '⬡',
                color: '#00ffaa',
                positive: ['Reflect 30% damage'],
                negative: ['-10% Speed'],
                apply: (game) => {
                    this.modifiers.thornsPercent += 0.30;
                    this.modifiers.speedMultiplier *= 0.90;
                }
            },
            {
                id: 'adrenaline',
                name: 'ADRENALINE RUSH',
                description: 'Speed boost when hurt',
                rarity: 'uncommon',
                icon: '⚡',
                color: '#ffff00',
                positive: ['+30% Speed below 40% HP'],
                negative: ['-10% Max HP'],
                isAdrenaline: true,
                apply: (game) => {
                    this.modifiers.maxHealthMultiplier *= 0.90;
                    const newMax = Math.floor(game.player.maxHealth * 0.90);
                    game.player.maxHealth = newMax;
                    game.player.health = Math.min(game.player.health, newMax);
                }
            },

            // === CURSED (mostly negative but powerful) ===
            {
                id: 'cursed_strength',
                name: 'CORRUPTED POWER',
                description: 'Overwhelming but unstable',
                rarity: 'legendary',
                icon: '☠',
                color: '#8800ff',
                positive: ['+80% Damage'],
                negative: ['-40% Max HP', '+15% DMG Taken'],
                apply: (game) => {
                    this.modifiers.damageMultiplier *= 1.80;
                    this.modifiers.maxHealthMultiplier *= 0.60;
                    this.modifiers.damageTakenMultiplier *= 1.15;
                    const newMax = Math.floor(game.player.maxHealth * 0.60);
                    game.player.maxHealth = newMax;
                    game.player.health = Math.min(game.player.health, newMax);
                }
            },
            {
                id: 'chaos',
                name: 'CHAOS PROTOCOL',
                description: 'Embrace the glitch',
                rarity: 'legendary',
                icon: '◈',
                color: '#ff00aa',
                positive: ['+25% All Stats'],
                negative: ['Random stat -30%'],
                apply: (game) => {
                    this.modifiers.damageMultiplier *= 1.25;
                    this.modifiers.speedMultiplier *= 1.25;
                    this.modifiers.xpMultiplier *= 1.25;
                    // Random penalty
                    const penalties = ['damage', 'speed', 'health'];
                    const penalty = penalties[Math.floor(Math.random() * penalties.length)];
                    if (penalty === 'damage') this.modifiers.damageMultiplier *= 0.70;
                    if (penalty === 'speed') this.modifiers.speedMultiplier *= 0.70;
                    if (penalty === 'health') {
                        this.modifiers.maxHealthMultiplier *= 0.70;
                        const newMax = Math.floor(game.player.maxHealth * 0.70);
                        game.player.maxHealth = newMax;
                        game.player.health = Math.min(game.player.health, newMax);
                    }
                }
            },

            // === UTILITY ===
            {
                id: 'magnetic',
                name: 'MAGNETIC FIELD',
                description: 'Draw in nearby items',
                rarity: 'common',
                icon: '◎',
                color: '#00ddff',
                positive: ['+100% Pickup Range'],
                negative: [],
                apply: (game) => {
                    this.modifiers.itemPickupRange *= 2;
                }
            },
            {
                id: 'second_wind',
                name: 'SECOND WIND',
                description: 'Heal after each level',
                rarity: 'uncommon',
                icon: '♺',
                color: '#00ff44',
                positive: ['Heal 30% after boss'],
                negative: [],
                isSecondWind: true,
                apply: (game) => {
                    // Effect handled in game logic
                }
            },
            {
                id: 'attack_speed',
                name: 'OVERCLOCK',
                description: 'Faster attacks',
                rarity: 'uncommon',
                icon: '⟐',
                color: '#ffaa00',
                positive: ['+25% Attack Speed'],
                negative: ['-5% Damage'],
                apply: (game) => {
                    this.modifiers.attackSpeedMultiplier *= 1.25;
                    this.modifiers.damageMultiplier *= 0.95;
                }
            }
        ];
    }

    /**
     * Get random upgrade choices (excluding already owned)
     */
    getRandomChoices(count = 3) {
        const available = this.allUpgrades.filter(u =>
            !this.activeUpgrades.find(a => a.id === u.id)
        );

        // Weighted by rarity
        const weighted = [];
        for (const upgrade of available) {
            const weight = upgrade.rarity === 'common' ? 4 :
                          upgrade.rarity === 'uncommon' ? 3 :
                          upgrade.rarity === 'rare' ? 2 : 1;
            for (let i = 0; i < weight; i++) {
                weighted.push(upgrade);
            }
        }

        // Shuffle and pick
        const shuffled = weighted.sort(() => Math.random() - 0.5);
        const choices = [];
        const picked = new Set();

        for (const upgrade of shuffled) {
            if (!picked.has(upgrade.id) && choices.length < count) {
                choices.push(upgrade);
                picked.add(upgrade.id);
            }
        }

        return choices;
    }

    /**
     * Apply an upgrade
     */
    applyUpgrade(upgrade, game) {
        this.activeUpgrades.push(upgrade);
        upgrade.apply(game);
    }

    /**
     * Check if player has a specific upgrade
     */
    hasUpgrade(upgradeId) {
        return this.activeUpgrades.some(u => u.id === upgradeId);
    }

    /**
     * Get damage multiplier with conditional bonuses
     */
    getDamageMultiplier(player) {
        let mult = this.modifiers.damageMultiplier;

        // Berserker bonus
        if (this.hasUpgrade('berserker') && player.health < player.maxHealth * 0.5) {
            mult *= 1.40;
        }

        return mult;
    }

    /**
     * Get speed multiplier with conditional bonuses
     */
    getSpeedMultiplier(player) {
        let mult = this.modifiers.speedMultiplier;

        // Adrenaline bonus
        if (this.hasUpgrade('adrenaline') && player.health < player.maxHealth * 0.4) {
            mult *= 1.30;
        }

        return mult;
    }

    /**
     * Calculate crit damage
     */
    calculateDamage(baseDamage, extraCritChance = 0) {
        let damage = baseDamage;
        const totalCritChance = this.modifiers.critChance + extraCritChance;

        if (totalCritChance > 0 && Math.random() < totalCritChance) {
            damage *= this.modifiers.critMultiplier;
            return { damage, isCrit: true };
        }

        return { damage, isCrit: false };
    }

    /**
     * Get total lifesteal percent
     */
    getLifestealPercent() {
        return this.modifiers.lifestealBonus;
    }

    /**
     * Reset for new run
     */
    reset() {
        this.activeUpgrades = [];
        this.modifiers = {
            damageMultiplier: 1.0,
            maxHealthMultiplier: 1.0,
            speedMultiplier: 1.0,
            xpMultiplier: 1.0,
            cycleGainMultiplier: 1.0,
            damageTakenMultiplier: 1.0,
            lifestealBonus: 0,
            critChance: 0,
            critMultiplier: 2.0,
            thornsPercent: 0,
            itemPickupRange: 60,
            attackSpeedMultiplier: 1.0
        };
    }
}
