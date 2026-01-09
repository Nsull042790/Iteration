/**
 * ITERATION - Main Game Class
 * Coordinates all game systems and runs the game loop
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;

        // Core systems
        this.renderer = new Renderer(canvas);
        this.input = new InputHandler();
        this.input.initTouchControls(); // Initialize mobile touch controls
        // Hide touch controls initially - only show during gameplay
        if (this.input.touchControls) {
            this.input.touchControls.hide();
        }
        this.physics = new Physics();
        this.camera = new Camera(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        this.hud = new HUD(canvas);

        // Mobile touch support - resume audio on any touch
        this.setupMobileSupport();

        // Game state
        this.state = 'loading'; // loading, title, controls, playing, paused, gameover, victory
        this.isPaused = false;
        this.showingFAQ = false;
        this.victoryActive = false;
        this.victoryWaiting = false; // True during 3-second window after beating final boss

        // Timing
        this.lastTime = 0;
        this.deltaTime = 0;
        this.accumulator = 0;
        this.fixedTimeStep = 1000 / GAME_CONFIG.TARGET_FPS;

        // FPS tracking
        this.fps = 0;
        this.fpsCounter = 0;
        this.fpsTime = 0;

        // Game objects
        this.player = null;
        this.currentRoom = null;
        this.enemies = [];
        this.boss = null;
        this.interactables = [];
        this.cycles = new CyclesSystem();
        this.bladeEvolution = new BladeEvolution();
        this.upgradeSystem = new UpgradeSystem();
        this.dropSystem = new DropSystem();
        this.characterSystem = new CharacterSystem();
        this.weaponSystem = new WeaponSystem();
        this.cosmeticsSystem = new CosmeticsSystem();
        this.metaProgression = new MetaProgressionSystem();
        this.leaderboard = new LeaderboardSystem();
        this.runStats = new RunStatsSystem();
        this.ghostSystem = new GhostSystem();
        this.audio = window.audioSystem;
        this.cutsceneSystem = new CutsceneSystem(this.canvas, this); // Initialize cutscene system

        // Laser projectiles from weapons
        this.laserProjectiles = [];

        // Temp buffs from drops
        this.tempBuffs = {
            damageBoost: 1.0,
            speedBoost: 1.0,
            xpMultiplier: 1.0,
            shield: false,
            shieldHits: 0,
            invincible: false,
            magnetRange: 60
        };

        // Active magic imbue (Cold/Fire/Electric/Teleport)
        this.activeImbue = null;

        // Permanent buffs from legendary drops
        this.permanentBuffs = {
            damage: 1.0
        };

        // Upgrade selection state
        this.showingUpgrades = false;
        this.currentUpgradeChoices = [];

        // Character selection state
        this.showingCharacterSelect = false;

        // Level progression
        this.currentLevel = 1;
        this.maxEnemiesInLevel = 5;
        this.enemiesKilledInLevel = 0;
        this.bossSpawned = false;
        this.levelComplete = false;

        // Level rewards tracking (for end-of-level summary)
        this.levelRewards = this.createEmptyLevelRewards();

        // Zone progression
        this.zones = ['TRAINING GRID', 'COMBAT SIMULATION', 'ADAPTATION CHAMBER', 'THE CORE'];
        this.currentZoneIndex = 0;

        // Run data
        this.currentZone = 'TRAINING GRID';
        this.roomNumber = 1;
        this.showControls = true;
        this.killCount = 0;
        this.totalKills = 0;
        this.runStartTime = null;

        // God mode for testing
        this.godMode = false;

        // Initialize
        this.init();
    }

    /**
     * Initialize game
     */
    init() {
        // Setup resize handler
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();

        // Setup pause handler
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Escape' || e.code === 'KeyP') {
                // Don't allow pause during victory sequence or victory wait
                if (this.state === 'playing' && !this.victoryWaiting && !this.victoryActive) {
                    this.togglePause();
                }
            }
            // M key to go to main menu when paused
            if (e.code === 'KeyM' && this.state === 'playing' && this.isPaused) {
                this.returnToMainMenu();
            }
        });

        // Pause audio when tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab hidden - pause audio
                if (this.audio && this.audio.context) {
                    this.audio.context.suspend();
                }
            } else {
                // Tab visible - resume audio
                if (this.audio && this.audio.context) {
                    this.audio.context.resume();
                }
            }
        });

        // Setup in-game mute button
        const gameMuteBtn = document.getElementById('game-mute-btn');
        if (gameMuteBtn) {
            gameMuteBtn.onclick = () => {
                this.audio.toggleMute();
                this.updateMuteButton(gameMuteBtn);
                // Also update title screen mute button if visible
                const titleMuteBtn = document.getElementById('mute-btn');
                if (titleMuteBtn) this.updateMuteButton(titleMuteBtn);
            };
        }

        // Create player
        this.player = new Player(100, 100);

        // Create test room
        this.currentRoom = createTestRoom();

        // Set player spawn
        this.player.x = this.currentRoom.spawnPoint.x;
        this.player.y = this.currentRoom.spawnPoint.y;

        // Setup camera
        this.camera.setTarget(this.player);
        this.camera.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);

        // Spawn enemies and interactables
        this.spawnEnemies();
        this.spawnInteractables();

        // Hide loading screen and show splash screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }

            // Show splash screen (entry point)
            this.showSplashScreen();
        }, 1500);
    }

    /**
     * Show splash/entry screen
     */
    showSplashScreen() {
        const splashScreen = document.getElementById('splash-screen');
        const splashBtn = document.getElementById('splash-enter-btn');

        splashScreen.classList.remove('hidden');

        // Use flag to prevent double-fire from touch+click
        let splashClickHandled = false;
        const handleSplashClick = () => {
            if (splashClickHandled) {
                console.log('Splash click already handled, ignoring');
                return;
            }
            splashClickHandled = true;

            // Initialize audio on first user interaction
            this.audio.init();
            this.audio.resume();
            this.audio.startTitleMusic();

            // Hide splash screen
            splashScreen.classList.add('hidden');

            // Show title screen
            this.showTitleScreen();

            // Clean up
            splashBtn.removeEventListener('click', handleSplashClick);
            splashBtn.removeEventListener('touchend', handleSplashClick);
            window.removeEventListener('keydown', handleSplashKey);
        };

        splashBtn.addEventListener('click', handleSplashClick);
        splashBtn.addEventListener('touchend', handleSplashClick);

        // Also allow Enter/Space to proceed
        const handleSplashKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                handleSplashClick();
            }
        };
        window.addEventListener('keydown', handleSplashKey);
    }

    /**
     * Spawn enemies in the room based on level
     */
    spawnEnemies() {
        this.enemies = [];
        this.boss = null;
        this.bossSpawned = false;
        this.levelComplete = false;
        this.enemiesKilledInLevel = 0;

        // Spawn ghosts from past deaths
        const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
        this.ghostSystem.spawnGhostsForLevel(this.currentLevel, roomWidth);

        // Calculate enemy count based on level
        this.maxEnemiesInLevel = 3 + Math.floor(this.currentLevel * 1.5);

        // Generate enemy positions spread across the room
        const startX = 300;
        const spacing = (roomWidth - 400) / this.maxEnemiesInLevel;

        // Get platforms for vertical enemy placement
        const platforms = this.currentRoom ? this.currentRoom.getActivePlatforms() : [];
        const validPlatforms = platforms.filter(p => p.y < 500 && p.y > 200); // Mid-level platforms

        for (let i = 0; i < this.maxEnemiesInLevel; i++) {
            let x = startX + i * spacing + Utils.random(-50, 50);
            let y;

            // 40% chance to spawn on a platform for verticality (if platforms exist)
            if (validPlatforms.length > 0 && Math.random() < 0.4) {
                const platform = validPlatforms[Utils.randomInt(0, validPlatforms.length - 1)];
                x = platform.x + Utils.random(20, platform.width - 20);
                y = platform.y - 40; // Spawn on top of platform
            } else {
                // Ground level spawns with some variation
                y = Utils.random(480, 520);
            }

            const enemy = new Enemy(x, y);

            // Scale enemy stats with level
            const levelMultiplier = 1 + (this.currentLevel - 1) * 0.2;
            enemy.health = Math.floor(enemy.health * levelMultiplier);
            enemy.maxHealth = enemy.health;
            enemy.damage = Math.floor(enemy.damage * levelMultiplier);
            enemy.speed = enemy.speed * (1 + (this.currentLevel - 1) * 0.1);

            this.enemies.push(enemy);
        }
    }

    /**
     * Spawn interactable objects in the room
     */
    spawnInteractables() {
        this.interactables = [];

        const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
        const placedPositions = []; // Track placed interactables to prevent overlap
        const minSpacing = 80; // Minimum spacing between interactables

        // Helper to find non-overlapping X position
        const findValidX = (minX, maxX, y) => {
            let attempts = 0;
            let x;
            do {
                x = Utils.random(minX, maxX);
                const overlaps = placedPositions.some(pos =>
                    Math.abs(pos.x - x) < minSpacing && Math.abs(pos.y - y) < 50
                );
                if (!overlaps) {
                    placedPositions.push({ x, y });
                    return x;
                }
                attempts++;
            } while (attempts < 15);
            // If no valid position found, return anyway (rare edge case)
            placedPositions.push({ x, y });
            return x;
        };

        // Spawn ground level chests
        const chestCount = Utils.randomInt(1, 2);
        for (let i = 0; i < chestCount; i++) {
            const x = findValidX(200, roomWidth - 200, 520);
            const chest = new Interactable(x, 520, 'chest');
            this.interactables.push(chest);
        }

        // Spawn elevated chests on platforms (better drops to incentivize platforming)
        const elevatedChestCount = Utils.randomInt(1, 2);
        const elevatedHeights = [350, 250, 150];  // Platform heights
        for (let i = 0; i < elevatedChestCount; i++) {
            const y = elevatedHeights[i % elevatedHeights.length];
            const x = findValidX(300, roomWidth - 300, y);
            const elevatedChest = new Interactable(x, y, 'elevated_chest');
            this.interactables.push(elevatedChest);
        }

        // Spawn a terminal with lore
        if (Math.random() > 0.5) {
            const x = findValidX(400, roomWidth - 400, 508);
            const terminal = new Interactable(x, 508, 'terminal');
            this.interactables.push(terminal);
        }

        // Spawn a health station occasionally
        if (Math.random() > 0.7) {
            const x = findValidX(300, roomWidth - 300, 500);
            const healthStation = new Interactable(x, 500, 'health_station');
            this.interactables.push(healthStation);
        }

        // Spawn a cycle node
        if (Math.random() > 0.6) {
            const x = findValidX(500, roomWidth - 500, 520);
            const cycleNode = new Interactable(x, 520, 'cycle_node');
            this.interactables.push(cycleNode);
        }

        // Spawn health potions (2-4 per level)
        const potionCount = Utils.randomInt(2, 4);
        for (let i = 0; i < potionCount; i++) {
            const x = findValidX(150, roomWidth - 150, 530);
            const potion = new Interactable(x, 530, 'health_potion', { healAmount: 25 });
            this.interactables.push(potion);
        }
    }

    /**
     * Spawn boss for current level
     */
    spawnBoss() {
        if (this.bossSpawned) return;

        this.bossSpawned = true;

        // Get boss name from Boss class for consistency
        const bossName = Boss.getNameForLevel(this.currentLevel);

        // Special epic intro for final boss (level 12 - CORRUPTED CORE)
        if (this.currentLevel === 12) {
            this.spawnFinalBoss(bossName);
            return;
        }

        // Show boss warning and play warning sound
        this.hud.showBossWarning(bossName);
        this.audio.playBossWarning();

        // Switch to boss music
        this.audio.startBossMusic();

        // Trigger intense kanji rain effect
        this.renderer.triggerBossKanjiRain(180); // 3 seconds of matrix rain

        // Camera shake
        this.camera.addShake(10, 60);
        this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.5);

        // Spawn boss after warning animation
        setTimeout(() => {
            const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
            const bossX = roomWidth - 200;
            const bossY = 400;

            this.boss = new Boss(bossX, bossY, this.currentLevel);
            this.boss.name = bossName;
            this.bossStartTime = Date.now(); // Track when boss fight begins
            this.hud.addMessage(`THREAT DETECTED: ${this.boss.name}`, 'warning');
        }, 2000);
    }

    /**
     * Epic intro sequence for the final boss - CORRUPTED CORE
     */
    spawnFinalBoss(bossName) {
        // Pause gameplay during intro
        this.isPaused = true;
        this.finalBossIntroActive = true;
        this.finalBossIntroPhase = 0;
        this.finalBossIntroTimer = 0;

        // Stop current music
        this.audio.stopMusic();

        // Trigger epic kanji rain for entire intro (longer duration)
        this.renderer.triggerBossKanjiRain(480); // 8 seconds of intense matrix rain

        // Phase 1: Screen goes dark with static
        this.renderer.glitch(3, 120);
        this.camera.addShake(5, 180);

        // Play ominous warning
        this.audio.playBossWarning();

        // Start the cinematic intro sequence
        this.finalBossIntroSequence = [
            { delay: 0, action: () => {
                this.hud.addMessage('◈ SYSTEM ALERT ◈', 'warning');
            }},
            { delay: 60, action: () => {
                this.renderer.flash('#ff0044', 0.8);
                this.camera.addShake(15, 30);
            }},
            { delay: 120, action: () => {
                this.hud.addMessage('CORE BREACH DETECTED', 'warning');
            }},
            { delay: 180, action: () => {
                this.renderer.glitch(5, 60);
                this.camera.addShake(20, 45);
            }},
            { delay: 240, action: () => {
                this.hud.addMessage('THE SIMULATION IS FIGHTING BACK', 'warning');
            }},
            { delay: 360, action: () => {
                this.renderer.flash('#ff0044', 1.0);
                this.camera.addShake(25, 60);
                this.audio.playBossWarning();
            }},
            { delay: 420, action: () => {
                // Show epic boss title
                this.finalBossIntroPhase = 1; // Show title card
            }},
            { delay: 600, action: () => {
                // Spawn the boss
                const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
                const bossX = roomWidth / 2 - 50;
                const bossY = 100;

                this.boss = new Boss(bossX, bossY, this.currentLevel);
                this.boss.name = bossName;
                this.boss.isFinalBoss = true;
                this.bossStartTime = Date.now(); // Track when final boss fight begins

                // Boss descends from above
                this.boss.isEntering = true;
                this.boss.entryTimer = 120;

                // Start boss music
                this.audio.startBossMusic();

                this.renderer.flash('#ff0044', 0.6);
                this.camera.addShake(30, 90);
            }},
            { delay: 720, action: () => {
                // End intro
                this.finalBossIntroActive = false;
                this.finalBossIntroPhase = 0;
                this.isPaused = false;
                this.hud.addMessage(`◈ ${bossName} ◈`, 'warning');
            }}
        ];

        this.finalBossIntroIndex = 0;
    }

    /**
     * Update final boss intro sequence
     */
    updateFinalBossIntro() {
        if (!this.finalBossIntroSequence) return;

        this.finalBossIntroTimer++;

        // Process sequence events
        while (this.finalBossIntroIndex < this.finalBossIntroSequence.length) {
            const event = this.finalBossIntroSequence[this.finalBossIntroIndex];
            if (this.finalBossIntroTimer >= event.delay) {
                event.action();
                this.finalBossIntroIndex++;
            } else {
                break;
            }
        }
    }

    /**
     * Render final boss intro overlay - BORDERLANDS STYLE
     */
    renderFinalBossIntro(ctx) {
        if (!this.finalBossIntroActive) return;

        ctx.save();

        const introProgress = Math.min(this.finalBossIntroTimer / 60, 1); // 0-1 over 1 second
        const titleCardProgress = Math.max(0, Math.min((this.finalBossIntroTimer - 30) / 90, 1));

        // === ZOOM EFFECT ON BOSS ===
        if (this.boss && this.finalBossIntroPhase >= 1) {
            // Calculate zoom center on boss
            const bossScreenPos = this.camera.worldToScreen(
                this.boss.x + this.boss.width / 2,
                this.boss.y + this.boss.height / 2
            );

            // Zoom factor (starts at 1, zooms to 1.5, then back)
            let zoomFactor = 1;
            if (this.finalBossIntroTimer < 60) {
                zoomFactor = 1 + (this.finalBossIntroTimer / 60) * 0.5;
            } else if (this.finalBossIntroTimer < 150) {
                zoomFactor = 1.5;
            } else {
                zoomFactor = 1.5 - ((this.finalBossIntroTimer - 150) / 60) * 0.5;
            }
            zoomFactor = Math.max(1, zoomFactor);

            // Apply zoom transform (stored for use by camera)
            this.bossIntroZoom = zoomFactor;
            this.bossIntroFocusX = bossScreenPos.x;
            this.bossIntroFocusY = bossScreenPos.y;
        }

        // === DARK VIGNETTE ===
        const vignetteGradient = ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, 50,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignetteGradient.addColorStop(0.5, 'rgba(10, 0, 0, 0.3)');
        vignetteGradient.addColorStop(1, 'rgba(20, 0, 0, 0.8)');
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // === GLITCH SCAN LINES ===
        if (Math.random() > 0.6) {
            ctx.fillStyle = `rgba(255, 0, 68, ${0.2 + Math.random() * 0.3})`;
            const lineY = Math.random() * this.canvas.height;
            ctx.fillRect(0, lineY, this.canvas.width, 1 + Math.random() * 4);
        }

        // === BORDERLANDS TITLE CARD (Upper Right) ===
        if (this.finalBossIntroPhase === 1 && titleCardProgress > 0) {
            const cardX = this.canvas.width - 50;
            const cardY = 80;

            // Slide-in effect
            const slideOffset = (1 - titleCardProgress) * 400;

            ctx.save();
            ctx.translate(slideOffset, 0);

            // === HORIZONTAL LINES (Borderlands style) ===
            const lineWidth = 350;

            // Top decorative line
            ctx.strokeStyle = '#ff0044';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff0044';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.moveTo(cardX - lineWidth, cardY - 40);
            ctx.lineTo(cardX + 20, cardY - 40);
            ctx.stroke();

            // Bottom decorative line
            ctx.beginPath();
            ctx.moveTo(cardX - lineWidth - 50, cardY + 80);
            ctx.lineTo(cardX + 20, cardY + 80);
            ctx.stroke();

            // === BOSS TYPE / CLASS ===
            ctx.textAlign = 'right';
            ctx.font = 'bold 14px "Courier New", monospace';
            ctx.fillStyle = '#ff0044';
            ctx.shadowColor = '#ff0044';
            ctx.shadowBlur = 10;
            ctx.fillText('◈ FINAL BOSS ◈', cardX, cardY - 20);

            // === MAIN BOSS NAME (BIG & BLOCKY) ===
            ctx.font = 'bold 52px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ff0044';
            ctx.shadowBlur = 30;

            // Glitch offset effect
            const glitchX = Math.random() > 0.9 ? (Math.random() - 0.5) * 6 : 0;
            const glitchY = Math.random() > 0.9 ? (Math.random() - 0.5) * 4 : 0;

            // Red shadow layer (offset)
            ctx.fillStyle = '#ff0044';
            ctx.fillText('CORRUPTED', cardX + 3 + glitchX, cardY + 25 + glitchY);
            ctx.fillText('CORE', cardX + 3 + glitchX, cardY + 75 + glitchY);

            // White main text
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 20;
            ctx.fillText('CORRUPTED', cardX, cardY + 22);
            ctx.fillText('CORE', cardX, cardY + 72);

            // === SUBTITLE / TITLE ===
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.fillStyle = '#ff00aa';
            ctx.shadowColor = '#ff00aa';
            ctx.shadowBlur = 15;
            ctx.fillText('THE HEART OF THE SIMULATION', cardX, cardY + 100);

            // === THREAT LEVEL BADGE ===
            const badgeY = cardY + 130;
            const badgeWidth = 200;

            // Badge background
            ctx.fillStyle = 'rgba(255, 0, 68, 0.3)';
            ctx.fillRect(cardX - badgeWidth, badgeY, badgeWidth, 25);

            // Badge border
            ctx.strokeStyle = '#ff0044';
            ctx.lineWidth = 2;
            ctx.strokeRect(cardX - badgeWidth, badgeY, badgeWidth, 25);

            // Badge text
            const warnPulse = Math.sin(this.finalBossIntroTimer / 8) > 0 ? 1 : 0.6;
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 255, 255, ${warnPulse})`;
            ctx.fillText('▲ THREAT LEVEL: MAXIMUM ▲', cardX - 10, badgeY + 17);

            ctx.restore();
        }

        // === DRAMATIC FLASH on phase transition ===
        if (this.finalBossIntroTimer > 25 && this.finalBossIntroTimer < 35) {
            const flashIntensity = 1 - Math.abs(this.finalBossIntroTimer - 30) / 5;
            ctx.fillStyle = `rgba(255, 0, 68, ${flashIntensity * 0.5})`;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // === CORNER BRACKETS (cinematic framing) ===
        ctx.strokeStyle = '#ff0044';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0044';
        ctx.shadowBlur = 10;
        const bracketSize = 40;
        const margin = 30;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(margin, margin + bracketSize);
        ctx.lineTo(margin, margin);
        ctx.lineTo(margin + bracketSize, margin);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(this.canvas.width - margin - bracketSize, margin);
        ctx.lineTo(this.canvas.width - margin, margin);
        ctx.lineTo(this.canvas.width - margin, margin + bracketSize);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(margin, this.canvas.height - margin - bracketSize);
        ctx.lineTo(margin, this.canvas.height - margin);
        ctx.lineTo(margin + bracketSize, this.canvas.height - margin);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(this.canvas.width - margin - bracketSize, this.canvas.height - margin);
        ctx.lineTo(this.canvas.width - margin, this.canvas.height - margin);
        ctx.lineTo(this.canvas.width - margin, this.canvas.height - margin - bracketSize);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Handle level completion
     */
    completeLevel() {
        if (this.levelComplete) return;

        this.levelComplete = true;

        // Store the level we just completed BEFORE incrementing
        const completedLevel = this.currentLevel;

        // Track level completion time in run stats
        if (this.runStats && this.levelStartTime) {
            this.runStats.recordLevelComplete(completedLevel, this.levelStartTime);
            this.levelStartTime = Date.now(); // Reset for next level
        }

        // Check for game victory (beat level 12 - CORRUPTED CORE)
        const FINAL_LEVEL = 12;
        if (completedLevel >= FINAL_LEVEL) {
            // Player beat the game! Enter victory wait state (prevents pausing)
            this.victoryWaiting = true;
            this.hud.addMessage('◈ SIMULATION COLLAPSE IMMINENT ◈', 'warning');

            setTimeout(() => {
                try {
                    this.victoryWaiting = false;
                    this.showVictoryScreen(completedLevel);
                } catch (e) {
                    console.error('Victory screen error:', e);
                    // Fallback - at least return to menu
                    this.returnToMainMenu();
                }
            }, 3000);
            return;
        }

        this.currentLevel++;
        this.roomNumber++;

        // Zone progression every 3 levels
        if (this.currentLevel % 3 === 1 && this.currentLevel > 1) {
            this.currentZoneIndex = Math.min(this.currentZoneIndex + 1, this.zones.length - 1);
            this.currentZone = this.zones[this.currentZoneIndex];
        }

        // Bonus cycles for completing level (tracked for summary, no HUD spam)
        const levelBonus = 100 + completedLevel * 25;
        this.cycles.gain(levelBonus);
        this.trackReward('cycles', { amount: levelBonus });

        // Second Wind upgrade - heal after boss
        if (this.upgradeSystem.hasUpgrade('second_wind')) {
            const healAmount = Math.floor(this.player.maxHealth * 0.30);
            this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
        }

        // Show combined level complete + upgrade screen after delay for orb collection
        setTimeout(() => {
            this.showLevelCompleteWithUpgrades(completedLevel);
        }, 3000);  // 3 seconds to collect boss drops
    }

    /**
     * Show combined level complete summary with weapon upgrade selection
     */
    showLevelCompleteWithUpgrades(completedLevel) {
        // Get weapon upgrade options
        this.currentWeaponChoices = this.weaponSystem.getUpgradeOptions();
        const allMaxed = this.currentWeaponChoices.every(opt => opt.isMaxed);

        this.showingUpgrades = !allMaxed;
        this.isPaused = true;

        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');

        if (title) title.textContent = 'LEVEL COMPLETE';
        if (subtitle) subtitle.textContent = `// LEVEL ${completedLevel} CLEARED`;

        // Get current blade info
        const bladeTier = this.bladeEvolution.getCurrentTier();
        const rewards = this.levelRewards || this.createEmptyLevelRewards();

        // Build level rewards summary
        let rewardLines = [];
        if (rewards.killsThisLevel > 0) {
            rewardLines.push(`<span style="color: #ff00aa;">+${rewards.killsThisLevel} KILLS</span>`);
        }
        if (rewards.cyclesEarned > 0) {
            rewardLines.push(`<span style="color: #ffff00;">+${rewards.cyclesEarned} CYCLES</span>`);
        }
        if (rewards.xpGained > 0) {
            rewardLines.push(`<span style="color: #00f0ff;">+${rewards.xpGained} BLADE XP</span>`);
        }
        rewards.bladeEvolutions.forEach(tier => {
            rewardLines.push(`<span style="color: #00ff88;">BLADE EVOLVED: ${tier}</span>`);
        });
        rewards.abilitiesUnlocked.forEach(ability => {
            rewardLines.push(`<span style="color: #ff00aa;">NEW ABILITY: ${ability}</span>`);
        });

        const rewardsHtml = rewardLines.length > 0
            ? `<div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,240,255,0.2); padding: 10px 15px; margin-bottom: 15px; text-align: center;">
                <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px; margin-bottom: 8px;">LEVEL REWARDS</div>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 20px; font-size: 13px;">
                    ${rewardLines.join('')}
                </div>
               </div>`
            : '';

        // Build stats section
        const statsHtml = `
            <div class="level-stats-header" style="text-align: center; margin-bottom: 15px;">
                <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 10px;">
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">LEVEL</div>
                        <div style="font-size: 22px; color: #00f0ff; font-weight: bold;">${completedLevel}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">TOTAL KILLS</div>
                        <div style="font-size: 22px; color: #ff00aa; font-weight: bold;">${this.totalKills}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">CYCLES</div>
                        <div style="font-size: 22px; color: #ffff00; font-weight: bold;">${this.cycles.getCycles()}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">BLADE</div>
                        <div style="font-size: 13px; color: ${bladeTier.color}; font-weight: bold;">${bladeTier.name}</div>
                    </div>
                </div>
                ${rewardsHtml}
            </div>
        `;

        // Clear and add stats
        choicesContainer.innerHTML = statsHtml;

        if (allMaxed) {
            // All weapons maxed - just show continue button
            choicesContainer.innerHTML += `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 24px; color: #ffff00; margin-bottom: 10px;">ALL WEAPONS MAXED</div>
                    <div style="font-size: 14px; color: #00f0ff; margin-bottom: 20px;">Your arsenal is complete!</div>
                    <button id="continue-level-btn" class="start-btn" style="padding: 15px 40px;">
                        <span class="btn-text">CONTINUE TO LEVEL ${this.currentLevel}</span>
                    </button>
                    <div style="margin-top: 10px; font-size: 11px; color: rgba(255,255,255,0.3);">Press SPACE to continue</div>
                </div>
            `;

            modal.classList.remove('hidden');

            const handleContinue = () => {
                modal.classList.add('hidden');
                window.removeEventListener('keydown', handleContinueKey);
                if (title) title.textContent = 'EVOLUTION DETECTED';
                if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';
                this.nextLevel();
            };

            const handleContinueKey = (e) => {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    handleContinue();
                }
            };

            document.getElementById('continue-level-btn').addEventListener('click', handleContinue);
            window.addEventListener('keydown', handleContinueKey);
        } else {
            // Add upgrade selection header
            choicesContainer.innerHTML += `
                <div style="text-align: center; margin-bottom: 15px; padding-top: 10px; border-top: 1px solid rgba(0,240,255,0.2);">
                    <div style="font-size: 14px; color: #00f0ff; letter-spacing: 2px;">CHOOSE WEAPON TO UPGRADE</div>
                </div>
                <div id="weapon-choices" style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;"></div>
            `;

            const weaponContainer = choicesContainer.querySelector('#weapon-choices');

            // Create weapon upgrade cards
            this.currentWeaponChoices.forEach((option, index) => {
                const card = document.createElement('div');
                card.className = 'upgrade-card weapon-upgrade';
                card.style.setProperty('--upgrade-color', option.color);

                if (option.isMaxed) {
                    card.innerHTML = `
                        <span class="upgrade-rarity legendary">MAX LEVEL</span>
                        <div class="upgrade-icon">⚔</div>
                        <div class="upgrade-name">${option.currentTier.name}</div>
                        <div class="upgrade-description">${option.weaponName} - MAXED</div>
                        <div class="upgrade-effects">
                            <div class="upgrade-positive">LASER UNLOCKED</div>
                        </div>
                    `;
                    card.classList.add('maxed');
                } else {
                    const isLaserNext = option.nextTier.isLaser;
                    card.innerHTML = `
                        <span class="upgrade-rarity ${isLaserNext ? 'legendary' : 'uncommon'}">LV${option.currentLevel} → LV${option.nextLevel}</span>
                        <div class="upgrade-icon">⚔</div>
                        <div class="upgrade-name">${option.nextTier.name}</div>
                        <div class="upgrade-description">${option.weaponName}</div>
                        <div class="upgrade-effects">
                            <div class="upgrade-positive">DMG: ${(option.currentTier.damage * 100).toFixed(0)}% → ${(option.nextTier.damage * 100).toFixed(0)}%</div>
                            <div class="upgrade-positive">SPD: ${(option.currentTier.speed * 100).toFixed(0)}% → ${(option.nextTier.speed * 100).toFixed(0)}%</div>
                            ${isLaserNext ? '<div class="upgrade-positive laser-unlock">LASER SWORD!</div>' : ''}
                        </div>
                        <span class="upgrade-key">${index + 1}</span>
                    `;
                    card.addEventListener('click', () => this.selectWeaponUpgrade(index));
                }

                weaponContainer.appendChild(card);
            });

            modal.classList.remove('hidden');

            // Setup keyboard listener
            this.upgradeKeyHandler = (e) => {
                if (!this.showingUpgrades) return;
                if (e.key === '1' || e.key === '2' || e.key === '3') {
                    const index = parseInt(e.key) - 1;
                    if (index < this.currentWeaponChoices.length && !this.currentWeaponChoices[index].isMaxed) {
                        this.selectWeaponUpgrade(index);
                    }
                }
            };
            window.addEventListener('keydown', this.upgradeKeyHandler);
        }

        this.audio.playUIClick();
    }

    /**
     * Select a weapon upgrade
     */
    selectWeaponUpgrade(index) {
        // Guard against double selection or invalid state
        if (!this.showingUpgrades) return;
        if (index >= this.currentWeaponChoices.length) return;

        const option = this.currentWeaponChoices[index];

        // Ignore maxed weapons
        if (option.isMaxed) return;

        // Immediately mark as not showing to prevent double selection
        this.showingUpgrades = false;

        // Remove keyboard listener immediately
        if (this.upgradeKeyHandler) {
            window.removeEventListener('keydown', this.upgradeKeyHandler);
            this.upgradeKeyHandler = null;
        }

        // Apply the weapon upgrade
        const result = this.weaponSystem.upgradeWeapon(option.slotIndex);

        if (result.success) {
            // Flash effect
            this.renderer.flash(result.newTier.color, 0.5);
            this.camera.addShake(5, 15);

            // Check if weapon is now maxed (laser unlocked!)
            if (result.newTier.isLaser) {
                // Show celebration modal
                this.showWeaponMaxedCelebration(option.weaponName, result.newTier);
                return; // Don't proceed to next level yet - celebration will handle it
            }
        }

        // Show continue screen with weapon upgrade info
        this.showContinueScreen(result.success ? result.newTier.name : null);
    }

    /**
     * Show continue screen before next level
     */
    showContinueScreen(upgradedWeapon) {
        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');
        const hint = modal.querySelector('.upgrade-hint');

        if (title) title.textContent = 'READY';
        if (subtitle) subtitle.textContent = '// PREPARE FOR NEXT LEVEL';
        if (hint) hint.style.display = 'none';  // Hide the "1, 2, 3" hint

        choicesContainer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; min-height: 200px;">
                ${upgradedWeapon ? `<div style="font-size: 18px; color: #00ff88; margin-bottom: 25px; text-align: center;">WEAPON UPGRADED: ${upgradedWeapon}</div>` : ''}
                <div style="font-size: 32px; color: #00f0ff; margin-bottom: 10px; text-align: center; font-weight: bold;">LEVEL ${this.currentLevel}</div>
                <div style="font-size: 16px; color: rgba(255,255,255,0.6); margin-bottom: 35px; text-align: center;">${this.currentZone}</div>
                <button id="continue-level-btn" class="start-btn" style="padding: 18px 50px;">
                    <span class="btn-text">CONTINUE</span>
                </button>
                <div style="margin-top: 15px; font-size: 11px; color: rgba(255,255,255,0.3);">Press SPACE to continue</div>
            </div>
        `;

        modal.classList.remove('hidden');

        const handleContinue = () => {
            modal.classList.add('hidden');
            if (hint) hint.style.display = '';  // Restore hint for weapon selection
            window.removeEventListener('keydown', handleContinueKey);
            if (title) title.textContent = 'EVOLUTION DETECTED';
            if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';
            this.nextLevel();
        };

        const handleContinueKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                handleContinue();
            }
        };

        document.getElementById('continue-level-btn').addEventListener('click', handleContinue);
        window.addEventListener('keydown', handleContinueKey);

        this.audio.playUIClick();
    }

    /**
     * Show victory screen - player beat the game!
     * EPIC Mario Party-style celebration!
     */
    showVictoryScreen(finalLevel) {
        console.log('=== VICTORY SCREEN START ===');
        console.log('Starting victory screen for level', finalLevel);

        this.state = 'victory';
        this.isPaused = false; // Don't pause during victory - let the celebration run!

        // Stop gameplay music
        try {
            this.audio.stopMusic();
        } catch (e) {
            console.warn('Could not stop music:', e);
        }

        // Calculate final stats with defensive defaults
        let totalTime = 0;
        let minutes = 0;
        let seconds = 0;
        let finalCycles = 0;
        let bladeTier = { name: 'BASIC', color: '#00f0ff' };
        let char = { name: 'UNKNOWN' };

        try {
            totalTime = Math.floor((Date.now() - (this.runStartTime || Date.now())) / 1000);
            minutes = Math.floor(totalTime / 60);
            seconds = totalTime % 60;
            finalCycles = this.cycles?.getCycles() || 0;
            bladeTier = this.bladeEvolution?.getCurrentTier() || bladeTier;
            char = this.characterSystem?.getSelected() || char;
        } catch (e) {
            console.warn('Error calculating stats:', e);
        }

        // End run stats and submit to all applicable leaderboards
        let leaderboardResults = { submissions: [], newRecords: [] };
        try {
            // Set final cycles in stats
            this.runStats.setFinalCycles(finalCycles);

            // End the run (completed = true)
            const runSummary = this.runStats.endRun(true, finalLevel);

            // Submit to all applicable leaderboards
            leaderboardResults = this.leaderboard.submitRun(runSummary);

            // Show new records
            if (leaderboardResults.newRecords.length > 0) {
                setTimeout(() => {
                    this.hud.addMessage(`NEW RECORD: ${leaderboardResults.newRecords[0]}!`, 'evolution');
                }, 1500);
            }

            console.log('[VICTORY] Leaderboard results:', leaderboardResults);
        } catch (e) {
            console.warn('Leaderboard submission failed:', e);
        }

        // Store stats for rendering
        this.victoryStats = {
            finalLevel,
            totalKills: this.totalKills,
            finalCycles,
            time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            bladeTier,
            characterName: char.name,
            character: char
        };

        // Initialize EPIC victory sequence
        this.victoryPhase = 0;
        this.victoryTimer = 0;
        this.victoryActive = true;
        this.victoryTouchSkipUsed = false; // Prevent multiple touch skips

        // Confetti particles
        this.victoryConfetti = [];
        for (let i = 0; i < 150; i++) {
            this.victoryConfetti.push({
                x: Math.random() * this.canvas.width,
                y: -Math.random() * 500 - 50,
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 3 + 2,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 10,
                size: Math.random() * 10 + 5,
                color: ['#ff71ce', '#01cdfe', '#b967ff', '#05ffa1', '#ffd700', '#ff6b6b', '#ffffff'][Math.floor(Math.random() * 7)]
            });
        }

        // Fireworks
        this.victoryFireworks = [];

        // Stars/sparkles
        this.victorySparkles = [];
        for (let i = 0; i < 30; i++) {
            this.victorySparkles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 4 + 2,
                alpha: 0,
                alphaSpeed: Math.random() * 0.05 + 0.02,
                maxAlpha: Math.random() * 0.5 + 0.5
            });
        }

        // Start celebration!
        this.startVictoryPhase(0);
    }

    /**
     * Start a victory sequence phase - CELEBRATION EDITION
     */
    startVictoryPhase(phase) {
        console.log('Victory phase:', phase);
        this.victoryPhase = phase;
        this.victoryTimer = 0;

        try {
            switch(phase) {
                case 0: // EXPLOSION - Core destroyed
                    this.camera?.addShake(40, 60);
                    this.audio?.playExplosion?.();
                    this.renderer?.flash('#ffffff', 1.0);
                    setTimeout(() => this.renderer?.flash('#ffd700', 0.8), 100);
                    setTimeout(() => this.renderer?.flash('#ff71ce', 0.6), 200);
                    // Launch initial fireworks
                    this.launchFirework();
                    this.launchFirework();
                    break;
                case 1: // YOU ARE THE CHAMPION
                    this.audio?.playLevelUp?.();
                    this.renderer?.flash('#ffd700', 0.5);
                    this.camera?.addShake(10, 30);
                    break;
                case 2: // Stats celebration
                    this.audio?.playLevelUp?.();
                    break;
                case 3: // Final - press to continue
                    break;
            }
        } catch (e) {
            console.error('Victory phase error:', e);
        }
    }

    /**
     * Launch a firework
     */
    launchFirework() {
        const x = Math.random() * this.canvas.width * 0.6 + this.canvas.width * 0.2;
        const targetY = Math.random() * this.canvas.height * 0.4 + 50;

        this.victoryFireworks.push({
            x: x,
            y: this.canvas.height + 10,
            targetY: targetY,
            vy: -12,
            exploded: false,
            particles: [],
            color: ['#ff71ce', '#01cdfe', '#ffd700', '#05ffa1', '#ff6b6b', '#b967ff'][Math.floor(Math.random() * 6)]
        });
    }

    /**
     * Update victory sequence - CELEBRATION EDITION
     */
    updateVictorySequence() {
        if (!this.victoryActive) return;

        this.victoryTimer++;

        // Debug log every 60 frames (1 second)
        if (this.victoryTimer % 60 === 0) {
            console.log(`Victory: phase=${this.victoryPhase}, timer=${this.victoryTimer}`);
        }

        // Update confetti
        this.victoryConfetti.forEach(c => {
            c.x += c.vx;
            c.y += c.vy;
            c.rotation += c.rotationSpeed;
            c.vy += 0.05; // gravity
            c.vx *= 0.99; // air resistance

            // Reset if off screen
            if (c.y > this.canvas.height + 50) {
                c.y = -20;
                c.x = Math.random() * this.canvas.width;
                c.vy = Math.random() * 3 + 2;
            }
        });

        // Update fireworks
        this.victoryFireworks.forEach(fw => {
            if (!fw.exploded) {
                fw.y += fw.vy;
                if (fw.y <= fw.targetY) {
                    fw.exploded = true;
                    this.audio?.playExplosion?.();
                    // Create explosion particles
                    for (let i = 0; i < 40; i++) {
                        const angle = (i / 40) * Math.PI * 2;
                        const speed = Math.random() * 5 + 3;
                        fw.particles.push({
                            x: fw.x,
                            y: fw.y,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            life: 60 + Math.random() * 30,
                            maxLife: 90
                        });
                    }
                }
            } else {
                fw.particles.forEach(p => {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vy += 0.1; // gravity
                    p.life--;
                });
                fw.particles = fw.particles.filter(p => p.life > 0);
            }
        });

        // Remove dead fireworks
        this.victoryFireworks = this.victoryFireworks.filter(fw => !fw.exploded || fw.particles.length > 0);

        // Launch new fireworks periodically
        if (this.victoryTimer % 45 === 0 && this.victoryPhase >= 1) {
            this.launchFirework();
        }

        // Update sparkles
        this.victorySparkles.forEach(s => {
            s.alpha += s.alphaSpeed;
            if (s.alpha >= s.maxAlpha) {
                s.alphaSpeed = -Math.abs(s.alphaSpeed);
            } else if (s.alpha <= 0) {
                s.alphaSpeed = Math.abs(s.alphaSpeed);
                s.x = Math.random() * this.canvas.width;
                s.y = Math.random() * this.canvas.height;
            }
        });

        // Phase transitions
        switch(this.victoryPhase) {
            case 0: // Explosion -> Champion reveal
                if (this.victoryTimer > 90) {
                    this.startVictoryPhase(1);
                }
                break;
            case 1: // Champion -> Stats
                if (this.victoryTimer > 180) {
                    this.startVictoryPhase(2);
                }
                break;
            case 2: // Stats -> Final
                if (this.victoryTimer > 240) {
                    this.startVictoryPhase(3);
                }
                break;
            case 3: // Final -> Victory Cutscene (auto-transition after timeout)
                if (this.victoryTimer > 360) {
                    this.endVictorySequence();
                }
                break;
        }

        // Skip/continue - keyboard only (use JUST pressed to prevent repeat triggers)
        // Require longer wait and use justPressed to prevent accidental skips from boss fight inputs
        if (this.victoryTimer > 120 && (this.input.isKeyJustPressed('Space') || this.input.isKeyJustPressed('Enter'))) {
            if (this.victoryPhase < 3) {
                this.startVictoryPhase(3);
            } else {
                this.endVictorySequence();
            }
        }
        // Touch skip handled separately with debounce - only in phase 3
        if (this.victoryPhase === 3 && this.victoryTimer > 180) {
            const touchSkip = this.input.touchControls &&
                (this.input.touchControls.isAttackPressed() || this.input.touchControls.isJumpPressed());
            if (touchSkip && !this.victoryTouchSkipUsed) {
                this.victoryTouchSkipUsed = true;
                this.endVictorySequence();
            }
        }
    }

    /**
     * Render victory sequence - EPIC CELEBRATION
     */
    renderVictorySequence(ctx) {
        if (!this.victoryActive) return;

        const w = this.canvas.width;
        const h = this.canvas.height;

        // Epic gradient background
        const bgGradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        bgGradient.addColorStop(0, '#1a0a2e');
        bgGradient.addColorStop(0.5, '#0d0015');
        bgGradient.addColorStop(1, '#000000');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, w, h);

        // Render sparkles (behind everything)
        this.renderVictorySparkles(ctx);

        // Render fireworks
        this.renderVictoryFireworks(ctx);

        // Phase-specific content
        switch(this.victoryPhase) {
            case 0:
                this.renderExplosionPhase(ctx);
                break;
            case 1:
            case 2:
            case 3:
                this.renderChampionPhase(ctx);
                break;
        }

        // Render confetti (on top)
        this.renderVictoryConfetti(ctx);

        // Continue prompt (phase 3)
        if (this.victoryPhase === 3) {
            const pulse = Math.sin(this.victoryTimer * 0.1) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;
            ctx.font = 'bold 20px "Share Tech Mono", monospace';
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'center';
            const isMobile = this.input.touchControls && this.input.touchControls.isEnabled();
            const promptText = isMobile ? '[ TAP TO CONTINUE ]' : '[ PRESS SPACE TO CONTINUE ]';
            ctx.fillText(promptText, w / 2, h - 50);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Render explosion phase
     */
    renderExplosionPhase(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const progress = this.victoryTimer / 90;

        // Expanding ring
        ctx.save();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 5;
        ctx.globalAlpha = 1 - progress;
        ctx.beginPath();
        ctx.arc(w/2, h/2, progress * 400, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // "CORE DESTROYED" text
        if (this.victoryTimer > 30) {
            const textProgress = Math.min((this.victoryTimer - 30) / 30, 1);
            ctx.save();
            ctx.globalAlpha = textProgress;
            ctx.font = 'bold 64px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
            ctx.fillText('CORE DESTROYED', w/2, h/2);
            ctx.restore();
        }
    }

    /**
     * Render champion celebration phase
     */
    renderChampionPhase(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const stats = this.victoryStats;

        // Glowing rays from center
        ctx.save();
        const rayCount = 12;
        const rayRotation = this.victoryTimer * 0.005;
        ctx.translate(w/2, h * 0.35);
        ctx.rotate(rayRotation);
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            ctx.rotate(Math.PI * 2 / rayCount);
            const gradient = ctx.createLinearGradient(0, 0, 300, 0);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(300, -20);
            ctx.lineTo(300, 20);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // Crown/trophy emoji
        ctx.font = '80px serif';
        ctx.textAlign = 'center';
        ctx.fillText('👑', w/2, 100);

        // "SIMULATION CHAMPION" title
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 30 + Math.sin(this.victoryTimer * 0.1) * 10;
        ctx.font = 'bold 56px "Share Tech Mono", monospace';
        ctx.textAlign = 'center';

        // Gold gradient text
        const textGradient = ctx.createLinearGradient(w/2 - 250, 0, w/2 + 250, 0);
        textGradient.addColorStop(0, '#ffd700');
        textGradient.addColorStop(0.5, '#fff8dc');
        textGradient.addColorStop(1, '#ffd700');
        ctx.fillStyle = textGradient;
        ctx.fillText('★ SIMULATION CHAMPION ★', w/2, 180);
        ctx.restore();

        // Character name
        ctx.font = 'bold 32px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ff71ce';
        ctx.shadowColor = '#ff71ce';
        ctx.shadowBlur = 15;
        ctx.fillText(`[ ${stats.characterName} ]`, w/2, 230);
        ctx.shadowBlur = 0;

        // Stats box
        if (this.victoryPhase >= 2) {
            this.renderVictoryStats(ctx, w, h, stats);
        }

        // Subtitle
        ctx.font = '18px "Share Tech Mono", monospace';
        ctx.fillStyle = '#01cdfe';
        ctx.fillText('THE CYCLE HAS BEEN BROKEN', w/2, 270);
    }

    /**
     * Render victory stats with celebration style
     */
    renderVictoryStats(ctx, w, h, stats) {
        const boxY = 300;
        const boxH = 220;
        const statReveal = Math.min((this.victoryTimer - (this.victoryPhase === 2 ? 0 : 180)) / 60, 1);

        // Stats container with glow
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.strokeRect(w/2 - 250, boxY, 500, boxH);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(w/2 - 250, boxY, 500, boxH);
        ctx.restore();

        // Stats with animated reveal
        const statItems = [
            { label: '🏆 LEVELS', value: stats.finalLevel, color: '#01cdfe' },
            { label: '💀 KILLS', value: stats.totalKills, color: '#ff71ce' },
            { label: '⚡ CYCLES', value: stats.finalCycles, color: '#ffd700' },
            { label: '⏱ TIME', value: stats.time, color: '#05ffa1' }
        ];

        ctx.textAlign = 'center';
        statItems.forEach((stat, i) => {
            const itemProgress = Math.max(0, (statReveal - i * 0.2) / 0.3);
            if (itemProgress > 0) {
                const x = w/2 - 125 + (i % 2) * 250;
                const y = boxY + 60 + Math.floor(i / 2) * 90;

                ctx.globalAlpha = Math.min(itemProgress, 1);

                ctx.font = '14px "Share Tech Mono", monospace';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillText(stat.label, x, y);

                ctx.font = 'bold 36px "Share Tech Mono", monospace';
                ctx.fillStyle = stat.color;
                ctx.shadowColor = stat.color;
                ctx.shadowBlur = 10;
                ctx.fillText(stat.value.toString(), x, y + 40);
                ctx.shadowBlur = 0;

                ctx.globalAlpha = 1;
            }
        });

        // Final blade
        if (statReveal > 0.8) {
            ctx.globalAlpha = (statReveal - 0.8) / 0.2;
            ctx.font = '12px "Share Tech Mono", monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillText('FINAL BLADE', w/2, boxY + boxH - 40);
            ctx.font = 'bold 20px "Share Tech Mono", monospace';
            ctx.fillStyle = stats.bladeTier.color;
            ctx.fillText(stats.bladeTier.name, w/2, boxY + boxH - 15);
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Render confetti
     */
    renderVictoryConfetti(ctx) {
        ctx.save();
        this.victoryConfetti.forEach(c => {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rotation * Math.PI / 180);
            ctx.fillStyle = c.color;
            ctx.fillRect(-c.size/2, -c.size/4, c.size, c.size/2);
            ctx.restore();
        });
        ctx.restore();
    }

    /**
     * Render fireworks
     */
    renderVictoryFireworks(ctx) {
        this.victoryFireworks.forEach(fw => {
            if (!fw.exploded) {
                // Rising trail
                ctx.save();
                ctx.fillStyle = fw.color;
                ctx.shadowColor = fw.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(fw.x, fw.y, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            } else {
                // Explosion particles
                fw.particles.forEach(p => {
                    const alpha = p.life / p.maxLife;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = fw.color;
                    ctx.shadowColor = fw.color;
                    ctx.shadowBlur = 5;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                });
            }
        });
    }

    /**
     * Render sparkles
     */
    renderVictorySparkles(ctx) {
        this.victorySparkles.forEach(s => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, s.alpha);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;

            // Star shape
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
                const x = s.x + Math.cos(angle) * s.size;
                const y = s.y + Math.sin(angle) * s.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
    }

    /**
     * Draw corner bracket decorations
     */
    drawVictoryCornerBrackets(ctx, w, h, color, progress) {
        const size = 60 * progress;
        const offset = 30;

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;

        // Top-left
        ctx.beginPath();
        ctx.moveTo(offset, offset + size);
        ctx.lineTo(offset, offset);
        ctx.lineTo(offset + size, offset);
        ctx.stroke();

        // Top-right
        ctx.beginPath();
        ctx.moveTo(w - offset - size, offset);
        ctx.lineTo(w - offset, offset);
        ctx.lineTo(w - offset, offset + size);
        ctx.stroke();

        // Bottom-left
        ctx.beginPath();
        ctx.moveTo(offset, h - offset - size);
        ctx.lineTo(offset, h - offset);
        ctx.lineTo(offset + size, h - offset);
        ctx.stroke();

        // Bottom-right
        ctx.beginPath();
        ctx.moveTo(w - offset - size, h - offset);
        ctx.lineTo(w - offset, h - offset);
        ctx.lineTo(w - offset, h - offset - size);
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    /**
     * Render visual effects during victory waiting period
     * Shows the simulation collapsing before full victory sequence
     */
    renderVictoryWaitingEffects(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Build up effects over 3 seconds (180 frames)
        if (!this.victoryWaitStartTime) {
            this.victoryWaitStartTime = Date.now();
        }
        const elapsed = (Date.now() - this.victoryWaitStartTime) / 3000; // 0 to 1
        const intensity = Math.min(elapsed, 1);

        // Increasing red vignette
        const gradient = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.7);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, `rgba(255, 0, 0, ${intensity * 0.1})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, ${intensity * 0.4})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // Glitch lines
        const numGlitches = Math.floor(intensity * 15);
        for (let i = 0; i < numGlitches; i++) {
            if (Math.random() < 0.5) {
                const y = Math.random() * h;
                const glitchW = Math.random() * (100 + intensity * 200);
                ctx.fillStyle = `rgba(255, 0, 50, ${Math.random() * 0.3 * intensity})`;
                ctx.fillRect(Math.random() * w, y, glitchW, 2);
            }
        }

        // Warning text building up
        if (intensity > 0.3) {
            ctx.save();
            ctx.font = 'bold 24px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';

            const pulse = Math.sin(Date.now() / 100) > 0;
            if (pulse) {
                ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + intensity * 0.5})`;
                ctx.fillText('⚠ SIMULATION COLLAPSE IMMINENT ⚠', w / 2, 80);
            }

            // Countdown text
            const remaining = Math.max(0, 3 - Math.floor((Date.now() - this.victoryWaitStartTime) / 1000));
            if (intensity > 0.5) {
                ctx.font = 'bold 48px "Share Tech Mono", monospace';
                ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
                ctx.fillText(remaining.toString(), w / 2, h / 2);
            }

            ctx.restore();
        }

        // Screen shake effect (applied via camera in update)
        if (Math.random() < intensity * 0.3) {
            this.camera.addShake(intensity * 5, 5);
        }
    }

    /**
     * End victory sequence and show escape confirmation
     */
    endVictorySequence() {
        console.log('=== END VICTORY SEQUENCE ===');
        this.victoryActive = false;
        this.victoryWaitStartTime = null;

        // Show the escape confirmation modal instead of immediately playing cutscene
        this.showEscapeModal();
    }

    /**
     * Show the escape confirmation modal
     */
    showEscapeModal() {
        console.log('=== SHOW ESCAPE MODAL ===');
        this.state = 'escape';

        const modal = document.getElementById('escape-modal');
        const escapeBtn = document.getElementById('escape-button');
        const timeDisplay = document.getElementById('escape-time');
        const killsDisplay = document.getElementById('escape-kills');

        // Safety check - if modal doesn't exist, go straight to cutscene
        if (!modal || !escapeBtn) {
            console.error('Escape modal elements not found, playing cutscene directly');
            this.playVictoryCutscene();
            return;
        }

        // Update stats
        try {
            if (this.victoryStats && timeDisplay) {
                timeDisplay.textContent = this.victoryStats.time || '00:00';
            }
            if (this.victoryStats && killsDisplay) {
                killsDisplay.textContent = this.victoryStats.totalKills || '0';
            }
        } catch (e) {
            console.warn('Error updating escape modal stats:', e);
        }

        // Show modal
        modal.classList.remove('hidden');
        console.log('Escape modal shown, button disabled for 1 second');

        // Disable button initially to prevent accidental taps
        escapeBtn.disabled = true;
        escapeBtn.style.opacity = '0.5';

        // Store reference for cleanup
        const self = this;

        // Enable button after 1 second delay
        setTimeout(() => {
            if (!escapeBtn) return;

            escapeBtn.disabled = false;
            escapeBtn.style.opacity = '1';
            console.log('Escape button now enabled');

            // Handle escape button click (only add listeners after delay)
            let escapeHandled = false; // Prevent double-triggering
            const handleEscape = (e) => {
                if (escapeHandled) return; // Already handled
                escapeHandled = true;

                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('Escape button pressed!');

                try {
                    self.audio.playUIClick();
                } catch (err) {
                    console.warn('Audio error:', err);
                }

                // Remove listeners immediately
                escapeBtn.removeEventListener('click', handleEscape);
                escapeBtn.removeEventListener('touchend', handleEscape);
                escapeBtn.removeEventListener('touchstart', handleEscape);

                // Hide modal
                modal.classList.add('hidden');

                // Delay cutscene start slightly to prevent touch from bubbling
                setTimeout(() => {
                    self.playVictoryCutscene();
                }, 100);
            };

            escapeBtn.addEventListener('click', handleEscape);
            escapeBtn.addEventListener('touchend', handleEscape);
            escapeBtn.addEventListener('touchstart', handleEscape); // Catch touch early
        }, 1000);
    }

    /**
     * Play the victory/escape cutscene
     */
    playVictoryCutscene() {
        console.log('=== PLAY VICTORY CUTSCENE ===');
        console.log('CutsceneSystem exists:', !!this.cutsceneSystem);

        if (this.cutsceneSystem) {
            this.state = 'cutscene';
            this.cutsceneSystem.playVictory(() => {
                console.log('Victory cutscene complete, returning to menu');
                this.returnToMainMenu();
            }, this.victoryStats);
        } else {
            console.warn('No cutscene system, returning to menu');
            this.returnToMainMenu();
        }
    }

    /**
     * Show weapon maxed celebration
     */
    showWeaponMaxedCelebration(weaponName, tier) {
        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');

        if (title) title.textContent = 'DAMNNNNN!';
        if (subtitle) subtitle.textContent = '// MAXIMUM POWER ACHIEVED';

        // Clear and show celebration content
        choicesContainer.innerHTML = `
            <div class="celebration-content" style="text-align: center; padding: 20px;">
                <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 0.5s infinite;">⚔️</div>
                <div style="font-size: 24px; color: #ffff00; text-shadow: 0 0 20px #ffff00; margin-bottom: 10px; letter-spacing: 4px;">
                    YOU MAXED OUT
                </div>
                <div style="font-size: 32px; color: ${tier.color}; text-shadow: 0 0 30px ${tier.color}; margin-bottom: 20px; font-weight: bold;">
                    ${weaponName}
                </div>
                <div style="font-size: 18px; color: #00f0ff; margin-bottom: 15px;">
                    ${tier.name} UNLOCKED
                </div>
                <div style="font-size: 14px; color: #ff00aa; text-shadow: 0 0 10px #ff00aa; animation: pulse 1s infinite;">
                    🔥 LASER SWORD ACTIVATED 🔥
                </div>
                <div style="margin-top: 30px; font-size: 12px; color: rgba(255,255,255,0.5);">
                    Tap anywhere to continue
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Epic effects
        this.renderer.flash('#ffff00', 0.8);
        this.camera.addShake(15, 40);

        // Multiple flash effects
        setTimeout(() => this.renderer.flash(tier.color, 0.6), 200);
        setTimeout(() => this.renderer.flash('#ff00aa', 0.4), 400);

        // Handle dismissal
        const handleDismiss = () => {
            modal.classList.add('hidden');
            modal.removeEventListener('click', handleDismiss);
            window.removeEventListener('keydown', handleDismissKey);

            // Reset modal title for next time
            if (title) title.textContent = 'EVOLUTION DETECTED';
            if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';

            // Go directly to next level (stats already shown)
            setTimeout(() => {
                this.nextLevel();
            }, 300);
        };

        const handleDismissKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter' || e.key === '1' || e.key === '2' || e.key === '3') {
                handleDismiss();
            }
        };

        // Add slight delay before allowing dismissal to prevent accidental skip
        setTimeout(() => {
            modal.addEventListener('click', handleDismiss);
            window.addEventListener('keydown', handleDismissKey);
        }, 500);
    }

    /**
     * Progress to next level
     */
    nextLevel() {
        // Reset level state - keep paused until enemies spawn to prevent boss race condition
        this.levelComplete = false;
        this.boss = null;
        this.bossSpawned = true;  // Temporarily true to prevent premature boss spawn
        this.enemies = [];  // Clear old enemies

        // Reset level rewards tracking for new level
        this.levelRewards = this.createEmptyLevelRewards();

        this.renderer.flash('#ffffff', 0.5);

        setTimeout(() => {
            // Generate new random room for this level with zone-specific colors
            this.currentRoom = generateRandomRoom(this.currentLevel, this.currentZoneIndex);

            // Update camera bounds for new room
            this.camera.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);

            // Spawn enemies and interactables for new room
            this.spawnEnemies();  // This resets bossSpawned to false
            this.spawnInteractables();

            // Reset player position
            this.player.x = this.currentRoom.spawnPoint.x;
            this.player.y = this.currentRoom.spawnPoint.y;
            this.player.velocityX = 0;
            this.player.velocityY = 0;

            // NOW unpause - enemies are spawned, safe to start
            this.isPaused = false;
        }, 500);
    }

    /**
     * Create empty level rewards tracking object
     */
    createEmptyLevelRewards() {
        return {
            cyclesEarned: 0,
            xpGained: 0,
            killsThisLevel: 0,
            itemsCollected: [],
            bladeEvolutions: [],
            abilitiesUnlocked: []
        };
    }

    /**
     * Track a reward for end-of-level summary
     */
    trackReward(type, data) {
        if (!this.levelRewards) return;

        switch (type) {
            case 'cycles':
                this.levelRewards.cyclesEarned += data.amount;
                break;
            case 'xp':
                this.levelRewards.xpGained += data.amount;
                break;
            case 'kill':
                this.levelRewards.killsThisLevel++;
                break;
            case 'item':
                this.levelRewards.itemsCollected.push(data.name);
                break;
            case 'evolution':
                this.levelRewards.bladeEvolutions.push(data.tier);
                break;
            case 'ability':
                this.levelRewards.abilitiesUnlocked.push(data.name);
                break;
        }
    }

    /**
     * Show title screen
     */
    showTitleScreen() {
        this.state = 'title';

        // Initialize cutscene system if not already done
        if (!this.cutsceneSystem) {
            this.cutsceneSystem = new CutsceneSystem(this.canvas, this);
        }

        const titleScreen = document.getElementById('title-screen');
        const titleBtn = document.getElementById('title-start-btn');
        const codexBtn = document.getElementById('codex-btn');
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        const loadoutBtn = document.getElementById('loadout-btn');
        const godmodeBtn = document.getElementById('godmode-btn');
        const levelselectBtn = document.getElementById('levelselect-btn');

        titleScreen.classList.remove('hidden');

        // Update god mode button appearance
        this.updateGodModeButton(godmodeBtn);

        // Handle button click/touch - use flag to prevent double-fire from touch+click
        let titleClickHandled = false;
        const handleTitleClick = (e) => {
            // Prevent double-fire from touch and click events
            if (titleClickHandled) {
                console.log('Title click already handled, ignoring');
                return;
            }
            titleClickHandled = true;

            e.preventDefault();
            e.stopPropagation();

            // Audio already initialized by splash screen
            this.audio.playUIClick();

            titleScreen.classList.add('hidden');
            titleBtn.removeEventListener('click', handleTitleClick);
            titleBtn.removeEventListener('touchend', handleTitleClick);

            // Play intro cutscene before character select
            this.state = 'cutscene';
            this.cutsceneSystem.playIntro(() => {
                this.showCharacterSelect();
            });
        };

        titleBtn.addEventListener('click', handleTitleClick);
        titleBtn.addEventListener('touchend', handleTitleClick);

        // Codex button
        codexBtn.onclick = () => this.showCodex();

        // Leaderboard button
        leaderboardBtn.onclick = () => this.showLeaderboardModal();

        // Loadout button
        loadoutBtn.onclick = () => this.showLoadoutModal();

        // God mode button
        godmodeBtn.onclick = () => this.toggleGodMode(godmodeBtn);

        // Level select button
        levelselectBtn.onclick = () => this.showLevelSelectModal();

        // Mute button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            // Update button state based on current mute status
            this.updateMuteButton(muteBtn);

            muteBtn.onclick = () => {
                this.audio.toggleMute();
                this.updateMuteButton(muteBtn);
            };
        }

        // Handle key press
        const handleTitleKey = (e) => {
            if (this.state === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                titleBtn.click();
                window.removeEventListener('keydown', handleTitleKey);
            }
        };
        window.addEventListener('keydown', handleTitleKey);

        // Setup codex tabs
        this.setupCodexTabs();
    }

    /**
     * Update mute button appearance
     */
    updateMuteButton(btn) {
        const icon = btn.querySelector('.mute-icon');
        if (this.audio.isMuted()) {
            btn.classList.add('muted');
            icon.textContent = '🔇';
        } else {
            btn.classList.remove('muted');
            icon.textContent = '🔊';
        }
    }

    /**
     * Setup codex tab switching
     */
    setupCodexTabs() {
        const tabs = document.querySelectorAll('.codex-tab');
        const panels = document.querySelectorAll('.codex-panel');

        tabs.forEach(tab => {
            tab.onclick = () => {
                // Remove active from all
                tabs.forEach(t => t.classList.remove('active'));
                panels.forEach(p => p.classList.remove('active'));

                // Add active to clicked
                tab.classList.add('active');
                const panel = document.querySelector(`.codex-panel[data-panel="${tab.dataset.tab}"]`);
                if (panel) panel.classList.add('active');
            };
        });
    }

    /**
     * Show codex/FAQ modal
     */
    showCodex() {
        const modal = document.getElementById('faq-modal');
        const closeBtn = document.getElementById('faq-close-btn');

        modal.classList.remove('hidden');

        closeBtn.onclick = () => {
            modal.classList.add('hidden');
        };

        // ESC to close
        const handleEsc = (e) => {
            if (e.code === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    /**
     * Show loadout (cosmetics) modal
     */
    showLoadoutModal() {
        const modal = document.getElementById('loadout-modal');
        const hatsGrid = document.getElementById('loadout-hats');
        const suitsGrid = document.getElementById('loadout-suits');
        const closeBtn = document.getElementById('loadout-close-btn');
        const previewCanvas = document.getElementById('loadout-preview-canvas');
        const previewCtx = previewCanvas.getContext('2d');

        // Clear grids
        hatsGrid.innerHTML = '';
        suitsGrid.innerHTML = '';

        // Render preview function
        const renderPreview = () => {
            previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

            const suit = this.cosmeticsSystem.getEquippedSuit();
            const hat = this.cosmeticsSystem.getEquippedHat();

            const centerX = previewCanvas.width / 2;
            const centerY = previewCanvas.height / 2 + 10;

            // Body color
            const bodyColor = suit.bodyColor || '#00f0ff';
            const coreColor = suit.coreColor || '#ffffff';

            // Draw body
            previewCtx.fillStyle = bodyColor;
            previewCtx.shadowColor = bodyColor;
            previewCtx.shadowBlur = 15;
            previewCtx.beginPath();
            previewCtx.ellipse(centerX, centerY, 20, 25, 0, 0, Math.PI * 2);
            previewCtx.fill();

            // Draw core/eye
            previewCtx.fillStyle = coreColor;
            previewCtx.shadowColor = coreColor;
            previewCtx.shadowBlur = 10;
            previewCtx.beginPath();
            previewCtx.ellipse(centerX + 5, centerY - 5, 6, 8, 0, 0, Math.PI * 2);
            previewCtx.fill();

            // Draw hat
            previewCtx.shadowBlur = 0;
            this.cosmeticsSystem.renderHat(previewCtx, centerX, centerY - 25, true);
        };

        // Populate hats
        this.cosmeticsSystem.hats.forEach(hat => {
            const item = document.createElement('div');
            item.className = 'loadout-item';
            item.dataset.rarity = hat.rarity;
            item.title = hat.name;

            const isUnlocked = this.cosmeticsSystem.unlockedHats.includes(hat.id);
            const isEquipped = this.cosmeticsSystem.equippedHat === hat.id;

            if (!isUnlocked) item.classList.add('locked');
            if (isEquipped) item.classList.add('equipped');

            // Icon or preview
            if (hat.id === 'none') {
                item.innerHTML = '<span class="item-icon">∅</span>';
            } else if (hat.icon) {
                item.innerHTML = `<span class="item-icon" style="color: ${hat.color || '#fff'}">${hat.icon}</span>`;
            } else {
                item.innerHTML = `<div class="item-preview" style="background: ${hat.color}"></div>`;
            }

            // Click handler
            item.onclick = () => {
                if (isUnlocked) {
                    this.cosmeticsSystem.equipHat(hat.id);
                    // Update UI
                    hatsGrid.querySelectorAll('.loadout-item').forEach(i => i.classList.remove('equipped'));
                    item.classList.add('equipped');
                    renderPreview();
                    this.audio.playUIClick();
                }
            };

            hatsGrid.appendChild(item);
        });

        // Populate suits
        this.cosmeticsSystem.suits.forEach(suit => {
            const item = document.createElement('div');
            item.className = 'loadout-item';
            item.dataset.rarity = suit.rarity;
            item.title = suit.name;

            const isUnlocked = this.cosmeticsSystem.unlockedSuits.includes(suit.id);
            const isEquipped = this.cosmeticsSystem.equippedSuit === suit.id;

            if (!isUnlocked) item.classList.add('locked');
            if (isEquipped) item.classList.add('equipped');

            // Preview color
            if (suit.id === 'none') {
                item.innerHTML = '<span class="item-icon">∅</span>';
            } else {
                item.innerHTML = `<div class="item-preview" style="background: linear-gradient(135deg, ${suit.bodyColor} 60%, ${suit.coreColor} 100%)"></div>`;
            }

            // Click handler
            item.onclick = () => {
                if (isUnlocked) {
                    this.cosmeticsSystem.equipSuit(suit.id);
                    // Update UI
                    suitsGrid.querySelectorAll('.loadout-item').forEach(i => i.classList.remove('equipped'));
                    item.classList.add('equipped');
                    renderPreview();
                    this.audio.playUIClick();
                }
            };

            suitsGrid.appendChild(item);
        });

        // Initial preview
        renderPreview();

        // Show modal
        modal.classList.remove('hidden');

        // Close button
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
        };

        // ESC to close
        const handleEsc = (e) => {
            if (e.code === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    /**
     * Show leaderboard modal - Comprehensive 18-board system
     */
    showLeaderboardModal() {
        const modal = document.getElementById('leaderboard-modal');
        const list = document.getElementById('leaderboard-list');
        const closeBtn = document.getElementById('leaderboard-close-btn');
        const boardName = document.getElementById('lb-board-name');
        const boardDesc = document.getElementById('lb-board-desc');
        const pbValue = document.getElementById('lb-pb-value');
        const steamStatus = document.getElementById('lb-steam-status');

        // Current selected board
        let currentBoard = 'speedrun';

        // Update Steam status indicator
        if (this.leaderboard.steamEnabled) {
            steamStatus.textContent = 'STEAM';
            steamStatus.className = 'lb-steam-indicator connected';
        } else {
            steamStatus.textContent = 'LOCAL';
            steamStatus.className = 'lb-steam-indicator local';
        }

        // Function to render a board's entries
        const renderBoard = (boardId) => {
            currentBoard = boardId;
            const definition = this.leaderboard.getBoardDefinition(boardId);
            if (!definition) return;

            // Update board info
            boardName.textContent = definition.name;
            boardDesc.textContent = definition.description;

            // Get entries
            const entries = this.leaderboard.getTopEntries(boardId, 10);

            if (entries.length === 0) {
                list.innerHTML = '<div class="leaderboard-empty">No entries yet. Be the first!</div>';
            } else {
                list.innerHTML = entries.map((entry, index) => {
                    let rankClass = '';
                    if (index === 0) rankClass = 'gold';
                    else if (index === 1) rankClass = 'silver';
                    else if (index === 2) rankClass = 'bronze';

                    return `
                        <div class="leaderboard-entry ${rankClass}">
                            <div class="leaderboard-rank">#${index + 1}</div>
                            <div class="leaderboard-info">
                                <div class="leaderboard-character">${entry.character}</div>
                                <div class="leaderboard-details entry-meta">${entry.date} • Level ${entry.finalLevel}</div>
                            </div>
                            <div class="entry-time">${entry.displayScore}</div>
                        </div>
                    `;
                }).join('');
            }

            // Update personal best
            const pb = this.leaderboard.getPersonalBest(boardId);
            if (pb) {
                pbValue.textContent = pb.displayScore;
            } else {
                pbValue.textContent = '--';
            }

            // Update active tab styling
            document.querySelectorAll('.lb-board-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.board === boardId);
            });
        };

        // Setup category tab switching
        const categoryTabs = document.querySelectorAll('.lb-cat-tab');
        const categoryPanels = document.querySelectorAll('.lb-category-panel');

        categoryTabs.forEach(tab => {
            tab.onclick = () => {
                const category = tab.dataset.category;

                // Update active category tab
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding panel
                categoryPanels.forEach(panel => {
                    panel.classList.toggle('active', panel.dataset.panel === category);
                });

                // Select first board in this category
                const firstBoardTab = document.querySelector(`.lb-category-panel[data-panel="${category}"] .lb-board-tab`);
                if (firstBoardTab) {
                    renderBoard(firstBoardTab.dataset.board);
                }
            };
        });

        // Setup board tab switching
        document.querySelectorAll('.lb-board-tab').forEach(tab => {
            tab.onclick = () => {
                renderBoard(tab.dataset.board);
            };
        });

        // Initial render
        renderBoard('speedrun');

        modal.classList.remove('hidden');

        closeBtn.onclick = () => {
            modal.classList.add('hidden');
        };

        const handleEsc = (e) => {
            if (e.code === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    /**
     * Show level select modal for testing/debugging
     */
    showLevelSelectModal() {
        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');
        const hint = modal.querySelector('.upgrade-hint');

        if (hint) hint.style.display = 'none';
        if (title) title.textContent = 'LEVEL SELECT';
        if (subtitle) subtitle.textContent = '// DEBUG MODE - SELECT STARTING LEVEL';

        // Zone names for levels
        const levelZones = {
            1: 'DATA STREAM', 2: 'DATA STREAM', 3: 'DATA STREAM (BOSS)',
            4: 'NEURAL CORE', 5: 'NEURAL CORE', 6: 'NEURAL CORE (BOSS)',
            7: 'MEMORY BANK', 8: 'MEMORY BANK', 9: 'MEMORY BANK (BOSS)',
            10: 'FIREWALL', 11: 'FIREWALL', 12: 'CORRUPTED CORE (FINAL)'
        };

        choicesContainer.innerHTML = `
            <div style="text-align: center; padding: 10px;">
                <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 20px;">
                    Select a level to start from. Boss fights occur at levels 3, 6, 9, and 12.
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 500px; margin: 0 auto;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(level => {
                        const isBoss = level % 3 === 0;
                        const isFinal = level === 12;
                        const color = isFinal ? '#ff0044' : isBoss ? '#ffff00' : '#00f0ff';
                        return `
                            <button class="level-select-btn" data-level="${level}" style="
                                padding: 15px 10px;
                                background: rgba(0,0,0,0.5);
                                border: 2px solid ${color};
                                color: ${color};
                                cursor: pointer;
                                font-family: 'Courier New', monospace;
                                font-size: 14px;
                                transition: all 0.2s;
                            ">
                                <div style="font-size: 20px; font-weight: bold;">L${level}</div>
                                <div style="font-size: 9px; margin-top: 5px; opacity: 0.7;">
                                    ${levelZones[level]}
                                </div>
                                ${isBoss ? '<div style="font-size: 8px; margin-top: 3px; color: #ff00aa;">BOSS</div>' : ''}
                            </button>
                        `;
                    }).join('')}
                </div>
                <button id="level-select-close" class="start-btn" style="margin-top: 20px; padding: 12px 30px;">
                    <span class="btn-text">CANCEL</span>
                </button>
            </div>
        `;

        modal.classList.remove('hidden');

        // Handle level selection (with touch support)
        choicesContainer.querySelectorAll('.level-select-btn').forEach(btn => {
            btn.onmouseover = () => {
                btn.style.background = 'rgba(0,240,255,0.2)';
                btn.style.transform = 'scale(1.05)';
            };
            btn.onmouseout = () => {
                btn.style.background = 'rgba(0,0,0,0.5)';
                btn.style.transform = 'scale(1)';
            };
            const handleLevelSelect = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const level = parseInt(btn.dataset.level);
                modal.classList.add('hidden');
                if (hint) hint.style.display = '';
                if (title) title.textContent = 'EVOLUTION DETECTED';
                if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';
                this.startFromLevel(level);
            };
            btn.onclick = handleLevelSelect;
            btn.ontouchend = handleLevelSelect;
        });

        // Handle close (with touch support)
        const closeBtn = document.getElementById('level-select-close');
        const handleClose = (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.add('hidden');
            if (hint) hint.style.display = '';
            if (title) title.textContent = 'EVOLUTION DETECTED';
            if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';
        };
        closeBtn.onclick = handleClose;
        closeBtn.ontouchend = handleClose;

        const handleEsc = (e) => {
            if (e.code === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                if (hint) hint.style.display = '';
                if (title) title.textContent = 'EVOLUTION DETECTED';
                if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    /**
     * Start game from a specific level (for testing)
     */
    startFromLevel(level) {
        // Initialize audio
        this.audio.init();
        this.audio.playUIClick();

        // Hide title screen
        const titleScreen = document.getElementById('title-screen');
        titleScreen.classList.add('hidden');

        // Set up the level
        this.currentLevel = level;
        this.roomNumber = level;
        this.currentZoneIndex = Math.floor((level - 1) / 3);
        this.currentZone = this.zones[Math.min(this.currentZoneIndex, this.zones.length - 1)];

        // Give player scaled resources for higher levels
        const bonusCycles = (level - 1) * 150;
        this.cycles.gain(bonusCycles);

        // Scale blade evolution for higher levels
        const bonusXP = (level - 1) * 100;
        this.bladeEvolution.addXP(bonusXP);

        // Reset room for the level
        this.bossSpawned = false;
        this.levelComplete = false;
        this.enemiesKilledInLevel = 0;
        this.currentRoom = generateRandomRoom(level, level - 1);
        this.enemies = [];
        this.interactables = [];

        // Spawn enemies/boss based on level
        if (level % 3 === 0) {
            // Boss level - spawn boss directly
            this.spawnBoss();
        } else {
            // Normal level - spawn enemies
            this.spawnEnemies();
            this.spawnInteractables();
        }

        // Show character select then start
        this.showCharacterSelect();
    }

    /**
     * Show meta upgrades modal
     */
    showMetaUpgradesModal() {
        const modal = document.getElementById('meta-modal');
        const grid = document.getElementById('meta-upgrades-grid');
        const coresDisplay = document.getElementById('meta-cores');
        const closeBtn = document.getElementById('meta-close-btn');

        const renderUpgrades = () => {
            const cores = this.metaProgression.getDataCores();
            coresDisplay.textContent = cores;

            grid.innerHTML = this.metaProgression.upgrades.map(upgrade => {
                const currentLevel = this.metaProgression.getUpgradeLevel(upgrade.id);
                const isMaxed = currentLevel >= upgrade.maxLevel;
                const cost = this.metaProgression.getUpgradeCost(upgrade.id);
                const canAfford = cores >= cost;

                const effectValue = upgrade.effect * (currentLevel + 1);
                const effectText = upgrade.effectType === 'percent'
                    ? `+${(effectValue * 100).toFixed(0)}%`
                    : `+${effectValue}`;

                return `
                    <div class="meta-upgrade-card ${isMaxed ? 'maxed' : ''} ${canAfford && !isMaxed ? 'affordable' : ''}"
                         data-upgrade="${upgrade.id}">
                        <div class="meta-upgrade-name">${upgrade.name}</div>
                        <div class="meta-upgrade-level">Level ${currentLevel}/${upgrade.maxLevel}</div>
                        <div class="meta-upgrade-effect">${effectText} ${upgrade.description}</div>
                        <div class="meta-upgrade-cost">${isMaxed ? 'MAXED' : `Cost: ${cost} cores`}</div>
                    </div>
                `;
            }).join('');

            // Add click handlers
            grid.querySelectorAll('.meta-upgrade-card:not(.maxed)').forEach(card => {
                card.onclick = () => {
                    const upgradeId = card.dataset.upgrade;
                    if (this.metaProgression.purchaseUpgrade(upgradeId)) {
                        renderUpgrades();
                    }
                };
            });
        };

        renderUpgrades();
        modal.classList.remove('hidden');

        closeBtn.onclick = () => {
            modal.classList.add('hidden');
        };

        const handleEsc = (e) => {
            if (e.code === 'Escape' && !modal.classList.contains('hidden')) {
                modal.classList.add('hidden');
                window.removeEventListener('keydown', handleEsc);
            }
        };
        window.addEventListener('keydown', handleEsc);
    }

    /**
     * Toggle god mode for testing
     */
    toggleGodMode(btn) {
        this.godMode = !this.godMode;
        this.updateGodModeButton(btn);
        this.audio.playUIClick();
    }

    /**
     * Update god mode button appearance
     */
    updateGodModeButton(btn) {
        if (!btn) return;
        const textEl = btn.querySelector('.btn-text');
        const iconEl = btn.querySelector('.btn-icon');

        if (this.godMode) {
            textEl.textContent = 'GOD MODE ON';
            iconEl.textContent = '⚡';
            btn.style.background = 'rgba(255, 215, 0, 0.2)';
            btn.style.borderColor = '#ffd700';
            btn.style.color = '#ffd700';
        } else {
            textEl.textContent = 'GOD MODE';
            iconEl.textContent = '👁';
            btn.style.background = '';
            btn.style.borderColor = '';
            btn.style.color = '';
        }
    }

    /**
     * Show character selection screen
     */
    showCharacterSelect() {
        // Log who called this function for debugging
        console.log('showCharacterSelect called, current state:', this.state, new Error().stack);

        // Prevent showing character select if already playing or in wrong state
        if (this.state === 'playing' || this.state === 'controls' || this.showingCharacterSelect) {
            console.log('showCharacterSelect BLOCKED - already in state:', this.state);
            return;
        }

        this.state = 'character_select';
        this.showingCharacterSelect = true;

        // Track when character select was shown to prevent accidental clicks
        this.charSelectShownAt = Date.now();

        const modal = document.getElementById('character-modal');
        const grid = document.getElementById('character-grid');

        // Clear previous
        grid.innerHTML = '';

        let selectedIndex = 0;

        // Create character cards
        this.characterSystem.characters.forEach((char, index) => {
            const card = document.createElement('div');
            card.className = 'character-card' + (index === 0 ? ' selected' : '');
            card.style.setProperty('--char-color', char.color);
            card.style.setProperty('--eye-color', char.eyeColor);
            card.dataset.index = index;

            const statBars = this.characterSystem.getStatBars(char.id);

            card.innerHTML = `
                <div class="character-avatar">
                    <div class="character-avatar-inner">
                        <div class="character-avatar-eye"></div>
                    </div>
                </div>
                <div class="character-name">${char.name}</div>
                <div class="character-subtitle">${char.subtitle}</div>
                <div class="character-description">${char.description}</div>
                <div class="character-stats">
                    ${statBars.map(stat => `
                        <div class="stat-row">
                            <span class="stat-name">${stat.name}</span>
                            <div class="stat-bar-bg">
                                <div class="stat-bar-fill" style="width: ${stat.value}%; background: ${stat.color}"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="character-special">
                    <div class="special-name">${char.special.name}</div>
                    <div class="special-desc">${char.special.description}</div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                // Prevent accidental selection from double-clicks during cutscene skip
                // Require at least 300ms since modal was shown
                if (Date.now() - this.charSelectShownAt < 300) {
                    console.log('Ignoring click - character select just appeared');
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                this.selectCharacter(char.id);
            });

            grid.appendChild(card);
        });

        modal.classList.remove('hidden');

        // Back button handler
        const backBtn = document.getElementById('character-back-btn');
        this.charSelectBackHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hideCharacterSelect();
        };
        backBtn.addEventListener('click', this.charSelectBackHandler);

        // Keyboard navigation
        this.charSelectKeyHandler = (e) => {
            const cards = grid.querySelectorAll('.character-card');

            if (e.code === 'ArrowRight' || e.code === 'ArrowDown') {
                cards[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex + 1) % cards.length;
                cards[selectedIndex].classList.add('selected');
            } else if (e.code === 'ArrowLeft' || e.code === 'ArrowUp') {
                cards[selectedIndex].classList.remove('selected');
                selectedIndex = (selectedIndex - 1 + cards.length) % cards.length;
                cards[selectedIndex].classList.add('selected');
            } else if (e.code === 'Enter' || e.code === 'Space') {
                const charId = this.characterSystem.characters[selectedIndex].id;
                this.selectCharacter(charId);
            } else if (e.code === 'Escape') {
                this.hideCharacterSelect();
            }
        };
        window.addEventListener('keydown', this.charSelectKeyHandler);
    }

    /**
     * Hide character select and return to main menu
     */
    hideCharacterSelect() {
        // Don't hide if we're already playing or in wrong state
        if (this.state === 'playing' || this.state === 'controls') {
            console.log('hideCharacterSelect blocked - in state:', this.state);
            return;
        }

        const modal = document.getElementById('character-modal');
        modal.classList.add('hidden');

        // Remove keyboard handler
        if (this.charSelectKeyHandler) {
            window.removeEventListener('keydown', this.charSelectKeyHandler);
            this.charSelectKeyHandler = null;
        }

        // Remove back button handler
        const backBtn = document.getElementById('character-back-btn');
        if (backBtn && this.charSelectBackHandler) {
            backBtn.removeEventListener('click', this.charSelectBackHandler);
            this.charSelectBackHandler = null;
        }

        this.showingCharacterSelect = false;
        this.state = 'menu';

        // Show main menu again
        const menuModal = document.getElementById('menu-modal');
        if (menuModal) {
            menuModal.classList.remove('hidden');
        }
    }

    /**
     * Select a character and proceed
     */
    selectCharacter(charId) {
        this.characterSystem.select(charId);

        // Hide modal
        const modal = document.getElementById('character-modal');
        modal.classList.add('hidden');

        // Remove keyboard handler
        if (this.charSelectKeyHandler) {
            window.removeEventListener('keydown', this.charSelectKeyHandler);
            this.charSelectKeyHandler = null;
        }

        // Remove back button handler
        const backBtn = document.getElementById('character-back-btn');
        if (backBtn && this.charSelectBackHandler) {
            backBtn.removeEventListener('click', this.charSelectBackHandler);
            this.charSelectBackHandler = null;
        }

        this.showingCharacterSelect = false;

        // Apply character to player
        this.characterSystem.applyToPlayer(this.player);

        // Apply equipped cosmetics
        this.cosmeticsSystem.applySuitToPlayer(this.player);

        // Apply meta progression bonuses
        this.metaProgression.applyToPlayer(this.player, this);

        // Flash effect
        const char = this.characterSystem.getSelected();
        this.renderer.flash(char.color, 0.5);

        this.hud.addMessage(`OPERATIVE ${char.name} SELECTED`, 'system');

        // Show meta bonuses if any
        const bonuses = this.metaProgression.calculateBonuses();
        if (bonuses.healthBonus > 0 || bonuses.damageBonus > 0) {
            this.hud.addMessage(`META BONUSES ACTIVE`, 'system');
        }

        // Proceed to controls
        this.showControlsModal();
    }

    /**
     * Show controls modal
     */
    showControlsModal() {
        this.state = 'controls';

        const modal = document.getElementById('controls-modal');
        const startButton = document.getElementById('start-button');
        const dontShowCheckbox = document.getElementById('dont-show-again');

        // Check localStorage for preference
        const skipControls = localStorage.getItem('iteration_skip_controls') === 'true';

        // On mobile, skip controls modal entirely (it's hidden by CSS anyway)
        const isMobile = this.input.isTouchEnabled() ||
            /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (skipControls || isMobile) {
            this.startGame();
            return;
        }

        modal.classList.remove('hidden');

        // Handle key press - store as instance property for cleanup
        const handleControlsKey = (e) => {
            if (this.state === 'controls' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                cleanup();
                this.startGame();
            }
        };
        this.controlsKeyHandler = handleControlsKey;

        // Cleanup function to remove all handlers
        const cleanup = () => {
            startButton.removeEventListener('click', handleStart);
            startButton.removeEventListener('touchend', handleStart);
            if (this.controlsKeyHandler) {
                window.removeEventListener('keydown', this.controlsKeyHandler);
                this.controlsKeyHandler = null;
            }
            modal.classList.add('hidden');
        };

        // Handle start button click (with touch support)
        const handleStart = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            if (dontShowCheckbox.checked) {
                localStorage.setItem('iteration_skip_controls', 'true');
            }
            cleanup();
            this.startGame();
        };

        startButton.addEventListener('click', handleStart);
        startButton.addEventListener('touchend', handleStart);
        window.addEventListener('keydown', handleControlsKey);
    }

    /**
     * Start the actual gameplay
     */
    startGame() {
        this.state = 'playing';
        this.runStartTime = Date.now();
        const char = this.characterSystem.getSelected();

        // Defensive cleanup - ensure no stale handlers or callbacks
        if (this.charSelectKeyHandler) {
            window.removeEventListener('keydown', this.charSelectKeyHandler);
            this.charSelectKeyHandler = null;
        }
        if (this.controlsKeyHandler) {
            window.removeEventListener('keydown', this.controlsKeyHandler);
            this.controlsKeyHandler = null;
        }
        // Clear cutscene callback to prevent any delayed calls
        if (this.cutsceneSystem) {
            this.cutsceneSystem.onComplete = null;
        }
        this.showingCharacterSelect = false;

        // Start run stats tracking
        if (this.runStats) {
            this.runStats.startRun(char.name);
        }
        this.levelStartTime = Date.now();
        this.bossStartTime = null;

        // Show touch controls for mobile gameplay
        if (this.input.touchControls) {
            this.input.touchControls.show();
            // Highlight the active weapon button (default is weapon 0)
            this.input.touchControls.setActiveWeapon(this.weaponSystem.activeIndex || 0);
        }

        // Set initial weapon style (sword, nunchucks, lightsaber)
        const weaponStyles = ['sword', 'nunchucks', 'lightsaber'];
        this.player.weaponStyle = weaponStyles[this.weaponSystem.activeIndex || 0];

        // Play simulation drop sound - you're being thrown into the AI simulation
        this.audio.playSimulationDrop();

        // Visual effect - flash and shake to feel like dropping in
        this.renderer.flash('#00f0ff', 0.8);
        setTimeout(() => this.renderer.flash('#ff00aa', 0.5), 200);
        this.camera.addShake(20, 45);

        // Delayed message for immersion
        setTimeout(() => {
            this.hud.addMessage(`${char.name} ONLINE - SIMULATION INITIALIZED`, 'system');
        }, 500);

        // Start gameplay music after the drop sound settles
        setTimeout(() => {
            this.audio.startGameplayMusic();
        }, 2500);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.renderer.resize();
        this.hud.resize(this.canvas.width, this.canvas.height);
    }

    /**
     * Setup mobile-specific support
     */
    setupMobileSupport() {
        // Resume audio context on any touch (required for mobile)
        const resumeAudio = () => {
            if (this.audio) {
                this.audio.init();
                this.audio.resume();
            }
        };

        // Add touch listeners to document for audio resume
        document.addEventListener('touchstart', resumeAudio, { once: true, passive: true });
        document.addEventListener('touchend', resumeAudio, { once: true, passive: true });

        // Prevent default touch behaviors on canvas ONLY if not touching touch controls
        // This prevents scrolling/zooming but allows touch controls to work
        this.canvas.addEventListener('touchstart', (e) => {
            // Only prevent default if the touch is directly on canvas
            // Touch controls have their own event handlers
            if (e.target === this.canvas) {
                e.preventDefault();
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.target === this.canvas) {
                e.preventDefault();
            }
        }, { passive: false });

        // Detect mobile and log
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            console.log('Mobile device detected - touch controls enabled');
        }
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.hud.addMessage('SIMULATION PAUSED', 'system');
        }
    }

    /**
     * Toggle FAQ/Help screen
     */
    toggleFAQ() {
        const faqModal = document.getElementById('faq-modal');
        if (!faqModal) return;

        if (faqModal.classList.contains('hidden')) {
            // Open FAQ
            faqModal.classList.remove('hidden');
            this.isPaused = true;
            this.showingFAQ = true;

            // Setup close handlers
            const closeBtn = document.getElementById('faq-close-btn');
            const handleClose = () => {
                faqModal.classList.add('hidden');
                this.isPaused = false;
                this.showingFAQ = false;
                closeBtn.removeEventListener('click', handleClose);
                window.removeEventListener('keydown', handleCloseKey);
            };

            const handleCloseKey = (e) => {
                if (e.code === 'KeyH' || e.code === 'Escape' || e.code === 'Space') {
                    handleClose();
                }
            };

            closeBtn.addEventListener('click', handleClose);
            window.addEventListener('keydown', handleCloseKey);
        } else {
            // Close FAQ
            faqModal.classList.add('hidden');
            this.isPaused = false;
            this.showingFAQ = false;
        }
    }

    /**
     * Main game loop
     */
    loop(currentTime) {
        // Request next frame first to ensure loop continues even if error occurs
        requestAnimationFrame((time) => this.loop(time));

        try {
            // Calculate delta time
            if (!this.lastTime) this.lastTime = currentTime;
            this.deltaTime = currentTime - this.lastTime;
            this.lastTime = currentTime;

            // Cap delta time to prevent spiral of death
            if (this.deltaTime > 100) this.deltaTime = 100;

            // FPS calculation
            this.fpsCounter++;
            this.fpsTime += this.deltaTime;
            if (this.fpsTime >= 1000) {
                this.fps = this.fpsCounter;
                this.fpsCounter = 0;
                this.fpsTime = 0;
            }

            // Fixed timestep accumulator
            this.accumulator += this.deltaTime;

            // Update at fixed timestep (limit iterations to prevent mobile freeze)
            let iterations = 0;
            const maxIterations = 5;
            while (this.accumulator >= this.fixedTimeStep && iterations < maxIterations) {
                this.update(this.fixedTimeStep);
                this.accumulator -= this.fixedTimeStep;
                iterations++;
            }

            // If still behind, reset accumulator (prevents mobile freeze)
            if (this.accumulator > this.fixedTimeStep * maxIterations) {
                this.accumulator = 0;
            }

            // Render
            this.render();
        } catch (e) {
            console.error('Game loop error:', e);
        }
    }

    /**
     * Start the game loop
     */
    start() {
        requestAnimationFrame((time) => this.loop(time));
    }

    /**
     * Update game state
     */
    update(deltaTime) {
        // Update input state
        this.input.update();

        // Update cutscene if playing
        if (this.cutsceneSystem && this.cutsceneSystem.isPlaying()) {
            this.cutsceneSystem.update();

            // Skip cutscene with space, enter, or escape
            if (this.input.isKeyJustPressed('Space') ||
                this.input.isKeyJustPressed('Enter') ||
                this.input.isKeyJustPressed('Escape')) {
                this.cutsceneSystem.skip();
            }
            return; // Don't process other updates during cutscene
        }

        // Update final boss intro sequence (runs even when paused)
        if (this.finalBossIntroActive) {
            this.updateFinalBossIntro();
        }

        // Update victory sequence (runs independently)
        if (this.victoryActive) {
            this.updateVictorySequence();
            return; // Don't process other updates during victory
        }

        // Handle FAQ toggle with H key (works anytime during gameplay)
        if (this.state === 'playing' && this.input.isKeyJustPressed('KeyH') && !this.showingUpgrades) {
            this.toggleFAQ();
        }

        // Don't update game logic if paused or not playing
        if (this.isPaused || this.state !== 'playing') {
            return;
        }

        // Weapon switching with 1, 2, 3 keys
        // Weapon styles: 0 = sword, 1 = nunchucks, 2 = lightsaber
        const weaponStyles = ['sword', 'nunchucks', 'lightsaber'];

        if (this.input.isKeyJustPressed('Digit1') || this.input.isKeyJustPressed('Numpad1')) {
            if (this.weaponSystem.switchTo(0)) {
                this.audio.playWeaponSwitch();
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
                if (this.input.touchControls) this.input.touchControls.setActiveWeapon(0);
                this.player.weaponStyle = weaponStyles[0];
            }
        }
        if (this.input.isKeyJustPressed('Digit2') || this.input.isKeyJustPressed('Numpad2')) {
            if (this.weaponSystem.switchTo(1)) {
                this.audio.playWeaponSwitch();
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
                if (this.input.touchControls) this.input.touchControls.setActiveWeapon(1);
                this.player.weaponStyle = weaponStyles[1];
            }
        }
        if (this.input.isKeyJustPressed('Digit3') || this.input.isKeyJustPressed('Numpad3')) {
            if (this.weaponSystem.switchTo(2)) {
                this.audio.playWeaponSwitch();
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
                if (this.input.touchControls) this.input.touchControls.setActiveWeapon(2);
                this.player.weaponStyle = weaponStyles[2];
            }
        }

        // Update weapon system
        this.weaponSystem.update();

        // Update player
        if (this.player && this.player.active) {
            // Store previous position for cycle cost calculation
            const prevX = this.player.x;

            // Update player
            this.player.update(deltaTime, this.input);

            // Apply gravity
            this.physics.applyGravity(this.player);

            // Resolve collisions
            if (this.currentRoom) {
                this.physics.resolveCollisions(
                    this.player,
                    this.currentRoom.getActivePlatforms()
                );
            }

            // Calculate movement cost (skip in god mode)
            if (!this.godMode) {
                const moveDistance = Math.abs(this.player.x - prevX);
                if (moveDistance > 0.1) {
                    this.cycles.spendMove(moveDistance);
                }

                // Jump cost
                if (this.input.isActionJustPressed('jump') && this.player.coyoteTime > 0) {
                    this.cycles.spendJump();
                }

                // Attack cost
                if (this.input.isActionJustPressed('attack')) {
                    this.cycles.spendAttack();
                }
            }

            // Keep player in bounds
            this.player.x = Utils.clamp(this.player.x, 0, this.currentRoom.width - this.player.width);

            // Check for death by falling
            if (this.player.y > this.currentRoom.height + 100) {
                this.handlePlayerDeath('fall');
            }

            // Check for death by health depletion
            if (this.player.health <= 0) {
                this.handlePlayerDeath('enemy');
            }

            // Check attack hits on enemies
            this.checkAttackHits();
        }

        // Update enemies
        for (const enemy of this.enemies) {
            if (enemy.active) {
                enemy.update(deltaTime, this.player);

                // Apply gravity to enemies
                this.physics.applyGravity(enemy);

                // Resolve enemy collisions with platforms
                if (this.currentRoom) {
                    this.physics.resolveCollisions(
                        enemy,
                        this.currentRoom.getActivePlatforms()
                    );
                }

                // Check if enemy hits player
                if (this.player.active && enemy.collidesWith(this.player)) {
                    const actualDamage = this.calculateDamageTaken(enemy.damage);
                    if (actualDamage > 0 && this.player.takeDamage(actualDamage)) {
                        this.audio.playPlayerHurt();
                        this.cycles.applyDamagePenalty();
                        this.camera.addShake(5, 10);
                        this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.3);
                        // Check for death immediately after taking damage
                        if (this.player.health <= 0) {
                            this.handlePlayerDeath('enemy');
                        }
                    }
                }
            }
        }

        // Remove dead enemies and track kills
        const prevEnemyCount = this.enemies.length;
        this.enemies = this.enemies.filter(e => e.active);
        const killedThisFrame = prevEnemyCount - this.enemies.length;
        if (killedThisFrame > 0) {
            this.enemiesKilledInLevel += killedThisFrame;
        }

        // Check if all enemies killed - spawn boss
        if (this.enemies.length === 0 && !this.bossSpawned && !this.levelComplete) {
            this.spawnBoss();
        }

        // Update boss
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, this.player);

            // Apply gravity to boss
            this.physics.applyGravity(this.boss);

            // Resolve boss collisions with platforms
            if (this.currentRoom) {
                this.physics.resolveCollisions(
                    this.boss,
                    this.currentRoom.getActivePlatforms()
                );
            }

            // Check if boss hits player
            if (this.player.active && this.boss.collidesWith(this.player)) {
                const actualDamage = this.calculateDamageTaken(this.boss.damage);
                if (actualDamage > 0 && this.player.takeDamage(actualDamage)) {
                    this.audio.playPlayerHurt();
                    this.cycles.applyDamagePenalty();
                    this.camera.addShake(8, 15);
                    this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.4);
                    // Check for death immediately after taking damage
                    if (this.player.health <= 0) {
                        this.handlePlayerDeath('boss');
                    }
                }
            }

            // Check for boss projectiles hitting player
            for (const proj of this.boss.projectiles) {
                if (proj.active && this.player.active) {
                    const projBounds = { x: proj.x - 8, y: proj.y - 8, width: 16, height: 16 };
                    if (Utils.rectsOverlap(projBounds, this.player.getBounds())) {
                        proj.active = false;
                        const actualDamage = this.calculateDamageTaken(this.boss.damage * 0.5);
                        if (actualDamage > 0 && this.player.takeDamage(actualDamage)) {
                            this.audio.playPlayerHurt();
                            this.cycles.applyDamagePenalty();
                            this.camera.addShake(4, 8);
                            // Check for death immediately after taking damage
                            if (this.player.health <= 0) {
                                this.handlePlayerDeath('boss');
                            }
                        }
                    }
                }
            }
        }

        // Check for boss death
        if (this.boss && !this.boss.active && !this.levelComplete) {
            // Boss defeated!
            this.cycles.gain(this.boss.cycleReward);
            this.totalKills++;

            // Track boss kill time in run stats
            if (this.runStats && this.bossStartTime) {
                this.runStats.recordBossKill(this.boss.name || `Boss ${this.currentLevel}`, this.bossStartTime);
                this.bossStartTime = null;
            }

            // Track boss rewards
            this.trackReward('cycles', { amount: this.boss.cycleReward });
            this.trackReward('kill', {});

            // Big special meter gain from boss
            this.player.addSpecialMeter(50);

            // Full heal on boss kill
            this.player.health = this.player.maxHealth;

            // Gain blade XP from boss kill
            let xpMultiplier = this.upgradeSystem.modifiers.xpMultiplier;
            if (this.player.characterSpecial?.xpBonus) {
                xpMultiplier *= (1 + this.player.characterSpecial.xpBonus);
            }
            xpMultiplier *= this.tempBuffs.xpMultiplier;
            const bossXp = Math.floor(50 * xpMultiplier);
            this.addBladeXP(bossXp);
            this.trackReward('xp', { amount: bossXp });

            // Roll for boss drops (guaranteed)
            this.dropSystem.rollDrops(this.boss.x, this.boss.y, 'boss');

            this.completeLevel();
        }

        // Update interactables and check mouse hover
        for (const interactable of this.interactables) {
            interactable.update(deltaTime);
            interactable.checkPlayerProximity(this.player);

            // Check if mouse is hovering over this interactable (for visual feedback)
            interactable.mouseHover = !interactable.used && this.input.isMouseOver(
                this.canvas, this.camera,
                interactable.x, interactable.y,
                interactable.width, interactable.height
            );

            // Auto-collect items (health potions)
            if (interactable.autoCollect && interactable.checkCollision(this.player)) {
                const result = interactable.collect(this.player, this);
                if (result) {
                    this.hud.addMessage(result.message, 'success');
                }
            }
        }

        // Handle interaction - keyboard/button OR mouse click on object
        let mouseClickedOnInteractable = false;

        // Check for left-click on interactables (interact takes priority over attack)
        if (this.input.isLeftClickJustPressed()) {
            for (const interactable of this.interactables) {
                if (!interactable.used && interactable.mouseHover) {
                    // Check if player is close enough to interact (extended range for mouse)
                    const dx = (this.player.x + this.player.width / 2) - (interactable.x + interactable.width / 2);
                    const dy = (this.player.y + this.player.height / 2) - (interactable.y + interactable.height / 2);
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Allow interaction from further away with mouse (150px vs 60px for keyboard)
                    if (distance < 150) {
                        const result = interactable.interact(this.player, this);
                        if (result) {
                            if (result.type === 'portal') {
                                this.nextLevel();
                            } else if (result.type === 'lore') {
                                this.hud.addMessage(result.message, 'lore');
                            } else {
                                this.hud.addMessage(result.message, 'success');
                            }
                        }
                        mouseClickedOnInteractable = true;
                        break;
                    }
                }
            }

            // If didn't click on an interactable, treat as attack
            if (!mouseClickedOnInteractable && this.player && this.player.active) {
                this.player.attack();
            }
        }

        // Handle keyboard/button interaction (original method)
        if (this.input.isActionJustPressed('interact')) {
            for (const interactable of this.interactables) {
                if (interactable.playerNearby && !interactable.used) {
                    const result = interactable.interact(this.player, this);

                    if (result) {
                        if (result.type === 'portal') {
                            this.nextLevel();
                        } else if (result.type === 'lore') {
                            this.hud.addMessage(result.message, 'lore');
                        } else {
                            this.hud.addMessage(result.message, 'success');
                        }
                    }
                    break;
                }
            }
        }

        // Update room
        if (this.currentRoom) {
            this.currentRoom.update(deltaTime);
        }

        // Update cycles
        this.cycles.update();

        // Update blade evolution
        this.bladeEvolution.update();

        // Update blade ability effects
        this.updateBladeEffects();

        // Update drop system
        this.dropSystem.update(this);

        // Update ghost system
        this.ghostSystem.update(this);

        // Character special: Chrome's regeneration
        if (this.player.characterSpecial?.regenRate) {
            this.player.health = Math.min(
                this.player.health + this.player.characterSpecial.regenRate / 60,
                this.player.maxHealth
            );
        }

        // Check for cycle depletion
        if (this.cycles.isDepleted()) {
            this.handleCycleDepletion();
        }

        // Update camera
        this.camera.update();

        // Update HUD
        this.hud.update();

        // Hide controls hint after some movement
        if (this.showControls && this.cycles.totalSpent > 50) {
            this.showControls = false;
        }
    }

    /**
     * Check if player's attack hits enemies
     */
    checkAttackHits() {
        if (!this.player.isAttacking) return;

        const attackBounds = this.player.getAttackBounds();
        if (!attackBounds) return;

        // Get damage with weapon multiplier AND upgrade multipliers
        const baseDamage = 25;
        const weaponMultiplier = this.weaponSystem.getDamageMultiplier();
        const bladeMultiplier = this.bladeEvolution.getDamageMultiplier();
        const upgradeMultiplier = this.upgradeSystem.getDamageMultiplier(this.player);

        // Apply temp buffs and permanent buffs
        const tempDamageBoost = this.tempBuffs.damageBoost || 1.0;
        const permDamageBoost = this.permanentBuffs.damage || 1.0;

        // Character special: Blitz speed damage bonus
        let speedBonus = 1.0;
        if (this.player.characterSpecial?.speedDamageBonus) {
            const speedPercent = Math.abs(this.player.velocityX) / 8; // Max speed ~8
            speedBonus = 1 + speedPercent * 0.5; // Up to +50% at max speed
        }

        // Meta progression damage bonus
        const metaDamageBoost = 1 + (this.player.metaBonuses?.damageBonus || 0);

        // Charged attack multiplier
        const chargeMultiplier = this.player.getChargeDamageMultiplier ? this.player.getChargeDamageMultiplier() : 1.0;

        // Special ability (limit break) multiplier - 2x damage when active
        const specialMultiplier = this.player.isUsingSpecial ? 2.0 : 1.0;

        // Calculate damage with potential crit
        let rawDamage = baseDamage * weaponMultiplier * bladeMultiplier * upgradeMultiplier * tempDamageBoost * permDamageBoost * speedBonus * metaDamageBoost * chargeMultiplier * specialMultiplier;

        // Character special: Phantom's crit chance
        let extraCritChance = this.player.characterSpecial?.critChance || 0;

        // Meta progression crit bonus
        extraCritChance += (this.player.metaBonuses?.critBonus || 0);

        const { damage: finalDamage, isCrit } = this.upgradeSystem.calculateDamage(rawDamage, extraCritChance);

        // God mode - massive damage
        const godModeMultiplier = this.godMode ? 100 : 1;
        const damage = Math.floor(finalDamage * godModeMultiplier);

        const tier = this.bladeEvolution.getCurrentTier();

        // Track hits for chain ability
        const hitEnemies = [];
        let totalDamageDealt = 0;

        // Check regular enemies
        for (const enemy of this.enemies) {
            if (!enemy.active || enemy.invincibilityFrames > 0) continue;

            const enemyBounds = enemy.getBounds();

            if (Utils.rectsOverlap(attackBounds, enemyBounds)) {
                // Hit the enemy with blade damage (pass isCrit for dramatic effects)
                const killed = enemy.takeDamage(damage, isCrit);
                totalDamageDealt += damage;
                hitEnemies.push({ enemy, x: enemy.x, y: enemy.y, killed });

                // Play hit sound
                this.audio.playHit(isCrit);

                // Crit indicator
                if (isCrit) {
                    this.spawnCritText(enemy.x, enemy.y - 20, damage);
                }

                // Weapon ability: Razor bleed (DoT that inherits crit!)
                const weaponTier = this.weaponSystem.getActiveTierData();
                if (weaponTier.ability === 'bleed' && !killed) {
                    // Apply bleed: 5 damage per tick, 180 frames (3 seconds), crit inherited
                    const bleedDamage = Math.floor(damage * 0.2); // 20% of hit damage per tick
                    enemy.applyStatusEffect('bleed', bleedDamage, 180, isCrit);
                }

                // Weapon ability: Crusher shockwave knockback
                if (weaponTier.ability === 'shockwave' && !killed) {
                    // Strong knockback away from player
                    const knockDir = Math.sign(enemy.x - this.player.x) || 1;
                    enemy.velocityX = knockDir * 15;
                    enemy.velocityY = -8;
                }

                // Magic Imbue effects
                if (this.activeImbue && !killed) {
                    switch (this.activeImbue.type) {
                        case 'cold':
                            // Slow enemy by 50% for 3 seconds
                            enemy.applySlow(0.5, 180);
                            enemy.applyStatusEffect('freeze', 0, 180, false);
                            break;
                        case 'fire':
                            // Apply burn DoT
                            const burnDamage = Math.floor(damage * 0.15);
                            enemy.applyStatusEffect('burn', burnDamage, 180, isCrit);
                            break;
                        case 'electric':
                            // Chain to nearby enemies
                            this.triggerElectricChain(enemy.x, enemy.y, damage * 0.3, 150, 2);
                            break;
                    }
                }

                // Explosive ability - AOE damage
                if (this.bladeEvolution.hasAbility('explosive') && tier.explosionRadius) {
                    this.triggerExplosion(enemy.x, enemy.y, tier.explosionRadius, damage * tier.explosionDamage);
                }

                if (killed) {
                    // Play death sound
                    this.audio.playEnemyDeath();

                    // Teleport imbue: warp to kill location
                    if (this.activeImbue?.type === 'teleport') {
                        this.player.x = enemy.x;
                        this.player.y = enemy.y - 20;
                        this.player.velocityY = 0;
                        this.renderer.flash('#aa00ff', 0.3);
                        this.spawnTeleportParticles(enemy.x, enemy.y);
                    }

                    // Gain cycles from kill (with upgrade multiplier + meta bonus + character bonus)
                    const metaCycleBonus = 1 + (this.player.metaBonuses?.cycleBonus || 0);
                    const charCycleBonus = 1 + (this.player.characterSpecial?.cycleBonus || 0);
                    const cycleGain = Math.floor(50 * this.upgradeSystem.modifiers.cycleGainMultiplier * metaCycleBonus * charCycleBonus);
                    this.cycles.gain(cycleGain);
                    this.killCount++;
                    this.totalKills++;

                    // Track rewards for level summary
                    this.trackReward('cycles', { amount: cycleGain });
                    this.trackReward('kill', {});

                    // Add special meter on kill
                    this.player.addSpecialMeter(10);

                    // Heal player on kill (base 10 + character kill heal bonus)
                    const baseHeal = 10;
                    const killHealBonus = this.player.characterSpecial?.killHeal || 0;
                    const healAmount = baseHeal + killHealBonus;
                    this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);

                    // Gain blade XP from kill (with upgrade multiplier + character + meta bonus)
                    let xpMultiplier = this.upgradeSystem.modifiers.xpMultiplier;
                    if (this.player.characterSpecial?.xpBonus) {
                        xpMultiplier *= (1 + this.player.characterSpecial.xpBonus);
                    }
                    xpMultiplier *= this.tempBuffs.xpMultiplier;
                    xpMultiplier *= (1 + (this.player.metaBonuses?.xpBonus || 0));
                    const xpGain = Math.floor(10 * xpMultiplier);
                    this.addBladeXP(xpGain);
                    this.trackReward('xp', { amount: xpGain });

                    // Roll for drops
                    this.dropSystem.rollDrops(enemy.x, enemy.y, 'normal');
                }

                // Visual feedback - use blade color (extra shake for crits)
                this.camera.addShake(isCrit ? 6 : 3, isCrit ? 10 : 5);
                this.renderer.flash(isCrit ? '#ffffff' : this.bladeEvolution.getBladeColor(), isCrit ? 0.4 : 0.2);
            }
        }

        // Chain ability - chain damage to nearby enemies
        if (this.bladeEvolution.hasAbility('chain') && hitEnemies.length > 0 && tier.chainRange) {
            this.triggerChainDamage(hitEnemies, damage * tier.chainDamage, tier.chainRange, tier.maxChains || 2);
        }

        // Lifesteal from blade ability
        let lifestealPercent = 0;
        if (this.bladeEvolution.hasAbility('lifesteal') && tier.lifestealPercent) {
            lifestealPercent += tier.lifestealPercent;
        }
        // Add lifesteal from upgrades
        lifestealPercent += this.upgradeSystem.getLifestealPercent();
        // Character special: Havoc's lifesteal
        if (this.player.characterSpecial?.lifesteal) {
            lifestealPercent += this.player.characterSpecial.lifesteal;
        }
        // Meta progression lifesteal
        if (this.player.metaBonuses?.lifestealBonus) {
            lifestealPercent += this.player.metaBonuses.lifestealBonus;
        }

        if (lifestealPercent > 0 && totalDamageDealt > 0) {
            const healAmount = Math.floor(totalDamageDealt * lifestealPercent);
            if (healAmount > 0) {
                this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
                this.spawnHealParticle(this.player.x, this.player.y, healAmount);
            }
        }

        // Check boss
        if (this.boss && this.boss.active && this.boss.invincibilityFrames <= 0) {
            const bossBounds = this.boss.getBounds();

            if (Utils.rectsOverlap(attackBounds, bossBounds)) {
                // Hit the boss with blade damage + upgrade multipliers
                const bossDamage = Math.floor(20 * bladeMultiplier * upgradeMultiplier);
                const killed = this.boss.takeDamage(bossDamage);

                // Weapon ability: Razor bleed on boss (DoT that inherits crit!)
                const bossWeaponTier = this.weaponSystem.getActiveTierData();
                if (bossWeaponTier.ability === 'bleed' && !killed) {
                    const bleedDamage = Math.floor(bossDamage * 0.15); // 15% of hit damage per tick
                    this.boss.applyStatusEffect('bleed', bleedDamage, 180, isCrit);
                }

                // Lifesteal on boss
                if (lifestealPercent > 0) {
                    const healAmount = Math.floor(bossDamage * lifestealPercent);
                    if (healAmount > 0) {
                        this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
                        this.spawnHealParticle(this.player.x, this.player.y, healAmount);
                    }
                }

                // Explosive on boss
                if (this.bladeEvolution.hasAbility('explosive') && tier.explosionRadius) {
                    this.triggerExplosion(this.boss.x, this.boss.y, tier.explosionRadius, bossDamage * tier.explosionDamage);
                }

                // Visual feedback - use blade color
                this.camera.addShake(5, 8);
                this.renderer.flash(this.bladeEvolution.getBladeColor(), 0.3);
            }
        }

        // Wave ability - spawn projectile on attack start (once per attack)
        if (this.bladeEvolution.hasAbility('wave') && this.player.attackFrame === 1) {
            this.spawnBladeWave(tier);
        }

        // Weapon laser ability - spawn laser on attack (once per attack)
        if (this.player.attackFrame === 1) {
            // Play swing sound
            this.audio.playSwing(this.weaponSystem.activeWeapon);

            const weaponTier = this.weaponSystem.getActiveTierData();

            // Max tier weapon always shoots laser
            if (weaponTier.isLaser) {
                const lasers = this.weaponSystem.createLaser(
                    this.player.x,
                    this.player.y,
                    this.player.facingRight,
                    this.player
                );
                this.laserProjectiles.push(...lasers);
                this.hud.addMessage('', ''); // trigger visual without message
            }
            // Tier 4 weapons have a chance to shoot laser
            else if (weaponTier.laserChance && Math.random() < weaponTier.laserChance) {
                const lasers = this.weaponSystem.createLaser(
                    this.player.x,
                    this.player.y,
                    this.player.facingRight,
                    this.player
                );
                this.laserProjectiles.push(...lasers);
            }
        }
    }

    /**
     * Spawn a blade wave projectile
     */
    spawnBladeWave(tier) {
        // Character special: Nova's wave bonus
        let waveBonus = 1.0;
        if (this.player.characterSpecial?.waveBonus) {
            waveBonus = 1 + this.player.characterSpecial.waveBonus;
        }

        const wave = {
            x: this.player.x + (this.player.facingRight ? 30 : -30),
            y: this.player.y,
            vx: (this.player.facingRight ? 1 : -1) * (tier.waveSpeed || 8),
            vy: 0,
            width: 40,
            height: 20,
            damage: Math.floor(25 * this.bladeEvolution.getDamageMultiplier() * (tier.waveDamage || 0.5) * waveBonus),
            color: tier.waveColor || tier.color,
            lifetime: 60,
            active: true
        };
        if (!this.bladeWaves) this.bladeWaves = [];
        this.bladeWaves.push(wave);
    }

    /**
     * Trigger explosion AOE damage
     */
    triggerExplosion(x, y, radius, damage) {
        // Character special: Sage's explosion bonus
        let explosionBonus = 1.0;
        if (this.player.characterSpecial?.explosionBonus) {
            explosionBonus = 1 + this.player.characterSpecial.explosionBonus;
        }
        const actualRadius = radius * explosionBonus;

        // Damage nearby enemies
        for (const enemy of this.enemies) {
            if (!enemy.active) continue;
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < actualRadius && dist > 0) {
                enemy.takeDamage(Math.floor(damage));
            }
        }
        // Spawn explosion particles
        this.spawnExplosionParticles(x, y, actualRadius);
    }

    /**
     * Chain damage to nearby enemies
     */
    triggerChainDamage(hitEnemies, chainDamage, chainRange, maxChains) {
        const alreadyHit = new Set(hitEnemies.map(h => h.enemy));
        let chainsLeft = maxChains;

        for (const hit of hitEnemies) {
            if (chainsLeft <= 0) break;

            for (const enemy of this.enemies) {
                if (!enemy.active || alreadyHit.has(enemy)) continue;

                const dx = enemy.x - hit.x;
                const dy = enemy.y - hit.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < chainRange) {
                    enemy.takeDamage(Math.floor(chainDamage));
                    alreadyHit.add(enemy);
                    chainsLeft--;

                    // Spawn chain lightning visual
                    this.spawnChainLightning(hit.x, hit.y, enemy.x, enemy.y);

                    if (chainsLeft <= 0) break;
                }
            }
        }
    }

    /**
     * Trigger electric chain from imbue (different from blade chain ability)
     */
    triggerElectricChain(x, y, damage, range, maxChains) {
        const alreadyHit = new Set();
        let currentX = x;
        let currentY = y;

        for (let i = 0; i < maxChains; i++) {
            let closestEnemy = null;
            let closestDist = range;

            for (const enemy of this.enemies) {
                if (!enemy.active || alreadyHit.has(enemy)) continue;

                const dx = enemy.x - currentX;
                const dy = enemy.y - currentY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }

            if (closestEnemy) {
                closestEnemy.takeDamage(Math.floor(damage));
                closestEnemy.applyStatusEffect('electric', 0, 30, false); // Visual only
                alreadyHit.add(closestEnemy);

                // Spawn electric visual
                this.spawnChainLightning(currentX, currentY, closestEnemy.x, closestEnemy.y, '#ffff00');

                currentX = closestEnemy.x;
                currentY = closestEnemy.y;
            } else {
                break;
            }
        }
    }

    /**
     * Spawn teleport particles
     */
    spawnTeleportParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Utils.random(2, 5);
            this.bladeWaves.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                width: 8,
                height: 8,
                damage: 0,
                color: '#aa00ff',
                lifetime: 20,
                active: true,
                isParticle: true
            });
        }
    }

    /**
     * Calculate actual damage taken after reductions
     */
    calculateDamageTaken(baseDamage) {
        // God mode - no damage
        if (this.godMode) {
            return 0;
        }

        // Check invincibility from temp buff
        if (this.tempBuffs.invincible) {
            return 0;
        }

        // Check shield from temp buff
        if (this.tempBuffs.shield && this.tempBuffs.shieldHits > 0) {
            this.tempBuffs.shieldHits--;
            if (this.tempBuffs.shieldHits <= 0) {
                this.tempBuffs.shield = false;
            }
            this.hud.addMessage('SHIELD BLOCKED!', 'success');
            return 0;
        }

        let damage = baseDamage;

        // Character special: Titan's damage reduction
        if (this.player.characterSpecial?.damageReduction) {
            damage *= (1 - this.player.characterSpecial.damageReduction);
        }

        // Upgrade modifier: damage taken multiplier
        damage *= this.upgradeSystem.modifiers.damageTakenMultiplier;

        return Math.floor(damage);
    }

    /**
     * Spawn heal particle effect
     */
    spawnHealParticle(x, y, amount) {
        // Add floating heal number
        if (!this.floatingTexts) this.floatingTexts = [];
        this.floatingTexts.push({
            x, y: y - 20,
            text: `+${amount}`,
            color: '#00ff88',
            lifetime: 40,
            vy: -1
        });
    }

    /**
     * Spawn crit text effect
     */
    spawnCritText(x, y, damage) {
        if (!this.floatingTexts) this.floatingTexts = [];
        this.floatingTexts.push({
            x, y,
            text: `CRIT! ${damage}`,
            color: '#ffff00',
            lifetime: 50,
            vy: -1.5
        });
    }

    /**
     * Spawn explosion particles
     */
    spawnExplosionParticles(x, y, radius) {
        if (!this.explosions) this.explosions = [];
        this.explosions.push({
            x, y, radius,
            lifetime: 15,
            maxLifetime: 15,
            color: this.bladeEvolution.getBladeColor()
        });
    }

    /**
     * Spawn chain lightning visual
     */
    spawnChainLightning(x1, y1, x2, y2) {
        if (!this.chainLightnings) this.chainLightnings = [];
        this.chainLightnings.push({
            x1, y1, x2, y2,
            lifetime: 10,
            color: '#ff8800'
        });
    }

    /**
     * Update all blade ability effects
     */
    updateBladeEffects() {
        // Update blade waves
        if (this.bladeWaves) {
            for (const wave of this.bladeWaves) {
                if (!wave.active) continue;

                wave.x += wave.vx;
                wave.lifetime--;

                if (wave.lifetime <= 0) {
                    wave.active = false;
                    continue;
                }

                // Check collision with enemies
                for (const enemy of this.enemies) {
                    if (!enemy.active) continue;
                    const dx = enemy.x - wave.x;
                    const dy = enemy.y - wave.y;
                    if (Math.abs(dx) < wave.width && Math.abs(dy) < wave.height) {
                        enemy.takeDamage(wave.damage);
                        wave.active = false;
                        this.camera.addShake(2, 3);
                        break;
                    }
                }

                // Check boss
                if (wave.active && this.boss && this.boss.active) {
                    const dx = this.boss.x - wave.x;
                    const dy = this.boss.y - wave.y;
                    if (Math.abs(dx) < wave.width + 40 && Math.abs(dy) < wave.height + 40) {
                        this.boss.takeDamage(wave.damage);
                        wave.active = false;
                        this.camera.addShake(3, 5);
                    }
                }
            }
            this.bladeWaves = this.bladeWaves.filter(w => w.active);
        }

        // Update explosions
        if (this.explosions) {
            for (const exp of this.explosions) {
                exp.lifetime--;
            }
            this.explosions = this.explosions.filter(e => e.lifetime > 0);
        }

        // Update chain lightnings
        if (this.chainLightnings) {
            for (const chain of this.chainLightnings) {
                chain.lifetime--;
            }
            this.chainLightnings = this.chainLightnings.filter(c => c.lifetime > 0);
        }

        // Update floating texts
        if (this.floatingTexts) {
            for (const text of this.floatingTexts) {
                text.y += text.vy;
                text.lifetime--;
            }
            this.floatingTexts = this.floatingTexts.filter(t => t.lifetime > 0);
        }

        // Update laser projectiles
        if (this.laserProjectiles) {
            for (const laser of this.laserProjectiles) {
                if (!laser.active) continue;

                laser.x += laser.vx;
                laser.y += laser.vy;
                laser.lifetime--;

                if (laser.lifetime <= 0) {
                    laser.active = false;
                    continue;
                }

                // Check collision with enemies
                for (const enemy of this.enemies) {
                    if (!enemy.active) continue;
                    const dx = enemy.x - laser.x;
                    const dy = enemy.y - laser.y;
                    if (Math.abs(dx) < laser.width + 20 && Math.abs(dy) < laser.height + 20) {
                        enemy.takeDamage(laser.damage);
                        // Lasers pierce through enemies
                        this.camera.addShake(2, 3);
                        // Spawn hit effect
                        this.spawnLaserHitEffect(enemy.x, enemy.y, laser.color);
                    }
                }

                // Check boss
                if (this.boss && this.boss.active) {
                    const dx = this.boss.x - laser.x;
                    const dy = this.boss.y - laser.y;
                    if (Math.abs(dx) < laser.width + 40 && Math.abs(dy) < laser.height + 40) {
                        this.boss.takeDamage(laser.damage);
                        this.camera.addShake(3, 5);
                        this.spawnLaserHitEffect(this.boss.x, this.boss.y, laser.color);
                    }
                }
            }
            this.laserProjectiles = this.laserProjectiles.filter(l => l.active);
        }

        // Update laser hit effects
        if (this.laserHits) {
            for (const hit of this.laserHits) {
                hit.lifetime--;
            }
            this.laserHits = this.laserHits.filter(h => h.lifetime > 0);
        }
    }

    /**
     * Spawn laser hit effect
     */
    spawnLaserHitEffect(x, y, color) {
        if (!this.laserHits) this.laserHits = [];
        this.laserHits.push({
            x, y,
            color,
            lifetime: 8,
            maxLifetime: 8
        });
    }

    /**
     * Render blade ability effects
     */
    renderBladeEffects(ctx) {
        const camPos = this.camera.getFinalPosition();

        // Render blade waves
        if (this.bladeWaves) {
            for (const wave of this.bladeWaves) {
                if (!wave.active) continue;
                const sx = wave.x - camPos.x;
                const sy = wave.y - camPos.y;

                ctx.save();
                ctx.globalAlpha = wave.lifetime / 60;
                ctx.shadowColor = wave.color;
                ctx.shadowBlur = 15;
                ctx.fillStyle = wave.color;

                // Draw crescent wave shape
                ctx.beginPath();
                ctx.ellipse(sx, sy, wave.width / 2, wave.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(sx, sy, wave.width / 4, wave.height / 4, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // Render explosions
        if (this.explosions) {
            for (const exp of this.explosions) {
                const sx = exp.x - camPos.x;
                const sy = exp.y - camPos.y;
                const progress = 1 - (exp.lifetime / exp.maxLifetime);
                const currentRadius = exp.radius * progress;

                ctx.save();
                ctx.globalAlpha = 1 - progress;
                ctx.strokeStyle = exp.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = exp.color;
                ctx.shadowBlur = 20;

                ctx.beginPath();
                ctx.arc(sx, sy, currentRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner ring
                ctx.globalAlpha = (1 - progress) * 0.5;
                ctx.beginPath();
                ctx.arc(sx, sy, currentRadius * 0.6, 0, Math.PI * 2);
                ctx.stroke();

                ctx.restore();
            }
        }

        // Render chain lightnings
        if (this.chainLightnings) {
            for (const chain of this.chainLightnings) {
                const sx1 = chain.x1 - camPos.x;
                const sy1 = chain.y1 - camPos.y;
                const sx2 = chain.x2 - camPos.x;
                const sy2 = chain.y2 - camPos.y;

                ctx.save();
                ctx.globalAlpha = chain.lifetime / 10;
                ctx.strokeStyle = chain.color;
                ctx.lineWidth = 2;
                ctx.shadowColor = chain.color;
                ctx.shadowBlur = 10;

                // Draw jagged lightning
                ctx.beginPath();
                ctx.moveTo(sx1, sy1);
                const segments = 4;
                for (let i = 1; i < segments; i++) {
                    const t = i / segments;
                    const mx = sx1 + (sx2 - sx1) * t + (Math.random() - 0.5) * 20;
                    const my = sy1 + (sy2 - sy1) * t + (Math.random() - 0.5) * 20;
                    ctx.lineTo(mx, my);
                }
                ctx.lineTo(sx2, sy2);
                ctx.stroke();

                ctx.restore();
            }
        }

        // Render floating texts
        if (this.floatingTexts) {
            for (const text of this.floatingTexts) {
                const sx = text.x - camPos.x;
                const sy = text.y - camPos.y;

                ctx.save();
                ctx.globalAlpha = text.lifetime / 40;
                ctx.fillStyle = text.color;
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.shadowColor = text.color;
                ctx.shadowBlur = 8;
                ctx.fillText(text.text, sx, sy);
                ctx.restore();
            }
        }

        // Render laser projectiles
        if (this.laserProjectiles) {
            for (const laser of this.laserProjectiles) {
                if (!laser.active) continue;
                const sx = laser.x - camPos.x;
                const sy = laser.y - camPos.y;

                ctx.save();
                ctx.globalAlpha = laser.lifetime / 60;

                // Outer glow
                ctx.shadowColor = laser.glow || laser.color;
                ctx.shadowBlur = 20;

                // Main laser beam
                ctx.fillStyle = laser.color;
                ctx.beginPath();
                ctx.ellipse(sx, sy, laser.width, laser.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();

                // Core (white center)
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.ellipse(sx, sy, laser.width * 0.6, laser.height / 4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Leading edge spark
                const sparkX = sx + (laser.vx > 0 ? laser.width : -laser.width);
                ctx.fillStyle = laser.color;
                ctx.beginPath();
                ctx.arc(sparkX, sy, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // Render laser hit effects
        if (this.laserHits) {
            for (const hit of this.laserHits) {
                const sx = hit.x - camPos.x;
                const sy = hit.y - camPos.y;
                const progress = 1 - (hit.lifetime / hit.maxLifetime);
                const radius = 10 + progress * 20;

                ctx.save();
                ctx.globalAlpha = 1 - progress;
                ctx.strokeStyle = hit.color;
                ctx.lineWidth = 3;
                ctx.shadowColor = hit.color;
                ctx.shadowBlur = 15;

                ctx.beginPath();
                ctx.arc(sx, sy, radius, 0, Math.PI * 2);
                ctx.stroke();

                // Inner flash
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = (1 - progress) * 0.5;
                ctx.beginPath();
                ctx.arc(sx, sy, radius * 0.3, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }
    }

    /**
     * Add blade XP and handle evolution
     */
    addBladeXP(amount) {
        const evolved = this.bladeEvolution.addXP(amount);

        if (evolved) {
            // Blade evolved! Show effects
            const newTier = this.bladeEvolution.getCurrentTier();

            // Track evolution for level summary
            this.trackReward('evolution', { tier: newTier.name });
            if (newTier.ability) {
                this.trackReward('ability', { name: newTier.abilityDesc });
            }

            // Play level up sound
            this.audio.playLevelUp();

            this.renderer.flash(newTier.color, 0.6);
            this.camera.addShake(8, 30);

            // Update player blade visuals
            this.updatePlayerBlade();
        }
    }

    /**
     * Update player's blade color and stats from evolution system
     */
    updatePlayerBlade() {
        if (this.player) {
            this.player.bladeType = this.bladeEvolution.getBladeName();
            this.player.bladeColor = this.bladeEvolution.getBladeColor();
            this.player.bladeGlow = this.bladeEvolution.getGlowColor();
            this.player.bladeDamageMultiplier = this.bladeEvolution.getDamageMultiplier();
            this.player.bladeVisuals = this.bladeEvolution.getVisuals();
            this.player.bladeLength = this.bladeEvolution.getBladeLength();
        }
    }

    /**
     * Render game
     */
    render() {
        const ctx = this.renderer.getContext();

        // Begin frame
        this.renderer.beginFrame();

        // Render room
        if (this.currentRoom) {
            this.currentRoom.render(ctx, this.camera);
        }

        // Render interactables
        for (const interactable of this.interactables) {
            interactable.render(ctx, this.camera);
        }

        // Render enemies
        for (const enemy of this.enemies) {
            enemy.render(ctx, this.camera);
        }

        // Render boss
        if (this.boss) {
            this.boss.render(ctx, this.camera);
        }

        // Render blade ability effects (waves, explosions, lightning)
        this.renderBladeEffects(ctx);

        // Render drops
        this.dropSystem.render(ctx, this.camera);

        // Render ghosts
        this.ghostSystem.render(ctx, this.camera);

        // Render player
        if (this.player) {
            this.player.render(ctx, this.camera);
        }

        // Render victory waiting effects (simulation collapse building)
        if (this.victoryWaiting) {
            this.renderVictoryWaitingEffects(ctx);
        }

        // Render HUD
        this.hud.render(ctx, {
            player: this.player,
            cycles: this.cycles,
            bladeEvolution: this.bladeEvolution,
            currentZone: this.currentZone,
            currentRoom: `ROOM ${Utils.padNumber(this.roomNumber, 2)}`,
            currentLevel: this.currentLevel,
            enemiesKilled: this.enemiesKilledInLevel,
            totalEnemies: this.maxEnemiesInLevel,
            bossSpawned: this.bossSpawned,
            boss: this.boss,
            levelComplete: this.levelComplete,
            showControls: this.showControls,
            ghostCount: this.ghostSystem.getGhostCount(),
            totalDeaths: this.ghostSystem.getTotalDeaths()
        });

        // Render active buff indicators
        this.dropSystem.renderBuffBar(ctx, 20, this.canvas.height - 70);

        // Render weapon slots
        this.weaponSystem.renderSlots(ctx, this.canvas.width - 220, 20);

        // Render active imbue indicator
        if (this.activeImbue) {
            this.renderImbueIndicator(ctx, this.canvas.width - 220, 80);
        }

        // Render pause overlay (but not during final boss intro or victory sequence)
        if (this.isPaused && !this.finalBossIntroActive && !this.victoryActive && !this.victoryWaiting) {
            this.renderPauseOverlay(ctx);
        }

        // Render final boss intro overlay
        if (this.finalBossIntroActive) {
            this.renderFinalBossIntro(ctx);
        }

        // Render victory sequence (full screen takeover)
        if (this.victoryActive) {
            this.renderVictorySequence(ctx);
        }

        // Render cutscene (full screen takeover)
        if (this.cutsceneSystem && this.cutsceneSystem.isPlaying()) {
            this.cutsceneSystem.render();
        }

        // Debug info
        if (GAME_CONFIG.DEBUG) {
            this.renderDebugInfo(ctx);
        }

        // End frame (apply effects)
        this.renderer.endFrame();
    }

    /**
     * Render active magic imbue indicator
     */
    renderImbueIndicator(ctx, x, y) {
        ctx.save();

        const imbue = this.activeImbue;
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.strokeStyle = imbue.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, 200, 35, 5);
        ctx.fill();
        ctx.stroke();

        // Glow
        ctx.shadowColor = imbue.color;
        ctx.shadowBlur = 10 * pulse;

        // Icon based on type
        let icon = '◆';
        switch (imbue.type) {
            case 'cold': icon = '❄'; break;
            case 'fire': icon = '🔥'; break;
            case 'electric': icon = '⚡'; break;
            case 'teleport': icon = '✧'; break;
        }

        // Icon
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = imbue.color;
        ctx.textAlign = 'left';
        ctx.fillText(icon, x + 10, y + 24);

        // Text
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = imbue.color;
        ctx.fillText(`${imbue.name} IMBUE`, x + 35, y + 18);

        // Find remaining duration from active buffs
        const buff = this.dropSystem.activeBuffs.find(b => b.type.isImbue && b.type.imbueType === imbue.type);
        if (buff) {
            const seconds = Math.ceil(buff.remaining / 60);
            ctx.font = '10px monospace';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(`${seconds}s remaining`, x + 35, y + 30);
        }

        ctx.restore();
    }

    /**
     * Render pause overlay - simple version
     */
    renderPauseOverlay(ctx) {
        ctx.save();

        // Darken screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Pause text
        ctx.textAlign = 'center';
        ctx.font = 'bold 64px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 30;
        ctx.fillText('PAUSED', centerX, centerY - 20);

        // Controls reminder
        ctx.shadowBlur = 0;
        ctx.font = '16px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('Press ESC or P to resume', centerX, centerY + 30);
        ctx.fillText('Press H for help', centerX, centerY + 55);

        // Main menu option
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.fillText('Press M for Main Menu', centerX, centerY + 85);

        ctx.restore();
    }

    /**
     * Render debug information
     */
    renderDebugInfo(ctx) {
        ctx.save();
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        const debugInfo = [
            `FPS: ${this.fps}`,
            `Player: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`,
            `Velocity: (${this.player.velocityX.toFixed(2)}, ${this.player.velocityY.toFixed(2)})`,
            `Grounded: ${this.player.isGrounded}`,
            `State: ${this.player.state}`,
            `Attacking: ${this.player.isAttacking}`,
            `Cycles: ${this.cycles.getCycles()}`,
            `Enemies: ${this.enemies.length}`
        ];

        debugInfo.forEach((text, i) => {
            ctx.fillText(text, 10, this.canvas.height - 120 + i * 14);
        });

        ctx.restore();
    }

    /**
     * Handle player death
     */
    handlePlayerDeath(cause = 'enemy') {
        // Prevent multiple death triggers - check both active and state
        if (this.state === 'gameover') return;

        this.player.active = false;
        this.state = 'gameover';

        // Hide touch controls during game over
        if (this.input.touchControls) {
            this.input.touchControls.hide();
        }

        // Play death sound and stop music
        this.audio.playPlayerDeath();
        this.audio.stopMusic();

        // Record death for ghost system
        this.ghostSystem.recordDeath({
            level: this.currentLevel,
            x: this.player.x,
            y: this.player.y,
            cause: cause,
            character: this.characterSystem.selectedCharacter,
            weapon: this.weaponSystem.getActiveWeapon().type,
            weaponTier: this.weaponSystem.getActiveWeapon().tier,
            kills: this.totalKills
        });

        // Record death in run stats
        if (this.runStats) {
            this.runStats.recordDeath(cause, this.currentLevel);
        }

        console.log('DEATH TRIGGERED - ghost recorded');

        this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.8);
        this.renderer.glitch(2, 30);
        this.hud.addMessage('ITERATION FAILED', 'warning');

        // Show game over modal after a brief delay
        setTimeout(() => this.showGameOverModal(), 1000);
    }

    /**
     * Show game over modal
     */
    showGameOverModal() {
        const modal = document.getElementById('gameover-modal');
        const restartButton = document.getElementById('restart-button');
        const mainMenuButton = document.getElementById('mainmenu-button');
        const levelEl = document.getElementById('gameover-level');
        const killsEl = document.getElementById('gameover-kills');
        const bladeEl = document.getElementById('gameover-blade');

        // Award data cores for this run
        const bossKills = Math.floor(this.currentLevel / 3); // Rough estimate
        const coresEarned = this.metaProgression.awardDataCores(
            this.currentLevel,
            this.totalKills,
            bossKills
        );

        // End run stats (completed = false for game over)
        let leaderboardResults = { submissions: [], newRecords: [] };
        try {
            const finalCycles = this.cycles?.getCycles() || 0;
            if (this.runStats) {
                this.runStats.setFinalCycles(finalCycles);
                const runSummary = this.runStats.endRun(false, this.currentLevel);
                // Submit to all applicable leaderboards (furthest_level, ghost_master, etc.)
                leaderboardResults = this.leaderboard.submitRun(runSummary);
            }
        } catch (e) {
            console.warn('Stats/leaderboard error:', e);
        }

        // Update stats display
        levelEl.textContent = this.currentLevel;
        killsEl.textContent = this.totalKills;
        bladeEl.textContent = this.bladeEvolution.getBladeName();

        // Show data cores earned
        this.hud.addMessage(`+${coresEarned} DATA CORES earned!`, 'evolution');

        // Show leaderboard achievements
        if (leaderboardResults.newRecords.length > 0) {
            this.hud.addMessage(`NEW RECORD: ${leaderboardResults.newRecords[0]}!`, 'evolution');
        } else if (leaderboardResults.submissions.length > 0) {
            const bestSubmission = leaderboardResults.submissions[0];
            if (bestSubmission.rank <= 10) {
                this.hud.addMessage(`RANKED #${bestSubmission.rank} on ${bestSubmission.boardName}`, 'success');
            }
        }

        modal.classList.remove('hidden');

        // Cleanup function
        const cleanup = () => {
            restartButton.removeEventListener('click', handleRestart);
            mainMenuButton.removeEventListener('click', handleMainMenu);
            window.removeEventListener('keydown', handleKey);
        };

        // Handle restart button click
        const handleRestart = () => {
            modal.classList.add('hidden');
            cleanup();
            this.resetRun();
        };

        // Handle main menu button click
        const handleMainMenu = () => {
            modal.classList.add('hidden');
            cleanup();
            this.returnToMainMenu();
        };

        // Handle key press
        const handleKey = (e) => {
            if (this.state === 'gameover') {
                if (e.code === 'Space' || e.code === 'Enter') {
                    e.preventDefault();
                    handleRestart();
                } else if (e.code === 'Escape') {
                    e.preventDefault();
                    handleMainMenu();
                }
            }
        };

        restartButton.addEventListener('click', handleRestart);
        mainMenuButton.addEventListener('click', handleMainMenu);
        window.addEventListener('keydown', handleKey);
    }

    /**
     * Return to main menu from game over or pause
     */
    returnToMainMenu() {
        // Hide touch controls when returning to menu
        if (this.input.touchControls) {
            this.input.touchControls.hide();
        }

        // Reset game state
        this.state = 'title';
        this.isPaused = false;
        this.victoryActive = false;
        this.victoryWaiting = false;
        this.victoryWaitStartTime = null;

        // Reset all game systems
        this.currentLevel = 1;
        this.roomNumber = 1;
        this.currentZoneIndex = 0;
        this.currentZone = this.zones[0];
        this.killCount = 0;
        this.totalKills = 0;

        // Reset player
        this.player.active = true;
        this.player.health = this.player.maxHealth;
        this.player.velocityX = 0;
        this.player.velocityY = 0;

        // Reset all systems
        this.cycles.reset();
        this.bladeEvolution.reset();
        this.upgradeSystem.reset();
        this.dropSystem.reset();
        this.weaponSystem.reset();
        this.laserProjectiles = [];
        this.laserHits = [];
        this.ghostSystem.reset();
        this.activeImbue = null;
        this.tempBuffs = {
            damageBoost: 1.0,
            speedBoost: 1.0,
            xpMultiplier: 1.0,
            shield: false,
            shieldHits: 0,
            invincible: false,
            invincibleTimer: 0
        };

        // Clear enemies and drops
        this.enemies = [];
        this.boss = null;
        this.bossSpawned = false;
        this.drops = [];
        this.particles = [];

        // Generate fresh room for level 1
        this.currentRoom = generateRandomRoom(1, 0);
        this.camera.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);

        // Reset player position for new room
        this.player.x = this.currentRoom.spawnPoint.x;
        this.player.y = this.currentRoom.spawnPoint.y;

        // Spawn fresh enemies and interactables
        this.spawnEnemies();
        this.spawnInteractables();

        // Show title screen
        this.showTitleScreen();
    }

    /**
     * Handle cycle depletion
     */
    handleCycleDepletion() {
        if (this.player.active) {
            this.renderer.flash(GAME_CONFIG.COLORS.CYCLES_CRITICAL, 0.6);
            this.renderer.glitch(1.5, 20);
            this.hud.addMessage('CYCLES DEPLETED', 'warning');

            this.handlePlayerDeath('cycles');
        }
    }

    /**
     * Reset the current run
     */
    resetRun() {
        // Reset game state
        this.state = 'playing';

        // Reset level progression
        this.currentLevel = 1;
        this.roomNumber = 1;
        this.currentZoneIndex = 0;
        this.currentZone = this.zones[0];
        this.killCount = 0;
        this.totalKills = 0;

        // Reset player
        this.player.active = true;
        this.player.health = this.player.maxHealth;
        this.player.x = this.currentRoom.spawnPoint.x;
        this.player.y = this.currentRoom.spawnPoint.y;
        this.player.velocityX = 0;
        this.player.velocityY = 0;

        // Reset cycles
        this.cycles.reset();

        // Reset blade evolution
        this.bladeEvolution.reset();
        this.updatePlayerBlade();

        // Reset upgrade system
        this.upgradeSystem.reset();

        // Reset drop system
        this.dropSystem.reset();

        // Reset weapon system
        this.weaponSystem.reset();
        this.laserProjectiles = [];
        this.laserHits = [];

        // Reset ghost system (keeps death records for future runs)
        this.ghostSystem.reset();

        // Reset temp buffs
        this.activeImbue = null;
        this.tempBuffs = {
            damageBoost: 1.0,
            speedBoost: 1.0,
            xpMultiplier: 1.0,
            shield: false,
            shieldHits: 0,
            invincible: false,
            magnetRange: 60
        };

        // Reset permanent buffs
        this.permanentBuffs = {
            damage: 1.0
        };

        // Re-apply character stats
        this.characterSystem.applyToPlayer(this.player);

        // Re-apply cosmetics
        this.cosmeticsSystem.applySuitToPlayer(this.player);

        // Re-apply meta progression bonuses
        this.metaProgression.applyToPlayer(this.player, this);

        // Generate fresh random room (level 1, zone 0)
        this.currentRoom = generateRandomRoom(1, 0);
        this.camera.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);

        // Update player spawn position for new room
        this.player.x = this.currentRoom.spawnPoint.x;
        this.player.y = this.currentRoom.spawnPoint.y;

        // Respawn enemies and interactables
        this.spawnEnemies();
        this.spawnInteractables();

        // Reset camera
        this.camera.setTarget(this.player);

        // Show restart message
        this.hud.addMessage('NEW ITERATION STARTED', 'system');
        this.showControls = true;
    }
}
