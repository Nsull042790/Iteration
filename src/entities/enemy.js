/**
 * ITERATION - Enemy Entity
 * Basic enemy that patrols and attacks player
 */

class Enemy extends Entity {
    constructor(x, y, type = 'drone') {
        super(x, y, 36, 36);

        this.type = type;

        // Visual variant (random appearance)
        this.variant = Math.floor(Math.random() * 4); // 0-3 different looks
        this.colorVariant = this.getColorVariant();

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

        // Status effects (DoT)
        this.statusEffects = [];

        // Slow effect from cold imbue
        this.slowDuration = 0;
        this.slowMultiplier = 1.0;

        // Random hop/dodge behavior
        this.hopCooldown = Utils.randomInt(60, 180);
        this.hopTimer = 0;
    }

    /**
     * Get color variant for this enemy
     */
    getColorVariant() {
        const variants = [
            { main: GAME_CONFIG.COLORS.MAGENTA, core: '#ffffff', accent: '#ff71ce' },
            { main: '#b967ff', core: '#e0b0ff', accent: '#9932cc' },     // Purple
            { main: '#ff6b6b', core: '#ffaaaa', accent: '#cc0000' },     // Red
            { main: '#01cdfe', core: '#ffffff', accent: '#0088aa' },     // Cyan
        ];
        return variants[this.variant];
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

        // Update status effects (DoT)
        this.updateStatusEffects();

        // Update slow effect
        if (this.slowDuration > 0) {
            this.slowDuration--;
            if (this.slowDuration <= 0) {
                this.slowMultiplier = 1.0;
            }
        }
    }

    /**
     * Apply slow effect (Cold imbue)
     */
    applySlow(multiplier, duration) {
        this.slowMultiplier = multiplier;
        this.slowDuration = duration;
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

        // Random hop behavior (makes enemies less predictable)
        this.updateHopBehavior();

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
     * Random hop/dodge behavior to make enemies less linear
     */
    updateHopBehavior() {
        this.hopTimer++;

        if (this.hopTimer >= this.hopCooldown && this.isGrounded) {
            // Random chance to hop
            if (Math.random() < 0.7) {  // 70% chance when timer ready
                this.velocityY = -8 - Math.random() * 4;  // Variable hop height
            }
            this.hopTimer = 0;
            this.hopCooldown = Utils.randomInt(60, 180);  // Reset cooldown
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

        // Apply slow multiplier from cold imbue
        this.velocityX = this.patrolDirection * this.speed * 0.5 * this.slowMultiplier;
        this.facingRight = this.patrolDirection > 0;
    }

    /**
     * Chase player
     */
    chase(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);

        if (Math.abs(dx) > 10) {
            // Apply slow multiplier from cold imbue
            this.velocityX = Math.sign(dx) * this.speed * this.slowMultiplier;
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
    takeDamage(amount, isCrit = false) {
        if (this.invincibilityFrames > 0) return false;

        this.health -= amount;
        this.invincibilityFrames = 20;
        this.hitFlash = isCrit ? 15 : 10;

        // Knockback (stronger for crits)
        const knockbackDir = this.target ? Math.sign(this.x - this.target.x) : 1;
        this.velocityX = knockbackDir * (isCrit ? 12 : 8);
        this.velocityY = isCrit ? -5 : -3;

        // Spawn hit particles (dramatic for crits)
        this.spawnHitParticles(isCrit);

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
     * Apply a status effect (bleed, burn, etc.)
     * @param {string} type - 'bleed', 'burn', 'freeze', etc.
     * @param {number} damage - damage per tick
     * @param {number} duration - total duration in frames
     * @param {boolean} isCrit - whether the original hit was a crit (DoT ticks inherit crit)
     */
    applyStatusEffect(type, damage, duration, isCrit = false) {
        // Check if already has this effect - refresh duration if so
        const existing = this.statusEffects.find(e => e.type === type);
        if (existing) {
            existing.duration = Math.max(existing.duration, duration);
            existing.damage = Math.max(existing.damage, damage);
            existing.isCrit = existing.isCrit || isCrit; // Keep crit if either was crit
            return;
        }

        this.statusEffects.push({
            type: type,
            damage: damage,
            duration: duration,
            maxDuration: duration,
            tickRate: 30, // Damage every 30 frames (0.5 seconds)
            tickTimer: 0,
            isCrit: isCrit
        });
    }

    /**
     * Update and process status effects
     * Returns total DoT damage dealt this frame
     */
    updateStatusEffects() {
        if (!this.active) return 0;

        let totalDotDamage = 0;

        for (let i = this.statusEffects.length - 1; i >= 0; i--) {
            const effect = this.statusEffects[i];

            effect.tickTimer++;
            effect.duration--;

            // Apply DoT damage on tick
            if (effect.tickTimer >= effect.tickRate) {
                effect.tickTimer = 0;

                // Calculate tick damage (crit applies to DoT ticks!)
                let tickDamage = effect.damage;
                if (effect.isCrit) {
                    tickDamage = Math.floor(tickDamage * 1.5); // Crit DoT bonus
                }

                this.health -= tickDamage;
                totalDotDamage += tickDamage;

                // Spawn status effect particles based on type
                this.spawnStatusParticles(effect.type, effect.isCrit);

                // Check for death from DoT
                if (this.health <= 0) {
                    this.die();
                    return totalDotDamage;
                }
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }

        return totalDotDamage;
    }

    /**
     * Spawn particles for status effect ticks
     */
    spawnStatusParticles(type, isCrit) {
        let color = '#ff4444'; // Default red

        switch (type) {
            case 'bleed':
                color = isCrit ? '#ff0000' : '#ff4466';
                break;
            case 'burn':
                color = isCrit ? '#ffff00' : '#ff8800';
                break;
            case 'freeze':
                color = isCrit ? '#ffffff' : '#00ffff';
                break;
            case 'electric':
                color = isCrit ? '#ffffff' : '#ffff00';
                break;
        }

        // Spawn small DoT particles
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: this.x + this.width / 2 + Utils.random(-10, 10),
                y: this.y + this.height / 2 + Utils.random(-10, 10),
                vx: Utils.random(-2, 2),
                vy: Utils.random(-3, -1),
                life: Utils.randomInt(10, 20),
                maxLife: 20,
                size: Utils.random(2, 4),
                color: color
            });
        }
    }

    /**
     * Check if enemy has a specific status effect
     */
    hasStatusEffect(type) {
        return this.statusEffects.some(e => e.type === type);
    }

    /**
     * Spawn particles on hit - DRAMATIC VERSION
     */
    spawnHitParticles(isCrit = false) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const particleCount = isCrit ? 20 : 12;
        const colors = isCrit
            ? ['#ffffff', '#ffff00', '#ff71ce', '#ffd700']
            : ['#ff71ce', '#01cdfe', '#b967ff', '#ffffff'];

        // Main burst particles
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = Utils.random(3, isCrit ? 8 : 6);
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed + Utils.random(-1, 1),
                vy: Math.sin(angle) * speed + Utils.random(-2, 0),
                life: Utils.randomInt(20, 40),
                maxLife: 40,
                size: Utils.random(isCrit ? 4 : 2, isCrit ? 10 : 6),
                color: colors[Math.floor(Math.random() * colors.length)],
                type: 'burst'
            });
        }

        // Impact ring
        this.particles.push({
            x: centerX,
            y: centerY,
            vx: 0,
            vy: 0,
            life: 15,
            maxLife: 15,
            size: isCrit ? 30 : 20,
            color: isCrit ? '#ffd700' : '#ff71ce',
            type: 'ring'
        });

        // Sparkles for crits
        if (isCrit) {
            for (let i = 0; i < 8; i++) {
                this.particles.push({
                    x: centerX + Utils.random(-20, 20),
                    y: centerY + Utils.random(-20, 20),
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-3, -1),
                    life: Utils.randomInt(30, 50),
                    maxLife: 50,
                    size: Utils.random(2, 4),
                    color: '#ffffff',
                    type: 'sparkle'
                });
            }
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

        // Status effect icons
        this.renderStatusEffects(ctx, screenPos);

        ctx.restore();
    }

    /**
     * Render drone type enemy - WITH VARIANTS
     */
    renderDrone(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;
        const colors = this.colorVariant;

        // Glow
        ctx.shadowColor = colors.main;
        ctx.shadowBlur = 15 * pulse;

        // Body - different shapes based on variant
        ctx.fillStyle = colors.main;
        ctx.beginPath();

        switch (this.variant) {
            case 0: // Diamond (original)
                ctx.moveTo(centerX, screenPos.y + 4);
                ctx.lineTo(screenPos.x + this.width - 4, centerY);
                ctx.lineTo(centerX, screenPos.y + this.height - 4);
                ctx.lineTo(screenPos.x + 4, centerY);
                break;

            case 1: // Hexagon
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    const radius = 16;
                    const px = centerX + Math.cos(angle) * radius;
                    const py = centerY + Math.sin(angle) * radius;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                break;

            case 2: // Triangle (pointing down)
                ctx.moveTo(centerX, screenPos.y + this.height - 4);
                ctx.lineTo(screenPos.x + 4, screenPos.y + 6);
                ctx.lineTo(screenPos.x + this.width - 4, screenPos.y + 6);
                break;

            case 3: // Circle with spikes
                ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
                ctx.fill();
                // Add spikes
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2 + this.pulsePhase * 0.5;
                    ctx.moveTo(centerX, centerY);
                    ctx.lineTo(
                        centerX + Math.cos(angle) * 22,
                        centerY + Math.sin(angle) * 22
                    );
                }
                ctx.strokeStyle = colors.main;
                ctx.lineWidth = 3;
                ctx.stroke();
                break;

            default:
                ctx.moveTo(centerX, screenPos.y + 4);
                ctx.lineTo(screenPos.x + this.width - 4, centerY);
                ctx.lineTo(centerX, screenPos.y + this.height - 4);
                ctx.lineTo(screenPos.x + 4, centerY);
        }
        ctx.closePath();
        ctx.fill();

        // Inner core
        ctx.fillStyle = colors.core;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.variant === 3 ? 5 : 6, 0, Math.PI * 2);
        ctx.fill();

        // Eye indicator
        const eyeOffsetX = this.facingRight ? 4 : -4;
        ctx.fillStyle = colors.accent;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX, centerY - 2, 3, 0, Math.PI * 2);
        ctx.fill();

        // Animated "antenna" lines
        ctx.strokeStyle = colors.main;
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
     * Render particles - ENHANCED VERSION
     */
    renderParticles(ctx, camera) {
        ctx.save();

        for (const p of this.particles) {
            const screenPos = camera.worldToScreen(p.x, p.y);
            const alpha = p.life / p.maxLife;
            const color = p.color || GAME_CONFIG.COLORS.MAGENTA;

            if (p.type === 'ring') {
                // Expanding impact ring
                const ringSize = p.size * (1 + (1 - alpha) * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 * alpha;
                ctx.globalAlpha = alpha * 0.8;
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, ringSize, 0, Math.PI * 2);
                ctx.stroke();
            } else if (p.type === 'sparkle') {
                // Twinkling sparkle (star shape)
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha * (0.5 + Math.sin(p.life * 0.5) * 0.5);
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                const size = p.size * (0.5 + alpha * 0.5);
                ctx.beginPath();
                for (let i = 0; i < 4; i++) {
                    const angle = (i * Math.PI / 2) + (p.life * 0.1);
                    const x = screenPos.x + Math.cos(angle) * size;
                    const y = screenPos.y + Math.sin(angle) * size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.fill();
            } else {
                // Regular burst particle
                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.shadowColor = color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, p.size * alpha, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    /**
     * Render status effect indicators above enemy
     */
    renderStatusEffects(ctx, screenPos) {
        if (this.statusEffects.length === 0) return;

        let offsetX = 0;
        for (const effect of this.statusEffects) {
            let icon = '●';
            let color = '#ffffff';

            switch (effect.type) {
                case 'bleed':
                    icon = '💧';
                    color = '#ff4466';
                    break;
                case 'burn':
                    icon = '🔥';
                    color = '#ff8800';
                    break;
                case 'freeze':
                    icon = '❄';
                    color = '#00ffff';
                    break;
                case 'electric':
                    icon = '⚡';
                    color = '#ffff00';
                    break;
            }

            ctx.font = '10px monospace';
            ctx.fillStyle = color;
            ctx.fillText(icon, screenPos.x + offsetX, screenPos.y - 15);
            offsetX += 12;
        }
    }
}
