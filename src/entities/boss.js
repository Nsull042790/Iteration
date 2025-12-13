/**
 * ITERATION - Boss Entity
 * WoW-inspired boss with phases, telegraphed attacks, and strategic mechanics
 */

class Boss extends Entity {
    constructor(x, y, level = 1) {
        super(x, y, 80, 80);

        this.level = level;
        this.name = Boss.getNameForLevel(level);

        // Progressive difficulty scaling (gentler early, steeper later)
        // Level 1: 1.0x, Level 2: 1.2x, Level 3: 1.5x, Level 4: 1.9x, Level 5: 2.4x
        const levelMultiplier = 1 + (level - 1) * 0.2 + Math.max(0, level - 2) * 0.1;

        // Stats - more forgiving for early levels
        this.health = Math.floor(200 * levelMultiplier);
        this.maxHealth = this.health;
        this.damage = Math.floor(8 + level * 2);
        this.speed = 2 + level * 0.3;
        this.cycleReward = Math.floor(200 * levelMultiplier);

        // Phase system (WoW-style)
        this.phase = 1; // 1, 2, or 3
        this.phaseTransitioning = false;
        this.phaseTransitionTimer = 0;
        this.phaseAnnouncement = '';

        // AI State
        this.aiState = 'idle';
        this.stateTimer = 0;
        this.attackCooldown = 0;
        this.globalCooldown = 0; // GCD between actions

        // Movement - much more aggressive
        this.moveTarget = { x: x, y: y };
        this.dashSpeed = 12;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.teleportCooldown = 0;

        // Hovering - always available
        this.isHovering = false;
        this.hoverHeight = 0;
        this.targetHoverHeight = 0;

        // Attack patterns per phase
        this.currentAttack = null;
        this.attackTimer = 0;
        this.comboCount = 0;
        this.maxCombo = 2 + level;

        // Danger zones (telegraphed attacks)
        this.dangerZones = [];

        // Adds/minions
        this.adds = [];
        this.addSpawnCooldown = 0;

        // Combat
        this.invincibilityFrames = 0;
        this.hitFlash = 0;

        // Enrage timer (soft enrage - gets faster over time)
        this.fightTimer = 0;
        this.enraged = false;

        // Animation
        this.pulsePhase = 0;
        this.rotationSpeed = 0.02;
        this.shakeAmount = 0;

        // Visual effects
        this.particles = [];
        this.projectiles = [];

        // Status effects (DoT)
        this.statusEffects = [];

        // Entry animation
        this.isEntering = true;
        this.entryTimer = 90;

        // Visual appearance
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
            this.pulsePhase += 0.15;
            if (this.entryTimer <= 0) {
                this.isEntering = false;
                this.phaseAnnouncement = 'PHASE 1: ENGAGEMENT';
            }
            return;
        }

        // Update timers
        this.fightTimer++;
        if (this.invincibilityFrames > 0) this.invincibilityFrames--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.globalCooldown > 0) this.globalCooldown--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.teleportCooldown > 0) this.teleportCooldown--;
        if (this.addSpawnCooldown > 0) this.addSpawnCooldown--;
        this.stateTimer++;

        // Soft enrage after 30 seconds
        if (this.fightTimer > 1800 && !this.enraged) {
            this.enraged = true;
            this.speed *= 1.3;
            this.phaseAnnouncement = 'ENRAGE!';
        }

        // Animation
        this.pulsePhase += 0.1 + (this.phase * 0.02);
        this.rotationOffset += this.rotationSpeed * this.phase;

        // Reduce shake
        if (this.shakeAmount > 0) this.shakeAmount *= 0.9;

        // Phase transitions
        this.checkPhaseTransition();

        // Phase transition animation
        if (this.phaseTransitioning) {
            this.phaseTransitionTimer--;
            this.shakeAmount = 5;
            if (this.phaseTransitionTimer <= 0) {
                this.phaseTransitioning = false;
            }
            return;
        }

        // AI behavior based on phase
        this.updatePhaseAI(player);

        // Update movement
        this.updateMovement(player);

        // Update danger zones
        this.updateDangerZones();

        // Update projectiles
        this.updateProjectiles(player);

        // Update adds
        this.updateAdds(player);

        // Update particles
        this.updateParticles();

        // Update status effects (DoT)
        this.updateStatusEffects();
    }

    /**
     * Check and handle phase transitions
     */
    checkPhaseTransition() {
        const healthPercent = this.health / this.maxHealth;

        if (this.phase === 1 && healthPercent <= 0.7) {
            this.enterPhase(2);
        } else if (this.phase === 2 && healthPercent <= 0.35) {
            this.enterPhase(3);
        }
    }

    /**
     * Enter a new phase
     */
    enterPhase(newPhase) {
        this.phase = newPhase;
        this.phaseTransitioning = true;
        this.phaseTransitionTimer = 60;
        this.currentAttack = null;
        this.attackTimer = 0;
        this.comboCount = 0;

        // Clear danger zones on phase change
        this.dangerZones = [];

        // Phase-specific setup
        switch (newPhase) {
            case 2:
                this.phaseAnnouncement = 'PHASE 2: ASSAULT';
                this.speed *= 1.2;
                this.maxCombo += 1;
                // Spawn particles burst
                this.spawnPhaseBurst();
                break;
            case 3:
                this.phaseAnnouncement = 'PHASE 3: DESPERATION';
                this.speed *= 1.2;
                this.maxCombo += 2;
                this.spawnPhaseBurst();
                break;
        }
    }

    /**
     * Spawn particle burst on phase change
     */
    spawnPhaseBurst() {
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            this.particles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * Utils.random(5, 10),
                vy: Math.sin(angle) * Utils.random(5, 10),
                life: Utils.randomInt(30, 50),
                maxLife: 50,
                size: Utils.random(4, 10)
            });
        }
    }

    /**
     * Update AI based on current phase
     */
    updatePhaseAI(player) {
        if (!player || !player.active) return;

        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);

        this.facingRight = dx > 0;

        // Execute current attack if one is active
        if (this.currentAttack) {
            this.executeCurrentAttack(player, dx, dy, distToPlayer);
            return;
        }

        // Global cooldown check
        if (this.globalCooldown > 0) {
            // Still move aggressively while on GCD
            this.aggressiveMovement(player, dx, dy, distToPlayer);
            return;
        }

        // Choose next attack based on phase
        this.choosePhaseAttack(player, dx, dy, distToPlayer);
    }

    /**
     * Aggressive movement - always moving toward player
     */
    aggressiveMovement(player, dx, dy, distToPlayer) {
        const speedMod = this.enraged ? 1.5 : 1;

        // Always move toward player
        if (distToPlayer > 80) {
            this.velocityX += Math.sign(dx) * 0.6 * speedMod;
        } else if (distToPlayer < 50) {
            // Too close - back up slightly or circle
            this.velocityX += (Math.random() > 0.5 ? 1 : -1) * 0.4;
        }

        // Clamp velocity
        this.velocityX = Utils.clamp(this.velocityX, -this.speed * speedMod, this.speed * speedMod);

        // Jump toward player if they're above
        if (dy < -80 && this.isGrounded) {
            this.velocityY = -14;
        }

        // Random jumps for mobility
        if (this.isGrounded && Math.random() < 0.03 * this.phase) {
            this.velocityY = -10 - this.phase * 2;
        }
    }

    /**
     * Choose attack based on current phase
     */
    choosePhaseAttack(player, dx, dy, distToPlayer) {
        const attacks = this.getPhaseAttacks();
        const weights = this.getAttackWeights(distToPlayer);

        // Weighted random selection
        let totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < attacks.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                this.startAttack(attacks[i], player);
                return;
            }
        }

        // Fallback - aggressive movement
        this.aggressiveMovement(player, dx, dy, distToPlayer);
    }

    /**
     * Get available attacks for current phase
     */
    getPhaseAttacks() {
        const baseAttacks = ['dash', 'slam', 'projectile'];

        if (this.phase >= 2) {
            baseAttacks.push('teleport_strike', 'barrage');
        }

        if (this.phase >= 3) {
            baseAttacks.push('ground_aoe', 'summon_adds');
        }

        return baseAttacks;
    }

    /**
     * Get weights for attack selection based on distance
     */
    getAttackWeights(distToPlayer) {
        const isClose = distToPlayer < 150;
        const isFar = distToPlayer > 300;

        if (this.phase === 1) {
            return isClose ? [3, 3, 1] : [2, 1, 3];
        } else if (this.phase === 2) {
            return isClose ? [2, 3, 1, 2, 1] : [2, 1, 2, 3, 2];
        } else {
            return isClose ? [2, 3, 1, 2, 1, 2, 1] : [2, 1, 2, 3, 2, 2, 1];
        }
    }

    /**
     * Start a specific attack
     */
    startAttack(attackType, player) {
        this.currentAttack = attackType;
        this.attackTimer = 0;
        this.comboCount++;

        // Set GCD based on attack
        const gcdTimes = {
            'dash': 30,
            'slam': 45,
            'projectile': 35,
            'teleport_strike': 40,
            'barrage': 60,
            'ground_aoe': 70,
            'summon_adds': 90
        };

        this.globalCooldown = (gcdTimes[attackType] || 30) / (this.enraged ? 1.5 : 1);
    }

    /**
     * Execute the current attack
     */
    executeCurrentAttack(player, dx, dy, distToPlayer) {
        this.attackTimer++;

        switch (this.currentAttack) {
            case 'dash':
                this.executeDash(player, dx, dy);
                break;
            case 'slam':
                this.executeSlam(player, dx, dy);
                break;
            case 'projectile':
                this.executeProjectile(player);
                break;
            case 'teleport_strike':
                this.executeTeleportStrike(player, dx, dy);
                break;
            case 'barrage':
                this.executeBarrage(player);
                break;
            case 'ground_aoe':
                this.executeGroundAOE(player);
                break;
            case 'summon_adds':
                this.executeSummonAdds(player);
                break;
        }
    }

    /**
     * Dash attack - fast charge toward player
     */
    executeDash(player, dx, dy) {
        if (this.attackTimer < 15) {
            // Telegraph - shake and slow down
            this.shakeAmount = 3;
            this.velocityX *= 0.8;
            // Create danger zone in front
            if (this.attackTimer === 1) {
                this.createDangerZone(
                    this.x + (this.facingRight ? this.width : -200),
                    this.y,
                    200, this.height,
                    45, 'line'  // Extended warning time (was 15)
                );
            }
        } else if (this.attackTimer < 40) {
            // DASH!
            this.velocityX = (this.facingRight ? 1 : -1) * this.dashSpeed;
            this.spawnDashParticles();
        } else {
            this.endAttack();
        }
    }

    /**
     * Slam attack - jump and slam down
     */
    executeSlam(player, dx, dy) {
        if (this.attackTimer === 1) {
            // Jump toward player
            this.velocityY = -16;
            this.velocityX = Math.sign(dx) * 6;
        } else if (this.attackTimer < 30) {
            // Track player in air
            this.velocityX += Math.sign(dx) * 0.2;
            this.velocityX = Utils.clamp(this.velocityX, -8, 8);

            // Create landing zone telegraph
            if (this.attackTimer === 10 && !this.isGrounded) {
                const landX = this.x + this.velocityX * 20;
                this.createDangerZone(landX - 50, this.y + this.height, 180, 40, 60, 'circle');  // Extended warning (was 25)
            }
        } else if (this.attackTimer === 30 && !this.isGrounded) {
            // Slam down
            this.velocityY = 20;
        } else if (this.attackTimer > 30 && this.isGrounded) {
            // Impact
            this.shakeAmount = 12;
            this.spawnSlamParticles();
            this.endAttack();
        } else if (this.attackTimer > 60) {
            this.endAttack();
        }
    }

    /**
     * Projectile attack - fire homing projectiles
     */
    executeProjectile(player) {
        const fireFrames = this.phase === 1 ? [20] : this.phase === 2 ? [15, 30] : [10, 20, 30];

        if (fireFrames.includes(this.attackTimer)) {
            this.fireProjectile(player);
        }

        if (this.attackTimer > 45) {
            this.endAttack();
        }
    }

    /**
     * Teleport strike - appear behind player and attack
     */
    executeTeleportStrike(player, dx, dy) {
        if (this.attackTimer < 20) {
            // Telegraph - fade out
            this.shakeAmount = 2;
        } else if (this.attackTimer === 20) {
            // Teleport behind player
            const behindX = player.x + (this.facingRight ? -100 : 100);
            this.x = Utils.clamp(behindX, 50, 1800);
            this.y = player.y;
            this.facingRight = !this.facingRight;
            this.spawnPhaseBurst();
        } else if (this.attackTimer < 35) {
            // Strike!
            this.velocityX = (this.facingRight ? 1 : -1) * this.dashSpeed * 0.8;
            this.spawnDashParticles();
        } else {
            this.endAttack();
        }
    }

    /**
     * Barrage - fire multiple projectiles in spread
     */
    executeBarrage(player) {
        if (this.attackTimer % 8 === 0 && this.attackTimer < 50) {
            const spread = this.phase === 2 ? 3 : 5;
            this.fireSpreadProjectiles(player, spread);
        }

        if (this.attackTimer > 60) {
            this.endAttack();
        }
    }

    /**
     * Ground AOE - create danger zones on ground
     */
    executeGroundAOE(player) {
        if (this.attackTimer === 10) {
            // Create multiple danger zones
            const count = 3 + this.phase;
            for (let i = 0; i < count; i++) {
                const zoneX = Utils.random(100, 1700);
                this.createDangerZone(zoneX, 500, 120, 100, 90, 'circle');  // Extended warning (was 50)
            }
        }

        if (this.attackTimer > 70) {
            this.endAttack();
        }
    }

    /**
     * Summon adds - spawn helper enemies
     */
    executeSummonAdds(player) {
        if (this.attackTimer === 30 && this.adds.length < 3) {
            const addCount = Math.min(2, 3 - this.adds.length);
            for (let i = 0; i < addCount; i++) {
                const spawnX = this.x + (Math.random() > 0.5 ? 150 : -150);
                this.adds.push({
                    x: spawnX,
                    y: this.y,
                    health: 30,
                    active: true
                });
            }
            this.phaseAnnouncement = 'ADDS SPAWNED!';
        }

        if (this.attackTimer > 60) {
            this.endAttack();
        }
    }

    /**
     * End current attack
     */
    endAttack() {
        this.currentAttack = null;
        this.attackTimer = 0;

        // Chain into combo if not at max
        if (this.comboCount < this.maxCombo && Math.random() < 0.4 * this.phase) {
            this.globalCooldown = 10; // Short GCD for combo
        } else {
            this.comboCount = 0;
        }
    }

    /**
     * Update movement
     */
    updateMovement(player) {
        // Apply friction
        if (this.isGrounded) {
            this.velocityX *= 0.85;
        } else {
            this.velocityX *= 0.95;
        }

        // Update position
        this.updatePosition();
    }

    /**
     * Create a danger zone (telegraph)
     */
    createDangerZone(x, y, width, height, duration, type = 'rect') {
        this.dangerZones.push({
            x, y, width, height,
            duration,
            maxDuration: duration,
            type,
            active: true
        });
    }

    /**
     * Update danger zones
     */
    updateDangerZones() {
        for (let i = this.dangerZones.length - 1; i >= 0; i--) {
            const zone = this.dangerZones[i];
            zone.duration--;

            if (zone.duration <= 0) {
                this.dangerZones.splice(i, 1);
            }
        }
    }

    /**
     * Update adds
     */
    updateAdds(player) {
        for (let i = this.adds.length - 1; i >= 0; i--) {
            const add = this.adds[i];
            if (!add.active) {
                this.adds.splice(i, 1);
                continue;
            }

            // Simple chase AI for adds
            if (player && player.active) {
                const dx = player.x - add.x;
                add.x += Math.sign(dx) * 2;
            }
        }
    }

    /**
     * Fire projectile at player
     */
    fireProjectile(player) {
        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const speed = 7 + this.phase;
        this.projectiles.push({
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
            vx: (dx / dist) * speed,
            vy: (dy / dist) * speed,
            size: 10 + this.phase * 2,
            life: 180,
            damage: this.damage,
            type: 'normal'
        });
    }

    /**
     * Fire spread of projectiles
     */
    fireSpreadProjectiles(player, count) {
        const baseDx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const baseDy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const baseAngle = Math.atan2(baseDy, baseDx);
        const spreadAngle = Math.PI / 6;

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (i - Math.floor(count / 2)) * (spreadAngle / count);
            const speed = 6;

            this.projectiles.push({
                x: this.x + this.width / 2,
                y: this.y + this.height / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8,
                life: 150,
                damage: this.damage * 0.7,
                type: 'spread'
            });
        }
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
     * Spawn dash particles
     */
    spawnDashParticles() {
        for (let i = 0; i < 2; i++) {
            this.particles.push({
                x: this.x + (this.facingRight ? 0 : this.width),
                y: this.y + this.height / 2 + Utils.random(-15, 15),
                vx: (this.facingRight ? -1 : 1) * Utils.random(3, 6),
                vy: Utils.random(-1, 1),
                life: 12,
                maxLife: 12,
                size: Utils.random(4, 8)
            });
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
            existing.isCrit = existing.isCrit || isCrit;
            return;
        }

        this.statusEffects.push({
            type: type,
            damage: damage,
            duration: duration,
            maxDuration: duration,
            tickRate: 30, // Damage every 30 frames
            tickTimer: 0,
            isCrit: isCrit
        });
    }

    /**
     * Update and process status effects
     */
    updateStatusEffects() {
        if (!this.active || this.isEntering) return;

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
                    tickDamage = Math.floor(tickDamage * 1.5);
                }

                this.health -= tickDamage;

                // Spawn status effect particles
                this.spawnStatusParticles(effect.type, effect.isCrit);

                // Check for death from DoT
                if (this.health <= 0) {
                    this.die();
                    return;
                }
            }

            // Remove expired effects
            if (effect.duration <= 0) {
                this.statusEffects.splice(i, 1);
            }
        }
    }

    /**
     * Spawn particles for status effect ticks
     */
    spawnStatusParticles(type, isCrit) {
        let color = '#ff4444';

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

        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.x + this.width / 2 + Utils.random(-20, 20),
                y: this.y + this.height / 2 + Utils.random(-20, 20),
                vx: Utils.random(-3, 3),
                vy: Utils.random(-4, -1),
                life: Utils.randomInt(15, 25),
                maxLife: 25,
                size: Utils.random(3, 6),
                color: color
            });
        }
    }

    /**
     * Check if boss has a specific status effect
     */
    hasStatusEffect(type) {
        return this.statusEffects.some(e => e.type === type);
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
        // Render danger zones first (behind everything)
        this.renderDangerZones(ctx, camera);

        // Render particles (even if boss is dead)
        this.renderParticles(ctx, camera);

        // Render projectiles
        this.renderProjectiles(ctx, camera);

        // Render adds
        this.renderAdds(ctx, camera);

        if (!this.active) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        // Apply shake
        screenPos.x += (Math.random() - 0.5) * this.shakeAmount;
        screenPos.y += (Math.random() - 0.5) * this.shakeAmount;

        ctx.save();

        // Entry animation
        if (this.isEntering) {
            ctx.globalAlpha = 1 - (this.entryTimer / 90);
            const scale = 1 + (this.entryTimer / 90) * 0.5;
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

        // Phase transition effect
        if (this.phaseTransitioning) {
            const transitionPulse = Math.sin(this.phaseTransitionTimer * 0.3) * 0.3 + 0.7;
            ctx.globalAlpha = transitionPulse;
        }

        // Teleport fade effect
        if (this.currentAttack === 'teleport_strike' && this.attackTimer < 20) {
            ctx.globalAlpha = 1 - (this.attackTimer / 20);
        }

        // Flash white when hit
        if (this.hitFlash > 0 && Math.floor(this.hitFlash / 2) % 2 === 0) {
            this.renderFlash(ctx, screenPos);
            ctx.restore();
            return;
        }

        this.renderBody(ctx, screenPos);

        ctx.restore();

        // Render phase announcement
        this.renderPhaseAnnouncement(ctx, camera);
    }

    /**
     * Render danger zones (telegraphs)
     */
    renderDangerZones(ctx, camera) {
        ctx.save();

        for (const zone of this.dangerZones) {
            const screenPos = camera.worldToScreen(zone.x, zone.y);
            const progress = 1 - (zone.duration / zone.maxDuration);

            // Flashing warning
            const flash = Math.sin(progress * Math.PI * 8) * 0.3 + 0.5;

            ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + flash * 0.3})`;
            ctx.strokeStyle = `rgba(255, 50, 50, ${0.5 + flash * 0.5})`;
            ctx.lineWidth = 2;

            if (zone.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(
                    screenPos.x + zone.width / 2,
                    screenPos.y + zone.height / 2,
                    zone.width / 2, zone.height / 2,
                    0, 0, Math.PI * 2
                );
                ctx.fill();
                ctx.stroke();
            } else {
                ctx.fillRect(screenPos.x, screenPos.y, zone.width, zone.height);
                ctx.strokeRect(screenPos.x, screenPos.y, zone.width, zone.height);
            }

            // Inner warning pattern
            ctx.strokeStyle = `rgba(255, 255, 0, ${flash * 0.5})`;
            ctx.setLineDash([5, 5]);
            if (zone.type === 'circle') {
                ctx.beginPath();
                ctx.ellipse(
                    screenPos.x + zone.width / 2,
                    screenPos.y + zone.height / 2,
                    zone.width / 3, zone.height / 3,
                    0, 0, Math.PI * 2
                );
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    /**
     * Render adds
     */
    renderAdds(ctx, camera) {
        ctx.save();

        for (const add of this.adds) {
            if (!add.active) continue;

            const screenPos = camera.worldToScreen(add.x, add.y);
            const v = this.visuals;

            // Small version of boss
            ctx.fillStyle = v.primaryColor;
            ctx.shadowColor = v.glowColor;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.8;

            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render phase announcement
     */
    renderPhaseAnnouncement(ctx, camera) {
        if (!this.phaseAnnouncement) return;

        // Show for 2 seconds then fade
        const showTime = 120;
        if (this.phaseTransitionTimer > 0 || this.entryTimer > 0) {
            ctx.save();

            const centerX = camera.width / 2;
            const centerY = 150;

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(centerX - 200, centerY - 30, 400, 60);

            // Text
            ctx.font = 'bold 28px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow
            ctx.shadowColor = this.visuals.glowColor;
            ctx.shadowBlur = 20;
            ctx.fillStyle = this.visuals.primaryColor;
            ctx.fillText(this.phaseAnnouncement, centerX, centerY);

            // Border
            ctx.strokeStyle = this.visuals.primaryColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - 200, centerY - 30, 400, 60);

            ctx.restore();
        } else {
            this.phaseAnnouncement = '';
        }
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

            // Use custom color if set, otherwise boss color
            const color = p.color || v.primaryColor;
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = p.color || v.glowColor;
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
