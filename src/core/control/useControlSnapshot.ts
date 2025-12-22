import * as React from "react";

import { type ControlSnapshot, getControlSnapshot, subscribeControlSnapshot } from "./controlSnapshot";

export function useControlSnapshot(): ControlSnapshot {
  const [snap, setSnap] = React.useState<ControlSnapshot>(() => getControlSnapshot());

  React.useEffect(() => {
    return subscribeControlSnapshot((next) => {
      setSnap(next);
    });
  }, []);

  return snap;
}
