/**
 * ITERATION - First Person Input Handler
 * Handles mouse look and WASD movement for first-person mode
 */

class FPSInput {
    constructor() {
        // Mouse look
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this.sensitivity = 0.003;
        this.isPointerLocked = false;

        // Movement keys
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            attack: false,
            interact: false
        };

        // Player angle and position (managed here for FPS mode)
        this.playerAngle = 0; // Radians, 0 = facing right
        this.verticalAngle = 0; // For looking up/down

        // Movement speeds
        this.moveSpeed = 5;
        this.turnSpeed = 0.05;

        // Attack state
        this.attackJustPressed = false;
        this.attackWasPressed = false;

        // Bound handlers for removal
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
        this.boundClick = this.handleClick.bind(this);

        this.initialized = false;
    }

    /**
     * Initialize FPS input handlers
     */
    init(canvas) {
        if (this.initialized) return;

        this.canvas = canvas;

        // Mouse movement
        document.addEventListener('mousemove', this.boundMouseMove);

        // Keyboard
        document.addEventListener('keydown', this.boundKeyDown);
        document.addEventListener('keyup', this.boundKeyUp);

        // Pointer lock
        document.addEventListener('pointerlockchange', this.boundPointerLockChange);

        // Click to lock pointer
        canvas.addEventListener('click', this.boundClick);

        this.initialized = true;
    }

    /**
     * Cleanup handlers
     */
    destroy() {
        document.removeEventListener('mousemove', this.boundMouseMove);
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        document.removeEventListener('pointerlockchange', this.boundPointerLockChange);

        if (this.canvas) {
            this.canvas.removeEventListener('click', this.boundClick);
        }

        if (this.isPointerLocked) {
            document.exitPointerLock();
        }

        this.initialized = false;
    }

    /**
     * Request pointer lock
     */
    requestPointerLock() {
        if (this.canvas && !this.isPointerLocked) {
            this.canvas.requestPointerLock();
        }
    }

    /**
     * Handle pointer lock change
     */
    handlePointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.canvas;
    }

    /**
     * Handle canvas click
     */
    handleClick(e) {
        if (!this.isPointerLocked) {
            this.requestPointerLock();
        } else {
            // Attack on click when pointer is locked
            this.keys.attack = true;
            this.attackJustPressed = true;
        }
    }

    /**
     * Handle mouse movement for look
     */
    handleMouseMove(e) {
        if (!this.isPointerLocked) return;

        this.mouseDeltaX = e.movementX;
        this.mouseDeltaY = e.movementY;

        // Update player angle based on horizontal mouse movement
        this.playerAngle += this.mouseDeltaX * this.sensitivity;

        // Keep angle in -PI to PI range
        while (this.playerAngle > Math.PI) this.playerAngle -= Math.PI * 2;
        while (this.playerAngle < -Math.PI) this.playerAngle += Math.PI * 2;

        // Vertical look (limited range)
        this.verticalAngle -= this.mouseDeltaY * this.sensitivity;
        this.verticalAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.verticalAngle));
    }

    /**
     * Handle key down
     */
    handleKeyDown(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'Space':
                this.keys.jump = true;
                break;
            case 'KeyE':
            case 'KeyF':
                this.keys.interact = true;
                break;
            case 'Mouse0': // Left click handled in click handler
                break;
        }
    }

    /**
     * Handle key up
     */
    handleKeyUp(e) {
        switch (e.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'Space':
                this.keys.jump = false;
                break;
            case 'KeyE':
            case 'KeyF':
                this.keys.interact = false;
                break;
        }
    }

    /**
     * Get movement vector based on current input and player angle
     */
    getMovement() {
        let moveX = 0;
        let moveY = 0;

        // Forward/backward (in direction of angle)
        if (this.keys.forward) {
            moveX += Math.cos(this.playerAngle) * this.moveSpeed;
            moveY += Math.sin(this.playerAngle) * this.moveSpeed;
        }
        if (this.keys.backward) {
            moveX -= Math.cos(this.playerAngle) * this.moveSpeed;
            moveY -= Math.sin(this.playerAngle) * this.moveSpeed;
        }

        // Strafe left/right (perpendicular to angle)
        if (this.keys.left) {
            moveX += Math.cos(this.playerAngle - Math.PI / 2) * this.moveSpeed;
            moveY += Math.sin(this.playerAngle - Math.PI / 2) * this.moveSpeed;
        }
        if (this.keys.right) {
            moveX += Math.cos(this.playerAngle + Math.PI / 2) * this.moveSpeed;
            moveY += Math.sin(this.playerAngle + Math.PI / 2) * this.moveSpeed;
        }

        return { x: moveX, y: moveY };
    }

    /**
     * Check if attack was just pressed
     */
    isAttackJustPressed() {
        const result = this.attackJustPressed;
        this.attackJustPressed = false;
        return result;
    }

    /**
     * Check if jump is pressed
     */
    isJumpPressed() {
        return this.keys.jump;
    }

    /**
     * Check if interact is pressed
     */
    isInteractPressed() {
        return this.keys.interact;
    }

    /**
     * Get current player angle
     */
    getAngle() {
        return this.playerAngle;
    }

    /**
     * Set player angle (for initialization)
     */
    setAngle(angle) {
        this.playerAngle = angle;
    }

    /**
     * Update method (call each frame)
     */
    update() {
        // Reset attack state after processing
        if (this.keys.attack && !this.attackWasPressed) {
            this.attackJustPressed = true;
        }
        this.attackWasPressed = this.keys.attack;
        this.keys.attack = false;

        // Reset mouse deltas
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
    }

    /**
     * Check if pointer is currently locked
     */
    isLocked() {
        return this.isPointerLocked;
    }
}

// Make globally available
if (typeof window !== 'undefined') {
    window.FPSInput = FPSInput;
}
