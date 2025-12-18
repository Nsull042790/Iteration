/**
 * ITERATION - Advanced Renderer
 * Handles all drawing operations with cinematic visual effects
 * Vaporwave/Synthwave aesthetic with CRT simulation
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Scaling for responsive display
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Effect intensities (adjustable)
        this.effects = {
            scanlines: true,
            scanlineOpacity: 0.04,
            vignette: true,
            vignetteOpacity: 0.4,
            chromaticAberration: true,
            aberrationOffset: 2,
            bloom: true,
            bloomIntensity: 0.15,
            colorGrading: true,
            crtCurvature: false, // Can be toggled
            filmGrain: true,
            grainOpacity: 0.03
        };

        // Glitch system
        this.glitchIntensity = 0;
        this.glitchTimer = 0;

        // Screen flash
        this.flashColor = null;
        this.flashAlpha = 0;

        // Animation time for effects
        this.time = 0;

        // Background layers
        this.backgroundLayers = {
            stars: this.generateStarField(200),
            grid: true,
            particles: this.generateAmbientParticles(50),
            kanji: this.generateKanjiRain(30)
        };

        // Boss kanji rain effect (intense matrix-style rain when boss appears)
        this.bossKanjiRain = {
            active: false,
            columns: [],
            timer: 0,
            duration: 180, // 3 seconds at 60fps
            intensity: 1
        };

        // Create offscreen buffer for effects
        this.effectBuffer = document.createElement('canvas');
        this.effectBuffer.width = canvas.width;
        this.effectBuffer.height = canvas.height;
        this.effectCtx = this.effectBuffer.getContext('2d');

        this.setupCanvas();
    }

    /**
     * Generate star field for background
     */
    generateStarField(count) {
        const stars = [];
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                y: Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                size: Math.random() * 2 + 0.5,
                brightness: Math.random() * 0.5 + 0.3,
                twinkleSpeed: Math.random() * 0.05 + 0.02,
                color: Math.random() > 0.7 ? '#ff71ce' : (Math.random() > 0.5 ? '#01cdfe' : '#ffffff')
            });
        }
        return stars;
    }

    /**
     * Generate ambient floating particles
     */
    generateAmbientParticles(count) {
        const particles = [];
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                y: Math.random() * GAME_CONFIG.CANVAS_HEIGHT,
                vx: (Math.random() - 0.5) * 0.5,
                vy: -Math.random() * 0.5 - 0.2,
                size: Math.random() * 3 + 1,
                opacity: Math.random() * 0.3 + 0.1,
                color: ['#ff71ce', '#01cdfe', '#b967ff', '#05ffa1'][Math.floor(Math.random() * 4)]
            });
        }
        return particles;
    }

    /**
     * Generate kanji rain columns
     */
    generateKanjiRain(columns) {
        const kanji = [];
        const kanjiChars = "零一二三四五六七八九十百千万億兆京垓秭穣溝澗正載極恒河沙阿僧祇那由他不可思議無量大数";
        const katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
        const allChars = kanjiChars + katakana;

        for (let i = 0; i < columns; i++) {
            const chars = [];
            const length = Math.floor(Math.random() * 15) + 8;
            for (let j = 0; j < length; j++) {
                chars.push(allChars[Math.floor(Math.random() * allChars.length)]);
            }
            kanji.push({
                x: Math.random() * GAME_CONFIG.CANVAS_WIDTH,
                y: Math.random() * -500,
                chars: chars,
                speed: Math.random() * 1.5 + 0.5,
                opacity: Math.random() * 0.15 + 0.05,
                fontSize: Math.floor(Math.random() * 8) + 12
            });
        }
        return kanji;
    }

    /**
     * Setup canvas for crisp pixel rendering
     */
    setupCanvas() {
        this.ctx.imageSmoothingEnabled = false;
        this.effectCtx.imageSmoothingEnabled = false;
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
            newHeight = windowHeight;
            newWidth = newHeight * targetRatio;
        } else {
            newWidth = windowWidth;
            newHeight = newWidth / targetRatio;
        }

        this.canvas.width = targetWidth;
        this.canvas.height = targetHeight;
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';

        // Update effect buffer size
        this.effectBuffer.width = targetWidth;
        this.effectBuffer.height = targetHeight;

        this.scale = targetWidth / newWidth;
        this.offsetX = (windowWidth - newWidth) / 2;
        this.offsetY = (windowHeight - newHeight) / 2;

        this.setupCanvas();
    }

    /**
     * Clear the canvas
     */
    clear() {
        // Deep space gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#0a0a12');
        gradient.addColorStop(0.5, '#0d0815');
        gradient.addColorStop(1, '#120a18');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Begin frame rendering
     */
    beginFrame() {
        this.time++;
        this.clear();
        this.renderBackgroundLayers();
    }

    /**
     * Render all background visual layers
     */
    renderBackgroundLayers() {
        this.renderStarField();
        this.renderSynthwaveGrid();
        this.renderKanjiRain();
        this.renderAmbientParticles();
    }

    /**
     * Render twinkling star field
     */
    renderStarField() {
        const ctx = this.ctx;
        ctx.save();

        this.backgroundLayers.stars.forEach(star => {
            const twinkle = Math.sin(this.time * star.twinkleSpeed) * 0.3 + 0.7;
            ctx.globalAlpha = star.brightness * twinkle;
            ctx.fillStyle = star.color;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();

            // Add glow to brighter stars
            if (star.brightness > 0.5) {
                ctx.shadowColor = star.color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        });

        ctx.restore();
    }

    /**
     * Render synthwave grid horizon
     */
    renderSynthwaveGrid() {
        if (!this.backgroundLayers.grid) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const horizonY = h * 0.85;

        ctx.save();
        ctx.globalAlpha = 0.15;

        // Horizontal lines (perspective)
        const lineCount = 15;
        for (let i = 0; i < lineCount; i++) {
            const progress = i / lineCount;
            const y = horizonY + (h - horizonY) * Math.pow(progress, 1.5);
            const alpha = 0.1 + progress * 0.3;

            ctx.strokeStyle = `rgba(255, 113, 206, ${alpha})`;
            ctx.lineWidth = 1 + progress;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Vertical lines (converging to horizon)
        const vLineCount = 20;
        const vanishX = w / 2;
        const animOffset = (this.time * 2) % (w / vLineCount);

        for (let i = -vLineCount; i <= vLineCount; i++) {
            const baseX = vanishX + i * (w / vLineCount) + animOffset;
            const bottomX = vanishX + (baseX - vanishX) * 3;

            ctx.strokeStyle = 'rgba(1, 205, 254, 0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(vanishX, horizonY);
            ctx.lineTo(bottomX, h);
            ctx.stroke();
        }

        // Horizon glow
        const horizonGradient = ctx.createLinearGradient(0, horizonY - 50, 0, horizonY + 20);
        horizonGradient.addColorStop(0, 'rgba(255, 113, 206, 0)');
        horizonGradient.addColorStop(0.5, 'rgba(255, 113, 206, 0.3)');
        horizonGradient.addColorStop(1, 'rgba(255, 113, 206, 0)');
        ctx.fillStyle = horizonGradient;
        ctx.fillRect(0, horizonY - 50, w, 70);

        ctx.restore();
    }

    /**
     * Render Japanese kanji rain (aesthetic overlay)
     */
    renderKanjiRain() {
        const ctx = this.ctx;
        ctx.save();

        this.backgroundLayers.kanji.forEach(column => {
            // Update position
            column.y += column.speed;
            if (column.y > this.canvas.height + 200) {
                column.y = -column.chars.length * column.fontSize;
                column.x = Math.random() * this.canvas.width;
            }

            ctx.font = `${column.fontSize}px "MS Gothic", "Yu Gothic", monospace`;

            column.chars.forEach((char, i) => {
                const y = column.y + i * column.fontSize;
                if (y > -column.fontSize && y < this.canvas.height + column.fontSize) {
                    // First character is brightest
                    const charAlpha = i === 0 ? column.opacity * 2 : column.opacity * (1 - i * 0.05);
                    ctx.fillStyle = i === 0
                        ? `rgba(255, 113, 206, ${Math.min(charAlpha, 0.4)})`
                        : `rgba(1, 205, 254, ${Math.max(charAlpha, 0.02)})`;
                    ctx.fillText(char, column.x, y);
                }
            });
        });

        ctx.restore();
    }

    /**
     * Render ambient floating particles
     */
    renderAmbientParticles() {
        const ctx = this.ctx;
        ctx.save();

        this.backgroundLayers.particles.forEach(p => {
            // Update position
            p.x += p.vx;
            p.y += p.vy;

            // Wrap around
            if (p.y < -10) {
                p.y = this.canvas.height + 10;
                p.x = Math.random() * this.canvas.width;
            }
            if (p.x < -10) p.x = this.canvas.width + 10;
            if (p.x > this.canvas.width + 10) p.x = -10;

            // Draw particle with glow
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }

    /**
     * End frame rendering with post-processing effects
     */
    endFrame() {
        // Render boss kanji rain effect (on top of game, before post-processing)
        this.renderBossKanjiRain();

        // Apply all post-processing effects
        if (this.effects.chromaticAberration) {
            this.renderChromaticAberration();
        }

        if (this.effects.bloom) {
            this.renderBloom();
        }

        if (this.effects.colorGrading) {
            this.renderColorGrading();
        }

        if (this.effects.scanlines) {
            this.renderScanlines();
        }

        if (this.effects.filmGrain) {
            this.renderFilmGrain();
        }

        this.renderVignette();
        this.renderFlash();

        if (this.glitchIntensity > 0) {
            this.renderGlitch();
        }

        // Render screen border glow
        this.renderScreenBorder();
    }

    /**
     * Render chromatic aberration (RGB split)
     */
    renderChromaticAberration() {
        const offset = this.effects.aberrationOffset;
        const ctx = this.ctx;

        // This creates a subtle RGB split effect at edges
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.03;

        // Red channel shift
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(offset, 0, this.canvas.width, this.canvas.height);

        // Blue channel shift
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(-offset, 0, this.canvas.width, this.canvas.height);

        ctx.restore();
    }

    /**
     * Render bloom/glow effect
     */
    renderBloom() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.effects.bloomIntensity;

        // Create soft glow overlay
        ctx.filter = 'blur(8px)';
        ctx.drawImage(this.canvas, 0, 0);
        ctx.filter = 'none';

        ctx.restore();
    }

    /**
     * Apply vaporwave color grading
     */
    renderColorGrading() {
        const ctx = this.ctx;
        ctx.save();

        // Add subtle pink/cyan tint
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.05;

        // Pink tint on top half
        const pinkGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        pinkGradient.addColorStop(0, '#ff71ce');
        pinkGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = pinkGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Cyan tint on bottom half
        ctx.globalAlpha = 0.03;
        const cyanGradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        cyanGradient.addColorStop(0, 'transparent');
        cyanGradient.addColorStop(1, '#01cdfe');
        ctx.fillStyle = cyanGradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.restore();
    }

    /**
     * Render enhanced scanlines
     */
    renderScanlines() {
        const ctx = this.ctx;
        ctx.save();

        // Horizontal scanlines
        ctx.fillStyle = `rgba(0, 0, 0, ${this.effects.scanlineOpacity})`;
        for (let y = 0; y < this.canvas.height; y += 3) {
            ctx.fillRect(0, y, this.canvas.width, 1);
        }

        // Subtle moving scanline
        const scanY = (this.time * 2) % this.canvas.height;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.fillRect(0, scanY, this.canvas.width, 2);

        ctx.restore();
    }

    /**
     * Render film grain effect
     */
    renderFilmGrain() {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.effects.grainOpacity;

        // Create noise pattern
        const imageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 16) { // Skip pixels for performance
            const noise = (Math.random() - 0.5) * 30;
            data[i] += noise;     // R
            data[i + 1] += noise; // G
            data[i + 2] += noise; // B
        }

        ctx.putImageData(imageData, 0, 0);
        ctx.restore();
    }

    /**
     * Render vignette effect with color
     */
    renderVignette() {
        if (!this.effects.vignette) return;

        const ctx = this.ctx;
        const gradient = ctx.createRadialGradient(
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas.width * 0.2,
            this.canvas.width / 2,
            this.canvas.height / 2,
            this.canvas.width * 0.8
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.1)');
        gradient.addColorStop(0.8, `rgba(10, 0, 20, ${this.effects.vignetteOpacity * 0.7})`);
        gradient.addColorStop(1, `rgba(20, 0, 30, ${this.effects.vignetteOpacity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render screen border glow
     */
    renderScreenBorder() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const borderSize = 3;

        ctx.save();

        // Top border - pink
        let gradient = ctx.createLinearGradient(0, 0, 0, borderSize * 3);
        gradient.addColorStop(0, 'rgba(255, 113, 206, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 113, 206, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, borderSize * 3);

        // Bottom border - cyan
        gradient = ctx.createLinearGradient(0, h - borderSize * 3, 0, h);
        gradient.addColorStop(0, 'rgba(1, 205, 254, 0)');
        gradient.addColorStop(1, 'rgba(1, 205, 254, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, h - borderSize * 3, w, borderSize * 3);

        // Animated corner accents
        const pulse = Math.sin(this.time * 0.05) * 0.2 + 0.8;
        ctx.strokeStyle = `rgba(185, 103, 255, ${0.5 * pulse})`;
        ctx.lineWidth = 2;

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(0, 30);
        ctx.lineTo(0, 0);
        ctx.lineTo(30, 0);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(w - 30, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, 30);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(0, h - 30);
        ctx.lineTo(0, h);
        ctx.lineTo(30, h);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(w - 30, h);
        ctx.lineTo(w, h);
        ctx.lineTo(w, h - 30);
        ctx.stroke();

        ctx.restore();
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

            const ctx = this.ctx;

            // Random horizontal slice displacement
            const sliceCount = Math.floor(this.glitchIntensity * 5);
            for (let i = 0; i < sliceCount; i++) {
                const sliceHeight = Utils.randomInt(5, 40);
                const sliceY = Utils.randomInt(0, this.canvas.height - sliceHeight);
                const displacement = Utils.randomInt(-30, 30) * this.glitchIntensity;

                try {
                    const imageData = ctx.getImageData(0, sliceY, this.canvas.width, sliceHeight);
                    ctx.putImageData(imageData, displacement, sliceY);
                } catch (e) {}
            }

            // Color channel separation
            if (Math.random() > 0.5) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.15 * this.glitchIntensity;

                ctx.fillStyle = '#ff0000';
                ctx.fillRect(Utils.randomInt(-10, 10), 0, this.canvas.width, this.canvas.height);

                ctx.fillStyle = '#00ffff';
                ctx.fillRect(Utils.randomInt(-10, 10), 0, this.canvas.width, this.canvas.height);

                ctx.restore();
            }

            // Random blocks
            if (Math.random() > 0.7) {
                ctx.save();
                for (let i = 0; i < 5; i++) {
                    ctx.fillStyle = ['#ff71ce', '#01cdfe', '#ffffff'][Math.floor(Math.random() * 3)];
                    ctx.globalAlpha = Math.random() * 0.3;
                    ctx.fillRect(
                        Math.random() * this.canvas.width,
                        Math.random() * this.canvas.height,
                        Math.random() * 100 + 20,
                        Math.random() * 10 + 2
                    );
                }
                ctx.restore();
            }

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
     * Trigger boss kanji rain effect (matrix-style intense rain)
     */
    triggerBossKanjiRain(duration = 180) {
        const kanjiChars = "零一二三四五六七八九十百千万億兆京垓秭穣溝澗正載極恒河沙阿僧祇那由他不可思議無量大数";
        const katakana = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン";
        const allChars = kanjiChars + katakana;

        // Generate intense rain columns (more and faster than background)
        const columns = [];
        const numColumns = 60; // More columns for intensity

        for (let i = 0; i < numColumns; i++) {
            const chars = [];
            const length = Math.floor(Math.random() * 20) + 10;
            for (let j = 0; j < length; j++) {
                chars.push(allChars[Math.floor(Math.random() * allChars.length)]);
            }
            columns.push({
                x: (i / numColumns) * this.canvas.width + Math.random() * 20 - 10,
                y: Math.random() * -800 - 100,
                chars: chars,
                speed: Math.random() * 8 + 4, // Much faster
                opacity: Math.random() * 0.6 + 0.3, // More visible
                fontSize: Math.floor(Math.random() * 10) + 16
            });
        }

        this.bossKanjiRain = {
            active: true,
            columns: columns,
            timer: 0,
            duration: duration,
            intensity: 1
        };
    }

    /**
     * Update and render boss kanji rain
     */
    renderBossKanjiRain() {
        if (!this.bossKanjiRain.active) return;

        const ctx = this.ctx;
        const rain = this.bossKanjiRain;

        // Update timer and intensity
        rain.timer++;

        // Fade out in last 60 frames
        if (rain.timer > rain.duration - 60) {
            rain.intensity = (rain.duration - rain.timer) / 60;
        }

        // End effect
        if (rain.timer >= rain.duration) {
            rain.active = false;
            return;
        }

        ctx.save();

        // Dark overlay for dramatic effect
        ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * rain.intensity})`;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        rain.columns.forEach(column => {
            // Update position
            column.y += column.speed;
            if (column.y > this.canvas.height + 300) {
                column.y = -column.chars.length * column.fontSize - Math.random() * 200;
            }

            ctx.font = `bold ${column.fontSize}px "MS Gothic", "Yu Gothic", monospace`;

            column.chars.forEach((char, i) => {
                const y = column.y + i * column.fontSize;
                if (y > -column.fontSize && y < this.canvas.height + column.fontSize) {
                    // First character is brightest (leading edge)
                    const charAlpha = i === 0
                        ? column.opacity * rain.intensity
                        : column.opacity * (1 - i * 0.04) * rain.intensity;

                    // Vaporwave colors - pink leading, cyan trail
                    if (i === 0) {
                        ctx.fillStyle = `rgba(255, 113, 206, ${Math.min(charAlpha * 1.5, 1)})`;
                        ctx.shadowColor = '#ff71ce';
                        ctx.shadowBlur = 15;
                    } else if (i < 3) {
                        ctx.fillStyle = `rgba(185, 103, 255, ${charAlpha})`;
                        ctx.shadowColor = '#b967ff';
                        ctx.shadowBlur = 8;
                    } else {
                        ctx.fillStyle = `rgba(1, 205, 254, ${Math.max(charAlpha, 0.05)})`;
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                    }

                    ctx.fillText(char, column.x, y);
                }
            });
        });

        ctx.restore();
    }

    /**
     * Draw text with glow effect
     */
    drawGlowText(text, x, y, options = {}) {
        const {
            font = '16px "Share Tech Mono", monospace',
            color = '#00f0ff',
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
            color = '#00f0ff',
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
     * Toggle effect on/off
     */
    toggleEffect(effectName, value = null) {
        if (this.effects.hasOwnProperty(effectName)) {
            this.effects[effectName] = value !== null ? value : !this.effects[effectName];
        }
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
