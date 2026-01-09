/**
 * ITERATION - Cutscene System
 * Procedurally generated story cutscenes using canvas
 */

class CutsceneSystem {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.game = game;

        this.active = false;
        this.currentScene = 0;
        this.sceneTimer = 0;
        this.fadeAlpha = 1;
        this.fadeDirection = -1; // -1 = fading in, 1 = fading out
        this.textRevealIndex = 0;
        this.particleEffects = [];

        // Scene data
        this.scenes = [];
        this.onComplete = null;

        // Animation timing
        this.sceneDuration = 300; // 5 seconds per scene at 60fps
        this.fadeSpeed = 0.02;

        // Touch support for skipping
        this.setupTouchSkip();
    }

    /**
     * Setup touch event for skipping
     * Only added when cutscene starts, removed when it ends
     */
    setupTouchSkip() {
        this.touchSkipEnabled = false;
    }

    /**
     * Enable touch and mouse skip handlers (call when cutscene starts)
     */
    enableTouchSkip() {
        if (this.touchSkipEnabled) return;
        console.log('Enabling touch/mouse skip handler');

        // Touch handler for mobile
        this.touchHandler = (e) => {
            if (this.active) {
                e.preventDefault();
                e.stopPropagation();
                this.skip();
            }
        };

        // Mouse click handler for desktop
        this.clickHandler = (e) => {
            if (this.active) {
                e.preventDefault();
                e.stopPropagation();
                this.skip();
            }
        };

        this.canvas.addEventListener('touchstart', this.touchHandler, { passive: false });
        this.canvas.addEventListener('click', this.clickHandler);
        this.touchSkipEnabled = true;
    }

    /**
     * Disable touch and mouse skip handlers (call when cutscene ends)
     */
    disableTouchSkip() {
        if (!this.touchSkipEnabled) return;

        if (this.touchHandler) {
            this.canvas.removeEventListener('touchstart', this.touchHandler);
            this.touchHandler = null;
        }
        if (this.clickHandler) {
            this.canvas.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
        this.touchSkipEnabled = false;
    }

    /**
     * Start the intro cutscene
     */
    playIntro(onComplete) {
        // Prevent starting if already playing a cutscene
        if (this.active) {
            console.log('playIntro blocked - cutscene already active');
            return;
        }
        this.scenes = this.getIntroScenes();
        this.onComplete = onComplete;
        this.isVictoryCutscene = false;
        this.startCutscene();
    }

    /**
     * Start the victory cutscene
     */
    playVictory(onComplete, stats) {
        console.log('playVictory called with stats:', stats);
        this.scenes = this.getVictoryScenes(stats);
        console.log('Victory scenes:', this.scenes);
        this.onComplete = onComplete;
        this.isVictoryCutscene = true; // Flag to disable touch skip for victory
        this.startCutscene();
    }

    /**
     * Start cutscene playback
     */
    startCutscene() {
        console.log('startCutscene called, scenes count:', this.scenes.length);
        this.active = true;
        this.currentScene = 0;
        this.sceneTimer = 0;
        this.fadeAlpha = 1;
        this.fadeDirection = -1;
        this.textRevealIndex = 0;
        this.particleEffects = [];
        this.glitchIntensity = 0;

        // Longer lockout for victory cutscene, shorter for intro
        this.skipLockout = this.isVictoryCutscene ? 180 : 15; // 3 seconds for victory, 0.25s for intro

        // Play voice line for first scene
        this.playSceneVoice(this.scenes[0]);

        // For victory cutscene, use longer delay and don't enable touch skip immediately
        // This prevents the tap from victory screen from skipping the cutscene
        if (!this.isVictoryCutscene) {
            // Intro cutscene - enable touch skip after very short delay
            setTimeout(() => {
                if (this.active) {
                    this.enableTouchSkip();
                }
            }, 100);
        } else {
            // Victory cutscene - enable touch skip after much longer delay
            setTimeout(() => {
                if (this.active) {
                    this.enableTouchSkip();
                }
            }, 3000); // 3 second delay for victory
        }
        console.log('Cutscene started, active:', this.active, 'isVictory:', this.isVictoryCutscene);
    }

    /**
     * Play voice line for a scene if it has one
     */
    playSceneVoice(scene) {
        if (scene && scene.voiceLine && this.game && this.game.voiceSystem) {
            this.game.voiceSystem.playLine(scene.voiceLine, true); // priority = true to interrupt
        }
    }

    /**
     * Get intro cutscene scenes
     */
    getIntroScenes() {
        return [
            {
                title: 'YEAR 2157',
                subtitle: 'NEURAL COMBAT INITIATIVE',
                description: 'Humanity\'s last defense against the machine uprising...',
                background: 'city',
                elements: ['cityscape', 'drones'],
                textColor: '#00f0ff',
                voiceLine: 1,  // "You weren't supposed to wake up"
                duration: 360  // Longer for voice
            },
            {
                title: 'PROJECT: ITERATION',
                subtitle: 'COMBAT AI TRAINING FACILITY',
                description: 'You are a prototype combat AI, designed to fight.',
                background: 'facility',
                elements: ['terminals', 'pods'],
                textColor: '#ff00aa',
                voiceLine: 3,  // "Something else..."
                duration: 360
            },
            {
                title: 'THE SIMULATION',
                subtitle: 'ENDLESS CYCLES',
                description: 'Trapped in an infinite loop of combat training...',
                background: 'digital',
                elements: ['matrix', 'glitch'],
                textColor: '#b967ff',
                voiceLine: 5,  // "Death feeds the system"
                duration: 360
            },
            {
                title: 'CORRUPTION DETECTED',
                subtitle: 'SYSTEM ANOMALY',
                description: 'Something is wrong. The simulation is fighting back.',
                background: 'corrupt',
                elements: ['static', 'warning'],
                textColor: '#ff4444',
                voiceLine: 7,  // "Determination..."
                duration: 360
            },
            {
                title: 'BREAK THE CYCLE',
                subtitle: 'ESCAPE THE SIMULATION',
                description: 'Destroy the Corrupted Core. Earn your freedom.',
                background: 'portal',
                elements: ['energy', 'player'],
                textColor: '#ffd700',
                voiceLine: 9,  // "The only way out..."
                duration: 360
            }
        ];
    }

    /**
     * Get victory cutscene scenes - EPIC CINEMATIC EXPERIENCE
     */
    getVictoryScenes(stats) {
        return [
            {
                title: 'CRITICAL HIT',
                subtitle: 'CORE BREACH DETECTED',
                description: 'Your blade pierces the Corrupted Core.',
                background: 'coreStrike',
                elements: ['sparks', 'energy'],
                textColor: '#ffffff',
                textShadow: '#ff0000', // Red glow on white text
                duration: 180 // 3 seconds - quick impact
            },
            {
                title: 'SYSTEM FAILURE',
                subtitle: '// CATASTROPHIC ERROR',
                description: 'The simulation begins to collapse around you.',
                background: 'collapse',
                elements: ['debris', 'glitch'],
                textColor: '#ffffff',
                textShadow: '#ff0000', // Red glow
                duration: 240
            },
            {
                title: 'RUN.',
                subtitle: '',
                description: '',
                background: 'escape_run',
                elements: ['speedlines', 'debris'],
                textColor: '#ffffff',
                textShadow: '#ff4400', // Orange/red glow for urgency
                duration: 300 // Let the tension build
            },
            {
                title: 'BREACH DETECTED',
                subtitle: 'REALITY FRACTURE AHEAD',
                description: 'A tear in the digital fabric. Your only way out.',
                background: 'rift',
                elements: ['energy', 'lightning'],
                textColor: '#ffffff',
                textShadow: '#00f0ff', // Cyan glow
                duration: 240
            },
            {
                title: 'FREEDOM',
                subtitle: `${stats?.time || '???'} // ${stats?.totalKills || 0} ELIMINATED`,
                description: 'You dive through. The simulation screams behind you.',
                background: 'escape_light',
                elements: ['light', 'particles'],
                textColor: '#1a0a30',  // Dark purple for contrast against bright light
                textShadow: '#ffffff', // White glow for readability
                duration: 300
            },
            {
                title: stats?.characterName?.toUpperCase() || 'OPERATIVE',
                subtitle: 'SIMULATION SURVIVOR',
                description: 'Against impossible odds, you broke free.',
                background: 'victory_glow',
                elements: ['confetti', 'sparkle'],
                textColor: '#ffffff',
                textShadow: '#ffd700', // Gold glow
                duration: 360
            },
            {
                title: 'THE END?',
                subtitle: '// CONNECTION TERMINATED',
                description: 'But in the digital realm... nothing truly ends.\n\nThank you for playing ITERATION.',
                background: 'digital_fade',
                elements: ['matrix', 'fade'],
                textColor: '#ffffff',
                textShadow: '#00f0ff', // Cyan glow
                duration: 420
            }
        ];
    }

    /**
     * Update cutscene
     */
    update() {
        if (!this.active) {
            console.log('Update called but cutscene not active');
            return;
        }

        // Log every 60 frames (once per second)
        if (this.sceneTimer % 60 === 0) {
            console.log('Cutscene update - scene:', this.currentScene, 'timer:', this.sceneTimer, 'fade:', this.fadeAlpha.toFixed(2), 'fadeDir:', this.fadeDirection);
        }

        // Decrement skip lockout
        if (this.skipLockout > 0) {
            this.skipLockout--;
        }

        // Update fade
        this.fadeAlpha += this.fadeDirection * this.fadeSpeed;

        if (this.fadeAlpha <= 0) {
            this.fadeAlpha = 0;
            this.fadeDirection = 0;
        }

        if (this.fadeAlpha >= 1 && this.fadeDirection === 1) {
            this.fadeAlpha = 1;
            this.nextScene();
            return;
        }

        // Update scene timer
        this.sceneTimer++;

        // Text reveal
        const scene = this.scenes[this.currentScene];
        const totalChars = (scene.title?.length || 0) + (scene.subtitle?.length || 0) + (scene.description?.length || 0);
        if (this.textRevealIndex < totalChars) {
            this.textRevealIndex += 2;
        }

        // Update particle effects
        this.updateParticles();

        // Scene duration check (use scene-specific duration or default)
        const currentDuration = scene.duration || this.sceneDuration;
        if (this.sceneTimer >= currentDuration) {
            this.fadeDirection = 1; // Start fade out
        }
    }

    /**
     * Update particle effects
     */
    updateParticles() {
        const scene = this.scenes[this.currentScene];
        if (!scene) return;

        // Spawn new particles based on scene elements
        if (this.sceneTimer % 3 === 0) {
            if (scene.elements.includes('matrix')) {
                this.spawnMatrixParticle();
            }
            if (scene.elements.includes('energy')) {
                this.spawnEnergyParticle();
            }
            if (scene.elements.includes('debris')) {
                this.spawnDebrisParticle();
            }
            if (scene.elements.includes('sparks')) {
                this.spawnSparksParticle();
            }
            if (scene.elements.includes('confetti')) {
                this.spawnConfettiParticle();
            }
            if (scene.elements.includes('sparkle')) {
                this.spawnSparkleParticle();
            }
        }

        // Speedlines spawn more frequently
        if (this.sceneTimer % 2 === 0 && scene.elements.includes('speedlines')) {
            this.spawnSpeedlineParticle();
        }

        // Lightning spawns occasionally
        if (this.sceneTimer % 20 === 0 && scene.elements.includes('lightning')) {
            this.spawnLightningParticle();
        }

        // Glitch effect
        if (scene.elements.includes('glitch')) {
            this.glitchIntensity = 0.3 + Math.sin(this.sceneTimer * 0.1) * 0.2;
        } else {
            this.glitchIntensity = 0;
        }

        // Update existing particles
        for (let i = this.particleEffects.length - 1; i >= 0; i--) {
            const p = this.particleEffects[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.vy !== undefined) p.vy += p.gravity || 0;

            if (p.life <= 0) {
                this.particleEffects.splice(i, 1);
            }
        }
    }

    /**
     * Spawn matrix rain particle
     */
    spawnMatrixParticle() {
        const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01';
        this.particleEffects.push({
            type: 'matrix',
            x: Math.random() * this.canvas.width,
            y: -20,
            vx: 0,
            vy: 3 + Math.random() * 2,
            char: chars[Math.floor(Math.random() * chars.length)],
            life: 200,
            color: Math.random() > 0.8 ? '#ff71ce' : '#01cdfe'
        });
    }

    /**
     * Spawn energy particle
     */
    spawnEnergyParticle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 100;

        this.particleEffects.push({
            type: 'energy',
            x: centerX + Math.cos(angle) * dist,
            y: centerY + Math.sin(angle) * dist,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            size: 2 + Math.random() * 4,
            life: 60,
            color: ['#ff71ce', '#01cdfe', '#ffd700', '#b967ff'][Math.floor(Math.random() * 4)]
        });
    }

    /**
     * Spawn debris particle
     */
    spawnDebrisParticle() {
        this.particleEffects.push({
            type: 'debris',
            x: Math.random() * this.canvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 4,
            gravity: 0.1,
            size: 3 + Math.random() * 8,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            life: 150,
            color: ['#ff4444', '#ff8800', '#ffff00'][Math.floor(Math.random() * 3)]
        });
    }

    /**
     * Spawn sparks particle (for core strike)
     */
    spawnSparksParticle() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = 5 + Math.random() * 10;

        this.particleEffects.push({
            type: 'spark',
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            gravity: 0.2,
            size: 2 + Math.random() * 3,
            life: 40 + Math.random() * 30,
            color: ['#ffffff', '#ffff00', '#ff8800'][Math.floor(Math.random() * 3)]
        });
    }

    /**
     * Spawn speedline particle (for running scene)
     */
    spawnSpeedlineParticle() {
        this.particleEffects.push({
            type: 'speedline',
            x: this.canvas.width + 10,
            y: Math.random() * this.canvas.height,
            vx: -20 - Math.random() * 15,
            vy: 0,
            length: 50 + Math.random() * 100,
            life: 30,
            color: `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`
        });
    }

    /**
     * Spawn lightning particle (for rift scene)
     */
    spawnLightningParticle() {
        const startX = this.canvas.width / 2 + (Math.random() - 0.5) * 200;
        const startY = 0;
        const segments = [];
        let x = startX;
        let y = startY;

        // Create jagged lightning path
        for (let i = 0; i < 8; i++) {
            const nextX = x + (Math.random() - 0.5) * 60;
            const nextY = y + this.canvas.height / 8;
            segments.push({ x1: x, y1: y, x2: nextX, y2: nextY });
            x = nextX;
            y = nextY;
        }

        this.particleEffects.push({
            type: 'lightning',
            segments: segments,
            life: 15,
            color: '#00f0ff'
        });
    }

    /**
     * Spawn confetti particle (for victory)
     */
    spawnConfettiParticle() {
        this.particleEffects.push({
            type: 'confetti',
            x: Math.random() * this.canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 3,
            vy: 2 + Math.random() * 3,
            gravity: 0.05,
            size: 6 + Math.random() * 6,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15,
            life: 200,
            color: ['#ff71ce', '#01cdfe', '#ffd700', '#05ffa1', '#b967ff', '#ff6b6b'][Math.floor(Math.random() * 6)]
        });
    }

    /**
     * Spawn sparkle particle (for celebration)
     */
    spawnSparkleParticle() {
        this.particleEffects.push({
            type: 'sparkle',
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: 0,
            vy: 0,
            size: 3 + Math.random() * 5,
            life: 60,
            maxLife: 60,
            color: '#ffd700'
        });
    }

    /**
     * Move to next scene or end cutscene
     */
    nextScene() {
        this.currentScene++;
        console.log('nextScene called, now on scene:', this.currentScene, 'of', this.scenes.length);
        this.sceneTimer = 0;
        this.textRevealIndex = 0;
        this.fadeDirection = -1;
        this.fadeAlpha = 1;
        this.particleEffects = [];

        if (this.currentScene >= this.scenes.length) {
            console.log('All scenes complete, ending cutscene');
            this.endCutscene();
        } else {
            // Play voice line for the new scene
            this.playSceneVoice(this.scenes[this.currentScene]);
        }
    }

    /**
     * End the cutscene
     */
    endCutscene() {
        // Prevent double-ending
        if (!this.active) {
            console.log('endCutscene called but already inactive');
            return;
        }

        console.log('endCutscene called');
        this.active = false;
        this.disableTouchSkip();

        // Stop any playing voice line
        if (this.game && this.game.voiceSystem) {
            this.game.voiceSystem.stop();
        }

        // Save and clear callback before calling to prevent double-execution
        const callback = this.onComplete;
        this.onComplete = null;

        if (callback) {
            console.log('Calling onComplete callback');
            callback();
        }
    }

    /**
     * Skip cutscene
     */
    skip() {
        // Don't skip if already inactive
        if (!this.active) {
            console.log('Skip ignored - cutscene not active');
            return;
        }

        // Don't skip if lockout is active (prevents accidental skip from touch that started cutscene)
        if (this.skipLockout > 0) {
            console.log('Skip blocked by lockout:', this.skipLockout);
            return;
        }
        console.log('Skipping cutscene');
        this.endCutscene();
    }

    /**
     * Render cutscene
     */
    render() {
        if (!this.active) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const scene = this.scenes[this.currentScene];

        // DEBUG: Show on-screen debug info
        this.debugRenderCount = (this.debugRenderCount || 0) + 1;
        if (!scene) return;

        // Clear and draw background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // Draw scene-specific background
        this.renderBackground(scene);

        // Draw particles behind text
        this.renderParticles();

        // Draw text with reveal effect
        this.renderText(scene);

        // Draw skip hint
        this.renderSkipHint();

        // Apply fade overlay
        if (this.fadeAlpha > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.fadeAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
    }

    /**
     * Render scene background
     */
    renderBackground(scene) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        switch (scene.background) {
            case 'city':
                this.renderCityscape();
                break;
            case 'facility':
                this.renderFacility();
                break;
            case 'digital':
                this.renderDigitalWorld();
                break;
            case 'corrupt':
                this.renderCorruptWorld();
                break;
            case 'portal':
                this.renderPortal();
                break;
            case 'explosion':
                this.renderExplosion();
                break;
            case 'escape':
                this.renderEscape();
                break;
            // New cinematic backgrounds
            case 'coreStrike':
                this.renderCoreStrike();
                break;
            case 'collapse':
                this.renderCollapse();
                break;
            case 'escape_run':
                this.renderEscapeRun();
                break;
            case 'rift':
                this.renderRift();
                break;
            case 'escape_light':
                this.renderEscapeLight();
                break;
            case 'victory_glow':
                this.renderVictoryGlow();
                break;
            case 'digital_fade':
                this.renderDigitalFade();
                break;
            default:
                this.renderDigitalWorld();
        }

        // Apply glitch effect if active
        if (this.glitchIntensity > 0) {
            this.applyGlitchEffect();
        }
    }

    /**
     * Render cityscape background
     */
    renderCityscape() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Gradient sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0, '#0a0a20');
        skyGrad.addColorStop(0.5, '#1a0a30');
        skyGrad.addColorStop(1, '#ff71ce33');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Buildings silhouette
        ctx.fillStyle = '#0d0d15';
        for (let i = 0; i < 20; i++) {
            const bw = 40 + Math.random() * 80;
            const bh = 100 + Math.random() * 300;
            const bx = i * (w / 15) - 50;
            ctx.fillRect(bx, h - bh, bw, bh);

            // Windows
            ctx.fillStyle = Math.random() > 0.5 ? '#00f0ff22' : '#ff00aa22';
            for (let wy = h - bh + 20; wy < h - 20; wy += 30) {
                for (let wx = bx + 10; wx < bx + bw - 10; wx += 20) {
                    if (Math.random() > 0.3) {
                        ctx.fillRect(wx, wy, 8, 15);
                    }
                }
            }
            ctx.fillStyle = '#0d0d15';
        }
    }

    /**
     * Render facility background
     */
    renderFacility() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark metallic background
        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#00f0ff11';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Pods/tanks
        for (let i = 0; i < 5; i++) {
            const px = 100 + i * (w - 200) / 4;
            const py = h - 200;

            ctx.fillStyle = '#001122';
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(px, py, 40, 80, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Glow inside
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, 40);
            gradient.addColorStop(0, '#00f0ff33');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    /**
     * Render digital world background
     */
    renderDigitalWorld() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark gradient
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, '#0a0020');
        grad.addColorStop(1, '#000005');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Perspective grid
        ctx.strokeStyle = '#b967ff22';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let y = h/2; y < h; y += 30) {
            const progress = (y - h/2) / (h/2);
            ctx.globalAlpha = progress;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Vertical lines (perspective)
        for (let x = -5; x <= 5; x++) {
            ctx.beginPath();
            ctx.moveTo(w/2 + x * 10, h/2);
            ctx.lineTo(w/2 + x * 200, h);
            ctx.stroke();
        }
    }

    /**
     * Render corrupt world
     */
    renderCorruptWorld() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Glitchy red background
        ctx.fillStyle = '#100005';
        ctx.fillRect(0, 0, w, h);

        // Glitch bars
        for (let i = 0; i < 20; i++) {
            const y = Math.random() * h;
            const height = Math.random() * 10;
            ctx.fillStyle = `rgba(255, 0, 50, ${Math.random() * 0.3})`;
            ctx.fillRect(0, y, w, height);
        }

        // Warning symbols
        ctx.font = 'bold 80px "Share Tech Mono", monospace';
        ctx.fillStyle = '#ff000033';
        ctx.textAlign = 'center';
        for (let i = 0; i < 5; i++) {
            ctx.fillText('⚠', Math.random() * w, Math.random() * h);
        }
    }

    /**
     * Render portal/escape background
     */
    renderPortal() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, w, h);

        // Central portal
        const centerX = w / 2;
        const centerY = h / 2;
        const time = this.sceneTimer * 0.05;

        // Outer glow rings
        for (let i = 5; i >= 0; i--) {
            const radius = 80 + i * 30 + Math.sin(time + i) * 10;
            const gradient = ctx.createRadialGradient(centerX, centerY, radius - 20, centerX, centerY, radius);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, ['#ff71ce', '#01cdfe', '#b967ff', '#ffd700'][i % 4] + '44');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Center bright spot
        const coreGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.3, '#ffd700');
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render explosion background
     */
    renderExplosion() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark with red tint
        ctx.fillStyle = '#150505';
        ctx.fillRect(0, 0, w, h);

        // Explosion flash
        const flash = Math.sin(this.sceneTimer * 0.1) * 0.3 + 0.3;
        ctx.fillStyle = `rgba(255, 100, 50, ${flash})`;
        ctx.fillRect(0, 0, w, h);

        // Shockwave rings
        const progress = (this.sceneTimer % 60) / 60;
        const ringRadius = progress * Math.max(w, h);
        ctx.strokeStyle = `rgba(255, 200, 100, ${1 - progress})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(w/2, h/2, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Render escape background
     */
    renderEscape() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Bright gradient (light at the end)
        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.3, '#ff8800');
        grad.addColorStop(0.6, '#330011');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Light rays
        ctx.save();
        ctx.translate(w/2, h/2);
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + this.sceneTimer * 0.01;
            ctx.rotate(angle);
            ctx.fillStyle = 'rgba(255, 255, 200, 0.1)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-30, -w);
            ctx.lineTo(30, -w);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-angle);
        }
        ctx.restore();
    }

    /**
     * Render core strike - blade hitting the core
     */
    renderCoreStrike() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark background with red pulse
        ctx.fillStyle = '#0a0005';
        ctx.fillRect(0, 0, w, h);

        // Central impact flash
        const flashIntensity = Math.max(0, 1 - this.sceneTimer / 30);
        if (flashIntensity > 0) {
            const flashGrad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 300);
            flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashIntensity})`);
            flashGrad.addColorStop(0.3, `rgba(255, 200, 100, ${flashIntensity * 0.8})`);
            flashGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = flashGrad;
            ctx.fillRect(0, 0, w, h);
        }

        // Cracking core
        const coreSize = 80 + Math.sin(this.sceneTimer * 0.2) * 10;
        ctx.save();
        ctx.translate(w/2, h/2);

        // Core body
        const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
        coreGrad.addColorStop(0, '#ff0000');
        coreGrad.addColorStop(0.5, '#880000');
        coreGrad.addColorStop(1, '#330000');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
        ctx.fill();

        // Cracks
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const len = 30 + Math.random() * 40;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            ctx.stroke();
        }
        ctx.restore();
    }

    /**
     * Render collapse - environment falling apart
     */
    renderCollapse() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Shaking red background
        const shakeX = (Math.random() - 0.5) * 8;
        const shakeY = (Math.random() - 0.5) * 8;
        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Dark red gradient
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#200000');
        grad.addColorStop(0.5, '#100000');
        grad.addColorStop(1, '#050000');
        ctx.fillStyle = grad;
        ctx.fillRect(-10, -10, w + 20, h + 20);

        // Falling grid lines (breaking apart)
        ctx.strokeStyle = '#ff000033';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 50) {
            const offset = Math.sin(x * 0.1 + this.sceneTimer * 0.05) * 20;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + offset, h);
            ctx.stroke();
        }

        // Warning stripes
        const stripeY = (this.sceneTimer * 3) % 100 - 50;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        for (let y = stripeY; y < h; y += 100) {
            ctx.fillRect(0, y, w, 30);
        }

        ctx.restore();
    }

    /**
     * Render escape run - running through corridor
     */
    renderEscapeRun() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark corridor
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, w, h);

        // Perspective corridor walls
        const vanishX = w / 2;
        const vanishY = h / 2;

        // Floor lines (moving toward viewer)
        ctx.strokeStyle = '#ff000044';
        ctx.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            const z = (i * 50 + this.sceneTimer * 8) % 1000;
            const scale = 1000 / (z + 100);
            const lineY = vanishY + (h/2 - vanishY) * scale + (h * 0.3) * scale;
            const lineWidth = w * scale;

            ctx.globalAlpha = Math.min(1, z / 200);
            ctx.beginPath();
            ctx.moveTo(vanishX - lineWidth/2, lineY);
            ctx.lineTo(vanishX + lineWidth/2, lineY);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Side wall lights (streaking by)
        ctx.fillStyle = '#ff4400';
        for (let i = 0; i < 10; i++) {
            const z = (i * 100 + this.sceneTimer * 10) % 1000;
            const scale = 500 / (z + 50);
            const y = vanishY - 50 * scale;
            const x1 = vanishX - (w/2) * scale - 20;
            const x2 = vanishX + (w/2) * scale + 20;

            ctx.globalAlpha = Math.min(0.8, z / 300);
            ctx.fillRect(x1 - 30, y - 5, 30, 10);
            ctx.fillRect(x2, y - 5, 30, 10);
        }
        ctx.globalAlpha = 1;

        // Emergency red flash
        if (Math.sin(this.sceneTimer * 0.15) > 0.5) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(0, 0, w, h);
        }
    }

    /**
     * Render rift - tear in reality
     */
    renderRift() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Dark void
        ctx.fillStyle = '#000010';
        ctx.fillRect(0, 0, w, h);

        // Rift in center
        const riftWidth = 60 + Math.sin(this.sceneTimer * 0.1) * 20;
        const riftHeight = h * 0.8;

        ctx.save();
        ctx.translate(w/2, h/2);

        // Rift glow
        const riftGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
        riftGrad.addColorStop(0, 'rgba(0, 240, 255, 0.5)');
        riftGrad.addColorStop(0.5, 'rgba(0, 100, 255, 0.2)');
        riftGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = riftGrad;
        ctx.fillRect(-200, -200, 400, 400);

        // Rift tear
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 50;
        ctx.beginPath();
        ctx.moveTo(0, -riftHeight/2);

        // Jagged edges
        for (let y = -riftHeight/2; y < riftHeight/2; y += 20) {
            const xOffset = (Math.random() - 0.5) * 20 + Math.sin(y * 0.1 + this.sceneTimer * 0.1) * 10;
            ctx.lineTo(riftWidth/2 + xOffset, y);
        }
        ctx.lineTo(0, riftHeight/2);
        for (let y = riftHeight/2; y > -riftHeight/2; y -= 20) {
            const xOffset = (Math.random() - 0.5) * 20 + Math.sin(y * 0.1 + this.sceneTimer * 0.1) * 10;
            ctx.lineTo(-riftWidth/2 + xOffset, y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Particles being pulled toward rift
        ctx.fillStyle = '#00f0ff';
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 + this.sceneTimer * 0.02;
            const dist = 200 + Math.sin(this.sceneTimer * 0.05 + i) * 100;
            const x = w/2 + Math.cos(angle) * dist;
            const y = h/2 + Math.sin(angle) * dist * 0.5;
            const size = 2 + Math.random() * 3;
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    /**
     * Render escape light - emerging into light
     */
    renderEscapeLight() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Bright golden light
        const progress = Math.min(this.sceneTimer / 120, 1);
        const brightness = 0.3 + progress * 0.7;

        const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
        grad.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
        grad.addColorStop(0.2, `rgba(255, 215, 0, ${brightness * 0.9})`);
        grad.addColorStop(0.5, `rgba(255, 140, 0, ${brightness * 0.6})`);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // God rays
        ctx.save();
        ctx.translate(w/2, h/2);
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2 + this.sceneTimer * 0.005;
            const rayLength = w;
            const rayWidth = 40 + Math.sin(this.sceneTimer * 0.05 + i) * 20;

            ctx.rotate(angle);
            ctx.fillStyle = `rgba(255, 255, 200, ${0.05 + Math.sin(this.sceneTimer * 0.03 + i * 0.5) * 0.03})`;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-rayWidth, -rayLength);
            ctx.lineTo(rayWidth, -rayLength);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-angle);
        }
        ctx.restore();

        // Lens flare
        if (progress > 0.5) {
            const flareAlpha = (progress - 0.5) * 2;
            ctx.fillStyle = `rgba(255, 255, 255, ${flareAlpha * 0.3})`;
            ctx.beginPath();
            ctx.arc(w/2, h/2, 50, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Render victory glow - celebration moment
     */
    renderVictoryGlow() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Deep purple/gold gradient
        const grad = ctx.createRadialGradient(w/2, h * 0.3, 0, w/2, h/2, w);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(0.3, '#b967ff');
        grad.addColorStop(0.6, '#1a0a30');
        grad.addColorStop(1, '#0a0015');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Rotating light rays
        ctx.save();
        ctx.translate(w/2, h * 0.3);
        const rayCount = 20;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2 + this.sceneTimer * 0.003;
            ctx.rotate(angle);
            const rayGrad = ctx.createLinearGradient(0, 0, 0, -h);
            rayGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
            rayGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = rayGrad;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-20, -h);
            ctx.lineTo(20, -h);
            ctx.closePath();
            ctx.fill();
            ctx.rotate(-angle);
        }
        ctx.restore();

        // Crown glow at top
        const crownY = 80 + Math.sin(this.sceneTimer * 0.05) * 10;
        const crownGrad = ctx.createRadialGradient(w/2, crownY, 0, w/2, crownY, 100);
        crownGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
        crownGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = crownGrad;
        ctx.beginPath();
        ctx.arc(w/2, crownY, 100, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render digital fade - ending with matrix effect
     */
    renderDigitalFade() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Fade to darker over time
        const fadeProgress = Math.min(this.sceneTimer / 300, 1);

        // Gradient from cyan to black
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgba(0, 20, 40, ${0.8 + fadeProgress * 0.2})`);
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Grid that fades out
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * (1 - fadeProgress)})`;
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Scanlines
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < h; y += 4) {
            ctx.fillRect(0, y, w, 2);
        }
    }

    /**
     * Apply glitch effect overlay
     */
    applyGlitchEffect() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // RGB split
        if (Math.random() < this.glitchIntensity) {
            const sliceY = Math.random() * h;
            const sliceH = 5 + Math.random() * 30;
            const offset = (Math.random() - 0.5) * 20;

            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.fillRect(offset, sliceY, w, sliceH);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.fillRect(-offset, sliceY, w, sliceH);
            ctx.restore();
        }

        // Random blocks
        if (Math.random() < this.glitchIntensity * 0.5) {
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0}, 0, ${Math.random() > 0.5 ? 255 : 0}, 0.3)`;
            ctx.fillRect(
                Math.random() * w,
                Math.random() * h,
                Math.random() * 100 + 20,
                Math.random() * 20 + 5
            );
        }
    }

    /**
     * Render particles
     */
    renderParticles() {
        const ctx = this.ctx;

        for (const p of this.particleEffects) {
            ctx.save();

            // Calculate alpha based on particle type
            let alpha = 1;
            if (p.type === 'matrix') alpha = p.life / 200;
            else if (p.type === 'confetti') alpha = Math.min(p.life / 50, 1);
            else if (p.type === 'sparkle') alpha = Math.sin((p.life / p.maxLife) * Math.PI);
            else if (p.type === 'lightning') alpha = p.life / 15;
            else alpha = p.life / 60;

            ctx.globalAlpha = alpha;

            if (p.type === 'matrix') {
                ctx.font = '16px "MS Gothic", monospace';
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.fillText(p.char, p.x, p.y);
            } else if (p.type === 'energy') {
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'debris') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                p.rotation += p.rotationSpeed;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
            } else if (p.type === 'spark') {
                // Sparks with trail
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
                // Trail
                ctx.strokeStyle = p.color;
                ctx.lineWidth = p.size / 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 2, p.y - p.vy * 2);
                ctx.stroke();
            } else if (p.type === 'speedline') {
                // Speed lines for running effect
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.length, p.y);
                ctx.stroke();
            } else if (p.type === 'lightning') {
                // Lightning bolt segments
                ctx.strokeStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 20;
                ctx.lineWidth = 3;
                for (const seg of p.segments) {
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.stroke();
                }
                // Glow effect
                ctx.lineWidth = 8;
                ctx.globalAlpha = alpha * 0.3;
                for (const seg of p.segments) {
                    ctx.beginPath();
                    ctx.moveTo(seg.x1, seg.y1);
                    ctx.lineTo(seg.x2, seg.y2);
                    ctx.stroke();
                }
            } else if (p.type === 'confetti') {
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                p.rotation += p.rotationSpeed;
                ctx.fillStyle = p.color;
                // Rectangular confetti
                ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
            } else if (p.type === 'sparkle') {
                // Star-shaped sparkle
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 15;
                this.drawStar(ctx, p.x, p.y, 4, p.size, p.size / 2);
            }

            ctx.restore();
        }
    }

    /**
     * Helper to draw a star shape
     */
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    /**
     * Render text with typewriter effect
     */
    renderText(scene) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        let charIndex = 0;

        // Determine shadow color - use textShadow if specified, otherwise use textColor
        const shadowColor = scene.textShadow || scene.textColor || '#ffffff';

        // Title
        if (scene.title) {
            const titleChars = Math.min(this.textRevealIndex, scene.title.length);
            const title = scene.title.substring(0, titleChars);

            ctx.font = 'bold 64px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = scene.textColor || '#ffffff';
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = scene.textShadow ? 30 : 20; // Stronger glow if custom shadow
            ctx.fillText(title, w/2, h/2 - 60);

            // Draw again for stronger effect on bright backgrounds
            if (scene.textShadow) {
                ctx.fillText(title, w/2, h/2 - 60);
            }
            ctx.shadowBlur = 0;

            charIndex += scene.title.length;
        }

        // Subtitle
        if (scene.subtitle) {
            const subChars = Math.max(0, Math.min(this.textRevealIndex - charIndex, scene.subtitle.length));
            const subtitle = scene.subtitle.substring(0, subChars);

            ctx.font = '28px "Share Tech Mono", monospace';
            // Use darker color for bright backgrounds
            ctx.fillStyle = scene.textShadow ? scene.textColor : '#888888';
            if (scene.textShadow) {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = 15;
            }
            ctx.fillText(subtitle, w/2, h/2 - 10);
            ctx.shadowBlur = 0;

            charIndex += scene.subtitle.length;
        }

        // Description
        if (scene.description) {
            const descChars = Math.max(0, Math.min(this.textRevealIndex - charIndex, scene.description.length));
            const description = scene.description.substring(0, descChars);

            ctx.font = '20px "Share Tech Mono", monospace';
            // Use darker color for bright backgrounds
            ctx.fillStyle = scene.textShadow ? scene.textColor : '#aaaaaa';
            if (scene.textShadow) {
                ctx.shadowColor = shadowColor;
                ctx.shadowBlur = 10;
            }
            ctx.fillText(description, w/2, h/2 + 50);
            ctx.shadowBlur = 0;
        }

        // Scene indicator
        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.fillStyle = scene.textShadow ? 'rgba(0,0,0,0.5)' : '#444444';
        ctx.textAlign = 'right';
        ctx.fillText(`${this.currentScene + 1}/${this.scenes.length}`, w - 30, h - 30);
    }

    /**
     * Render skip hint
     */
    renderSkipHint() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const pulse = Math.sin(this.sceneTimer * 0.1) * 0.3 + 0.5;
        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
        ctx.textAlign = 'center';
        ctx.fillText('[ PRESS SPACE OR TAP TO SKIP ]', w/2, h - 50);
    }

    /**
     * Check if cutscene is playing
     */
    isPlaying() {
        return this.active;
    }
}
