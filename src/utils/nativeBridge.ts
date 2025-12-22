export type NativeBridgeRequest = {
  id: string;
  type: string;
  payload?: any;
};

export type NativeBridgeResponse = {
  id: string;
  type: string;
  ok?: boolean;
  error?: string;
  payload?: any;
};

function getReactNativeWebView(): any {
  const w: any = typeof window !== "undefined" ? window : undefined;
  return w?.ReactNativeWebView;
}

export function isNativeWebView(): boolean {
  const rn = getReactNativeWebView();
  return Boolean(rn && typeof rn.postMessage === "function");
}

export function postToNative(message: NativeBridgeRequest): boolean {
  const rn = getReactNativeWebView();
  if (!rn || typeof rn.postMessage !== "function") return false;
  rn.postMessage(JSON.stringify(message));
  return true;
}

function listenForNativeMessage(handler: (data: any) => void) {
  const onWindowMessage = (event: MessageEvent) => handler((event as any).data);
  const onDocumentMessage = (event: any) => handler(event?.data);

  window.addEventListener("message", onWindowMessage);
  document.addEventListener("message", onDocumentMessage);

  return () => {
    window.removeEventListener("message", onWindowMessage);
    document.removeEventListener("message", onDocumentMessage);
  };
}

export async function requestFromNative<TPayload = any>(options: {
  type: string;
  payload?: any;
  timeoutMs?: number;
}): Promise<TPayload> {
  if (!isNativeWebView()) {
    throw new Error("Not running inside native WebView");
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const timeoutMs = options.timeoutMs ?? 15000;

  return new Promise<TPayload>((resolve, reject) => {
    let done = false;

    const stop = listenForNativeMessage((raw) => {
      try {
        const msg = typeof raw === "string" ? JSON.parse(raw) : raw;
        const resp = msg as NativeBridgeResponse;
        if (!resp || resp.id !== id) return;
        done = true;
        stop();
        if (resp.ok === false) {
          reject(new Error(resp.error || "Native request failed"));
          return;
        }
        resolve(resp.payload as TPayload);
      } catch {
        return;
      }
    });

    const didPost = postToNative({ id, type: options.type, payload: options.payload });
    if (!didPost) {
      stop();
      reject(new Error("Unable to communicate with native WebView"));
      return;
    }

    window.setTimeout(() => {
      if (done) return;
      stop();
      reject(new Error("Native request timed out"));
    }, timeoutMs);
  });
}
