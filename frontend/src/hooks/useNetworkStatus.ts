import { useEffect } from "react";
import { useOfflineStore } from "@/stores/offline.store";

export function useNetworkStatus() {
  const setIsOnline = useOfflineStore((s) => s.setIsOnline);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setIsOnline]);

  return useOfflineStore((s) => s.isOnline);
}
