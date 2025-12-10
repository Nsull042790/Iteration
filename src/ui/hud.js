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
        this.progressPulse = 0;

        // Messages
        this.messages = [];
        this.messageTimeout = 180; // 3 seconds at 60fps

        // Boss warning
        this.bossWarningTimer = 0;
        this.bossWarningText = '';
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
     * Show boss warning
     */
    showBossWarning(bossName) {
        this.bossWarningText = bossName;
        this.bossWarningTimer = 180; // 3 seconds
    }

    /**
     * Update HUD animations
     */
    update() {
        // Update pulses
        this.cyclesPulse += 0.1;
        this.healthPulse += 0.08;
        this.progressPulse += 0.15;

        // Update boss warning
        if (this.bossWarningTimer > 0) {
            this.bossWarningTimer--;
        }

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
        this.renderBladeIndicator(ctx, gameState.player, gameState.bladeEvolution);

        // Render zone/room indicator (top right)
        this.renderZoneIndicator(ctx, gameState.currentZone, gameState.currentRoom);

        // Render progression bar (bottom center)
        this.renderProgressBar(ctx, gameState);

        // Render boss health bar if boss is active
        if (gameState.boss && gameState.boss.active) {
            this.renderBossHealth(ctx, gameState.boss);
        }

        // Render boss warning
        if (this.bossWarningTimer > 0) {
            this.renderBossWarning(ctx);
        }

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
     * Render blade type indicator with evolution progress
     */
    renderBladeIndicator(ctx, player, bladeEvolution) {
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

        // Evolution progress bar (if available)
        if (bladeEvolution) {
            const barX = x + 45;
            const barY = y + 20;
            const barWidth = 80;
            const barHeight = 4;
            const progress = bladeEvolution.getProgress();

            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = GAME_CONFIG.COLORS.CYAN;
            ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        }

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

        // Version number
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText('v0.0.3', x, y + 44);

        ctx.restore();
    }

    /**
     * Render room progression bar
     */
    renderProgressBar(ctx, gameState) {
        const barWidth = 300;
        const barHeight = 8;
        const x = (this.width - barWidth) / 2;
        const y = this.height - 60;

        const enemiesKilled = gameState.enemiesKilled || 0;
        const totalEnemies = gameState.totalEnemies || 1;
        const levelComplete = gameState.levelComplete || false;
        const bossActive = gameState.boss && gameState.boss.active;
        const bossSpawned = gameState.bossSpawned || false;

        // Calculate progress
        let progress = enemiesKilled / totalEnemies;
        let label = `TARGETS: ${enemiesKilled}/${totalEnemies}`;
        let color = GAME_CONFIG.COLORS.CYAN;

        if (progress >= 1 && !levelComplete) {
            if (bossActive) {
                label = 'DEFEAT THE BOSS';
                color = GAME_CONFIG.COLORS.MAGENTA;
                progress = 1;
            } else if (bossSpawned) {
                label = 'BOSS INCOMING...';
                color = GAME_CONFIG.COLORS.MAGENTA;
            }
        } else if (levelComplete) {
            label = 'LEVEL CLEARED - USE PORTAL [←]';
            color = GAME_CONFIG.COLORS.HEALTH;
            progress = 1;
        }

        ctx.save();

        // Pulse effect when full
        const pulse = progress >= 1 ? Math.sin(this.progressPulse) * 0.3 + 0.7 : 1;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Progress fill
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10 * pulse;
        ctx.globalAlpha = pulse;
        ctx.fillRect(x, y, barWidth * Math.min(progress, 1), barHeight);

        // Segment markers
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffffff';
        for (let i = 1; i < totalEnemies; i++) {
            const segX = x + (barWidth / totalEnemies) * i;
            ctx.fillRect(segX - 1, y, 2, barHeight);
        }

        // Border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 5;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Label
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 0;
        ctx.fillText(label, this.width / 2, y + barHeight + 14);

        ctx.restore();
    }

    /**
     * Render boss health bar
     */
    renderBossHealth(ctx, boss) {
        const barWidth = 400;
        const barHeight = 16;
        const x = (this.width - barWidth) / 2;
        const y = 110; // Moved down to avoid overlapping with cycles display

        const healthPercent = boss.health / boss.maxHealth;

        ctx.save();

        // Boss name
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.textAlign = 'center';
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 10;
        ctx.fillText(boss.name || 'SYSTEM GUARDIAN', this.width / 2, y - 10);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, barWidth, barHeight);

        // Health fill with gradient
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, GAME_CONFIG.COLORS.MAGENTA);
        gradient.addColorStop(1, '#ff4466');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 15;
        ctx.fillRect(x, y, barWidth * healthPercent, barHeight);

        // Damage flash effect
        if (boss.hitFlash > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = boss.hitFlash / 10;
            ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
        }

        // Border
        ctx.globalAlpha = 1;
        ctx.strokeStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // Health text
        ctx.font = '10px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.fillText(`${Math.ceil(boss.health)} / ${boss.maxHealth}`, this.width / 2, y + barHeight + 12);

        ctx.restore();
    }

    /**
     * Render boss warning overlay
     */
    renderBossWarning(ctx) {
        const alpha = Math.min(this.bossWarningTimer / 60, 1);
        const flash = Math.sin(this.bossWarningTimer * 0.3) > 0;

        ctx.save();

        // Dark overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.5})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Warning text
        ctx.textAlign = 'center';
        ctx.font = 'bold 48px "Courier New", monospace';
        ctx.fillStyle = flash ? GAME_CONFIG.COLORS.MAGENTA : '#ffffff';
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 30;
        ctx.globalAlpha = alpha;

        ctx.fillText('WARNING', this.width / 2, this.height / 2 - 30);

        ctx.font = 'bold 24px "Courier New", monospace';
        ctx.fillText(this.bossWarningText, this.width / 2, this.height / 2 + 20);

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
                case 'evolution':
                    ctx.font = 'bold 22px "Courier New", monospace';
                    ctx.fillStyle = '#ffaa00';
                    ctx.shadowColor = '#ffaa00';
                    break;
                case 'lore':
                    ctx.font = 'italic 14px "Courier New", monospace';
                    ctx.fillStyle = '#8888ff';
                    ctx.shadowColor = '#8888ff';
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
            '[WASD] MOVE   [SPACE] JUMP   [↑→] ATTACK   [↓] SPECIAL   [←] INTERACT',
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
