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
        this.physics = new Physics();
        this.camera = new Camera(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
        this.hud = new HUD(canvas);

        // Game state
        this.state = 'loading'; // loading, title, controls, playing, paused, gameover
        this.isPaused = false;

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

        // Calculate enemy count based on level
        this.maxEnemiesInLevel = 3 + Math.floor(this.currentLevel * 1.5);

        // Generate enemy positions spread across the room
        const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
        const startX = 300;
        const spacing = (roomWidth - 400) / this.maxEnemiesInLevel;

        for (let i = 0; i < this.maxEnemiesInLevel; i++) {
            const x = startX + i * spacing + Utils.random(-50, 50);
            const y = Utils.random(350, 500);

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

        // Show boss warning
        this.hud.showBossWarning(bossName);

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
            this.hud.addMessage(`ENTERING: ${this.currentZone}`, 'system');
        }

        // Bonus cycles for completing level
        const levelBonus = 100 + this.currentLevel * 25;
        this.cycles.gain(levelBonus);
        this.hud.addMessage(`LEVEL COMPLETE! +${levelBonus} CYCLES`, 'success');

        // Spawn exit portal
        const roomWidth = this.currentRoom ? this.currentRoom.width : 1600;
        const exitPortal = new Interactable(roomWidth - 100, 476, 'exit_portal');
        this.interactables.push(exitPortal);
    }

    /**
     * Progress to next level
     */
    nextLevel() {
        this.renderer.flash('#ffffff', 0.5);

        setTimeout(() => {
            // Reset room
            this.spawnEnemies();
            this.spawnInteractables();

            // Reset player position
            this.player.x = this.currentRoom.spawnPoint.x;
            this.player.y = this.currentRoom.spawnPoint.y;
            this.player.velocityX = 0;
            this.player.velocityY = 0;

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

        titleScreen.classList.remove('hidden');

        // Handle button click
        const handleTitleClick = () => {
            titleScreen.classList.add('hidden');
            titleBtn.removeEventListener('click', handleTitleClick);
            this.showControlsModal();
        };

        titleBtn.addEventListener('click', handleTitleClick);

        // Handle key press
        const handleTitleKey = (e) => {
            if (this.state === 'title' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                titleBtn.click();
                window.removeEventListener('keydown', handleTitleKey);
            }
        };
        window.addEventListener('keydown', handleTitleKey);
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
        this.hud.addMessage('SIMULATION INITIALIZED', 'system');
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

        // Don't update game logic if paused or not playing
        if (this.isPaused || this.state !== 'playing') {
            return;
        }

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

            // Calculate movement cost
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

            // Keep player in bounds
            this.player.x = Utils.clamp(this.player.x, 0, this.currentRoom.width - this.player.width);

            // Check for death by falling
            if (this.player.y > this.currentRoom.height + 100) {
                this.handlePlayerDeath();
            }

            // Check for death by health depletion
            if (this.player.health <= 0) {
                this.handlePlayerDeath();
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
                    if (this.player.takeDamage(enemy.damage)) {
                        this.cycles.applyDamagePenalty();
                        this.camera.addShake(5, 10);
                        this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.3);
                        // Check for death immediately after taking damage
                        if (this.player.health <= 0) {
                            this.handlePlayerDeath();
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
                if (this.player.takeDamage(this.boss.damage)) {
                    this.cycles.applyDamagePenalty();
                    this.camera.addShake(8, 15);
                    this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.4);
                    // Check for death immediately after taking damage
                    if (this.player.health <= 0) {
                        this.handlePlayerDeath();
                    }
                }
            }

            // Check for boss projectiles hitting player
            for (const proj of this.boss.projectiles) {
                if (proj.active && this.player.active) {
                    const projBounds = { x: proj.x - 8, y: proj.y - 8, width: 16, height: 16 };
                    if (Utils.rectsOverlap(projBounds, this.player.getBounds())) {
                        proj.active = false;
                        if (this.player.takeDamage(this.boss.damage * 0.5)) {
                            this.cycles.applyDamagePenalty();
                            this.camera.addShake(4, 8);
                            // Check for death immediately after taking damage
                            if (this.player.health <= 0) {
                                this.handlePlayerDeath();
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
            this.hud.addMessage(`${this.boss.name} DESTROYED! +${this.boss.cycleReward} CYCLES`, 'success');
            this.totalKills++;

            // Gain blade XP from boss kill
            this.addBladeXP(50);

            this.completeLevel();
        }

        // Update interactables
        for (const interactable of this.interactables) {
            interactable.update(deltaTime);
            interactable.checkPlayerProximity(this.player);
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

        // Get damage with blade multiplier
        const baseDamage = 25;
        const damage = Math.floor(baseDamage * this.bladeEvolution.getDamageMultiplier());

        // Check regular enemies
        for (const enemy of this.enemies) {
            if (!enemy.active || enemy.invincibilityFrames > 0) continue;

            const enemyBounds = enemy.getBounds();

            if (Utils.rectsOverlap(attackBounds, enemyBounds)) {
                // Hit the enemy with blade damage
                const killed = enemy.takeDamage(damage);

                if (killed) {
                    // Gain cycles from kill
                    this.cycles.gain(50);
                    this.killCount++;
                    this.totalKills++;
                    this.hud.addMessage(`+50 CYCLES`, 'success');

                    // Gain blade XP from kill
                    this.addBladeXP(10);
                }

                // Visual feedback - use blade color
                this.camera.addShake(3, 5);
                this.renderer.flash(this.bladeEvolution.getBladeColor(), 0.2);
            }
        }

        // Check boss
        if (this.boss && this.boss.active && this.boss.invincibilityFrames <= 0) {
            const bossBounds = this.boss.getBounds();

            if (Utils.rectsOverlap(attackBounds, bossBounds)) {
                // Hit the boss with blade damage
                const bossDamage = Math.floor(20 * this.bladeEvolution.getDamageMultiplier());
                const killed = this.boss.takeDamage(bossDamage);

                // Visual feedback - use blade color
                this.camera.addShake(5, 8);
                this.renderer.flash(this.bladeEvolution.getBladeColor(), 0.3);
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
            showControls: this.showControls
        });

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
     * Render pause overlay
     */
    renderPauseOverlay(ctx) {
        ctx.save();

        // Darken screen
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Pause text
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 20;
        ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);

        ctx.font = '16px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 0;
        ctx.fillText('Press ESC or P to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);

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
    handlePlayerDeath() {
        // Prevent multiple death triggers
        if (!this.player.active) return;

        this.player.active = false;

        this.renderer.flash(GAME_CONFIG.COLORS.MAGENTA, 0.8);
        this.renderer.glitch(2, 30);
        this.hud.addMessage('ITERATION FAILED', 'warning');
        this.hud.addMessage('RESTARTING SIMULATION...', 'system');

        // Reset after delay
        setTimeout(() => this.resetRun(), 2000);
    }

    /**
     * Handle cycle depletion
     */
    handleCycleDepletion() {
        if (this.player.active) {
            this.renderer.flash(GAME_CONFIG.COLORS.CYCLES_CRITICAL, 0.6);
            this.renderer.glitch(1.5, 20);
            this.hud.addMessage('CYCLES DEPLETED', 'warning');
            this.hud.addMessage('SIMULATION TERMINATED', 'system');

            this.player.active = false;
            setTimeout(() => this.resetRun(), 2000);
        }
    }

    /**
     * Reset the current run
     */
    resetRun() {
        // Reset level progression
        this.currentLevel = 1;
        this.roomNumber = 1;
        this.currentZoneIndex = 0;
        this.currentZone = this.zones[0];
        this.killCount = 0;

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
