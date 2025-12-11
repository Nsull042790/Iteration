/**
 * ITERATION - Input Handler
 * Handles keyboard and touch input with buffering support
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

        // Touch controls (initialized later)
        this.touchControls = null;

        // Touch action states for just pressed detection
        this.touchJustPressed = {};
        this.previousTouchState = {};

        // Key mappings (rebindable in future)
        // Left hand: WASD + Space for movement
        // Right hand: Arrow keys for combat actions
        this.bindings = {
            left: ['KeyA'],
            right: ['KeyD'],
            up: ['KeyW'],
            down: ['KeyS'],
            jump: ['Space', 'KeyW'],
            attack: ['ArrowRight', 'ArrowUp'],
            special: ['ArrowDown'],
            interact: ['ArrowLeft', 'KeyE'],
            pause: ['Escape', 'KeyP']
        };

        // Jump buffer for responsive controls
        this.jumpBuffer = 0;
        this.jumpBufferMax = GAME_CONFIG.PLAYER.JUMP_BUFFER;

        this._setupListeners();
    }

    /**
     * Initialize touch controls (called after TouchControls class is available)
     */
    initTouchControls() {
        this.touchControls = new TouchControls(this);
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
        // Calculate just pressed/released for keyboard
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

        // Update touch just pressed detection
        this.touchJustPressed = {};
        if (this.touchControls && this.touchControls.enabled) {
            const touchActions = ['attack', 'jump', 'interact', 'weapon1', 'weapon2', 'weapon3'];
            for (const action of touchActions) {
                const current = this.touchControls.buttons[action];
                const previous = this.previousTouchState[action] || false;
                if (current && !previous) {
                    this.touchJustPressed[action] = true;
                }
                this.previousTouchState[action] = current;
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
        // Check keyboard
        const keys = this.bindings[action];
        if (keys && keys.some(key => this.keys[key])) {
            return true;
        }

        // Check touch controls
        if (this.touchControls && this.touchControls.enabled) {
            if (action === 'attack' && this.touchControls.isAttackPressed()) return true;
            if (action === 'jump' && this.touchControls.isJumpPressed()) return true;
            if (action === 'interact' && this.touchControls.isInteractPressed()) return true;
            if (action === 'left' && this.touchControls.getHorizontal() < 0) return true;
            if (action === 'right' && this.touchControls.getHorizontal() > 0) return true;
            if (action === 'up' && this.touchControls.getVertical() < 0) return true;
            if (action === 'down' && this.touchControls.getVertical() > 0) return true;
        }

        return false;
    }

    /**
     * Check if an action was just pressed this frame
     */
    isActionJustPressed(action) {
        // Check keyboard
        const keys = this.bindings[action];
        if (keys && keys.some(key => this.justPressed[key])) {
            return true;
        }

        // Check touch controls
        if (this.touchControls && this.touchControls.enabled) {
            if (action === 'attack' && this.touchJustPressed.attack) return true;
            if (action === 'jump' && this.touchJustPressed.jump) return true;
            if (action === 'interact' && this.touchJustPressed.interact) return true;
        }

        return false;
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

        // Touch joystick overrides if active
        if (this.touchControls && this.touchControls.enabled && this.touchControls.joystick.active) {
            return this.touchControls.getHorizontal();
        }

        return h;
    }

    /**
     * Get vertical input (-1, 0, or 1)
     */
    getVertical() {
        let v = 0;
        if (this.isActionHeld('up')) v -= 1;
        if (this.isActionHeld('down')) v += 1;

        // Touch joystick overrides if active
        if (this.touchControls && this.touchControls.enabled && this.touchControls.joystick.active) {
            return this.touchControls.getVertical();
        }

        return v;
    }

    /**
     * Check if a specific key was just pressed (by key code)
     */
    isKeyJustPressed(keyCode) {
        // Check keyboard
        if (this.justPressed[keyCode] === true) return true;

        // Check touch weapon buttons
        if (this.touchControls && this.touchControls.enabled) {
            if ((keyCode === 'Digit1' || keyCode === 'Numpad1') && this.touchJustPressed.weapon1) return true;
            if ((keyCode === 'Digit2' || keyCode === 'Numpad2') && this.touchJustPressed.weapon2) return true;
            if ((keyCode === 'Digit3' || keyCode === 'Numpad3') && this.touchJustPressed.weapon3) return true;
        }

        return false;
    }

    /**
     * Check if a specific key is currently held (by key code)
     */
    isKeyHeld(keyCode) {
        return this.keys[keyCode] === true;
    }

    /**
     * Check if using touch controls
     */
    isTouchEnabled() {
        return this.touchControls && this.touchControls.enabled;
    }
}
