/**
 * ITERATION - 3D Renderer (WebGL / Three.js)
 *
 * Renders the game world as a true 3D scene on a WebGL canvas placed
 * behind the original 2D canvas. The 2D canvas becomes a transparent
 * overlay used for the HUD, cutscenes and screen-space effects, so every
 * existing system keeps working unchanged.
 *
 * Coordinate system: game world (x, y) maps to three.js (x, -y, z),
 * with all gameplay on the z = 0 plane. The perspective camera distance
 * is chosen so the z = 0 plane projects 1:1 onto the 2D camera viewport,
 * which keeps the HUD and overlay effects perfectly aligned with the world.
 */

class Renderer3D {
    static isSupported() {
        if (typeof THREE === 'undefined') return false;
        try {
            const c = document.createElement('canvas');
            return !!(window.WebGLRenderingContext &&
                (c.getContext('webgl2') || c.getContext('webgl')));
        } catch (e) {
            return false;
        }
    }

    constructor(overlayCanvas) {
        this.overlayCanvas = overlayCanvas;

        // Persisted toggle (default: on)
        this.enabled = localStorage.getItem('iteration_renderer3d') !== '0';

        this.width = GAME_CONFIG.CANVAS_WIDTH;
        this.height = GAME_CONFIG.CANVAS_HEIGHT;

        // WebGL canvas sits directly behind the 2D overlay canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'webgl-canvas';
        overlayCanvas.parentNode.insertBefore(this.canvas, overlayCanvas);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.scene = new THREE.Scene();

        // Perspective camera framing the z=0 plane 1:1 with the 2D camera
        this.fov = 50;
        this.camDistance = (this.height / 2) / Math.tan((this.fov / 2) * Math.PI / 180);
        this.camera = new THREE.PerspectiveCamera(this.fov, this.width / this.height, 10, 12000);
        this.camera.position.set(this.width / 2, -this.height / 2, this.camDistance);

        this.time = 0;
        this.currentZoneIndex = -1;
        this.currentRoomRef = null;

        // Mesh registries (game object -> three.js object)
        this.platformMeshes = new Map();
        this.enemyMeshes = new Map();
        this.interactableMeshes = new Map();
        this.dropMeshes = new Map();
        this.textureCache = new Map();

        this.worldGroup = new THREE.Group();
        this.scene.add(this.worldGroup);

        this.envGroup = new THREE.Group();
        this.scene.add(this.envGroup);

        this.playerGroup = null;
        this.playerParts = null;
        this.bossGroup = null;
        this.bossRef = null;
        this.bossParts = null;

        this.trailMeshes = [];
        this.projectileMeshes = [];
        this.dangerZoneMeshes = [];
        this.waveMeshes = [];

        this.setupLights();
        this.setupParticlePool();
        this.setupPostProcessing();
        this.resize();
        this.setEnabled(this.enabled);
    }

    /* ============================================================
       Setup
       ============================================================ */

    setupLights() {
        this.ambientLight = new THREE.AmbientLight(0x334455, 0.7);
        this.scene.add(this.ambientLight);

        this.keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
        this.keyLight.position.set(0.4, 0.8, 1).normalize();
        this.scene.add(this.keyLight);

        // Travels with the player to make them pop against the world
        this.playerLight = new THREE.PointLight(0x00f0ff, 1.4, 700, 2);
        this.scene.add(this.playerLight);

        // Boss light flares during fights
        this.bossLight = new THREE.PointLight(0xff0044, 0, 900, 2);
        this.scene.add(this.bossLight);
    }

    setupPostProcessing() {
        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));

        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(this.width, this.height),
            0.85,   // strength
            0.55,   // radius
            0.55    // threshold
        );
        this.composer.addPass(this.bloomPass);

        // CRT / vaporwave grade: scanlines, vignette, chromatic
        // aberration, film grain and a glitch channel driven by gameplay.
        this.crtPass = new THREE.ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uGlitch: { value: 0 },
                uResolution: { value: new THREE.Vector2(this.width, this.height) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float uTime;
                uniform float uGlitch;
                uniform vec2 uResolution;
                varying vec2 vUv;

                float rand(vec2 co) {
                    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv;

                    // Glitch: horizontal slice displacement
                    if (uGlitch > 0.01) {
                        float band = floor(uv.y * 24.0 + uTime * 11.0);
                        float jitter = (rand(vec2(band, floor(uTime * 17.0))) - 0.5);
                        if (abs(jitter) > 0.42) {
                            uv.x += jitter * 0.12 * uGlitch;
                        }
                    }

                    // Chromatic aberration, stronger at edges and during glitch
                    vec2 fromCenter = uv - 0.5;
                    float dist = length(fromCenter);
                    float aberration = (0.0012 + dist * 0.004) * (1.0 + uGlitch * 6.0);
                    vec2 dir = dist > 0.0001 ? normalize(fromCenter) : vec2(0.0);
                    float r = texture2D(tDiffuse, uv + dir * aberration).r;
                    float g = texture2D(tDiffuse, uv).g;
                    float b = texture2D(tDiffuse, uv - dir * aberration).b;
                    vec3 color = vec3(r, g, b);

                    // Scanlines
                    float scan = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
                    color *= mix(1.0, 0.92 + scan * 0.08, 0.6);

                    // Subtle rolling line
                    float roll = smoothstep(0.0, 0.012, abs(fract(uv.y - uTime * 0.05) - 0.5) - 0.488);
                    color += (1.0 - roll) * 0.02;

                    // Film grain
                    color += (rand(uv * uTime) - 0.5) * 0.045;

                    // Vaporwave grade: cool shadows, warm magenta highlights
                    color = mix(color, color * vec3(0.96, 0.99, 1.08), 0.35);
                    color += vec3(0.015, 0.0, 0.02);

                    // Vignette
                    float vig = smoothstep(0.95, 0.35, dist);
                    color *= mix(0.62, 1.0, vig);

                    gl_FragColor = vec4(color, 1.0);
                }
            `
        });
        this.composer.addPass(this.crtPass);
    }

    setupParticlePool() {
        // One dynamic point cloud mirrors every 2D particle array
        // (enemy deaths, boss effects) plus our own 3D bursts.
        this.maxParticles = 3000;
        const geo = new THREE.BufferGeometry();
        this.particlePositions = new Float32Array(this.maxParticles * 3);
        this.particleColors = new Float32Array(this.maxParticles * 3);
        geo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
        const mat = new THREE.PointsMaterial({
            size: 6,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });
        this.particlePoints = new THREE.Points(geo, mat);
        this.particlePoints.frustumCulled = false;
        this.scene.add(this.particlePoints);

        // Our own simulated burst particles {x, y, z, vx, vy, vz, life, color}
        this.bursts = [];
    }

    /* ============================================================
       Helpers
       ============================================================ */

    color(hex) {
        const c = new THREE.Color();
        try {
            c.set(hex || '#00f0ff');
        } catch (e) {
            c.set('#00f0ff');
        }
        return c;
    }

    disposeObject(obj) {
        obj.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach(m => {
                    if (m.map) m.map.dispose();
                    m.dispose();
                });
            }
        });
        if (obj.parent) obj.parent.remove(obj);
    }

    glowMaterial(hex, intensity = 1.6) {
        return new THREE.MeshStandardMaterial({
            color: this.color(hex).multiplyScalar(0.25),
            emissive: this.color(hex),
            emissiveIntensity: intensity,
            roughness: 0.4,
            metalness: 0.1
        });
    }

    bodyMaterial(hex) {
        return new THREE.MeshStandardMaterial({
            color: this.color(hex),
            roughness: 0.45,
            metalness: 0.55
        });
    }

    /* ============================================================
       Resize
       ============================================================ */

    resize() {
        // Match the displayed size/position of the 2D overlay canvas
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        this.renderer.setPixelRatio(dpr);
        this.renderer.setSize(this.width, this.height, false);
        this.composer.setSize(this.width * dpr, this.height * dpr);

        // CSS size mirrors the overlay canvas (set by Renderer.resize)
        this.canvas.style.width = this.overlayCanvas.style.width || '100%';
        this.canvas.style.height = this.overlayCanvas.style.height || '100%';
    }

    /* ============================================================
       Zone environment
       ============================================================ */

    setZone(zoneIndex) {
        if (zoneIndex === this.currentZoneIndex) return;
        this.currentZoneIndex = zoneIndex;

        const zc = GAME_CONFIG.ZONE_COLORS[zoneIndex] || GAME_CONFIG.ZONE_COLORS[0];

        // Clear previous environment
        while (this.envGroup.children.length) {
            this.disposeObject(this.envGroup.children[0]);
        }

        const bg = this.color(zc.background);
        this.scene.background = bg.clone().multiplyScalar(0.55);
        this.scene.fog = new THREE.FogExp2(bg.clone().multiplyScalar(0.6).getHex(), 0.00028);

        this.playerLight.color = this.color('#ffffff').lerp(this.color(zc.primary), 0.35);
        this.ambientLight.color = this.color(zc.background).lerp(this.color('#8899bb'), 0.5);

        this.buildStars(zc);
        this.buildSun(zc);
        this.buildGridFloor(zc);
        this.buildFloatingStructures(zc);
        this.buildKanjiPlanes(zc);
    }

    buildStars(zc) {
        const count = 900;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const palette = [this.color('#ffffff'), this.color('#ff71ce'), this.color('#01cdfe'), this.color(zc.primary)];
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 9000;
            positions[i * 3 + 1] = (Math.random() - 0.3) * 5000;
            positions[i * 3 + 2] = -2500 - Math.random() * 4500;
            const c = palette[Math.floor(Math.random() * palette.length)];
            const dim = 0.4 + Math.random() * 0.6;
            colors[i * 3] = c.r * dim;
            colors[i * 3 + 1] = c.g * dim;
            colors[i * 3 + 2] = c.b * dim;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        const mat = new THREE.PointsMaterial({
            size: 7,
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.stars = new THREE.Points(geo, mat);
        this.stars.frustumCulled = false;
        this.envGroup.add(this.stars);
    }

    buildSun(zc) {
        // Classic synthwave striped sun on the horizon
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0 },
                uColorA: { value: this.color(zc.primary) },
                uColorB: { value: this.color('#ff71ce') }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                varying vec2 vUv;
                void main() {
                    vec2 p = vUv - 0.5;
                    float d = length(p) * 2.0;
                    if (d > 1.0) discard;
                    // Horizontal slats that slide downward
                    float stripe = step(0.35, fract(vUv.y * 14.0 - uTime * 0.25));
                    float slatFade = smoothstep(0.0, 0.55, vUv.y);
                    float alpha = (1.0 - smoothstep(0.78, 1.0, d)) * mix(stripe, 1.0, slatFade);
                    vec3 col = mix(uColorB, uColorA, vUv.y);
                    gl_FragColor = vec4(col * 0.75, alpha * 0.5);
                }
            `
        });
        this.sun = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700), mat);
        this.sun.position.set(this.width / 2, -GAME_CONFIG.ROOM.HEIGHT + 260, -5000);
        this.sun.frustumCulled = false;
        this.envGroup.add(this.sun);
    }

    buildGridFloor(zc) {
        const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: this.color(zc.primary) }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vWorld;
                void main() {
                    vUv = uv;
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorld = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                varying vec2 vUv;
                varying vec3 vWorld;
                void main() {
                    // Scrolling grid in world units
                    vec2 g = vec2(vWorld.x / 120.0, (vWorld.z + uTime * 90.0) / 120.0);
                    vec2 cell = abs(fract(g) - 0.5);
                    float line = 1.0 - smoothstep(0.0, 0.06, min(cell.x, cell.y));
                    // Fade with distance from the gameplay plane
                    float depthFade = 1.0 - smoothstep(0.0, 4200.0, -vWorld.z + 200.0);
                    float edgeFade = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
                    float alpha = line * depthFade * edgeFade * 0.8 + 0.03 * depthFade;
                    gl_FragColor = vec4(uColor * (0.6 + line * 1.4), alpha);
                }
            `
        });
        const geo = new THREE.PlaneGeometry(14000, 9000, 1, 1);
        this.gridFloor = new THREE.Mesh(geo, mat);
        this.gridFloor.rotation.x = -Math.PI / 2;
        this.gridFloor.position.set(this.width / 2, -GAME_CONFIG.ROOM.HEIGHT - 60, -3000);
        this.gridFloor.frustumCulled = false;
        this.envGroup.add(this.gridFloor);
    }

    buildFloatingStructures(zc) {
        this.structures = new THREE.Group();
        const geos = [
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.OctahedronGeometry(0.7),
            new THREE.TetrahedronGeometry(0.8)
        ];
        for (let i = 0; i < 34; i++) {
            const geo = geos[Math.floor(Math.random() * geos.length)];
            const wire = Math.random() > 0.4;
            const mat = wire
                ? new THREE.MeshBasicMaterial({
                    color: this.color(zc.primary).multiplyScalar(0.5 + Math.random() * 0.8),
                    wireframe: true,
                    transparent: true,
                    opacity: 0.35 + Math.random() * 0.3
                })
                : new THREE.MeshStandardMaterial({
                    color: this.color(zc.platformBase),
                    emissive: this.color(zc.primary),
                    emissiveIntensity: 0.25,
                    roughness: 0.6,
                    metalness: 0.4,
                    transparent: true,
                    opacity: 0.85
                });
            const mesh = new THREE.Mesh(geo, mat);
            const s = 30 + Math.random() * 160;
            mesh.scale.set(s, s * (0.5 + Math.random() * 2.5), s);
            mesh.position.set(
                (Math.random() - 0.5) * 6000 + this.width / 2,
                -Math.random() * 1800 + 500,
                -350 - Math.random() * 2600
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            mesh.userData.spin = (Math.random() - 0.5) * 0.004;
            mesh.userData.drift = (Math.random() - 0.5) * 0.25;
            mesh.userData.baseY = mesh.position.y;
            mesh.userData.phase = Math.random() * Math.PI * 2;
            this.structures.add(mesh);
        }
        this.envGroup.add(this.structures);
    }

    kanjiTexture(zc) {
        const key = 'kanji_' + this.currentZoneIndex;
        if (this.textureCache.has(key)) return this.textureCache.get(key);
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 1024;
        const ctx = c.getContext('2d');
        const chars = '零一二三四五六七八九十百千万億アイウエオカキクケコサシスセソタチツテト';
        ctx.clearRect(0, 0, c.width, c.height);
        for (let col = 0; col < 14; col++) {
            const x = col * 38 + 8;
            let y = Math.random() * 200;
            const size = 18 + Math.random() * 8;
            ctx.font = `${size}px "MS Gothic", monospace`;
            while (y < c.height) {
                const a = Math.random() * 0.5 + 0.1;
                ctx.fillStyle = Math.random() > 0.8
                    ? `rgba(255, 113, 206, ${a})`
                    : `rgba(1, 205, 254, ${a})`;
                ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y);
                y += size + 4;
            }
        }
        const tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        this.textureCache.set(key, tex);
        return tex;
    }

    buildKanjiPlanes(zc) {
        this.kanjiPlanes = [];
        for (let i = 0; i < 3; i++) {
            const tex = this.kanjiTexture(zc);
            const mat = new THREE.MeshBasicMaterial({
                map: tex,
                transparent: true,
                opacity: 0.18 - i * 0.04,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(2200, 1600), mat);
            plane.position.set(
                this.width / 2 + (i - 1) * 1500,
                -300 - i * 150,
                -500 - i * 450
            );
            plane.userData.speed = 0.00045 + i * 0.0002;
            plane.frustumCulled = false;
            this.kanjiPlanes.push(plane);
            this.envGroup.add(plane);
        }
    }

    /* ============================================================
       Room / platforms
       ============================================================ */

    syncRoom(game) {
        const room = game.currentRoom;
        if (room !== this.currentRoomRef) {
            this.currentRoomRef = room;
            // Clear stale platform meshes
            for (const [plat, mesh] of this.platformMeshes) {
                this.disposeObject(mesh);
            }
            this.platformMeshes.clear();
            this.clearEntityCaches();
        }
        if (!room) return;

        const zc = GAME_CONFIG.ZONE_COLORS[game.currentZoneIndex] || GAME_CONFIG.ZONE_COLORS[0];

        for (const platform of room.platforms) {
            if (platform.invisible) continue;
            let mesh = this.platformMeshes.get(platform);
            if (!mesh) {
                mesh = this.buildPlatformMesh(platform, zc);
                this.platformMeshes.set(platform, mesh);
                this.worldGroup.add(mesh);
            }
            // Moving/deadly platforms animate
            mesh.position.set(
                platform.x + platform.width / 2,
                -(platform.y + platform.height / 2),
                0
            );
            if (platform.deadly && mesh.userData.edgeMat) {
                const pulse = Math.sin(platform.pulsePhase) * 0.5 + 1.4;
                mesh.userData.edgeMat.emissiveIntensity = pulse;
            }
        }
    }

    buildPlatformMesh(platform, zc) {
        const group = new THREE.Group();
        const depth = Math.min(90, Math.max(50, platform.width * 0.35));
        const edgeColor = platform.deadly ? '#ff0044' : (platform.accentColor || zc.platformEdge);

        // Dark slab body
        const bodyGeo = new THREE.BoxGeometry(platform.width, platform.height, depth);
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: this.color(zc.platformBase).multiplyScalar(1.2),
            roughness: 0.55,
            metalness: 0.5
        }));
        group.add(body);

        // Emissive top face strip (the surface you stand on)
        const topMat = this.glowMaterial(edgeColor, platform.deadly ? 1.6 : 0.9);
        const top = new THREE.Mesh(new THREE.BoxGeometry(platform.width, 2.5, depth), topMat);
        top.position.y = platform.height / 2 + 1;
        group.add(top);

        // Neon edge wireframe for the synthwave look
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(bodyGeo),
            new THREE.LineBasicMaterial({
                color: this.color(edgeColor),
                transparent: true,
                opacity: platform.deadly ? 0.95 : 0.55
            })
        );
        group.add(edges);

        // Underside glow accents on larger platforms
        if (platform.width > 110) {
            const accent = new THREE.Mesh(
                new THREE.BoxGeometry(platform.width * 0.6, 3, 6),
                this.glowMaterial(zc.accent || zc.primary, 0.8)
            );
            accent.position.y = -platform.height / 2 - 2;
            group.add(accent);
        }

        group.userData.edgeMat = topMat;
        return group;
    }

    clearEntityCaches() {
        for (const [, mesh] of this.enemyMeshes) this.disposeObject(mesh);
        this.enemyMeshes.clear();
        for (const [, mesh] of this.interactableMeshes) this.disposeObject(mesh);
        this.interactableMeshes.clear();
        for (const [, mesh] of this.dropMeshes) this.disposeObject(mesh);
        this.dropMeshes.clear();
        if (this.bossGroup) {
            this.disposeObject(this.bossGroup);
            this.bossGroup = null;
            this.bossRef = null;
        }
    }

    /* ============================================================
       Player
       ============================================================ */

    buildPlayer(player) {
        if (this.playerGroup) this.disposeObject(this.playerGroup);

        const bodyColor = player.suitBodyColor || player.characterColor || GAME_CONFIG.COLORS.PLAYER;
        const coreColor = player.suitCoreColor || player.characterSecondaryColor || '#ffffff';
        const accent = player.characterAccentColor || bodyColor;

        const g = new THREE.Group();
        const parts = {};

        // Torso: sleek angular slab
        parts.torso = new THREE.Mesh(
            new THREE.BoxGeometry(player.width * 0.72, player.height * 0.42, 16),
            this.bodyMaterial('#10131f')
        );
        parts.torso.position.y = player.height * 0.08;
        g.add(parts.torso);

        // Emissive chest core
        parts.core = new THREE.Mesh(
            new THREE.OctahedronGeometry(6),
            this.glowMaterial(coreColor, 2.2)
        );
        parts.core.position.set(0, player.height * 0.1, 9);
        g.add(parts.core);

        // Head with glowing visor
        parts.head = new THREE.Mesh(
            new THREE.BoxGeometry(player.width * 0.55, 13, 14),
            this.bodyMaterial('#161a28')
        );
        parts.head.position.y = player.height * 0.38;
        g.add(parts.head);

        parts.visor = new THREE.Mesh(
            new THREE.BoxGeometry(player.width * 0.5, 4, 3),
            this.glowMaterial(player.characterEyeColor || accent, 2.5)
        );
        parts.visor.position.set(3, player.height * 0.38, 7);
        g.add(parts.visor);

        // Legs (animated)
        const legGeo = new THREE.BoxGeometry(6, player.height * 0.4, 8);
        const legMat = this.bodyMaterial('#0c0f1a');
        parts.legL = new THREE.Mesh(legGeo, legMat);
        parts.legL.position.set(-6, -player.height * 0.32, 0);
        g.add(parts.legL);
        parts.legR = new THREE.Mesh(legGeo, legMat.clone());
        parts.legR.position.set(6, -player.height * 0.32, 0);
        g.add(parts.legR);

        // Trim lines on body
        const trim = new THREE.LineSegments(
            new THREE.EdgesGeometry(parts.torso.geometry),
            new THREE.LineBasicMaterial({ color: this.color(bodyColor), transparent: true, opacity: 0.8 })
        );
        parts.torso.add(trim);

        // Arm + blade pivot (swings on attack)
        parts.armPivot = new THREE.Group();
        parts.armPivot.position.set(player.width * 0.3, player.height * 0.16, 6);
        g.add(parts.armPivot);

        parts.arm = new THREE.Mesh(new THREE.BoxGeometry(5, 16, 6), this.bodyMaterial('#10131f'));
        parts.arm.position.y = -8;
        parts.armPivot.add(parts.arm);

        // Blade (rebuilt when tier changes)
        parts.bladeGroup = new THREE.Group();
        parts.bladeGroup.position.y = -14;
        parts.armPivot.add(parts.bladeGroup);

        this.playerGroup = g;
        this.playerParts = parts;
        this.playerBladeKey = null;
        this.worldGroup.add(g);
    }

    buildBlade(player) {
        const parts = this.playerParts;
        while (parts.bladeGroup.children.length) {
            this.disposeObject(parts.bladeGroup.children[0]);
        }
        const len = (player.bladeLength || 38) * 1.15;
        const color = player.bladeColor || GAME_CONFIG.COLORS.BLADE;

        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(4, len, 7),
            this.glowMaterial(color, 2.6)
        );
        blade.position.y = -len / 2;
        parts.bladeGroup.add(blade);

        // Energy edge
        const edge = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, len, 9),
            this.glowMaterial('#ffffff', 3.2)
        );
        edge.position.y = -len / 2;
        parts.bladeGroup.add(edge);

        // Hilt
        const hilt = new THREE.Mesh(new THREE.BoxGeometry(7, 6, 9), this.bodyMaterial('#222633'));
        parts.bladeGroup.add(hilt);

        this.bladeLight = new THREE.PointLight(this.color(color), 0.9, 220, 2);
        this.bladeLight.position.y = -len / 2;
        parts.bladeGroup.add(this.bladeLight);
    }

    syncPlayer(game) {
        const player = game.player;
        if (!player) {
            if (this.playerGroup) this.playerGroup.visible = false;
            return;
        }

        // (Re)build on character/suit change
        const key = [player.characterId, player.suitBodyColor, player.width, player.height].join('|');
        if (!this.playerGroup || this.playerKey !== key) {
            this.playerKey = key;
            this.buildPlayer(player);
        }
        const bladeKey = [player.bladeType, player.bladeColor, player.bladeLength, player.weaponStyle].join('|');
        if (this.playerBladeKey !== bladeKey) {
            this.playerBladeKey = bladeKey;
            this.buildBlade(player);
        }

        const g = this.playerGroup;
        const parts = this.playerParts;
        g.visible = player.active !== false;

        const cx = player.x + player.width / 2;
        const cy = player.y + player.height / 2;
        g.position.set(cx, -cy, 0);

        // Face direction with a slight 3/4 turn for depth
        const targetYaw = player.facingRight ? 0.45 : Math.PI - 0.45;
        g.rotation.y += (targetYaw - g.rotation.y) * 0.3;

        // Lean into motion; tilt against the wall while wall-sliding
        let targetTilt = THREE.MathUtils.clamp(-player.velocityX * 0.035, -0.3, 0.3);
        if (player.isWallSliding) {
            targetTilt = player.wallContact === 1 ? 0.35 : -0.35;
        }
        g.rotation.z += (targetTilt - g.rotation.z) * 0.25;

        // Run cycle / air pose
        const t = this.time;
        if (player.state === 'run') {
            const swing = Math.sin(t * 0.35) * 0.7;
            parts.legL.rotation.x = swing;
            parts.legR.rotation.x = -swing;
        } else if (!player.isGrounded) {
            parts.legL.rotation.x += (0.5 - parts.legL.rotation.x) * 0.2;
            parts.legR.rotation.x += (-0.3 - parts.legR.rotation.x) * 0.2;
        } else {
            parts.legL.rotation.x *= 0.8;
            parts.legR.rotation.x *= 0.8;
        }

        // Idle hover of the chest core
        parts.core.rotation.y = t * 0.05;
        parts.core.position.z = 9 + Math.sin(t * 0.08) * 1.5;

        // Blade swing
        if (player.isAttacking) {
            const p = player.attackFrame / player.attackDuration;
            // Fast anticipation -> sweep -> settle
            parts.armPivot.rotation.z = THREE.MathUtils.lerp(2.2, -2.4, this.easeOutCubic(p));
            if (this.bladeLight) this.bladeLight.intensity = 2.2;
        } else if (player.isCharging) {
            parts.armPivot.rotation.z = 2.0 + Math.sin(t * 0.5) * 0.08 * (player.chargeLevel + 1);
            if (this.bladeLight) this.bladeLight.intensity = 1 + player.chargeLevel * 0.8;
        } else {
            parts.armPivot.rotation.z *= 0.75;
            if (this.bladeLight) this.bladeLight.intensity += (0.9 - this.bladeLight.intensity) * 0.2;
        }

        // Invincibility flicker
        g.traverse((n) => {
            if (n.material && n.material.transparent !== undefined) {
                // handled via group visibility flicker below
            }
        });
        if (player.invincibilityFrames > 0) {
            g.visible = Math.floor(t / 3) % 2 === 0;
        }

        // Dash: motion stretch + afterimages
        if (player.isDashing) {
            g.scale.x += (1.35 - g.scale.x) * 0.4;
            g.scale.y += (0.8 - g.scale.y) * 0.4;
            if (this.time % 2 === 0) {
                this.spawnTrailGhost(player);
            }
        } else {
            g.scale.x += (1 - g.scale.x) * 0.25;
            g.scale.y += (1 - g.scale.y) * 0.25;
        }

        // Charge rings
        if (player.isCharging && player.chargeLevel > 0) {
            if (this.time % 9 === 0) {
                this.spawnRing(cx, cy, player.bladeColor, 14 + player.chargeLevel * 6, 0.04);
            }
        }
        // Special activation burst
        if (player.specialActivationBurst > 0 && this.time % 2 === 0) {
            this.spawnBurst(cx, cy, '#ffdd00', 6, 7);
        }
        // Wall slide sparks
        if (player.isWallSliding && this.time % 4 === 0) {
            const sparkX = player.wallContact === 1 ? player.x + player.width : player.x;
            this.spawnBurst(sparkX, player.y + player.height * 0.7, '#ffffff', 2, 3);
        }

        // Player light follows
        this.playerLight.position.set(cx, -cy + 30, 160);
    }

    easeOutCubic(p) {
        return 1 - Math.pow(1 - p, 3);
    }

    spawnTrailGhost(player) {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(player.width * 0.8, player.height * 0.85, 10),
            new THREE.MeshBasicMaterial({
                color: this.color(player.bladeColor || '#00f0ff'),
                transparent: true,
                opacity: 0.35,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        mesh.position.set(player.x + player.width / 2, -(player.y + player.height / 2), -4);
        mesh.userData.decay = 0.06;
        this.trailMeshes.push(mesh);
        this.worldGroup.add(mesh);
    }

    updateTrails() {
        for (let i = this.trailMeshes.length - 1; i >= 0; i--) {
            const m = this.trailMeshes[i];
            m.material.opacity -= m.userData.decay;
            m.scale.multiplyScalar(0.985);
            if (m.material.opacity <= 0.02) {
                this.disposeObject(m);
                this.trailMeshes.splice(i, 1);
            }
        }
    }

    /* ============================================================
       Enemies
       ============================================================ */

    buildEnemyMesh(enemy) {
        const g = new THREE.Group();
        const variant = enemy.colorVariant || { main: '#ff00aa', core: '#ffffff', accent: '#ff71ce' };

        // Core: rotating octahedron drone body
        const core = new THREE.Mesh(
            new THREE.OctahedronGeometry(enemy.width * 0.42),
            new THREE.MeshStandardMaterial({
                color: this.color('#141020'),
                emissive: this.color(variant.main),
                emissiveIntensity: 0.55,
                roughness: 0.4,
                metalness: 0.6
            })
        );
        g.add(core);

        // Wireframe shell
        const shell = new THREE.Mesh(
            new THREE.OctahedronGeometry(enemy.width * 0.58),
            new THREE.MeshBasicMaterial({
                color: this.color(variant.main),
                wireframe: true,
                transparent: true,
                opacity: 0.55
            })
        );
        g.add(shell);

        // Glowing eye
        const eye = new THREE.Mesh(
            new THREE.SphereGeometry(4.5, 10, 10),
            this.glowMaterial(variant.core, 2.4)
        );
        eye.position.set(0, 2, enemy.width * 0.34);
        g.add(eye);

        // Hover ring
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(enemy.width * 0.55, 1.4, 8, 24),
            this.glowMaterial(variant.accent, 1.2)
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = -enemy.height * 0.45;
        g.add(ring);

        g.userData = { core, shell, eye, ring, variant };
        return g;
    }

    syncEnemies(game) {
        const seen = new Set();
        for (const enemy of game.enemies) {
            if (!enemy.active && (!this.enemyMeshes.has(enemy))) continue;
            seen.add(enemy);
            let mesh = this.enemyMeshes.get(enemy);
            if (!mesh) {
                mesh = this.buildEnemyMesh(enemy);
                this.enemyMeshes.set(enemy, mesh);
                this.worldGroup.add(mesh);
            }
            const u = mesh.userData;
            mesh.position.set(
                enemy.x + enemy.width / 2,
                -(enemy.y + enemy.height / 2) + Math.sin(enemy.pulsePhase) * 2,
                0
            );
            u.core.rotation.y += 0.04;
            u.core.rotation.x = Math.sin(enemy.pulsePhase * 0.7) * 0.3;
            u.shell.rotation.y -= 0.02;
            u.ring.rotation.z += 0.03;

            // State-driven glow
            let intensity = 0.55;
            if (enemy.aiState === 'chase') intensity = 1.0;
            if (enemy.aiState === 'attack') intensity = 1.8;
            if (enemy.hitFlash > 0) {
                u.core.material.emissive = this.color('#ffffff');
                intensity = 3.0;
            } else {
                u.core.material.emissive = this.color(u.variant.main);
            }
            // Status effect tints
            if (enemy.statusEffects && enemy.statusEffects.length) {
                const fx = enemy.statusEffects[0];
                if (fx.type === 'burn') u.core.material.emissive = this.color('#ff6600');
                if (fx.type === 'bleed') u.core.material.emissive = this.color('#ff0033');
            }
            if (enemy.slowDuration > 0) u.core.material.emissive = this.color('#66ccff');
            u.core.material.emissiveIntensity = intensity;

            // Death: burst + remove
            if (!enemy.active || enemy.health <= 0) {
                this.spawnBurst(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    u.variant.main, 18, 6
                );
                this.disposeObject(mesh);
                this.enemyMeshes.delete(enemy);
                seen.delete(enemy);
            }
        }
        // Remove meshes for despawned enemies
        for (const [enemy, mesh] of this.enemyMeshes) {
            if (!seen.has(enemy)) {
                this.disposeObject(mesh);
                this.enemyMeshes.delete(enemy);
            }
        }
    }

    /* ============================================================
       Boss
       ============================================================ */

    bossShapeGeometry(shape, radius) {
        const sides = { hexagon: 6, triangle: 3, square: 4, octagon: 8 }[shape];
        let shape2d;
        if (shape === 'star') {
            shape2d = new THREE.Shape();
            const points = 5;
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? radius : radius * 0.45;
                const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) shape2d.moveTo(x, y); else shape2d.lineTo(x, y);
            }
            shape2d.closePath();
        } else {
            shape2d = new THREE.Shape();
            const n = sides || 6;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * radius;
                const y = Math.sin(a) * radius;
                if (i === 0) shape2d.moveTo(x, y); else shape2d.lineTo(x, y);
            }
            shape2d.closePath();
        }
        return new THREE.ExtrudeGeometry(shape2d, {
            depth: radius * 0.55,
            bevelEnabled: true,
            bevelThickness: 4,
            bevelSize: 3,
            bevelSegments: 2
        });
    }

    buildBoss(boss) {
        if (this.bossGroup) this.disposeObject(this.bossGroup);
        const v = boss.visuals;
        const scale = v.scale || 1;
        const radius = (boss.width / 2) * 1.1 * scale;

        const g = new THREE.Group();
        const parts = { orbits: [], eyes: [], spikes: [] };

        // Main extruded body
        const bodyGeo = this.bossShapeGeometry(v.shape, radius);
        bodyGeo.center();
        parts.body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({
            color: this.color('#0c0a18'),
            emissive: this.color(v.primaryColor),
            emissiveIntensity: 0.4,
            roughness: 0.35,
            metalness: 0.7
        }));
        g.add(parts.body);

        // Neon edges
        parts.edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(bodyGeo, 20),
            new THREE.LineBasicMaterial({ color: this.color(v.primaryColor), transparent: true, opacity: 0.9 })
        );
        parts.body.add(parts.edges);

        // Inner core
        parts.core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(radius * 0.32, 1),
            this.glowMaterial(v.secondaryColor, 2.0)
        );
        parts.core.position.z = radius * 0.4;
        g.add(parts.core);

        // Eyes
        for (let i = 0; i < (v.eyeCount || 1); i++) {
            const eye = new THREE.Mesh(
                new THREE.SphereGeometry(radius * 0.1, 12, 12),
                this.glowMaterial('#ffffff', 3.0)
            );
            const a = (i / (v.eyeCount || 1)) * Math.PI * 2;
            eye.position.set(
                Math.cos(a) * radius * 0.45,
                Math.sin(a) * radius * 0.45,
                radius * 0.42
            );
            parts.eyes.push(eye);
            g.add(eye);
        }

        // Orbitals
        for (let i = 0; i < (v.orbitCount || 4); i++) {
            const orb = new THREE.Mesh(
                new THREE.TetrahedronGeometry(radius * 0.14),
                this.glowMaterial(v.glowColor, 1.6)
            );
            orb.userData.angle = (i / (v.orbitCount || 4)) * Math.PI * 2;
            orb.userData.dist = radius * 1.7;
            orb.userData.vSpeed = 0.6 + (i % 3) * 0.25;
            parts.orbits.push(orb);
            g.add(orb);
        }

        // Spikes
        if (v.hasSpikes) {
            const n = 8;
            for (let i = 0; i < n; i++) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(radius * 0.08, radius * 0.5, 6),
                    this.glowMaterial(v.primaryColor, 1.0)
                );
                const a = (i / n) * Math.PI * 2;
                spike.position.set(Math.cos(a) * radius * 1.05, Math.sin(a) * radius * 1.05, 0);
                spike.rotation.z = a - Math.PI / 2;
                parts.spikes.push(spike);
                g.add(spike);
            }
        }

        this.bossGroup = g;
        this.bossParts = parts;
        this.worldGroup.add(g);
    }

    syncBoss(game) {
        const boss = game.boss;
        if (!boss || !boss.active) {
            if (this.bossGroup) {
                if (this.bossRef && (!boss || boss !== this.bossRef)) {
                    // Boss died: big burst
                    const b = this.bossRef;
                    this.spawnBurst(b.x + b.width / 2, b.y + b.height / 2,
                        b.visuals ? b.visuals.primaryColor : '#ff0044', 60, 12);
                }
                this.disposeObject(this.bossGroup);
                this.bossGroup = null;
                this.bossRef = null;
            }
            this.bossLight.intensity += (0 - this.bossLight.intensity) * 0.1;
            this.clearDangerZones();
            return;
        }

        if (boss !== this.bossRef) {
            this.bossRef = boss;
            this.buildBoss(boss);
            this.bossLight.color = this.color(boss.visuals.glowColor);
        }

        const g = this.bossGroup;
        const parts = this.bossParts;
        const cx = boss.x + boss.width / 2;
        const cy = boss.y + boss.height / 2;
        g.position.set(cx, -cy, 0);

        // Slow menacing rotation, faster per phase
        const spin = 0.004 + boss.phase * 0.004 + (boss.enraged ? 0.012 : 0);
        parts.body.rotation.z += spin;
        parts.body.rotation.y = Math.sin(this.time * 0.01 + boss.rotationOffset) * 0.35;
        parts.core.rotation.x += 0.02;
        parts.core.rotation.y += 0.03;

        // Phase-driven glow
        const baseIntensity = 0.4 + boss.phase * 0.3;
        parts.body.material.emissiveIntensity = boss.hitFlash > 0 ? 2.5 : baseIntensity;
        parts.body.material.emissive = boss.hitFlash > 0
            ? this.color('#ffffff')
            : this.color(boss.visuals.primaryColor);

        // Entry shimmer
        const entryAlpha = boss.isEntering ? 0.4 + 0.6 * (1 - boss.entryTimer / 90) : 1;
        g.scale.setScalar(entryAlpha);

        // Orbitals
        for (const orb of parts.orbits) {
            orb.userData.angle += 0.02 * orb.userData.vSpeed * (boss.enraged ? 2 : 1);
            const a = orb.userData.angle;
            orb.position.set(
                Math.cos(a) * orb.userData.dist,
                Math.sin(a) * orb.userData.dist * 0.7,
                Math.sin(a * 2) * 30
            );
            orb.rotation.x += 0.05;
            orb.rotation.y += 0.04;
        }

        // Eyes track the player
        if (game.player) {
            const dx = (game.player.x - boss.x);
            const dy = -(game.player.y - boss.y);
            const look = Math.atan2(dy, dx);
            for (const eye of parts.eyes) {
                eye.position.z = (boss.width / 2) * 0.5;
                eye.scale.setScalar(boss.phase >= 3 ? 1.3 : 1);
            }
            g.rotation.y = THREE.MathUtils.clamp(Math.cos(look) * 0.15, -0.3, 0.3);
        }

        // Boss light pulses with phase
        this.bossLight.position.set(cx, -cy, 180);
        const targetIntensity = 1.2 + boss.phase * 0.7 + (boss.hitFlash > 0 ? 2 : 0);
        this.bossLight.intensity += (targetIntensity - this.bossLight.intensity) * 0.15;

        this.syncDangerZones(boss);
        this.syncBossProjectiles(boss);
    }

    clearDangerZones() {
        for (const m of this.dangerZoneMeshes) this.disposeObject(m);
        this.dangerZoneMeshes = [];
    }

    syncDangerZones(boss) {
        // Rebuild simple translucent volumes each frame (cheap: few zones)
        this.clearDangerZones();
        if (!boss.dangerZones) return;
        for (const zone of boss.dangerZones) {
            if (!zone.active) continue;
            const progress = 1 - (zone.duration / zone.maxDuration);
            const pulse = 0.18 + Math.sin(this.time * 0.4) * 0.06 + progress * 0.25;
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(zone.width, zone.height, 70),
                new THREE.MeshBasicMaterial({
                    color: this.color('#ff0044'),
                    transparent: true,
                    opacity: Math.min(0.55, pulse),
                    depthWrite: false,
                    blending: THREE.AdditiveBlending
                })
            );
            mesh.position.set(zone.x + zone.width / 2, -(zone.y + zone.height / 2), 0);
            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(mesh.geometry),
                new THREE.LineBasicMaterial({ color: this.color('#ff2255'), transparent: true, opacity: 0.9 })
            );
            mesh.add(edges);
            this.dangerZoneMeshes.push(mesh);
            this.worldGroup.add(mesh);
        }
    }

    syncBossProjectiles(boss) {
        this.syncProjectileList(boss.projectiles || [], '#ff3366');
    }

    syncProjectileList(list, fallbackColor) {
        // Grow pool as needed
        while (this.projectileMeshes.length < list.length) {
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(1, 10, 10),
                this.glowMaterial(fallbackColor, 2.4)
            );
            this.projectileMeshes.push(mesh);
            this.worldGroup.add(mesh);
        }
        for (let i = 0; i < this.projectileMeshes.length; i++) {
            const mesh = this.projectileMeshes[i];
            const p = list[i];
            if (p && p.life > 0) {
                mesh.visible = true;
                mesh.position.set(p.x, -p.y, 0);
                const s = p.size || 8;
                mesh.scale.setScalar(s);
                mesh.rotation.y += 0.1;
            } else {
                mesh.visible = false;
            }
        }
    }

    /* ============================================================
       Drops & interactables
       ============================================================ */

    syncDrops(game) {
        const drops = (game.dropSystem && game.dropSystem.groundDrops) || [];
        const seen = new Set();
        for (const drop of drops) {
            if (drop.collected) continue;
            seen.add(drop);
            let mesh = this.dropMeshes.get(drop);
            if (!mesh) {
                const color = (drop.type && (drop.type.color || drop.type.glowColor)) || '#00ff88';
                mesh = new THREE.Mesh(
                    new THREE.OctahedronGeometry(9),
                    this.glowMaterial(color, 2.0)
                );
                this.dropMeshes.set(drop, mesh);
                this.worldGroup.add(mesh);
            }
            mesh.position.set(drop.x, -(drop.y - Math.sin(drop.bobPhase) * 3), 6);
            mesh.rotation.y += 0.06;
            mesh.rotation.x = Math.sin(drop.bobPhase * 0.5) * 0.3;
        }
        for (const [drop, mesh] of this.dropMeshes) {
            if (!seen.has(drop)) {
                this.disposeObject(mesh);
                this.dropMeshes.delete(drop);
            }
        }
    }

    buildInteractableMesh(it, zc) {
        const g = new THREE.Group();
        switch (it.type) {
            case 'chest':
            case 'elevated_chest': {
                const rare = it.type === 'elevated_chest';
                const base = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width, it.height * 0.6, 34),
                    this.bodyMaterial('#1a1626')
                );
                base.position.y = -it.height * 0.18;
                g.add(base);
                const lid = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width, it.height * 0.4, 34),
                    this.bodyMaterial('#241d33')
                );
                lid.position.y = it.height * 0.12;
                g.add(lid);
                const seam = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width + 2, 2.5, 35),
                    this.glowMaterial(rare ? '#ffdd00' : zc.primary, 2.0)
                );
                g.add(seam);
                g.userData.lid = lid;
                break;
            }
            case 'terminal': {
                const stand = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width * 0.4, it.height, 12),
                    this.bodyMaterial('#141220')
                );
                g.add(stand);
                const screen = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width, it.height * 0.55, 4),
                    this.glowMaterial('#00ff88', 1.4)
                );
                screen.position.set(0, it.height * 0.18, 8);
                g.add(screen);
                g.userData.screen = screen;
                break;
            }
            case 'health_station': {
                const pod = new THREE.Mesh(
                    new THREE.CylinderGeometry(it.width * 0.45, it.width * 0.55, it.height, 8),
                    this.bodyMaterial('#11202a')
                );
                g.add(pod);
                const crossV = new THREE.Mesh(new THREE.BoxGeometry(5, 22, 4), this.glowMaterial('#00ff88', 2.2));
                const crossH = new THREE.Mesh(new THREE.BoxGeometry(22, 5, 4), this.glowMaterial('#00ff88', 2.2));
                crossV.position.z = it.width * 0.45;
                crossH.position.z = it.width * 0.45;
                g.add(crossV, crossH);
                break;
            }
            case 'cycle_node': {
                const node = new THREE.Mesh(
                    new THREE.IcosahedronGeometry(it.width * 0.5, 0),
                    this.glowMaterial(zc.primary, 1.8)
                );
                g.add(node);
                g.userData.spin = node;
                break;
            }
            case 'exit_portal': {
                const ring = new THREE.Mesh(
                    new THREE.TorusGeometry(it.width * 0.55, 5, 12, 40),
                    this.glowMaterial(zc.accent || zc.primary, 2.2)
                );
                g.add(ring);
                const inner = new THREE.Mesh(
                    new THREE.CircleGeometry(it.width * 0.48, 32),
                    new THREE.MeshBasicMaterial({
                        color: this.color(zc.primary),
                        transparent: true,
                        opacity: 0.25,
                        blending: THREE.AdditiveBlending,
                        depthWrite: false,
                        side: THREE.DoubleSide
                    })
                );
                g.add(inner);
                g.userData.ring = ring;
                g.userData.inner = inner;
                break;
            }
            case 'health_potion': {
                const orb = new THREE.Mesh(
                    new THREE.SphereGeometry(it.width * 0.4, 12, 12),
                    this.glowMaterial('#00ff88', 2.0)
                );
                g.add(orb);
                g.userData.spin = orb;
                break;
            }
            default: {
                const box = new THREE.Mesh(
                    new THREE.BoxGeometry(it.width, it.height, 20),
                    this.glowMaterial(zc.primary, 1.0)
                );
                g.add(box);
            }
        }
        return g;
    }

    syncInteractables(game) {
        const zc = GAME_CONFIG.ZONE_COLORS[game.currentZoneIndex] || GAME_CONFIG.ZONE_COLORS[0];
        const seen = new Set();
        for (const it of game.interactables) {
            if (!it.active) continue;
            seen.add(it);
            let mesh = this.interactableMeshes.get(it);
            if (!mesh) {
                mesh = this.buildInteractableMesh(it, zc);
                this.interactableMeshes.set(it, mesh);
                this.worldGroup.add(mesh);
            }
            mesh.position.set(it.x + it.width / 2, -(it.y + it.height / 2), 0);

            // Animations
            if (mesh.userData.spin) {
                mesh.userData.spin.rotation.y += 0.03;
                mesh.position.y += Math.sin(it.pulsePhase + this.time * 0.05) * 0.6;
            }
            if (mesh.userData.ring) {
                mesh.userData.ring.rotation.z += 0.02;
                const pulse = 1 + Math.sin(this.time * 0.08) * 0.06;
                mesh.userData.ring.scale.setScalar(pulse);
                mesh.userData.inner.material.opacity = 0.2 + Math.sin(this.time * 0.1) * 0.1;
            }
            if (mesh.userData.lid && it.used) {
                mesh.userData.lid.rotation.x += (-1.0 - mesh.userData.lid.rotation.x) * 0.15;
            }
            if (mesh.userData.screen) {
                mesh.userData.screen.material.emissiveIntensity =
                    it.used ? 0.4 : 1.2 + Math.sin(this.time * 0.12) * 0.3;
            }
            // Highlight when player is nearby
            const targetScale = it.playerNearby && !it.used ? 1.08 : 1;
            mesh.scale.x += (targetScale - mesh.scale.x) * 0.2;
            mesh.scale.y = mesh.scale.z = mesh.scale.x;
        }
        for (const [it, mesh] of this.interactableMeshes) {
            if (!seen.has(it)) {
                this.disposeObject(mesh);
                this.interactableMeshes.delete(it);
            }
        }
    }

    /* ============================================================
       Blade waves / shockwaves
       ============================================================ */

    syncBladeWaves(game) {
        // Traveling energy crescents fired by blade abilities
        for (const m of this.waveMeshes) this.disposeObject(m);
        this.waveMeshes = [];
        if (!game.bladeWaves) return;
        for (const wave of game.bladeWaves) {
            if (!wave.active) continue;
            const color = wave.color || '#00f0ff';
            const fade = Math.min(1, (wave.lifetime || 30) / 30);
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(1, 12, 12),
                new THREE.MeshBasicMaterial({
                    color: this.color(color),
                    transparent: true,
                    opacity: 0.85 * fade,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            );
            // Stretch along travel direction for a crescent-bolt look
            // (wave.x/y is the centre point, matching the 2D ellipse render)
            mesh.scale.set((wave.width || 40) * 0.55, (wave.height || 20) * 0.7, 10);
            mesh.position.set(wave.x, -wave.y, 0);
            this.waveMeshes.push(mesh);
            this.worldGroup.add(mesh);
            // Sparkle trail
            if (this.time % 3 === 0) {
                this.spawnBurst(wave.x, wave.y, color, 2, 2);
            }
        }
    }

    /* ============================================================
       Particles
       ============================================================ */

    spawnBurst(x, y, colorHex, count = 12, speed = 6) {
        const c = this.color(colorHex);
        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = (0.3 + Math.random() * 0.7) * speed;
            this.bursts.push({
                x, y: -y,
                z: (Math.random() - 0.5) * 40,
                vx: Math.cos(a) * v,
                vy: Math.sin(a) * v + 2,
                vz: (Math.random() - 0.5) * v,
                life: 30 + Math.random() * 30,
                maxLife: 60,
                r: c.r, g: c.g, b: c.b
            });
        }
        if (this.bursts.length > 800) {
            this.bursts.splice(0, this.bursts.length - 800);
        }
    }

    spawnRing(x, y, colorHex, radius, decay) {
        const c = this.color(colorHex);
        const n = 14;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            this.bursts.push({
                x: x + Math.cos(a) * radius,
                y: -y + Math.sin(a) * radius,
                z: 0,
                vx: Math.cos(a) * 1.5,
                vy: Math.sin(a) * 1.5,
                vz: 0,
                life: 20, maxLife: 20,
                r: c.r, g: c.g, b: c.b
            });
        }
    }

    updateParticles(game) {
        // Simulate our own bursts
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const p = this.bursts[i];
            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;
            p.vy -= 0.18; // gravity (three-space: down is -y)
            p.life--;
            if (p.life <= 0) this.bursts.splice(i, 1);
        }

        // Fill the buffer: bursts + mirrored 2D particle arrays
        let n = 0;
        const pos = this.particlePositions;
        const col = this.particleColors;
        const push = (x, y, r, g, b) => {
            if (n >= this.maxParticles) return;
            pos[n * 3] = x;
            pos[n * 3 + 1] = y;
            pos[n * 3 + 2] = (n % 7 - 3) * 4;
            col[n * 3] = r;
            col[n * 3 + 1] = g;
            col[n * 3 + 2] = b;
            n++;
        };

        for (const p of this.bursts) {
            const fade = p.life / p.maxLife;
            push(p.x, p.y, p.r * fade * 1.6, p.g * fade * 1.6, p.b * fade * 1.6);
        }

        const mirror = (arr, fallback) => {
            if (!arr) return;
            const c = this.color(fallback);
            for (const p of arr) {
                if (p.x === undefined || p.y === undefined) continue;
                let pc = c;
                if (p.color) pc = this.color(p.color);
                push(p.x, -p.y, pc.r, pc.g, pc.b);
            }
        };
        if (game.enemies) {
            for (const e of game.enemies) mirror(e.particles, '#ff00aa');
        }
        if (game.boss) mirror(game.boss.particles, '#ff0044');

        this.particlePoints.geometry.setDrawRange(0, n);
        this.particlePoints.geometry.attributes.position.needsUpdate = true;
        this.particlePoints.geometry.attributes.color.needsUpdate = true;
    }

    /* ============================================================
       Camera
       ============================================================ */

    syncCamera(game) {
        const camPos = game.camera.getFinalPosition();
        const cx = camPos.x + this.width / 2;
        const cy = -(camPos.y + this.height / 2);

        this.camera.position.x = cx;
        this.camera.position.y = cy;

        // Subtle dynamic depth: dolly out slightly during boss fights,
        // punch in a touch during dashes. Kept small so the overlay
        // HUD stays visually aligned with the world.
        let targetDist = this.camDistance;
        if (game.boss && game.boss.active) targetDist = this.camDistance * 1.02;
        if (game.player && game.player.isDashing) targetDist = this.camDistance * 0.985;
        this.camera.position.z += (targetDist - this.camera.position.z) * 0.06;

        // Gentle velocity-based roll
        let roll = 0;
        if (game.player) {
            roll = THREE.MathUtils.clamp(-game.player.velocityX * 0.0012, -0.008, 0.008);
        }
        this.camera.rotation.z += (roll - this.camera.rotation.z) * 0.08;

        this.camera.lookAt(cx, cy, 0);
        this.camera.rotation.z += roll;
    }

    /* ============================================================
       Main render
       ============================================================ */

    render(game) {
        this.time++;

        this.setZone(game.currentZoneIndex || 0);

        // Animate environment
        if (this.sun) this.sun.material.uniforms.uTime.value = this.time * 0.016;
        if (this.gridFloor) this.gridFloor.material.uniforms.uTime.value = this.time * 0.016;
        if (this.stars) this.stars.rotation.z += 0.00012;
        if (this.structures) {
            for (const s of this.structures.children) {
                s.rotation.y += s.userData.spin;
                s.rotation.x += s.userData.spin * 0.6;
                s.position.y = s.userData.baseY + Math.sin(this.time * 0.008 + s.userData.phase) * 24;
            }
        }
        if (this.kanjiPlanes) {
            for (const p of this.kanjiPlanes) {
                p.material.map.offset.y -= p.userData.speed;
            }
        }

        // Sync world
        this.syncRoom(game);
        this.syncPlayer(game);
        this.syncEnemies(game);
        this.syncBoss(game);
        this.syncDrops(game);
        this.syncInteractables(game);
        this.syncBladeWaves(game);
        this.updateTrails();
        this.updateParticles(game);
        this.syncCamera(game);

        // Drive the GPU glitch from the 2D renderer's glitch state so
        // existing renderer.glitch() calls keep working in 3D mode.
        const glitch = game.renderer ? (game.renderer.glitchTimer > 0 ? game.renderer.glitchIntensity : 0) : 0;
        this.crtPass.uniforms.uGlitch.value = Math.min(1.5, glitch * 0.4);
        this.crtPass.uniforms.uTime.value = this.time * 0.016;

        this.composer.render();
    }

    /* ============================================================
       Mode toggling
       ============================================================ */

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('iteration_renderer3d', enabled ? '1' : '0');
        this.canvas.style.display = enabled ? '' : 'none';
        // The 2D canvas needs a transparent CSS background in 3D mode
        this.overlayCanvas.classList.toggle('overlay-3d', enabled);
    }
}
