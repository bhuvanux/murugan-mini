import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, View, Pressable, Platform, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

const DEFAULT_URL = 'http://localhost:3000';

type NativeBridgeRequest = {
  id: string;
  type: string;
  payload?: any;
};

type NativeBridgeResponse = {
  id: string;
  ok: boolean;
  error?: string;
  payload?: any;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const initialUrl =
    (process.env.EXPO_PUBLIC_WEB_URL && process.env.EXPO_PUBLIC_WEB_URL.trim()) || DEFAULT_URL;

  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);

  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  const normalizedUrl = useMemo(() => {
    const trimmed = url.trim();
    if (!trimmed) return DEFAULT_URL;
    if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`;
    return trimmed;
  }, [url]);

  const postToWeb = useCallback((msg: NativeBridgeResponse) => {
    try {
      webViewRef.current?.postMessage(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }, []);

  const handleNativeRequest = useCallback(
    async (req: NativeBridgeRequest) => {
      if (!req?.id || !req?.type) return;

      if (req.type === 'location:getCurrentPosition') {
        try {
          const perm = await Location.requestForegroundPermissionsAsync();
          if (perm.status !== 'granted') {
            postToWeb({ id: req.id, ok: false, error: 'Location permission denied' });
            return;
          }
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          postToWeb({
            id: req.id,
            ok: true,
            payload: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            },
          });
          return;
        } catch (e: any) {
          postToWeb({ id: req.id, ok: false, error: String(e?.message || e) });
          return;
        }
      }

      if (req.type === 'notifications:scheduleFestivalReminder') {
        try {
          const key = String(req.payload?.key || '');
          const title = String(req.payload?.title || '');
          const dateIso = String(req.payload?.dateIso || '');
          const minutesBefore = Number(req.payload?.minutesBefore || 0);

          if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
            postToWeb({ id: req.id, ok: false, error: 'Invalid date' });
            return;
          }

          const [y, m, d] = dateIso.split('-').map((x) => Number(x));
          const eventTime = new Date(y, m - 1, d, 9, 0, 0);
          const triggerTime = new Date(eventTime.getTime() - minutesBefore * 60 * 1000);

          if (triggerTime.getTime() <= Date.now() + 10_000) {
            postToWeb({ id: req.id, ok: false, error: 'Reminder time is in the past' });
            return;
          }

          const perm = await Notifications.requestPermissionsAsync();
          const status = (perm as any)?.status;
          if (status && status !== 'granted') {
            postToWeb({ id: req.id, ok: false, error: 'Notification permission denied' });
            return;
          }

          const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'நினைவூட்டு',
              body: title || 'MuruganAI Reminder',
              data: { key },
            },
            trigger: { date: triggerTime },
          });

          postToWeb({ id: req.id, ok: true, payload: { notificationId } });
          return;
        } catch (e: any) {
          postToWeb({ id: req.id, ok: false, error: String(e?.message || e) });
          return;
        }
      }

      if (req.type === 'notifications:cancel') {
        try {
          const notificationId = String(req.payload?.notificationId || '');
          if (!notificationId) {
            postToWeb({ id: req.id, ok: false, error: 'Missing notificationId' });
            return;
          }
          await Notifications.cancelScheduledNotificationAsync(notificationId);
          postToWeb({ id: req.id, ok: true, payload: null });
          return;
        } catch (e: any) {
          postToWeb({ id: req.id, ok: false, error: String(e?.message || e) });
          return;
        }
      }

      postToWeb({ id: req.id, ok: false, error: `Unknown request: ${req.type}` });
    },
    [postToWeb],
  );

  const onWebMessage = useCallback(
    (event: any) => {
      try {
        const raw = event?.nativeEvent?.data;
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        void handleNativeRequest(msg as NativeBridgeRequest);
      } catch {
        // ignore
      }
    },
    [handleNativeRequest],
  );

  const onAndroidBackPress = useCallback(() => {
    if (canGoBackRef.current) {
      webViewRef.current?.goBack();
      return true;
    }

    Alert.alert('Exit', 'Close MuruganAI?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
    ]);
    return true;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
    return () => sub.remove();
  }, [onAndroidBackPress]);

  return (
    <SafeAreaView style={styles.root}>
      {__DEV__ && (
      <View style={styles.topBar}>
        <Text style={styles.label}>Web URL</Text>
        <View style={styles.row}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="http://192.168.x.x:3000"
            style={styles.input}
            keyboardType={Platform.select({ ios: 'url', android: 'url', default: 'default' })}
          />
          <Pressable
            onPress={() => setUrl(inputUrl)}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Go</Text>
          </Pressable>
        </View>
        <Text style={styles.hint} numberOfLines={2}>
          On a real device, use your Mac LAN IP (not localhost). You can also set EXPO_PUBLIC_WEB_URL.
        </Text>
      </View>
      )}

      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={{ uri: normalizedUrl }}
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        geolocationEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        onMessage={onWebMessage}
        onNavigationStateChange={(navState) => {
          canGoBackRef.current = Boolean(navState.canGoBack);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#bbb',
    borderRadius: 8,
    fontSize: 14,
  },
  button: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  webview: {
    flex: 1,
  },
});
