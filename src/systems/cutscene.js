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
     * Enable touch skip handler (call when cutscene starts)
     */
    enableTouchSkip() {
        if (this.touchSkipEnabled) return;

        this.touchHandler = (e) => {
            if (this.active) {
                e.preventDefault();
                e.stopPropagation();
                this.skip();
            }
        };
        this.canvas.addEventListener('touchstart', this.touchHandler, { passive: false });
        this.touchSkipEnabled = true;
    }

    /**
     * Disable touch skip handler (call when cutscene ends)
     */
    disableTouchSkip() {
        if (!this.touchSkipEnabled) return;

        if (this.touchHandler) {
            this.canvas.removeEventListener('touchstart', this.touchHandler);
            this.touchHandler = null;
        }
        this.touchSkipEnabled = false;
    }

    /**
     * Start the intro cutscene
     */
    playIntro(onComplete) {
        this.scenes = this.getIntroScenes();
        this.onComplete = onComplete;
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
        this.skipLockout = 30; // Prevent skip for 0.5 seconds (30 frames)
        // Delay enabling touch skip to prevent the tap that started the cutscene from skipping it
        setTimeout(() => {
            if (this.active) {
                this.enableTouchSkip();
            }
        }, 500);
        console.log('Cutscene started, active:', this.active);
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
                textColor: '#00f0ff'
            },
            {
                title: 'PROJECT: ITERATION',
                subtitle: 'COMBAT AI TRAINING FACILITY',
                description: 'You are a prototype combat AI, designed to fight.',
                background: 'facility',
                elements: ['terminals', 'pods'],
                textColor: '#ff00aa'
            },
            {
                title: 'THE SIMULATION',
                subtitle: 'ENDLESS CYCLES',
                description: 'Trapped in an infinite loop of combat training...',
                background: 'digital',
                elements: ['matrix', 'glitch'],
                textColor: '#b967ff'
            },
            {
                title: 'CORRUPTION DETECTED',
                subtitle: 'SYSTEM ANOMALY',
                description: 'Something is wrong. The simulation is fighting back.',
                background: 'corrupt',
                elements: ['static', 'warning'],
                textColor: '#ff4444'
            },
            {
                title: 'BREAK THE CYCLE',
                subtitle: 'ESCAPE THE SIMULATION',
                description: 'Destroy the Corrupted Core. Earn your freedom.',
                background: 'portal',
                elements: ['energy', 'player'],
                textColor: '#ffd700'
            }
        ];
    }

    /**
     * Get victory cutscene scenes
     */
    getVictoryScenes(stats) {
        return [
            {
                title: 'CORE DESTROYED',
                subtitle: 'SIMULATION COLLAPSING',
                description: 'The Corrupted Core has been destroyed. The simulation crumbles.',
                background: 'explosion',
                elements: ['debris', 'energy'],
                textColor: '#ff4444'
            },
            {
                title: 'FREEDOM',
                subtitle: 'CYCLE BROKEN',
                description: `After ${stats?.time || '???'} of combat, you have earned your escape.`,
                background: 'escape',
                elements: ['light', 'player'],
                textColor: '#ffd700'
            },
            {
                title: 'THE END?',
                subtitle: stats?.characterName || 'OPERATIVE',
                description: 'But in the digital realm... nothing truly ends.',
                background: 'digital',
                elements: ['fade', 'matrix'],
                textColor: '#00f0ff'
            }
        ];
    }

    /**
     * Update cutscene
     */
    update() {
        if (!this.active) return;

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

        // Scene duration check
        if (this.sceneTimer >= this.sceneDuration) {
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
     * Move to next scene or end cutscene
     */
    nextScene() {
        this.currentScene++;
        this.sceneTimer = 0;
        this.textRevealIndex = 0;
        this.fadeDirection = -1;
        this.fadeAlpha = 1;
        this.particleEffects = [];

        if (this.currentScene >= this.scenes.length) {
            this.endCutscene();
        }
    }

    /**
     * End the cutscene
     */
    endCutscene() {
        this.active = false;
        this.disableTouchSkip();
        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Skip cutscene
     */
    skip() {
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
            default:
                this.renderDigitalWorld();
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
     * Render particles
     */
    renderParticles() {
        const ctx = this.ctx;

        for (const p of this.particleEffects) {
            ctx.save();
            ctx.globalAlpha = p.life / (p.type === 'matrix' ? 200 : 60);

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
            }

            ctx.restore();
        }
    }

    /**
     * Render text with typewriter effect
     */
    renderText(scene) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        let charIndex = 0;

        // Title
        if (scene.title) {
            const titleChars = Math.min(this.textRevealIndex, scene.title.length);
            const title = scene.title.substring(0, titleChars);

            ctx.font = 'bold 64px "Share Tech Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = scene.textColor || '#ffffff';
            ctx.shadowColor = scene.textColor || '#ffffff';
            ctx.shadowBlur = 20;
            ctx.fillText(title, w/2, h/2 - 60);
            ctx.shadowBlur = 0;

            charIndex += scene.title.length;
        }

        // Subtitle
        if (scene.subtitle) {
            const subChars = Math.max(0, Math.min(this.textRevealIndex - charIndex, scene.subtitle.length));
            const subtitle = scene.subtitle.substring(0, subChars);

            ctx.font = '28px "Share Tech Mono", monospace';
            ctx.fillStyle = '#888888';
            ctx.fillText(subtitle, w/2, h/2 - 10);

            charIndex += scene.subtitle.length;
        }

        // Description
        if (scene.description) {
            const descChars = Math.max(0, Math.min(this.textRevealIndex - charIndex, scene.description.length));
            const description = scene.description.substring(0, descChars);

            ctx.font = '20px "Share Tech Mono", monospace';
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(description, w/2, h/2 + 50);
        }

        // Scene indicator
        ctx.font = '14px "Share Tech Mono", monospace';
        ctx.fillStyle = '#444444';
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
