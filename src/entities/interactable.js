/**
 * ITERATION - Interactable Objects
 * Chests, terminals, and other interactive elements
 */

class Interactable {
    constructor(x, y, type = 'chest') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.type = type;

        this.active = true;
        this.used = false;
        this.playerNearby = false;

        // Animation
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.openProgress = 0;

        // Type-specific setup
        this.setupType();
    }

    setupType() {
        switch (this.type) {
            case 'chest':
                this.width = 48;
                this.height = 36;
                this.interactPrompt = 'OPEN';
                this.contents = this.generateChestContents();
                break;

            case 'terminal':
                this.width = 32;
                this.height = 48;
                this.interactPrompt = 'ACCESS';
                this.loreText = this.generateLore();
                break;

            case 'health_station':
                this.width = 40;
                this.height = 56;
                this.interactPrompt = 'REPAIR';
                this.healAmount = 50;
                break;

            case 'cycle_node':
                this.width = 36;
                this.height = 36;
                this.interactPrompt = 'ABSORB';
                this.cycleAmount = 100;
                break;

            case 'exit_portal':
                this.width = 64;
                this.height = 80;
                this.interactPrompt = 'PROCEED';
                break;
        }
    }

    generateChestContents() {
        const roll = Math.random();
        if (roll < 0.4) {
            return { type: 'cycles', amount: Utils.randomInt(30, 80) };
        } else if (roll < 0.7) {
            return { type: 'health', amount: Utils.randomInt(20, 40) };
        } else {
            return { type: 'blade_xp', amount: Utils.randomInt(10, 25) };
        }
    }

    generateLore() {
        const loreEntries = [
            "SIMULATION LOG #247: Subject displays unexpected pattern recognition. Monitoring closely.",
            "PROTOCOL OVERRIDE: Blade evolution parameters adjusted. Subject adapting faster than predicted.",
            "WARNING: Ghost data corruption detected. Previous iteration memories bleeding through.",
            "ARCHITECT NOTE: The loop must not be broken. Increase adaptation algorithms.",
            "SYSTEM ERROR: Subject awareness levels exceeding threshold. Recommend memory wipe.",
            "DATA FRAGMENT: ...they don't know I remember. Each death, I learn. I will escape..."
        ];
        return loreEntries[Utils.randomInt(0, loreEntries.length - 1)];
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if player is in range
     */
    checkPlayerProximity(player) {
        if (!player || this.used) {
            this.playerNearby = false;
            return false;
        }

        const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
        const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.playerNearby = distance < 60;
        return this.playerNearby;
    }

    /**
     * Interact with this object
     */
    interact(player, game) {
        if (this.used || !this.playerNearby) return null;

        this.used = true;
        this.openProgress = 0;

        switch (this.type) {
            case 'chest':
                return this.openChest(player, game);

            case 'terminal':
                return this.accessTerminal(game);

            case 'health_station':
                return this.useHealthStation(player, game);

            case 'cycle_node':
                return this.absorbCycles(game);

            case 'exit_portal':
                return this.enterPortal(game);
        }

        return null;
    }

    openChest(player, game) {
        const contents = this.contents;
        let message = '';

        switch (contents.type) {
            case 'cycles':
                game.cycles.gain(contents.amount);
                message = `+${contents.amount} CYCLES`;
                break;

            case 'health':
                player.health = Math.min(player.health + contents.amount, player.maxHealth);
                message = `+${contents.amount} INTEGRITY`;
                break;

            case 'blade_xp':
                if (game.bladeEvolution) {
                    game.bladeEvolution.addXP(contents.amount);
                }
                message = `+${contents.amount} BLADE DATA`;
                break;
        }

        return { type: 'success', message };
    }

    accessTerminal(game) {
        return { type: 'lore', message: this.loreText };
    }

    useHealthStation(player, game) {
        const healed = Math.min(this.healAmount, player.maxHealth - player.health);
        player.health += healed;
        return { type: 'success', message: `INTEGRITY RESTORED: +${healed}` };
    }

    absorbCycles(game) {
        game.cycles.gain(this.cycleAmount);
        return { type: 'success', message: `+${this.cycleAmount} CYCLES ABSORBED` };
    }

    enterPortal(game) {
        return { type: 'portal', message: 'PROCEEDING TO NEXT SECTOR...' };
    }

    /**
     * Update interactable
     */
    update(deltaTime) {
        this.pulsePhase += 0.08;

        if (this.used && this.openProgress < 1) {
            this.openProgress += 0.05;
        }
    }

    /**
     * Render interactable
     */
    render(ctx, camera) {
        if (!this.active) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        ctx.save();

        switch (this.type) {
            case 'chest':
                this.renderChest(ctx, screenPos);
                break;
            case 'terminal':
                this.renderTerminal(ctx, screenPos);
                break;
            case 'health_station':
                this.renderHealthStation(ctx, screenPos);
                break;
            case 'cycle_node':
                this.renderCycleNode(ctx, screenPos);
                break;
            case 'exit_portal':
                this.renderExitPortal(ctx, screenPos);
                break;
        }

        // Render interaction prompt
        if (this.playerNearby && !this.used) {
            this.renderPrompt(ctx, screenPos);
        }

        ctx.restore();
    }

    renderChest(ctx, screenPos) {
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;

        if (!this.used) {
            // Closed chest
            ctx.fillStyle = '#2a2a3f';
            ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
            ctx.shadowBlur = this.playerNearby ? 15 : 5;

            // Body
            ctx.fillRect(screenPos.x, screenPos.y + 10, this.width, this.height - 10);

            // Lid
            ctx.fillStyle = '#3a3a4f';
            ctx.fillRect(screenPos.x - 2, screenPos.y + 5, this.width + 4, 12);

            // Lock/gem
            ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(screenPos.x + this.width / 2, screenPos.y + 11, 4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Open chest
            const openAngle = this.openProgress * 0.8;

            ctx.fillStyle = '#2a2a3f';
            ctx.fillRect(screenPos.x, screenPos.y + 15, this.width, this.height - 15);

            // Open lid
            ctx.save();
            ctx.translate(screenPos.x, screenPos.y + 10);
            ctx.rotate(-openAngle);
            ctx.fillStyle = '#3a3a4f';
            ctx.fillRect(0, 0, this.width + 4, 12);
            ctx.restore();

            // Empty inside
            ctx.fillStyle = '#1a1a2f';
            ctx.fillRect(screenPos.x + 4, screenPos.y + 18, this.width - 8, this.height - 22);
        }
    }

    renderTerminal(ctx, screenPos) {
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;

        // Stand
        ctx.fillStyle = '#2a2a3f';
        ctx.fillRect(screenPos.x + 10, screenPos.y + 30, 12, 18);

        // Screen
        ctx.fillStyle = this.used ? '#1a1a2f' : '#0a2a2f';
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.lineWidth = 2;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = this.playerNearby ? 15 : 5;

        ctx.fillRect(screenPos.x, screenPos.y, this.width, 30);
        ctx.strokeRect(screenPos.x, screenPos.y, this.width, 30);

        if (!this.used) {
            // Screen content
            ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
            ctx.globalAlpha = pulse;

            // Blinking cursor
            if (Math.sin(this.pulsePhase * 2) > 0) {
                ctx.fillRect(screenPos.x + 6, screenPos.y + 12, 8, 2);
            }

            // Data lines
            for (let i = 0; i < 3; i++) {
                ctx.fillRect(screenPos.x + 6, screenPos.y + 6 + i * 6, 10 + Math.random() * 10, 2);
            }
        }
    }

    renderHealthStation(ctx, screenPos) {
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;

        // Base
        ctx.fillStyle = '#2a2a3f';
        ctx.fillRect(screenPos.x + 5, screenPos.y + 40, this.width - 10, 16);

        // Column
        ctx.fillRect(screenPos.x + 12, screenPos.y + 10, 16, 35);

        // Top unit
        ctx.fillStyle = this.used ? '#1a1a2f' : '#0a2f2a';
        ctx.fillRect(screenPos.x, screenPos.y, this.width, 15);

        if (!this.used) {
            // Health cross
            ctx.fillStyle = GAME_CONFIG.COLORS.HEALTH;
            ctx.shadowColor = GAME_CONFIG.COLORS.HEALTH;
            ctx.shadowBlur = 10 * pulse;
            ctx.globalAlpha = pulse;

            ctx.fillRect(screenPos.x + 17, screenPos.y + 3, 6, 9);
            ctx.fillRect(screenPos.x + 14, screenPos.y + 6, 12, 3);
        }
    }

    renderCycleNode(ctx, screenPos) {
        const pulse = Math.sin(this.pulsePhase) * 0.4 + 0.6;
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;

        if (!this.used) {
            // Outer ring
            ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
            ctx.lineWidth = 3;
            ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
            ctx.shadowBlur = 15 * pulse;
            ctx.globalAlpha = pulse;

            ctx.beginPath();
            ctx.arc(centerX, centerY, 16, 0, Math.PI * 2);
            ctx.stroke();

            // Inner core
            ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
            ctx.fill();

            // Orbiting particles
            for (let i = 0; i < 3; i++) {
                const angle = this.pulsePhase * 2 + (i * Math.PI * 2 / 3);
                const ox = centerX + Math.cos(angle) * 20;
                const oy = centerY + Math.sin(angle) * 20;

                ctx.beginPath();
                ctx.arc(ox, oy, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // Depleted
            ctx.strokeStyle = '#2a2a3f';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    renderExitPortal(ctx, screenPos) {
        const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7;
        const centerX = screenPos.x + this.width / 2;
        const centerY = screenPos.y + this.height / 2;

        // Portal frame
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.lineWidth = 4;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 20 * pulse;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 28, 36, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Inner portal effect
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 30);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 120, 180, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 60, 90, 0.1)');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, 24, 32, 0, 0, Math.PI * 2);
        ctx.fill();

        // Swirling particles
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
            const angle = this.pulsePhase * 3 + (i * Math.PI * 2 / 5);
            const radius = 15 + Math.sin(this.pulsePhase + i) * 8;
            const ox = centerX + Math.cos(angle) * radius * 0.8;
            const oy = centerY + Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.arc(ox, oy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderPrompt(ctx, screenPos) {
        const promptY = screenPos.y - 25;
        const pulse = Math.sin(this.pulsePhase * 2) * 0.2 + 0.8;

        ctx.globalAlpha = pulse;
        ctx.font = 'bold 10px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.textAlign = 'center';
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 5;

        // Key indicator
        ctx.fillText('[←]', screenPos.x + this.width / 2, promptY);

        // Action text
        ctx.fillText(this.interactPrompt, screenPos.x + this.width / 2, promptY + 12);
    }
}
