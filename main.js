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

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('ITERATION - Initializing...');

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
