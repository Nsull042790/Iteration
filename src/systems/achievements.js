/**
 * ITERATION - Achievement System
 *
 * Single source of truth for achievement definitions, lifetime counters,
 * unlock state, and Data Core payouts. The title-screen modal renders from
 * this list, and gameplay code reports events via count()/unlock()/checkMeta().
 *
 * Designed to map 1:1 onto Steam Achievements later: ids are stable strings
 * and unlocks are idempotent.
 */

class AchievementSystem {
    constructor() {
        // cores = Data Core payout on unlock
        this.definitions = [
            // --- Combat ---
            { id: 'first_blood', name: 'FIRST BLOOD', desc: 'Kill your first enemy', icon: '⚔️', cores: 25 },
            { id: 'kill_100', name: 'CENTURION', desc: 'Kill 100 enemies total', icon: '💀', cores: 75 },
            { id: 'kill_1000', name: 'MASSACRE', desc: 'Kill 1000 enemies total', icon: '☠️', cores: 250 },
            { id: 'streak_10', name: 'COMBO STARTER', desc: 'Get a 10 kill streak', icon: '🔥', cores: 50 },
            { id: 'streak_50', name: 'UNSTOPPABLE', desc: 'Get a 50 kill streak', icon: '💥', cores: 300 },
            { id: 'combo_10', name: 'CHAIN REACTION', desc: 'Reach a 10x combo', icon: '🔗', cores: 50 },
            { id: 'combo_30', name: 'FLOW STATE', desc: 'Reach a 30x combo', icon: '🌊', cores: 200 },
            { id: 'blade_max', name: 'TRANSCENDED', desc: 'Evolve your blade to its final form', icon: '🗡️', cores: 200 },

            // --- Hostiles ---
            { id: 'elite_first', name: 'CORRUPTION PURGED', desc: 'Destroy your first elite', icon: '🔺', cores: 50 },
            { id: 'elite_hunter', name: 'ELITE HUNTER', desc: 'Destroy 25 elites', icon: '🎯', cores: 200 },
            { id: 'shield_breaker', name: 'SHIELD BREAKER', desc: 'Shatter 25 AEGIS shields', icon: '🛡️', cores: 150 },

            // --- Bosses ---
            { id: 'boss_kill', name: 'BOSS SLAYER', desc: 'Defeat a boss', icon: '👑', cores: 50 },
            { id: 'boss_no_hit', name: 'PERFECT KILL', desc: 'Defeat a boss without taking damage', icon: '✨', cores: 150 },
            { id: 'boss_rush_complete', name: 'THE GAUNTLET', desc: 'Complete Boss Rush', icon: '⚡', cores: 400 },

            // --- Mobility ---
            { id: 'dash_master', name: 'PHASE RUNNER', desc: 'Dash 200 times', icon: '💨', cores: 100 },
            { id: 'wall_runner', name: 'WALL RUNNER', desc: 'Wall jump 50 times', icon: '🧗', cores: 100 },

            // --- Journey ---
            { id: 'reach_zone_2', name: 'DEEPER', desc: 'Reach Zone 2', icon: '📍', cores: 50 },
            { id: 'reach_zone_3', name: 'RESTRICTED', desc: 'Reach Zone 3', icon: '🚫', cores: 100 },
            { id: 'reach_zone_4', name: 'THE CORE', desc: 'Reach Zone 4', icon: '🌀', cores: 200 },
            { id: 'no_hit_zone', name: 'UNTOUCHABLE', desc: 'Clear a zone without taking damage', icon: '🛡️', cores: 300 },
            { id: 'speedrun_zone', name: 'SPEEDRUNNER', desc: 'Clear a zone in under 4 minutes', icon: '⚡', cores: 200 },
            { id: 'victory', name: 'BREAK THE LOOP', desc: 'Complete the game', icon: '🏆', cores: 500 },
            { id: 'secret_ending', name: 'TRUTH SEEKER', desc: 'Discover the secret ending', icon: '🔮', cores: 500, secret: true },

            // --- Persistence ---
            { id: 'die_once', name: 'LEARNING CURVE', desc: 'Die for the first time', icon: '💔', cores: 25 },
            { id: 'die_100', name: 'PERSISTENT', desc: 'Die 100 times', icon: '🔄', cores: 250 },
            { id: 'cycles_5000', name: 'HOARDER', desc: 'Hold 5000 cycles at once', icon: '💎', cores: 150 },

            // --- Collection ---
            { id: 'unlock_char', name: 'RECRUITMENT', desc: 'Unlock a new operative', icon: '👤', cores: 75 },
            { id: 'unlock_all_chars', name: 'FULL ROSTER', desc: 'Unlock all operatives', icon: '👥', cores: 500 },
            { id: 'collect_hat', name: 'FASHIONISTA', desc: 'Collect a hat', icon: '🎩', cores: 50 },
            { id: 'collect_suit', name: 'SUITED UP', desc: 'Collect a suit', icon: '👔', cores: 50 }
        ];

        // Unlocked ids (shares the storage key the modal already used)
        this.unlocked = this.loadJSON('iteration_achievements', []);

        // Lifetime counters that survive runs
        this.counters = Object.assign({
            kills: 0, deaths: 0, dashes: 0, wallJumps: 0,
            shieldsBroken: 0, elitesKilled: 0, bossKills: 0
        }, this.loadJSON('iteration_achievement_counters', {}));

        // Toast queue consumed by the HUD
        this.toastQueue = [];
    }

    loadJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    save() {
        try {
            localStorage.setItem('iteration_achievements', JSON.stringify(this.unlocked));
            localStorage.setItem('iteration_achievement_counters', JSON.stringify(this.counters));
        } catch (e) {}
    }

    isUnlocked(id) {
        return this.unlocked.includes(id);
    }

    getDefinition(id) {
        return this.definitions.find(d => d.id === id);
    }

    /**
     * Unlock an achievement (idempotent). Awards Data Cores and queues a toast.
     */
    unlock(id, game) {
        if (this.isUnlocked(id)) return false;
        const def = this.getDefinition(id);
        if (!def) return false;

        this.unlocked.push(id);
        this.save();

        // Pay out Data Cores into meta progression
        if (game && game.metaProgression) {
            game.metaProgression.dataCores += def.cores;
            game.metaProgression.totalDataCoresEarned =
                (game.metaProgression.totalDataCoresEarned || 0) + def.cores;
            game.metaProgression.saveToStorage();
        }

        this.toastQueue.push({ name: def.name, icon: def.icon, cores: def.cores, timer: 300 });
        if (game && game.audio && game.audio.playLevelUp) {
            game.audio.playLevelUp();
        }
        console.log(`[ACHIEVEMENT] Unlocked: ${def.name} (+${def.cores} cores)`);
        return true;
    }

    /**
     * Bump a lifetime counter and evaluate its thresholds.
     */
    count(key, game, n = 1) {
        this.counters[key] = (this.counters[key] || 0) + n;
        this.save();
        this.checkCounters(game);
    }

    /**
     * Counter-threshold achievements.
     */
    checkCounters(game) {
        const c = this.counters;
        if (c.kills >= 1) this.unlock('first_blood', game);
        if (c.kills >= 100) this.unlock('kill_100', game);
        if (c.kills >= 1000) this.unlock('kill_1000', game);
        if (c.deaths >= 1) this.unlock('die_once', game);
        if (c.deaths >= 100) this.unlock('die_100', game);
        if (c.dashes >= 200) this.unlock('dash_master', game);
        if (c.wallJumps >= 50) this.unlock('wall_runner', game);
        if (c.shieldsBroken >= 25) this.unlock('shield_breaker', game);
        if (c.elitesKilled >= 1) this.unlock('elite_first', game);
        if (c.elitesKilled >= 25) this.unlock('elite_hunter', game);
        if (c.bossKills >= 1) this.unlock('boss_kill', game);
    }

    /**
     * Slow-changing meta checks (characters, cosmetics, cycles, streaks).
     * Called at natural checkpoints: kills, level complete, death, title.
     */
    checkMeta(game) {
        if (!game) return;

        // Kill streak / combo
        if (game.currentKillStreak >= 10) this.unlock('streak_10', game);
        if (game.currentKillStreak >= 50) this.unlock('streak_50', game);
        if (game.comboCount >= 10) this.unlock('combo_10', game);
        if (game.comboCount >= 30) this.unlock('combo_30', game);

        // Cycle hoard
        if (game.cycles && game.cycles.getCycles() >= 5000) this.unlock('cycles_5000', game);

        // Blade final form
        if (game.bladeEvolution) {
            const tiers = game.bladeEvolution.tiers || [];
            const idx = game.bladeEvolution.currentTier;
            if (tiers.length && typeof idx === 'number' && idx >= tiers.length - 1) {
                this.unlock('blade_max', game);
            }
        }

        // Zones
        if (game.currentZoneIndex >= 1) this.unlock('reach_zone_2', game);
        if (game.currentZoneIndex >= 2) this.unlock('reach_zone_3', game);
        if (game.currentZoneIndex >= 3) this.unlock('reach_zone_4', game);

        // Characters beyond the 3 starters
        if (game.characterSystem) {
            const chars = game.characterSystem.characters || [];
            const unlockedCount = chars.filter(ch => game.characterSystem.isUnlocked(ch.id)).length;
            if (unlockedCount > 3) this.unlock('unlock_char', game);
            if (chars.length > 0 && unlockedCount >= chars.length) this.unlock('unlock_all_chars', game);
        }

        // Cosmetics (first hat / suit beyond defaults)
        if (game.cosmeticsSystem) {
            const cs = game.cosmeticsSystem;
            const owned = (list) => (list || []).filter(x => x && x !== 'none' && x !== 'default').length;
            if (owned(cs.unlockedHats) > 0) this.unlock('collect_hat', game);
            if (owned(cs.unlockedSuits) > 0) this.unlock('collect_suit', game);
        }
    }

    /**
     * Progress readout for the modal (counter-based achievements show x/y).
     */
    getProgress(id) {
        const c = this.counters;
        const map = {
            kill_100: [c.kills, 100], kill_1000: [c.kills, 1000],
            die_100: [c.deaths, 100],
            dash_master: [c.dashes, 200], wall_runner: [c.wallJumps, 50],
            shield_breaker: [c.shieldsBroken, 25], elite_hunter: [c.elitesKilled, 25]
        };
        return map[id] || null;
    }

    /**
     * Tick + hand the current toast to the HUD (null when idle).
     */
    updateToast() {
        if (this.toastQueue.length === 0) return null;
        const toast = this.toastQueue[0];
        toast.timer--;
        if (toast.timer <= 0) this.toastQueue.shift();
        return toast;
    }
}

if (typeof window !== 'undefined') {
    window.AchievementSystem = AchievementSystem;
}
