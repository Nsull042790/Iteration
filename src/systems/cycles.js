/**
 * ITERATION - Cycles System
 * Processing cycles are the player's primary resource
 */

class CyclesSystem {
    constructor(startingCycles) {
        this.cycles = startingCycles || GAME_CONFIG.CYCLES.STARTING;
        this.maxCycles = this.cycles;

        // Cost tracking for stats
        this.totalSpent = 0;
        this.totalGained = 0;

        // Warning states
        this.isLow = false;
        this.isCritical = false;

        // Visual feedback
        this.flashTimer = 0;
        this.lastChangeAmount = 0;
        this.changeDisplayTimer = 0;

        // Costs (can be modified by upgrades)
        this.costs = { ...GAME_CONFIG.CYCLES };
    }

    /**
     * Get current cycles
     */
    getCycles() {
        return Math.floor(this.cycles);
    }

    /**
     * Get cycle percentage
     */
    getPercentage() {
        return this.cycles / this.maxCycles;
    }

    /**
     * Spend cycles (returns false if not enough)
     */
    spend(amount, type = 'generic') {
        if (this.cycles < amount) {
            return false;
        }

        this.cycles -= amount;
        this.totalSpent += amount;
        this.lastChangeAmount = -amount;
        this.changeDisplayTimer = 60;

        this.updateWarningState();
        return true;
    }

    /**
     * Spend cycles for movement (per frame)
     */
    spendMove(distance) {
        const cost = Math.abs(distance) * this.costs.MOVE_COST;
        if (cost > 0) {
            this.cycles -= cost;
            this.totalSpent += cost;
            this.updateWarningState();
        }
    }

    /**
     * Spend cycles for jump
     */
    spendJump() {
        return this.spend(this.costs.JUMP_COST, 'jump');
    }

    /**
     * Spend cycles for attack
     */
    spendAttack() {
        return this.spend(this.costs.ATTACK_COST, 'attack');
    }

    /**
     * Spend cycles for interaction
     */
    spendInteract() {
        return this.spend(this.costs.INTERACT_COST, 'interact');
    }

    /**
     * Apply damage penalty
     */
    applyDamagePenalty() {
        this.spend(this.costs.DAMAGE_PENALTY, 'damage');
        this.flashTimer = 30;
    }

    /**
     * Gain cycles (from kills, pickups, etc.)
     */
    gain(amount) {
        this.cycles = Math.min(this.cycles + amount, this.maxCycles);
        this.totalGained += amount;
        this.lastChangeAmount = amount;
        this.changeDisplayTimer = 60;
        this.updateWarningState();
    }

    /**
     * Update warning state
     */
    updateWarningState() {
        const prevLow = this.isLow;
        const prevCritical = this.isCritical;

        this.isLow = this.cycles <= this.costs.LOW_WARNING;
        this.isCritical = this.cycles <= this.costs.CRITICAL_WARNING;

        // Trigger flash on state change
        if (this.isCritical && !prevCritical) {
            this.flashTimer = 60;
        } else if (this.isLow && !prevLow) {
            this.flashTimer = 30;
        }
    }

    /**
     * Check if out of cycles
     */
    isDepleted() {
        return this.cycles <= 0;
    }

    /**
     * Update system (call each frame)
     */
    update() {
        if (this.flashTimer > 0) {
            this.flashTimer--;
        }
        if (this.changeDisplayTimer > 0) {
            this.changeDisplayTimer--;
        }
    }

    /**
     * Get color based on current state
     */
    getColor() {
        if (this.isCritical) {
            return GAME_CONFIG.COLORS.CYCLES_CRITICAL;
        } else if (this.isLow) {
            return GAME_CONFIG.COLORS.CYCLES_LOW;
        }
        return GAME_CONFIG.COLORS.CYCLES;
    }

    /**
     * Check if should flash (for UI)
     */
    shouldFlash() {
        if (this.flashTimer <= 0) return false;
        return Math.floor(this.flashTimer / 4) % 2 === 0;
    }

    /**
     * Get stats for end-of-run summary
     */
    getStats() {
        return {
            remaining: this.getCycles(),
            max: this.maxCycles,
            spent: Math.floor(this.totalSpent),
            gained: Math.floor(this.totalGained),
            efficiency: this.maxCycles > 0
                ? ((this.cycles + this.totalGained) / (this.maxCycles + this.totalGained) * 100).toFixed(1)
                : 0
        };
    }

    /**
     * Reset for new run
     */
    reset(startingCycles) {
        this.cycles = startingCycles || GAME_CONFIG.CYCLES.STARTING;
        this.maxCycles = this.cycles;
        this.totalSpent = 0;
        this.totalGained = 0;
        this.isLow = false;
        this.isCritical = false;
        this.flashTimer = 0;
    }
}
