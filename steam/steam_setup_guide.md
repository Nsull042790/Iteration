# ITERATION - Complete Steam Release Guide

## Overview

This guide covers everything needed to release ITERATION on Steam, from account setup to launch day.

---

## Phase 1: Steamworks Account Setup

### Step 1: Create a Steam Partner Account
1. Go to: https://partner.steamgames.com
2. Click "Get Started" or "Join Steam"
3. Complete the application form
4. Pay the $100 USD Steam Direct fee (per game)
5. Wait for approval (usually 1-3 business days)

### Step 2: Set Up Tax & Banking
1. Complete W-9 (US) or W-8BEN (international) tax forms
2. Provide banking information for revenue deposits
3. Verify your identity

### Step 3: Create Your App
1. In Steamworks, go to "Applications"
2. Click "Create Application"
3. Enter "ITERATION" as the app name
4. Select "Game" as the application type
5. Pay the $100 Steam Direct fee
6. Your App ID will be generated

---

## Phase 2: Prepare the Game Build

### Option A: Electron Wrapper (Recommended)

ITERATION is an HTML5 game, so it needs to be wrapped in Electron for desktop distribution.

#### Setup Electron Project:
```bash
# Create electron wrapper
mkdir iteration-steam
cd iteration-steam
npm init -y
npm install electron electron-builder --save-dev
```

#### Project Structure:
```
iteration-steam/
├── package.json
├── main.js           # Electron main process
├── preload.js        # Preload script
├── game/             # Copy entire game here
│   ├── index.html
│   ├── src/
│   ├── assets/
│   └── ...
└── build/            # Icons and build resources
    ├── icon.ico      # Windows icon
    ├── icon.icns     # Mac icon
    └── icon.png      # Linux icon
```

#### main.js (Electron Main Process):
```javascript
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        fullscreen: false,
        resizable: true,
        title: 'ITERATION',
        icon: path.join(__dirname, 'build/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.setMenu(null); // Remove menu bar
    win.loadFile('game/index.html');

    // Uncomment for fullscreen by default:
    // win.setFullScreen(true);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
```

#### package.json (Build Configuration):
```json
{
  "name": "iteration",
  "version": "1.0.0",
  "description": "Break the Cycle. Escape the Simulation.",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.yourstudio.iteration",
    "productName": "ITERATION",
    "directories": {
      "output": "dist"
    },
    "win": {
      "target": "portable",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icon.png"
    }
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  }
}
```

#### Build Commands:
```bash
# Windows build
npm run build:win

# Mac build (requires Mac)
npm run build:mac

# Linux build
npm run build:linux
```

### Option B: NW.js (Alternative)
Similar to Electron but lighter weight. Good if Electron feels too heavy.

---

## Phase 3: Steamworks Integration (Optional but Recommended)

### Steam Features You Can Add:

#### Cloud Saves:
```javascript
// In your game's save system
// Steamworks.js or greenworks library required
if (typeof Steamworks !== 'undefined') {
    Steamworks.Cloud.writeFile('save.json', saveData);
}
```

#### Achievements:
```javascript
// Unlock achievement
if (typeof Steamworks !== 'undefined') {
    Steamworks.Achievements.unlock('FIRST_BOSS');
}
```

#### For simplicity, you can launch without these features and add them in updates.

---

## Phase 4: Upload to Steam

### Step 1: Download Steamworks SDK
1. Download from Steamworks partner site
2. Extract to a convenient location
3. Locate `steamcmd` in the tools folder

### Step 2: Create Depot Configuration

**app_build.vdf:**
```
"AppBuild"
{
    "AppID" "YOUR_APP_ID"
    "Desc" "ITERATION v1.0.0"
    "ContentRoot" "./content/"
    "BuildOutput" "./output/"
    "Depots"
    {
        "YOUR_DEPOT_ID"
        {
            "FileMapping"
            {
                "LocalPath" "*"
                "DepotPath" "."
                "recursive" "1"
            }
        }
    }
}
```

### Step 3: Upload Build
```bash
# Using SteamCMD
steamcmd +login your_username +run_app_build app_build.vdf +quit
```

### Step 4: Set Build Live
1. Go to Steamworks > Your App > Builds
2. Find your uploaded build
3. Click "Set Live" for the default branch

---

## Phase 5: Store Page Setup

### Required Fields in Steamworks:

1. **Basic Info**
   - Application Type: Game
   - Developer: Your Studio Name
   - Publisher: Your Studio Name (or publisher)
   - Release Date: Choose wisely

2. **Supported Languages**
   - English: Interface ✓, Full Audio ✗, Subtitles ✓

3. **Store Tags** (from tags_and_features.md)

4. **Descriptions**
   - Short Description (300 chars) - see store_description.md
   - About This Game - see store_description.md

5. **System Requirements** - see system_requirements.md

6. **Content Survey**
   - Complete the content rating questionnaire
   - Be honest about violence, language, etc.

7. **Pricing**
   - Set your price (suggest $9.99-$14.99)
   - Consider regional pricing

8. **Assets**
   - Upload all graphics from assets_checklist.md
   - Upload trailer(s)
   - Upload screenshots

---

## Phase 6: Pre-Launch Checklist

### 2 Weeks Before Launch:
- [ ] Store page complete and reviewed
- [ ] All assets uploaded
- [ ] Trailer uploaded
- [ ] Pricing set
- [ ] Build uploaded and tested
- [ ] Coming Soon page live
- [ ] Social media announcement scheduled

### 1 Week Before Launch:
- [ ] Final build uploaded
- [ ] Build tested on multiple machines
- [ ] Steam Deck verification requested
- [ ] Press kit distributed
- [ ] Review keys generated and sent

### Launch Day:
- [ ] Build set to live
- [ ] Release button clicked
- [ ] Social media posts go live
- [ ] Discord announcement
- [ ] Monitor for critical bugs
- [ ] Respond to first reviews

---

## Phase 7: Post-Launch

### Week 1:
- Monitor reviews and respond professionally
- Hot-fix any critical bugs
- Engage with community
- Thank early supporters

### Month 1:
- Analyze sales data
- Plan first content update
- Consider Steam events participation

### Ongoing:
- Regular updates to keep visibility
- Participate in Steam sales
- Build community on Discord
- Consider DLC or sequel

---

## Important Links

- Steamworks Documentation: https://partner.steamgames.com/doc/home
- Steamworks SDK: https://partner.steamgames.com/doc/sdk
- Steam Direct FAQ: https://partner.steamgames.com/doc/gettingstarted/direct
- Electron: https://www.electronjs.org/
- Electron Builder: https://www.electron.build/

---

## Budget Estimate

| Item | Cost |
|------|------|
| Steam Direct Fee | $100 |
| Electron Development | $0 (DIY) |
| Code Signing (Windows) | ~$100-500/year |
| Code Signing (Mac) | ~$99/year (Apple Developer) |
| Trailer Production | $0-500 (DIY vs hired) |
| Marketing Assets | $0-300 (DIY vs hired) |
| **Minimum Total** | **$100** |
| **Recommended Total** | **~$500-1000** |

---

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Steamworks Setup | 1 week |
| Electron Wrapper | 1-2 days |
| Build Testing | 1 week |
| Store Page Setup | 2-3 days |
| Asset Creation | 1-2 weeks |
| Coming Soon Period | 2+ weeks (recommended) |
| **Total Minimum** | **4-6 weeks** |

---

*Good luck with your Steam launch! The simulation awaits.*
