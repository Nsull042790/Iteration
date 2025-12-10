/**
 * ITERATION - Boss Entity
 * Powerful enemies that appear after clearing regular enemies
 */

class Boss extends Entity {
    constructor(x, y, level = 1) {
        super(x, y, 80, 80);

        this.level = level;
        this.name = Boss.getNameForLevel(level);

        // Scale stats based on level
        const levelMultiplier = 1 + (level - 1) * 0.5;

        // Stats
        this.health = Math.floor(200 * levelMultiplier);
        this.maxHealth = this.health;
        this.damage = Math.floor(15 * levelMultiplier);
        this.speed = 2 + level * 0.3;
        this.cycleReward = Math.floor(200 * levelMultiplier);

        // AI State
        this.aiState = 'idle'; // idle, chase, attack, special, stunned
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.specialCooldown = 0;

        // Attack patterns
        this.currentPattern = 0;
        this.patterns = ['charge', 'slam', 'projectile'];
        this.patternTimer = 0;

        // Combat
        this.invincibilityFrames = 0;
        this.hitFlash = 0;
        this.stunTimer = 0;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.pulsePhase = 0;
        this.shakeAmount = 0;

        // Visual effects
        this.particles = [];
        this.chargeTrail = [];

        // Projectiles (for ranged attacks)
        this.projectiles = [];

        // Entry animation
        this.isEntering = true;
        this.entryTimer = 120;
    }

    static getNameForLevel(level) {
        const names = [
            'GUARDIAN ALPHA',
            'SENTINEL PRIME',
            'EXECUTOR OMEGA',
            'THE ARCHITECT'
        ];
        return names[Math.min(level - 1, names.length - 1)];
    }

    /**
     * Update boss
     */
    update(deltaTime, player) {
        if (!this.active) return;

        // Entry animation
        if (this.isEntering) {
            this.entryTimer--;
            if (this.entryTimer <= 0) {
                this.isEntering = false;
            }
            return;
        }

        // Update timers
        if (this.invincibilityFrames > 0) this.invincibilityFrames--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.specialCooldown > 0) this.specialCooldown--;
        if (this.stunTimer > 0) this.stunTimer--;

        // Animation
        this.animTimer++;
        if (this.animTimer >= 8) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
        this.pulsePhase += 0.1;

        // Reduce shake
        if (this.shakeAmount > 0) {
            this.shakeAmount *= 0.9;
        }

        // AI behavior
        if (this.stunTimer <= 0) {
            this.updateAI(player);
        }

        // Apply friction
        this.applyFriction();

        // Update position
        this.updatePosition();

        // Update projectiles
        this.updateProjectiles(player);

        // Update particles
        this.updateParticles();
    }

    /**
     * Update AI behavior
     */
    updateAI(player) {
        if (!player || !player.active) return;

        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        this.facingRight = dx > 0;

        this.stateTimer++;

        switch (this.aiState) {
            case 'idle':
                // Brief pause between actions
                if (this.stateTimer > 30) {
                    this.chooseNextAction(distToPlayer);
                }
                break;

            case 'chase':
                // Move toward player
                this.velocityX += Math.sign(dx) * 0.3;
                this.velocityX = Utils.clamp(this.velocityX, -this.speed, this.speed);

                if (distToPlayer < 100 || this.stateTimer > 120) {
                    this.aiState = 'attack';
                    this.stateTimer = 0;
                }
                break;

            case 'attack':
                this.executeAttack(player);
                break;

            case 'special':
                this.executeSpecial(player);
                break;
        }
    }

    /**
     * Choose next action based on situation
     */
    chooseNextAction(distToPlayer) {
        // Choose attack pattern based on health and distance
        const healthPercent = this.health / this.maxHealth;

        if (healthPercent < 0.3 && this.specialCooldown <= 0) {
            // Enraged mode - more specials
            this.aiState = 'special';
            this.currentPattern = 2; // projectile
            this.specialCooldown = 180;
        } else if (distToPlayer > 200 && this.specialCooldown <= 0) {
            // Far away - use projectile
            this.aiState = 'special';
            this.currentPattern = 2;
            this.specialCooldown = 120;
        } else if (distToPlayer < 150 && this.attackCooldown <= 0) {
            // Close - use melee
            this.aiState = 'attack';
            this.currentPattern = Math.random() > 0.5 ? 0 : 1; // charge or slam
            this.attackCooldown = 60;
        } else {
            this.aiState = 'chase';
        }

        this.stateTimer = 0;
        this.patternTimer = 0;
    }

    /**
     * Execute melee attack
     */
    executeAttack(player) {
        this.patternTimer++;

        if (this.currentPattern === 0) {
            // Charge attack
            if (this.patternTimer < 30) {
                // Wind up
                this.velocityX *= 0.9;
                this.shakeAmount = 3;
            } else if (this.patternTimer < 50) {
                // Charge!
                this.velocityX = (this.facingRight ? 1 : -1) * this.speed * 3;
                this.spawnChargeParticles();
            } else {
                this.aiState = 'idle';
                this.stateTimer = 0;
            }
        } else if (this.currentPattern === 1) {
            // Ground slam
            if (this.patternTimer < 40) {
                // Jump up
                if (this.patternTimer === 1) {
                    this.velocityY = -12;
                }
            } else if (this.patternTimer === 40) {
                // Slam down
                this.velocityY = 15;
            } else if (this.patternTimer > 45 && this.isGrounded) {
                // Impact
                this.shakeAmount = 10;
                this.spawnSlamParticles();
                this.aiState = 'idle';
                this.stateTimer = 0;
            }
        }
    }

    /**
     * Execute special attack
     */
    executeSpecial(player) {
        this.patternTimer++;

        if (this.currentPattern === 2) {
            // Projectile attack
            if (this.patternTimer === 30) {
                // Fire projectile
                this.fireProjectile(player);
            }

            if (this.patternTimer > 60) {
                this.aiState = 'idle';
                this.stateTimer = 0;
            }
        }
    }

    /**
     * Fire a projectile at player
     */
    fireProjectile(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        const speed = 6;
        this.projectiles.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            size: 12,
            life: 180,
            damage: this.damage
        });
    }

    /**
     * Update projectiles
     */
    updateProjectiles(player) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            p.active = true;

            if (p.life <= 0) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Take damage
     */
    takeDamage(amount) {
        if (this.invincibilityFrames > 0 || this.isEntering) return false;

        this.health -= amount;
        this.invincibilityFrames = 15;
        this.hitFlash = 8;
        this.shakeAmount = 5;

        // Spawn hit particles
        this.spawnHitParticles();

        // Stun briefly on big hits
        if (amount >= 30) {
            this.stunTimer = 20;
            this.aiState = 'idle';
        }

        if (this.health <= 0) {
            this.die();
            return true;
        }

        return false;
    }

    /**
     * Handle death
     */
    die() {
        this.active = false;
        // Spawn death particles
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Utils.random(-6, 6),
                vy: Utils.random(-8, 2),
                life: Utils.randomInt(30, 60),
                maxLife: 60,
                size: Utils.random(4, 12)
            });
        }
    }

    /**
     * Spawn particles during charge
     */
    spawnChargeParticles() {
        for (let i = 0; i < 3; i++) {
            this.particles.push({
                x: this.x + (this.facingRight ? 0 : this.width),
                y: this.y + this.height / 2 + Utils.random(-10, 10),
                vx: (this.facingRight ? -1 : 1) * Utils.random(2, 5),
                vy: Utils.random(-1, 1),
                life: 15,
                maxLife: 15,
                size: Utils.random(3, 8)
            });
        }
    }

    /**
     * Spawn particles on ground slam
     */
    spawnSlamParticles() {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: this.x + Utils.random(0, this.width),
                y: this.y + this.height,
                vx: Utils.random(-8, 8),
                vy: Utils.random(-6, -2),
                life: Utils.randomInt(20, 40),
                maxLife: 40,
                size: Utils.random(4, 10)
            });
        }
    }

    /**
     * Spawn hit particles
     */
    spawnHitParticles() {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Utils.random(-5, 5),
                vy: Utils.random(-5, 2),
                life: Utils.randomInt(15, 30),
                maxLife: 30,
                size: Utils.random(3, 8)
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
            p.vy += 0.3;
            p.vx *= 0.95;
            p.life--;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Render boss
     */
    render(ctx, camera) {
        // Render particles (even if boss is dead)
        this.renderParticles(ctx, camera);

        // Render projectiles
        this.renderProjectiles(ctx, camera);

        if (!this.active) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        // Apply shake
        screenPos.x += (Math.random() - 0.5) * this.shakeAmount;
        screenPos.y += (Math.random() - 0.5) * this.shakeAmount;

        ctx.save();

        // Entry animation
        if (this.isEntering) {
            ctx.globalAlpha = 1 - (this.entryTimer / 120);
            const scale = 1 + (this.entryTimer / 120) * 0.5;
            ctx.translate(
                screenPos.x + this.width / 2,
                screenPos.y + this.height / 2
            );
            ctx.scale(scale, scale);
            ctx.translate(
                -(screenPos.x + this.width / 2),
                -(screenPos.y + this.height / 2)
            );
        }

        // Flash white when hit
        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0) {
            this.renderFlash(ctx, screenPos);
            ctx.restore();
            return;
        }

        this.renderBody(ctx, screenPos);

        ctx.restore();
    }

    /**
     * Render boss body
     */
    renderBody(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const pulse = Math.sin(this.pulsePhase) * 0.15 + 0.85;

        // Glow
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 25 * pulse;

        // Outer shell - hexagonal shape
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
            const radius = 35;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        const eyeOffsetX = this.facingRight ? 5 : -5;
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX, centerY - 3, 6, 0, Math.PI * 2);
        ctx.fill();

        // Inner eye
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerX + eyeOffsetX + 2, centerY - 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting elements
        ctx.strokeStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.lineWidth = 3;

        for (let i = 0; i < 4; i++) {
            const orbitAngle = this.pulsePhase + (i * Math.PI / 2);
            const orbitRadius = 45 + Math.sin(this.pulsePhase * 2) * 5;
            const ox = centerX + Math.cos(orbitAngle) * orbitRadius;
            const oy = centerY + Math.sin(orbitAngle) * orbitRadius;

            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Attack indicator
        if (this.aiState === 'attack' && this.patternTimer < 30) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5 + Math.sin(this.patternTimer * 0.5) * 0.5;

            const indicatorX = this.facingRight
                ? screenPos.x + this.width + 20
                : screenPos.x - 40;

            ctx.beginPath();
            ctx.moveTo(indicatorX, centerY - 20);
            ctx.lineTo(indicatorX + 20, centerY);
            ctx.lineTo(indicatorX, centerY + 20);
            ctx.stroke();
        }
    }

    /**
     * Render flash effect
     */
    renderFlash(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
            const radius = 35;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
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
            ctx.shadowBlur = 8;

            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render projectiles
     */
    renderProjectiles(ctx, camera) {
        ctx.save();

        for (const p of this.projectiles) {
            const screenPos = camera.worldToScreen(p.x, p.y);

            ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
            ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
