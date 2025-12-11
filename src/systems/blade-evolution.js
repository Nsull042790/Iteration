/**
 * ITERATION - Blade Evolution System
 * Tracks blade XP and handles evolution through tiers
 */

class BladeEvolution {
    constructor() {
        this.xp = 0;
        this.currentTier = 0;

        // Blade tiers with colors, abilities, and visual properties
        // LOWER thresholds for faster, more satisfying progression
        this.tiers = [
            {
                name: 'BASIC',
                xpRequired: 0,
                color: '#00f0ff',
                glowColor: '#00f0ff',
                damageMultiplier: 1.0,
                // Visual properties
                shape: 'stick',
                length: 38,
                width: 3,
                glowIntensity: 12,
                hasTrail: false,
                hasParticles: false,
                coreWidth: 1,
                // Abilities
                ability: null,
                abilityDesc: 'Standard slash attack'
            },
            {
                name: 'CHARGED',
                xpRequired: 15,  // ~2 kills
                color: '#00ff88',
                glowColor: '#00ff88',
                damageMultiplier: 1.2,
                // Visual properties
                shape: 'blade',
                length: 44,
                width: 5,
                glowIntensity: 18,
                hasTrail: true,
                hasParticles: false,
                coreWidth: 2,
                crackling: true,
                // Abilities
                ability: 'wave',        // Sends a projectile wave on attack
                abilityDesc: 'Slash sends energy wave',
                waveSpeed: 8,
                waveDamage: 0.5,        // 50% of blade damage
                waveColor: '#00ff88'
            },
            {
                name: 'ENHANCED',
                xpRequired: 40,  // ~4 kills
                color: '#ffdd00',
                glowColor: '#ffdd00',
                damageMultiplier: 1.4,
                // Visual properties
                shape: 'sword',
                length: 50,
                width: 6,
                glowIntensity: 24,
                hasTrail: true,
                hasParticles: true,
                particleCount: 3,
                coreWidth: 2,
                hasGuard: true,
                // Abilities
                ability: 'explosive',   // Attacks create small explosions
                abilityDesc: 'Hits explode for AOE damage',
                explosionRadius: 60,
                explosionDamage: 0.3    // 30% splash damage
            },
            {
                name: 'OVERCLOCKED',
                xpRequired: 80,  // ~8 kills
                color: '#ff8800',
                glowColor: '#ff8800',
                damageMultiplier: 1.7,
                // Visual properties
                shape: 'heatsword',
                length: 56,
                width: 7,
                glowIntensity: 30,
                hasTrail: true,
                hasParticles: true,
                particleCount: 4,
                coreWidth: 2.5,
                hasGuard: true,
                segments: 3,
                heatDistortion: true,
                // Abilities
                ability: 'chain',       // Damage chains to nearby enemies
                abilityDesc: 'Damage chains to nearby foes',
                chainRange: 120,
                chainDamage: 0.6,       // 60% chain damage
                maxChains: 2
            },
            {
                name: 'CORRUPTED',
                xpRequired: 130, // ~13 kills
                color: '#ff00ff',
                glowColor: '#ff00ff',
                damageMultiplier: 2.0,
                // Visual properties
                shape: 'corrupt',
                length: 62,
                width: 8,
                glowIntensity: 35,
                hasTrail: true,
                hasParticles: true,
                particleCount: 5,
                coreWidth: 3,
                glitchEffect: true,
                jagged: true,
                // Abilities
                ability: 'lifesteal',   // Heal on hit
                abilityDesc: 'Attacks heal you',
                lifestealPercent: 0.15  // 15% of damage dealt
            },
            {
                name: 'TRANSCENDED',
                xpRequired: 200, // ~20 kills or boss + kills
                color: '#ffffff',
                glowColor: '#ff00ff',
                secondaryColor: '#00ffff',
                damageMultiplier: 2.5,
                // Visual properties
                shape: 'laser',
                length: 70,
                width: 10,
                glowIntensity: 50,
                hasTrail: true,
                hasParticles: true,
                particleCount: 8,
                coreWidth: 4,
                isLaser: true,
                pulsingCore: true,
                rainbow: true,
                // Abilities - ALL PREVIOUS + new ultimate
                ability: 'ultimate',    // All abilities combined
                abilityDesc: 'WAVE + EXPLOSION + CHAIN + LIFESTEAL',
                // Inherits all previous abilities
                waveSpeed: 10,
                waveDamage: 0.6,
                explosionRadius: 80,
                explosionDamage: 0.4,
                chainRange: 150,
                chainDamage: 0.7,
                maxChains: 3,
                lifestealPercent: 0.2
            }
        ];

        // Evolution animation
        this.evolutionTimer = 0;
        this.isEvolving = false;

        // For HUD display
        this.xpGainTimer = 0;
        this.lastXpGain = 0;
    }

    /**
     * Get current tier data
     */
    getCurrentTier() {
        return this.tiers[this.currentTier];
    }

    /**
     * Get blade name
     */
    getBladeName() {
        return this.tiers[this.currentTier].name;
    }

    /**
     * Get blade color
     */
    getBladeColor() {
        return this.tiers[this.currentTier].color;
    }

    /**
     * Get blade glow color
     */
    getGlowColor() {
        return this.tiers[this.currentTier].glowColor;
    }

    /**
     * Get damage multiplier
     */
    getDamageMultiplier() {
        return this.tiers[this.currentTier].damageMultiplier;
    }

    /**
     * Get full visual data for current tier
     */
    getVisuals() {
        return this.tiers[this.currentTier];
    }

    /**
     * Get blade length for current tier
     */
    getBladeLength() {
        return this.tiers[this.currentTier].length;
    }

    /**
     * Get progress to next tier (0-1)
     */
    getProgress() {
        if (this.currentTier >= this.tiers.length - 1) {
            return 1; // Max tier
        }

        const currentThreshold = this.tiers[this.currentTier].xpRequired;
        const nextThreshold = this.tiers[this.currentTier + 1].xpRequired;
        const xpInTier = this.xp - currentThreshold;
        const xpNeeded = nextThreshold - currentThreshold;

        return Math.min(xpInTier / xpNeeded, 1);
    }

    /**
     * Get XP needed for next tier
     */
    getXPToNextTier() {
        if (this.currentTier >= this.tiers.length - 1) {
            return 0;
        }
        return this.tiers[this.currentTier + 1].xpRequired - this.xp;
    }

    /**
     * Add XP and check for evolution
     */
    addXP(amount) {
        this.xp += amount;
        this.lastXpGain = amount;
        this.xpGainTimer = 60;

        // Check for tier up
        const previousTier = this.currentTier;
        this.updateTier();

        // Return true if evolved
        return this.currentTier > previousTier;
    }

    /**
     * Update current tier based on XP
     */
    updateTier() {
        for (let i = this.tiers.length - 1; i >= 0; i--) {
            if (this.xp >= this.tiers[i].xpRequired) {
                this.currentTier = i;
                return;
            }
        }
    }

    /**
     * Trigger evolution animation
     */
    triggerEvolution() {
        this.isEvolving = true;
        this.evolutionTimer = 90; // 1.5 seconds
    }

    /**
     * Update evolution animation
     */
    update() {
        if (this.xpGainTimer > 0) {
            this.xpGainTimer--;
        }

        if (this.evolutionTimer > 0) {
            this.evolutionTimer--;
            if (this.evolutionTimer <= 0) {
                this.isEvolving = false;
            }
        }
    }

    /**
     * Reset blade evolution
     */
    reset() {
        this.xp = 0;
        this.currentTier = 0;
        this.evolutionTimer = 0;
        this.isEvolving = false;
    }

    /**
     * Get total XP
     */
    getXP() {
        return this.xp;
    }

    /**
     * Check if at max tier
     */
    isMaxTier() {
        return this.currentTier >= this.tiers.length - 1;
    }

    /**
     * Get current ability name
     */
    getAbility() {
        return this.tiers[this.currentTier].ability;
    }

    /**
     * Get ability description
     */
    getAbilityDesc() {
        return this.tiers[this.currentTier].abilityDesc;
    }

    /**
     * Check if current tier has a specific ability (for inherited abilities)
     */
    hasAbility(abilityName) {
        const tier = this.tiers[this.currentTier];
        if (tier.ability === 'ultimate') {
            // Ultimate has all abilities
            return ['wave', 'explosive', 'chain', 'lifesteal'].includes(abilityName);
        }
        return tier.ability === abilityName;
    }
}
