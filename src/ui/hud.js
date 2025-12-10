/**
 * ITERATION - HUD (Heads-Up Display)
 * Renders game UI elements
 */

class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.width = canvas.width;
        this.height = canvas.height;

        // UI element positions
        this.padding = 20;

        // Animation states
        this.cyclesPulse = 0;
        this.healthPulse = 0;

        // Messages
        this.messages = [];
        this.messageTimeout = 180; // 3 seconds at 60fps
    }

    /**
     * Add a temporary message
     */
    addMessage(text, type = 'info') {
        this.messages.push({
            text,
            type,
            timer: this.messageTimeout,
            alpha: 1
        });
    }

    /**
     * Update HUD animations
     */
    update() {
        // Update pulses
        this.cyclesPulse += 0.1;
        this.healthPulse += 0.08;

        // Update messages
        for (let i = this.messages.length - 1; i >= 0; i--) {
            this.messages[i].timer--;
            if (this.messages[i].timer < 30) {
                this.messages[i].alpha = this.messages[i].timer / 30;
            }
            if (this.messages[i].timer <= 0) {
                this.messages.splice(i, 1);
            }
        }
    }

    /**
     * Render the entire HUD
     */
    render(ctx, gameState) {
        ctx.save();

        // Render cycle counter (top center)
        this.renderCycles(ctx, gameState.cycles);

        // Render health bar (top left)
        this.renderHealth(ctx, gameState.player);

        // Render blade indicator (top left, under health)
        this.renderBladeIndicator(ctx, gameState.player);

        // Render zone/room indicator (top right)
        this.renderZoneIndicator(ctx, gameState.currentZone, gameState.currentRoom);

        // Render messages (center)
        this.renderMessages(ctx);

        // Render controls hint (bottom)
        if (gameState.showControls) {
            this.renderControlsHint(ctx);
        }

        ctx.restore();
    }

    /**
     * Render cycle counter
     */
    renderCycles(ctx, cyclesSystem) {
        const cycles = cyclesSystem.getCycles();
        const color = cyclesSystem.getColor();
        const flash = cyclesSystem.shouldFlash();

        // Position (top center)
        const x = this.width / 2;
        const y = this.padding + 20;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px "Courier New", monospace';

        // Glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = flash ? 20 : 10;

        // Flash effect
        if (flash) {
            ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.5;
        }

        // Label
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('PROCESSING CYCLES', x, y - 20);

        // Value
        ctx.font = 'bold 32px "Courier New", monospace';
        ctx.fillStyle = color;
        ctx.fillText(Utils.padNumber(cycles, 4), x, y);

        // Change indicator
        if (cyclesSystem.changeDisplayTimer > 0) {
            const changeAlpha = cyclesSystem.changeDisplayTimer / 60;
            const changeColor = cyclesSystem.lastChangeAmount > 0 ? '#00ff88' : '#ff4444';
            const changeText = cyclesSystem.lastChangeAmount > 0
                ? '+' + Math.floor(cyclesSystem.lastChangeAmount)
                : Math.floor(cyclesSystem.lastChangeAmount);

            ctx.font = '16px "Courier New", monospace';
            ctx.fillStyle = changeColor;
            ctx.globalAlpha = changeAlpha;
            ctx.fillText(changeText, x + 80, y);
        }

        ctx.restore();
    }

    /**
     * Render health bar
     */
    renderHealth(ctx, player) {
        if (!player) return;

        const x = this.padding;
        const y = this.padding;
        const barWidth = 150;
        const barHeight = 12;

        const healthPercent = player.health / player.maxHealth;
        const healthColor = healthPercent > 0.3
            ? GAME_CONFIG.COLORS.HEALTH
            : GAME_CONFIG.COLORS.HEALTH_LOW;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health fill
        ctx.fillStyle = healthColor;
        ctx.shadowColor = healthColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Label
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
        ctx.fillText('INTEGRITY', x, y + barHeight + 12);

        ctx.restore();
    }

    /**
     * Render blade type indicator
     */
    renderBladeIndicator(ctx, player) {
        if (!player) return;

        const x = this.padding;
        const y = this.padding + 50;

        ctx.save();

        // Blade icon (simplified sword shape)
        ctx.strokeStyle = GAME_CONFIG.COLORS.BLADE;
        ctx.shadowColor = GAME_CONFIG.COLORS.BLADE;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x + 30, y + 10);
        ctx.lineTo(x + 35, y + 8);
        ctx.lineTo(x + 30, y + 10);
        ctx.lineTo(x + 35, y + 12);
        ctx.stroke();

        // Handle
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN_DIM;
        ctx.fillRect(x - 5, y + 7, 8, 6);

        // Label
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'left';
        ctx.shadowBlur = 0;
        ctx.fillText('BLADE: ' + player.bladeType.toUpperCase(), x + 45, y + 14);

        ctx.restore();
    }

    /**
     * Render zone and room indicator
     */
    renderZoneIndicator(ctx, zone, room) {
        const x = this.width - this.padding;
        const y = this.padding;

        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = '12px "Courier New", monospace';

        // Zone name
        ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 5;
        ctx.fillText(zone || 'TRAINING GRID', x, y + 12);

        // Room indicator
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(room || 'ROOM 01', x, y + 28);

        ctx.restore();
    }

    /**
     * Render temporary messages
     */
    renderMessages(ctx) {
        const centerX = this.width / 2;
        let y = this.height / 3;

        ctx.save();
        ctx.textAlign = 'center';

        for (const msg of this.messages) {
            ctx.globalAlpha = msg.alpha;

            // Style based on type
            switch (msg.type) {
                case 'warning':
                    ctx.font = 'bold 24px "Courier New", monospace';
                    ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
                    ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
                    break;
                case 'success':
                    ctx.font = 'bold 20px "Courier New", monospace';
                    ctx.fillStyle = GAME_CONFIG.COLORS.HEALTH;
                    ctx.shadowColor = GAME_CONFIG.COLORS.HEALTH;
                    break;
                case 'system':
                    ctx.font = 'bold 18px "Courier New", monospace';
                    ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
                    ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
                    break;
                default:
                    ctx.font = '16px "Courier New", monospace';
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#ffffff';
            }

            ctx.shadowBlur = 10;
            ctx.fillText(msg.text, centerX, y);
            y += 35;
        }

        ctx.restore();
    }

    /**
     * Render controls hint
     */
    renderControlsHint(ctx) {
        const y = this.height - this.padding - 20;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';

        ctx.fillText(
            '[←→/AD] MOVE   [SPACE] JUMP   [J/Z] ATTACK   [K/X] SPECIAL   [E] INTERACT',
            this.width / 2,
            y
        );

        ctx.restore();
    }

    /**
     * Render scanline effect
     */
    renderScanlines(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';

        for (let y = 0; y < this.height; y += 2) {
            ctx.fillRect(0, y, this.width, 1);
        }

        ctx.restore();
    }

    /**
     * Resize HUD
     */
    resize(width, height) {
        this.width = width;
        this.height = height;
    }
}
