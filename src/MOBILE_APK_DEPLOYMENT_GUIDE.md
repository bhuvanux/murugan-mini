# 📱 Murugan Wallpapers & Videos - Mobile APK Deployment Guide

## Overview
This guide explains how to convert your React web app into a native Android APK and set up automated deployment for seamless updates.

---

## 🎯 Architecture Options

### Option 1: Capacitor (Recommended)
✅ **Best for:** Converting existing React web apps to native mobile apps  
✅ **Pros:** 
- Easy integration with existing code
- Full access to native APIs
- Hot reload during development
- PWA compatibility
- Single codebase for Android & iOS

### Option 2: Progressive Web App (PWA)
✅ **Best for:** Quick deployment without app stores  
✅ **Pros:**
- No compilation needed
- Instant updates
- No store approval required
- Smaller size

### Option 3: React Native (Not Recommended)
❌ **Requires:** Complete app rewrite  
❌ **Cons:** Would need to rebuild entire UI

---

## 🚀 OPTION 1: Capacitor Setup (Recommended)

### Step 1: Install Capacitor

```bash
# Install Capacitor CLI and core
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init "Murugan Wallpapers" "com.murugan.wallpapers" --web-dir=dist

# Add Android platform
npm install @capacitor/android
npx cap add android

# Add iOS platform (optional)
npm install @capacitor/ios
npx cap add ios
```

### Step 2: Configure Capacitor

Create `/capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.murugan.wallpapers',
  appName: 'Murugan Wallpapers',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: '#0d5e38',
      showSpinner: false,
      androidSpinnerStyle: 'small',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0d5e38',
    },
  },
};

export default config;
```

### Step 3: Install Native Plugins

```bash
# Essential plugins for your app
npm install @capacitor/splash-screen
npm install @capacitor/status-bar
npm install @capacitor/filesystem
npm install @capacitor/share
npm install @capacitor/network
npm install @capacitor/app
npm install @capacitor/preferences

# Optional but useful
npm install @capacitor/camera
npm install @capacitor/haptics
npm install @capacitor/toast
```

### Step 4: Update package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "build:mobile": "vite build && npx cap sync",
    "android:dev": "npx cap run android",
    "android:open": "npx cap open android",
    "android:sync": "npx cap sync android",
    "ios:dev": "npx cap run ios",
    "ios:open": "npx cap open ios",
    "ios:sync": "npx cap sync ios",
    "cap:sync": "npx cap sync",
    "cap:update": "npx cap update"
  }
}
```

### Step 5: Build the Web App

```bash
# Build the React app
npm run build

# Sync with Capacitor
npx cap sync
```

### Step 6: Configure Android Studio

1. **Install Android Studio:**
   - Download from https://developer.android.com/studio
   - Install Android SDK (API 33 or higher)
   - Install Java JDK 11+

2. **Open Android Project:**
   ```bash
   npx cap open android
   ```

3. **Configure Build Settings:**
   
   Update `/android/app/build.gradle`:
   ```gradle
   android {
       namespace "com.murugan.wallpapers"
       compileSdkVersion 34
       
       defaultConfig {
           applicationId "com.murugan.wallpapers"
           minSdkVersion 22
           targetSdkVersion 34
           versionCode 1
           versionName "1.0.0"
       }
       
       buildTypes {
           release {
               minifyEnabled true
               proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

4. **Configure App Permissions:**
   
   Update `/android/app/src/main/AndroidManifest.xml`:
   ```xml
   <manifest xmlns:android="http://schemas.android.com/apk/res/android">
       <!-- Permissions -->
       <uses-permission android:name="android.permission.INTERNET" />
       <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
       <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
       <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
       
       <application
           android:allowBackup="true"
           android:icon="@mipmap/ic_launcher"
           android:label="@string/app_name"
           android:roundIcon="@mipmap/ic_launcher_round"
           android:supportsRtl="true"
           android:theme="@style/AppTheme"
           android:usesCleartextTraffic="true">
           
           <activity
               android:name=".MainActivity"
               android:exported="true"
               android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
               android:label="@string/app_name"
               android:launchMode="singleTask"
               android:theme="@style/AppTheme.SplashScreen">
               
               <intent-filter>
                   <action android:name="android.intent.action.MAIN" />
                   <category android:name="android.intent.category.LAUNCHER" />
               </intent-filter>
           </activity>
       </application>
   </manifest>
   ```

### Step 7: Add App Icons

1. **Generate Icons:**
   - Use https://icon.kitchen/ or https://easyappicon.com/
   - Upload your Murugan app icon
   - Download Android icon pack

2. **Replace Icons:**
   - Copy generated icons to `/android/app/src/main/res/`
   - Replace all `mipmap-*` folders

3. **Add Splash Screen:**
   - Create `/android/app/src/main/res/drawable/splash.png`
   - Use your splash screen design (1080x1920px)

### Step 8: Build APK

#### Debug APK (for testing):
```bash
cd android
./gradlew assembleDebug
```

APK location: `/android/app/build/outputs/apk/debug/app-debug.apk`

#### Release APK (for production):

1. **Generate Signing Key:**
   ```bash
   keytool -genkey -v -keystore murugan-wallpapers.keystore -alias murugan -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Create `/android/keystore.properties`:**
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=murugan
   storeFile=../murugan-wallpapers.keystore
   ```

3. **Update `/android/app/build.gradle`:**
   ```gradle
   def keystorePropertiesFile = rootProject.file("keystore.properties")
   def keystoreProperties = new Properties()
   keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   
   android {
       signingConfigs {
           release {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
           }
       }
       
       buildTypes {
           release {
               signingConfig signingConfigs.release
           }
       }
   }
   ```

4. **Build Release APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

   APK location: `/android/app/build/outputs/apk/release/app-release.apk`

5. **Build AAB (for Play Store):**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```

   AAB location: `/android/app/build/outputs/bundle/release/app-release.aab`

---

## 🔄 SEAMLESS DEPLOYMENT WORKFLOW

### Method 1: GitHub Actions (Automated CI/CD)

Create `.github/workflows/build-android.yml`:

```yaml
name: Build Android APK

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web app
        run: npm run build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      
      - name: Decode Keystore
        run: |
          echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/murugan-wallpapers.keystore
      
      - name: Create keystore.properties
        run: |
          echo "storePassword=${{ secrets.STORE_PASSWORD }}" > android/keystore.properties
          echo "keyPassword=${{ secrets.KEY_PASSWORD }}" >> android/keystore.properties
          echo "keyAlias=murugan" >> android/keystore.properties
          echo "storeFile=../murugan-wallpapers.keystore" >> android/keystore.properties
      
      - name: Build Release APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleRelease
      
      - name: Build Release AAB
        run: |
          cd android
          ./gradlew bundleRelease
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: android/app/build/outputs/apk/release/app-release.apk
      
      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-bundle
          path: android/app/build/outputs/bundle/release/app-release.aab
      
      - name: Create Release
        if: github.ref == 'refs/heads/main'
        uses: softprops/action-gh-release@v1
        with:
          tag_name: v${{ github.run_number }}
          name: Release v${{ github.run_number }}
          files: |
            android/app/build/outputs/apk/release/app-release.apk
            android/app/build/outputs/bundle/release/app-release.aab
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Method 2: Local Build Script

Create `/scripts/build-mobile.sh`:

```bash
#!/bin/bash

echo "🚀 Building Murugan Wallpapers Mobile App..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build web app
echo -e "${BLUE}📦 Building web app...${NC}"
npm run build

# Step 2: Sync with Capacitor
echo -e "${BLUE}🔄 Syncing with Capacitor...${NC}"
npx cap sync

# Step 3: Build Android APK
echo -e "${BLUE}🤖 Building Android APK...${NC}"
cd android
./gradlew assembleRelease

# Step 4: Copy APK to root
echo -e "${BLUE}📋 Copying APK to root directory...${NC}"
cp app/build/outputs/apk/release/app-release.apk ../murugan-wallpapers.apk

echo -e "${GREEN}✅ Build complete! APK: murugan-wallpapers.apk${NC}"

# Optional: Install on connected device
read -p "Install on connected device? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${BLUE}📱 Installing on device...${NC}"
    adb install -r ../murugan-wallpapers.apk
    echo -e "${GREEN}✅ Installed successfully!${NC}"
fi
```

Make it executable:
```bash
chmod +x scripts/build-mobile.sh
```

### Method 3: NPM Scripts for Quick Updates

Add to `package.json`:

```json
{
  "scripts": {
    "mobile:build": "npm run build && npx cap sync",
    "mobile:apk": "cd android && ./gradlew assembleRelease",
    "mobile:install": "adb install -r android/app/build/outputs/apk/release/app-release.apk",
    "mobile:full": "npm run build && npx cap sync && cd android && ./gradlew assembleRelease",
    "mobile:dev": "npm run build && npx cap sync && npx cap run android"
  }
}
```

**Usage:**
```bash
# Full production build
npm run mobile:full

# Development build & run
npm run mobile:dev

# Install on connected device
npm run mobile:install
```

---

## 🚀 OPTION 2: Progressive Web App (PWA)

### Step 1: Configure PWA

Create `/vite.config.ts` with PWA plugin:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Murugan Wallpapers & Videos',
        short_name: 'Murugan App',
        description: 'Devotional wallpapers, videos, and AI chat for Lord Murugan devotees',
        theme_color: '#0d5e38',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    })
  ]
});
```

### Step 2: Install PWA Plugin

```bash
npm install -D vite-plugin-pwa
```

### Step 3: Build PWA

```bash
npm run build
```

### Step 4: Deploy

Deploy to any hosting (Vercel, Netlify, etc.) and users can "Add to Home Screen" from their mobile browser.

**Pros:**
- No app store approval needed
- Instant updates
- Smaller download size
- Works on all platforms

**Cons:**
- Less native feel
- Limited offline capabilities
- Can't access all device features

---

## 📊 Comparison Table

| Feature | Capacitor | PWA | React Native |
|---------|-----------|-----|--------------|
| **Setup Time** | 2-3 hours | 30 minutes | 1-2 weeks |
| **Code Changes** | Minimal | None | Complete rewrite |
| **App Store** | ✅ Yes | ❌ No | ✅ Yes |
| **Offline Support** | ✅ Excellent | ⚠️ Limited | ✅ Excellent |
| **Native APIs** | ✅ Full access | ⚠️ Limited | ✅ Full access |
| **File Size** | ~15-25 MB | ~2-5 MB | ~20-30 MB |
| **Updates** | Via app stores | Instant | Via app stores |
| **Performance** | ⚠️ Good | ⚠️ Good | ✅ Excellent |

---

## 🎯 Recommended Workflow

### For Development:
1. Make changes to React code
2. Test in browser: `npm run dev`
3. Build mobile: `npm run mobile:dev`
4. Test on device via Android Studio

### For Production Release:
1. Commit changes to GitHub
2. GitHub Actions automatically builds APK/AAB
3. Download from Actions artifacts
4. Upload AAB to Google Play Console
5. Users receive automatic updates

---

## 📱 Publishing to Google Play Store

### Step 1: Create Developer Account
- Sign up at https://play.google.com/console
- Pay one-time $25 fee

### Step 2: Create App Listing
- App name: "Murugan Wallpapers & Videos"
- Category: Entertainment / Lifestyle
- Screenshots: 2-8 screenshots (1080x1920px)
- Feature graphic: 1024x500px
- App icon: 512x512px

### Step 3: Upload AAB
- Upload `app-release.aab` (not APK)
- Fill in release notes
- Submit for review

### Step 4: Store Listing Content

**Short Description (80 chars):**
```
Devotional wallpapers, videos, and AI chat for Lord Murugan devotees
```

**Full Description (4000 chars):**
```
🙏 Murugan Wallpapers & Videos - Your Spiritual Companion

Immerse yourself in divine devotion with our comprehensive app featuring:

📸 HD WALLPAPERS
• Thousands of high-quality Lord Murugan wallpapers
• Daily fresh content from verified sources
• Multiple categories: Arupadai Veedu, Festival, Devotional
• Easy download and share

🎥 DEVOTIONAL VIDEOS
• Bhakti songs and prayers
• Festival celebrations
• Temple darshan videos
• Offline download support

✨ SPARKLES (REELS)
• Short devotional content
• Daily spiritual inspiration
• Share with friends and family

🤖 ASK GUGAN - AI CHAT
• AI-powered spiritual assistant
• Ask questions about Lord Murugan
• Learn about temples and festivals
• Get daily blessings

🌟 FEATURES
• Beautiful green devotional theme
• Tamil & English support
• Offline access
• No ads (premium experience)
• Regular content updates

Perfect for devotees seeking daily spiritual nourishment!

Vel Vel Muruga! 🔱
```

### Step 5: Version Management

Update version in `/android/app/build.gradle`:
```gradle
versionCode 2  // Increment for each release
versionName "1.0.1"  // User-facing version
```

---

## 🔧 Troubleshooting

### Common Issues:

1. **Build fails with "SDK not found"**
   ```bash
   # Set ANDROID_HOME
   export ANDROID_HOME=~/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

2. **Capacitor sync fails**
   ```bash
   # Clean and rebuild
   npx cap sync --force
   ```

3. **APK not installing**
   ```bash
   # Enable USB debugging on phone
   # Install ADB
   adb devices
   adb install -r app-release.apk
   ```

4. **Icons not showing**
   - Clear app data on device
   - Rebuild: `npm run mobile:full`

---

## 📝 Quick Reference Commands

```bash
# Initial setup
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Murugan Wallpapers" "com.murugan.wallpapers"
npx cap add android

# Build workflow
npm run build                    # Build React app
npx cap sync                     # Sync to native project
npx cap open android             # Open Android Studio
cd android && ./gradlew assembleRelease  # Build APK

# Development
npx cap run android              # Run on device
adb logcat                       # View logs

# Testing
adb install -r app-release.apk  # Install APK
adb uninstall com.murugan.wallpapers  # Uninstall
```

---

## ✅ Final Checklist

Before publishing:

- [ ] Test on multiple Android versions (API 22+)
- [ ] Test on different screen sizes
- [ ] Verify all permissions work
- [ ] Test offline functionality
- [ ] Verify splash screen displays correctly
- [ ] Test deep linking (if applicable)
- [ ] Check APK size (< 50MB recommended)
- [ ] Verify app icons on all densities
- [ ] Test back button behavior
- [ ] Verify network requests work
- [ ] Test download/share functionality
- [ ] Privacy policy URL configured
- [ ] Terms of service URL configured
- [ ] Contact email configured

---

## 🎉 Success!

Your Murugan Wallpapers app is now ready for mobile deployment! 

**Recommended approach:** Start with **Capacitor** for full native experience and app store distribution.

For questions or issues, refer to:
- Capacitor Docs: https://capacitorjs.com/docs
- Android Developers: https://developer.android.com
- Google Play Console: https://play.google.com/console

Vel Vel Muruga! 🔱
