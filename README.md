# MergePlant

A mobile ad mediation integration project. This repository contains Mintegral SDK integration for Android.

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