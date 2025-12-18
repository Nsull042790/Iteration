/**
 * Procedural Audio System using Web Audio API
 * Generates synthesized sounds for game events
 * Now supports MP3 file loading for music tracks
 */
class AudioSystem {
    constructor() {
        this.context = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.initialized = false;

        // Volume settings (0-1)
        this.masterVolume = 0.5;
        this.musicVolume = 0.3;
        this.sfxVolume = 0.6;

        // Music state
        this.currentMusic = null;
        this.musicNodes = [];

        // Loaded audio buffers (for MP3 files)
        this.audioBuffers = {};
        this.currentMusicSource = null;

        // Mute states
        this.muted = false;
        this.musicMuted = false;

        // Track paths
        this.tracks = {
            main: 'assets/audio/anamnesis - crystal lake final cut 2.mp3',
            // Sample timestamps (in seconds)
            samples: {
                simulationDrop: { start: 74, duration: 8 },    // 1:14 - drop into simulation
                darkIntro: { start: 0, duration: 30 },         // Dark opening
                intense: { start: 120, duration: 30 },         // Intense section
                climax: { start: 180, duration: 45 }           // Climactic section
            }
        };
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.initialized) return;

        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();

            // Create gain nodes
            this.masterGain = this.context.createGain();
            this.masterGain.connect(this.context.destination);
            this.masterGain.gain.value = this.masterVolume;

            this.musicGain = this.context.createGain();
            this.musicGain.connect(this.masterGain);
            this.musicGain.gain.value = this.musicVolume;

            this.sfxGain = this.context.createGain();
            this.sfxGain.connect(this.masterGain);
            this.sfxGain.gain.value = this.sfxVolume;

            this.initialized = true;
            console.log('Audio system initialized');

            // Pre-load the main track
            this.loadTrack('main', this.tracks.main);
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Load an audio track (MP3/WAV/OGG)
     */
    async loadTrack(name, url) {
        if (!this.context) return;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`Could not load audio track: ${url}`);
                return;
            }
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
            this.audioBuffers[name] = audioBuffer;
            console.log(`Loaded audio track: ${name} (${audioBuffer.duration.toFixed(1)}s)`);
        } catch (e) {
            console.warn(`Failed to load audio track ${name}:`, e);
        }
    }

    /**
     * Play a loaded track with optional dark processing
     */
    playTrack(name, options = {}) {
        if (!this.ensureReady()) return null;

        const buffer = this.audioBuffers[name];
        if (!buffer) {
            console.warn(`Audio track not loaded: ${name}`);
            return null;
        }

        const {
            loop = true,
            startTime = 0,
            duration = null,
            fadeIn = 2,
            darkMode = false,  // Apply dark, distorted processing
            volume = 1
        } = options;

        // Stop current music
        this.stopCurrentMusic();

        // Create source
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        source.loop = loop;

        // Create gain for this track
        const trackGain = this.context.createGain();
        trackGain.gain.setValueAtTime(0, this.context.currentTime);
        trackGain.gain.linearRampToValueAtTime(volume, this.context.currentTime + fadeIn);

        let lastNode = source;

        // Apply dark processing if requested
        if (darkMode) {
            // Low-pass filter for muffled, dark sound
            const lowpass = this.context.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 2000;
            lowpass.Q.value = 1;

            // Add some distortion
            const distortion = this.context.createWaveShaper();
            distortion.curve = this.makeDistortionCurve(20);

            // Compressor for punch
            const compressor = this.context.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.ratio.value = 4;

            lastNode.connect(lowpass);
            lowpass.connect(distortion);
            distortion.connect(compressor);
            lastNode = compressor;
        }

        lastNode.connect(trackGain);
        trackGain.connect(this.musicGain);

        // Start playback
        if (duration) {
            source.start(0, startTime, duration);
        } else {
            source.start(0, startTime);
        }

        this.currentMusicSource = source;
        this.currentMusic = name;

        return source;
    }

    /**
     * Play the simulation drop sound (1:14 from the track)
     * Dark, distorted, feels like being thrown into the AI simulation
     */
    playSimulationDrop() {
        if (!this.ensureReady()) return;

        const buffer = this.audioBuffers['main'];
        if (!buffer) {
            // Fallback to synthesized drop sound
            this.playSynthesizedDrop();
            return;
        }

        const sample = this.tracks.samples.simulationDrop;

        // Create source for the sample
        const source = this.context.createBufferSource();
        source.buffer = buffer;

        // Heavy processing for "dropped into simulation" feel
        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(500, this.context.currentTime);
        lowpass.frequency.linearRampToValueAtTime(4000, this.context.currentTime + 2);

        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 30;

        const distortion = this.context.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(30);

        const compressor = this.context.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Reverb-like effect using delay
        const delay = this.context.createDelay();
        delay.delayTime.value = 0.1;
        const delayGain = this.context.createGain();
        delayGain.gain.value = 0.3;

        // Volume envelope - starts quiet, builds up
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0.8, this.context.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(1, this.context.currentTime + 2);
        gain.gain.linearRampToValueAtTime(0.6, this.context.currentTime + sample.duration - 1);
        gain.gain.linearRampToValueAtTime(0, this.context.currentTime + sample.duration);

        // Connect chain
        source.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(distortion);
        distortion.connect(compressor);
        compressor.connect(gain);

        // Add delay for depth
        compressor.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(gain);

        gain.connect(this.sfxGain);

        source.start(0, sample.start, sample.duration);

        // Add sub bass hit for impact
        this.playSubBassHit();
    }

    /**
     * Synthesized drop sound (fallback if MP3 not loaded)
     */
    playSynthesizedDrop() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Deep sub drop
        const sub = this.context.createOscillator();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(100, now);
        sub.frequency.exponentialRampToValueAtTime(30, now + 2);

        const subGain = this.context.createGain();
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.5, now + 0.3);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 3);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 3);

        // Dark noise sweep
        const bufferSize = this.context.sampleRate * 3;
        const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = noiseBuffer;

        const noiseFilter = this.context.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(100, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(2000, now + 1.5);
        noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 3);
        noiseFilter.Q.value = 5;

        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(0.3, now + 0.5);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 3);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 3);

        // Distorted digital artifacts
        for (let i = 0; i < 5; i++) {
            const glitch = this.context.createOscillator();
            glitch.type = 'square';
            glitch.frequency.value = 200 + Math.random() * 500;

            const glitchGain = this.context.createGain();
            const glitchTime = now + 0.2 + Math.random() * 0.5;
            glitchGain.gain.setValueAtTime(0, now);
            glitchGain.gain.setValueAtTime(0.2, glitchTime);
            glitchGain.gain.setValueAtTime(0, glitchTime + 0.05 + Math.random() * 0.1);

            glitch.connect(glitchGain);
            glitchGain.connect(this.sfxGain);
            glitch.start(now);
            glitch.stop(now + 2);
        }
    }

    /**
     * Play a sub bass hit for impact
     */
    playSubBassHit() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.5);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.5);
    }

    /**
     * Stop the current music source
     */
    stopCurrentMusic() {
        if (this.currentMusicSource) {
            try {
                this.currentMusicSource.stop();
                this.currentMusicSource.disconnect();
            } catch (e) {}
            this.currentMusicSource = null;
        }
    }

    /**
     * Resume audio context if suspended
     */
    resume() {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }

    /**
     * Set music volume
     */
    setMusicVolume(vol) {
        this.musicVolume = Math.max(0, Math.min(1, vol));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
    }

    /**
     * Set SFX volume
     */
    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.muted ? 0 : this.masterVolume;
        }
        return this.muted;
    }

    /**
     * Toggle music mute
     */
    toggleMusicMute() {
        this.musicMuted = !this.musicMuted;
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicMuted ? 0 : this.musicVolume;
        }
        return this.musicMuted;
    }

    // ========================================
    // SOUND EFFECT GENERATORS
    // ========================================

    /**
     * Ensure audio context is ready to play
     */
    ensureReady() {
        if (!this.initialized) return false;
        if (this.muted) return false;
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
        }
        return true;
    }

    /**
     * Play blade swing sound
     */
    playSwing(weaponType = 'striker') {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Create noise for swoosh
        const bufferSize = this.context.sampleRate * 0.15;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        // Filter for swoosh character
        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = weaponType === 'crusher' ? 400 : 800;
        filter.Q.value = 1;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.15);
    }

    /**
     * Play hit sound
     */
    playHit(isCrit = false) {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Impact thump
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(isCrit ? 150 : 100, now);
        osc.frequency.exponentialDecayTo(30, now + 0.1);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(isCrit ? 0.5 : 0.3, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.1);

        // Add click for crits
        if (isCrit) {
            const click = this.context.createOscillator();
            click.type = 'square';
            click.frequency.value = 1200;

            const clickGain = this.context.createGain();
            clickGain.gain.setValueAtTime(0.2, now);
            clickGain.gain.exponentialDecayTo(0.01, now + 0.05);

            click.connect(clickGain);
            clickGain.connect(this.sfxGain);

            click.start(now);
            click.stop(now + 0.05);
        }
    }

    /**
     * Play enemy death sound
     */
    playEnemyDeath() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Descending tone
        const osc = this.context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialDecayTo(50, now + 0.3);

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, now);
        filter.frequency.exponentialDecayTo(200, now + 0.3);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.3);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    /**
     * Play player hurt sound
     */
    playPlayerHurt() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Distorted buzz
        const osc = this.context.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);

        const distortion = this.context.createWaveShaper();
        distortion.curve = this.makeDistortionCurve(50);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.2);

        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    /**
     * Play player death sound
     */
    playPlayerDeath() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Dramatic descending tone
        for (let i = 0; i < 3; i++) {
            const osc = this.context.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300 - i * 80, now + i * 0.15);
            osc.frequency.exponentialDecayTo(30, now + i * 0.15 + 0.4);

            const gain = this.context.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.25, now + i * 0.15);
            gain.gain.exponentialDecayTo(0.01, now + i * 0.15 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now);
            osc.stop(now + 0.6);
        }
    }

    /**
     * Play pickup sound
     */
    playPickup(type = 'generic') {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        let freq1, freq2;
        switch (type) {
            case 'health':
                freq1 = 400; freq2 = 600;
                break;
            case 'xp':
                freq1 = 500; freq2 = 800;
                break;
            case 'cycles':
                freq1 = 300; freq2 = 500;
                break;
            case 'imbue':
                freq1 = 600; freq2 = 1000;
                break;
            case 'cosmetic':
                freq1 = 800; freq2 = 1200;
                break;
            default:
                freq1 = 440; freq2 = 660;
        }

        // Two-tone pickup chime
        const osc1 = this.context.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = freq1;

        const osc2 = this.context.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq2;

        const gain1 = this.context.createGain();
        gain1.gain.setValueAtTime(0.2, now);
        gain1.gain.exponentialDecayTo(0.01, now + 0.1);

        const gain2 = this.context.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.setValueAtTime(0.2, now + 0.08);
        gain2.gain.exponentialDecayTo(0.01, now + 0.2);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(this.sfxGain);
        gain2.connect(this.sfxGain);

        osc1.start(now);
        osc1.stop(now + 0.1);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.2);
    }

    /**
     * Play level up / evolution sound
     */
    playLevelUp() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Ascending arpeggio
        const notes = [261, 329, 392, 523]; // C E G C
        notes.forEach((freq, i) => {
            const osc = this.context.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.context.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(0.2, now + i * 0.1);
            gain.gain.exponentialDecayTo(0.01, now + i * 0.1 + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.3);
        });
    }

    /**
     * Play weapon switch sound
     */
    playWeaponSwitch() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Quick mechanical click/switch sound
        const osc = this.context.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialDecayTo(200, now + 0.05);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.1);

        // Secondary click for depth
        const osc2 = this.context.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = 1200;

        const gain2 = this.context.createGain();
        gain2.gain.setValueAtTime(0.1, now + 0.02);
        gain2.gain.exponentialDecayTo(0.01, now + 0.06);

        osc2.connect(gain2);
        gain2.connect(this.sfxGain);

        osc2.start(now + 0.02);
        osc2.stop(now + 0.08);
    }

    /**
     * Play boss attack warning
     */
    playBossWarning() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Alert beep
        for (let i = 0; i < 2; i++) {
            const osc = this.context.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 880;

            const gain = this.context.createGain();
            gain.gain.setValueAtTime(0.15, now + i * 0.15);
            gain.gain.setValueAtTime(0, now + i * 0.15 + 0.1);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.1);
        }
    }

    /**
     * Play boss slam sound
     */
    playBossSlam() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Heavy impact
        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialDecayTo(20, now + 0.5);

        // Noise burst
        const bufferSize = this.context.sampleRate * 0.3;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.5);

        const noiseGain = this.context.createGain();
        noiseGain.gain.setValueAtTime(0.3, now);
        noiseGain.gain.exponentialDecayTo(0.01, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.5);
        noise.start(now);
        noise.stop(now + 0.3);
    }

    /**
     * Play dash sound
     */
    playDash() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        // Whoosh
        const bufferSize = this.context.sampleRate * 0.2;
        const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            const env = Math.sin(Math.PI * i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * env;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = buffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.linearRampToValueAtTime(3000, now + 0.1);
        filter.frequency.linearRampToValueAtTime(500, now + 0.2);
        filter.Q.value = 2;

        const gain = this.context.createGain();
        gain.gain.value = 0.25;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.2);
    }

    /**
     * Play jump sound
     */
    playJump() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialDecayTo(300, now + 0.1);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Play UI click sound
     */
    playUIClick() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1000;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Play UI hover sound
     */
    playUIHover() {
        if (!this.ensureReady()) return;

        const now = this.context.currentTime;

        const osc = this.context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 600;

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialDecayTo(0.01, now + 0.03);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.03);
    }

    // ========================================
    // MUSIC
    // ========================================

    /**
     * Start gameplay music
     */
    startGameplayMusic() {
        if (!this.initialized || this.musicMuted) return;

        this.stopMusic();

        // Create a simple ambient drone
        const now = this.context.currentTime;

        // Base drone
        const drone = this.context.createOscillator();
        drone.type = 'sawtooth';
        drone.frequency.value = 55; // A1

        const droneFilter = this.context.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 200;

        const droneGain = this.context.createGain();
        droneGain.gain.value = 0.1;

        drone.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.musicGain);

        drone.start();

        // Pulsing sub
        const sub = this.context.createOscillator();
        sub.type = 'sine';
        sub.frequency.value = 55;

        const subGain = this.context.createGain();
        subGain.gain.value = 0.15;

        // LFO for pulsing
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.5;

        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 0.1;

        lfo.connect(lfoGain);
        lfoGain.connect(subGain.gain);

        sub.connect(subGain);
        subGain.connect(this.musicGain);

        sub.start();
        lfo.start();

        // High atmospheric pad
        const pad = this.context.createOscillator();
        pad.type = 'sine';
        pad.frequency.value = 440;

        const padFilter = this.context.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 800;

        const padGain = this.context.createGain();
        padGain.gain.value = 0.03;

        pad.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(this.musicGain);

        pad.start();

        this.musicNodes = [drone, sub, lfo, pad];
        this.currentMusic = 'gameplay';
    }

    /**
     * Start boss music
     */
    startBossMusic() {
        if (!this.initialized || this.musicMuted) return;

        this.stopMusic();

        // More intense drone
        const drone = this.context.createOscillator();
        drone.type = 'sawtooth';
        drone.frequency.value = 73.42; // D2

        const droneFilter = this.context.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 300;

        const droneGain = this.context.createGain();
        droneGain.gain.value = 0.12;

        drone.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.musicGain);

        drone.start();

        // Fast pulsing
        const sub = this.context.createOscillator();
        sub.type = 'square';
        sub.frequency.value = 36.71; // D1

        const subGain = this.context.createGain();
        subGain.gain.value = 0.1;

        const lfo = this.context.createOscillator();
        lfo.type = 'square';
        lfo.frequency.value = 2; // Faster pulse

        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 0.08;

        lfo.connect(lfoGain);
        lfoGain.connect(subGain.gain);

        sub.connect(subGain);
        subGain.connect(this.musicGain);

        sub.start();
        lfo.start();

        this.musicNodes = [drone, sub, lfo];
        this.currentMusic = 'boss';
    }

    /**
     * Start title music
     */
    startTitleMusic() {
        if (!this.initialized || this.musicMuted) return;

        this.stopMusic();

        // Mysterious pad
        const pad1 = this.context.createOscillator();
        pad1.type = 'sine';
        pad1.frequency.value = 110;

        const pad2 = this.context.createOscillator();
        pad2.type = 'sine';
        pad2.frequency.value = 165; // Perfect fifth

        const padFilter = this.context.createBiquadFilter();
        padFilter.type = 'lowpass';
        padFilter.frequency.value = 400;

        const padGain = this.context.createGain();
        padGain.gain.value = 0.08;

        // Slow wobble
        const lfo = this.context.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.2;

        const lfoGain = this.context.createGain();
        lfoGain.gain.value = 5;

        lfo.connect(lfoGain);
        lfoGain.connect(pad1.frequency);

        pad1.connect(padFilter);
        pad2.connect(padFilter);
        padFilter.connect(padGain);
        padGain.connect(this.musicGain);

        pad1.start();
        pad2.start();
        lfo.start();

        this.musicNodes = [pad1, pad2, lfo];
        this.currentMusic = 'title';
    }

    /**
     * Stop all music
     */
    stopMusic() {
        // Stop procedural music nodes
        this.musicNodes.forEach(node => {
            try {
                node.stop();
                node.disconnect();
            } catch (e) {}
        });
        this.musicNodes = [];

        // Also stop any MP3-based music
        this.stopCurrentMusic();

        this.currentMusic = null;
    }

    // ========================================
    // UTILITIES
    // ========================================

    /**
     * Create distortion curve
     */
    makeDistortionCurve(amount) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;

        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }

        return curve;
    }
}

// Add exponentialDecayTo helper to AudioParam prototype
if (typeof AudioParam !== 'undefined') {
    AudioParam.prototype.exponentialDecayTo = function(value, endTime) {
        // Clamp to valid range (must be > 0 for exponential)
        const safeValue = Math.max(0.0001, value);
        try {
            this.exponentialRampToValueAtTime(safeValue, endTime);
        } catch (e) {
            this.linearRampToValueAtTime(value, endTime);
        }
    };
}

// Global instance
window.audioSystem = new AudioSystem();
