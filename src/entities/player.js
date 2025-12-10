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
        this.bladeType = 'basic';
        this.bladeLength = 40;
        this.bladeAngle = 0;
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
            this.velocityY = this.jumpForce;
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

        // Update attack state
        if (this.isAttacking) {
            this.attackFrame++;
            // Calculate blade swing angle
            const attackProgress = this.attackFrame / this.attackDuration;
            this.bladeAngle = this.facingRight
                ? -45 + (attackProgress * 135)
                : 225 - (attackProgress * 135);

            if (this.attackFrame >= this.attackDuration) {
                this.isAttacking = false;
                this.attackFrame = 0;
            }
        } else {
            // Idle blade position
            this.bladeAngle = this.facingRight ? 30 : 150;
        }

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
     */
    takeDamage(amount) {
        if (this.invincibilityFrames > 0) return false;

        this.health -= amount;
        this.invincibilityFrames = GAME_CONFIG.PLAYER.INVINCIBILITY_FRAMES;

        if (this.health <= 0) {
            this.health = 0;
            this.die();
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

        // Draw player body (humanoid silhouette)
        this.renderBody(ctx, screenPos);

        // Draw blade
        this.renderBlade(ctx, screenPos);

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

        ctx.save();

        // Body glow
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 15;

        // Head
        ctx.fillStyle = GAME_CONFIG.COLORS.PLAYER;
        ctx.beginPath();
        ctx.arc(centerX, screenPos.y + 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Core (chest)
        ctx.fillStyle = GAME_CONFIG.COLORS.PLAYER_CORE;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, screenPos.y + 22, 4, 0, Math.PI * 2);
        ctx.fill();

        // Torso
        ctx.fillStyle = GAME_CONFIG.COLORS.PLAYER;
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
     * Render the blade
     */
    renderBlade(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const handY = screenPos.y + 20;

        ctx.save();

        // Position at hand
        ctx.translate(centerX + (this.facingRight ? 10 : -10), handY);
        ctx.rotate(Utils.degToRad(this.bladeAngle));

        // Blade glow
        ctx.shadowColor = GAME_CONFIG.COLORS.BLADE;
        ctx.shadowBlur = this.isAttacking ? 25 : 15;

        // Blade body
        const gradient = ctx.createLinearGradient(0, 0, this.bladeLength, 0);
        gradient.addColorStop(0, GAME_CONFIG.COLORS.BLADE);
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(this.bladeLength, 0);
        ctx.lineTo(0, 2);
        ctx.closePath();
        ctx.fill();

        // Blade core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.lineTo(this.bladeLength - 5, 0);
        ctx.stroke();

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
