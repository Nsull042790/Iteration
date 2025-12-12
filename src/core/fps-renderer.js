/**
 * ITERATION - First Person Raycasting Renderer
 * Wolfenstein 3D style raycasting for first-person mode
 */

class FPSRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Raycasting settings
        this.FOV = Math.PI / 3; // 60 degrees field of view
        this.numRays = 320; // Number of rays to cast (resolution)
        this.maxDistance = 1000;

        // Player view
        this.playerX = 0;
        this.playerY = 0;
        this.playerAngle = 0; // Radians, 0 = facing right

        // Wall height settings
        this.wallHeight = 200;
        this.viewDistance = 300;

        // Colors
        this.colors = {
            ceiling: '#0a0a15',
            floor: '#0d0d1a',
            wallNear: '#00f0ff',
            wallFar: '#003344',
            enemy: '#ff00aa',
            boss: '#ff0000'
        };

        // Sprite depth buffer
        this.depthBuffer = [];

        // Mini-map settings
        this.showMiniMap = true;
        this.miniMapScale = 0.1;
        this.miniMapSize = 150;
    }

    /**
     * Update player position and angle
     */
    updatePlayer(x, y, angle) {
        this.playerX = x;
        this.playerY = y;
        this.playerAngle = angle;
    }

    /**
     * Render the first-person view
     */
    render(room, enemies, boss, player, interactables) {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear depth buffer
        this.depthBuffer = new Array(width).fill(this.maxDistance);

        // Draw ceiling
        const ceilingGradient = ctx.createLinearGradient(0, 0, 0, height / 2);
        ceilingGradient.addColorStop(0, '#050508');
        ceilingGradient.addColorStop(1, '#0a0a20');
        ctx.fillStyle = ceilingGradient;
        ctx.fillRect(0, 0, width, height / 2);

        // Draw floor
        const floorGradient = ctx.createLinearGradient(0, height / 2, 0, height);
        floorGradient.addColorStop(0, '#0a0a20');
        floorGradient.addColorStop(1, '#151525');
        ctx.fillStyle = floorGradient;
        ctx.fillRect(0, height / 2, width, height / 2);

        // Cast rays and draw walls
        this.castRays(room, width, height);

        // Render sprites (enemies, interactables)
        this.renderSprites(enemies, boss, interactables, width, height);

        // Draw weapon/hand overlay
        this.drawWeapon(player, width, height);

        // Draw mini-map
        if (this.showMiniMap) {
            this.drawMiniMap(room, enemies, boss, width, height);
        }

        // Draw crosshair
        this.drawCrosshair(width, height);
    }

    /**
     * Cast rays for wall rendering
     */
    castRays(room, width, height) {
        const ctx = this.ctx;
        const platforms = room ? room.getActivePlatforms() : [];
        const roomWidth = room ? room.width : 1600;
        const roomHeight = room ? room.height : 600;

        const stripWidth = Math.ceil(width / this.numRays);

        for (let i = 0; i < this.numRays; i++) {
            // Calculate ray angle
            const rayAngle = this.playerAngle - this.FOV / 2 + (i / this.numRays) * this.FOV;

            // Cast ray
            const hit = this.castSingleRay(rayAngle, platforms, roomWidth, roomHeight);

            if (hit) {
                // Fix fish-eye distortion
                const correctedDist = hit.distance * Math.cos(rayAngle - this.playerAngle);

                // Calculate wall height on screen
                const wallScreenHeight = (this.wallHeight / correctedDist) * this.viewDistance;
                const wallTop = (height - wallScreenHeight) / 2;

                // Calculate screen X position
                const screenX = i * stripWidth;

                // Store depth for sprite rendering
                for (let x = screenX; x < screenX + stripWidth && x < width; x++) {
                    this.depthBuffer[x] = correctedDist;
                }

                // Color based on distance and wall type
                let wallColor;
                const intensity = Math.max(0.2, 1 - correctedDist / 500);

                if (hit.type === 'boundary') {
                    // Room boundaries - cyan
                    const r = Math.floor(0 * intensity);
                    const g = Math.floor(240 * intensity);
                    const b = Math.floor(255 * intensity);
                    wallColor = `rgb(${r}, ${g}, ${b})`;
                } else if (hit.type === 'platform') {
                    // Platforms - magenta
                    const r = Math.floor(255 * intensity);
                    const g = Math.floor(0 * intensity);
                    const b = Math.floor(170 * intensity);
                    wallColor = `rgb(${r}, ${g}, ${b})`;
                } else {
                    // Default
                    const gray = Math.floor(100 * intensity);
                    wallColor = `rgb(${gray}, ${gray}, ${gray})`;
                }

                // Draw wall strip
                ctx.fillStyle = wallColor;
                ctx.fillRect(screenX, wallTop, stripWidth + 1, wallScreenHeight);

                // Add vertical edge lines for platforms
                if (hit.isEdge) {
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(screenX, wallTop);
                    ctx.lineTo(screenX, wallTop + wallScreenHeight);
                    ctx.stroke();
                }
            }
        }
    }

    /**
     * Cast a single ray and find intersections
     */
    castSingleRay(angle, platforms, roomWidth, roomHeight) {
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);

        let closestHit = null;
        let closestDist = this.maxDistance;

        // Check room boundaries
        const boundaryHits = this.checkBoundaryIntersection(
            this.playerX, this.playerY,
            rayDirX, rayDirY,
            roomWidth, roomHeight
        );

        for (const hit of boundaryHits) {
            if (hit.distance < closestDist && hit.distance > 0) {
                closestDist = hit.distance;
                closestHit = { ...hit, type: 'boundary' };
            }
        }

        // Check platform intersections
        for (const platform of platforms) {
            const hits = this.checkPlatformIntersection(
                this.playerX, this.playerY,
                rayDirX, rayDirY,
                platform
            );

            for (const hit of hits) {
                if (hit.distance < closestDist && hit.distance > 0) {
                    closestDist = hit.distance;
                    closestHit = { ...hit, type: 'platform' };
                }
            }
        }

        return closestHit;
    }

    /**
     * Check ray intersection with room boundaries
     */
    checkBoundaryIntersection(px, py, dirX, dirY, roomWidth, roomHeight) {
        const hits = [];

        // Left wall (x = 0)
        if (dirX !== 0) {
            const t = (0 - px) / dirX;
            if (t > 0) {
                const y = py + t * dirY;
                if (y >= 0 && y <= roomHeight) {
                    hits.push({ distance: t, x: 0, y });
                }
            }
        }

        // Right wall (x = roomWidth)
        if (dirX !== 0) {
            const t = (roomWidth - px) / dirX;
            if (t > 0) {
                const y = py + t * dirY;
                if (y >= 0 && y <= roomHeight) {
                    hits.push({ distance: t, x: roomWidth, y });
                }
            }
        }

        // Top wall (y = 0)
        if (dirY !== 0) {
            const t = (0 - py) / dirY;
            if (t > 0) {
                const x = px + t * dirX;
                if (x >= 0 && x <= roomWidth) {
                    hits.push({ distance: t, x, y: 0 });
                }
            }
        }

        // Bottom wall (y = roomHeight - simulating ground as wall)
        if (dirY !== 0) {
            const t = (roomHeight - py) / dirY;
            if (t > 0) {
                const x = px + t * dirX;
                if (x >= 0 && x <= roomWidth) {
                    hits.push({ distance: t, x, y: roomHeight });
                }
            }
        }

        return hits;
    }

    /**
     * Check ray intersection with a platform (as a wall obstacle)
     */
    checkPlatformIntersection(px, py, dirX, dirY, platform) {
        const hits = [];

        // Treat platform as a box - check all four sides
        const left = platform.x;
        const right = platform.x + platform.width;
        const top = platform.y;
        const bottom = platform.y + platform.height;

        // Only check platforms that are at player height or above
        if (py > bottom) return hits;

        // Left side
        if (dirX !== 0) {
            const t = (left - px) / dirX;
            if (t > 0) {
                const y = py + t * dirY;
                if (y >= top && y <= bottom) {
                    hits.push({ distance: t, x: left, y, isEdge: true });
                }
            }
        }

        // Right side
        if (dirX !== 0) {
            const t = (right - px) / dirX;
            if (t > 0) {
                const y = py + t * dirY;
                if (y >= top && y <= bottom) {
                    hits.push({ distance: t, x: right, y, isEdge: true });
                }
            }
        }

        // Top (facing down)
        if (dirY !== 0) {
            const t = (top - py) / dirY;
            if (t > 0) {
                const x = px + t * dirX;
                if (x >= left && x <= right) {
                    hits.push({ distance: t, x, y: top });
                }
            }
        }

        return hits;
    }

    /**
     * Render sprites (enemies, boss, interactables) using painter's algorithm
     */
    renderSprites(enemies, boss, interactables, width, height) {
        const sprites = [];

        // Add enemies as sprites
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            const dx = enemy.x - this.playerX;
            const dy = enemy.y - this.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            sprites.push({
                type: 'enemy',
                x: enemy.x,
                y: enemy.y,
                dist,
                angle,
                width: enemy.width,
                height: enemy.height,
                health: enemy.health,
                maxHealth: enemy.maxHealth,
                color: '#ff00aa'
            });
        }

        // Add boss as sprite
        if (boss && boss.active) {
            const dx = boss.x - this.playerX;
            const dy = boss.y - this.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            sprites.push({
                type: 'boss',
                x: boss.x,
                y: boss.y,
                dist,
                angle,
                width: boss.width * 2,
                height: boss.height * 2,
                health: boss.health,
                maxHealth: boss.maxHealth,
                name: boss.name,
                color: '#ff0000'
            });
        }

        // Add interactables
        for (const item of interactables) {
            if (item.used) continue;
            const dx = item.x - this.playerX;
            const dy = item.y - this.playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            sprites.push({
                type: 'item',
                itemType: item.type,
                x: item.x,
                y: item.y,
                dist,
                angle,
                width: 30,
                height: 30,
                color: item.type === 'health_potion' ? '#00ff88' : '#00f0ff'
            });
        }

        // Sort by distance (far to near)
        sprites.sort((a, b) => b.dist - a.dist);

        // Render sprites
        for (const sprite of sprites) {
            this.renderSprite(sprite, width, height);
        }
    }

    /**
     * Render a single sprite
     */
    renderSprite(sprite, width, height) {
        const ctx = this.ctx;

        // Calculate angle relative to player view
        let relAngle = sprite.angle - this.playerAngle;

        // Normalize angle
        while (relAngle > Math.PI) relAngle -= Math.PI * 2;
        while (relAngle < -Math.PI) relAngle += Math.PI * 2;

        // Check if sprite is in field of view
        if (Math.abs(relAngle) > this.FOV / 2 + 0.3) return;

        // Calculate screen position
        const screenX = (0.5 + relAngle / this.FOV) * width;

        // Calculate sprite size based on distance
        const spriteSize = (this.wallHeight / sprite.dist) * this.viewDistance;
        const spriteWidth = (sprite.width / sprite.dist) * this.viewDistance;
        const spriteHeight = (sprite.height / sprite.dist) * this.viewDistance;

        const drawX = screenX - spriteWidth / 2;
        const drawY = (height - spriteHeight) / 2;

        // Check depth buffer
        const centerX = Math.floor(screenX);
        if (centerX >= 0 && centerX < width && sprite.dist > this.depthBuffer[centerX]) {
            return; // Sprite is behind a wall
        }

        ctx.save();

        // Glow effect
        ctx.shadowColor = sprite.color;
        ctx.shadowBlur = 20;

        if (sprite.type === 'enemy') {
            // Draw enemy as glowing figure
            this.drawEnemySprite(ctx, drawX, drawY, spriteWidth, spriteHeight, sprite);
        } else if (sprite.type === 'boss') {
            // Draw boss as larger glowing figure
            this.drawBossSprite(ctx, drawX, drawY, spriteWidth, spriteHeight, sprite);
        } else if (sprite.type === 'item') {
            // Draw item
            this.drawItemSprite(ctx, drawX, drawY, spriteWidth, spriteHeight, sprite);
        }

        ctx.restore();
    }

    /**
     * Draw enemy sprite
     */
    drawEnemySprite(ctx, x, y, w, h, sprite) {
        // Body
        ctx.fillStyle = sprite.color;
        ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.4, h * 0.6);

        // Head
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.15, w * 0.15, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff00aa';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + w * 0.45, y + h * 0.13, w * 0.03, 0, Math.PI * 2);
        ctx.arc(x + w * 0.55, y + h * 0.13, w * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Health bar
        if (sprite.health < sprite.maxHealth) {
            const barWidth = w * 0.8;
            const barHeight = 4;
            const barX = x + w * 0.1;
            const barY = y - 10;

            ctx.fillStyle = '#330000';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth * (sprite.health / sprite.maxHealth), barHeight);
        }
    }

    /**
     * Draw boss sprite
     */
    drawBossSprite(ctx, x, y, w, h, sprite) {
        // Larger, more imposing figure
        const intensity = 0.5 + Math.sin(Date.now() / 200) * 0.3;

        // Body
        ctx.fillStyle = `rgba(255, 0, 0, ${intensity})`;
        ctx.fillRect(x + w * 0.2, y + h * 0.15, w * 0.6, h * 0.7);

        // Head
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.1, w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(x + w * 0.4, y + h * 0.08, w * 0.05, 0, Math.PI * 2);
        ctx.arc(x + w * 0.6, y + h * 0.08, w * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Boss name
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.fillText(sprite.name || 'BOSS', x + w / 2, y - 20);

        // Health bar
        const barWidth = w;
        const barHeight = 6;
        const barX = x;
        const barY = y - 8;

        ctx.fillStyle = '#330000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.fillRect(barX, barY, barWidth * (sprite.health / sprite.maxHealth), barHeight);
    }

    /**
     * Draw item sprite
     */
    drawItemSprite(ctx, x, y, w, h, sprite) {
        const bounce = Math.sin(Date.now() / 300) * 5;

        ctx.fillStyle = sprite.color;
        ctx.shadowColor = sprite.color;
        ctx.shadowBlur = 15;

        if (sprite.itemType === 'health_potion') {
            // Draw potion
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2 + bounce, w * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Plus sign
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + w * 0.35, y + h * 0.45 + bounce, w * 0.3, w * 0.1);
            ctx.fillRect(x + w * 0.45, y + h * 0.35 + bounce, w * 0.1, w * 0.3);
        } else if (sprite.itemType === 'chest') {
            // Draw chest
            ctx.fillRect(x + w * 0.2, y + h * 0.4 + bounce, w * 0.6, h * 0.4);
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(x + w * 0.4, y + h * 0.5 + bounce, w * 0.2, h * 0.1);
        } else {
            // Generic item
            ctx.beginPath();
            ctx.arc(x + w / 2, y + h / 2 + bounce, w * 0.25, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /**
     * Draw weapon/hand overlay
     */
    drawWeapon(player, width, height) {
        const ctx = this.ctx;

        // Weapon bob based on movement
        const bobX = Math.sin(Date.now() / 150) * 5;
        const bobY = Math.abs(Math.sin(Date.now() / 100)) * 3;

        const weaponX = width / 2 + bobX + 50;
        const weaponY = height - 150 + bobY;

        ctx.save();

        // Blade color from player
        const bladeColor = player.bladeColor || '#00f0ff';

        // Draw blade
        ctx.strokeStyle = bladeColor;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = bladeColor;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.moveTo(weaponX, weaponY);
        ctx.lineTo(weaponX - 80, weaponY - 120);
        ctx.stroke();

        // Blade glow core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(weaponX, weaponY);
        ctx.lineTo(weaponX - 80, weaponY - 120);
        ctx.stroke();

        // Draw hand/handle
        ctx.fillStyle = '#333340';
        ctx.shadowBlur = 0;
        ctx.fillRect(weaponX - 15, weaponY - 10, 30, 60);

        // Attack animation
        if (player.isAttacking) {
            // Swing effect
            ctx.strokeStyle = bladeColor;
            ctx.lineWidth = 4;
            ctx.globalAlpha = 0.5;
            ctx.shadowBlur = 30;

            for (let i = 0; i < 5; i++) {
                const offset = i * 15;
                ctx.beginPath();
                ctx.moveTo(weaponX + offset, weaponY);
                ctx.lineTo(weaponX - 80 + offset, weaponY - 120);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * Draw mini-map
     */
    drawMiniMap(room, enemies, boss, screenWidth, screenHeight) {
        const ctx = this.ctx;
        const mapX = screenWidth - this.miniMapSize - 20;
        const mapY = 20;

        ctx.save();

        // Map background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(mapX, mapY, this.miniMapSize, this.miniMapSize);

        // Map border
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, this.miniMapSize, this.miniMapSize);

        // Scale factor
        const roomWidth = room ? room.width : 1600;
        const roomHeight = room ? room.height : 600;
        const scaleX = this.miniMapSize / roomWidth;
        const scaleY = this.miniMapSize / roomHeight;
        const scale = Math.min(scaleX, scaleY);

        // Draw platforms
        if (room) {
            ctx.fillStyle = 'rgba(255, 0, 170, 0.5)';
            for (const platform of room.getActivePlatforms()) {
                ctx.fillRect(
                    mapX + platform.x * scale,
                    mapY + platform.y * scale,
                    platform.width * scale,
                    platform.height * scale
                );
            }
        }

        // Draw enemies
        ctx.fillStyle = '#ff00aa';
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            ctx.beginPath();
            ctx.arc(
                mapX + enemy.x * scale,
                mapY + enemy.y * scale,
                3, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Draw boss
        if (boss && boss.active) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(
                mapX + boss.x * scale,
                mapY + boss.y * scale,
                5, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Draw player
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(
            mapX + this.playerX * scale,
            mapY + this.playerY * scale,
            4, 0, Math.PI * 2
        );
        ctx.fill();

        // Draw player direction
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(
            mapX + this.playerX * scale,
            mapY + this.playerY * scale
        );
        ctx.lineTo(
            mapX + (this.playerX + Math.cos(this.playerAngle) * 50) * scale,
            mapY + (this.playerY + Math.sin(this.playerAngle) * 50) * scale
        );
        ctx.stroke();

        // Draw FOV cone
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(
            mapX + this.playerX * scale,
            mapY + this.playerY * scale
        );
        ctx.lineTo(
            mapX + (this.playerX + Math.cos(this.playerAngle - this.FOV / 2) * 80) * scale,
            mapY + (this.playerY + Math.sin(this.playerAngle - this.FOV / 2) * 80) * scale
        );
        ctx.moveTo(
            mapX + this.playerX * scale,
            mapY + this.playerY * scale
        );
        ctx.lineTo(
            mapX + (this.playerX + Math.cos(this.playerAngle + this.FOV / 2) * 80) * scale,
            mapY + (this.playerY + Math.sin(this.playerAngle + this.FOV / 2) * 80) * scale
        );
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw crosshair
     */
    drawCrosshair(width, height) {
        const ctx = this.ctx;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.save();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(centerX - 15, centerY);
        ctx.lineTo(centerX - 5, centerY);
        ctx.moveTo(centerX + 5, centerY);
        ctx.lineTo(centerX + 15, centerY);

        // Vertical lines
        ctx.moveTo(centerX, centerY - 15);
        ctx.lineTo(centerX, centerY - 5);
        ctx.moveTo(centerX, centerY + 5);
        ctx.lineTo(centerX, centerY + 15);

        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Get context (for compatibility)
     */
    getContext() {
        return this.ctx;
    }

    /**
     * Resize handler
     */
    resize() {
        // Handled by main renderer
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.FPSRenderer = FPSRenderer;
}
