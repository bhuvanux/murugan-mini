import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
    children: ReactNode;
    containerId?: string;
}

/**
 * Reusable Portal component that renders children into a top-level DOM element.
 * Useful for overlays, modals, and full-screen views that need to bypass parent stacking contexts.
 */
export function Portal({ children, containerId = "portal-root" }: PortalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        // Ensure the container exists in the body
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement("div");
            container.id = containerId;
            container.style.position = "relative";
            container.style.zIndex = "9999";
            document.body.appendChild(container);
        }

        return () => {
            // Clean up if the portal-root is empty (optional)
            // We generally keep portal-root alive to avoid rapid mount/unmount performance issues
        };
    }, [containerId]);

    if (!mounted) return null;

    const target = document.getElementById(containerId) || document.body;
    return createPortal(children, target);
}
