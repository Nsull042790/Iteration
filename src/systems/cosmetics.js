/**
 * ITERATION - Cosmetics System
 * Hats and suits for character customization
 */

class CosmeticsSystem {
    constructor() {
        // All available cosmetics
        this.hats = [
            { id: 'none', name: 'NONE', rarity: 'common', color: null },
            { id: 'crown', name: 'CROWN', rarity: 'rare', color: '#ffdd00', icon: '♔' },
            { id: 'halo', name: 'HALO', rarity: 'legendary', color: '#ffffff', icon: '◯' },
            { id: 'horns', name: 'HORNS', rarity: 'rare', color: '#ff4444', icon: '∧∧' },
            { id: 'antenna', name: 'ANTENNA', rarity: 'uncommon', color: '#00ff88', icon: '⚆' },
            { id: 'mohawk', name: 'MOHAWK', rarity: 'uncommon', color: '#ff00ff', icon: '▲' },
            { id: 'tophat', name: 'TOP HAT', rarity: 'rare', color: '#222222', icon: '▀' },
            { id: 'visor', name: 'VISOR', rarity: 'uncommon', color: '#00f0ff', icon: '▬' },
            { id: 'flames', name: 'FLAMES', rarity: 'legendary', color: '#ff4400', icon: '🔥' }
        ];

        this.suits = [
            { id: 'none', name: 'DEFAULT', rarity: 'common', color: null },
            { id: 'gold', name: 'GOLDEN', rarity: 'legendary', bodyColor: '#ffdd00', coreColor: '#ffaa00' },
            { id: 'shadow', name: 'SHADOW', rarity: 'rare', bodyColor: '#333333', coreColor: '#aa00ff' },
            { id: 'neon', name: 'NEON', rarity: 'rare', bodyColor: '#00ff88', coreColor: '#00ffff' },
            { id: 'crimson', name: 'CRIMSON', rarity: 'rare', bodyColor: '#ff2222', coreColor: '#ff8800' },
            { id: 'ice', name: 'ICE', rarity: 'rare', bodyColor: '#88ddff', coreColor: '#ffffff' },
            { id: 'void', name: 'VOID', rarity: 'legendary', bodyColor: '#220033', coreColor: '#ff00ff' },
            { id: 'chrome', name: 'CHROME', rarity: 'rare', bodyColor: '#cccccc', coreColor: '#ffffff' }
        ];

        // Currently equipped
        this.equippedHat = 'none';
        this.equippedSuit = 'none';

        // Unlocked cosmetics (stored in localStorage)
        this.unlockedHats = ['none'];
        this.unlockedSuits = ['none'];

        // Load from storage
        this.loadFromStorage();
    }

    /**
     * Load unlocked cosmetics from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem('iteration_cosmetics');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedHats = data.unlockedHats || ['none'];
                this.unlockedSuits = data.unlockedSuits || ['none'];
                this.equippedHat = data.equippedHat || 'none';
                this.equippedSuit = data.equippedSuit || 'none';
            }
        } catch (e) {
            console.log('Could not load cosmetics from storage');
        }
    }

    /**
     * Save unlocked cosmetics to localStorage
     */
    saveToStorage() {
        try {
            const data = {
                unlockedHats: this.unlockedHats,
                unlockedSuits: this.unlockedSuits,
                equippedHat: this.equippedHat,
                equippedSuit: this.equippedSuit
            };
            localStorage.setItem('iteration_cosmetics', JSON.stringify(data));
        } catch (e) {
            console.log('Could not save cosmetics to storage');
        }
    }

    /**
     * Unlock a new hat
     */
    unlockHat(hatId) {
        if (!this.unlockedHats.includes(hatId)) {
            this.unlockedHats.push(hatId);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Unlock a new suit
     */
    unlockSuit(suitId) {
        if (!this.unlockedSuits.includes(suitId)) {
            this.unlockedSuits.push(suitId);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Equip a hat
     */
    equipHat(hatId) {
        if (this.unlockedHats.includes(hatId)) {
            this.equippedHat = hatId;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Equip a suit
     */
    equipSuit(suitId) {
        if (this.unlockedSuits.includes(suitId)) {
            this.equippedSuit = suitId;
            this.saveToStorage();
            return true;
        }
        return false;
    }

    /**
     * Get equipped hat data
     */
    getEquippedHat() {
        return this.hats.find(h => h.id === this.equippedHat) || this.hats[0];
    }

    /**
     * Get equipped suit data
     */
    getEquippedSuit() {
        return this.suits.find(s => s.id === this.equippedSuit) || this.suits[0];
    }

    /**
     * Get a random unlockable hat (for drops)
     */
    getRandomHatDrop() {
        const locked = this.hats.filter(h => h.id !== 'none' && !this.unlockedHats.includes(h.id));
        if (locked.length === 0) return null;
        return locked[Math.floor(Math.random() * locked.length)];
    }

    /**
     * Get a random unlockable suit (for drops)
     */
    getRandomSuitDrop() {
        const locked = this.suits.filter(s => s.id !== 'none' && !this.unlockedSuits.includes(s.id));
        if (locked.length === 0) return null;
        return locked[Math.floor(Math.random() * locked.length)];
    }

    /**
     * Render hat on player
     */
    renderHat(ctx, x, y, facingRight) {
        const hat = this.getEquippedHat();
        if (!hat.color) return;

        ctx.save();
        ctx.shadowColor = hat.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = hat.color;

        switch (hat.id) {
            case 'crown':
                // Crown shape
                ctx.beginPath();
                ctx.moveTo(x - 8, y);
                ctx.lineTo(x - 6, y - 8);
                ctx.lineTo(x - 3, y - 4);
                ctx.lineTo(x, y - 10);
                ctx.lineTo(x + 3, y - 4);
                ctx.lineTo(x + 6, y - 8);
                ctx.lineTo(x + 8, y);
                ctx.closePath();
                ctx.fill();
                break;

            case 'halo':
                // Floating ring above head
                ctx.strokeStyle = hat.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(x, y - 12, 10, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;

            case 'horns':
                // Devil horns
                ctx.beginPath();
                ctx.moveTo(x - 8, y);
                ctx.lineTo(x - 10, y - 12);
                ctx.lineTo(x - 5, y - 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(x + 8, y);
                ctx.lineTo(x + 10, y - 12);
                ctx.lineTo(x + 5, y - 2);
                ctx.fill();
                break;

            case 'antenna':
                // Alien antenna
                ctx.strokeStyle = hat.color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y - 12);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y - 14, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'mohawk':
                // Punk mohawk
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(x - 2 + (i - 2) * 2, y - 4 - (5 - Math.abs(i - 2)) * 3, 3, (5 - Math.abs(i - 2)) * 3 + 4);
                }
                break;

            case 'tophat':
                // Top hat
                ctx.fillRect(x - 8, y - 2, 16, 4);
                ctx.fillRect(x - 5, y - 14, 10, 12);
                break;

            case 'visor':
                // Cyber visor
                ctx.fillRect(x - 10, y + 2, 20, 4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(x - 8, y + 3, 16, 2);
                break;

            case 'flames':
                // Animated flames
                const time = Date.now() / 100;
                for (let i = 0; i < 5; i++) {
                    const flameHeight = 8 + Math.sin(time + i) * 4;
                    const flameX = x - 6 + i * 3;
                    ctx.fillStyle = i % 2 === 0 ? '#ff4400' : '#ffaa00';
                    ctx.beginPath();
                    ctx.moveTo(flameX, y);
                    ctx.lineTo(flameX + 2, y - flameHeight);
                    ctx.lineTo(flameX + 4, y);
                    ctx.fill();
                }
                break;
        }

        ctx.restore();
    }

    /**
     * Apply suit colors to player
     */
    applySuitToPlayer(player) {
        const suit = this.getEquippedSuit();
        if (suit.bodyColor) {
            player.suitBodyColor = suit.bodyColor;
            player.suitCoreColor = suit.coreColor;
        } else {
            player.suitBodyColor = null;
            player.suitCoreColor = null;
        }
    }
}
