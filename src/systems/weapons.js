/**
 * ITERATION - Weapon System
 * 3 weapon pockets with individual upgrade paths
 * Final evolution: Laser Sword
 */

class WeaponSystem {
    constructor() {
        // 3 weapon slots
        this.slots = [
            this.createWeapon('striker'),
            this.createWeapon('razor'),
            this.createWeapon('crusher')
        ];

        // Currently equipped weapon (0, 1, or 2)
        this.activeSlot = 0;

        // Weapon switching cooldown
        this.switchCooldown = 0;

        // Weapon definitions with evolution tiers
        this.weaponTypes = {
            striker: {
                name: 'STRIKER',
                description: 'Balanced blade',
                color: '#00f0ff',
                baseStats: { damage: 1.0, speed: 1.0, range: 1.0 },
                tiers: [
                    { name: 'STRIKER MK-I', damage: 1.0, speed: 1.0, range: 40, color: '#00f0ff', glow: '#004466' },
                    { name: 'STRIKER MK-II', damage: 1.2, speed: 1.1, range: 45, color: '#00ffff', glow: '#006688' },
                    { name: 'STRIKER PRIME', damage: 1.5, speed: 1.2, range: 50, color: '#44ffff', glow: '#00aaaa', ability: 'pierce' },
                    { name: 'STRIKER ULTRA', damage: 1.8, speed: 1.3, range: 55, color: '#88ffff', glow: '#00dddd', ability: 'pierce', laserChance: 0.25 },
                    { name: 'PHOTON STRIKER', damage: 2.2, speed: 1.5, range: 60, color: '#ffffff', glow: '#00ffff', ability: 'laser', laserDamage: 0.6, isLaser: true }
                ]
            },
            razor: {
                name: 'RAZOR',
                description: 'Swift strikes',
                color: '#ff00aa',
                baseStats: { damage: 0.7, speed: 1.6, range: 0.8 },
                tiers: [
                    { name: 'RAZOR MK-I', damage: 0.7, speed: 1.6, range: 35, color: '#ff00aa', glow: '#660044' },
                    { name: 'RAZOR MK-II', damage: 0.85, speed: 1.8, range: 38, color: '#ff44bb', glow: '#880066' },
                    { name: 'RAZOR PRIME', damage: 1.0, speed: 2.0, range: 42, color: '#ff66cc', glow: '#aa0088', ability: 'bleed' },
                    { name: 'RAZOR ULTRA', damage: 1.2, speed: 2.2, range: 46, color: '#ff88dd', glow: '#cc00aa', ability: 'bleed', laserChance: 0.30 },
                    { name: 'PHOTON RAZOR', damage: 1.5, speed: 2.5, range: 50, color: '#ffaaff', glow: '#ff00ff', ability: 'laser', laserDamage: 0.4, isLaser: true, multiLaser: 3 }
                ]
            },
            crusher: {
                name: 'CRUSHER',
                description: 'Devastating power',
                color: '#ff4400',
                baseStats: { damage: 1.8, speed: 0.6, range: 1.2 },
                tiers: [
                    { name: 'CRUSHER MK-I', damage: 1.8, speed: 0.6, range: 50, color: '#ff4400', glow: '#662200' },
                    { name: 'CRUSHER MK-II', damage: 2.2, speed: 0.65, range: 55, color: '#ff6622', glow: '#883300' },
                    { name: 'CRUSHER PRIME', damage: 2.8, speed: 0.7, range: 60, color: '#ff8844', glow: '#aa4400', ability: 'shockwave' },
                    { name: 'CRUSHER ULTRA', damage: 3.5, speed: 0.75, range: 65, color: '#ffaa66', glow: '#cc5500', ability: 'shockwave', laserChance: 0.20 },
                    { name: 'PHOTON CRUSHER', damage: 4.0, speed: 0.8, range: 70, color: '#ffcc88', glow: '#ff6600', ability: 'laser', laserDamage: 1.0, isLaser: true, laserWidth: 20 }
                ]
            }
        };
    }

    /**
     * Create a new weapon instance
     */
    createWeapon(type) {
        return {
            type: type,
            tier: 0,
            xp: 0,
            xpToNext: 100
        };
    }

    /**
     * Get the active weapon
     */
    getActiveWeapon() {
        return this.slots[this.activeSlot];
    }

    /**
     * Get weapon data for a slot
     */
    getWeaponData(slotIndex) {
        const weapon = this.slots[slotIndex];
        const typeData = this.weaponTypes[weapon.type];
        const tierData = typeData.tiers[weapon.tier];
        return {
            ...weapon,
            typeData,
            tierData,
            isMaxTier: weapon.tier >= typeData.tiers.length - 1
        };
    }

    /**
     * Get active weapon's current tier data
     */
    getActiveTierData() {
        const weapon = this.getActiveWeapon();
        return this.weaponTypes[weapon.type].tiers[weapon.tier];
    }

    /**
     * Get damage multiplier for active weapon
     */
    getDamageMultiplier() {
        return this.getActiveTierData().damage;
    }

    /**
     * Get attack speed multiplier for active weapon
     */
    getSpeedMultiplier() {
        return this.getActiveTierData().speed;
    }

    /**
     * Get attack range for active weapon
     */
    getRange() {
        return this.getActiveTierData().range;
    }

    /**
     * Get weapon color
     */
    getColor() {
        return this.getActiveTierData().color;
    }

    /**
     * Get weapon glow color
     */
    getGlow() {
        return this.getActiveTierData().glow;
    }

    /**
     * Check if weapon has laser ability
     */
    hasLaser() {
        return this.getActiveTierData().isLaser === true;
    }

    /**
     * Get laser chance (for tier 4 weapons)
     */
    getLaserChance() {
        return this.getActiveTierData().laserChance || 0;
    }

    /**
     * Switch to weapon slot
     */
    switchTo(slotIndex) {
        if (slotIndex >= 0 && slotIndex < 3 && this.switchCooldown <= 0) {
            this.activeSlot = slotIndex;
            this.switchCooldown = 15; // frames
            return true;
        }
        return false;
    }

    /**
     * Cycle to next weapon
     */
    cycleNext() {
        return this.switchTo((this.activeSlot + 1) % 3);
    }

    /**
     * Upgrade a specific weapon slot
     */
    upgradeWeapon(slotIndex) {
        const weapon = this.slots[slotIndex];
        const typeData = this.weaponTypes[weapon.type];

        if (weapon.tier < typeData.tiers.length - 1) {
            weapon.tier++;
            weapon.xp = 0;
            weapon.xpToNext = 100 + weapon.tier * 50;
            return {
                success: true,
                newTier: typeData.tiers[weapon.tier],
                weaponName: typeData.name
            };
        }
        return { success: false };
    }

    /**
     * Get upgrade options for between-round selection
     */
    getUpgradeOptions() {
        const options = [];

        for (let i = 0; i < 3; i++) {
            const weapon = this.slots[i];
            const typeData = this.weaponTypes[weapon.type];
            const currentTier = typeData.tiers[weapon.tier];
            const nextTier = typeData.tiers[weapon.tier + 1];

            if (nextTier) {
                options.push({
                    slotIndex: i,
                    weaponType: weapon.type,
                    weaponName: typeData.name,
                    currentTier: currentTier,
                    nextTier: nextTier,
                    currentLevel: weapon.tier + 1,
                    nextLevel: weapon.tier + 2,
                    maxLevel: typeData.tiers.length,
                    color: typeData.color,
                    isMaxNext: weapon.tier + 1 >= typeData.tiers.length - 1
                });
            } else {
                // Max level - show as completed
                options.push({
                    slotIndex: i,
                    weaponType: weapon.type,
                    weaponName: typeData.name,
                    currentTier: currentTier,
                    nextTier: null,
                    currentLevel: weapon.tier + 1,
                    nextLevel: null,
                    maxLevel: typeData.tiers.length,
                    color: typeData.color,
                    isMaxed: true
                });
            }
        }

        return options;
    }

    /**
     * Update weapon system
     */
    update() {
        if (this.switchCooldown > 0) {
            this.switchCooldown--;
        }
    }

    /**
     * Create laser projectile data
     */
    createLaser(x, y, facingRight, player) {
        const tierData = this.getActiveTierData();
        const typeData = this.weaponTypes[this.getActiveWeapon().type];

        const baseDamage = 25 * tierData.damage * (tierData.laserDamage || 0.5);
        const width = tierData.laserWidth || 12;

        // Multi-laser for Razor
        if (tierData.multiLaser) {
            const lasers = [];
            const spread = 15;
            for (let i = 0; i < tierData.multiLaser; i++) {
                const angle = (i - 1) * spread * (Math.PI / 180);
                lasers.push({
                    x: x + (facingRight ? 30 : -30),
                    y: y,
                    vx: (facingRight ? 12 : -12) * Math.cos(angle),
                    vy: 12 * Math.sin(angle),
                    width: width,
                    height: 6,
                    damage: baseDamage / tierData.multiLaser,
                    color: tierData.color,
                    glow: tierData.glow,
                    lifetime: 45,
                    active: true,
                    isLaser: true
                });
            }
            return lasers;
        }

        // Single laser
        return [{
            x: x + (facingRight ? 30 : -30),
            y: y,
            vx: facingRight ? 14 : -14,
            vy: 0,
            width: width,
            height: 8,
            damage: baseDamage,
            color: tierData.color,
            glow: tierData.glow,
            lifetime: 60,
            active: true,
            isLaser: true
        }];
    }

    /**
     * Render weapon HUD slots
     */
    renderSlots(ctx, x, y) {
        const slotWidth = 60;
        const slotHeight = 50;
        const spacing = 8;

        for (let i = 0; i < 3; i++) {
            const slotX = x + i * (slotWidth + spacing);
            const weapon = this.slots[i];
            const typeData = this.weaponTypes[weapon.type];
            const tierData = typeData.tiers[weapon.tier];
            const isActive = i === this.activeSlot;

            ctx.save();

            // Slot background
            ctx.fillStyle = isActive ? 'rgba(0, 240, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)';
            ctx.strokeStyle = isActive ? tierData.color : 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = isActive ? 2 : 1;

            ctx.beginPath();
            ctx.roundRect(slotX, y, slotWidth, slotHeight, 4);
            ctx.fill();
            ctx.stroke();

            // Weapon icon (blade shape)
            ctx.fillStyle = tierData.color;
            ctx.shadowColor = tierData.glow;
            ctx.shadowBlur = isActive ? 10 : 5;

            const bladeX = slotX + slotWidth / 2;
            const bladeY = y + 18;

            ctx.beginPath();
            ctx.moveTo(bladeX - 15, bladeY + 8);
            ctx.lineTo(bladeX + 15, bladeY - 8);
            ctx.lineTo(bladeX + 18, bladeY - 6);
            ctx.lineTo(bladeX - 12, bladeY + 10);
            ctx.closePath();
            ctx.fill();

            // Laser indicator for max tier
            if (tierData.isLaser) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 8px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('LASER', bladeX, y + 12);
            }

            ctx.shadowBlur = 0;

            // Tier indicators
            const tierY = y + slotHeight - 10;
            for (let t = 0; t < typeData.tiers.length; t++) {
                const dotX = slotX + 10 + t * 10;
                ctx.fillStyle = t <= weapon.tier ? tierData.color : 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.arc(dotX, tierY, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            // Key hint
            ctx.fillStyle = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(String(i + 1), slotX + slotWidth - 5, y + 12);

            ctx.restore();
        }
    }

    /**
     * Reset for new run
     */
    reset() {
        this.slots = [
            this.createWeapon('striker'),
            this.createWeapon('razor'),
            this.createWeapon('crusher')
        ];
        this.activeSlot = 0;
        this.switchCooldown = 0;
    }
}
