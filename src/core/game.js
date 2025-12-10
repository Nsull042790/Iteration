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
        this.state = 'loading'; // loading, menu, playing, paused, gameover
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
        this.cycles = new CyclesSystem();

        // Run data
        this.currentZone = 'TRAINING GRID';
        this.roomNumber = 1;
        this.showControls = true;

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

        // Set initial state to waiting for controls modal
        this.state = 'waiting';

        // Hide loading screen and show controls modal
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }

            // Check if user wants to skip controls modal
            this.setupControlsModal();
        }, 1500);
    }

    /**
     * Setup controls modal with localStorage support
     */
    setupControlsModal() {
        const modal = document.getElementById('controls-modal');
        const startButton = document.getElementById('start-button');
        const dontShowCheckbox = document.getElementById('dont-show-again');

        // Check localStorage for preference
        const skipControls = localStorage.getItem('iteration_skip_controls') === 'true';

        if (skipControls) {
            // Skip modal, start game immediately
            modal.classList.add('hidden');
            this.startGame();
            return;
        }

        // Show modal
        modal.classList.remove('hidden');

        // Handle start button click
        startButton.addEventListener('click', () => {
            // Save preference if checkbox is checked
            if (dontShowCheckbox.checked) {
                localStorage.setItem('iteration_skip_controls', 'true');
            }

            // Hide modal and start game
            modal.classList.add('hidden');
            this.startGame();
        });

        // Also allow pressing Space or Enter to start
        const handleKeyStart = (e) => {
            if (this.state === 'waiting' && (e.code === 'Space' || e.code === 'Enter')) {
                e.preventDefault();
                startButton.click();
                window.removeEventListener('keydown', handleKeyStart);
            }
        };
        window.addEventListener('keydown', handleKeyStart);
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

        // Don't update game logic if paused
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
        }

        // Update room
        if (this.currentRoom) {
            this.currentRoom.update(deltaTime);
        }

        // Update cycles
        this.cycles.update();

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

        // Render player
        if (this.player) {
            this.player.render(ctx, this.camera);
        }

        // Render HUD
        this.hud.render(ctx, {
            player: this.player,
            cycles: this.cycles,
            currentZone: this.currentZone,
            currentRoom: `ROOM ${Utils.padNumber(this.roomNumber, 2)}`,
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
            `Cycles: ${this.cycles.getCycles()}`
        ];

        debugInfo.forEach((text, i) => {
            ctx.fillText(text, 10, this.canvas.height - 100 + i * 14);
        });

        ctx.restore();
    }

    /**
     * Handle player death
     */
    handlePlayerDeath() {
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
        // Reset player
        this.player.active = true;
        this.player.health = this.player.maxHealth;
        this.player.x = this.currentRoom.spawnPoint.x;
        this.player.y = this.currentRoom.spawnPoint.y;
        this.player.velocityX = 0;
        this.player.velocityY = 0;

        // Reset cycles
        this.cycles.reset();

        // Reset camera
        this.camera.setTarget(this.player);

        // Show restart message
        this.hud.addMessage('NEW ITERATION STARTED', 'system');
        this.showControls = true;
    }
}
