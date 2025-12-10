/**
 * ITERATION - Enemy Entity
 * Basic enemy that patrols and attacks player
 */

class Enemy extends Entity {
    constructor(x, y, type = 'drone') {
        super(x, y, 36, 36);

        this.type = type;

        // Stats
        this.health = 50;
        this.maxHealth = 50;
        this.damage = 10;
        this.speed = 1.5;

        // AI State
        this.aiState = 'patrol'; // patrol, chase, attack, hurt
        this.patrolDirection = Math.random() > 0.5 ? 1 : -1;
        this.patrolTimer = 0;
        this.patrolDuration = Utils.randomInt(60, 180);

        // Detection
        this.detectionRange = 200;
        this.attackRange = 50;
        this.target = null;

        // Combat
        this.invincibilityFrames = 0;
        this.hitFlash = 0;
        this.attackCooldown = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;

        // Death
        this.deathTimer = 0;
        this.particles = [];
    }

    /**
     * Update enemy AI and state
     */
    update(deltaTime, player) {
        if (!this.active) return;

        this.target = player;

        // Update invincibility
        if (this.invincibilityFrames > 0) {
            this.invincibilityFrames--;
        }

        // Update hit flash
        if (this.hitFlash > 0) {
            this.hitFlash--;
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        // Update animation
        this.animTimer++;
        if (this.animTimer >= 10) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        this.pulsePhase += 0.1;

        // AI behavior
        this.updateAI(player);

        // Apply friction
        this.applyFriction();

        // Update position
        this.updatePosition();

        // Update particles
        this.updateParticles();
    }

    /**
     * Update AI behavior
     */
    updateAI(player) {
        if (!player || !player.active) {
            this.aiState = 'patrol';
            this.patrol();
            return;
        }

        const distToPlayer = Utils.distance(
            this.x + this.width / 2,
            this.y + this.height / 2,
            player.x + player.width / 2,
            player.y + player.height / 2
        );

        // State transitions
        if (distToPlayer < this.attackRange) {
            this.aiState = 'attack';
        } else if (distToPlayer < this.detectionRange) {
            this.aiState = 'chase';
        } else {
            this.aiState = 'patrol';
        }

        // Execute behavior
        switch (this.aiState) {
            case 'patrol':
                this.patrol();
                break;
            case 'chase':
                this.chase(player);
                break;
            case 'attack':
                this.attack(player);
                break;
        }
    }

    /**
     * Patrol behavior
     */
    patrol() {
        this.patrolTimer++;

        if (this.patrolTimer >= this.patrolDuration) {
            this.patrolTimer = 0;
            this.patrolDuration = Utils.randomInt(60, 180);
            this.patrolDirection *= -1;
        }

        this.velocityX = this.patrolDirection * this.speed * 0.5;
        this.facingRight = this.patrolDirection > 0;
    }

    /**
     * Chase player
     */
    chase(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);

        if (Math.abs(dx) > 10) {
            this.velocityX = Math.sign(dx) * this.speed;
            this.facingRight = dx > 0;
        }
    }

    /**
     * Attack behavior
     */
    attack(player) {
        // Stop moving when attacking
        this.velocityX *= 0.8;

        // Face player
        const dx = player.x - this.x;
        this.facingRight = dx > 0;
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.invincibilityFrames > 0) return false;

        this.health -= amount;
        this.invincibilityFrames = 20;
        this.hitFlash = 10;

        // Knockback
        const knockbackDir = this.target ? Math.sign(this.x - this.target.x) : 1;
        this.velocityX = knockbackDir * 8;
        this.velocityY = -3;

        // Spawn hit particles
        this.spawnHitParticles();

        if (this.health <= 0) {
            this.die();
            return true; // Enemy killed
        }

        return false;
    }

    /**
     * Handle death
     */
    die() {
        this.active = false;
        // Death particles are spawned and will be rendered by room
    }

    /**
     * Spawn particles on hit
     */
    spawnHitParticles() {
        for (let i = 0; i < 8; i++) {
            this.particles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Utils.random(-4, 4),
                vy: Utils.random(-4, 2),
                life: Utils.randomInt(15, 30),
                maxLife: 30,
                size: Utils.random(2, 6)
            });
        }
    }

    /**
     * Update particles
     */
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2; // gravity
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render enemy
     */
    render(ctx, camera) {
        if (!this.active && this.particles.length === 0) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        // Render particles
        this.renderParticles(ctx, camera);

        if (!this.active) return;

        // Flash white when hit
        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0) {
            this.renderFlash(ctx, screenPos);
            return;
        }

        // Invincibility blink
        if (this.invincibilityFrames > 0 && Math.floor(this.invincibilityFrames / 3) % 2 === 0) {
            return;
        }

        ctx.save();

        // Draw based on type
        this.renderDrone(ctx, screenPos);

        // Health bar
        this.renderHealthBar(ctx, screenPos);

        ctx.restore();
    }

    /**
     * Render drone type enemy
     */
    renderDrone(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;

        // Glow
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 15 * pulse;

        // Body - geometric shape
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.beginPath();

        // Diamond/rhombus shape
        ctx.moveTo(centerX, screenPos.y + 4);
        ctx.lineTo(screenPos.x + this.width - 4, centerY);
        ctx.lineTo(centerX, screenPos.y + this.height - 4);
        ctx.lineTo(screenPos.x + 4, centerY);
        ctx.closePath();
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Eye indicator
        const eyeOffsetX = this.facingRight ? 4 : -4;
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA_DIM;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX, centerY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Animated "antenna" lines
        ctx.strokeStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;

        const bobOffset = Math.sin(this.pulsePhase * 2) * 3;

        // Top antenna
        ctx.beginPath();
        ctx.moveTo(centerX, screenPos.y + 4);
        ctx.lineTo(centerX, screenPos.y - 8 + bobOffset);
        ctx.stroke();

        // Side accents
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenPos.x + 4, centerY);
        ctx.lineTo(screenPos.x - 4, centerY + bobOffset);
        ctx.moveTo(screenPos.x + this.width - 4, centerY);
        ctx.lineTo(screenPos.x + this.width + 4, centerY - bobOffset);
        ctx.stroke();
    }

    /**
     * Render flash effect when hit
     */
    renderFlash(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.moveTo(centerX, screenPos.y + 4);
        ctx.lineTo(screenPos.x + this.width - 4, centerY);
        ctx.lineTo(centerX, screenPos.y + this.height - 4);
        ctx.lineTo(screenPos.x + 4, centerY);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render health bar
     */
    renderHealthBar(ctx, screenPos) {
        if (this.health >= this.maxHealth) return;

        const barWidth = this.width;
        const barHeight = 4;
        const barX = screenPos.x;
        const barY = screenPos.y - 10;

        const healthPercent = this.health / this.maxHealth;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 5;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
    }

    /**
     * Render particles
     */
    renderParticles(ctx, camera) {
        ctx.save();

        for (const p of this.particles) {
            const screenPos = camera.worldToScreen(p.x, p.y);
            const alpha = p.life / p.maxLife;

            ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
            ctx.shadowBlur = 5;

            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
