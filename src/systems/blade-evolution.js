/**
 * ITERATION - Blade Evolution System
 * Tracks blade XP and handles evolution through tiers
 */

class BladeEvolution {
    constructor() {
        this.xp = 0;
        this.currentTier = 0;

        // Blade tiers with colors and thresholds (faster progression)
        this.tiers = [
            { name: 'BASIC', xpRequired: 0, color: '#00f0ff', glowColor: '#00f0ff' },
            { name: 'CHARGED', xpRequired: 30, color: '#00ff88', glowColor: '#00ff88' },
            { name: 'ENHANCED', xpRequired: 80, color: '#ffdd00', glowColor: '#ffdd00' },
            { name: 'OVERCLOCKED', xpRequired: 150, color: '#ff8800', glowColor: '#ff8800' },
            { name: 'CORRUPTED', xpRequired: 250, color: '#ff00ff', glowColor: '#ff00ff' },
            { name: 'TRANSCENDED', xpRequired: 400, color: '#ffffff', glowColor: '#ff00ff' }
        ];

        // Damage multipliers per tier
        this.damageMultipliers = [1.0, 1.1, 1.25, 1.4, 1.6, 2.0];

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
        return this.damageMultipliers[this.currentTier];
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
}
