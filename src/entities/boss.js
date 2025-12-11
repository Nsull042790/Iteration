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

        // Hovering/flying behavior for free movement
        this.canHover = true;
        this.isHovering = false;
        this.hoverTimer = 0;
        this.hoverTargetY = 0;
        this.hoverCooldown = 0;
        this.stuckTimer = 0;
        this.lastX = x;
        this.lastY = y;

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

        // Visual appearance - unique per boss
        this.setupVisuals(level);
    }

    /**
     * Setup unique visual appearance based on level
     */
    setupVisuals(level) {
        // Boss visual types
        const visualTypes = [
            { // Level 1 - Guardian Alpha (Hexagon, Magenta)
                shape: 'hexagon',
                sides: 6,
                primaryColor: '#ff00aa',
                secondaryColor: '#ff66cc',
                glowColor: '#ff00aa',
                eyeCount: 1,
                orbitCount: 4,
                orbitStyle: 'circle',
                hasSpikes: false,
                coreStyle: 'circle'
            },
            { // Level 2 - Sentinel Prime (Triangle, Cyan)
                shape: 'triangle',
                sides: 3,
                primaryColor: '#00ffff',
                secondaryColor: '#88ffff',
                glowColor: '#00ffff',
                eyeCount: 3,
                orbitCount: 3,
                orbitStyle: 'triangle',
                hasSpikes: true,
                coreStyle: 'triangle'
            },
            { // Level 3 - Executor Omega (Square, Orange)
                shape: 'square',
                sides: 4,
                primaryColor: '#ff8800',
                secondaryColor: '#ffaa44',
                glowColor: '#ff8800',
                eyeCount: 2,
                orbitCount: 8,
                orbitStyle: 'square',
                hasSpikes: true,
                coreStyle: 'diamond'
            },
            { // Level 4 - The Architect (Star, White/Purple)
                shape: 'star',
                sides: 5,
                primaryColor: '#ffffff',
                secondaryColor: '#aa00ff',
                glowColor: '#aa00ff',
                eyeCount: 1,
                orbitCount: 6,
                orbitStyle: 'star',
                hasSpikes: false,
                coreStyle: 'void'
            },
            { // Level 5+ - Corrupted Core (Octagon, Red)
                shape: 'octagon',
                sides: 8,
                primaryColor: '#ff0044',
                secondaryColor: '#ff4488',
                glowColor: '#ff0044',
                eyeCount: 4,
                orbitCount: 5,
                orbitStyle: 'chaos',
                hasSpikes: true,
                coreStyle: 'eye'
            }
        ];

        // Select visual type based on level (cycle through for higher levels)
        const typeIndex = (level - 1) % visualTypes.length;
        this.visuals = visualTypes[typeIndex];

        // Add some randomness for variety
        this.visualSeed = Math.random() * 1000;
        this.rotationOffset = Math.random() * Math.PI * 2;
    }

    static getNameForLevel(level) {
        const names = [
            'GUARDIAN ALPHA',
            'SENTINEL PRIME',
            'EXECUTOR OMEGA',
            'THE ARCHITECT',
            'CORRUPTED CORE'
        ];
        return names[(level - 1) % names.length];
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

        // Update hover behavior
        this.updateHover(player);

        // Detect if stuck
        this.detectStuck();

        // Apply friction (reduced while hovering)
        if (!this.isHovering) {
            this.applyFriction();
        } else {
            this.velocityX *= 0.92; // Lighter friction while hovering
        }

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

                // If player is much higher and we can't reach, hover up
                if (dy < -100 && !this.isHovering && this.hoverCooldown <= 0 && this.stateTimer > 30) {
                    this.startHover(player.y - 50);
                }

                // Continue hovering toward player horizontally
                if (this.isHovering) {
                    this.hoverTargetY = player.y;
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
     * Update hovering behavior
     */
    updateHover(player) {
        if (!this.canHover) return;

        if (this.hoverCooldown > 0) this.hoverCooldown--;

        if (this.isHovering) {
            this.hoverTimer--;

            // Float toward target Y
            const targetDiff = this.hoverTargetY - this.y;
            this.velocityY = targetDiff * 0.08;

            // Add slight bobbing
            this.velocityY += Math.sin(this.pulsePhase * 2) * 0.3;

            // Disable gravity while hovering
            this.velocityY = Utils.clamp(this.velocityY, -6, 6);

            // End hover
            if (this.hoverTimer <= 0) {
                this.isHovering = false;
                this.hoverCooldown = 180; // 3 second cooldown
            }
        }
    }

    /**
     * Detect if boss is stuck and initiate hover
     */
    detectStuck() {
        const moved = Math.abs(this.x - this.lastX) + Math.abs(this.y - this.lastY);

        if (moved < 2 && !this.isHovering && !this.isEntering) {
            this.stuckTimer++;

            // If stuck for too long, start hovering to break free
            if (this.stuckTimer > 60 && this.hoverCooldown <= 0) {
                this.startHover();
            }
        } else {
            this.stuckTimer = 0;
        }

        this.lastX = this.x;
        this.lastY = this.y;
    }

    /**
     * Start hovering toward player
     */
    startHover(targetY = null) {
        this.isHovering = true;
        this.hoverTimer = 120; // 2 seconds of hover
        this.hoverTargetY = targetY !== null ? targetY : this.y - 150;
        this.velocityY = -8; // Initial lift
        this.stuckTimer = 0;
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

        // Only stun on massive hits (50+ damage) - rare/special attacks only
        if (amount >= 50) {
            this.stunTimer = 15;
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
        const v = this.visuals;

        // Glow
        ctx.shadowColor = v.glowColor;
        ctx.shadowBlur = 25 * pulse;

        // Render spikes if applicable
        if (v.hasSpikes) {
            this.renderSpikes(ctx, centerX, centerY, v);
        }

        // Render main body shape
        this.renderShape(ctx, centerX, centerY, v, pulse);

        // Render core
        this.renderCore(ctx, centerX, centerY, v, pulse);

        // Render eyes
        this.renderEyes(ctx, centerX, centerY, v);

        // Render orbiting elements
        this.renderOrbits(ctx, centerX, centerY, v);

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
     * Render the main body shape
     */
    renderShape(ctx, centerX, centerY, v, pulse) {
        ctx.fillStyle = v.primaryColor;

        if (v.shape === 'star') {
            // 5-pointed star
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI * 2) / 10 - Math.PI / 2 + this.rotationOffset;
                const radius = i % 2 === 0 ? 38 : 18;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            // Regular polygon
            ctx.beginPath();
            for (let i = 0; i < v.sides; i++) {
                const angle = (i * Math.PI * 2) / v.sides - Math.PI / 2 + this.rotationOffset;
                const radius = 35;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // Inner border
        ctx.strokeStyle = v.secondaryColor;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    /**
     * Render spikes around the body
     */
    renderSpikes(ctx, centerX, centerY, v) {
        ctx.fillStyle = v.secondaryColor;
        ctx.shadowColor = v.glowColor;
        ctx.shadowBlur = 10;

        const spikeCount = v.sides * 2;
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i * Math.PI * 2) / spikeCount + this.pulsePhase * 0.3 + this.rotationOffset;
            const baseRadius = 38;
            const spikeLength = 12 + Math.sin(this.pulsePhase * 2 + i) * 4;

            ctx.beginPath();
            const base1 = angle - 0.15;
            const base2 = angle + 0.15;

            ctx.moveTo(
                centerX + Math.cos(base1) * baseRadius,
                centerY + Math.sin(base1) * baseRadius
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * (baseRadius + spikeLength),
                centerY + Math.sin(angle) * (baseRadius + spikeLength)
            );
            ctx.lineTo(
                centerX + Math.cos(base2) * baseRadius,
                centerY + Math.sin(base2) * baseRadius
            );
            ctx.closePath();
            ctx.fill();
        }
    }

    /**
     * Render the core based on style
     */
    renderCore(ctx, centerX, centerY, v, pulse) {
        ctx.shadowBlur = 30;

        switch (v.coreStyle) {
            case 'circle':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'triangle':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                for (let i = 0; i < 3; i++) {
                    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
                    const px = centerX + Math.cos(angle) * 12;
                    const py = centerY + Math.sin(angle) * 12;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                break;

            case 'diamond':
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(centerX, centerY - 15);
                ctx.lineTo(centerX + 12, centerY);
                ctx.lineTo(centerX, centerY + 15);
                ctx.lineTo(centerX - 12, centerY);
                ctx.closePath();
                ctx.fill();
                break;

            case 'void':
                // Dark core with pulsing ring
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = v.secondaryColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(centerX, centerY, 15 + pulse * 5, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'eye':
                // Large central eye
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.ellipse(centerX, centerY, 18, 12, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = v.primaryColor;
                ctx.beginPath();
                ctx.arc(centerX + (this.facingRight ? 4 : -4), centerY, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(centerX + (this.facingRight ? 6 : -2), centerY - 2, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    /**
     * Render eyes based on count
     */
    renderEyes(ctx, centerX, centerY, v) {
        if (v.coreStyle === 'eye' || v.coreStyle === 'void') return; // These have special cores

        const eyeOffsetX = this.facingRight ? 5 : -5;
        ctx.shadowBlur = 10;

        if (v.eyeCount === 1) {
            // Single center eye
            ctx.fillStyle = v.primaryColor;
            ctx.beginPath();
            ctx.arc(centerX + eyeOffsetX, centerY - 3, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(centerX + eyeOffsetX + 2, centerY - 3, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (v.eyeCount === 2) {
            // Two horizontal eyes
            for (let i = -1; i <= 1; i += 2) {
                ctx.fillStyle = v.primaryColor;
                ctx.beginPath();
                ctx.arc(centerX + i * 8, centerY - 5, 5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(centerX + i * 8 + (this.facingRight ? 1 : -1), centerY - 5, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (v.eyeCount === 3) {
            // Triangle formation
            const eyePositions = [
                { x: 0, y: -8 },
                { x: -7, y: 5 },
                { x: 7, y: 5 }
            ];
            for (const pos of eyePositions) {
                ctx.fillStyle = v.primaryColor;
                ctx.beginPath();
                ctx.arc(centerX + pos.x, centerY + pos.y, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(centerX + pos.x + (this.facingRight ? 1 : -1), centerY + pos.y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (v.eyeCount === 4) {
            // Four corners
            const eyePositions = [
                { x: -6, y: -6 },
                { x: 6, y: -6 },
                { x: -6, y: 6 },
                { x: 6, y: 6 }
            ];
            for (const pos of eyePositions) {
                ctx.fillStyle = v.primaryColor;
                ctx.beginPath();
                ctx.arc(centerX + pos.x, centerY + pos.y, 3.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(centerX + pos.x + (this.facingRight ? 1 : -1), centerY + pos.y, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    /**
     * Render orbiting elements
     */
    renderOrbits(ctx, centerX, centerY, v) {
        ctx.strokeStyle = v.primaryColor;
        ctx.lineWidth = 3;

        for (let i = 0; i < v.orbitCount; i++) {
            let orbitAngle, orbitRadius, ox, oy;

            switch (v.orbitStyle) {
                case 'circle':
                    orbitAngle = this.pulsePhase + (i * Math.PI * 2 / v.orbitCount);
                    orbitRadius = 45 + Math.sin(this.pulsePhase * 2) * 5;
                    ox = centerX + Math.cos(orbitAngle) * orbitRadius;
                    oy = centerY + Math.sin(orbitAngle) * orbitRadius;

                    ctx.beginPath();
                    ctx.arc(ox, oy, 5, 0, Math.PI * 2);
                    ctx.stroke();
                    break;

                case 'triangle':
                    orbitAngle = this.pulsePhase * 0.5 + (i * Math.PI * 2 / 3);
                    orbitRadius = 50;
                    ox = centerX + Math.cos(orbitAngle) * orbitRadius;
                    oy = centerY + Math.sin(orbitAngle) * orbitRadius;

                    // Triangle orbiters
                    ctx.fillStyle = v.secondaryColor;
                    ctx.beginPath();
                    for (let j = 0; j < 3; j++) {
                        const a = (j * Math.PI * 2 / 3) - Math.PI / 2 + this.pulsePhase;
                        const px = ox + Math.cos(a) * 6;
                        const py = oy + Math.sin(a) * 6;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'square':
                    orbitAngle = this.pulsePhase * 0.7 + (i * Math.PI * 2 / v.orbitCount);
                    orbitRadius = 48 + Math.sin(this.pulsePhase + i) * 8;
                    ox = centerX + Math.cos(orbitAngle) * orbitRadius;
                    oy = centerY + Math.sin(orbitAngle) * orbitRadius;

                    ctx.fillStyle = v.secondaryColor;
                    ctx.fillRect(ox - 4, oy - 4, 8, 8);
                    break;

                case 'star':
                    orbitAngle = this.pulsePhase * 0.3 + (i * Math.PI * 2 / v.orbitCount);
                    orbitRadius = 52;
                    ox = centerX + Math.cos(orbitAngle) * orbitRadius;
                    oy = centerY + Math.sin(orbitAngle) * orbitRadius;

                    // Small stars
                    ctx.fillStyle = v.secondaryColor;
                    ctx.beginPath();
                    for (let j = 0; j < 4; j++) {
                        const a = (j * Math.PI / 2) + this.pulsePhase * 2;
                        const r = j % 2 === 0 ? 6 : 3;
                        const px = ox + Math.cos(a) * r;
                        const py = oy + Math.sin(a) * r;
                        if (j === 0) ctx.moveTo(px, py);
                        else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    break;

                case 'chaos':
                    // Erratic orbits
                    const seed = this.visualSeed + i * 100;
                    orbitAngle = this.pulsePhase * (1 + Math.sin(seed) * 0.5) + (i * Math.PI * 2 / v.orbitCount);
                    orbitRadius = 45 + Math.sin(this.pulsePhase * 3 + seed) * 15;
                    ox = centerX + Math.cos(orbitAngle) * orbitRadius;
                    oy = centerY + Math.sin(orbitAngle) * orbitRadius;

                    ctx.fillStyle = i % 2 === 0 ? v.primaryColor : v.secondaryColor;
                    ctx.beginPath();
                    ctx.arc(ox, oy, 4 + Math.sin(this.pulsePhase + i) * 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
    }

    /**
     * Render flash effect
     */
    renderFlash(ctx, screenPos) {
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;
        const v = this.visuals;

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 30;

        // Use the boss's shape for flash
        if (v.shape === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const angle = (i * Math.PI * 2) / 10 - Math.PI / 2 + this.rotationOffset;
                const radius = i % 2 === 0 ? 38 : 18;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            for (let i = 0; i < v.sides; i++) {
                const angle = (i * Math.PI * 2) / v.sides - Math.PI / 2 + this.rotationOffset;
                const radius = 35;
                const px = centerX + Math.cos(angle) * radius;
                const py = centerY + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
    }

    /**
     * Render particles
     */
    renderParticles(ctx, camera) {
        ctx.save();
        const v = this.visuals;

        for (const p of this.particles) {
            const screenPos = camera.worldToScreen(p.x, p.y);
            const alpha = p.life / p.maxLife;

            ctx.fillStyle = v.primaryColor;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = v.glowColor;
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
        const v = this.visuals;

        for (const p of this.projectiles) {
            const screenPos = camera.worldToScreen(p.x, p.y);

            ctx.fillStyle = v.primaryColor;
            ctx.shadowColor = v.glowColor;
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
