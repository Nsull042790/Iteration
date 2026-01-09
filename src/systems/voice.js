/**
 * ITERATION - AXIOM Voice System
 * Narrator voice lines triggered at key game moments
 */

class VoiceSystem {
    constructor(audioSystem) {
        this.audio = audioSystem;
        this.enabled = true;
        this.volume = 0.8;
        this.currentVoice = null;
        this.queue = [];
        this.isPlaying = false;

        // Track what's been played this run to avoid repetition
        this.playedThisRun = new Set();
        this.playedEver = this.loadPlayedHistory();

        // Track game state for contextual lines
        this.deathCount = 0;
        this.runCount = this.loadRunCount();
        this.hasSeenIntro = this.loadHasSeenIntro();

        // Voice line mappings (file number -> event)
        // Based on the script order - 116 clips from split audio
        this.lines = {
            // INTRO (1-18) - "You weren't supposed to wake up" through "only way out"
            intro: this.range(1, 18),

            // FIRST RUN - Initialization (19-26)
            firstSpawn: [19, 20],        // "Initialization complete"
            firstKill: [21, 22],         // "Yes. Fight."
            firstDeath: [23, 24],        // "Unexpected? This is your purpose"
            firstProgress: [25, 26],     // "You've made it further"

            // RESPAWN LINES (27-36)
            respawn: this.range(27, 36),

            // GHOST ENCOUNTER (37-40)
            ghostEncounter: this.range(37, 40),

            // COMBAT LINES (41-46)
            killStreak: [41, 42],        // "Impressive efficiency"
            lowHealth: [43, 44],         // "Careful, anomaly"

            // ZONE TRANSITIONS (45-52)
            zone2: [45, 46, 47],         // "Deeper now"
            zone3: [48, 49, 50],         // "Restricted sectors"
            zone4: [51, 52],             // "You feel it"

            // BOSS LINES (53-62)
            bossSpawn: [53, 54, 55],     // "A guardian protocol"
            bossPhase2: [56, 57],        // "It adapts"
            bossDamageless: [58, 59],    // "Anomalous performance"
            bossDefeat: [60, 61, 62],    // "The system learns"

            // FINAL BOSS (63-78)
            finalBossIntro: this.range(63, 78),

            // VICTORY ENDING A (79-90)
            victoryA: this.range(79, 90),

            // SECRET ENDING B (91-102)
            victoryB: this.range(91, 102),

            // DEATH QUOTES (103-116)
            death: this.range(103, 116)
        };

        // Preload critical voice lines
        this.preloadLines(['intro', 'firstSpawn', 'death', 'respawn']);
    }

    /**
     * Helper to create range of numbers
     */
    range(start, end) {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }

    /**
     * Get file path for a voice line number
     */
    getFilePath(num) {
        const padded = num.toString().padStart(2, '0');
        return `assets/audio/voice/axiom/Axiom-${padded}.ogg`;
    }

    /**
     * Preload voice lines for faster playback
     */
    preloadLines(categories) {
        categories.forEach(cat => {
            const lines = this.lines[cat];
            if (lines) {
                lines.forEach(num => {
                    const path = this.getFilePath(num);
                    // Create audio element to preload
                    const audio = new Audio(path);
                    audio.preload = 'auto';
                });
            }
        });
    }

    /**
     * Play a specific voice line by number
     */
    playLine(num, priority = false) {
        if (!this.enabled) return;

        const path = this.getFilePath(num);

        if (priority && this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice = null;
        }

        if (this.isPlaying && !priority) {
            this.queue.push(num);
            return;
        }

        this.isPlaying = true;
        this.currentVoice = new Audio(path);
        this.currentVoice.volume = this.volume;

        this.currentVoice.onended = () => {
            this.isPlaying = false;
            this.currentVoice = null;
            this.playNext();
        };

        this.currentVoice.onerror = () => {
            console.warn(`Voice line not found: ${path}`);
            this.isPlaying = false;
            this.currentVoice = null;
            this.playNext();
        };

        this.currentVoice.play().catch(e => {
            console.warn('Voice playback failed:', e);
            this.isPlaying = false;
        });
    }

    /**
     * Play next queued line
     */
    playNext() {
        if (this.queue.length > 0) {
            const next = this.queue.shift();
            this.playLine(next);
        }
    }

    /**
     * Play a random line from a category
     */
    playRandom(category, options = {}) {
        if (!this.enabled) return;

        const lines = this.lines[category];
        if (!lines || lines.length === 0) return;

        // Filter out recently played if requested
        let available = lines;
        if (options.noRepeat) {
            available = lines.filter(n => !this.playedThisRun.has(n));
            if (available.length === 0) {
                this.playedThisRun.clear();
                available = lines;
            }
        }

        const num = available[Math.floor(Math.random() * available.length)];
        this.playedThisRun.add(num);
        this.playLine(num, options.priority);
    }

    /**
     * Play a sequence of lines (for cutscenes/intros)
     */
    playSequence(category, onComplete) {
        if (!this.enabled) {
            if (onComplete) onComplete();
            return;
        }

        const lines = this.lines[category];
        if (!lines || lines.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        let index = 0;

        const playNext = () => {
            if (index >= lines.length) {
                if (onComplete) onComplete();
                return;
            }

            const path = this.getFilePath(lines[index]);
            this.currentVoice = new Audio(path);
            this.currentVoice.volume = this.volume;

            this.currentVoice.onended = () => {
                index++;
                // Small delay between lines
                setTimeout(playNext, 300);
            };

            this.currentVoice.onerror = () => {
                index++;
                playNext();
            };

            this.currentVoice.play().catch(() => {
                index++;
                playNext();
            });
        };

        playNext();
    }

    /**
     * Stop current voice line
     */
    stop() {
        if (this.currentVoice) {
            this.currentVoice.pause();
            this.currentVoice = null;
        }
        this.isPlaying = false;
        this.queue = [];
    }

    // ==========================================
    // GAME EVENT TRIGGERS
    // ==========================================

    /**
     * Called when game first starts (title screen)
     */
    onGameStart() {
        // Don't play intro every time - just first time or rarely
        if (!this.hasSeenIntro) {
            this.hasSeenIntro = true;
            this.saveHasSeenIntro();
            // Play first intro line
            this.playLine(1);
        }
    }

    /**
     * Called when player spawns into a run
     */
    onSpawn(isFirstRun) {
        if (isFirstRun || this.runCount <= 1) {
            this.playRandom('firstSpawn');
        } else if (this.deathCount > 0) {
            // Respawn after death
            this.playRandom('respawn', { noRepeat: true });
        }
    }

    /**
     * Called on player's first kill
     */
    onFirstKill() {
        if (this.runCount <= 3) {
            this.playRandom('firstKill');
        }
    }

    /**
     * Called when player gets a high kill streak
     */
    onKillStreak(streak) {
        if (streak >= 20 && streak % 10 === 0) {
            this.playRandom('killStreak');
        }
    }

    /**
     * Called when player health is critical
     */
    onLowHealth() {
        if (Math.random() < 0.3) { // 30% chance
            this.playRandom('lowHealth');
        }
    }

    /**
     * Called when player encounters a ghost
     */
    onGhostEncounter() {
        if (Math.random() < 0.2) { // 20% chance
            this.playRandom('ghostEncounter');
        }
    }

    /**
     * Called when entering a new zone
     */
    onZoneEnter(zoneIndex) {
        switch (zoneIndex) {
            case 1:
                this.playRandom('zone2', { priority: true });
                break;
            case 2:
                this.playRandom('zone3', { priority: true });
                break;
            case 3:
                this.playRandom('zone4', { priority: true });
                break;
        }
    }

    /**
     * Called when a boss spawns
     */
    onBossSpawn(isFinalBoss) {
        if (isFinalBoss) {
            this.playSequence('finalBossIntro');
        } else {
            this.playRandom('bossSpawn', { priority: true });
        }
    }

    /**
     * Called when boss enters phase 2
     */
    onBossPhase2() {
        this.playRandom('bossPhase2');
    }

    /**
     * Called when player beats a boss without taking damage
     */
    onDamagelessBoss() {
        this.playRandom('bossDamageless', { priority: true });
    }

    /**
     * Called when player defeats a boss
     */
    onBossDefeat() {
        this.playRandom('bossDefeat');
    }

    /**
     * Called when player dies
     */
    onDeath() {
        this.deathCount++;
        this.playRandom('death', { priority: true, noRepeat: true });
    }

    /**
     * Called when player beats the game
     */
    onVictory(isSecretEnding) {
        this.stop(); // Stop any current voice
        if (isSecretEnding) {
            this.playSequence('victoryB');
        } else {
            this.playSequence('victoryA');
        }
    }

    /**
     * Reset for new run
     */
    resetRun() {
        this.playedThisRun.clear();
        this.runCount++;
        this.saveRunCount();
    }

    // ==========================================
    // PERSISTENCE
    // ==========================================

    loadPlayedHistory() {
        try {
            return new Set(JSON.parse(localStorage.getItem('iteration_voice_played') || '[]'));
        } catch (e) {
            return new Set();
        }
    }

    savePlayedHistory() {
        try {
            localStorage.setItem('iteration_voice_played', JSON.stringify([...this.playedEver]));
        } catch (e) {}
    }

    loadRunCount() {
        try {
            return parseInt(localStorage.getItem('iteration_run_count') || '0');
        } catch (e) {
            return 0;
        }
    }

    saveRunCount() {
        try {
            localStorage.setItem('iteration_run_count', this.runCount.toString());
        } catch (e) {}
    }

    loadHasSeenIntro() {
        try {
            return localStorage.getItem('iteration_seen_intro') === 'true';
        } catch (e) {
            return false;
        }
    }

    saveHasSeenIntro() {
        try {
            localStorage.setItem('iteration_seen_intro', 'true');
        } catch (e) {}
    }

    /**
     * Toggle voice on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stop();
        }
        return this.enabled;
    }

    /**
     * Set volume (0-1)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.currentVoice) {
            this.currentVoice.volume = this.volume;
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceSystem;
}
