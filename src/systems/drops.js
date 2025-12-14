/**
 * ITERATION - Drop System
 * Rare bonus drops that enhance the character
 */

class DropSystem {
    constructor() {
        // All possible drops
        this.dropTypes = [
            // === COMMON DROPS (60% of drops) ===
            {
                id: 'health_orb',
                name: 'HEALTH ORB',
                rarity: 'common',
                dropChance: 0.15,  // 15% base chance from enemies
                color: '#ff4444',
                icon: '♥',
                duration: 0,  // Instant
                effect: (game) => {
                    const heal = 15;
                    game.player.health = Math.min(game.player.health + heal, game.player.maxHealth);
                    return `+${heal} HP`;
                }
            },
            {
                id: 'cycle_orb',
                name: 'CYCLE FRAGMENT',
                rarity: 'common',
                dropChance: 0.12,
                color: '#00f0ff',
                icon: '◈',
                duration: 0,
                effect: (game) => {
                    const cycles = 25;
                    game.cycles.gain(cycles);
                    return `+${cycles} CYCLES`;
                }
            },
            {
                id: 'xp_orb',
                name: 'DATA SHARD',
                rarity: 'common',
                dropChance: 0.10,
                color: '#aa00ff',
                icon: '✧',
                duration: 0,
                effect: (game) => {
                    const xp = 8;
                    game.addBladeXP(xp);
                    return `+${xp} BLADE XP`;
                }
            },

            // === UNCOMMON DROPS (25% of drops) ===
            {
                id: 'damage_boost',
                name: 'POWER CELL',
                rarity: 'uncommon',
                dropChance: 0.05,
                color: '#ff8800',
                icon: '⚡',
                duration: 600,  // 10 seconds
                effect: (game) => {
                    game.tempBuffs.damageBoost = 1.5;
                    return '+50% DAMAGE (10s)';
                },
                onExpire: (game) => {
                    game.tempBuffs.damageBoost = 1.0;
                }
            },
            {
                id: 'speed_boost',
                name: 'VELOCITY CHIP',
                rarity: 'uncommon',
                dropChance: 0.05,
                color: '#00ff88',
                icon: '»',
                duration: 600,
                effect: (game) => {
                    game.tempBuffs.speedBoost = 1.4;
                    return '+40% SPEED (10s)';
                },
                onExpire: (game) => {
                    game.tempBuffs.speedBoost = 1.0;
                }
            },
            {
                id: 'shield',
                name: 'BARRIER MATRIX',
                rarity: 'uncommon',
                dropChance: 0.04,
                color: '#4488ff',
                icon: '◇',
                duration: 480,  // 8 seconds
                effect: (game) => {
                    game.tempBuffs.shield = true;
                    game.tempBuffs.shieldHits = 3;
                    return 'SHIELD (3 hits)';
                },
                onExpire: (game) => {
                    game.tempBuffs.shield = false;
                }
            },
            {
                id: 'magnet',
                name: 'GRAVITY WELL',
                rarity: 'uncommon',
                dropChance: 0.04,
                color: '#ff00ff',
                icon: '◎',
                duration: 900,  // 15 seconds
                effect: (game) => {
                    game.tempBuffs.magnetRange = 200;
                    return 'ITEM MAGNET (15s)';
                },
                onExpire: (game) => {
                    game.tempBuffs.magnetRange = 60;
                }
            },

            // === RARE DROPS (12% of drops) ===
            {
                id: 'mega_heal',
                name: 'REPAIR PROTOCOL',
                rarity: 'rare',
                dropChance: 0.02,
                color: '#00ffaa',
                icon: '✚',
                duration: 0,
                effect: (game) => {
                    game.player.health = game.player.maxHealth;
                    return 'FULL HEAL!';
                }
            },
            {
                id: 'double_xp',
                name: 'EVOLUTION CATALYST',
                rarity: 'rare',
                dropChance: 0.02,
                color: '#ffdd00',
                icon: '★',
                duration: 1200,  // 20 seconds
                effect: (game) => {
                    game.tempBuffs.xpMultiplier = 2.0;
                    return '2X XP (20s)';
                },
                onExpire: (game) => {
                    game.tempBuffs.xpMultiplier = 1.0;
                }
            },
            {
                id: 'invincibility',
                name: 'GODMODE GLITCH',
                rarity: 'rare',
                dropChance: 0.015,
                color: '#ffffff',
                icon: '☆',
                duration: 300,  // 5 seconds
                effect: (game) => {
                    game.tempBuffs.invincible = true;
                    return 'INVINCIBLE (5s)';
                },
                onExpire: (game) => {
                    game.tempBuffs.invincible = false;
                }
            },

            // === LEGENDARY DROPS (3% of drops) ===
            {
                id: 'permanent_hp',
                name: 'CORE UPGRADE',
                rarity: 'legendary',
                dropChance: 0.008,
                color: '#ffaa00',
                icon: '❖',
                duration: 0,
                effect: (game) => {
                    game.player.maxHealth += 10;
                    game.player.health += 10;
                    return '+10 MAX HP (Permanent)';
                }
            },
            {
                id: 'permanent_damage',
                name: 'WEAPON CORE',
                rarity: 'legendary',
                dropChance: 0.008,
                color: '#ff0066',
                icon: '◆',
                duration: 0,
                effect: (game) => {
                    if (!game.permanentBuffs) game.permanentBuffs = { damage: 1.0 };
                    game.permanentBuffs.damage += 0.05;
                    return '+5% DAMAGE (Permanent)';
                }
            },
            {
                id: 'jackpot',
                name: 'JACKPOT PROTOCOL',
                rarity: 'legendary',
                dropChance: 0.005,
                color: '#ffff00',
                icon: '✦',
                duration: 0,
                effect: (game) => {
                    game.cycles.gain(200);
                    game.addBladeXP(30);
                    game.player.health = game.player.maxHealth;
                    return 'JACKPOT! +200 CYCLES +30 XP +FULL HEAL';
                }
            },

            // === MAGIC IMBUE DROPS (rare) ===
            {
                id: 'imbue_cold',
                name: 'FROST CORE',
                rarity: 'rare',
                dropChance: 0.018,
                color: '#00ffff',
                icon: '❄',
                duration: 1800,  // 30 seconds
                isImbue: true,
                imbueType: 'cold',
                effect: (game) => {
                    game.activeImbue = { type: 'cold', color: '#00ffff', name: 'FROST' };
                    return 'COLD IMBUE: Slows enemies (30s)';
                },
                onExpire: (game) => {
                    if (game.activeImbue?.type === 'cold') game.activeImbue = null;
                }
            },
            {
                id: 'imbue_fire',
                name: 'INFERNO CORE',
                rarity: 'rare',
                dropChance: 0.018,
                color: '#ff4400',
                icon: '🔥',
                duration: 1800,
                isImbue: true,
                imbueType: 'fire',
                effect: (game) => {
                    game.activeImbue = { type: 'fire', color: '#ff4400', name: 'INFERNO' };
                    return 'FIRE IMBUE: Burns enemies (30s)';
                },
                onExpire: (game) => {
                    if (game.activeImbue?.type === 'fire') game.activeImbue = null;
                }
            },
            {
                id: 'imbue_electric',
                name: 'STORM CORE',
                rarity: 'rare',
                dropChance: 0.018,
                color: '#ffff00',
                icon: '⚡',
                duration: 1800,
                isImbue: true,
                imbueType: 'electric',
                effect: (game) => {
                    game.activeImbue = { type: 'electric', color: '#ffff00', name: 'STORM' };
                    return 'ELECTRIC IMBUE: Chains to enemies (30s)';
                },
                onExpire: (game) => {
                    if (game.activeImbue?.type === 'electric') game.activeImbue = null;
                }
            },
            {
                id: 'imbue_teleport',
                name: 'WARP CORE',
                rarity: 'legendary',
                dropChance: 0.01,
                color: '#aa00ff',
                icon: '✧',
                duration: 1800,
                isImbue: true,
                imbueType: 'teleport',
                effect: (game) => {
                    game.activeImbue = { type: 'teleport', color: '#aa00ff', name: 'WARP' };
                    return 'TELEPORT IMBUE: Warp to kills (30s)';
                },
                onExpire: (game) => {
                    if (game.activeImbue?.type === 'teleport') game.activeImbue = null;
                }
            },

            // === COSMETIC DROPS (from chests/bosses) ===
            {
                id: 'cosmetic_hat',
                name: 'HAT SCHEMATIC',
                rarity: 'rare',
                dropChance: 0.012,
                color: '#ffaa00',
                icon: '🎩',
                duration: 0,
                isCosmetic: true,
                cosmeticType: 'hat',
                effect: (game) => {
                    const hat = game.cosmeticsSystem.getRandomHatDrop();
                    if (hat) {
                        game.cosmeticsSystem.unlockHat(hat.id);
                        game.cosmeticsSystem.equipHat(hat.id);
                        return `UNLOCKED: ${hat.name} HAT!`;
                    }
                    return 'All hats unlocked!';
                }
            },
            {
                id: 'cosmetic_suit',
                name: 'SUIT SCHEMATIC',
                rarity: 'rare',
                dropChance: 0.012,
                color: '#00aaff',
                icon: '👔',
                duration: 0,
                isCosmetic: true,
                cosmeticType: 'suit',
                effect: (game) => {
                    const suit = game.cosmeticsSystem.getRandomSuitDrop();
                    if (suit) {
                        game.cosmeticsSystem.unlockSuit(suit.id);
                        game.cosmeticsSystem.equipSuit(suit.id);
                        game.cosmeticsSystem.applySuitToPlayer(game.player);
                        return `UNLOCKED: ${suit.name} SUIT!`;
                    }
                    return 'All suits unlocked!';
                }
            }
        ];

        // Active drops on ground
        this.groundDrops = [];

        // Active timed buffs
        this.activeBuffs = [];
    }

    /**
     * Roll for drops when enemy dies
     */
    rollDrops(x, y, enemyType = 'normal') {
        // Boss has guaranteed drops + bonus rolls
        const rollCount = enemyType === 'boss' ? 5 : 1;
        const bonusChance = enemyType === 'boss' ? 2.0 : 1.0;

        for (let i = 0; i < rollCount; i++) {
            for (const drop of this.dropTypes) {
                if (Math.random() < drop.dropChance * bonusChance) {
                    this.spawnDrop(x + (Math.random() - 0.5) * 60, y, drop);
                    break;  // Only one drop per roll
                }
            }
        }
    }

    /**
     * Spawn a drop at position
     */
    spawnDrop(x, y, dropType) {
        this.groundDrops.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: -5 - Math.random() * 3,
            type: dropType,
            lifetime: 600,  // 10 seconds to pick up
            bobPhase: Math.random() * Math.PI * 2,
            collected: false
        });
    }

    /**
     * Update drops and buffs
     */
    update(game) {
        // Update ground drops
        for (const drop of this.groundDrops) {
            if (drop.collected) continue;

            // Physics
            drop.vy += 0.3;  // Gravity
            drop.x += drop.vx;
            drop.y += drop.vy;
            drop.vx *= 0.98;  // Friction

            // Floor collision
            if (drop.y > game.currentRoom.height - 60) {
                drop.y = game.currentRoom.height - 60;
                drop.vy = -drop.vy * 0.5;
                if (Math.abs(drop.vy) < 1) drop.vy = 0;
            }

            // Bob animation
            drop.bobPhase += 0.1;

            // Lifetime
            drop.lifetime--;

            // Magnet effect
            const magnetRange = game.tempBuffs?.magnetRange || 60;
            const dx = game.player.x - drop.x;
            const dy = game.player.y - drop.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < magnetRange) {
                const force = (magnetRange - dist) / magnetRange * 0.3;
                drop.x += dx * force;
                drop.y += dy * force;
            }

            // Collection
            if (dist < 30) {
                this.collectDrop(drop, game);
            }
        }

        // Remove expired/collected drops
        this.groundDrops = this.groundDrops.filter(d => !d.collected && d.lifetime > 0);

        // Update active buffs
        for (const buff of this.activeBuffs) {
            buff.remaining--;
            if (buff.remaining <= 0 && buff.type.onExpire) {
                buff.type.onExpire(game);
            }
        }

        // Remove expired buffs
        this.activeBuffs = this.activeBuffs.filter(b => b.remaining > 0);
    }

    /**
     * Collect a drop
     */
    collectDrop(drop, game) {
        drop.collected = true;

        const message = drop.type.effect(game);
        game.hud.addMessage(`${drop.type.icon} ${drop.type.name}: ${message}`,
            drop.type.rarity === 'legendary' ? 'evolution' : 'success');

        // Play pickup sound based on drop type
        if (game.audio) {
            let soundType = 'generic';
            if (drop.type.id === 'health_orb') soundType = 'health';
            else if (drop.type.id === 'xp_orb') soundType = 'xp';
            else if (drop.type.id === 'cycle_orb') soundType = 'cycles';
            else if (drop.type.isImbue) soundType = 'imbue';
            else if (drop.type.isCosmetic) soundType = 'cosmetic';
            game.audio.playPickup(soundType);
        }

        // Screen effects based on rarity
        if (drop.type.rarity === 'legendary') {
            game.renderer.flash(drop.type.color, 0.6);
            game.camera.addShake(8, 20);
        } else if (drop.type.rarity === 'rare') {
            game.renderer.flash(drop.type.color, 0.4);
            game.camera.addShake(5, 10);
        } else {
            game.renderer.flash(drop.type.color, 0.2);
        }

        // Add to active buffs if duration > 0
        if (drop.type.duration > 0) {
            // Remove existing buff of same type
            this.activeBuffs = this.activeBuffs.filter(b => b.type.id !== drop.type.id);
            this.activeBuffs.push({
                type: drop.type,
                remaining: drop.type.duration
            });
        }
    }

    /**
     * Render drops
     */
    render(ctx, camera) {
        const camPos = camera.getFinalPosition();

        for (const drop of this.groundDrops) {
            if (drop.collected) continue;

            const sx = drop.x - camPos.x;
            const sy = drop.y - camPos.y + Math.sin(drop.bobPhase) * 3;

            // Skip if off screen
            if (sx < -50 || sx > camera.width + 50 || sy < -50 || sy > camera.height + 50) {
                continue;
            }

            ctx.save();

            // Glow based on rarity
            const glowSize = drop.type.rarity === 'legendary' ? 25 :
                            drop.type.rarity === 'rare' ? 18 :
                            drop.type.rarity === 'uncommon' ? 12 : 8;

            ctx.shadowColor = drop.type.color;
            ctx.shadowBlur = glowSize;

            // Outer glow
            ctx.fillStyle = drop.type.color;
            ctx.globalAlpha = 0.3 + Math.sin(drop.bobPhase * 2) * 0.2;
            ctx.beginPath();
            ctx.arc(sx, sy, 12 + glowSize / 3, 0, Math.PI * 2);
            ctx.fill();

            // Inner orb
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(sx, sy, 5, 0, Math.PI * 2);
            ctx.fill();

            // Icon
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(drop.type.icon, sx, sy);

            // Rarity indicator for rare+
            if (drop.type.rarity === 'rare' || drop.type.rarity === 'legendary') {
                ctx.globalAlpha = 0.5 + Math.sin(drop.bobPhase * 3) * 0.3;
                ctx.strokeStyle = drop.type.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(sx, sy, 16 + Math.sin(drop.bobPhase * 2) * 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.restore();
        }
    }

    /**
     * Render active buff indicators
     */
    renderBuffBar(ctx, x, y) {
        let offsetX = 0;

        for (const buff of this.activeBuffs) {
            const progress = buff.remaining / buff.type.duration;

            ctx.save();

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(x + offsetX, y, 30, 30);

            // Progress bar
            ctx.fillStyle = buff.type.color;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(x + offsetX, y + 30 * (1 - progress), 30, 30 * progress);

            // Icon
            ctx.globalAlpha = 1;
            ctx.fillStyle = buff.type.color;
            ctx.font = 'bold 16px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = buff.type.color;
            ctx.shadowBlur = 5;
            ctx.fillText(buff.type.icon, x + offsetX + 15, y + 15);

            // Border
            ctx.strokeStyle = buff.type.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + offsetX, y, 30, 30);

            ctx.restore();

            offsetX += 35;
        }
    }

    /**
     * Reset for new game
     */
    reset() {
        this.groundDrops = [];
        this.activeBuffs = [];
    }
}
