#!/bin/bash
# -----------------------------
# CONFIG
# -----------------------------
# REPLACE WITH YOUR PHONE'S IP
PHONE_IP="192.168.31.155"
ADB_PORT=5555
# UPDATE THESE PATHS FOR YOUR MACHINE
JAVA_HOME_PATH="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
ANDROID_HOME_PATH="$HOME/Library/Android/sdk"
# -----------------------------
# ENVIRONMENT SETUP
# -----------------------------
export JAVA_HOME="$JAVA_HOME_PATH"
export ANDROID_HOME="$ANDROID_HOME_PATH"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
echo "☕ Java version:"
java -version || { echo "❌ Java not found"; exit 1; }
echo "🤖 Android Home: $ANDROID_HOME"
# -----------------------------
# ADB WIFI CONNECT
# -----------------------------
echo "📡 Connecting to Android device over Wi-Fi..."
# Ensure ADB is in TCP Mode (requires USB first time)
adb tcpip $ADB_PORT
adb connect $PHONE_IP:$ADB_PORT
adb devices
# -----------------------------
# RUN APP ON DEVICE (Capacitor)
# -----------------------------
echo "📱 Launching app on connected Android device..."
# Sync usage to valid target
# Sync usage to valid target
npx cap run android --target 192.168.31.155:5555
