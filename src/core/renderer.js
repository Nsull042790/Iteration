/**
 * ITERATION - Renderer
 * Handles all drawing operations with visual effects
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Scaling for responsive display
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Effects
        this.scanlineOpacity = 0.03;
        this.vignetteOpacity = 0.3;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;

        // Screen flash
        this.flashColor = null;
        this.flashAlpha = 0;

        this.setupCanvas();
    }

    /**
     * Setup canvas for crisp pixel rendering
     */
    setupCanvas() {
        // Disable image smoothing for crisp pixels
        this.ctx.imageSmoothingEnabled = false;
    }

    /**
     * Resize canvas to fit window while maintaining aspect ratio
     */
    resize() {
        const targetWidth = GAME_CONFIG.CANVAS_WIDTH;
        const targetHeight = GAME_CONFIG.CANVAS_HEIGHT;
        const targetRatio = targetWidth / targetHeight;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const windowRatio = windowWidth / windowHeight;

        let newWidth, newHeight;

        if (windowRatio > targetRatio) {
            // Window is wider than target
            newHeight = windowHeight;
            newWidth = newHeight * targetRatio;
        } else {
            // Window is taller than target
            newWidth = windowWidth;
            newHeight = newWidth / targetRatio;
        }

        // Set canvas size
        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;

        // Set display size via CSS
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';

        // Calculate scale and offset for input handling
        this.scale = targetWidth / newWidth;
        this.offsetX = (windowWidth - newWidth) / 2;
        this.offsetY = (windowHeight - newHeight) / 2;

        // Re-setup canvas context after resize
        this.setupCanvas();
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = GAME_CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Begin frame rendering
     */
    beginFrame() {
        this.clear();
    }

    /**
     * End frame rendering with effects
     */
    endFrame() {
        // Apply post-processing effects
        this.renderScanlines();
        this.renderVignette();
        this.renderFlash();

        if (this.glitchIntensity > 0) {
            this.renderGlitch();
        }
    }

    /**
     * Render scanline effect
     */
    renderScanlines() {
        this.ctx.save();
        this.ctx.fillStyle = `rgba(0, 0, 0, ${this.scanlineOpacity})`;

        for (let y = 0; y < this.canvas.height; y += 2) {
            this.ctx.fillRect(0, y, this.canvas.width, 1);
        }

        this.ctx.restore();
    }

    /**
     * Render vignette effect
     */
    renderVignette() {
        const gradient = this.ctx.createRadialGradient(
            this.canvas.width / 2,
            this.canvas.height / 2,
            0,
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas.width * 0.7
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.vignetteOpacity})`);

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render screen flash effect
     */
    renderFlash() {
        if (this.flashAlpha > 0) {
            this.ctx.save();
            this.ctx.fillStyle = this.flashColor || '#ffffff';
            this.ctx.globalAlpha = this.flashAlpha;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();

            this.flashAlpha -= 0.05;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    }

    /**
     * Render glitch effect
     */
    renderGlitch() {
        if (this.glitchTimer > 0) {
            this.glitchTimer--;

            // Random horizontal slice displacement
            const sliceHeight = Utils.randomInt(5, 30);
            const sliceY = Utils.randomInt(0, this.canvas.height - sliceHeight);
            const displacement = Utils.randomInt(-20, 20) * this.glitchIntensity;

            // Get image data and shift it
            try {
                const imageData = this.ctx.getImageData(
                    0, sliceY, this.canvas.width, sliceHeight
                );
                this.ctx.putImageData(imageData, displacement, sliceY);
            } catch (e) {
                // Security error on some browsers
            }

            // Color channel separation
            if (Math.random() > 0.7) {
                this.ctx.save();
                this.ctx.globalCompositeOperation = 'screen';
                this.ctx.globalAlpha = 0.1 * this.glitchIntensity;

                // Red channel shift
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(
                    Utils.randomInt(-5, 5),
                    0,
                    this.canvas.width,
                    this.canvas.height
                );

                // Cyan channel shift
                this.ctx.fillStyle = '#00ffff';
                this.ctx.fillRect(
                    Utils.randomInt(-5, 5),
                    0,
                    this.canvas.width,
                    this.canvas.height
                );

                this.ctx.restore();
            }

            // Decay glitch
            if (this.glitchTimer === 0) {
                this.glitchIntensity = 0;
            }
        }
    }

    /**
     * Trigger a screen flash
     */
    flash(color = '#ffffff', intensity = 0.5) {
        this.flashColor = color;
        this.flashAlpha = intensity;
    }

    /**
     * Trigger a glitch effect
     */
    glitch(intensity = 1, duration = 10) {
        this.glitchIntensity = intensity;
        this.glitchTimer = duration;
    }

    /**
     * Draw text with glow effect
     */
    drawGlowText(text, x, y, options = {}) {
        const {
            font = '16px "Courier New", monospace',
            color = GAME_CONFIG.COLORS.CYAN,
            glowColor = color,
            glowBlur = 10,
            align = 'left',
            baseline = 'top'
        } = options;

        this.ctx.save();
        this.ctx.font = font;
        this.ctx.textAlign = align;
        this.ctx.textBaseline = baseline;
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = glowColor;
        this.ctx.shadowBlur = glowBlur;
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }

    /**
     * Draw a glowing line
     */
    drawGlowLine(x1, y1, x2, y2, options = {}) {
        const {
            color = GAME_CONFIG.COLORS.CYAN,
            width = 2,
            glowBlur = 10
        } = options;

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = glowBlur;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * Get the 2D context
     */
    getContext() {
        return this.ctx;
    }

    /**
     * Convert screen coordinates to game coordinates
     */
    screenToGame(screenX, screenY) {
        return {
            x: (screenX - this.offsetX) * this.scale,
            y: (screenY - this.offsetY) * this.scale
        };
    }
}
