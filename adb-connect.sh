#!/bin/bash
# -----------------------------
# CONFIG
# -----------------------------
PHONE_IP="192.168.1.44"
ADB_PORT=5555
PACKAGE_ID="com.murugan.ai"

# UPDATE THESE PATHS FOR YOUR MACHINE
JAVA_HOME_PATH="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
ANDROID_HOME_PATH="/opt/homebrew/share/android-commandlinetools"

# -----------------------------
# ENVIRONMENT SETUP
# -----------------------------
export JAVA_HOME="$JAVA_HOME_PATH"
export ANDROID_HOME="$ANDROID_HOME_PATH"
# Use the SDK's adb if available, otherwise fallback to path
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

echo "☕ Java version:"
java -version || { echo "❌ Java not found"; exit 1; }
echo "🤖 Android Home: $ANDROID_HOME"

# -----------------------------
# ADB WIFI CONNECT
# -----------------------------
echo "📡 Connecting to Android device over Wi-Fi..."
adb tcpip $ADB_PORT
adb connect $PHONE_IP:$ADB_PORT
adb devices

# -----------------------------
# BUILD & DEPLOY
# -----------------------------
echo "🏗️  Building web assets..."
npm run build || { echo "❌ Build failed"; exit 1; }

echo "🔄 Syncing Capacitor..."
npx cap sync android || { echo "❌ Cap sync failed"; exit 1; }

echo "🚀 Building and Installing APK via Gradle..."
cd android
./gradlew installDebug || { echo "❌ Gradle build failed"; exit 1; }

echo "📱 Launching App..."
adb shell monkey -p $PACKAGE_ID -c android.intent.category.LAUNCHER 1
echo "✅ Done!"
