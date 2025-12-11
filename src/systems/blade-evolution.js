/**
 * ITERATION - Blade Evolution System
 * Tracks blade XP and handles evolution through tiers
 */

class BladeEvolution {
    constructor() {
        this.xp = 0;
        this.currentTier = 0;

        // Blade tiers with colors, thresholds, and visual properties
        this.tiers = [
            {
                name: 'BASIC',
                xpRequired: 0,
                color: '#00f0ff',
                glowColor: '#00f0ff',
                damageMultiplier: 1.0,
                // Visual properties
                shape: 'stick',         // Simple energy stick
                length: 38,
                width: 3,
                glowIntensity: 12,
                hasTrail: false,
                hasParticles: false,
                coreWidth: 1
            },
            {
                name: 'CHARGED',
                xpRequired: 30,
                color: '#00ff88',
                glowColor: '#00ff88',
                damageMultiplier: 1.1,
                // Visual properties
                shape: 'blade',         // Wider, more defined edge
                length: 42,
                width: 4,
                glowIntensity: 16,
                hasTrail: true,
                hasParticles: false,
                coreWidth: 1.5,
                crackling: true         // Electric crackle effect
            },
            {
                name: 'ENHANCED',
                xpRequired: 80,
                color: '#ffdd00',
                glowColor: '#ffdd00',
                damageMultiplier: 1.25,
                // Visual properties
                shape: 'sword',         // Proper sword shape with guard
                length: 46,
                width: 5,
                glowIntensity: 20,
                hasTrail: true,
                hasParticles: true,
                particleCount: 2,
                coreWidth: 2,
                hasGuard: true
            },
            {
                name: 'OVERCLOCKED',
                xpRequired: 150,
                color: '#ff8800',
                glowColor: '#ff8800',
                damageMultiplier: 1.4,
                // Visual properties
                shape: 'heatsword',     // Heated segmented blade
                length: 50,
                width: 6,
                glowIntensity: 25,
                hasTrail: true,
                hasParticles: true,
                particleCount: 3,
                coreWidth: 2,
                hasGuard: true,
                segments: 3,            // Segmented blade sections
                heatDistortion: true
            },
            {
                name: 'CORRUPTED',
                xpRequired: 250,
                color: '#ff00ff',
                glowColor: '#ff00ff',
                damageMultiplier: 1.6,
                // Visual properties
                shape: 'corrupt',       // Jagged, unstable energy
                length: 54,
                width: 7,
                glowIntensity: 30,
                hasTrail: true,
                hasParticles: true,
                particleCount: 4,
                coreWidth: 2.5,
                glitchEffect: true,     // Visual glitching
                jagged: true
            },
            {
                name: 'TRANSCENDED',
                xpRequired: 400,
                color: '#ffffff',
                glowColor: '#ff00ff',
                secondaryColor: '#00ffff',
                damageMultiplier: 2.0,
                // Visual properties
                shape: 'laser',         // Pure energy laser beam
                length: 60,
                width: 8,
                glowIntensity: 40,
                hasTrail: true,
                hasParticles: true,
                particleCount: 6,
                coreWidth: 3,
                isLaser: true,          // Full laser beam
                pulsingCore: true,
                rainbow: true           // Subtle color shift
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
}
