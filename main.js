/**
 * ITERATION - Main Entry Point
 *
 * A browser-based side-scrolling roguelike where you play as
 * a combat AI trapped in a training simulation.
 *
 * Controls (Left Hand / Right Hand split):
 * LEFT HAND:
 * - WASD: Move
 * - Space: Jump
 *
 * RIGHT HAND:
 * - Arrow Up / Right: Attack
 * - Arrow Down: Special (not yet implemented)
 * - Arrow Left: Interact (not yet implemented)
 *
 * - ESC / P: Pause
 */

// Matrix Rain Effect for Title Screen
function initMatrixRain() {
    const canvas = document.getElementById('matrix-rain');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Set canvas size
    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters
    const chars = 'ITERATION01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const charArray = chars.split('');

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Array of drops - one per column
    const drops = [];
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
    }

    // Colors for the rain
    const colors = ['#00f0ff', '#ff00aa', '#00ff88', '#ffffff'];

    function draw() {
        // Fade effect
        ctx.fillStyle = 'rgba(5, 5, 8, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            // Random character
            const char = charArray[Math.floor(Math.random() * charArray.length)];

            // Color based on position
            const colorIndex = Math.floor(Math.random() * colors.length);
            ctx.fillStyle = colors[colorIndex];

            // Glow effect for some characters
            if (Math.random() > 0.95) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = colors[colorIndex];
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillText(char, i * fontSize, drops[i] * fontSize);

            // Reset drop to top with random delay
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    // Run animation
    setInterval(draw, 50);
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('ITERATION - Initializing...');

    // Initialize matrix rain effect for title screen
    initMatrixRain();

    // Get canvas element
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    // Create and start game
    const game = new Game(canvas);
    game.start();

    console.log('ITERATION - Game started');
    console.log('Controls: WASD to move, Space to jump, Arrow keys for combat');

    // Expose game to console for debugging
    if (GAME_CONFIG.DEBUG) {
        window.game = game;
    }
});
