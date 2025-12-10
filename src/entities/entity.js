/**
 * ITERATION - Base Entity Class
 * Foundation for all game entities
 */

class Entity {
    static nextId = 0;

    constructor(x, y, width, height) {
        this.id = Entity.nextId++;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        // Velocity
        this.velocityX = 0;
        this.velocityY = 0;

        // State
        this.active = true;
        this.isGrounded = false;

        // Physics properties
        this.friction = GAME_CONFIG.FRICTION;
        this.airResistance = GAME_CONFIG.AIR_RESISTANCE;

        // Visual
        this.facingRight = true;
        this.alpha = 1;
    }

    /**
     * Get bounding box for collision
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
     * Get center point
     */
    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }

    /**
     * Apply friction based on grounded state
     */
    applyFriction() {
        if (this.isGrounded) {
            this.velocityX *= this.friction;
        } else {
            this.velocityX *= this.airResistance;
        }

        // Stop very small movements
        if (Math.abs(this.velocityX) < 0.1) {
            this.velocityX = 0;
        }
    }

    /**
     * Update position based on velocity
     */
    updatePosition() {
        this.x += this.velocityX;
        this.y += this.velocityY;
    }

    /**
     * Base update method (override in subclasses)
     */
    update(deltaTime) {
        if (!this.active) return;
        this.applyFriction();
        this.updatePosition();
    }

    /**
     * Base render method (override in subclasses)
     */
    render(ctx, camera) {
        if (!this.active) return;

        // Default rendering (rectangle)
        const screenPos = camera.worldToScreen(this.x, this.y);

        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);
    }

    /**
     * Check collision with another entity
     */
    collidesWith(other) {
        return Utils.rectsOverlap(this.getBounds(), other.getBounds());
    }

    /**
     * Destroy entity
     */
    destroy() {
        this.active = false;
    }
}
