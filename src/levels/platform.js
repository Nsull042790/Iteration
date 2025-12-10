/**
 * ITERATION - Platform Class
 * Handles solid and one-way platforms
 */

class Platform {
    constructor(x, y, width, height, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // Platform type
        this.oneWay = options.oneWay || false;
        this.moving = options.moving || false;
        this.deadly = options.deadly || false;
        this.invisible = options.invisible || false;

        // State
        this.active = true;

        // Visual style
        this.style = options.style || 'solid'; // solid, grid, energy
        this.glowIntensity = options.glowIntensity || 1;

        // Moving platform properties
        if (this.moving) {
            this.moveStartX = x;
            this.moveStartY = y;
            this.moveEndX = options.moveEndX || x;
            this.moveEndY = options.moveEndY || y;
            this.moveSpeed = options.moveSpeed || 2;
            this.moveProgress = 0;
            this.moveDirection = 1;
        }

        // Animation
        this.pulsePhase = Math.random() * Math.PI * 2;
    }

    /**
     * Get bounding box
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Update platform state
     */
    update(deltaTime) {
        if (!this.active) return;

        // Update moving platforms
        if (this.moving) {
            this.moveProgress += this.moveSpeed * this.moveDirection * 0.01;

            if (this.moveProgress >= 1) {
                this.moveProgress = 1;
                this.moveDirection = -1;
            } else if (this.moveProgress <= 0) {
                this.moveProgress = 0;
                this.moveDirection = 1;
            }

            // Smooth interpolation
            const t = (1 - Math.cos(this.moveProgress * Math.PI)) / 2;
            this.x = Utils.lerp(this.moveStartX, this.moveEndX, t);
            this.y = Utils.lerp(this.moveStartY, this.moveEndY, t);
        }

        // Update pulse animation
        this.pulsePhase += 0.05;
    }

    /**
     * Render the platform
     */
    render(ctx, camera) {
        if (!this.active || this.invisible) return;

        const screenPos = camera.worldToScreen(this.x, this.y);

        // Check if visible
        if (!camera.isVisible(this.x, this.y, this.width, this.height)) {
            return;
        }

        ctx.save();

        // Pulse effect
        const pulse = Math.sin(this.pulsePhase) * 0.2 + 0.8;

        switch (this.style) {
            case 'solid':
                this.renderSolid(ctx, screenPos, pulse);
                break;
            case 'grid':
                this.renderGrid(ctx, screenPos, pulse);
                break;
            case 'energy':
                this.renderEnergy(ctx, screenPos, pulse);
                break;
            default:
                this.renderSolid(ctx, screenPos, pulse);
        }

        // One-way indicator
        if (this.oneWay) {
            this.renderOneWayIndicator(ctx, screenPos);
        }

        // Deadly indicator
        if (this.deadly) {
            this.renderDeadlyIndicator(ctx, screenPos);
        }

        ctx.restore();
    }

    /**
     * Render solid platform style
     */
    renderSolid(ctx, screenPos, pulse) {
        // Main body
        ctx.fillStyle = GAME_CONFIG.COLORS.PLATFORM;
        ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);

        // Top edge glow
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN_DIM;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse * this.glowIntensity;

        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x + this.width, screenPos.y);
        ctx.stroke();

        // Edge highlights
        ctx.strokeStyle = GAME_CONFIG.COLORS.PLATFORM_EDGE;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5 * pulse;

        // Left edge
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + this.height);
        ctx.stroke();

        // Right edge
        ctx.beginPath();
        ctx.moveTo(screenPos.x + this.width, screenPos.y);
        ctx.lineTo(screenPos.x + this.width, screenPos.y + this.height);
        ctx.stroke();
    }

    /**
     * Render grid platform style
     */
    renderGrid(ctx, screenPos, pulse) {
        const tileSize = GAME_CONFIG.ROOM.TILE_SIZE;

        // Background
        ctx.fillStyle = GAME_CONFIG.COLORS.PLATFORM;
        ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);

        // Grid lines
        ctx.strokeStyle = GAME_CONFIG.COLORS.GRID_ACCENT;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;

        // Vertical lines
        for (let x = tileSize; x < this.width; x += tileSize) {
            ctx.beginPath();
            ctx.moveTo(screenPos.x + x, screenPos.y);
            ctx.lineTo(screenPos.x + x, screenPos.y + this.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = tileSize; y < this.height; y += tileSize) {
            ctx.beginPath();
            ctx.moveTo(screenPos.x, screenPos.y + y);
            ctx.lineTo(screenPos.x + this.width, screenPos.y + y);
            ctx.stroke();
        }

        // Top edge
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;

        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x + this.width, screenPos.y);
        ctx.stroke();
    }

    /**
     * Render energy platform style (for moving/special platforms)
     */
    renderEnergy(ctx, screenPos, pulse) {
        // Glow effect
        ctx.shadowColor = GAME_CONFIG.COLORS.CYAN;
        ctx.shadowBlur = 10 * pulse;

        // Energy field
        const gradient = ctx.createLinearGradient(
            screenPos.x, screenPos.y,
            screenPos.x, screenPos.y + this.height
        );
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.6)');
        gradient.addColorStop(0.5, 'rgba(0, 120, 136, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.6)');

        ctx.fillStyle = gradient;
        ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);

        // Border
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.lineWidth = 2;
        ctx.strokeRect(screenPos.x, screenPos.y, this.width, this.height);

        // Energy lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        const lineOffset = (Date.now() / 50) % 20;
        for (let x = -20 + lineOffset; x < this.width + 20; x += 20) {
            ctx.beginPath();
            ctx.moveTo(screenPos.x + x, screenPos.y);
            ctx.lineTo(screenPos.x + x - this.height, screenPos.y + this.height);
            ctx.stroke();
        }
    }

    /**
     * Render one-way platform indicator
     */
    renderOneWayIndicator(ctx, screenPos) {
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = GAME_CONFIG.COLORS.CYAN;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y + 4);
        ctx.lineTo(screenPos.x + this.width, screenPos.y + 4);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    /**
     * Render deadly platform indicator
     */
    renderDeadlyIndicator(ctx, screenPos) {
        ctx.fillStyle = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowColor = GAME_CONFIG.COLORS.MAGENTA;
        ctx.shadowBlur = 10;

        // Spikes
        const spikeWidth = 10;
        const spikeHeight = 8;
        const numSpikes = Math.floor(this.width / spikeWidth);

        for (let i = 0; i < numSpikes; i++) {
            ctx.beginPath();
            ctx.moveTo(screenPos.x + i * spikeWidth, screenPos.y);
            ctx.lineTo(screenPos.x + i * spikeWidth + spikeWidth / 2, screenPos.y - spikeHeight);
            ctx.lineTo(screenPos.x + (i + 1) * spikeWidth, screenPos.y);
            ctx.fill();
        }
    }
}
