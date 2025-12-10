/**
 * ITERATION - Camera System
 * Smooth-following camera with bounds
 */

class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;

        // Target to follow
        this.target = null;

        // Smoothing (lower = smoother, higher = snappier)
        this.smoothing = 0.1;

        // Dead zone (area where target can move without camera moving)
        this.deadZone = {
            x: width * 0.1,
            y: height * 0.1
        };

        // Look-ahead (camera leads in direction of movement)
        this.lookAhead = {
            x: 0,
            y: 0,
            maxX: 100,
            maxY: 50,
            speed: 0.05
        };

        // Bounds (room limits)
        this.bounds = null;

        // Shake effect
        this.shake = {
            intensity: 0,
            duration: 0,
            offsetX: 0,
            offsetY: 0
        };
    }

    /**
     * Set target for camera to follow
     */
    setTarget(entity) {
        this.target = entity;
        // Snap to target immediately
        if (entity) {
            this.x = entity.x + entity.width / 2 - this.width / 2;
            this.y = entity.y + entity.height / 2 - this.height / 2;
        }
    }

    /**
     * Set camera bounds (room limits)
     */
    setBounds(minX, minY, maxX, maxY) {
        this.bounds = { minX, minY, maxX, maxY };
    }

    /**
     * Clear camera bounds
     */
    clearBounds() {
        this.bounds = null;
    }

    /**
     * Apply screen shake
     */
    addShake(intensity, duration) {
        this.shake.intensity = Math.max(this.shake.intensity, intensity);
        this.shake.duration = Math.max(this.shake.duration, duration);
    }

    /**
     * Update camera position
     */
    update() {
        if (!this.target) return;

        // Calculate target center
        const targetCenterX = this.target.x + this.target.width / 2;
        const targetCenterY = this.target.y + this.target.height / 2;

        // Update look-ahead based on target velocity
        if (this.target.velocityX !== undefined) {
            const targetLookX = this.target.velocityX * 15;
            this.lookAhead.x = Utils.lerp(
                this.lookAhead.x,
                Utils.clamp(targetLookX, -this.lookAhead.maxX, this.lookAhead.maxX),
                this.lookAhead.speed
            );
        }

        if (this.target.velocityY !== undefined) {
            const targetLookY = this.target.velocityY * 10;
            this.lookAhead.y = Utils.lerp(
                this.lookAhead.y,
                Utils.clamp(targetLookY, -this.lookAhead.maxY, this.lookAhead.maxY),
                this.lookAhead.speed
            );
        }

        // Calculate desired camera position
        const desiredX = targetCenterX + this.lookAhead.x - this.width / 2;
        const desiredY = targetCenterY + this.lookAhead.y - this.height / 2;

        // Smooth interpolation to desired position
        this.x = Utils.lerp(this.x, desiredX, this.smoothing);
        this.y = Utils.lerp(this.y, desiredY, this.smoothing);

        // Apply bounds
        if (this.bounds) {
            this.x = Utils.clamp(
                this.x,
                this.bounds.minX,
                Math.max(this.bounds.minX, this.bounds.maxX - this.width)
            );
            this.y = Utils.clamp(
                this.y,
                this.bounds.minY,
                Math.max(this.bounds.minY, this.bounds.maxY - this.height)
            );
        }

        // Update shake
        if (this.shake.duration > 0) {
            this.shake.offsetX = (Math.random() - 0.5) * 2 * this.shake.intensity;
            this.shake.offsetY = (Math.random() - 0.5) * 2 * this.shake.intensity;
            this.shake.duration--;
            this.shake.intensity *= 0.95; // Decay
        } else {
            this.shake.offsetX = 0;
            this.shake.offsetY = 0;
            this.shake.intensity = 0;
        }
    }

    /**
     * Get final camera position (including shake)
     */
    getFinalPosition() {
        return {
            x: Math.round(this.x + this.shake.offsetX),
            y: Math.round(this.y + this.shake.offsetY)
        };
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY) {
        const pos = this.getFinalPosition();
        return {
            x: worldX - pos.x,
            y: worldY - pos.y
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        const pos = this.getFinalPosition();
        return {
            x: screenX + pos.x,
            y: screenY + pos.y
        };
    }

    /**
     * Check if a rectangle is visible on screen
     */
    isVisible(x, y, width, height) {
        const pos = this.getFinalPosition();
        return (
            x + width > pos.x &&
            x < pos.x + this.width &&
            y + height > pos.y &&
            y < pos.y + this.height
        );
    }
}
