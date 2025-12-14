/**
 * ITERATION - Player Entity
 * The combat AI protagonist
 */

class Player extends Entity {
    constructor(x, y) {
        super(x, y, GAME_CONFIG.PLAYER.WIDTH, GAME_CONFIG.PLAYER.HEIGHT);

        // Movement
        this.speed = GAME_CONFIG.PLAYER.SPEED;
        this.jumpForce = GAME_CONFIG.PLAYER.JUMP_FORCE;

        // Jump mechanics
        this.coyoteTime = 0; // Grace period after leaving platform
        this.isJumping = false;
        this.jumpHeld = false;
        this.variableJumpMultiplier = 0.5; // For variable jump height

        // Combat
        this.health = GAME_CONFIG.PLAYER.MAX_HEALTH;
        this.maxHealth = GAME_CONFIG.PLAYER.MAX_HEALTH;
        this.invincibilityFrames = 0;
        this.isAttacking = false;
        this.attackFrame = 0;
        this.attackDuration = 15;
        this.attackCooldown = 0;

        // Animation state
        this.state = 'idle'; // idle, run, jump, fall, attack
        this.animationFrame = 0;
        this.animationTimer = 0;

        // Visual effects
        this.trailPositions = []; // For afterimage effect
        this.maxTrailLength = 5;

        // Blade (starts basic, evolves)
        this.bladeType = 'BASIC';
        this.bladeLength = 38;
        this.bladeAngle = 0;
        this.bladeColor = GAME_CONFIG.COLORS.BLADE;
        this.bladeGlow = GAME_CONFIG.COLORS.BLADE;
        this.bladeDamageMultiplier = 1.0;

        // Blade visual data (updated by evolution)
        this.bladeVisuals = null;
        this.bladeParticles = [];
        this.bladeSwingTrail = [];
        this.bladePulsePhase = 0;
    }

    /**
     * Handle player input and update state
     */
    handleInput(input) {
        // Horizontal movement
        const horizontal = input.getHorizontal();

        if (horizontal !== 0) {
            this.velocityX += horizontal * this.speed * 0.3;
            this.velocityX = Utils.clamp(this.velocityX, -this.speed, this.speed);
            this.facingRight = horizontal > 0;
        }

        // Jumping
        this.handleJump(input);

        // Attacking
        this.handleAttack(input);

        // Update facing direction based on movement
        if (Math.abs(this.velocityX) > 0.5) {
            this.facingRight = this.velocityX > 0;
        }
    }

    /**
     * Handle jump input with coyote time and variable jump height
     */
    handleJump(input) {
        // Update coyote time
        if (!this.isGrounded && this.coyoteTime > 0) {
            this.coyoteTime--;
        }

        // Check for jump
        const canJump = this.isGrounded || this.coyoteTime > 0;
        const wantsJump = input.isJumpBuffered();

        if (canJump && wantsJump) {
            // Apply jump multiplier (Titan has lower jump)
            const jumpMult = this.jumpMultiplier || 1.0;
            this.velocityY = this.jumpForce * jumpMult;
            this.isJumping = true;
            this.jumpHeld = true;
            this.coyoteTime = 0;
            input.consumeJumpBuffer();
        }

        // Variable jump height (release early = lower jump)
        if (this.isJumping && !input.isActionHeld('jump') && this.velocityY < 0) {
            this.velocityY *= this.variableJumpMultiplier;
            this.isJumping = false;
        }

        // Reset jumping state when landing
        if (this.isGrounded) {
            this.isJumping = false;
        }
    }

    /**
     * Handle attack input
     */
    handleAttack(input) {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            return;
        }

        if (input.isActionJustPressed('attack') && !this.isAttacking) {
            this.isAttacking = true;
            this.attackFrame = 0;
            this.attackCooldown = 20; // Frames until next attack
        }
    }

    /**
     * Update player state
     */
    update(deltaTime, input) {
        if (!this.active) return;

        // Handle input
        this.handleInput(input);

        // Apply friction and update position
        this.applyFriction();
        this.updatePosition();

        // Update blade pulse phase
        this.bladePulsePhase += 0.15;

        // Update attack state
        if (this.isAttacking) {
            this.attackFrame++;
            // Calculate blade swing angle
            const attackProgress = this.attackFrame / this.attackDuration;
            this.bladeAngle = this.facingRight
                ? -45 + (attackProgress * 135)
                : 225 - (attackProgress * 135);

            // Spawn blade particles during swing (if tier supports it)
            if (this.bladeVisuals && this.bladeVisuals.hasParticles) {
                this.spawnBladeParticles();
            }

            // Add to swing trail for higher tiers
            if (this.bladeVisuals && this.bladeVisuals.hasTrail) {
                this.bladeSwingTrail.push({
                    x: this.x + this.width / 2,
                    y: this.y + 20,
                    angle: this.bladeAngle,
                    alpha: 1,
                    length: this.bladeLength
                });
                if (this.bladeSwingTrail.length > 6) {
                    this.bladeSwingTrail.shift();
                }
            }

            if (this.attackFrame >= this.attackDuration) {
                this.isAttacking = false;
                this.attackFrame = 0;
            }
        } else {
            // Idle blade position
            this.bladeAngle = this.facingRight ? 30 : 150;
            // Clear swing trail when not attacking
            this.bladeSwingTrail = [];
        }

        // Update blade particles
        this.updateBladeParticles();

        // Update invincibility
        if (this.invincibilityFrames > 0) {
            this.invincibilityFrames--;
        }

        // Update animation state
        this.updateAnimationState();

        // Store position for trail effect
        this.updateTrail();
    }

    /**
     * Update animation state based on movement
     */
    updateAnimationState() {
        const prevState = this.state;

        if (this.isAttacking) {
            this.state = 'attack';
        } else if (!this.isGrounded) {
            this.state = this.velocityY < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.velocityX) > 0.5) {
            this.state = 'run';
        } else {
            this.state = 'idle';
        }

        // Reset animation frame on state change
        if (prevState !== this.state) {
            this.animationFrame = 0;
            this.animationTimer = 0;
        }

        // Update animation timer
        this.animationTimer++;
        if (this.animationTimer >= 6) { // 10fps animation
            this.animationTimer = 0;
            this.animationFrame++;
        }
    }

    /**
     * Update position trail for afterimage effect
     */
    updateTrail() {
        if (Math.abs(this.velocityX) > 2 || Math.abs(this.velocityY) > 2) {
            this.trailPositions.unshift({ x: this.x, y: this.y });
            if (this.trailPositions.length > this.maxTrailLength) {
                this.trailPositions.pop();
            }
        } else {
            // Fade out trail when stationary
            if (this.trailPositions.length > 0) {
                this.trailPositions.pop();
            }
        }
    }

    /**
     * Take damage
     * Returns true if damage was taken, false if invincible
     */
    takeDamage(amount) {
        if (this.invincibilityFrames > 0) return false;

        // Apply damage amplification (Havoc takes extra damage)
        const damageAmp = this.damageAmplify || 0;
        const finalDamage = Math.floor(amount * (1 + damageAmp));

        this.health -= finalDamage;
        this.invincibilityFrames = GAME_CONFIG.PLAYER.INVINCIBILITY_FRAMES;

        if (this.health <= 0) {
            this.health = 0;
            // Don't call die() here - let game.js handle death detection
            // This ensures handlePlayerDeath() can run properly
        }

        return true;
    }

    /**
     * Handle player death
     */
    die() {
        this.active = false;
        // Death will be handled by game state
    }

    /**
     * Render the player
     */
    render(ctx, camera) {
        if (!this.active) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        // Flash when invincible
        if (this.invincibilityFrames > 0 && Math.floor(this.invincibilityFrames / 4) % 2 === 0) {
            return;
        }

        // Draw trail (afterimages)
        this.renderTrail(ctx, camera);

        // Draw blade swing trail (behind player)
        this.renderBladeSwingTrail(ctx, camera);

        // Draw player body (humanoid silhouette)
        this.renderBody(ctx, screenPos);

        // Draw equipped hat (if cosmetics system exists)
        if (window.game?.cosmeticsSystem) {
            const centerX = screenPos.x + this.width / 2;
            window.game.cosmeticsSystem.renderHat(ctx, centerX, screenPos.y + 2, this.facingRight);
        }

        // Draw blade
        this.renderBlade(ctx, screenPos);

        // Draw blade particles (on top)
        this.renderBladeParticles(ctx, camera);

        // Debug: draw hitbox
        if (GAME_CONFIG.DEBUG) {
            ctx.strokeStyle = '#ff0000';
            ctx.strokeRect(screenPos.x, screenPos.y, this.width, this.height);
        }
    }

    /**
     * Render player body
     */
    renderBody(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;

        // Get colors: suit (equipped) > character (selected) > default
        const bodyColor = this.suitBodyColor || this.characterColor || GAME_CONFIG.COLORS.PLAYER;
        const coreColor = this.suitCoreColor || this.characterSecondaryColor || GAME_CONFIG.COLORS.PLAYER_CORE;

        ctx.save();

        // Body glow
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 15;

        // Head
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(centerX, screenPos.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Core (chest)
        ctx.fillStyle = coreColor;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, screenPos.y + 22, 4, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.fillStyle = bodyColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(centerX - 6, screenPos.y + 16, 12, 16);

        // Legs
        const legOffset = this.state === 'run' ? Math.sin(this.animationFrame * 0.8) * 4 : 0;

        // Left leg
        ctx.fillRect(centerX - 6, screenPos.y + 32, 5, 14 + legOffset);

        // Right leg
        ctx.fillRect(centerX + 1, screenPos.y + 32, 5, 14 - legOffset);

        // Arms
        const armAngle = this.isAttacking
            ? Utils.degToRad(this.bladeAngle - (this.facingRight ? 0 : 180))
            : Utils.degToRad(this.facingRight ? 20 : 160);

        ctx.save();
        ctx.translate(centerX, screenPos.y + 20);
        ctx.rotate(armAngle);
        ctx.fillRect(0, -2, 14, 4);
        ctx.restore();

        ctx.restore();
    }

    /**
     * Render the blade based on current evolution tier
     */
    renderBlade(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const handY = screenPos.y + 20;
        const v = this.bladeVisuals || { shape: 'stick', length: 38, width: 3, glowIntensity: 12, coreWidth: 1 };
        const pulse = Math.sin(this.bladePulsePhase) * 0.15 + 0.85;

        ctx.save();

        // Position at hand
        ctx.translate(centerX + (this.facingRight ? 10 : -10), handY);
        ctx.rotate(Utils.degToRad(this.bladeAngle));

        // Blade glow
        ctx.shadowColor = this.bladeGlow;
        ctx.shadowBlur = (this.isAttacking ? v.glowIntensity * 1.5 : v.glowIntensity) * pulse;

        // Render based on blade shape/tier
        switch (v.shape) {
            case 'stick':
                this.renderStickBlade(ctx, v, pulse);
                break;
            case 'blade':
                this.renderChargedBlade(ctx, v, pulse);
                break;
            case 'sword':
                this.renderSwordBlade(ctx, v, pulse);
                break;
            case 'heatsword':
                this.renderHeatSword(ctx, v, pulse);
                break;
            case 'corrupt':
                this.renderCorruptBlade(ctx, v, pulse);
                break;
            case 'laser':
                this.renderLaserBlade(ctx, v, pulse);
                break;
            default:
                this.renderStickBlade(ctx, v, pulse);
        }

        ctx.restore();
    }

    /**
     * Tier 0: Basic energy stick
     */
    renderStickBlade(ctx, v, pulse) {
        const gradient = ctx.createLinearGradient(0, 0, v.length, 0);
        gradient.addColorStop(0, this.bladeColor);
        gradient.addColorStop(0.8, this.bladeColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -v.width);
        ctx.lineTo(v.length, 0);
        ctx.lineTo(0, v.width);
        ctx.closePath();
        ctx.fill();

        // Core line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = v.coreWidth;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(v.length - 5, 0);
        ctx.stroke();
    }

    /**
     * Tier 1: Charged blade with crackling
     */
    renderChargedBlade(ctx, v, pulse) {
        const gradient = ctx.createLinearGradient(0, 0, v.length, 0);
        gradient.addColorStop(0, this.bladeColor);
        gradient.addColorStop(0.7, this.bladeColor);
        gradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -v.width);
        ctx.lineTo(v.length * 0.3, -v.width * 1.2);
        ctx.lineTo(v.length, 0);
        ctx.lineTo(v.length * 0.3, v.width * 1.2);
        ctx.lineTo(0, v.width);
        ctx.closePath();
        ctx.fill();

        // Crackling effect
        if (v.crackling && this.isAttacking) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.7;
            for (let i = 0; i < 3; i++) {
                const startX = Utils.random(5, v.length * 0.6);
                const crackle = Utils.random(-8, 8);
                ctx.beginPath();
                ctx.moveTo(startX, 0);
                ctx.lineTo(startX + 8, crackle);
                ctx.lineTo(startX + 12, crackle * 0.5);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = v.coreWidth;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(v.length - 5, 0);
        ctx.stroke();
    }

    /**
     * Tier 2: Enhanced sword with guard
     */
    renderSwordBlade(ctx, v, pulse) {
        // Blade body - wider sword shape
        const gradient = ctx.createLinearGradient(0, 0, v.length, 0);
        gradient.addColorStop(0, this.bladeColor);
        gradient.addColorStop(0.5, this.bladeColor);
        gradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(8, -v.width * 0.5);
        ctx.lineTo(v.length * 0.2, -v.width);
        ctx.lineTo(v.length * 0.8, -v.width * 0.8);
        ctx.lineTo(v.length, 0);
        ctx.lineTo(v.length * 0.8, v.width * 0.8);
        ctx.lineTo(v.length * 0.2, v.width);
        ctx.lineTo(8, v.width * 0.5);
        ctx.closePath();
        ctx.fill();

        // Guard
        if (v.hasGuard) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-2, -8, 10, 16);

            ctx.fillStyle = this.bladeColor;
            ctx.fillRect(0, -6, 6, 12);
        }

        // Core glow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = v.coreWidth;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(v.length - 8, 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    /**
     * Tier 3: Overclocked heat sword with segments
     */
    renderHeatSword(ctx, v, pulse) {
        const segmentCount = v.segments || 3;
        const segmentLength = v.length / segmentCount;

        // Draw segments with gaps
        for (let i = 0; i < segmentCount; i++) {
            const startX = i * segmentLength + (i * 3);
            const segWidth = segmentLength - 2;
            const taperFactor = 1 - (i * 0.15);

            ctx.fillStyle = this.bladeColor;
            ctx.shadowBlur = v.glowIntensity * pulse;

            ctx.beginPath();
            ctx.moveTo(startX, -v.width * taperFactor);
            ctx.lineTo(startX + segWidth, -v.width * taperFactor * 0.8);
            ctx.lineTo(startX + segWidth, v.width * taperFactor * 0.8);
            ctx.lineTo(startX, v.width * taperFactor);
            ctx.closePath();
            ctx.fill();

            // Heat glow between segments
            if (i < segmentCount - 1) {
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.5 + pulse * 0.5;
                ctx.beginPath();
                ctx.arc(startX + segWidth + 1.5, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        }

        // Guard
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -10, 8, 20);
        ctx.fillStyle = this.bladeColor;
        ctx.fillRect(-1, -8, 6, 16);

        // Heat distortion particles
        if (v.heatDistortion && this.isAttacking) {
            ctx.globalAlpha = 0.4;
            for (let i = 0; i < 4; i++) {
                const px = Utils.random(10, v.length);
                const py = Utils.random(-12, 12);
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(px, py, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Tier 4: Corrupted jagged blade
     */
    renderCorruptBlade(ctx, v, pulse) {
        // Glitch offset for corrupt effect
        const glitchX = v.glitchEffect ? (Math.random() - 0.5) * 3 : 0;
        const glitchY = v.glitchEffect ? (Math.random() - 0.5) * 3 : 0;

        ctx.save();
        ctx.translate(glitchX, glitchY);

        // Jagged blade shape
        ctx.fillStyle = this.bladeColor;
        ctx.beginPath();
        ctx.moveTo(0, -v.width * 0.5);

        // Jagged top edge
        for (let i = 1; i <= 5; i++) {
            const x = (v.length / 5) * i;
            const y = -v.width * (1 - i * 0.1) + (i % 2 === 0 ? -4 : 4);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(v.length, 0);

        // Jagged bottom edge
        for (let i = 5; i >= 1; i--) {
            const x = (v.length / 5) * i;
            const y = v.width * (1 - i * 0.1) + (i % 2 === 0 ? 4 : -4);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(0, v.width * 0.5);
        ctx.closePath();
        ctx.fill();

        // Corruption veins
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6 + pulse * 0.4;
        for (let i = 0; i < 3; i++) {
            const startX = Utils.random(5, v.length * 0.4);
            ctx.beginPath();
            ctx.moveTo(startX, 0);
            let px = startX;
            for (let j = 0; j < 4; j++) {
                px += Utils.random(8, 15);
                const py = Utils.random(-v.width, v.width);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        ctx.restore();

        // Glitch echo (second render with offset)
        if (v.glitchEffect && Math.random() > 0.7) {
            ctx.globalAlpha = 0.3;
            ctx.translate(Utils.random(-5, 5), Utils.random(-3, 3));
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(0, -v.width * 0.4);
            ctx.lineTo(v.length, 0);
            ctx.lineTo(0, v.width * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    /**
     * Tier 5: Transcended laser beam
     */
    renderLaserBlade(ctx, v, pulse) {
        const beamPulse = Math.sin(this.bladePulsePhase * 2) * 0.3 + 0.7;

        // Rainbow color shift for transcended
        let color1 = this.bladeColor;
        let color2 = v.secondaryColor || '#00ffff';
        if (v.rainbow) {
            const hueShift = (this.bladePulsePhase * 20) % 360;
            color2 = `hsl(${hueShift}, 100%, 70%)`;
        }

        // Outer glow beam
        ctx.shadowBlur = v.glowIntensity * 1.5;
        ctx.shadowColor = this.bladeGlow;

        const gradient = ctx.createLinearGradient(0, 0, v.length, 0);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(0.3, color1);
        gradient.addColorStop(0.6, color2);
        gradient.addColorStop(1, '#ffffff');

        // Main beam body
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -v.width * 0.3);
        ctx.lineTo(v.length * 0.1, -v.width * beamPulse);
        ctx.lineTo(v.length * 0.9, -v.width * 0.6 * beamPulse);
        ctx.lineTo(v.length, 0);
        ctx.lineTo(v.length * 0.9, v.width * 0.6 * beamPulse);
        ctx.lineTo(v.length * 0.1, v.width * beamPulse);
        ctx.lineTo(0, v.width * 0.3);
        ctx.closePath();
        ctx.fill();

        // Pulsing core
        if (v.pulsingCore) {
            const coreGradient = ctx.createLinearGradient(0, 0, v.length, 0);
            coreGradient.addColorStop(0, '#ffffff');
            coreGradient.addColorStop(0.5, '#ffffff');
            coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.fillStyle = coreGradient;
            ctx.globalAlpha = 0.6 + beamPulse * 0.4;
            ctx.beginPath();
            ctx.moveTo(5, -v.coreWidth);
            ctx.lineTo(v.length - 5, 0);
            ctx.lineTo(5, v.coreWidth);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Energy rings along beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = beamPulse * 0.8;
        for (let i = 1; i <= 3; i++) {
            const ringX = (v.length / 4) * i;
            const ringSize = (v.width * 0.4) * (1 - i * 0.15);
            ctx.beginPath();
            ctx.ellipse(ringX, 0, 3, ringSize, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // Emitter base
        ctx.fillStyle = '#333344';
        ctx.fillRect(-4, -6, 8, 12);
        ctx.fillStyle = this.bladeGlow;
        ctx.globalAlpha = pulse;
        ctx.fillRect(-2, -4, 4, 8);
        ctx.globalAlpha = 1;
    }

    /**
     * Spawn blade particles during attack
     */
    spawnBladeParticles() {
        if (!this.bladeVisuals) return;

        const particleCount = this.bladeVisuals.particleCount || 1;
        if (Math.random() > 0.4) return; // Don't spawn every frame

        for (let i = 0; i < particleCount; i++) {
            const angle = Utils.degToRad(this.bladeAngle);
            const dist = Utils.random(10, this.bladeLength);
            const handX = this.x + this.width / 2 + (this.facingRight ? 10 : -10);
            const handY = this.y + 20;

            this.bladeParticles.push({
                x: handX + Math.cos(angle) * dist,
                y: handY + Math.sin(angle) * dist,
                vx: Utils.random(-2, 2),
                vy: Utils.random(-3, -1),
                life: Utils.randomInt(15, 30),
                maxLife: 30,
                size: Utils.random(2, 5)
            });
        }
    }

    /**
     * Update blade particles
     */
    updateBladeParticles() {
        for (let i = this.bladeParticles.length - 1; i >= 0; i--) {
            const p = this.bladeParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Slight gravity
            p.life--;

            if (p.life <= 0) {
                this.bladeParticles.splice(i, 1);
            }
        }
    }

    /**
     * Render blade particles
     */
    renderBladeParticles(ctx, camera) {
        if (this.bladeParticles.length === 0) return;

        ctx.save();

        for (const p of this.bladeParticles) {
            const screenPos = camera.worldToScreen(p.x, p.y);
            const alpha = p.life / p.maxLife;

            ctx.fillStyle = this.bladeColor;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = this.bladeGlow;
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render blade swing trail
     */
    renderBladeSwingTrail(ctx, camera) {
        if (this.bladeSwingTrail.length === 0) return;

        ctx.save();

        for (let i = 0; i < this.bladeSwingTrail.length; i++) {
            const trail = this.bladeSwingTrail[i];
            const screenPos = camera.worldToScreen(trail.x, trail.y - 20);
            const alpha = (i / this.bladeSwingTrail.length) * 0.4;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(screenPos.x + (this.facingRight ? 10 : -10), screenPos.y + 20);
            ctx.rotate(Utils.degToRad(trail.angle));

            ctx.fillStyle = this.bladeColor;
            ctx.shadowColor = this.bladeGlow;
            ctx.shadowBlur = 5;

            ctx.beginPath();
            ctx.moveTo(0, -2);
            ctx.lineTo(trail.length * 0.8, 0);
            ctx.lineTo(0, 2);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        ctx.restore();
    }

    /**
     * Render afterimage trail
     */
    renderTrail(ctx, camera) {
        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const screenPos = camera.worldToScreen(pos.x, pos.y);
            const alpha = (1 - (i / this.trailPositions.length)) * 0.3;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Simplified silhouette for trail
            const centerX = screenPos.x + this.width / 2;
            ctx.fillStyle = GAME_CONFIG.COLORS.CYAN_DIM;
            ctx.fillRect(centerX - 6, screenPos.y + 8, 12, 38);

            ctx.restore();
        }
    }

    /**
     * Get attack hitbox
     */
    getAttackBounds() {
        if (!this.isAttacking) return null;

        const attackProgress = this.attackFrame / this.attackDuration;
        const reach = this.bladeLength + 10;

        // Calculate hitbox based on swing arc
        const hitboxWidth = 50;
        const hitboxHeight = 40;

        return {
            x: this.facingRight
                ? this.x + this.width - 10
                : this.x - hitboxWidth + 10,
            y: this.y + 5,
            width: hitboxWidth,
            height: hitboxHeight
        };
    }
}
