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
        this.maxTrailLength = 8; // Longer trail for better visibility

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

        // Dash ability
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashDuration = 8;  // Frames of dash
        this.dashCooldown = 0;
        this.dashCooldownMax = 45;  // Frames between dashes
        this.dashSpeed = 18;  // Dash velocity
        this.dashDirection = 1;  // 1 = right, -1 = left

        // Charged attack
        this.isCharging = false;
        this.chargeTimer = 0;
        this.chargeMax = 60;  // Frames to full charge
        this.chargeLevel = 0;  // 0-3 charge levels

        // Special ability (limit break)
        this.specialMeter = 0;
        this.specialMeterMax = 100;
        this.isUsingSpecial = false;
        this.specialTimer = 0;
        this.specialActivationBurst = 0;  // Activation animation frames

        // Character visuals (set by characterSystem.applyToPlayer)
        this.characterColor = null;
        this.characterSecondaryColor = null;
        this.characterEyeColor = null;
        this.characterAccentColor = null;
        this.characterStyle = 'default';
        this.characterId = null;
        this.characterSpecial = null;

        // Suit visuals (set by cosmeticsSystem.applySuitToPlayer)
        this.suitBodyColor = null;
        this.suitCoreColor = null;
    }

    /**
     * Handle player input and update state
     */
    handleInput(input) {
        // Don't process normal input during dash
        if (this.isDashing) return;

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

        // Dashing
        this.handleDash(input);

        // Special ability
        this.handleSpecial(input);

        // Update facing direction based on movement
        if (Math.abs(this.velocityX) > 0.5) {
            this.facingRight = this.velocityX > 0;
        }
    }

    /**
     * Handle dash input
     */
    handleDash(input) {
        if (this.dashCooldown > 0) {
            this.dashCooldown--;
            return;
        }

        if (input.isActionJustPressed('dash') && !this.isDashing) {
            this.isDashing = true;
            this.dashTimer = 0;
            this.dashDirection = this.facingRight ? 1 : -1;
            this.dashCooldown = this.dashCooldownMax;
            // Give slight vertical boost if in air for better aerial mobility
            if (!this.isGrounded && this.velocityY > 0) {
                this.velocityY *= 0.5;
            }
        }
    }

    /**
     * Handle special ability input (limit break)
     */
    handleSpecial(input) {
        if (input.isActionJustPressed('special') && this.specialMeter >= this.specialMeterMax && !this.isUsingSpecial) {
            this.activateSpecial();
        }
    }

    /**
     * Activate special ability based on character
     */
    activateSpecial() {
        this.isUsingSpecial = true;
        this.specialTimer = 120;  // 2 seconds of special effect
        this.specialMeter = 0;
        this.specialActivationBurst = 30;  // Frames of activation burst effect
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
     * Handle attack input with charged attack support
     */
    handleAttack(input) {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
            return;
        }

        // Start charging when attack is pressed
        if (input.isActionJustPressed('attack') && !this.isAttacking && !this.isCharging) {
            this.isCharging = true;
            this.chargeTimer = 0;
            this.chargeLevel = 0;
        }

        // Continue charging while held
        if (this.isCharging && input.isActionHeld('attack')) {
            this.chargeTimer++;
            // Update charge level (0-3)
            if (this.chargeTimer >= this.chargeMax) {
                this.chargeLevel = 3;  // Max charge
            } else if (this.chargeTimer >= this.chargeMax * 0.66) {
                this.chargeLevel = 2;
            } else if (this.chargeTimer >= this.chargeMax * 0.33) {
                this.chargeLevel = 1;
            } else {
                this.chargeLevel = 0;
            }
        }

        // Release charged attack
        if (this.isCharging && !input.isActionHeld('attack')) {
            this.isCharging = false;
            this.isAttacking = true;
            this.attackFrame = 0;
            // Cooldown scales with charge level (higher charge = longer cooldown)
            this.attackCooldown = 15 + (this.chargeLevel * 5);
        }

        // Quick tap attack (released before any charge built up)
        if (input.isActionJustPressed('attack') && !this.isAttacking && !this.isCharging) {
            this.isAttacking = true;
            this.attackFrame = 0;
            this.chargeLevel = 0;
            this.attackCooldown = 20;
        }
    }

    /**
     * Update player state
     */
    update(deltaTime, input) {
        if (!this.active) return;

        // Handle input
        this.handleInput(input);

        // Update dash
        this.updateDash();

        // Update special ability
        this.updateSpecial();

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
                this.chargeLevel = 0;  // Reset charge after attack completes
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

        if (this.isDashing) {
            this.state = 'dash';
        } else if (this.isAttacking) {
            this.state = 'attack';
        } else if (this.isCharging) {
            this.state = 'charge';
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
     * Update dash state
     */
    updateDash() {
        if (this.isDashing) {
            this.dashTimer++;
            // Apply dash velocity
            this.velocityX = this.dashDirection * this.dashSpeed;
            // Slight invincibility during dash
            this.invincibilityFrames = Math.max(this.invincibilityFrames, 2);

            // End dash
            if (this.dashTimer >= this.dashDuration) {
                this.isDashing = false;
                this.dashTimer = 0;
                // Reduce velocity after dash
                this.velocityX *= 0.5;
            }
        }
    }

    /**
     * Update special ability state
     */
    updateSpecial() {
        if (this.isUsingSpecial) {
            this.specialTimer--;
            if (this.specialTimer <= 0) {
                this.isUsingSpecial = false;
            }
        }
        // Update activation burst
        if (this.specialActivationBurst > 0) {
            this.specialActivationBurst--;
        }
    }

    /**
     * Add to special meter (called when killing enemies, etc)
     */
    addSpecialMeter(amount) {
        this.specialMeter = Math.min(this.specialMeter + amount, this.specialMeterMax);
    }

    /**
     * Get damage multiplier from charge level
     * Level 0: 1.0x, Level 1: 1.5x, Level 2: 2.0x, Level 3: 3.0x
     */
    getChargeDamageMultiplier() {
        const multipliers = [1.0, 1.5, 2.0, 3.0];
        return multipliers[this.chargeLevel] || 1.0;
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

        // Draw charge effect (behind player)
        if (this.isCharging) {
            this.renderChargeEffect(ctx, screenPos);
        }

        // Draw special ability effect (behind player)
        if (this.isUsingSpecial || this.specialActivationBurst > 0) {
            this.renderSpecialEffect(ctx, screenPos);
        }

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
        const accentColor = this.characterAccentColor || bodyColor;

        // Use special render for hollow/vapor styles
        if (this.characterStyle === 'hollow') {
            this.renderHollowBody(ctx, screenPos, bodyColor, coreColor, accentColor);
            return;
        }
        if (this.characterStyle === 'vapor') {
            this.renderVaporBody(ctx, screenPos, bodyColor, coreColor, accentColor);
            return;
        }

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
     * Render Hollow Knight-inspired body (VOID character)
     * Small cloaked figure with mask-like face
     */
    renderHollowBody(ctx, screenPos, bodyColor, coreColor, accentColor) {
        const centerX = screenPos.x + this.width / 2;
        const legOffset = this.state === 'run' ? Math.sin(this.animationFrame * 0.8) * 3 : 0;
        const bobOffset = Math.sin(this.animationFrame * 0.3) * 1.5;

        ctx.save();

        // Ethereal glow effect
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 20;

        // Cloak/body - flowing shape
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(centerX - 10, screenPos.y + 18);
        ctx.quadraticCurveTo(centerX - 14, screenPos.y + 35, centerX - 8 + legOffset, screenPos.y + 46);
        ctx.lineTo(centerX + 8 - legOffset, screenPos.y + 46);
        ctx.quadraticCurveTo(centerX + 14, screenPos.y + 35, centerX + 10, screenPos.y + 18);
        ctx.closePath();
        ctx.fill();

        // Mask/head - iconic horn shape
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 25;
        ctx.shadowColor = accentColor;
        ctx.beginPath();
        // Main mask oval
        ctx.ellipse(centerX, screenPos.y + 12 + bobOffset, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Left horn
        ctx.beginPath();
        ctx.moveTo(centerX - 6, screenPos.y + 5 + bobOffset);
        ctx.quadraticCurveTo(centerX - 12, screenPos.y - 8 + bobOffset, centerX - 8, screenPos.y - 12 + bobOffset);
        ctx.quadraticCurveTo(centerX - 4, screenPos.y - 6 + bobOffset, centerX - 4, screenPos.y + 5 + bobOffset);
        ctx.fill();

        // Right horn
        ctx.beginPath();
        ctx.moveTo(centerX + 6, screenPos.y + 5 + bobOffset);
        ctx.quadraticCurveTo(centerX + 12, screenPos.y - 8 + bobOffset, centerX + 8, screenPos.y - 12 + bobOffset);
        ctx.quadraticCurveTo(centerX + 4, screenPos.y - 6 + bobOffset, centerX + 4, screenPos.y + 5 + bobOffset);
        ctx.fill();

        // Hollow eyes (black voids)
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.ellipse(centerX - 4, screenPos.y + 10 + bobOffset, 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 4, screenPos.y + 10 + bobOffset, 2.5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner void glow in eyes
        ctx.fillStyle = coreColor;
        ctx.globalAlpha = 0.3 + Math.sin(this.animationFrame * 0.1) * 0.2;
        ctx.beginPath();
        ctx.ellipse(centerX - 4, screenPos.y + 11 + bobOffset, 1.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(centerX + 4, screenPos.y + 11 + bobOffset, 1.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Arm holding blade
        ctx.fillStyle = bodyColor;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 10;
        const armAngle = this.isAttacking
            ? Utils.degToRad(this.bladeAngle - (this.facingRight ? 0 : 180))
            : Utils.degToRad(this.facingRight ? 30 : 150);

        ctx.save();
        ctx.translate(centerX + (this.facingRight ? 5 : -5), screenPos.y + 22);
        ctx.rotate(armAngle);
        ctx.fillRect(0, -2, 12, 4);
        ctx.restore();

        ctx.restore();
    }

    /**
     * Render Vaporwave aesthetic body (NEON character)
     * Glowing retro-future warrior with sunset gradient
     */
    renderVaporBody(ctx, screenPos, bodyColor, coreColor, accentColor) {
        const centerX = screenPos.x + this.width / 2;
        const legOffset = this.state === 'run' ? Math.sin(this.animationFrame * 0.8) * 4 : 0;
        const pulse = Math.sin(this.animationFrame * 0.15) * 0.3 + 0.7;

        ctx.save();

        // Create sunset gradient for body
        const gradient = ctx.createLinearGradient(centerX, screenPos.y, centerX, screenPos.y + 46);
        gradient.addColorStop(0, bodyColor);
        gradient.addColorStop(0.5, accentColor);
        gradient.addColorStop(1, coreColor);

        // Intense neon glow
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 25 * pulse;

        // Head with visor
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, screenPos.y + 10, 9, 0, Math.PI * 2);
        ctx.fill();

        // Visor/eyes - horizontal line
        ctx.fillStyle = this.characterEyeColor || '#00ffff';
        ctx.shadowColor = this.characterEyeColor || '#00ffff';
        ctx.shadowBlur = 15;
        ctx.fillRect(centerX - 7, screenPos.y + 8, 14, 3);

        // Scan line effect on visor
        const scanLine = (this.animationFrame % 30) / 30;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(centerX - 7, screenPos.y + 8 + scanLine * 3, 14, 1);

        // Torso with gradient
        ctx.fillStyle = gradient;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 20;
        ctx.fillRect(centerX - 7, screenPos.y + 16, 14, 16);

        // Grid lines on torso (retro aesthetic)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX - 7, screenPos.y + 20 + i * 5);
            ctx.lineTo(centerX + 7, screenPos.y + 20 + i * 5);
            ctx.stroke();
        }

        // Legs
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.fillRect(centerX - 6, screenPos.y + 32, 5, 14 + legOffset);
        ctx.fillRect(centerX + 1, screenPos.y + 32, 5, 14 - legOffset);

        // Arm
        const armAngle = this.isAttacking
            ? Utils.degToRad(this.bladeAngle - (this.facingRight ? 0 : 180))
            : Utils.degToRad(this.facingRight ? 20 : 160);

        ctx.save();
        ctx.translate(centerX, screenPos.y + 20);
        ctx.rotate(armAngle);
        ctx.fillRect(0, -2, 14, 4);
        ctx.restore();

        // Trailing particles for aesthetic
        if (Math.random() < 0.3) {
            ctx.fillStyle = bodyColor;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(
                centerX + (Math.random() - 0.5) * 20,
                screenPos.y + 30 + Math.random() * 20,
                2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

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
        const attackPulse = this.isAttacking ? 1 + Math.sin(this.attackFrame * 0.5) * 0.3 : 1;

        ctx.save();

        // Position at hand
        ctx.translate(centerX + (this.facingRight ? 10 : -10), handY);
        ctx.rotate(Utils.degToRad(this.bladeAngle));

        // ENHANCED: Outer aura glow (extra layer)
        if (this.isAttacking || v.shape !== 'stick') {
            ctx.shadowColor = this.bladeGlow;
            ctx.shadowBlur = v.glowIntensity * 2.5 * pulse * attackPulse;
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = this.bladeGlow;
            ctx.beginPath();
            ctx.ellipse(v.length * 0.4, 0, v.length * 0.5, v.width * 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        // Main blade glow
        ctx.shadowColor = this.bladeGlow;
        ctx.shadowBlur = (this.isAttacking ? v.glowIntensity * 2 : v.glowIntensity * 1.3) * pulse;

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
     * Render charge effect around player
     */
    renderChargeEffect(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const chargeProgress = this.chargeTimer / this.chargeMax;
        const pulse = Math.sin(this.bladePulsePhase * 3) * 0.3 + 0.7;

        ctx.save();

        // Charge colors based on level
        const chargeColors = ['#4488ff', '#44ff88', '#ffff44', '#ff4444'];
        const color = chargeColors[this.chargeLevel];

        // Growing aura
        const baseRadius = 25;
        const maxRadius = 50;
        const radius = baseRadius + (maxRadius - baseRadius) * chargeProgress;

        // Outer glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 20 + (this.chargeLevel * 10);

        // Pulsing ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 + this.chargeLevel;
        ctx.globalAlpha = 0.5 * pulse;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // Inner charging particles
        ctx.fillStyle = color;
        const particleCount = 4 + this.chargeLevel * 2;
        for (let i = 0; i < particleCount; i++) {
            const angle = (this.bladePulsePhase * 2) + (i * Math.PI * 2 / particleCount);
            const dist = radius * 0.6 * chargeProgress;
            const px = centerX + Math.cos(angle) * dist;
            const py = centerY + Math.sin(angle) * dist;

            ctx.globalAlpha = 0.6 + pulse * 0.4;
            ctx.beginPath();
            ctx.arc(px, py, 3 + this.chargeLevel, 0, Math.PI * 2);
            ctx.fill();
        }

        // Charge level indicator
        if (this.chargeLevel > 0) {
            ctx.font = 'bold 12px "Courier New", monospace';
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.globalAlpha = pulse;
            ctx.fillText('×' + (this.getChargeDamageMultiplier()).toFixed(1), centerX, screenPos.y - 15);
        }

        // Max charge flash
        if (this.chargeLevel === 3) {
            ctx.globalAlpha = 0.2 * pulse;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render special ability (limit break) effect
     */
    renderSpecialEffect(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const pulse = Math.sin(this.bladePulsePhase * 4) * 0.3 + 0.7;

        ctx.save();

        // Activation burst effect (expanding ring)
        if (this.specialActivationBurst > 0) {
            const burstProgress = 1 - (this.specialActivationBurst / 30);
            const burstRadius = 30 + burstProgress * 100;

            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 6 * (1 - burstProgress);
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 30;
            ctx.globalAlpha = 1 - burstProgress;
            ctx.beginPath();
            ctx.arc(centerX, centerY, burstRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner burst
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * (1 - burstProgress);
            ctx.beginPath();
            ctx.arc(centerX, centerY, burstRadius * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Active special aura
        if (this.isUsingSpecial) {
            const auraRadius = 35 + pulse * 10;
            const timeRemaining = this.specialTimer / 120;

            // Outer glow aura
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 25 + pulse * 15;

            // Pulsing aura ring
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = 0.6 * pulse * timeRemaining;
            ctx.beginPath();
            ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner energy field
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, auraRadius);
            gradient.addColorStop(0, 'rgba(255, 0, 255, 0.3)');
            gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.15)');
            gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

            ctx.fillStyle = gradient;
            ctx.globalAlpha = 0.5 * pulse * timeRemaining;
            ctx.beginPath();
            ctx.arc(centerX, centerY, auraRadius, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting energy particles
            ctx.fillStyle = '#ffffff';
            const particleCount = 6;
            for (let i = 0; i < particleCount; i++) {
                const angle = (this.bladePulsePhase * 3) + (i * Math.PI * 2 / particleCount);
                const dist = auraRadius * 0.8;
                const px = centerX + Math.cos(angle) * dist;
                const py = centerY + Math.sin(angle) * dist;

                ctx.globalAlpha = 0.8 * pulse * timeRemaining;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // "2x DAMAGE" indicator
            ctx.font = 'bold 10px "Courier New", monospace';
            ctx.fillStyle = '#ff00ff';
            ctx.textAlign = 'center';
            ctx.globalAlpha = pulse * timeRemaining;
            ctx.fillText('2× DMG', centerX, screenPos.y - 20);

            // Timer bar
            const barWidth = 40;
            const barHeight = 3;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(centerX - barWidth/2, screenPos.y - 12, barWidth, barHeight);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(centerX - barWidth/2, screenPos.y - 12, barWidth * timeRemaining, barHeight);
        }

        ctx.restore();
    }

    /**
     * Render afterimage trail - ENHANCED VERSION
     */
    renderTrail(ctx, camera) {
        if (this.trailPositions.length === 0) return;

        // Get character color for trail
        const trailColor = this.characterColor || GAME_CONFIG.COLORS.CYAN;
        const glowColor = this.characterSecondaryColor || this.characterColor || GAME_CONFIG.COLORS.CYAN;

        for (let i = 0; i < this.trailPositions.length; i++) {
            const pos = this.trailPositions[i];
            const screenPos = camera.worldToScreen(pos.x, pos.y);
            const progress = i / this.trailPositions.length;
            const alpha = (1 - progress) * 0.5;

            ctx.save();
            ctx.globalAlpha = alpha;

            const centerX = screenPos.x + this.width / 2;
            const centerY = screenPos.y + this.height / 2;

            // Glow effect
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 15 * (1 - progress);

            // Trail body silhouette with gradient
            const gradient = ctx.createLinearGradient(centerX - 8, 0, centerX + 8, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.3, trailColor);
            gradient.addColorStop(0.7, trailColor);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;

            // Head
            ctx.beginPath();
            ctx.arc(centerX, screenPos.y + 10, 7 * (1 - progress * 0.3), 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillRect(centerX - 5, screenPos.y + 16, 10, 14);

            // Legs
            ctx.fillRect(centerX - 5, screenPos.y + 30, 4, 12);
            ctx.fillRect(centerX + 1, screenPos.y + 30, 4, 12);

            // Trailing particles
            if (i === 0 && Math.random() < 0.3) {
                ctx.fillStyle = glowColor;
                ctx.globalAlpha = alpha * 0.8;
                ctx.beginPath();
                ctx.arc(
                    centerX + (Math.random() - 0.5) * 20,
                    centerY + (Math.random() - 0.5) * 30,
                    2 + Math.random() * 2,
                    0, Math.PI * 2
                );
                ctx.fill();
            }

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
