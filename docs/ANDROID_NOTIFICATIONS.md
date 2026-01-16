# Implementing Android Push Notifications (Firebase Cloud Messaging)

The user app currently uses an "In-App Notification" style banner (Welcome Banner), but for true system-level push notifications that appear when the app is closed, you need to integrate **Firebase Cloud Messaging (FCM)**.

## Prerequisites
1.  **Firebase Project**: You already have a Firebase project (for Auth/Hosting).
2.  **Google Play Console**: You need a developer account.

## Step 1: Capacitor Push Notification Plugin
Run the following in your project root:
```bash
npm install @capacitor/push-notifications
npx cap sync
```

## Step 2: Android Component Configuration
Add the following to your `android/app/src/main/AndroidManifest.xml` inside the `<application>` tag:

```xml
<meta-data
  android:name="com.google.firebase.messaging.default_notification_icon"
  android:resource="@mipmap/ic_launcher" />
<meta-data
  android:name="com.google.firebase.messaging.default_notification_color"
  android:resource="@color/colorAccent" />
```

## Step 3: Registering for Notifications (Frontend)
In `App.tsx`, add logic to request permission and register:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';

const setupNotifications = async () => {
  // Request permission
  const check = await PushNotifications.checkPermissions();
  if (check.receive !== 'granted') {
    const request = await PushNotifications.requestPermissions();
    if (request.receive !== 'granted') return;
  }

  // Register
  await PushNotifications.register();

  // Listeners
  PushNotifications.addListener('registration', token => {
    console.log('Push Token:', token.value);
    // Save this token to your Supabase `profiles` table!
  });

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Push received:', notification);
  });
};
```

## Step 4: Storing Tokens
You need to save the FCM token to your database so you can target users.
Create a column `fcm_token` in your `users` or `profiles` table and update it when `registration` fires.

## Step 5: Sending Notifications
You can send notifications via:
1.  **Firebase Console**: Go to "Cloud Messaging" -> "Send your first message".
2.  **Supabase Edge Function**: proper programmatic sending.

### Example Edge Function (Supabase)
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FCM_SERVER_KEY = "YOUR_SERVER_KEY_FROM_FIREBASE_CONSOLE_SETTINGS";

serve(async (req) => {
  const { title, body, userId } = await req.json();

  // 1. Get user's token from DB
  const { data: user } = await supabase.from('profiles').select('fcm_token').eq('id', userId).single();

  // 2. Send to FCM
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      to: user.fcm_token,
      notification: { title, body }
    })
  });

  return new Response("Sent!", { status: 200 });
});
```
