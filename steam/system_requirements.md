# ITERATION - System Requirements & Technical Specs

## Minimum Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | Windows 7/8/10/11 (64-bit) |
| **Processor** | Intel Core i3-2100 / AMD FX-4300 or equivalent |
| **Memory** | 4 GB RAM |
| **Graphics** | Intel HD Graphics 4000 / AMD Radeon HD 5450 / NVIDIA GeForce GT 430 |
| **DirectX** | Version 11 |
| **Storage** | 200 MB available space |
| **Sound Card** | DirectX compatible |

---

## Recommended Requirements

| Component | Specification |
|-----------|---------------|
| **OS** | Windows 10/11 (64-bit) |
| **Processor** | Intel Core i5-4460 / AMD Ryzen 3 1200 or equivalent |
| **Memory** | 8 GB RAM |
| **Graphics** | NVIDIA GeForce GTX 750 Ti / AMD Radeon R7 265 or equivalent |
| **DirectX** | Version 11 |
| **Storage** | 500 MB available space (SSD recommended) |
| **Sound Card** | DirectX compatible |

---

## Mac Requirements (if applicable)

| Component | Specification |
|-----------|---------------|
| **OS** | macOS 10.14 (Mojave) or later |
| **Processor** | Intel Core i5 or Apple M1 |
| **Memory** | 4 GB RAM |
| **Graphics** | Metal-capable GPU |
| **Storage** | 200 MB available space |

---

## Linux Requirements (if applicable)

| Component | Specification |
|-----------|---------------|
| **OS** | Ubuntu 18.04+ / SteamOS 3.0+ |
| **Processor** | Intel Core i3-2100 / AMD FX-4300 |
| **Memory** | 4 GB RAM |
| **Graphics** | OpenGL 3.3 compatible |
| **Storage** | 200 MB available space |

---

## Steam Deck Compatibility

**Status: VERIFIED**

| Category | Status |
|----------|--------|
| Input | Native touch controls + controller support |
| Display | 1280x720 native (matches game resolution) |
| Seamlessness | No launcher, instant play |
| System Support | Native Linux build OR Proton compatible |

### Steam Deck Notes:
- Game runs at native 720p — perfect for Steam Deck display
- Touch controls built-in for on-the-go play
- Controller mapping works out of the box
- Quick resume friendly — no persistent online requirements
- Battery efficient due to 2D rendering

---

## Controller Support

| Controller Type | Support Level |
|-----------------|---------------|
| Xbox Controllers | Full Support |
| PlayStation Controllers | Full Support |
| Nintendo Pro Controller | Full Support |
| Generic XInput | Full Support |
| Steam Controller | Full Support |
| Steam Deck Controls | Full Support |

---

## Display & Resolution

- **Native Resolution**: 1280x720 (720p)
- **Aspect Ratio**: 16:9
- **Fullscreen**: Yes (native)
- **Windowed Mode**: Yes
- **Borderless Windowed**: Yes
- **Variable Resolution**: Scales to monitor size

---

## Performance Targets

| Hardware Level | Target FPS |
|----------------|------------|
| Minimum Spec | 30 FPS stable |
| Recommended Spec | 60 FPS constant |
| High-End | 60 FPS (locked) |

*Game is capped at 60 FPS for consistent gameplay feel*

---

## Accessibility Features

- Rebindable controls (future update)
- Touch controls for accessibility
- High contrast visuals (neon aesthetic)
- Screen shake can be disabled
- UI scales with resolution

---

## Installation Size

| Platform | Size |
|----------|------|
| Windows | ~150 MB |
| Mac | ~150 MB |
| Linux | ~150 MB |

*Note: Sizes are estimates and may vary based on platform-specific files*

---

## Technical Implementation Notes (for development)

### For Electron Wrapper:
- Use Electron 25+ for best performance
- Enable hardware acceleration
- Package with electron-builder
- Sign for Windows/Mac distribution

### Performance Considerations:
- Canvas 2D rendering (no WebGL required)
- 60 FPS game loop
- Efficient particle system (culls off-screen)
- LocalStorage for save data (< 1MB)

### Anti-Cheat:
- None required (single-player only)
- Local leaderboards (no server validation needed)

---

## Steam Features Utilized

| Feature | Implemented |
|---------|-------------|
| Cloud Save | Planned |
| Achievements | Planned (50+) |
| Trading Cards | Planned |
| Leaderboards | Local (Global planned) |
| Rich Presence | Planned |
| Steam Deck Support | Yes |
| Remote Play Together | N/A (Single-player) |
| Workshop | Not planned |
