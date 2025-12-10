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
        this.aiState = 'idle'; // idle, chase, attack, special, stunned, reposition
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.specialCooldown = 0;
        this.repositionCooldown = 0;

        // Attack patterns
        this.currentPattern = 0;
        this.patterns = ['charge', 'slam', 'projectile', 'leap'];
        this.patternTimer = 0;

        // Movement behavior
        this.moveDirection = 1;
        this.strafeTimer = 0;
        this.jumpCooldown = 0;
        this.aggressionLevel = 1 + level * 0.2; // Increases with level

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
        if (this.repositionCooldown > 0) this.repositionCooldown--;
        if (this.jumpCooldown > 0) this.jumpCooldown--;
        this.strafeTimer++;

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
        const healthPercent = this.health / this.maxHealth;

        this.facingRight = dx > 0;
        this.stateTimer++;

        // Random jumps while moving (more frequent at low health)
        if (this.isGrounded && this.jumpCooldown <= 0 && Math.random() < 0.02 * this.aggressionLevel) {
            this.velocityY = -10;
            this.jumpCooldown = 60;
        }

        switch (this.aiState) {
            case 'idle':
                // Shorter idle at low health
                const idleTime = healthPercent < 0.5 ? 15 : 25;
                if (this.stateTimer > idleTime) {
                    this.chooseNextAction(distToPlayer, healthPercent);
                }
                // Still move while idle (strafe)
                this.applyStrafing(dx, distToPlayer);
                break;

            case 'chase':
                // Aggressive chase with acceleration
                const chaseAccel = 0.4 * this.aggressionLevel;
                this.velocityX += Math.sign(dx) * chaseAccel;
                this.velocityX = Utils.clamp(this.velocityX, -this.speed * 1.5, this.speed * 1.5);

                // Jump to reach player if they're above
                if (dy < -50 && this.isGrounded && this.jumpCooldown <= 0) {
                    this.velocityY = -12;
                    this.jumpCooldown = 30;
                }

                if (distToPlayer < 120 || this.stateTimer > 90) {
                    this.aiState = 'attack';
                    this.stateTimer = 0;
                }
                break;

            case 'reposition':
                // Move away from player then attack
                const retreatDir = dx > 0 ? -1 : 1;
                this.velocityX += retreatDir * 0.5;
                this.velocityX = Utils.clamp(this.velocityX, -this.speed * 1.2, this.speed * 1.2);

                // Jump while repositioning
                if (this.isGrounded && Math.random() < 0.05) {
                    this.velocityY = -8;
                }

                if (this.stateTimer > 40 || distToPlayer > 300) {
                    this.aiState = 'attack';
                    this.currentPattern = 2; // Projectile after reposition
                    this.stateTimer = 0;
                    this.patternTimer = 0;
                }
                break;

            case 'attack':
                this.executeAttack(player, dx, dy);
                break;

            case 'special':
                this.executeSpecial(player);
                break;
        }
    }

    /**
     * Apply strafing movement
     */
    applyStrafing(dx, distToPlayer) {
        // Change strafe direction periodically
        if (this.strafeTimer > 60) {
            this.moveDirection *= -1;
            this.strafeTimer = 0;
        }

        // Strafe perpendicular to player
        if (distToPlayer < 250 && distToPlayer > 80) {
            this.velocityX += this.moveDirection * 0.2;
            this.velocityX = Utils.clamp(this.velocityX, -this.speed * 0.8, this.speed * 0.8);
        }
    }

    /**
     * Choose next action based on situation
     */
    chooseNextAction(distToPlayer, healthPercent) {
        // More aggressive at low health
        const enraged = healthPercent < 0.3;
        const cooldownReduction = enraged ? 0.5 : 1;

        // Random reposition to keep player on their toes
        if (this.repositionCooldown <= 0 && Math.random() < 0.15) {
            this.aiState = 'reposition';
            this.repositionCooldown = 120;
            this.stateTimer = 0;
            return;
        }

        if (enraged && this.specialCooldown <= 0) {
            // Enraged mode - rapid attacks
            const rand = Math.random();
            if (rand < 0.4) {
                this.aiState = 'attack';
                this.currentPattern = 3; // leap attack
                this.attackCooldown = 30 * cooldownReduction;
            } else {
                this.aiState = 'special';
                this.currentPattern = 2; // projectile
                this.specialCooldown = 90 * cooldownReduction;
            }
        } else if (distToPlayer > 250 && this.specialCooldown <= 0) {
            // Far away - leap or projectile
            this.aiState = Math.random() > 0.5 ? 'attack' : 'special';
            this.currentPattern = this.aiState === 'attack' ? 3 : 2;
            this.specialCooldown = 100;
        } else if (distToPlayer < 180 && this.attackCooldown <= 0) {
            // Close - varied melee attacks
            this.aiState = 'attack';
            const rand = Math.random();
            if (rand < 0.35) {
                this.currentPattern = 0; // charge
            } else if (rand < 0.7) {
                this.currentPattern = 1; // slam
            } else {
                this.currentPattern = 3; // leap
            }
            this.attackCooldown = 45 * cooldownReduction;
        } else {
            this.aiState = 'chase';
        }

        this.stateTimer = 0;
        this.patternTimer = 0;
    }

    /**
     * Execute melee attack
     */
    executeAttack(player, dx, dy) {
        this.patternTimer++;

        if (this.currentPattern === 0) {
            // Charge attack
            if (this.patternTimer < 20) {
                // Wind up (shorter)
                this.velocityX *= 0.9;
                this.shakeAmount = 3;
            } else if (this.patternTimer < 45) {
                // Charge! (faster)
                this.velocityX = (this.facingRight ? 1 : -1) * this.speed * 3.5;
                this.spawnChargeParticles();
            } else {
                this.aiState = 'idle';
                this.stateTimer = 0;
            }
        } else if (this.currentPattern === 1) {
            // Ground slam
            if (this.patternTimer < 25) {
                // Jump up (faster)
                if (this.patternTimer === 1) {
                    this.velocityY = -14;
                }
                // Track player horizontally during jump
                if (dx) {
                    this.velocityX += Math.sign(dx) * 0.3;
                    this.velocityX = Utils.clamp(this.velocityX, -this.speed, this.speed);
                }
            } else if (this.patternTimer === 25) {
                // Slam down
                this.velocityY = 18;
            } else if (this.patternTimer > 30 && this.isGrounded) {
                // Impact
                this.shakeAmount = 10;
                this.spawnSlamParticles();
                this.aiState = 'idle';
                this.stateTimer = 0;
            }
        } else if (this.currentPattern === 3) {
            // Leap attack - jump toward player
            if (this.patternTimer === 1) {
                // Calculate jump trajectory toward player
                const jumpPower = -15;
                const horizontalPower = Math.sign(dx || 1) * Math.min(Math.abs(dx) * 0.03, this.speed * 2);
                this.velocityY = jumpPower;
                this.velocityX = horizontalPower;
            } else if (this.patternTimer < 60) {
                // In air - spawn particles
                if (this.patternTimer % 5 === 0) {
                    this.spawnChargeParticles();
                }
                // Slam down when above or past player
                if (this.patternTimer > 20 && this.velocityY > 0) {
                    this.velocityY = Math.max(this.velocityY, 12);
                }
            }

            if (this.patternTimer > 15 && this.isGrounded) {
                // Landed - create impact
                this.shakeAmount = 8;
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
