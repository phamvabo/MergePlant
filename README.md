# MergePlant

A mobile ad mediation and playable ad tooling project.

---

## Cocos Creator → PlayTurbo Single-File HTML Build

This repository includes a build script that packages a **Cocos Creator web-mobile build** into a **single self-contained HTML file** that meets the [PlayTurbo / Mindworks Playable Ad specification](https://www.playturbo.com/review/doc).

### Why a single HTML file?

PlayTurbo and major ad networks (Mintegral, Facebook, Google, Unity, AppLovin, Vungle, TikTok) require playable ads to be submitted as one self-contained `.html` file with **all assets inlined** (no external network requests at runtime). The build script handles this automatically.

### Requirements satisfied

| Rule | How it's handled |
|------|-----------------|
| Single HTML file | All JS, CSS, images, audio inlined |
| No external requests | External `http(s)` links are left intact; local assets become Base64 data URIs |
| UTF-8 charset | Injected if absent |
| Mobile viewport meta | Injected if absent |
| `window.gameReady()` | Injected via PlayTurbo API bridge |
| `window.gameEnd()` | Injected via PlayTurbo API bridge |
| `window.gameRetry()` | Injected via PlayTurbo API bridge |
| `window.install()` – CTA | Injected via PlayTurbo API bridge |
| `window.gameStart()` | Stub exposed so platform can call it |
| `window.gameClose()` | Stub exposed so platform can call it |
| File size ≤ 5 MB | Script warns if exceeded |

---

### Step-by-step: build a PlayTurbo HTML from Cocos Creator

#### Step 1 — Copy the build template

Copy `build-templates/web-mobile/index.html` from this repository into your Cocos project root at the same path:

```
your-cocos-project/
  build-templates/
    web-mobile/
      index.html    ← copy this file here
```

Cocos Creator will use this template when building for web-mobile.  The template already contains the PlayTurbo API bridge and a wired-up canvas element.

#### Step 2 — Wire up PlayTurbo API calls in your game scripts

In your Cocos TypeScript/JavaScript scene or component, call the PlayTurbo API at the right moments:

```typescript
// ─── When all assets have loaded ───────────────────────────────────────────
// onLoad is a Cocos Creator lifecycle method called when the component loads.
onLoad() {
    // Tell the platform the ad is ready to play
    if (typeof window.gameReady === 'function') window.gameReady();

    // Let the platform start the game
    window.gameStart = () => {
        this.startGameplay();
    };

    // Let the platform close/pause the game
    window.gameClose = () => {
        this.pauseGameplay();
    };
}

// ─── When the player wins or loses ─────────────────────────────────────────
onGameOver() {
    if (typeof window.gameEnd === 'function') window.gameEnd();
}

// ─── When the player taps "play again" ─────────────────────────────────────
onRetry() {
    if (typeof window.gameRetry === 'function') window.gameRetry();
    this.restartGame();
}

// ─── CTA / Download button ─────────────────────────────────────────────────
// NEVER use window.open() or <a href> directly.
// Always use window.install() so the platform controls the redirect.
onCtaButton() {
    if (typeof window.install === 'function') window.install();
}
```

#### Step 3 — Build the Cocos project for web-mobile

In Cocos Creator:
1. Open **Project → Build…**
2. Platform: **Web Mobile**
3. Build path: `build/web-mobile` (default)
4. Click **Build**

#### Step 4 — Run the packaging script

```bash
# No npm install needed — the script uses only Node.js built-in modules

# Default paths (inputDir=build/web-mobile, outputFile=dist/playturbo.html):
node scripts/build-playturbo.js

# Or via npm:
npm run build:playturbo

# Custom paths:
node scripts/build-playturbo.js path/to/web-mobile dist/my-playable.html
```

The script will:
- Inline all `<script src="...">` files as `<script>` blocks
- Inline all `<link rel="stylesheet">` files as `<style>` blocks
- Convert binary assets referenced inside JS/CSS to Base64 data URIs
- Inject the PlayTurbo API bridge (if not already present)
- Print the final file size and warn if it exceeds **5 MB**

#### Step 5 — Test the output locally

Open `dist/playturbo.html` directly in your browser (no web server needed).  
The PlayTurbo API bridge prints stub messages to the console so you can verify the integration points.

#### Step 6 — Upload to PlayTurbo

1. Go to [https://www.playturbo.com](https://www.playturbo.com)
2. Create a new project → **Upload HTML5**
3. Upload `dist/playturbo.html`
4. Use the built-in preview to test on both portrait and landscape orientations

---

## Mintegral SDK Integration (Android)

## Mintegral SDK Integration

[Mintegral](https://www.mintegral.com/) is a global programmatic advertising platform offering Banner, Interstitial, Rewarded Video, and Native ad formats.

### Prerequisites

- Android Studio Arctic Fox or later
- Android API level 21+
- A Mintegral developer account with an **App ID**, **App Key**, and **Placement ID** / **Ad Unit ID**

### Setup

#### 1. Add the Mintegral Maven Repository

In your project-level `build.gradle`:

```groovy
allprojects {
    repositories {
        google()
        mavenCentral()
        maven { url "https://dl-maven-android.mintegral.com/repository/mbridge_android_sdk_oversea" }
    }
}
```

#### 2. Add SDK Dependency

In your app-level `build.gradle`:

```groovy
implementation 'com.mbridge.msdk.oversea:mbjscommon:16.6.71'
implementation 'com.mbridge.msdk.oversea:playercommon:16.6.71'
implementation 'com.mbridge.msdk.oversea:reward:16.6.71'
implementation 'com.mbridge.msdk.oversea:interstitialvideo:16.6.71'
implementation 'com.mbridge.msdk.oversea:interstitial:16.6.71'
implementation 'com.mbridge.msdk.oversea:mbbanner:16.6.71'
implementation 'com.mbridge.msdk.oversea:mbnative:16.6.71'
```

#### 3. Add Required Permissions

In `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### 4. Initialize the SDK

```kotlin
MintegralManager.init(context, appId = "YOUR_APP_ID", appKey = "YOUR_APP_KEY")
```

#### 5. Load and Show Ads

```kotlin
// Banner
MintegralManager.loadBanner(activity, placementId = "YOUR_PLACEMENT_ID", adUnitId = "YOUR_AD_UNIT_ID", container = bannerContainer)

// Interstitial
MintegralManager.loadInterstitial(activity, placementId = "YOUR_PLACEMENT_ID", adUnitId = "YOUR_AD_UNIT_ID")
MintegralManager.showInterstitial()

// Rewarded Video
MintegralManager.loadRewarded(activity, placementId = "YOUR_PLACEMENT_ID", adUnitId = "YOUR_AD_UNIT_ID")
MintegralManager.showRewarded()
```

### Sample

See [`app/src/main/java/com/mergeplant/MainActivity.kt`](app/src/main/java/com/mergeplant/MainActivity.kt) for a complete usage example.

### Official Documentation

- [Mintegral Android SDK Wiki](https://cdn-adn.rayjump.com/cdn-adn/v2/markdown_v2/index.html?file=sdk-m_sdk-android&lang=en)
- [Mintegral Developer Portal](https://dev.mintegral.com/)