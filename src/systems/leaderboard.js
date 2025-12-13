/**
 * ITERATION - Leaderboard System
 * Local high scores storage and display
 */

class LeaderboardSystem {
    constructor() {
        this.maxEntries = 10;
        this.entries = [];

        // Load from storage
        this.loadFromStorage();
    }

    /**
     * Load leaderboard from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('iteration_leaderboard');
            if (saved) {
                this.entries = JSON.parse(saved);
            }
        } catch (e) {
            console.log('Could not load leaderboard from storage');
            this.entries = [];
        }
    }

    /**
     * Save leaderboard to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('iteration_leaderboard', JSON.stringify(this.entries));
        } catch (e) {
            console.log('Could not save leaderboard to storage');
        }
    }

    /**
     * Add a new score entry
     */
    addEntry(data) {
        const entry = {
            id: Date.now(),
            date: new Date().toLocaleDateString(),
            level: data.level || 1,
            kills: data.kills || 0,
            character: data.character || 'ECHO',
            bladeTier: data.bladeTier || 'BASIC',
            score: this.calculateScore(data),
            dataCoresEarned: data.dataCoresEarned || 0
        };

        this.entries.push(entry);

        // Sort by score descending
        this.entries.sort((a, b) => b.score - a.score);

        // Keep only top entries
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }

        this.saveToStorage();

        // Return rank (1-based)
        const rank = this.entries.findIndex(e => e.id === entry.id) + 1;
        return { entry, rank, isHighScore: rank <= this.maxEntries };
    }

    /**
     * Calculate score from run data
     */
    calculateScore(data) {
        // Score formula: level * 100 + kills * 10
        let score = (data.level || 1) * 100;
        score += (data.kills || 0) * 10;
        return score;
    }

    /**
     * Get top entries
     */
    getTopEntries(count = 10) {
        return this.entries.slice(0, count);
    }

    /**
     * Check if score would be a new high score
     */
    isHighScore(score) {
        if (this.entries.length < this.maxEntries) return true;
        return score > this.entries[this.entries.length - 1].score;
    }

    /**
     * Clear all entries (reset leaderboard)
     */
    clear() {
        this.entries = [];
        this.saveToStorage();
    }

    /**
     * Get player's best run
     */
    getBestRun() {
        return this.entries[0] || null;
    }

    /**
     * Get total stats across all runs
     */
    getTotalStats() {
        return {
            totalRuns: this.entries.length,
            totalKills: this.entries.reduce((sum, e) => sum + e.kills, 0),
            highestLevel: Math.max(...this.entries.map(e => e.level), 0),
            bestScore: this.entries[0]?.score || 0
        };
    }
}
