/**
 * ITERATION - Game Constants
 */

const GAME_CONFIG = {
    // Display
    TARGET_FPS: 60,
    CANVAS_WIDTH: 1280,
    CANVAS_HEIGHT: 720,
    PIXEL_SCALE: 1,

    // Physics
    GRAVITY: 0.6,
    MAX_FALL_SPEED: 15,
    FRICTION: 0.85,
    AIR_RESISTANCE: 0.95,

    // Player
    PLAYER: {
        WIDTH: 32,
        HEIGHT: 48,
        SPEED: 5,
        JUMP_FORCE: -14,
        COYOTE_TIME: 6, // Frames of grace period after leaving platform
        JUMP_BUFFER: 8, // Frames to buffer jump input
        MAX_HEALTH: 100,
        INVINCIBILITY_FRAMES: 60
    },

    // Cycles (resource system)
    CYCLES: {
        STARTING: 1000,
        MOVE_COST: 0.1,
        JUMP_COST: 2,
        ATTACK_COST: 3,
        INTERACT_COST: 5,
        DAMAGE_PENALTY: 10,
        LOW_WARNING: 200,
        CRITICAL_WARNING: 50
    },

    // Colors (Sci-fi palette)
    COLORS: {
        BACKGROUND: '#0a0a0f',
        GRID: '#1a1a2f',
        GRID_ACCENT: '#252540',
        CYAN: '#00f0ff',
        CYAN_DIM: '#007788',
        MAGENTA: '#ff00aa',
        MAGENTA_DIM: '#880055',
        WHITE: '#ffffff',
        PLAYER: '#00f0ff',
        PLAYER_CORE: '#ffffff',
        BLADE: '#00f0ff',
        BLADE_GLOW: 'rgba(0, 240, 255, 0.5)',
        PLATFORM: '#1a1a2f',
        PLATFORM_EDGE: '#00f0ff',
        ENEMY: '#ff00aa',
        GHOST: 'rgba(0, 240, 255, 0.3)',
        HEALTH: '#00ff88',
        HEALTH_LOW: '#ff4444',
        CYCLES: '#00f0ff',
        CYCLES_LOW: '#ffaa00',
        CYCLES_CRITICAL: '#ff0044'
    },

    // Zones
    ZONES: {
        TRAINING_GRID: {
            name: 'TRAINING GRID',
            rooms: [3, 4],
            enemyDifficulty: 1
        },
        COMBAT_SIMULATION: {
            name: 'COMBAT SIMULATION',
            rooms: [4, 5],
            enemyDifficulty: 2
        },
        ADAPTATION_CHAMBER: {
            name: 'ADAPTATION CHAMBER',
            rooms: [5, 6],
            enemyDifficulty: 3
        },
        THE_CORE: {
            name: 'THE CORE',
            rooms: [1, 1],
            enemyDifficulty: 4
        }
    },

    // Room dimensions
    ROOM: {
        WIDTH: 1280,
        HEIGHT: 720,
        TILE_SIZE: 32
    },

    // Debug
    DEBUG: false
};

// Freeze config to prevent runtime modifications
Object.freeze(GAME_CONFIG);
Object.freeze(GAME_CONFIG.PLAYER);
Object.freeze(GAME_CONFIG.CYCLES);
Object.freeze(GAME_CONFIG.COLORS);
Object.freeze(GAME_CONFIG.ZONES);
Object.freeze(GAME_CONFIG.ROOM);
