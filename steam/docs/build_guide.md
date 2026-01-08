# ITERATION - Desktop Build Guide

This guide explains how to build ITERATION for Steam on Windows, macOS, and Linux.

## Overview

ITERATION is a browser-based game that needs to be wrapped in a desktop shell for Steam distribution. We recommend using **Electron** for the best Steam integration and compatibility.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Steam SDK (download from Steamworks)
- For Mac: Xcode Command Line Tools
- For Windows: Visual Studio Build Tools (optional)

---

## Project Setup

### 1. Initialize Electron Wrapper

```bash
# Create build directory
mkdir -p build/electron
cd build/electron

# Initialize package.json
npm init -y

# Install Electron and build tools
npm install electron electron-builder --save-dev

# Install Steam integration (optional)
npm install steamworks.js --save
```

### 2. Create main.js (Electron entry point)

```javascript
// build/electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

// Optional: Initialize Steamworks
try {
    const steamworks = require('steamworks.js');
    const client = steamworks.init(YOUR_APP_ID);
    console.log('Steam initialized:', client.localplayer.getName());
} catch (e) {
    console.log('Steam not available:', e.message);
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreenable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        title: 'ITERATION'
    });

    // Load the game
    win.loadFile('index.html');

    // Remove menu bar
    win.setMenuBarVisibility(false);

    // F11 for fullscreen
    win.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F11') {
            win.setFullScreen(!win.isFullScreen());
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    app.quit();
});
```

### 3. Configure electron-builder

```json
// build/electron/package.json
{
  "name": "iteration",
  "version": "2.5.1",
  "description": "Break the Loop - A Roguelike Platformer",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux",
    "build:all": "electron-builder --win --mac --linux"
  },
  "build": {
    "appId": "com.nullxhunnedsac.iteration",
    "productName": "ITERATION",
    "directories": {
      "output": "dist"
    },
    "files": [
      "**/*",
      "!steam/**",
      "!*.md"
    ],
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns",
      "category": "public.app-category.games",
      "hardenedRuntime": true,
      "entitlements": "steam/config/macos/entitlements.plist",
      "entitlementsInherit": "steam/config/macos/entitlements.plist"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png",
      "category": "Game"
    }
  }
}
```

---

## Building

### Windows Build

```bash
cd build/electron
npm run build:win
# Output: dist/ITERATION Setup.exe
```

### macOS Build

```bash
cd build/electron
npm run build:mac
# Output: dist/ITERATION.dmg and dist/ITERATION.app
```

**For Mac App Store / Notarization:**
```bash
# Sign the app (requires Apple Developer account)
codesign --deep --force --verify --verbose \
    --sign "Developer ID Application: Your Name (TEAM_ID)" \
    --options runtime \
    --entitlements steam/config/macos/entitlements.plist \
    "dist/mac/ITERATION.app"

# Notarize (required for macOS 10.15+)
xcrun notarytool submit "dist/ITERATION.dmg" \
    --apple-id "your@email.com" \
    --password "app-specific-password" \
    --team-id "TEAM_ID" \
    --wait
```

### Linux Build

```bash
cd build/electron
npm run build:linux
# Output: dist/ITERATION.AppImage
```

---

## Steam Integration

### Adding Steamworks

1. Download Steam SDK from Steamworks partner site
2. Copy SDK files to your build directory
3. Use steamworks.js for Node.js integration:

```javascript
const steamworks = require('steamworks.js');

// Initialize with your App ID
const client = steamworks.init(YOUR_APP_ID);

// Get player name
console.log(client.localplayer.getName());

// Unlock achievement
client.achievement.activate('FIRST_BLOOD');

// Update leaderboard
client.leaderboard.uploadScore('speedrun', score);

// Cloud save
client.cloud.writeFile('save.json', saveData);
```

### steam_appid.txt

Place `steam_appid.txt` in your build output root with your App ID:
```
000000
```

---

## Uploading to Steam

### 1. Install SteamCMD

Download from: https://developer.valvesoftware.com/wiki/SteamCMD

### 2. Upload Build

```bash
# Login to Steam
steamcmd +login your_username

# Run build script
steamcmd +login your_username +run_app_build /path/to/steam/config/app_build.vdf +quit
```

### 3. Set Build Live

1. Go to Steamworks Partner Site
2. Navigate to Builds
3. Set the uploaded build to "Default" branch

---

## File Structure After Build

```
build/
├── win/
│   ├── ITERATION.exe
│   ├── resources/
│   └── steam_appid.txt
├── mac/
│   ├── ITERATION.app/
│   │   ├── Contents/
│   │   │   ├── Info.plist
│   │   │   ├── MacOS/
│   │   │   └── Resources/
│   └── steam_appid.txt
└── linux/
    ├── ITERATION
    ├── resources/
    └── steam_appid.txt
```

---

## Icon Requirements

| Platform | Format | Sizes |
|----------|--------|-------|
| Windows | .ico | 256x256, 128x128, 64x64, 48x48, 32x32, 16x16 |
| macOS | .icns | 1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16 |
| Linux | .png | 512x512 (or SVG) |

Use a tool like [iConvert Icons](https://iconverticons.com/) to generate all formats from a single 1024x1024 PNG.

---

## Troubleshooting

### Mac: "App is damaged" error
- App needs to be signed and notarized
- Or run: `xattr -cr /path/to/ITERATION.app`

### Steam overlay not working
- Ensure steam_appid.txt is in the correct location
- Launch game from Steam, not directly

### Linux: No sound
- Install PulseAudio or PipeWire
- Check if browser audio permissions are set

---

*Last Updated: 2026-01-08*
