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

        // Data streams - atmospheric background elements
        this.dataStreams = [];
        this.initDataStreams();

        // Floating data nodes
        this.dataNodes = [];
        this.initDataNodes();

        // Scanline effect
        this.scanlineOffset = 0;
    }

    /**
     * Initialize floating data streams
     */
    initDataStreams() {
        const streamCount = 8 + Math.floor(Math.random() * 6);
        for (let i = 0; i < streamCount; i++) {
            this.dataStreams.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                length: 50 + Math.random() * 150,
                speed: 0.5 + Math.random() * 2,
                angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.5, // Mostly vertical
                color: Math.random() > 0.7 ? '#ff00aa' : '#00f0ff',
                opacity: 0.1 + Math.random() * 0.2,
                segments: 3 + Math.floor(Math.random() * 5)
            });
        }
    }

    /**
     * Initialize floating data nodes
     */
    initDataNodes() {
        const nodeCount = 12 + Math.floor(Math.random() * 8);
        for (let i = 0; i < nodeCount; i++) {
            this.dataNodes.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: 2 + Math.random() * 4,
                pulsePhase: Math.random() * Math.PI * 2,
                pulseSpeed: 0.02 + Math.random() * 0.04,
                driftX: (Math.random() - 0.5) * 0.3,
                driftY: (Math.random() - 0.5) * 0.2,
                color: ['#00f0ff', '#ff00aa', '#00ff88', '#ffdd00'][Math.floor(Math.random() * 4)],
                connections: [] // Will be filled after all nodes exist
            });
        }

        // Create some connections between nearby nodes
        for (let i = 0; i < this.dataNodes.length; i++) {
            for (let j = i + 1; j < this.dataNodes.length; j++) {
                const dx = this.dataNodes[i].x - this.dataNodes[j].x;
                const dy = this.dataNodes[i].y - this.dataNodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 200 && Math.random() > 0.7) {
                    this.dataNodes[i].connections.push(j);
                }
            }
        }
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

        // Update data streams
        this.updateDataStreams();

        // Update data nodes
        this.updateDataNodes();

        // Update scanline
        this.scanlineOffset = (this.scanlineOffset + 0.5) % 4;
    }

    /**
     * Update data streams animation
     */
    updateDataStreams() {
        for (const stream of this.dataStreams) {
            // Move along angle
            stream.x += Math.cos(stream.angle) * stream.speed;
            stream.y += Math.sin(stream.angle) * stream.speed;

            // Wrap around
            if (stream.y < -stream.length) {
                stream.y = this.height + stream.length;
                stream.x = Math.random() * this.width;
            }
            if (stream.y > this.height + stream.length) {
                stream.y = -stream.length;
                stream.x = Math.random() * this.width;
            }
        }
    }

    /**
     * Update data nodes animation
     */
    updateDataNodes() {
        for (const node of this.dataNodes) {
            // Pulse
            node.pulsePhase += node.pulseSpeed;

            // Drift
            node.x += node.driftX;
            node.y += node.driftY;

            // Bounce off edges
            if (node.x < 0 || node.x > this.width) node.driftX *= -1;
            if (node.y < 0 || node.y > this.height) node.driftY *= -1;

            // Keep in bounds
            node.x = Math.max(0, Math.min(this.width, node.x));
            node.y = Math.max(0, Math.min(this.height, node.y));
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

        // Data streams (behind everything)
        this.renderDataStreams(ctx, camera);

        // Data nodes and connections
        this.renderDataNodes(ctx, camera);

        // Subtle scanlines overlay
        this.renderScanlines(ctx, camera);
    }

    /**
     * Render floating data streams
     */
    renderDataStreams(ctx, camera) {
        ctx.save();
        const camPos = camera.getFinalPosition();

        for (const stream of this.dataStreams) {
            const screenX = stream.x - camPos.x;
            const screenY = stream.y - camPos.y;

            // Skip if not visible
            if (screenX < -stream.length || screenX > camera.width + stream.length ||
                screenY < -stream.length || screenY > camera.height + stream.length) {
                continue;
            }

            ctx.strokeStyle = stream.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = stream.opacity;

            // Draw segmented stream
            const segmentLength = stream.length / stream.segments;
            for (let i = 0; i < stream.segments; i++) {
                const startOffset = i * segmentLength;
                const endOffset = startOffset + segmentLength * 0.6; // Gap between segments

                ctx.beginPath();
                ctx.moveTo(
                    screenX + Math.cos(stream.angle) * startOffset,
                    screenY + Math.sin(stream.angle) * startOffset
                );
                ctx.lineTo(
                    screenX + Math.cos(stream.angle) * endOffset,
                    screenY + Math.sin(stream.angle) * endOffset
                );
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Render data nodes and their connections
     */
    renderDataNodes(ctx, camera) {
        ctx.save();
        const camPos = camera.getFinalPosition();

        // First render connections
        ctx.lineWidth = 1;
        for (let i = 0; i < this.dataNodes.length; i++) {
            const node = this.dataNodes[i];
            const screenX = node.x - camPos.x;
            const screenY = node.y - camPos.y;

            for (const targetIndex of node.connections) {
                const target = this.dataNodes[targetIndex];
                const targetScreenX = target.x - camPos.x;
                const targetScreenY = target.y - camPos.y;

                // Pulsing connection
                const pulse = (Math.sin(node.pulsePhase) + 1) / 2;
                ctx.strokeStyle = node.color;
                ctx.globalAlpha = 0.1 + pulse * 0.1;

                ctx.beginPath();
                ctx.moveTo(screenX, screenY);
                ctx.lineTo(targetScreenX, targetScreenY);
                ctx.stroke();
            }
        }

        // Then render nodes
        for (const node of this.dataNodes) {
            const screenX = node.x - camPos.x;
            const screenY = node.y - camPos.y;

            // Skip if not visible
            if (screenX < -20 || screenX > camera.width + 20 ||
                screenY < -20 || screenY > camera.height + 20) {
                continue;
            }

            const pulse = (Math.sin(node.pulsePhase) + 1) / 2;
            const currentSize = node.size * (0.8 + pulse * 0.4);

            // Glow
            ctx.shadowColor = node.color;
            ctx.shadowBlur = 10 * pulse;
            ctx.fillStyle = node.color;
            ctx.globalAlpha = 0.3 + pulse * 0.4;

            ctx.beginPath();
            ctx.arc(screenX, screenY, currentSize, 0, Math.PI * 2);
            ctx.fill();

            // Bright center
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            ctx.beginPath();
            ctx.arc(screenX, screenY, currentSize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render subtle scanline effect
     */
    renderScanlines(ctx, camera) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1;

        for (let y = this.scanlineOffset; y < camera.height; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(camera.width, y);
            ctx.stroke();
        }

        ctx.restore();
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
 * Create a test room for development (legacy)
 */
function createTestRoom() {
    return generateRandomRoom(1);
}

/**
 * Generate a random room with procedural platform placement
 */
function generateRandomRoom(level = 1) {
    const room = new Room(GAME_CONFIG.ROOM.WIDTH * 1.5, GAME_CONFIG.ROOM.HEIGHT);
    room.name = 'COMBAT ZONE ' + level;

    // Floor with grid style
    room.createPlatform(0, room.height - 32, room.width, 32, { style: 'grid' });

    // Walls
    room.createPlatform(-32, 0, 32, room.height, { style: 'solid' });
    room.createPlatform(room.width, 0, 32, room.height, { style: 'solid' });

    // Platform generation parameters
    const platformCount = 10 + Math.floor(level * 0.5); // More platforms at higher levels
    const minPlatformWidth = 60;
    const maxPlatformWidth = 180;
    const minHeight = 80;
    const maxHeight = 500;

    // More diverse styles - add cooler ones at higher levels
    const baseStyles = ['solid', 'solid', 'grid', 'circuit'];
    const advancedStyles = ['neon', 'hex', 'energy'];
    const styles = level >= 2 ? [...baseStyles, ...advancedStyles] : baseStyles;

    // Accent colors for variety
    const accentColors = ['#00f0ff', '#ff00aa', '#00ff88', '#ffdd00', '#ff8800'];

    // Track placed platforms to avoid overlap
    const placedPlatforms = [];

    // Create platforms in zones to ensure good distribution
    const zoneCount = 6;
    const zoneWidth = room.width / zoneCount;

    for (let zone = 0; zone < zoneCount; zone++) {
        // 1-2 platforms per zone
        const platformsInZone = zone === 0 ? 1 : Utils.randomInt(1, 2);

        for (let p = 0; p < platformsInZone; p++) {
            if (placedPlatforms.length >= platformCount) break;

            // Random position within zone
            const width = Utils.randomInt(minPlatformWidth, maxPlatformWidth);
            const x = zone * zoneWidth + Utils.random(20, zoneWidth - width - 20);
            const height = Utils.random(minHeight, maxHeight);
            const y = room.height - height;

            // Check for overlap with existing platforms
            let overlaps = false;
            for (const existing of placedPlatforms) {
                if (Math.abs(x - existing.x) < width + 40 &&
                    Math.abs(y - existing.y) < 80) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                const style = styles[Utils.randomInt(0, styles.length - 1)];
                const isOneWay = (style === 'energy' || style === 'neon') && Math.random() > 0.5;
                const accentColor = accentColors[Utils.randomInt(0, accentColors.length - 1)];

                // Vary platform thickness based on style
                const platformHeight = style === 'circuit' || style === 'hex' ? 28 : 24;

                room.createPlatform(x, y, width, platformHeight, {
                    style: style,
                    oneWay: isOneWay,
                    accentColor: style !== 'solid' && style !== 'grid' ? accentColor : null
                });

                placedPlatforms.push({ x, y, width });
            }
        }
    }

    // Add elevated platforms for vertical gameplay
    const elevatedCount = 3 + Math.floor(level * 0.3);
    for (let i = 0; i < elevatedCount; i++) {
        const x = Utils.random(100, room.width - 200);
        const y = room.height - Utils.random(350, 520); // Higher up
        const width = Utils.randomInt(70, 140);
        const style = styles[Utils.randomInt(0, styles.length - 1)];
        const accentColor = accentColors[Utils.randomInt(0, accentColors.length - 1)];

        room.createPlatform(x, y, width, 20, {
            style: style,
            oneWay: true, // Allow jumping through from below
            accentColor: style !== 'solid' && style !== 'grid' ? accentColor : null
        });
    }

    // Add 1-2 moving platforms at higher levels
    if (level >= 2) {
        const movingCount = Math.min(level - 1, 2);
        for (let i = 0; i < movingCount; i++) {
            const startX = Utils.random(300, room.width - 400);
            const y = room.height - Utils.random(200, 400); // More height variety
            const moveDistance = Utils.random(150, 250);
            const accentColor = accentColors[Utils.randomInt(0, accentColors.length - 1)];

            room.createPlatform(startX, y, 100, 20, {
                style: 'neon',
                moving: true,
                moveEndX: startX + moveDistance,
                moveEndY: y,
                moveSpeed: 1 + level * 0.2,
                accentColor: accentColor
            });
        }
    }

    // Add vertical moving platforms for interesting traversal
    if (level >= 3) {
        const verticalPlatform = Utils.random(200, room.width - 300);
        const startY = room.height - 150;

        room.createPlatform(verticalPlatform, startY, 80, 20, {
            style: 'energy',
            moving: true,
            moveEndX: verticalPlatform,
            moveEndY: startY - 300,
            moveSpeed: 1.5
        });
    }

    // Add some small stepping platforms
    const stepCount = Utils.randomInt(2, 4);
    for (let i = 0; i < stepCount; i++) {
        const x = Utils.random(200, room.width - 200);
        const y = room.height - Utils.random(80, 150);
        room.createPlatform(x, y, Utils.randomInt(50, 80), 20, { style: 'solid' });
    }

    // Set spawn point (always near left side)
    room.setSpawnPoint(100, room.height - 100);

    return room;
}
