/**
 * ITERATION - Physics System
 * Handles collision detection and resolution
 */

class Physics {
    constructor() {
        this.gravity = GAME_CONFIG.GRAVITY;
        this.maxFallSpeed = GAME_CONFIG.MAX_FALL_SPEED;
    }

    /**
     * Apply gravity to an entity
     */
    applyGravity(entity) {
        if (!entity.isGrounded) {
            entity.velocityY += this.gravity;
            entity.velocityY = Math.min(entity.velocityY, this.maxFallSpeed);
        }
    }

    /**
     * Check and resolve collisions between entity and platforms
     */
    resolveCollisions(entity, platforms) {
        // Reset grounded state
        entity.isGrounded = false;

        // Get entity bounds
        const bounds = entity.getBounds();

        // Check each platform
        for (const platform of platforms) {
            if (!platform.active) continue;

            const platBounds = platform.getBounds();

            // Check for overlap
            if (Utils.rectsOverlap(bounds, platBounds)) {
                // Calculate overlap on each axis
                const overlapLeft = (bounds.x + bounds.width) - platBounds.x;
                const overlapRight = (platBounds.x + platBounds.width) - bounds.x;
                const overlapTop = (bounds.y + bounds.height) - platBounds.y;
                const overlapBottom = (platBounds.y + platBounds.height) - bounds.y;

                // Find minimum overlap
                const minOverlapX = overlapLeft < overlapRight ? -overlapLeft : overlapRight;
                const minOverlapY = overlapTop < overlapBottom ? -overlapTop : overlapBottom;

                // Resolve on axis with smallest overlap
                if (Math.abs(minOverlapX) < Math.abs(minOverlapY)) {
                    // Horizontal collision
                    entity.x += minOverlapX;
                    entity.velocityX = 0;
                } else {
                    // Vertical collision
                    entity.y += minOverlapY;

                    if (minOverlapY < 0) {
                        // Landing on top
                        entity.isGrounded = true;
                        entity.velocityY = 0;
                        entity.coyoteTime = GAME_CONFIG.PLAYER.COYOTE_TIME;
                    } else {
                        // Hitting from below
                        entity.velocityY = 0;
                    }
                }

                // Update bounds after resolution
                bounds.x = entity.x;
                bounds.y = entity.y;
            }
        }

        // Handle one-way platforms (pass through from below)
        for (const platform of platforms) {
            if (!platform.oneWay || !platform.active) continue;

            const platBounds = platform.getBounds();

            // Only collide if coming from above and moving down
            if (entity.velocityY >= 0) {
                const feetY = bounds.y + bounds.height;
                const wasAbove = (feetY - entity.velocityY) <= platBounds.y + 2;

                if (wasAbove && Utils.rectsOverlap(bounds, platBounds)) {
                    entity.y = platBounds.y - entity.height;
                    entity.velocityY = 0;
                    entity.isGrounded = true;
                    entity.coyoteTime = GAME_CONFIG.PLAYER.COYOTE_TIME;
                }
            }
        }

        return entity.isGrounded;
    }

    /**
     * Check if entity would collide at a position
     */
    wouldCollide(entity, x, y, platforms) {
        const testBounds = {
            x: x,
            y: y,
            width: entity.width,
            height: entity.height
        };

        for (const platform of platforms) {
            if (!platform.active) continue;
            if (Utils.rectsOverlap(testBounds, platform.getBounds())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Raycast from point in direction
     */
    raycast(startX, startY, dirX, dirY, maxDistance, platforms) {
        const steps = Math.ceil(maxDistance / 4);
        const stepX = (dirX * maxDistance) / steps;
        const stepY = (dirY * maxDistance) / steps;

        for (let i = 1; i <= steps; i++) {
            const testX = startX + stepX * i;
            const testY = startY + stepY * i;

            for (const platform of platforms) {
                if (!platform.active) continue;
                const bounds = platform.getBounds();
                if (testX >= bounds.x && testX <= bounds.x + bounds.width &&
                    testY >= bounds.y && testY <= bounds.y + bounds.height) {
                    return {
                        hit: true,
                        x: testX,
                        y: testY,
                        distance: Utils.distance(startX, startY, testX, testY),
                        platform: platform
                    };
                }
            }
        }

        return { hit: false };
    }
}
