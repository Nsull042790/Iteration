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
        this.physics = new Physics();
        this.camera = new Camera(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        this.hud = new HUD(canvas);

        // Game state
        this.state = 'loading'; // loading, title, controls, playing, paused, gameover
        this.isPaused = false;
        this.showingFAQ = false;

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
        this.ghostSystem = new GhostSystem();
        this.audio = window.audioSystem;

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

        // Zone progression
        this.zones = ['TRAINING GRID', 'COMBAT SIMULATION', 'ADAPTATION CHAMBER', 'THE CORE'];
        this.currentZoneIndex = 0;

        // Run data
        this.currentZone = 'TRAINING GRID';
        this.roomNumber = 1;
        this.showControls = true;
        this.killCount = 0;
        this.totalKills = 0;

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
                if (this.state === 'playing') {
                    this.togglePause();
                }
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

        // Hide loading screen and show title screen
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }

            // Show title screen
            this.showTitleScreen();
        }, 1500);
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

        // Spawn a few chests
        const chestCount = Utils.randomInt(1, 3);
        for (let i = 0; i < chestCount; i++) {
            const x = Utils.random(200, roomWidth - 200);
            const y = 520; // Ground level
            const chest = new Interactable(x, y, 'chest');
            this.interactables.push(chest);
        }

        // Spawn a terminal with lore
        if (Math.random() > 0.5) {
            const terminal = new Interactable(Utils.random(400, roomWidth - 400), 508, 'terminal');
            this.interactables.push(terminal);
        }

        // Spawn a health station occasionally
        if (Math.random() > 0.7) {
            const healthStation = new Interactable(Utils.random(300, roomWidth - 300), 500, 'health_station');
            this.interactables.push(healthStation);
        }

        // Spawn a cycle node
        if (Math.random() > 0.6) {
            const cycleNode = new Interactable(Utils.random(500, roomWidth - 500), 520, 'cycle_node');
            this.interactables.push(cycleNode);
        }

        // Spawn health potions (2-4 per level)
        const potionCount = Utils.randomInt(2, 4);
        for (let i = 0; i < potionCount; i++) {
            const x = Utils.random(150, roomWidth - 150);
            const y = 530; // Ground level
            const potion = new Interactable(x, y, 'health_potion', { healAmount: 25 });
            this.interactables.push(potion);
        }
    }

    /**
     * Spawn boss for current level
     */
    spawnBoss() {
        if (this.bossSpawned) return;

        this.bossSpawned = true;

        // Generate boss name based on level
        const bossNames = [
            'GUARDIAN ALPHA',
            'SENTINEL PRIME',
            'ENFORCER OMEGA',
            'CORE DEFENDER',
            'SYSTEM OVERLORD'
        ];
        const bossName = bossNames[Math.min(this.currentLevel - 1, bossNames.length - 1)];

        // Show boss warning and play warning sound
        this.hud.showBossWarning(bossName);
        this.audio.playBossWarning();

        // Switch to boss music
        this.audio.startBossMusic();

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
            this.hud.addMessage(`THREAT DETECTED: ${this.boss.name}`, 'warning');
        }, 2000);
    }

    /**
     * Handle level completion
     */
    completeLevel() {
        if (this.levelComplete) return;

        this.levelComplete = true;
        this.currentLevel++;
        this.roomNumber++;

        // Zone progression every 3 levels
        if (this.currentLevel % 3 === 1 && this.currentLevel > 1) {
            this.currentZoneIndex = Math.min(this.currentZoneIndex + 1, this.zones.length - 1);
            this.currentZone = this.zones[this.currentZoneIndex];
        }

        // Bonus cycles for completing level
        const levelBonus = 100 + this.currentLevel * 25;
        this.cycles.gain(levelBonus);
        this.hud.addMessage(`LEVEL COMPLETE! +${levelBonus} CYCLES`, 'success');

        // Second Wind upgrade - heal after boss
        if (this.upgradeSystem.hasUpgrade('second_wind')) {
            const healAmount = Math.floor(this.player.maxHealth * 0.30);
            this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
            this.hud.addMessage(`SECOND WIND: +${healAmount} HP`, 'success');
        }

        // Show combined level complete + upgrade screen after a brief delay
        setTimeout(() => {
            this.showLevelCompleteWithUpgrades();
        }, 1000);
    }

    /**
     * Show combined level complete summary with weapon upgrade selection
     */
    showLevelCompleteWithUpgrades() {
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
        if (subtitle) subtitle.textContent = `// LEVEL ${this.currentLevel} CLEARED`;

        // Get current blade info
        const bladeTier = this.bladeEvolution.getCurrentTier();

        // Build stats section
        const statsHtml = `
            <div class="level-stats-header" style="text-align: center; margin-bottom: 20px;">
                <div style="display: flex; justify-content: center; gap: 40px; margin-bottom: 15px;">
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">LEVEL</div>
                        <div style="font-size: 24px; color: #00f0ff; font-weight: bold;">${this.currentLevel}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">KILLS</div>
                        <div style="font-size: 24px; color: #ff00aa; font-weight: bold;">${this.totalKills}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">CYCLES</div>
                        <div style="font-size: 24px; color: #ffff00; font-weight: bold;">${this.cycles.getCycles()}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">BLADE</div>
                        <div style="font-size: 14px; color: ${bladeTier.color}; font-weight: bold;">${bladeTier.name}</div>
                    </div>
                </div>
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
                        <span class="btn-text">CONTINUE TO LEVEL ${this.currentLevel + 1}</span>
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

        // Hide upgrade modal
        const modal = document.getElementById('upgrade-modal');
        modal.classList.add('hidden');

        if (result.success) {
            // Show message
            this.hud.addMessage(`WEAPON EVOLVED: ${result.newTier.name}`, 'evolution');

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

        // Go directly to next level (stats already shown in combined screen)
        setTimeout(() => {
            this.nextLevel();
        }, 500);
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
     * Show screen when all weapons are maxed (requires user input to continue)
     */
    showAllWeaponsMaxedScreen() {
        this.showingUpgrades = true;
        this.isPaused = true;

        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');

        if (title) title.textContent = 'MAXIMUM POWER';
        if (subtitle) subtitle.textContent = '// ALL WEAPONS FULLY EVOLVED';

        // Show level complete summary with all maxed weapons
        choicesContainer.innerHTML = `
            <div class="celebration-content" style="text-align: center; padding: 30px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚔️ ⚔️ ⚔️</div>
                <div style="font-size: 28px; color: #ffff00; text-shadow: 0 0 20px #ffff00; margin-bottom: 15px; letter-spacing: 3px;">
                    ALL WEAPONS MAXED
                </div>
                <div style="font-size: 16px; color: #00f0ff; margin-bottom: 25px; line-height: 1.8;">
                    Your arsenal is complete.<br>
                    All laser swords unlocked.
                </div>
                <div style="display: flex; justify-content: center; gap: 30px; margin-bottom: 30px;">
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">LEVEL</div>
                        <div style="font-size: 24px; color: #00f0ff;">${this.currentLevel}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">KILLS</div>
                        <div style="font-size: 24px; color: #ff00aa;">${this.totalKills}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 12px; color: rgba(255,255,255,0.5);">CYCLES</div>
                        <div style="font-size: 24px; color: #ffff00;">${this.cycles.getCycles()}</div>
                    </div>
                </div>
                <div style="font-size: 14px; color: #ff00aa; text-shadow: 0 0 10px #ff00aa; animation: pulse 1s infinite;">
                    Press SPACE or click to continue
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        this.hud.addMessage('ALL WEAPONS MAXED - READY FOR NEXT LEVEL', 'system');

        // Handle dismissal
        const handleDismiss = () => {
            modal.classList.add('hidden');
            modal.removeEventListener('click', handleDismiss);
            window.removeEventListener('keydown', handleDismissKey);
            this.showingUpgrades = false;

            // Reset modal title for next time
            if (title) title.textContent = 'EVOLUTION DETECTED';
            if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';

            // Go directly to next level
            setTimeout(() => {
                this.nextLevel();
            }, 300);
        };

        const handleDismissKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
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
     * Show level complete summary before advancing (legacy - kept for compatibility)
     */
    showLevelCompleteSummary() {
        this.isPaused = true;

        const modal = document.getElementById('upgrade-modal');
        const choicesContainer = document.getElementById('upgrade-choices');
        const title = modal.querySelector('.upgrade-title');
        const subtitle = modal.querySelector('.modal-subtitle');

        if (title) title.textContent = 'LEVEL COMPLETE';
        if (subtitle) subtitle.textContent = `// LEVEL ${this.currentLevel} CLEARED`;

        // Get active buffs info
        const activeBuffs = this.dropSystem.activeBuffs || [];
        const buffInfo = activeBuffs.map(b => `${b.type.icon} ${b.type.name}`).join(' • ') || 'None';

        // Get current blade info
        const bladeTier = this.bladeEvolution.getCurrentTier();

        // Get imbue info
        const imbueInfo = this.activeImbue
            ? `${this.activeImbue.type.toUpperCase()} (${Math.ceil(this.activeImbue.duration / 60)}s)`
            : 'None';

        // Show comprehensive summary
        choicesContainer.innerHTML = `
            <div class="level-summary" style="text-align: center; padding: 20px; max-width: 500px; margin: 0 auto;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎯</div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px;">
                    <div class="summary-stat">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">LEVEL</div>
                        <div style="font-size: 28px; color: #00f0ff; font-weight: bold;">${this.currentLevel}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">TOTAL KILLS</div>
                        <div style="font-size: 28px; color: #ff00aa; font-weight: bold;">${this.totalKills}</div>
                    </div>
                    <div class="summary-stat">
                        <div style="font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 2px;">CYCLES</div>
                        <div style="font-size: 28px; color: #ffff00; font-weight: bold;">${this.cycles.getCycles()}</div>
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(0,240,255,0.2); padding: 15px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: left;">
                        <div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px;">BLADE TIER</div>
                            <div style="font-size: 14px; color: ${bladeTier.color}; font-weight: bold;">${bladeTier.name}</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px;">MAGIC IMBUE</div>
                            <div style="font-size: 14px; color: #aa00ff;">${imbueInfo}</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px;">HEALTH</div>
                            <div style="font-size: 14px; color: #ff4444;">${this.player.health}/${this.player.maxHealth}</div>
                        </div>
                        <div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 1px;">ACTIVE BUFFS</div>
                            <div style="font-size: 12px; color: #00ff88; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${buffInfo}</div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-bottom: 8px;">NEXT ZONE</div>
                    <div style="font-size: 16px; color: ${this.currentZone.color}; font-weight: bold; text-shadow: 0 0 10px ${this.currentZone.color};">
                        ${this.currentZone.name}
                    </div>
                </div>

                <button id="continue-level-btn" class="start-btn" style="margin-top: 15px; padding: 15px 40px;">
                    <span class="btn-text">CONTINUE TO LEVEL ${this.currentLevel + 1}</span>
                    <span class="btn-icon">→</span>
                </button>

                <div style="margin-top: 15px; font-size: 11px; color: rgba(255,255,255,0.3);">
                    Press SPACE or ENTER to continue
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Play UI click
        this.audio.playUIClick();

        // Handle continue
        const handleContinue = () => {
            modal.classList.add('hidden');
            continueBtn.removeEventListener('click', handleContinue);
            window.removeEventListener('keydown', handleContinueKey);

            // Reset modal title for next time
            if (title) title.textContent = 'EVOLUTION DETECTED';
            if (subtitle) subtitle.textContent = '// SELECT UPGRADE PROTOCOL';

            this.audio.playUIClick();
            this.nextLevel();
        };

        const handleContinueKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                handleContinue();
            }
        };

        const continueBtn = document.getElementById('continue-level-btn');
        continueBtn.addEventListener('click', handleContinue);
        window.addEventListener('keydown', handleContinueKey);
    }

    /**
     * Progress to next level
     */
    nextLevel() {
        // Reset level complete flag and unpause
        this.levelComplete = false;
        this.isPaused = false;

        this.renderer.flash('#ffffff', 0.5);

        setTimeout(() => {
            // Generate new random room for this level
            this.currentRoom = generateRandomRoom(this.currentLevel);

            // Update camera bounds for new room
            this.camera.setBounds(0, 0, this.currentRoom.width, this.currentRoom.height);

            // Spawn enemies and interactables for new room
            this.spawnEnemies();
            this.spawnInteractables();

            // Reset player position
            this.player.x = this.currentRoom.spawnPoint.x;
            this.player.y = this.currentRoom.spawnPoint.y;
            this.player.velocityX = 0;
            this.player.velocityY = 0;

            // Zone change message
            if (this.currentLevel % 3 === 1 && this.currentLevel > 1) {
                this.hud.addMessage(`ENTERING: ${this.currentZone}`, 'system');
            }

            this.hud.addMessage(`LEVEL ${this.currentLevel} - ${this.currentZone}`, 'system');
        }, 500);
    }

    /**
     * Show title screen
     */
    showTitleScreen() {
        this.state = 'title';

        const titleScreen = document.getElementById('title-screen');
        const titleBtn = document.getElementById('title-start-btn');
        const codexBtn = document.getElementById('codex-btn');
        const leaderboardBtn = document.getElementById('leaderboard-btn');
        const godmodeBtn = document.getElementById('godmode-btn');

        titleScreen.classList.remove('hidden');

        // Update god mode button appearance
        this.updateGodModeButton(godmodeBtn);

        // Handle button click
        const handleTitleClick = () => {
            // Initialize audio on first user interaction
            this.audio.init();
            this.audio.startTitleMusic();
            this.audio.playUIClick();

            titleScreen.classList.add('hidden');
            titleBtn.removeEventListener('click', handleTitleClick);
            this.showCharacterSelect();
        };

        titleBtn.addEventListener('click', handleTitleClick);

        // Codex button
        codexBtn.onclick = () => this.showCodex();

        // Leaderboard button
        leaderboardBtn.onclick = () => this.showLeaderboardModal();

        // God mode button
        godmodeBtn.onclick = () => this.toggleGodMode(godmodeBtn);

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
     * Show leaderboard modal
     */
    showLeaderboardModal() {
        const modal = document.getElementById('leaderboard-modal');
        const list = document.getElementById('leaderboard-list');
        const closeBtn = document.getElementById('leaderboard-close-btn');

        // Populate leaderboard
        const entries = this.leaderboard.getTopEntries(10);

        if (entries.length === 0) {
            list.innerHTML = '<div class="leaderboard-empty">No runs recorded yet. Start playing!</div>';
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
                            <div class="leaderboard-details">Level ${entry.level} • ${entry.kills} kills • ${entry.bladeTier}</div>
                        </div>
                        <div class="leaderboard-score">${entry.score.toLocaleString()}</div>
                    </div>
                `;
            }).join('');
        }

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
        this.state = 'character_select';
        this.showingCharacterSelect = true;

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

            card.addEventListener('click', () => {
                this.selectCharacter(char.id);
            });

            grid.appendChild(card);
        });

        modal.classList.remove('hidden');

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
            }
        };
        window.addEventListener('keydown', this.charSelectKeyHandler);
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

        if (skipControls) {
            this.startGame();
            return;
        }

        modal.classList.remove('hidden');

        // Handle start button click
        const handleStart = () => {
            if (dontShowCheckbox.checked) {
                localStorage.setItem('iteration_skip_controls', 'true');
            }
            modal.classList.add('hidden');
            startButton.removeEventListener('click', handleStart);
            this.startGame();
        };

        startButton.addEventListener('click', handleStart);

        // Handle key press
        const handleControlsKey = (e) => {
            if (this.state === 'controls' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                startButton.click();
                window.removeEventListener('keydown', handleControlsKey);
            }
        };
        window.addEventListener('keydown', handleControlsKey);
    }

    /**
     * Start the actual gameplay
     */
    startGame() {
        this.state = 'playing';
        const char = this.characterSystem.getSelected();
        this.hud.addMessage(`${char.name} ONLINE - SIMULATION INITIALIZED`, 'system');

        // Start gameplay music
        this.audio.startGameplayMusic();
    }

    /**
     * Handle window resize
     */
    handleResize() {
        this.renderer.resize();
        this.hud.resize(this.canvas.width, this.canvas.height);
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
        // Request next frame
        requestAnimationFrame((time) => this.loop(time));

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

        // Update at fixed timestep
        while (this.accumulator >= this.fixedTimeStep) {
            this.update(this.fixedTimeStep);
            this.accumulator -= this.fixedTimeStep;
        }

        // Render
        this.render();
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

        // Handle FAQ toggle with H key (works anytime during gameplay)
        if (this.state === 'playing' && this.input.isKeyJustPressed('KeyH') && !this.showingUpgrades) {
            this.toggleFAQ();
        }

        // Don't update game logic if paused or not playing
        if (this.isPaused || this.state !== 'playing') {
            return;
        }

        // Weapon switching with 1, 2, 3 keys
        if (this.input.isKeyJustPressed('Digit1') || this.input.isKeyJustPressed('Numpad1')) {
            if (this.weaponSystem.switchTo(0)) {
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
            }
        }
        if (this.input.isKeyJustPressed('Digit2') || this.input.isKeyJustPressed('Numpad2')) {
            if (this.weaponSystem.switchTo(1)) {
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
            }
        }
        if (this.input.isKeyJustPressed('Digit3') || this.input.isKeyJustPressed('Numpad3')) {
            if (this.weaponSystem.switchTo(2)) {
                this.hud.addMessage(`WEAPON: ${this.weaponSystem.getActiveTierData().name}`, 'system');
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

            // Full heal on boss kill
            this.player.health = this.player.maxHealth;
            this.hud.addMessage(`${this.boss.name} DESTROYED! +${this.boss.cycleReward} CYCLES +FULL HEAL`, 'success');

            // Gain blade XP from boss kill
            let xpMultiplier = this.upgradeSystem.modifiers.xpMultiplier;
            if (this.player.characterSpecial?.xpBonus) {
                xpMultiplier *= (1 + this.player.characterSpecial.xpBonus);
            }
            xpMultiplier *= this.tempBuffs.xpMultiplier;
            this.addBladeXP(Math.floor(50 * xpMultiplier));

            // Roll for boss drops (guaranteed)
            this.dropSystem.rollDrops(this.boss.x, this.boss.y, 'boss');

            this.completeLevel();
        }

        // Update interactables
        for (const interactable of this.interactables) {
            interactable.update(deltaTime);
            interactable.checkPlayerProximity(this.player);

            // Auto-collect items (health potions)
            if (interactable.autoCollect && interactable.checkCollision(this.player)) {
                const result = interactable.collect(this.player, this);
                if (result) {
                    this.hud.addMessage(result.message, 'success');
                }
            }
        }

        // Handle interaction
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

        // Calculate damage with potential crit
        let rawDamage = baseDamage * weaponMultiplier * bladeMultiplier * upgradeMultiplier * tempDamageBoost * permDamageBoost * speedBonus * metaDamageBoost;

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
                // Hit the enemy with blade damage
                const killed = enemy.takeDamage(damage);
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

                    // Gain cycles from kill (with upgrade multiplier + meta bonus)
                    const metaCycleBonus = 1 + (this.player.metaBonuses?.cycleBonus || 0);
                    const cycleGain = Math.floor(50 * this.upgradeSystem.modifiers.cycleGainMultiplier * metaCycleBonus);
                    this.cycles.gain(cycleGain);
                    this.killCount++;
                    this.totalKills++;

                    // Heal player on kill
                    const healAmount = 10;
                    this.player.health = Math.min(this.player.health + healAmount, this.player.maxHealth);
                    this.hud.addMessage(`+${cycleGain} CYCLES +${healAmount} HP`, 'success');

                    // Gain blade XP from kill (with upgrade multiplier + character + meta bonus)
                    let xpMultiplier = this.upgradeSystem.modifiers.xpMultiplier;
                    if (this.player.characterSpecial?.xpBonus) {
                        xpMultiplier *= (1 + this.player.characterSpecial.xpBonus);
                    }
                    xpMultiplier *= this.tempBuffs.xpMultiplier;
                    xpMultiplier *= (1 + (this.player.metaBonuses?.xpBonus || 0));
                    const xpGain = Math.floor(10 * xpMultiplier);
                    this.addBladeXP(xpGain);

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
            this.hud.addMessage(`BLADE EVOLVED: ${newTier.name}`, 'evolution');

            // Play level up sound
            this.audio.playLevelUp();

            // Show ability unlock message
            if (newTier.ability) {
                setTimeout(() => {
                    this.hud.addMessage(`NEW ABILITY: ${newTier.abilityDesc}`, 'success');
                }, 500);
            }

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

        // Render pause overlay
        if (this.isPaused) {
            this.renderPauseOverlay(ctx);
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
     * Render pause overlay
     */
    renderPauseOverlay(ctx) {
        ctx.save();

        // Darken screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // Pause text
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 20;
        ctx.fillText('PAUSED', centerX, 80);

        // Character info
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.shadowBlur = 10;
        const char = this.characterSystem.getSelected();
        ctx.fillText(`${char.name} - Level ${this.currentLevel}`, centerX, 120);

        // Stats box
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.fillRect(centerX - 300, 140, 600, 280);
        ctx.strokeRect(centerX - 300, 140, 600, 280);

        // Current stats
        ctx.textAlign = 'left';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.fillText('CURRENT STATS:', centerX - 280, 170);

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const modifiers = this.upgradeSystem.modifiers;
        const stats = [
            `Damage Multiplier: ${(modifiers.damageMultiplier * 100).toFixed(0)}%`,
            `Attack Speed: ${(modifiers.attackSpeedMultiplier * 100).toFixed(0)}%`,
            `Move Speed: ${(modifiers.moveSpeedMultiplier * 100).toFixed(0)}%`,
            `Max Health: ${this.player.maxHealth}`,
            `Crit Chance: ${(modifiers.critChance * 100).toFixed(0)}%`,
            `Cycle Gain: ${(modifiers.cycleGainMultiplier * 100).toFixed(0)}%`,
            `Lifesteal: ${(modifiers.lifesteal * 100).toFixed(0)}%`
        ];

        stats.forEach((stat, i) => {
            ctx.fillText(stat, centerX - 280, 195 + i * 18);
        });

        // Weapons info
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('WEAPONS:', centerX + 20, 170);

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const weapons = this.weaponSystem.weapons;
        weapons.forEach((weapon, i) => {
            const tier = weapon.tiers[weapon.currentTier];
            const level = weapon.currentTier + 1;
            const maxLevel = weapon.tiers.length;
            ctx.fillText(`${weapon.name}: Lv${level}/${maxLevel} - ${tier.name}`, centerX + 20, 195 + i * 18);
        });

        // Active buffs
        ctx.fillStyle = '#ffff00';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText('ACTIVE BUFFS:', centerX + 20, 270);

        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        let buffY = 295;
        if (this.tempBuffs.damageBoost > 1) {
            ctx.fillText(`+${((this.tempBuffs.damageBoost - 1) * 100).toFixed(0)}% Damage`, centerX + 20, buffY);
            buffY += 18;
        }
        if (this.tempBuffs.speedBoost > 1) {
            ctx.fillText(`+${((this.tempBuffs.speedBoost - 1) * 100).toFixed(0)}% Speed`, centerX + 20, buffY);
            buffY += 18;
        }
        if (this.tempBuffs.shield) {
            ctx.fillText(`Shield (${this.tempBuffs.shieldHits} hits)`, centerX + 20, buffY);
            buffY += 18;
        }
        if (buffY === 295) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fillText('None active', centerX + 20, buffY);
        }

        // Blade evolution info
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('BLADE EVOLUTION:', centerX - 280, 340);

        const bladeTier = this.bladeEvolution.getCurrentTier();
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = bladeTier.color;
        ctx.fillText(`${bladeTier.name} (${(this.bladeEvolution.getDamageMultiplier() * 100).toFixed(0)}% DMG)`, centerX - 280, 365);

        // Controls reminder
        ctx.textAlign = 'center';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('Press ESC or P to resume | Press H for help', centerX, this.canvas.height - 40);

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

        // Add to leaderboard
        const leaderboardResult = this.leaderboard.addEntry({
            level: this.currentLevel,
            kills: this.totalKills,
            character: this.characterSystem.selectedCharacter.toUpperCase(),
            bladeTier: this.bladeEvolution.getBladeName(),
            dataCoresEarned: coresEarned
        });

        // Update stats
        levelEl.textContent = this.currentLevel;
        killsEl.textContent = this.totalKills;
        bladeEl.textContent = this.bladeEvolution.getBladeName();

        // Show data cores earned
        this.hud.addMessage(`+${coresEarned} DATA CORES earned!`, 'evolution');

        // Show leaderboard ranking
        if (leaderboardResult.rank === 1) {
            this.hud.addMessage(`NEW HIGH SCORE! #${leaderboardResult.rank}`, 'evolution');
        } else if (leaderboardResult.rank <= 10) {
            this.hud.addMessage(`LEADERBOARD RANK: #${leaderboardResult.rank}`, 'success');
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
     * Return to main menu from game over
     */
    returnToMainMenu() {
        // Reset game state
        this.state = 'title';

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
        this.drops = [];
        this.particles = [];

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

        // Generate fresh random room
        this.currentRoom = generateRandomRoom(1);
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
