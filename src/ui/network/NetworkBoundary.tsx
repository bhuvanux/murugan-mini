import React from "react";
import { getState, type NetworkStateSnapshot } from "../../core/network/networkState";

export type NetworkBoundaryState = {
  snapshot: Readonly<NetworkStateSnapshot>;
  isOnline: boolean;
  isOffline: boolean;
  lastKnownOnlineAt: string | null;
};

type Props = {
  children:
    | React.ReactNode
    | ((state: NetworkBoundaryState) => React.ReactNode);
  pollIntervalMs?: number;
};

function toBoundaryState(snapshot: Readonly<NetworkStateSnapshot>): NetworkBoundaryState {
  const isOnline = snapshot.state === "online";
  return {
    snapshot,
    isOnline,
    isOffline: snapshot.state === "offline",
    lastKnownOnlineAt: snapshot.last_known_online_at,
  };
}

export function NetworkBoundary({ children, pollIntervalMs = 5000 }: Props) {
  const [snapshot, setSnapshot] = React.useState<Readonly<NetworkStateSnapshot>>(() => getState());

  React.useEffect(() => {
    let alive = true;

    const refresh = () => {
      if (!alive) return;
      setSnapshot(getState());
    };

    refresh();

    let timer: any = null;
    try {
      timer = setInterval(refresh, Math.max(500, pollIntervalMs));
    } catch {
      // ignore
    }

    const onOnline = () => refresh();
    const onOffline = () => refresh();

    try {
      if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
        window.addEventListener("online", onOnline);
        window.addEventListener("offline", onOffline);
      }
    } catch {
      // ignore
    }

    return () => {
      alive = false;
      try {
        if (timer) clearInterval(timer);
      } catch {
        // ignore
      }
      try {
        if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
          window.removeEventListener("online", onOnline);
          window.removeEventListener("offline", onOffline);
        }
      } catch {
        // ignore
      }
    };
  }, [pollIntervalMs]);

  const state = React.useMemo(() => toBoundaryState(snapshot), [snapshot]);

  if (typeof children === "function") {
    return <>{children(state)}</>;
  }

  return <>{children}</>;
}
