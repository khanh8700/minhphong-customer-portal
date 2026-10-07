"use client";

import { useEffect } from "react";

export function PortalReadyNotifier() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "PORTAL_DASHBOARD_READY" }, "*");
      }
    } catch (e) {
      // Ignore cross-origin issues
    }
  }, []);

  return null;
}
