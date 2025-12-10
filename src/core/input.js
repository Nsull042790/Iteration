/**
 * ITERATION - Input Handler
 * Handles keyboard input with buffering support
 */

class InputHandler {
    constructor() {
        // Current state of all keys
        this.keys = {};
        // Keys that were just pressed this frame
        this.justPressed = {};
        // Keys that were just released this frame
        this.justReleased = {};
        // Previous frame's key state
        this.previousKeys = {};

        // Key mappings (rebindable in future)
        this.bindings = {
            left: ['ArrowLeft', 'KeyA'],
            right: ['ArrowRight', 'KeyD'],
            up: ['ArrowUp', 'KeyW'],
            down: ['ArrowDown', 'KeyS'],
            jump: ['Space'],
            attack: ['KeyJ', 'KeyZ'],
            special: ['KeyK', 'KeyX'],
            interact: ['KeyE'],
            pause: ['Escape', 'KeyP']
        };

        // Jump buffer for responsive controls
        this.jumpBuffer = 0;
        this.jumpBufferMax = GAME_CONFIG.PLAYER.JUMP_BUFFER;

        this._setupListeners();
    }

    _setupListeners() {
        window.addEventListener('keydown', (e) => {
            // Prevent default for game keys
            if (this._isGameKey(e.code)) {
                e.preventDefault();
            }
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // Handle window blur (release all keys)
        window.addEventListener('blur', () => {
            this.keys = {};
            this.previousKeys = {};
        });
    }

    _isGameKey(code) {
        for (const action in this.bindings) {
            if (this.bindings[action].includes(code)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update input state - call once per frame at start of update
     */
    update() {
        // Calculate just pressed/released
        this.justPressed = {};
        this.justReleased = {};

        for (const key in this.keys) {
            if (this.keys[key] && !this.previousKeys[key]) {
                this.justPressed[key] = true;
            }
            if (!this.keys[key] && this.previousKeys[key]) {
                this.justReleased[key] = true;
            }
        }

        // Update jump buffer
        if (this.isActionJustPressed('jump')) {
            this.jumpBuffer = this.jumpBufferMax;
        } else if (this.jumpBuffer > 0) {
            this.jumpBuffer--;
        }

        // Store current state for next frame
        this.previousKeys = { ...this.keys };
    }

    /**
     * Check if an action is currently held
     */
    isActionHeld(action) {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some(key => this.keys[key]);
    }

    /**
     * Check if an action was just pressed this frame
     */
    isActionJustPressed(action) {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some(key => this.justPressed[key]);
    }

    /**
     * Check if an action was just released this frame
     */
    isActionJustReleased(action) {
        const keys = this.bindings[action];
        if (!keys) return false;
        return keys.some(key => this.justReleased[key]);
    }

    /**
     * Check if jump is buffered (for responsive controls)
     */
    isJumpBuffered() {
        return this.jumpBuffer > 0;
    }

    /**
     * Consume the jump buffer
     */
    consumeJumpBuffer() {
        this.jumpBuffer = 0;
    }

    /**
     * Get horizontal input (-1, 0, or 1)
     */
    getHorizontal() {
        let h = 0;
        if (this.isActionHeld('left')) h -= 1;
        if (this.isActionHeld('right')) h += 1;
        return h;
    }

    /**
     * Get vertical input (-1, 0, or 1)
     */
    getVertical() {
        let v = 0;
        if (this.isActionHeld('up')) v -= 1;
        if (this.isActionHeld('down')) v += 1;
        return v;
    }
}
