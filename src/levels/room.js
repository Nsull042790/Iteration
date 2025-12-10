/**
 * ITERATION - Room Class
 * Contains room layout, platforms, and entities
 */

class Room {
    constructor(width, height, options = {}) {
        this.width = width || GAME_CONFIG.ROOM.WIDTH;
        this.height = height || GAME_CONFIG.ROOM.HEIGHT;

        // Room metadata
        this.name = options.name || 'ROOM';
        this.type = options.type || 'combat'; // combat, traversal, secret, defrag

        // Contents
        this.platforms = [];
        this.enemies = [];
        this.items = [];
        this.triggers = [];

        // Entry/exit points
        this.spawnPoint = { x: 100, y: this.height - 100 };
        this.exits = [];

        // Visual
        this.gridOpacity = 0.15;
        this.ambientColor = GAME_CONFIG.COLORS.BACKGROUND;
    }

    /**
     * Add a platform to the room
     */
    addPlatform(platform) {
        this.platforms.push(platform);
        return platform;
    }

    /**
     * Create platform from parameters
     */
    createPlatform(x, y, width, height, options = {}) {
        const platform = new Platform(x, y, width, height, options);
        this.platforms.push(platform);
        return platform;
    }

    /**
     * Add room boundaries (floor, walls, ceiling)
     */
    addBoundaries(includeWalls = true, includeCeiling = false) {
        const thickness = 32;

        // Floor
        this.createPlatform(0, this.height - thickness, this.width, thickness, {
            style: 'grid'
        });

        if (includeWalls) {
            // Left wall
            this.createPlatform(-thickness, 0, thickness, this.height, {
                style: 'solid'
            });

            // Right wall
            this.createPlatform(this.width, 0, thickness, this.height, {
                style: 'solid'
            });
        }

        if (includeCeiling) {
            // Ceiling
            this.createPlatform(0, -thickness, this.width, thickness, {
                style: 'solid'
            });
        }
    }

    /**
     * Set spawn point
     */
    setSpawnPoint(x, y) {
        this.spawnPoint = { x, y };
    }

    /**
     * Add exit point
     */
    addExit(x, y, width, height, targetRoom) {
        this.exits.push({
            x, y, width, height,
            targetRoom,
            active: true
        });
    }

    /**
     * Update all room contents
     */
    update(deltaTime) {
        // Update platforms
        for (const platform of this.platforms) {
            platform.update(deltaTime);
        }

        // Update enemies
        for (const enemy of this.enemies) {
            enemy.update(deltaTime);
        }

        // Update items
        for (const item of this.items) {
            if (item.update) item.update(deltaTime);
        }
    }

    /**
     * Render room background
     */
    renderBackground(ctx, camera) {
        const camPos = camera.getFinalPosition();

        // Background color
        ctx.fillStyle = this.ambientColor;
        ctx.fillRect(0, 0, camera.width, camera.height);

        // Grid pattern
        this.renderGrid(ctx, camera);
    }

    /**
     * Render background grid
     */
    renderGrid(ctx, camera) {
        const tileSize = GAME_CONFIG.ROOM.TILE_SIZE;
        const camPos = camera.getFinalPosition();

        ctx.strokeStyle = GAME_CONFIG.COLORS.GRID;
        ctx.lineWidth = 1;
        ctx.globalAlpha = this.gridOpacity;

        // Calculate visible grid area
        const startX = Math.floor(camPos.x / tileSize) * tileSize;
        const startY = Math.floor(camPos.y / tileSize) * tileSize;
        const endX = camPos.x + camera.width + tileSize;
        const endY = camPos.y + camera.height + tileSize;

        // Vertical lines
        for (let x = startX; x < endX; x += tileSize) {
            const screenX = x - camPos.x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, camera.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = startY; y < endY; y += tileSize) {
            const screenY = y - camPos.y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(camera.width, screenY);
            ctx.stroke();
        }

        // Accent grid (larger spacing)
        ctx.strokeStyle = GAME_CONFIG.COLORS.GRID_ACCENT;
        ctx.globalAlpha = this.gridOpacity * 0.8;

        const accentSize = tileSize * 4;
        const accentStartX = Math.floor(camPos.x / accentSize) * accentSize;
        const accentStartY = Math.floor(camPos.y / accentSize) * accentSize;

        for (let x = accentStartX; x < endX; x += accentSize) {
            const screenX = x - camPos.x;
            ctx.beginPath();
            ctx.moveTo(screenX, 0);
            ctx.lineTo(screenX, camera.height);
            ctx.stroke();
        }

        for (let y = accentStartY; y < endY; y += accentSize) {
            const screenY = y - camPos.y;
            ctx.beginPath();
            ctx.moveTo(0, screenY);
            ctx.lineTo(camera.width, screenY);
            ctx.stroke();
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Render all platforms
     */
    renderPlatforms(ctx, camera) {
        for (const platform of this.platforms) {
            platform.render(ctx, camera);
        }
    }

    /**
     * Render room contents
     */
    render(ctx, camera) {
        this.renderBackground(ctx, camera);
        this.renderPlatforms(ctx, camera);

        // Render enemies
        for (const enemy of this.enemies) {
            enemy.render(ctx, camera);
        }

        // Render items
        for (const item of this.items) {
            if (item.render) item.render(ctx, camera);
        }

        // Render exits (for debug)
        if (GAME_CONFIG.DEBUG) {
            for (const exit of this.exits) {
                const screenPos = camera.worldToScreen(exit.x, exit.y);
                ctx.strokeStyle = '#00ff00';
                ctx.strokeRect(screenPos.x, screenPos.y, exit.width, exit.height);
            }
        }
    }

    /**
     * Get all active platforms
     */
    getActivePlatforms() {
        return this.platforms.filter(p => p.active);
    }
}

/**
 * Create a test room for development
 */
function createTestRoom() {
    const room = new Room(GAME_CONFIG.ROOM.WIDTH * 1.5, GAME_CONFIG.ROOM.HEIGHT);
    room.name = 'TEST CHAMBER';

    // Floor with grid style
    room.createPlatform(0, room.height - 32, room.width, 32, { style: 'grid' });

    // Walls
    room.createPlatform(-32, 0, 32, room.height, { style: 'solid' });
    room.createPlatform(room.width, 0, 32, room.height, { style: 'solid' });

    // Platforms for testing jumps
    room.createPlatform(200, room.height - 150, 200, 24, { style: 'solid' });
    room.createPlatform(500, room.height - 250, 150, 24, { style: 'solid' });
    room.createPlatform(750, room.height - 180, 180, 24, { style: 'solid' });

    // One-way platform
    room.createPlatform(350, room.height - 350, 120, 16, {
        style: 'energy',
        oneWay: true
    });

    // Higher platforms
    room.createPlatform(100, room.height - 400, 150, 24, { style: 'grid' });
    room.createPlatform(600, room.height - 420, 200, 24, { style: 'solid' });

    // Moving platform
    room.createPlatform(950, room.height - 300, 100, 20, {
        style: 'energy',
        moving: true,
        moveEndX: 1150,
        moveEndY: room.height - 300,
        moveSpeed: 1.5
    });

    // Extended area platforms
    room.createPlatform(1200, room.height - 200, 180, 24, { style: 'solid' });
    room.createPlatform(1450, room.height - 320, 150, 24, { style: 'grid' });
    room.createPlatform(1300, room.height - 450, 120, 24, { style: 'solid' });

    // Small stepping platforms
    room.createPlatform(850, room.height - 100, 60, 20, { style: 'solid' });
    room.createPlatform(1000, room.height - 150, 60, 20, { style: 'solid' });
    room.createPlatform(1100, room.height - 100, 60, 20, { style: 'solid' });

    // Set spawn point
    room.setSpawnPoint(100, room.height - 100);

    return room;
}
