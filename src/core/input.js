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

        // Mouse state
        this.mouse = {
            leftDown: false,
            rightDown: false,
            x: 0,
            y: 0
        };
        this.mouseJustPressed = {
            left: false,
            right: false
        };
        this.previousMouseState = {
            left: false,
            right: false
        };

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
            dash: ['ShiftLeft', 'ShiftRight'],
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
            this.mouse.leftDown = false;
            this.mouse.rightDown = false;
        });

        // Mouse click listeners
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.leftDown = true;  // Left click
            if (e.button === 2) this.mouse.rightDown = true; // Right click
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.leftDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        // Prevent right-click context menu on canvas
        window.addEventListener('contextmenu', (e) => {
            if (e.target.tagName === 'CANVAS') {
                e.preventDefault();
            }
        });

        // Track mouse position
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
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

        // Update mouse just pressed detection
        this.mouseJustPressed = {
            left: this.mouse.leftDown && !this.previousMouseState.left,
            right: this.mouse.rightDown && !this.previousMouseState.right
        };
        this.previousMouseState = {
            left: this.mouse.leftDown,
            right: this.mouse.rightDown
        };

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

        // Check mouse - left click can be attack (handled specially in game.js for interact priority)
        // Right click is not used for now
        if (action === 'attack' && this.mouse.leftDown) return true;

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

        // Mouse left-click for attack is handled specially in game.js
        // (interact takes priority when clicking on interactables)

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

    /**
     * Get mouse position relative to canvas
     */
    getMouseCanvasPosition(canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (this.mouse.x - rect.left) * scaleX,
            y: (this.mouse.y - rect.top) * scaleY
        };
    }

    /**
     * Get mouse position in world coordinates (accounting for camera)
     */
    getMouseWorldPosition(canvas, camera) {
        const canvasPos = this.getMouseCanvasPosition(canvas);
        return {
            x: canvasPos.x + (camera ? camera.x : 0),
            y: canvasPos.y + (camera ? camera.y : 0)
        };
    }

    /**
     * Check if mouse is over a rectangle (in world coordinates)
     */
    isMouseOver(canvas, camera, x, y, width, height) {
        const mouseWorld = this.getMouseWorldPosition(canvas, camera);
        return mouseWorld.x >= x && mouseWorld.x <= x + width &&
               mouseWorld.y >= y && mouseWorld.y <= y + height;
    }

    /**
     * Check if left mouse button was just clicked
     */
    isLeftClickJustPressed() {
        return this.mouseJustPressed.left;
    }

    /**
     * Check if right mouse button was just clicked
     */
    isRightClickJustPressed() {
        return this.mouseJustPressed.right;
    }
}
