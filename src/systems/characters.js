/**
 * ITERATION - Character System
 * 90s video game inspired playable characters
 */

class CharacterSystem {
    constructor() {
        this.selectedCharacter = 'echo';  // Default

        // All playable characters inspired by 90s games
        this.characters = [
            {
                id: 'echo',
                name: 'ECHO',
                subtitle: 'The Original',
                description: 'Balanced combat AI. Jack of all trades.',
                inspiration: 'Original',
                // Stats (base = 100)
                stats: {
                    health: 100,
                    damage: 100,
                    speed: 100,
                    attackSpeed: 100
                },
                // Visual
                color: '#00f0ff',
                secondaryColor: '#0088aa',
                eyeColor: '#ffffff',
                style: 'default',
                // Special ability
                special: {
                    name: 'ADAPTIVE',
                    description: '+10% XP gain',
                    xpBonus: 0.10
                }
            },
            {
                id: 'blitz',
                name: 'BLITZ',
                subtitle: 'Speed Demon',
                description: 'Blazing fast. Gotta go fast!',
                inspiration: 'Sonic',
                stats: {
                    health: 70,
                    damage: 80,
                    speed: 160,
                    attackSpeed: 130
                },
                color: '#0066ff',
                secondaryColor: '#0044aa',
                eyeColor: '#ffffff',
                style: 'round',
                special: {
                    name: 'MOMENTUM',
                    description: 'Damage scales with speed',
                    speedDamageBonus: true
                }
            },
            {
                id: 'titan',
                name: 'TITAN',
                subtitle: 'Heavy Hitter',
                description: 'Slow but devastating. Tank mode.',
                inspiration: 'Contra/Metal Slug',
                stats: {
                    health: 180,
                    damage: 140,
                    speed: 65,
                    attackSpeed: 70,
                    jumpHeight: 85  // Lower jump due to weight (adjusted from 75)
                },
                color: '#ff4400',
                secondaryColor: '#aa2200',
                eyeColor: '#ffff00',
                style: 'bulky',
                special: {
                    name: 'HEAVY ARMOR',
                    description: '-20% damage taken, lower jump',
                    damageReduction: 0.20
                }
            },
            {
                id: 'phantom',
                name: 'PHANTOM',
                subtitle: 'Shadow Walker',
                description: 'Swift and deadly. Strike from shadows.',
                inspiration: 'Ninja Gaiden/Shinobi',
                stats: {
                    health: 80,
                    damage: 120,
                    speed: 130,
                    attackSpeed: 140
                },
                color: '#8800aa',
                secondaryColor: '#440066',
                eyeColor: '#ff00ff',
                style: 'slim',
                special: {
                    name: 'ASSASSIN',
                    description: '25% crit chance',
                    critChance: 0.25
                }
            },
            {
                id: 'nova',
                name: 'NOVA',
                subtitle: 'Beam Warrior',
                description: 'Charged attacks. Arm cannon specialist.',
                inspiration: 'Mega Man/Metroid',
                stats: {
                    health: 90,
                    damage: 110,
                    speed: 95,
                    attackSpeed: 85
                },
                color: '#00ff88',
                secondaryColor: '#00aa55',
                eyeColor: '#ffffff',
                style: 'armored',
                special: {
                    name: 'CHARGE SHOT',
                    description: 'Blade waves deal +50% damage',
                    waveBonus: 0.50
                }
            },
            {
                id: 'havoc',
                name: 'HAVOC',
                subtitle: 'Berserker',
                description: 'Glass cannon. High risk, high reward.',
                inspiration: 'Doom Guy/Duke Nukem',
                stats: {
                    health: 50,      // Reduced from 60 - true glass cannon
                    damage: 170,
                    speed: 110,
                    attackSpeed: 120
                },
                color: '#ff0044',
                secondaryColor: '#aa0022',
                eyeColor: '#ffff00',
                style: 'aggressive',
                special: {
                    name: 'BLOODLUST',
                    description: '+5% lifesteal, +10% damage taken',
                    lifesteal: 0.05,         // Buffed from 3% to 5%
                    damageAmplify: 0.10      // Takes 10% more damage
                }
            },
            {
                id: 'sage',
                name: 'SAGE',
                subtitle: 'Mystic Blade',
                description: 'Ancient power. Magic enhanced.',
                inspiration: 'Link/Castlevania',
                stats: {
                    health: 95,
                    damage: 95,
                    speed: 100,
                    attackSpeed: 100
                },
                color: '#44ff00',
                secondaryColor: '#228800',
                eyeColor: '#ffffff',
                style: 'cloaked',
                special: {
                    name: 'AURA',
                    description: 'Explosions are 30% larger',
                    explosionBonus: 0.30
                }
            },
            {
                id: 'chrome',
                name: 'CHROME',
                subtitle: 'Metal Warrior',
                description: 'Cybernetic enhancement. Balanced power.',
                inspiration: 'Terminator/RoboCop',
                stats: {
                    health: 120,
                    damage: 105,
                    speed: 90,
                    attackSpeed: 95
                },
                color: '#aaaaaa',
                secondaryColor: '#666666',
                eyeColor: '#ff0000',
                style: 'robotic',
                special: {
                    name: 'REGENERATE',
                    description: 'Heal 1 HP per second',
                    regenRate: 1.0  // HP per second (buffed from 0.5)
                }
            },
            {
                id: 'void',
                name: 'VOID',
                subtitle: 'Hollow One',
                description: 'Ancient vessel. Empty but powerful.',
                inspiration: 'Hollow Knight',
                stats: {
                    health: 85,
                    damage: 100,
                    speed: 115,
                    attackSpeed: 110
                },
                color: '#ff71ce',      // Vaporwave pink
                secondaryColor: '#01cdfe', // Vaporwave cyan
                eyeColor: '#000000',   // Hollow black eyes
                accentColor: '#b967ff', // Vaporwave purple
                style: 'hollow',
                special: {
                    name: 'SOUL',
                    description: 'Kills restore 3 HP',
                    killHeal: 3
                }
            },
            {
                id: 'neon',
                name: 'NEON',
                subtitle: 'Sunset Runner',
                description: 'Pure aesthetic. Retro future warrior.',
                inspiration: 'Vaporwave/Synthwave',
                stats: {
                    health: 90,
                    damage: 90,
                    speed: 120,
                    attackSpeed: 105
                },
                color: '#f222ff',       // Hot pink
                secondaryColor: '#ffb347', // Sunset orange
                eyeColor: '#00ffff',    // Cyan eyes
                accentColor: '#ff6b6b', // Coral
                style: 'vapor',
                special: {
                    name: 'AESTHETIC',
                    description: '+15% cycle gain',
                    cycleBonus: 0.15
                }
            }
        ];
    }

    /**
     * Get character by ID
     */
    getCharacter(id) {
        return this.characters.find(c => c.id === id) || this.characters[0];
    }

    /**
     * Get currently selected character
     */
    getSelected() {
        return this.getCharacter(this.selectedCharacter);
    }

    /**
     * Select a character
     */
    select(id) {
        this.selectedCharacter = id;
    }

    /**
     * Apply character stats to player
     */
    applyToPlayer(player) {
        const char = this.getSelected();
        console.log('Applying character to player:', char.name, 'Color:', char.color, 'Style:', char.style);

        // Apply stat multipliers (base stats * percentage / 100)
        player.maxHealth = Math.floor(100 * char.stats.health / 100);
        player.health = player.maxHealth;
        player.baseDamageMultiplier = char.stats.damage / 100;
        player.baseSpeedMultiplier = char.stats.speed / 100;
        player.baseAttackSpeedMultiplier = char.stats.attackSpeed / 100;

        // Apply jump height modifier (Titan has lower jump)
        player.jumpMultiplier = (char.stats.jumpHeight || 100) / 100;

        // Apply damage amplification (Havoc takes more damage)
        player.damageAmplify = char.special.damageAmplify || 0;

        // Apply visual style
        player.characterColor = char.color;
        player.characterSecondaryColor = char.secondaryColor;
        player.characterEyeColor = char.eyeColor;
        player.characterAccentColor = char.accentColor || char.color;
        player.characterStyle = char.style;
        player.characterId = char.id;

        // Store special ability reference
        player.characterSpecial = char.special;
    }

    /**
     * Get stat comparison bars for UI
     */
    getStatBars(charId) {
        const char = this.getCharacter(charId);
        return [
            { name: 'HP', value: char.stats.health, color: '#ff4444' },
            { name: 'DMG', value: char.stats.damage, color: '#ff8800' },
            { name: 'SPD', value: char.stats.speed, color: '#00ff88' },
            { name: 'ATK', value: char.stats.attackSpeed, color: '#00f0ff' }
        ];
    }
}
