/**
 * ITERATION - Run Statistics Tracking System
 * Tracks all stats needed for competitive leaderboards
 */

class RunStatsSystem {
    constructor() {
        // Current run stats (reset each run)
        this.reset();

        // All-time stats (persistent)
        this.allTimeStats = this.loadAllTimeStats();
    }

    /**
     * Reset stats for a new run
     */
    reset() {
        this.currentRun = {
            // Core timing
            startTime: null,
            endTime: null,
            totalTimeMs: 0,

            // Completion status
            completed: false,
            finalLevel: 0,

            // Death tracking
            deaths: 0,
            deathless: true,

            // Combat stats
            totalKills: 0,
            bossKills: 0,
            bossKillTimes: [], // Array of {bossName, timeMs}

            // Ghost system
            ghostsAbsorbed: 0,
            ghostsDefeated: 0,  // Vengeful Shades killed
            totalGhostInteractions: 0,

            // Resource tracking
            cyclesGained: 0,
            cyclesSpent: 0,
            peakCycles: 0,
            finalCycles: 0,

            // Character and loadout
            character: 'echo',
            weapons: [],
            finalBladeTier: 0,

            // Level progression
            levelsCompleted: 0,
            zonesReached: 1,

            // Per-level times for speedrun analysis
            levelTimes: [], // Array of {level, timeMs}

            // Weekly challenge tracking
            weeklyObjectivesCompleted: 0,

            // Damage stats
            damageDealt: 0,
            damageTaken: 0,

            // Misc
            jumps: 0,
            attacks: 0,
            upgradesPicked: 0
        };
    }

    /**
     * Start tracking a new run
     */
    startRun(character = 'echo') {
        this.reset();
        this.currentRun.startTime = Date.now();
        this.currentRun.character = character.toLowerCase();
        console.log(`[STATS] Run started with ${character}`);
    }

    /**
     * End the current run
     */
    endRun(completed = false, finalLevel = 1) {
        this.currentRun.endTime = Date.now();
        this.currentRun.totalTimeMs = this.currentRun.endTime - this.currentRun.startTime;
        this.currentRun.completed = completed;
        this.currentRun.finalLevel = finalLevel;

        // Update all-time stats
        this.updateAllTimeStats();

        console.log(`[STATS] Run ended - Completed: ${completed}, Level: ${finalLevel}, Time: ${this.getFormattedTime()}`);

        return this.getRunSummary();
    }

    /**
     * Record a death
     */
    recordDeath(cause = 'enemy', level = 1) {
        this.currentRun.deaths++;
        this.currentRun.deathless = false;
        console.log(`[STATS] Death recorded: ${cause} at level ${level}`);
    }

    /**
     * Record an enemy kill
     */
    recordKill(enemyType = 'basic') {
        this.currentRun.totalKills++;
    }

    /**
     * Record a boss kill with timing
     */
    recordBossKill(bossName, fightStartTime) {
        const killTimeMs = Date.now() - fightStartTime;
        this.currentRun.bossKills++;
        this.currentRun.bossKillTimes.push({
            bossName: bossName,
            timeMs: killTimeMs
        });
        console.log(`[STATS] Boss ${bossName} killed in ${(killTimeMs / 1000).toFixed(2)}s`);
    }

    /**
     * Record ghost interaction
     */
    recordGhostInteraction(ghostType, wasHostile) {
        this.currentRun.totalGhostInteractions++;
        if (wasHostile) {
            this.currentRun.ghostsDefeated++;
        } else {
            this.currentRun.ghostsAbsorbed++;
        }
    }

    /**
     * Record cycles gained
     */
    recordCyclesGained(amount) {
        this.currentRun.cyclesGained += amount;
        const currentTotal = this.currentRun.cyclesGained - this.currentRun.cyclesSpent;
        if (currentTotal > this.currentRun.peakCycles) {
            this.currentRun.peakCycles = currentTotal;
        }
    }

    /**
     * Record cycles spent
     */
    recordCyclesSpent(amount) {
        this.currentRun.cyclesSpent += amount;
    }

    /**
     * Set final cycles (at run end)
     */
    setFinalCycles(amount) {
        this.currentRun.finalCycles = amount;
    }

    /**
     * Record level completion
     */
    recordLevelComplete(level, levelStartTime) {
        const levelTimeMs = Date.now() - levelStartTime;
        this.currentRun.levelsCompleted++;
        this.currentRun.levelTimes.push({
            level: level,
            timeMs: levelTimeMs
        });

        // Update zone tracking
        if (level <= 3) this.currentRun.zonesReached = Math.max(this.currentRun.zonesReached, 1);
        else if (level <= 6) this.currentRun.zonesReached = Math.max(this.currentRun.zonesReached, 2);
        else if (level <= 9) this.currentRun.zonesReached = Math.max(this.currentRun.zonesReached, 3);
        else this.currentRun.zonesReached = Math.max(this.currentRun.zonesReached, 4);
    }

    /**
     * Record blade evolution
     */
    recordBladeEvolution(tier) {
        if (tier > this.currentRun.finalBladeTier) {
            this.currentRun.finalBladeTier = tier;
        }
    }

    /**
     * Record damage dealt
     */
    recordDamageDealt(amount) {
        this.currentRun.damageDealt += amount;
    }

    /**
     * Record damage taken
     */
    recordDamageTaken(amount) {
        this.currentRun.damageTaken += amount;
    }

    /**
     * Record a jump
     */
    recordJump() {
        this.currentRun.jumps++;
    }

    /**
     * Record an attack
     */
    recordAttack() {
        this.currentRun.attacks++;
    }

    /**
     * Record upgrade picked
     */
    recordUpgrade() {
        this.currentRun.upgradesPicked++;
    }

    /**
     * Get current run time in milliseconds
     */
    getCurrentTimeMs() {
        if (!this.currentRun.startTime) return 0;
        return Date.now() - this.currentRun.startTime;
    }

    /**
     * Get formatted time string (MM:SS.mmm or MM:SS)
     */
    getFormattedTime(includeMs = false) {
        const ms = this.currentRun.totalTimeMs || this.getCurrentTimeMs();
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = ms % 1000;

        if (includeMs) {
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Get total boss kill time
     */
    getTotalBossTime() {
        return this.currentRun.bossKillTimes.reduce((sum, b) => sum + b.timeMs, 0);
    }

    /**
     * Get run summary for leaderboard submission
     */
    getRunSummary() {
        return {
            // Identification
            character: this.currentRun.character,
            timestamp: Date.now(),

            // Core metrics for leaderboards
            timeMs: this.currentRun.totalTimeMs,
            completed: this.currentRun.completed,
            finalLevel: this.currentRun.finalLevel,

            // Death tracking
            deaths: this.currentRun.deaths,
            deathless: this.currentRun.deathless && this.currentRun.completed,

            // Ghost mastery
            ghostsAbsorbed: this.currentRun.ghostsAbsorbed,
            ghostsDefeated: this.currentRun.ghostsDefeated,
            totalGhostInteractions: this.currentRun.totalGhostInteractions,

            // Boss rush
            bossKillTimes: this.currentRun.bossKillTimes,
            totalBossTimeMs: this.getTotalBossTime(),

            // Cycle efficiency
            finalCycles: this.currentRun.finalCycles,
            peakCycles: this.currentRun.peakCycles,

            // Combat
            totalKills: this.currentRun.totalKills,
            bossKills: this.currentRun.bossKills,

            // Misc
            bladeTier: this.currentRun.finalBladeTier,
            zonesReached: this.currentRun.zonesReached
        };
    }

    /**
     * Load all-time stats from localStorage
     */
    loadAllTimeStats() {
        try {
            const saved = localStorage.getItem('iteration_alltime_stats');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('[STATS] Failed to load all-time stats:', e);
        }

        return {
            totalRuns: 0,
            totalDeaths: 0,
            totalKills: 0,
            totalPlayTimeMs: 0,
            completedRuns: 0,
            deathlessRuns: 0,
            fastestCompletionMs: null,
            highestLevel: 0,
            mostGhostsInRun: 0,
            characterRuns: {} // Track runs per character
        };
    }

    /**
     * Save all-time stats to localStorage
     */
    saveAllTimeStats() {
        try {
            localStorage.setItem('iteration_alltime_stats', JSON.stringify(this.allTimeStats));
        } catch (e) {
            console.warn('[STATS] Failed to save all-time stats:', e);
        }
    }

    /**
     * Update all-time stats with current run
     */
    updateAllTimeStats() {
        const run = this.currentRun;
        const stats = this.allTimeStats;

        stats.totalRuns++;
        stats.totalDeaths += run.deaths;
        stats.totalKills += run.totalKills;
        stats.totalPlayTimeMs += run.totalTimeMs;

        if (run.completed) {
            stats.completedRuns++;
            if (run.deathless) {
                stats.deathlessRuns++;
            }
            if (!stats.fastestCompletionMs || run.totalTimeMs < stats.fastestCompletionMs) {
                stats.fastestCompletionMs = run.totalTimeMs;
            }
        }

        if (run.finalLevel > stats.highestLevel) {
            stats.highestLevel = run.finalLevel;
        }

        const totalGhosts = run.ghostsAbsorbed + run.ghostsDefeated;
        if (totalGhosts > stats.mostGhostsInRun) {
            stats.mostGhostsInRun = totalGhosts;
        }

        // Track per-character runs
        const char = run.character.toLowerCase();
        if (!stats.characterRuns[char]) {
            stats.characterRuns[char] = {
                runs: 0,
                completions: 0,
                fastestMs: null
            };
        }
        stats.characterRuns[char].runs++;
        if (run.completed) {
            stats.characterRuns[char].completions++;
            if (!stats.characterRuns[char].fastestMs || run.totalTimeMs < stats.characterRuns[char].fastestMs) {
                stats.characterRuns[char].fastestMs = run.totalTimeMs;
            }
        }

        this.saveAllTimeStats();
    }

    /**
     * Get all-time stats summary
     */
    getAllTimeStats() {
        return { ...this.allTimeStats };
    }

    /**
     * Calculate weekly challenge score (can be customized each week)
     * Current challenge: Fastest deathless run
     */
    getWeeklyScore() {
        // Weekly challenge rotates - this is a sample implementation
        // In production, this would check the current week's challenge type
        if (this.currentRun.completed && this.currentRun.deathless) {
            return this.currentRun.totalTimeMs;
        }
        return null; // Didn't qualify
    }

    /**
     * Get current week identifier (for weekly leaderboards)
     */
    static getWeekId() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const weekNumber = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    }
}
