/**
 * ITERATION - Ghost System
 * Ghosts of past runs haunt future iterations
 * Death echoes that can help or hinder
 */

class GhostSystem {
    constructor() {
        // Active ghosts in current run
        this.ghosts = [];

        // Death records stored in localStorage
        this.deathRecords = this.loadDeathRecords();

        // Max ghosts per level
        this.maxGhostsPerLevel = 3;

        // Ghost types based on how you died
        this.ghostTypes = {
            enemy: {
                name: 'FALLEN ECHO',
                color: 'rgba(0, 240, 255, 0.6)',
                coreColor: '#00f0ff',
                hostile: false, // Friendly - gives buff when touched
                message: 'ECHO ABSORBED: +25 CYCLES'
            },
            boss: {
                name: 'VENGEFUL SHADE',
                color: 'rgba(255, 0, 170, 0.6)',
                coreColor: '#ff00aa',
                hostile: true, // Attacks player
                message: 'SHADE DEFEATED: +50 XP'
            },
            fall: {
                name: 'LOST SPIRIT',
                color: 'rgba(136, 0, 255, 0.6)',
                coreColor: '#8800ff',
                hostile: false,
                message: 'SPIRIT RELEASED: +15 HP'
            },
            cycles: {
                name: 'DEPLETED PHANTOM',
                color: 'rgba(255, 136, 0, 0.6)',
                coreColor: '#ff8800',
                hostile: false,
                message: 'PHANTOM RESTORED: +100 CYCLES'
            }
        };
    }

    /**
     * Load death records from localStorage
     */
    loadDeathRecords() {
        try {
            const saved = localStorage.getItem('iteration_death_records');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.warn('Failed to load death records:', e);
        }
        return [];
    }

    /**
     * Save death records to localStorage
     */
    saveDeathRecords() {
        try {
            // Keep only last 50 deaths
            const records = this.deathRecords.slice(-50);
            localStorage.setItem('iteration_death_records', JSON.stringify(records));
        } catch (e) {
            console.warn('Failed to save death records:', e);
        }
    }

    /**
     * Record a death for future ghost spawning
     */
    recordDeath(data) {
        const record = {
            level: data.level || 1,
            x: data.x || 400,
            y: data.y || 400,
            cause: data.cause || 'enemy', // enemy, boss, fall, cycles
            character: data.character || 'echo',
            weapon: data.weapon || 'striker',
            weaponTier: data.weaponTier || 0,
            timestamp: Date.now(),
            kills: data.kills || 0
        };

        this.deathRecords.push(record);
        this.saveDeathRecords();

        return record;
    }

    /**
     * Spawn ghosts for a level based on death records
     */
    spawnGhostsForLevel(level, roomWidth) {
        this.ghosts = [];

        // Find deaths that occurred on this level
        const levelDeaths = this.deathRecords.filter(d => d.level === level);

        if (levelDeaths.length === 0) return;

        // Randomly select up to maxGhostsPerLevel deaths
        const shuffled = levelDeaths.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, this.maxGhostsPerLevel);

        for (const death of selected) {
            this.spawnGhost(death, roomWidth);
        }
    }

    /**
     * Spawn a single ghost from a death record
     */
    spawnGhost(deathRecord, roomWidth) {
        const ghostType = this.ghostTypes[deathRecord.cause] || this.ghostTypes.enemy;

        const ghost = {
            x: Math.min(Math.max(deathRecord.x, 100), roomWidth - 100),
            y: Math.min(deathRecord.y, 500), // Don't spawn below ground
            width: 40,
            height: 60,
            type: deathRecord.cause,
            typeData: ghostType,
            character: deathRecord.character,
            weapon: deathRecord.weapon,
            weaponTier: deathRecord.weaponTier,
            kills: deathRecord.kills,

            // Animation
            floatOffset: Math.random() * Math.PI * 2,
            pulseOffset: Math.random() * Math.PI * 2,
            flickerTimer: 0,

            // State
            active: true,
            hostile: ghostType.hostile,
            health: ghostType.hostile ? 50 : 1, // Hostile ghosts need to be killed
            maxHealth: ghostType.hostile ? 50 : 1,
            invincibilityFrames: 0,

            // Movement for hostile ghosts
            velocityX: 0,
            velocityY: 0,
            targetX: null,
            targetY: null,
            attackCooldown: 0,
            damage: 15
        };

        this.ghosts.push(ghost);
    }

    /**
     * Get current ghost count
     */
    getGhostCount() {
        return this.ghosts.filter(g => g.active).length;
    }

    /**
     * Get total recorded deaths
     */
    getTotalDeaths() {
        return this.deathRecords.length;
    }

    /**
     * Update all ghosts
     */
    update(game) {
        const player = game.player;
        if (!player || !player.active) return;

        for (const ghost of this.ghosts) {
            if (!ghost.active) continue;

            // Update animation timers
            ghost.floatOffset += 0.05;
            ghost.pulseOffset += 0.08;
            ghost.flickerTimer++;

            // Decrease invincibility
            if (ghost.invincibilityFrames > 0) {
                ghost.invincibilityFrames--;
            }

            if (ghost.hostile) {
                // Hostile ghost AI - chase player
                this.updateHostileGhost(ghost, player, game);
            } else {
                // Friendly ghost - just float and wait to be touched
                this.updateFriendlyGhost(ghost, player, game);
            }
        }

        // Remove inactive ghosts
        this.ghosts = this.ghosts.filter(g => g.active);
    }

    /**
     * Update hostile ghost behavior
     */
    updateHostileGhost(ghost, player, game) {
        // Move toward player
        const dx = player.x - ghost.x;
        const dy = player.y - ghost.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 30) {
            // Chase player slowly
            const speed = 1.5;
            ghost.velocityX = (dx / dist) * speed;
            ghost.velocityY = (dy / dist) * speed * 0.5; // Less vertical movement

            ghost.x += ghost.velocityX;
            ghost.y += ghost.velocityY;
        }

        // Attack cooldown
        if (ghost.attackCooldown > 0) {
            ghost.attackCooldown--;
        }

        // Check collision with player
        if (this.checkCollision(ghost, player)) {
            if (ghost.attackCooldown <= 0) {
                // Damage player
                const actualDamage = game.calculateDamageTaken(ghost.damage);
                if (actualDamage > 0 && player.takeDamage(actualDamage)) {
                    game.camera.addShake(4, 8);
                    game.hud.addMessage('SHADE ATTACKS!', 'warning');
                    ghost.attackCooldown = 60; // 1 second cooldown
                }
            }
        }

        // Check if player attacks ghost
        if (player.isAttacking && ghost.invincibilityFrames <= 0) {
            const attackBounds = player.getAttackBounds();
            if (attackBounds && this.checkBoundsCollision(attackBounds, ghost)) {
                // Take damage
                const damage = 25 * game.weaponSystem.getDamageMultiplier();
                ghost.health -= damage;
                ghost.invincibilityFrames = 15;

                game.camera.addShake(3, 5);

                if (ghost.health <= 0) {
                    // Ghost defeated!
                    ghost.active = false;
                    game.hud.addMessage(ghost.typeData.message, 'success');
                    game.addBladeXP(50);
                    game.renderer.flash(ghost.typeData.coreColor, 0.3);

                    // Track hostile ghost defeat in run stats
                    if (game.runStats) {
                        game.runStats.recordGhostInteraction(ghost.type, true);
                    }

                    // Spawn particles
                    this.spawnDeathParticles(ghost, game);
                }
            }
        }
    }

    /**
     * Update friendly ghost behavior
     */
    updateFriendlyGhost(ghost, player, game) {
        // Check collision with player
        if (this.checkCollision(ghost, player)) {
            // Absorb the ghost
            ghost.active = false;
            game.hud.addMessage(ghost.typeData.message, 'success');
            game.renderer.flash(ghost.typeData.coreColor, 0.3);
            game.camera.addShake(3, 8);

            // Track ghost interaction in run stats
            if (game.runStats) {
                game.runStats.recordGhostInteraction(ghost.type, false);
            }

            // Apply bonus based on ghost type
            switch (ghost.type) {
                case 'enemy':
                    game.cycles.gain(25);
                    break;
                case 'fall':
                    player.health = Math.min(player.health + 15, player.maxHealth);
                    break;
                case 'cycles':
                    game.cycles.gain(100);
                    break;
                default:
                    game.cycles.gain(25);
            }

            // Spawn absorption particles
            this.spawnAbsorbParticles(ghost, game);
        }
    }

    /**
     * Check collision between ghost and entity
     */
    checkCollision(ghost, entity) {
        const ghostBounds = {
            x: ghost.x - ghost.width / 2,
            y: ghost.y - ghost.height / 2,
            width: ghost.width,
            height: ghost.height
        };

        const entityBounds = entity.getBounds ? entity.getBounds() : {
            x: entity.x - 20,
            y: entity.y - 30,
            width: 40,
            height: 60
        };

        return Utils.rectsOverlap(ghostBounds, entityBounds);
    }

    /**
     * Check collision with attack bounds
     */
    checkBoundsCollision(bounds, ghost) {
        const ghostBounds = {
            x: ghost.x - ghost.width / 2,
            y: ghost.y - ghost.height / 2,
            width: ghost.width,
            height: ghost.height
        };

        return Utils.rectsOverlap(bounds, ghostBounds);
    }

    /**
     * Spawn death particles when hostile ghost is defeated
     */
    spawnDeathParticles(ghost, game) {
        if (!game.floatingTexts) game.floatingTexts = [];

        // Add floating text
        game.floatingTexts.push({
            x: ghost.x,
            y: ghost.y - 30,
            text: 'REDEEMED',
            color: ghost.typeData.coreColor,
            lifetime: 50,
            vy: -1.5
        });
    }

    /**
     * Spawn absorption particles when friendly ghost is touched
     */
    spawnAbsorbParticles(ghost, game) {
        if (!game.floatingTexts) game.floatingTexts = [];

        game.floatingTexts.push({
            x: ghost.x,
            y: ghost.y - 30,
            text: 'ABSORBED',
            color: ghost.typeData.coreColor,
            lifetime: 50,
            vy: -1.5
        });
    }

    /**
     * Render all ghosts
     */
    render(ctx, camera) {
        const camPos = camera.getFinalPosition();

        for (const ghost of this.ghosts) {
            if (!ghost.active) continue;

            const sx = ghost.x - camPos.x;
            const sy = ghost.y - camPos.y + Math.sin(ghost.floatOffset) * 8; // Float effect

            ctx.save();

            // Flicker effect
            const flicker = Math.sin(ghost.flickerTimer * 0.3) > 0.7 ? 0.3 : 0;

            // Pulse effect
            const pulse = 0.6 + Math.sin(ghost.pulseOffset) * 0.2;

            // Invincibility flash
            if (ghost.invincibilityFrames > 0 && ghost.invincibilityFrames % 4 < 2) {
                ctx.globalAlpha = 0.3;
            } else {
                ctx.globalAlpha = pulse - flicker;
            }

            // Outer glow
            ctx.shadowColor = ghost.typeData.coreColor;
            ctx.shadowBlur = 30 + Math.sin(ghost.pulseOffset) * 10;

            // Ghost body (spectral shape)
            ctx.fillStyle = ghost.typeData.color;

            // Main body
            ctx.beginPath();
            ctx.ellipse(sx, sy - 10, 18, 25, 0, 0, Math.PI * 2);
            ctx.fill();

            // Wavy bottom
            ctx.beginPath();
            ctx.moveTo(sx - 18, sy + 15);
            for (let i = 0; i <= 6; i++) {
                const wx = sx - 18 + i * 6;
                const wy = sy + 15 + Math.sin(ghost.floatOffset + i) * 5;
                ctx.lineTo(wx, wy);
            }
            ctx.lineTo(sx + 18, sy - 10);
            ctx.lineTo(sx - 18, sy - 10);
            ctx.closePath();
            ctx.fill();

            // Core (brighter center)
            ctx.fillStyle = ghost.typeData.coreColor;
            ctx.globalAlpha = (pulse - flicker) * 0.8;
            ctx.beginPath();
            ctx.ellipse(sx, sy - 15, 8, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = ghost.hostile ? '#ff0000' : '#ffffff';
            ctx.globalAlpha = pulse;
            ctx.shadowBlur = 10;

            // Left eye
            ctx.beginPath();
            ctx.ellipse(sx - 6, sy - 18, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Right eye
            ctx.beginPath();
            ctx.ellipse(sx + 6, sy - 18, 4, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Health bar for hostile ghosts
            if (ghost.hostile && ghost.health < ghost.maxHealth) {
                ctx.globalAlpha = 0.8;
                ctx.shadowBlur = 0;

                const barWidth = 30;
                const barHeight = 4;
                const barX = sx - barWidth / 2;
                const barY = sy - 45;

                // Background
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(barX, barY, barWidth, barHeight);

                // Health
                const healthPercent = ghost.health / ghost.maxHealth;
                ctx.fillStyle = ghost.typeData.coreColor;
                ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
            }

            // Ghost type label
            ctx.globalAlpha = 0.6;
            ctx.shadowBlur = 5;
            ctx.fillStyle = ghost.typeData.coreColor;
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ghost.typeData.name, sx, sy + 35);

            ctx.restore();
        }
    }

    /**
     * Reset for new level (keep ghosts, they persist)
     */
    resetForLevel() {
        // Ghosts are spawned fresh each level
        this.ghosts = [];
    }

    /**
     * Full reset (new run)
     */
    reset() {
        this.ghosts = [];
        // Don't clear death records - they persist across runs!
    }

    /**
     * Clear all death records (fresh start)
     */
    clearAllRecords() {
        this.deathRecords = [];
        this.saveDeathRecords();
    }
}
