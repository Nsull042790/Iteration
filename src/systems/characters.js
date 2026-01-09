/**
 * ITERATION - Character System
 * Unlockable operatives with unique passives
 */

class CharacterSystem {
    constructor() {
        this.selectedCharacter = 'echo';  // Default

        // All playable characters
        this.characters = [
            // ============================================
            // STARTER TIER (Free from start)
            // ============================================
            {
                id: 'echo',
                name: 'ECHO',
                subtitle: 'The Baseline',
                description: 'The template. Pure skill, no gimmicks.',
                tier: 'starter',
                stats: {
                    health: 100,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1000
                },
                color: '#00f0ff',
                secondaryColor: '#0088aa',
                eyeColor: '#ffffff',
                style: 'default',
                special: {
                    name: 'NONE',
                    description: 'No passive — pure skill',
                    passive: 'none'
                }
            },
            {
                id: 'blitz',
                name: 'BLITZ',
                subtitle: 'The Speedster',
                description: 'Speed is survival. Gotta go fast.',
                tier: 'starter',
                stats: {
                    health: 70,
                    damage: 100,
                    speed: 140,
                    attackSpeed: 100,
                    startingCycles: 800
                },
                color: '#0066ff',
                secondaryColor: '#0044aa',
                eyeColor: '#ffffff',
                style: 'round',
                special: {
                    name: 'MOMENTUM',
                    description: 'Movement costs 0 cycles above 50% HP',
                    passive: 'momentum'
                }
            },
            {
                id: 'titan',
                name: 'TITAN',
                subtitle: 'The Tank',
                description: 'Slow but unstoppable. Outlast everything.',
                tier: 'starter',
                stats: {
                    health: 150,
                    damage: 100,
                    speed: 75,
                    attackSpeed: 100,
                    startingCycles: 1200
                },
                color: '#ff4400',
                secondaryColor: '#aa2200',
                eyeColor: '#ffff00',
                style: 'bulky',
                special: {
                    name: 'FORTIFIED',
                    description: 'Taking damage costs 50% fewer cycles',
                    passive: 'fortified',
                    cycleDamageReduction: 0.50
                }
            },

            // ============================================
            // TIER 1 — Beat Zone 2 (Reach Level 6)
            // ============================================
            {
                id: 'phantom',
                name: 'PHANTOM',
                subtitle: 'The Assassin',
                description: 'Strike from the shadows. First strike devastates.',
                tier: 'tier1',
                stats: {
                    health: 60,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 900
                },
                color: '#8800aa',
                secondaryColor: '#440066',
                eyeColor: '#ff00ff',
                style: 'slim',
                special: {
                    name: 'BACKSTAB PROTOCOL',
                    description: '3x damage from behind. First hit per room is crit.',
                    passive: 'backstab',
                    backstabMultiplier: 3.0,
                    firstHitCrit: true
                }
            },
            {
                id: 'nova',
                name: 'NOVA',
                subtitle: 'The Glass Cannon',
                description: 'Evolve fast, but mistakes cost progress.',
                tier: 'tier1',
                stats: {
                    health: 50,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1000
                },
                color: '#00ff88',
                secondaryColor: '#00aa55',
                eyeColor: '#ffffff',
                style: 'armored',
                special: {
                    name: 'OVERCHARGE',
                    description: '2x blade evolution. Damage resets 10% progress.',
                    passive: 'overcharge',
                    evolutionMultiplier: 2.0,
                    damageEvolutionPenalty: 0.10
                }
            },
            {
                id: 'revenant',
                name: 'REVENANT',
                subtitle: 'The Ghost Walker',
                description: 'Your past deaths fight alongside you.',
                tier: 'tier1',
                stats: {
                    health: 80,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 900
                },
                color: '#66ffcc',
                secondaryColor: '#339988',
                eyeColor: '#00ff99',
                style: 'ethereal',
                special: {
                    name: 'DEATH ECHO',
                    description: 'Ghosts fight for you. Max 2 allies per room.',
                    passive: 'deathEcho',
                    maxGhostAllies: 2
                }
            },

            // ============================================
            // TIER 2 — Beat Zone 3 (Reach Level 9)
            // ============================================
            {
                id: 'havoc',
                name: 'HAVOC',
                subtitle: 'The Berserker',
                description: 'Pain is power. Low HP = high damage.',
                tier: 'tier2',
                stats: {
                    health: 80,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 700
                },
                color: '#ff0044',
                secondaryColor: '#aa0022',
                eyeColor: '#ffff00',
                style: 'aggressive',
                special: {
                    name: 'BLOOD RAGE',
                    description: '+5% damage per 10 HP missing. +50% at 1 HP.',
                    passive: 'bloodRage',
                    damagePerMissingHP: 0.05,
                    maxBonusDamage: 0.50
                }
            },
            {
                id: 'sage',
                name: 'SAGE',
                subtitle: 'The Predictor',
                description: 'See attacks before they happen.',
                tier: 'tier2',
                stats: {
                    health: 90,
                    damage: 100,
                    speed: 90,
                    attackSpeed: 100,
                    startingCycles: 1100
                },
                color: '#44ff00',
                secondaryColor: '#228800',
                eyeColor: '#ffffff',
                style: 'cloaked',
                special: {
                    name: 'PATTERN RECOGNITION',
                    description: 'See attack indicators 0.5s early. Slower adaptation.',
                    passive: 'patternRecognition',
                    indicatorBonus: 0.5,
                    adaptationDelay: 0.20
                }
            },
            {
                id: 'chrome',
                name: 'CHROME',
                subtitle: 'The Efficient',
                description: 'Maximum efficiency. Every cycle counts more.',
                tier: 'tier2',
                stats: {
                    health: 100,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1500
                },
                color: '#aaaaaa',
                secondaryColor: '#666666',
                eyeColor: '#ff0000',
                style: 'robotic',
                special: {
                    name: 'OPTIMIZED',
                    description: 'Actions cost 20% fewer cycles. Pickups give 50% more.',
                    passive: 'optimized',
                    cycleCostReduction: 0.20,
                    cyclePickupBonus: 0.50
                }
            },
            {
                id: 'paradox',
                name: 'PARADOX',
                subtitle: 'The Loop Breaker',
                description: 'Time bends around you. Death has memory.',
                tier: 'tier2',
                stats: {
                    health: 75,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1000
                },
                color: '#ff00ff',
                secondaryColor: '#8800ff',
                eyeColor: '#00ffff',
                style: 'glitched',
                special: {
                    name: 'DÉJÀ VU',
                    description: 'Death rooms: -30% enemies. Cleared rooms: +20% enemies.',
                    passive: 'dejaVu',
                    deathRoomDebuff: 0.30,
                    clearedRoomBuff: 0.20
                }
            },

            // ============================================
            // TIER 3 — Beat the Game
            // ============================================
            {
                id: 'void',
                name: 'VOID',
                subtitle: 'The Anomaly',
                description: 'Start at 1 HP. Consume ghosts to survive.',
                tier: 'tier3',
                stats: {
                    health: 1,  // Starts at 1, max 200
                    maxHealth: 200,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 600
                },
                color: '#1a0033',
                secondaryColor: '#330066',
                eyeColor: '#ff0000',
                accentColor: '#6600cc',
                style: 'void',
                special: {
                    name: 'CONSUME',
                    description: 'No natural HP. Absorb ALL ghosts for +20 HP each.',
                    passive: 'consume',
                    ghostAbsorbHP: 20,
                    forcedAbsorption: true
                }
            },
            {
                id: 'neon',
                name: 'NEON',
                subtitle: 'The Showoff',
                description: 'Style over substance. Variety is rewarded.',
                tier: 'tier3',
                stats: {
                    health: 90,
                    damage: 100,
                    speed: 115,
                    attackSpeed: 100,
                    startingCycles: 900
                },
                color: '#f222ff',
                secondaryColor: '#ffb347',
                eyeColor: '#00ffff',
                accentColor: '#ff6b6b',
                style: 'vapor',
                special: {
                    name: 'STYLE POINTS',
                    description: 'Varied attacks: +10 cycles. Same attack 3x: double cost.',
                    passive: 'stylePoints',
                    varietyBonus: 10,
                    repetitionPenalty: 2.0
                }
            },
            {
                id: 'martyr',
                name: 'MARTYR',
                subtitle: 'The Sacrifice',
                description: 'Death makes the next run stronger.',
                tier: 'tier3',
                stats: {
                    health: 100,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1000
                },
                color: '#ffcc00',
                secondaryColor: '#cc9900',
                eyeColor: '#ffffff',
                style: 'radiant',
                special: {
                    name: 'LEGACY',
                    description: 'On death: choose +5 HP, +50 cycles, or +5% damage. Stacks 5x.',
                    passive: 'legacy',
                    maxStacks: 5,
                    hpBonus: 5,
                    cycleBonus: 50,
                    damageBonus: 0.05
                }
            },

            // ============================================
            // SECRET TIER — True Mastery
            // ============================================
            {
                id: 'axiom',
                name: 'AXIOM',
                subtitle: 'The Simulation',
                description: 'See everything. The simulation adapts faster.',
                tier: 'secret',
                stats: {
                    health: 80,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 800
                },
                color: '#00ff00',
                secondaryColor: '#008800',
                eyeColor: '#00ff00',
                style: 'matrix',
                special: {
                    name: 'OMNISCIENCE',
                    description: 'See all HP, patterns, secrets. Adaptation 2x faster.',
                    passive: 'omniscience',
                    showEnemyHP: true,
                    showPatterns: true,
                    showSecrets: true,
                    adaptationMultiplier: 2.0
                }
            },
            {
                id: 'iteration0',
                name: 'ITERATION-0',
                subtitle: 'The First',
                description: 'The prototype. Collects passives from bosses.',
                tier: 'secret',
                stats: {
                    health: 100,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100,
                    startingCycles: 1000
                },
                color: '#ffffff',
                secondaryColor: '#cccccc',
                eyeColor: '#ffcc00',
                accentColor: '#ff0000',
                style: 'prime',
                special: {
                    name: 'PRIME DIRECTIVE',
                    description: 'Start with random passive. Bosses drop extra passive (max 4).',
                    passive: 'primeDirective',
                    startingPassive: true,
                    bossPassiveDrop: true,
                    maxPassives: 4
                }
            }
        ];

        // Character unlock conditions
        this.unlockConditions = {
            // STARTER TIER - Free
            echo: { unlocked: true, tier: 'starter', condition: 'Starter character' },
            blitz: { unlocked: true, tier: 'starter', condition: 'Starter character' },
            titan: { unlocked: true, tier: 'starter', condition: 'Starter character' },

            // TIER 1 - Beat Zone 2 (Level 6)
            phantom: {
                unlocked: false,
                tier: 'tier1',
                condition: 'Beat Level 6',
                hint: 'Survive deeper...',
                check: (stats) => stats.highestLevel >= 6,
                coreCost: 1500
            },
            nova: {
                unlocked: false,
                tier: 'tier1',
                condition: 'Kill 500 enemies',
                hint: 'Prove your efficiency...',
                check: (stats) => stats.totalKills >= 500,
                coreCost: 1500
            },
            revenant: {
                unlocked: false,
                tier: 'tier1',
                condition: 'Die 25 times',
                hint: 'Embrace the cycle...',
                check: (stats) => stats.totalDeaths >= 25,
                coreCost: 1500
            },

            // TIER 2 - Beat Zone 3 (Level 9)
            havoc: {
                unlocked: false,
                tier: 'tier2',
                condition: '30 kill streak',
                hint: 'Unleash the beast...',
                check: (stats) => stats.highestKillStreak >= 30,
                coreCost: 3000
            },
            sage: {
                unlocked: false,
                tier: 'tier2',
                condition: 'Beat a boss damageless',
                hint: 'Master the patterns...',
                check: (stats) => stats.damagelessBossKills >= 1,
                coreCost: 3000
            },
            chrome: {
                unlocked: false,
                tier: 'tier2',
                condition: 'Collect 50,000 cycles',
                hint: 'Harvest the data...',
                check: (stats) => stats.totalCyclesCollected >= 50000,
                coreCost: 3000
            },
            paradox: {
                unlocked: false,
                tier: 'tier2',
                condition: 'Die 3x in same room, then clear it',
                hint: 'Break the pattern...',
                check: (stats) => stats.paradoxUnlockAchieved >= 1,
                coreCost: 3000
            },

            // TIER 3 - Beat the Game
            void: {
                unlocked: false,
                tier: 'tier3',
                condition: 'Beat the game',
                hint: 'Break the loop...',
                check: (stats) => stats.wins >= 1,
                coreCost: 7500
            },
            neon: {
                unlocked: false,
                tier: 'tier3',
                condition: 'Beat game in under 20 min',
                hint: 'Speed is style...',
                check: (stats) => stats.fastestWin <= 1200, // 20 minutes in seconds
                coreCost: 7500
            },
            martyr: {
                unlocked: false,
                tier: 'tier3',
                condition: 'Die 100 times',
                hint: 'Embrace sacrifice...',
                check: (stats) => stats.totalDeaths >= 100,
                coreCost: 7500
            },

            // SECRET TIER - No purchase option
            axiom: {
                unlocked: false,
                tier: 'secret',
                condition: 'Die to each boss, then win',
                hint: 'Learn from every guardian...',
                check: (stats) => stats.diedToAllBosses && stats.wins >= 1,
                coreCost: null  // Cannot be purchased
            },
            iteration0: {
                unlocked: false,
                tier: 'secret',
                condition: 'Win with all other characters',
                hint: 'Master every form...',
                check: (stats) => stats.characterWins >= 14, // All except iteration0
                coreCost: null  // Cannot be purchased
            }
        };

        // Player stats for unlock tracking
        this.stats = {
            highestLevel: 0,
            totalDamageTaken: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalBossKills: 0,
            totalCyclesCollected: 0,
            wins: 0,
            fastestWin: Infinity,
            highestKillStreak: 0,
            damagelessBossKills: 0,
            paradoxUnlockAchieved: 0,
            diedToAllBosses: false,
            bossDeaths: {},  // Track which bosses killed you
            characterWins: 0,
            characterWinList: {},  // Track wins per character
            roomDeaths: {}  // Track deaths per room for PARADOX unlock
        };

        // Load unlock progress from storage
        this.loadUnlockProgress();
    }

    /**
     * Load unlock progress from localStorage
     */
    loadUnlockProgress() {
        try {
            const saved = localStorage.getItem('iteration_character_unlocks');
            if (saved) {
                const data = JSON.parse(saved);
                // Restore unlock states
                for (const [charId, state] of Object.entries(data.unlocks || {})) {
                    if (this.unlockConditions[charId]) {
                        this.unlockConditions[charId].unlocked = state;
                    }
                }
                // Restore stats
                this.stats = { ...this.stats, ...data.stats };
            }
        } catch (e) {
            console.log('Could not load character unlock progress');
        }
    }

    /**
     * Save unlock progress to localStorage
     */
    saveUnlockProgress() {
        try {
            const unlocks = {};
            for (const [charId, data] of Object.entries(this.unlockConditions)) {
                unlocks[charId] = data.unlocked;
            }
            const data = {
                unlocks,
                stats: this.stats
            };
            localStorage.setItem('iteration_character_unlocks', JSON.stringify(data));
        } catch (e) {
            console.log('Could not save character unlock progress');
        }
    }

    /**
     * Check if a character is unlocked
     */
    isUnlocked(charId) {
        return this.unlockConditions[charId]?.unlocked || false;
    }

    /**
     * Get unlock info for a character
     */
    getUnlockInfo(charId) {
        return this.unlockConditions[charId] || null;
    }

    /**
     * Unlock a character directly (for god mode / purchase)
     */
    unlockCharacter(charId) {
        if (this.unlockConditions[charId]) {
            this.unlockConditions[charId].unlocked = true;
            this.saveUnlockProgress();
            return true;
        }
        return false;
    }

    /**
     * Unlock all characters (god mode)
     */
    unlockAllCharacters() {
        for (const charId of Object.keys(this.unlockConditions)) {
            this.unlockConditions[charId].unlocked = true;
        }
        this.saveUnlockProgress();
    }

    /**
     * Lock all characters except starters (for testing)
     */
    resetUnlocks() {
        for (const [charId, data] of Object.entries(this.unlockConditions)) {
            data.unlocked = data.tier === 'starter';
        }
        this.stats = {
            highestLevel: 0,
            totalDamageTaken: 0,
            totalKills: 0,
            totalDeaths: 0,
            totalBossKills: 0,
            totalCyclesCollected: 0,
            wins: 0,
            fastestWin: Infinity,
            highestKillStreak: 0,
            damagelessBossKills: 0,
            paradoxUnlockAchieved: 0,
            diedToAllBosses: false,
            bossDeaths: {},
            characterWins: 0,
            characterWinList: {},
            roomDeaths: {}
        };
        this.saveUnlockProgress();
    }

    /**
     * Record a death for tracking
     */
    recordDeath(roomId, bossId = null) {
        this.stats.totalDeaths++;

        // Track room deaths for PARADOX unlock
        if (roomId) {
            this.stats.roomDeaths[roomId] = (this.stats.roomDeaths[roomId] || 0) + 1;
        }

        // Track boss deaths for AXIOM unlock
        if (bossId) {
            this.stats.bossDeaths[bossId] = true;
            // Check if died to all bosses (assuming 4 boss types)
            const requiredBosses = ['boss1', 'boss2', 'boss3', 'finalBoss'];
            this.stats.diedToAllBosses = requiredBosses.every(b => this.stats.bossDeaths[b]);
        }

        this.saveUnlockProgress();
    }

    /**
     * Record room clear for PARADOX unlock
     */
    recordRoomClear(roomId) {
        if (this.stats.roomDeaths[roomId] >= 3) {
            this.stats.paradoxUnlockAchieved = 1;
            this.saveUnlockProgress();
        }
    }

    /**
     * Record a damageless boss kill
     */
    recordDamagelessBossKill() {
        this.stats.damagelessBossKills++;
        this.saveUnlockProgress();
    }

    /**
     * Record a win
     */
    recordWin(characterId, timeInSeconds) {
        this.stats.wins++;

        // Track fastest win for NEON unlock
        if (timeInSeconds < this.stats.fastestWin) {
            this.stats.fastestWin = timeInSeconds;
        }

        // Track character wins for ITERATION-0 unlock
        if (!this.stats.characterWinList[characterId]) {
            this.stats.characterWinList[characterId] = true;
            this.stats.characterWins = Object.keys(this.stats.characterWinList).length;
        }

        this.saveUnlockProgress();
    }

    /**
     * Update stats and check for new unlocks
     */
    updateStats(newStats) {
        // Update cumulative stats
        if (newStats.level) {
            this.stats.highestLevel = Math.max(this.stats.highestLevel, newStats.level);
        }
        if (newStats.damageTaken) {
            this.stats.totalDamageTaken += newStats.damageTaken;
        }
        if (newStats.kills) {
            this.stats.totalKills += newStats.kills;
        }
        if (newStats.bossKills) {
            this.stats.totalBossKills += newStats.bossKills;
        }
        if (newStats.cyclesCollected) {
            this.stats.totalCyclesCollected += newStats.cyclesCollected;
        }
        if (newStats.killStreak) {
            this.stats.highestKillStreak = Math.max(this.stats.highestKillStreak, newStats.killStreak);
        }

        // Check for new unlocks
        const newUnlocks = [];
        for (const [charId, data] of Object.entries(this.unlockConditions)) {
            if (!data.unlocked && data.check && data.check(this.stats)) {
                data.unlocked = true;
                newUnlocks.push(this.getCharacter(charId));
            }
        }

        this.saveUnlockProgress();
        return newUnlocks;
    }

    /**
     * Purchase a character unlock with data cores
     */
    purchaseUnlock(charId, metaProgression) {
        const unlockInfo = this.unlockConditions[charId];
        if (!unlockInfo || unlockInfo.unlocked) {
            return { success: false, message: 'Already unlocked' };
        }

        // Secret characters cannot be purchased
        if (unlockInfo.coreCost === null) {
            return { success: false, message: 'Cannot be purchased — must be earned' };
        }

        if (metaProgression.dataCores < unlockInfo.coreCost) {
            return { success: false, message: 'Not enough Data Cores' };
        }

        metaProgression.dataCores -= unlockInfo.coreCost;
        metaProgression.saveToStorage();
        unlockInfo.unlocked = true;
        this.saveUnlockProgress();

        return { success: true, message: `${this.getCharacter(charId).name} unlocked!` };
    }

    /**
     * Get list of locked characters
     */
    getLockedCharacters() {
        return this.characters.filter(c => !this.isUnlocked(c.id));
    }

    /**
     * Get list of unlocked characters
     */
    getUnlockedCharacters() {
        return this.characters.filter(c => this.isUnlocked(c.id));
    }

    /**
     * Get character by ID
     */
    getCharacter(id) {
        return this.characters.find(c => c.id === id) || this.characters[0];
    }

    /**
     * Get currently selected character
     */
    getSelected() {
        return this.getCharacter(this.selectedCharacter);
    }

    /**
     * Select a character
     */
    select(id) {
        this.selectedCharacter = id;
    }

    /**
     * Apply character stats to player
     */
    applyToPlayer(player) {
        const char = this.getSelected();
        console.log('Applying character to player:', char.name, 'Color:', char.color, 'Style:', char.style);

        // Apply stat multipliers (base stats * percentage / 100)
        player.maxHealth = Math.floor(100 * char.stats.health / 100);
        player.health = player.maxHealth;
        player.baseDamageMultiplier = char.stats.damage / 100;
        player.baseSpeedMultiplier = char.stats.speed / 100;
        player.baseAttackSpeedMultiplier = char.stats.attackSpeed / 100;

        // Special case for VOID - starts at 1 HP
        if (char.id === 'void') {
            player.health = 1;
            player.maxHealth = char.stats.maxHealth || 200;
        }

        // Apply visual style
        player.characterColor = char.color;
        player.characterSecondaryColor = char.secondaryColor;
        player.characterEyeColor = char.eyeColor;
        player.characterAccentColor = char.accentColor || char.color;
        player.characterStyle = char.style;
        player.characterId = char.id;

        // Store special ability reference
        player.characterSpecial = char.special;

        // Store starting cycles preference
        player.startingCycles = char.stats.startingCycles || 1000;
    }

    /**
     * Get stat comparison bars for UI
     */
    getStatBars(charId) {
        const char = this.getCharacter(charId);
        return [
            { name: 'HP', value: Math.min(char.stats.health, 150), color: '#ff4444' },
            { name: 'SPD', value: char.stats.speed, color: '#00ff88' },
            { name: 'CYC', value: Math.min(char.stats.startingCycles / 15, 100), color: '#ffcc00' }
        ];
    }
}
