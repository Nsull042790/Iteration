/**
 * ITERATION - Competitive Leaderboard System
 * 18 leaderboard types with Steam integration preparation
 *
 * Board Types:
 * - 8 Core Boards: Speedrun, Deathless, Furthest Level, Ghost Master,
 *                  Lowest Deaths, Boss Rush, Cycle Efficiency, Weekly Challenge
 * - 10 Character Speedruns: One per character (ECHO, BLITZ, etc.)
 */

class LeaderboardSystem {
    constructor() {
        this.maxEntriesPerBoard = 100;
        this.maxEntriesDisplay = 10;

        // Steam integration flag (set true when running in Electron with Steam SDK)
        this.steamEnabled = this.detectSteam();

        // Define all 18 leaderboard types
        this.boardDefinitions = {
            // Core Leaderboards
            speedrun: {
                name: 'SPEEDRUN (ANY%)',
                description: 'Fastest time to escape the simulation',
                sortOrder: 'asc', // Lower is better
                scoreType: 'time',
                requiresCompletion: true,
                steamName: 'speedrun_any'
            },
            deathless: {
                name: 'DEATHLESS',
                description: 'Fastest completion with zero deaths',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                requiresDeathless: true,
                steamName: 'deathless'
            },
            furthest_level: {
                name: 'FURTHEST LEVEL',
                description: 'Highest level reached',
                sortOrder: 'desc', // Higher is better
                scoreType: 'level',
                requiresCompletion: false,
                steamName: 'furthest_level'
            },
            ghost_master: {
                name: 'GHOST MASTER',
                description: 'Most ghosts interacted with in a single run',
                sortOrder: 'desc',
                scoreType: 'ghosts',
                requiresCompletion: false,
                steamName: 'ghost_master'
            },
            lowest_deaths: {
                name: 'LOWEST DEATHS',
                description: 'Completed with fewest deaths',
                sortOrder: 'asc',
                scoreType: 'deaths',
                requiresCompletion: true,
                steamName: 'lowest_deaths'
            },
            boss_rush: {
                name: 'BOSS RUSH',
                description: 'Fastest combined boss kill times',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                steamName: 'boss_rush'
            },
            cycle_efficiency: {
                name: 'CYCLE EFFICIENCY',
                description: 'Most cycles remaining at escape',
                sortOrder: 'desc',
                scoreType: 'cycles',
                requiresCompletion: true,
                steamName: 'cycle_efficiency'
            },
            weekly: {
                name: 'WEEKLY CHALLENGE',
                description: 'This week: Fastest deathless run',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                requiresDeathless: true,
                isWeekly: true,
                steamName: 'weekly_challenge'
            },

            // Character-Specific Speedruns
            speedrun_echo: {
                name: 'ECHO SPEEDRUN',
                description: 'Fastest escape as ECHO',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'echo',
                steamName: 'speedrun_echo'
            },
            speedrun_blitz: {
                name: 'BLITZ SPEEDRUN',
                description: 'Fastest escape as BLITZ',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'blitz',
                steamName: 'speedrun_blitz'
            },
            speedrun_titan: {
                name: 'TITAN SPEEDRUN',
                description: 'Fastest escape as TITAN',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'titan',
                steamName: 'speedrun_titan'
            },
            speedrun_phantom: {
                name: 'PHANTOM SPEEDRUN',
                description: 'Fastest escape as PHANTOM',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'phantom',
                steamName: 'speedrun_phantom'
            },
            speedrun_nova: {
                name: 'NOVA SPEEDRUN',
                description: 'Fastest escape as NOVA',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'nova',
                steamName: 'speedrun_nova'
            },
            speedrun_havoc: {
                name: 'HAVOC SPEEDRUN',
                description: 'Fastest escape as HAVOC',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'havoc',
                steamName: 'speedrun_havoc'
            },
            speedrun_sage: {
                name: 'SAGE SPEEDRUN',
                description: 'Fastest escape as SAGE',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'sage',
                steamName: 'speedrun_sage'
            },
            speedrun_chrome: {
                name: 'CHROME SPEEDRUN',
                description: 'Fastest escape as CHROME',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'chrome',
                steamName: 'speedrun_chrome'
            },
            speedrun_void: {
                name: 'VOID SPEEDRUN',
                description: 'Fastest escape as VOID',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'void',
                steamName: 'speedrun_void'
            },
            speedrun_neon: {
                name: 'NEON SPEEDRUN',
                description: 'Fastest escape as NEON',
                sortOrder: 'asc',
                scoreType: 'time',
                requiresCompletion: true,
                character: 'neon',
                steamName: 'speedrun_neon'
            }
        };

        // Local storage for each board
        this.boards = {};
        this.loadAllBoards();

        // Current weekly challenge ID
        this.currentWeekId = RunStatsSystem.getWeekId();
    }

    /**
     * Detect if Steam is available
     */
    detectSteam() {
        // Check for Steam overlay or Steamworks SDK
        // In Electron, this would be injected by the main process
        if (typeof window !== 'undefined' && window.steamworks) {
            console.log('[LEADERBOARD] Steam integration detected');
            return true;
        }
        console.log('[LEADERBOARD] Running in local mode (no Steam)');
        return false;
    }

    /**
     * Load all boards from localStorage
     */
    loadAllBoards() {
        for (const boardId of Object.keys(this.boardDefinitions)) {
            this.boards[boardId] = this.loadBoard(boardId);
        }
    }

    /**
     * Load a single board from localStorage
     */
    loadBoard(boardId) {
        try {
            const key = `iteration_lb_${boardId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn(`[LEADERBOARD] Failed to load board ${boardId}:`, e);
        }
        return [];
    }

    /**
     * Save a board to localStorage
     */
    saveBoard(boardId) {
        try {
            const key = `iteration_lb_${boardId}`;
            const entries = this.boards[boardId].slice(0, this.maxEntriesPerBoard);
            localStorage.setItem(key, JSON.stringify(entries));
        } catch (e) {
            console.warn(`[LEADERBOARD] Failed to save board ${boardId}:`, e);
        }
    }

    /**
     * Submit a run to all applicable leaderboards
     * @param {Object} runStats - Stats from RunStatsSystem.getRunSummary()
     * @returns {Object} Results of all submissions
     */
    submitRun(runStats) {
        const results = {
            submissions: [],
            newRecords: [],
            improvements: []
        };

        // Check weekly challenge reset
        const currentWeek = RunStatsSystem.getWeekId();
        if (currentWeek !== this.currentWeekId) {
            this.resetWeeklyBoard();
            this.currentWeekId = currentWeek;
        }

        // Try to submit to each applicable board
        for (const [boardId, definition] of Object.entries(this.boardDefinitions)) {
            const result = this.trySubmitToBoard(boardId, definition, runStats);
            if (result.submitted) {
                results.submissions.push({
                    boardId,
                    boardName: definition.name,
                    rank: result.rank,
                    score: result.score,
                    isNewRecord: result.isNewRecord,
                    improved: result.improved
                });

                if (result.isNewRecord) {
                    results.newRecords.push(definition.name);
                }
                if (result.improved) {
                    results.improvements.push(definition.name);
                }
            }
        }

        console.log(`[LEADERBOARD] Run submitted to ${results.submissions.length} boards`);
        return results;
    }

    /**
     * Try to submit run to a specific board
     */
    trySubmitToBoard(boardId, definition, runStats) {
        // Check if run qualifies for this board
        if (!this.runQualifies(definition, runStats)) {
            return { submitted: false };
        }

        // Calculate score for this board
        const score = this.calculateBoardScore(boardId, definition, runStats);
        if (score === null) {
            return { submitted: false };
        }

        // Create entry
        const entry = {
            id: Date.now() + Math.random(),
            timestamp: runStats.timestamp,
            date: new Date().toLocaleDateString(),
            score: score,
            displayScore: this.formatScore(score, definition.scoreType),
            character: runStats.character.toUpperCase(),
            finalLevel: runStats.finalLevel,
            deaths: runStats.deaths,
            timeMs: runStats.timeMs,
            weekId: definition.isWeekly ? this.currentWeekId : null
        };

        // Check for personal best / improvement
        const existingBest = this.getPersonalBest(boardId);
        const improved = existingBest ? this.isBetterScore(score, existingBest.score, definition.sortOrder) : true;

        // Add to local board
        const board = this.boards[boardId];
        board.push(entry);

        // Sort based on board's sort order
        if (definition.sortOrder === 'asc') {
            board.sort((a, b) => a.score - b.score);
        } else {
            board.sort((a, b) => b.score - a.score);
        }

        // Trim to max entries
        this.boards[boardId] = board.slice(0, this.maxEntriesPerBoard);
        this.saveBoard(boardId);

        // Calculate rank
        const rank = this.boards[boardId].findIndex(e => e.id === entry.id) + 1;
        const isNewRecord = rank === 1;

        // Submit to Steam if available
        if (this.steamEnabled) {
            this.submitToSteam(definition.steamName, score);
        }

        return {
            submitted: true,
            rank,
            score,
            isNewRecord,
            improved
        };
    }

    /**
     * Check if run qualifies for a board
     */
    runQualifies(definition, runStats) {
        // Check completion requirement
        if (definition.requiresCompletion && !runStats.completed) {
            return false;
        }

        // Check deathless requirement
        if (definition.requiresDeathless && !runStats.deathless) {
            return false;
        }

        // Check character requirement
        if (definition.character && runStats.character.toLowerCase() !== definition.character) {
            return false;
        }

        return true;
    }

    /**
     * Calculate score for a specific board
     */
    calculateBoardScore(boardId, definition, runStats) {
        switch (boardId) {
            case 'speedrun':
            case 'deathless':
            case 'weekly':
                return runStats.timeMs;

            case 'furthest_level':
                return runStats.finalLevel;

            case 'ghost_master':
                return runStats.totalGhostInteractions;

            case 'lowest_deaths':
                return runStats.deaths;

            case 'boss_rush':
                return runStats.totalBossTimeMs;

            case 'cycle_efficiency':
                return runStats.finalCycles;

            // Character speedruns
            default:
                if (boardId.startsWith('speedrun_')) {
                    return runStats.timeMs;
                }
                return null;
        }
    }

    /**
     * Format score for display
     */
    formatScore(score, scoreType) {
        switch (scoreType) {
            case 'time':
                return this.formatTime(score);
            case 'level':
                return `Level ${score}`;
            case 'ghosts':
                return `${score} ghosts`;
            case 'deaths':
                return score === 0 ? 'DEATHLESS' : `${score} death${score !== 1 ? 's' : ''}`;
            case 'cycles':
                return `${score} cycles`;
            default:
                return score.toString();
        }
    }

    /**
     * Format time in milliseconds to display string
     */
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const milliseconds = ms % 1000;
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${Math.floor(milliseconds / 10).toString().padStart(2, '0')}`;
    }

    /**
     * Check if score A is better than score B
     */
    isBetterScore(scoreA, scoreB, sortOrder) {
        if (sortOrder === 'asc') {
            return scoreA < scoreB;
        }
        return scoreA > scoreB;
    }

    /**
     * Get personal best for a board
     */
    getPersonalBest(boardId) {
        const board = this.boards[boardId];
        if (!board || board.length === 0) return null;

        // In local mode, all entries are "personal"
        // With Steam, we'd filter by player ID
        return board[0];
    }

    /**
     * Get top entries for a board
     */
    getTopEntries(boardId, count = 10) {
        const board = this.boards[boardId] || [];
        return board.slice(0, Math.min(count, this.maxEntriesDisplay));
    }

    /**
     * Get all board IDs
     */
    getBoardIds() {
        return Object.keys(this.boardDefinitions);
    }

    /**
     * Get board definition
     */
    getBoardDefinition(boardId) {
        return this.boardDefinitions[boardId] || null;
    }

    /**
     * Get core board IDs (non-character specific)
     */
    getCoreBoards() {
        return ['speedrun', 'deathless', 'furthest_level', 'ghost_master',
                'lowest_deaths', 'boss_rush', 'cycle_efficiency', 'weekly'];
    }

    /**
     * Get character speedrun board IDs
     */
    getCharacterBoards() {
        return Object.keys(this.boardDefinitions).filter(id => id.startsWith('speedrun_'));
    }

    /**
     * Reset weekly board
     */
    resetWeeklyBoard() {
        console.log('[LEADERBOARD] Resetting weekly challenge board');
        this.boards['weekly'] = [];
        this.saveBoard('weekly');
    }

    /**
     * Submit score to Steam leaderboard
     */
    submitToSteam(steamName, score) {
        if (!this.steamEnabled || !window.steamworks) return;

        try {
            // Steam Leaderboards API call
            // This would be implemented via Steamworks SDK in Electron
            window.steamworks.submitLeaderboardScore(steamName, score);
            console.log(`[STEAM] Submitted score ${score} to ${steamName}`);
        } catch (e) {
            console.warn(`[STEAM] Failed to submit to ${steamName}:`, e);
        }
    }

    /**
     * Fetch Steam leaderboard entries (async)
     */
    async fetchSteamLeaderboard(boardId, count = 10) {
        if (!this.steamEnabled || !window.steamworks) {
            return this.getTopEntries(boardId, count);
        }

        try {
            const definition = this.boardDefinitions[boardId];
            if (!definition) return [];

            const steamEntries = await window.steamworks.getLeaderboardEntries(
                definition.steamName,
                count
            );

            return steamEntries.map(e => ({
                rank: e.rank,
                playerName: e.playerName,
                score: e.score,
                displayScore: this.formatScore(e.score, definition.scoreType)
            }));
        } catch (e) {
            console.warn(`[STEAM] Failed to fetch leaderboard ${boardId}:`, e);
            return this.getTopEntries(boardId, count);
        }
    }

    /**
     * Get summary stats for display
     */
    getSummaryStats() {
        return {
            totalBoards: Object.keys(this.boardDefinitions).length,
            coreBoards: this.getCoreBoards().length,
            characterBoards: this.getCharacterBoards().length,
            steamEnabled: this.steamEnabled,
            currentWeek: this.currentWeekId
        };
    }

    // === LEGACY COMPATIBILITY ===
    // Keep old methods working for existing code

    /**
     * Add entry (legacy compatibility)
     */
    addEntry(data) {
        // Create a simplified run stats object from old format
        const runStats = {
            character: data.character || 'echo',
            timestamp: Date.now(),
            timeMs: 0, // Not tracked in old format
            completed: false,
            finalLevel: data.level || 1,
            deaths: 0,
            deathless: false,
            totalGhostInteractions: 0,
            totalBossTimeMs: 0,
            finalCycles: 0,
            totalKills: data.kills || 0
        };

        // Only submit to furthest_level for legacy entries
        const board = this.boards['furthest_level'];
        const entry = {
            id: Date.now(),
            timestamp: Date.now(),
            date: new Date().toLocaleDateString(),
            score: data.level || 1,
            displayScore: `Level ${data.level || 1}`,
            character: (data.character || 'ECHO').toUpperCase(),
            finalLevel: data.level || 1,
            deaths: 0,
            timeMs: 0
        };

        board.push(entry);
        board.sort((a, b) => b.score - a.score);
        this.boards['furthest_level'] = board.slice(0, this.maxEntriesPerBoard);
        this.saveBoard('furthest_level');

        const rank = this.boards['furthest_level'].findIndex(e => e.id === entry.id) + 1;
        return { entry, rank, isHighScore: rank <= 10 };
    }

    /**
     * Get top entries (legacy compatibility)
     */
    getTopEntriesLegacy(count = 10) {
        // Return furthest_level entries in old format
        return this.boards['furthest_level'].slice(0, count).map(e => ({
            id: e.id,
            date: e.date,
            level: e.finalLevel,
            kills: 0,
            character: e.character,
            bladeTier: 'UNKNOWN',
            score: e.finalLevel * 100,
            dataCoresEarned: 0
        }));
    }

    /**
     * Get best run (legacy compatibility)
     */
    getBestRun() {
        const entries = this.boards['furthest_level'];
        return entries[0] || null;
    }

    /**
     * Get total stats (legacy compatibility)
     */
    getTotalStats() {
        const entries = this.boards['furthest_level'];
        return {
            totalRuns: entries.length,
            totalKills: 0,
            highestLevel: entries.length > 0 ? Math.max(...entries.map(e => e.finalLevel)) : 0,
            bestScore: entries.length > 0 ? entries[0].score * 100 : 0
        };
    }

    /**
     * Clear all boards
     */
    clear() {
        for (const boardId of Object.keys(this.boards)) {
            this.boards[boardId] = [];
            this.saveBoard(boardId);
        }
    }
}
