/**
 * ITERATION - Touch Controls
 * Mobile-friendly virtual joystick and action buttons
 */

class TouchControls {
    constructor(inputHandler) {
        this.input = inputHandler;
        this.enabled = false;
        this.isMobile = this.detectMobile();

        // Joystick state
        this.joystick = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            dx: 0,
            dy: 0,
            maxRadius: 50
        };

        // Button states
        this.buttons = {
            attack: false,
            jump: false,
            interact: false,
            weapon1: false,
            weapon2: false,
            weapon3: false
        };

        // Touch identifiers
        this.joystickTouchId = null;
        this.buttonTouches = {};

        // UI Elements
        this.container = null;
        this.joystickBase = null;
        this.joystickKnob = null;

        if (this.isMobile) {
            this.init();
        }
    }

    /**
     * Detect if running on mobile device
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
            (window.innerWidth <= 1024 && 'ontouchstart' in window);
    }

    /**
     * Initialize touch controls
     */
    init() {
        this.enabled = true;
        this.createUI();
        this.setupEventListeners();
        document.body.classList.add('mobile-device');
    }

    /**
     * Create touch control UI elements
     */
    createUI() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';
        this.container.className = 'touch-controls';

        // Left side - Joystick
        const leftSide = document.createElement('div');
        leftSide.className = 'touch-left';

        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'joystick-base';
        this.joystickBase.id = 'joystick-base';

        this.joystickKnob = document.createElement('div');
        this.joystickKnob.className = 'joystick-knob';
        this.joystickKnob.id = 'joystick-knob';

        this.joystickBase.appendChild(this.joystickKnob);
        leftSide.appendChild(this.joystickBase);

        // Right side - Action buttons
        const rightSide = document.createElement('div');
        rightSide.className = 'touch-right';

        // Attack button (large, primary)
        const attackBtn = this.createButton('attack', 'ATK', 'touch-btn-attack');
        rightSide.appendChild(attackBtn);

        // Jump button
        const jumpBtn = this.createButton('jump', 'JUMP', 'touch-btn-jump');
        rightSide.appendChild(jumpBtn);

        // Interact button (smaller)
        const interactBtn = this.createButton('interact', 'USE', 'touch-btn-interact');
        rightSide.appendChild(interactBtn);

        // Weapon buttons row
        const weaponRow = document.createElement('div');
        weaponRow.className = 'weapon-row';

        const weapon1Btn = this.createButton('weapon1', '1', 'touch-btn-weapon');
        const weapon2Btn = this.createButton('weapon2', '2', 'touch-btn-weapon');
        const weapon3Btn = this.createButton('weapon3', '3', 'touch-btn-weapon');

        weaponRow.appendChild(weapon1Btn);
        weaponRow.appendChild(weapon2Btn);
        weaponRow.appendChild(weapon3Btn);
        rightSide.appendChild(weaponRow);

        this.container.appendChild(leftSide);
        this.container.appendChild(rightSide);
        document.body.appendChild(this.container);
    }

    /**
     * Create a touch button element
     */
    createButton(action, label, className) {
        const btn = document.createElement('div');
        btn.className = `touch-btn ${className}`;
        btn.dataset.action = action;
        btn.innerHTML = `<span>${label}</span>`;
        return btn;
    }

    /**
     * Setup touch event listeners
     */
    setupEventListeners() {
        // Joystick events
        this.joystickBase.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        document.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });

        // Button events
        const buttons = this.container.querySelectorAll('.touch-btn');
        buttons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => this.onButtonStart(e), { passive: false });
            btn.addEventListener('touchend', (e) => this.onButtonEnd(e), { passive: false });
            btn.addEventListener('touchcancel', (e) => this.onButtonEnd(e), { passive: false });
        });

        // Prevent default touch behaviors
        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => this.onOrientationChange());
        window.addEventListener('resize', () => this.onResize());
    }

    /**
     * Joystick touch start
     */
    onJoystickStart(e) {
        if (this.joystickTouchId !== null) return;

        const touch = e.changedTouches[0];
        this.joystickTouchId = touch.identifier;

        const rect = this.joystickBase.getBoundingClientRect();
        this.joystick.startX = rect.left + rect.width / 2;
        this.joystick.startY = rect.top + rect.height / 2;
        this.joystick.active = true;

        this.updateJoystick(touch.clientX, touch.clientY);
        this.joystickBase.classList.add('active');
    }

    /**
     * Joystick touch move
     */
    onJoystickMove(e) {
        if (!this.joystick.active) return;

        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                e.preventDefault();
                this.updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }

    /**
     * Joystick touch end
     */
    onJoystickEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.joystick.active = false;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
                this.joystickKnob.style.transform = 'translate(-50%, -50%)';
                this.joystickBase.classList.remove('active');
                break;
            }
        }
    }

    /**
     * Update joystick position and values
     */
    updateJoystick(touchX, touchY) {
        let dx = touchX - this.joystick.startX;
        let dy = touchY - this.joystick.startY;

        // Clamp to max radius
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.joystick.maxRadius) {
            dx = (dx / distance) * this.joystick.maxRadius;
            dy = (dy / distance) * this.joystick.maxRadius;
        }

        // Normalize to -1 to 1
        this.joystick.dx = dx / this.joystick.maxRadius;
        this.joystick.dy = dy / this.joystick.maxRadius;

        // Update knob visual position
        this.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }

    /**
     * Button touch start
     */
    onButtonStart(e) {
        e.preventDefault();
        const btn = e.currentTarget;
        const action = btn.dataset.action;

        for (const touch of e.changedTouches) {
            this.buttonTouches[touch.identifier] = action;
            this.buttons[action] = true;
            btn.classList.add('active');
        }
    }

    /**
     * Button touch end
     */
    onButtonEnd(e) {
        const btn = e.currentTarget;
        const action = btn.dataset.action;

        for (const touch of e.changedTouches) {
            if (this.buttonTouches[touch.identifier] === action) {
                delete this.buttonTouches[touch.identifier];
            }
        }

        // Check if any touches still on this button
        let stillTouching = false;
        for (const id in this.buttonTouches) {
            if (this.buttonTouches[id] === action) {
                stillTouching = true;
                break;
            }
        }

        if (!stillTouching) {
            this.buttons[action] = false;
            btn.classList.remove('active');
        }
    }

    /**
     * Handle orientation change
     */
    onOrientationChange() {
        // Reset joystick
        this.joystick.active = false;
        this.joystick.dx = 0;
        this.joystick.dy = 0;
        this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }

    /**
     * Handle resize
     */
    onResize() {
        // Update mobile detection
        const wasMobile = this.enabled;
        this.isMobile = this.detectMobile();

        if (this.isMobile && !wasMobile) {
            this.init();
        } else if (!this.isMobile && wasMobile) {
            this.destroy();
        }
    }

    /**
     * Get horizontal input from joystick (-1 to 1)
     */
    getHorizontal() {
        if (!this.enabled || !this.joystick.active) return 0;

        // Dead zone
        if (Math.abs(this.joystick.dx) < 0.2) return 0;

        return this.joystick.dx > 0 ? 1 : -1;
    }

    /**
     * Get vertical input from joystick (-1 to 1)
     */
    getVertical() {
        if (!this.enabled || !this.joystick.active) return 0;

        // Dead zone
        if (Math.abs(this.joystick.dy) < 0.2) return 0;

        return this.joystick.dy > 0 ? 1 : -1;
    }

    /**
     * Check if jump is requested (joystick up or jump button)
     */
    isJumpPressed() {
        return this.buttons.jump || (this.joystick.active && this.joystick.dy < -0.5);
    }

    /**
     * Check if attack button is pressed
     */
    isAttackPressed() {
        return this.buttons.attack;
    }

    /**
     * Check if interact button is pressed
     */
    isInteractPressed() {
        return this.buttons.interact;
    }

    /**
     * Get weapon button press (1, 2, or 3, or 0 if none)
     */
    getWeaponPress() {
        if (this.buttons.weapon1) return 1;
        if (this.buttons.weapon2) return 2;
        if (this.buttons.weapon3) return 3;
        return 0;
    }

    /**
     * Check if button was just pressed this frame
     */
    wasButtonJustPressed(action) {
        const wasPressed = this.buttons[action];
        return wasPressed;
    }

    /**
     * Reset button states (call at end of frame)
     */
    resetJustPressed() {
        // We track continuous press, not just pressed
        // This is handled differently than keyboard
    }

    /**
     * Show touch controls
     */
    show() {
        if (this.container) {
            this.container.style.display = 'flex';
        }
    }

    /**
     * Hide touch controls
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Destroy touch controls
     */
    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.enabled = false;
        document.body.classList.remove('mobile-device');
    }

    /**
     * Check if touch controls are enabled
     */
    isEnabled() {
        return this.enabled;
    }
}
