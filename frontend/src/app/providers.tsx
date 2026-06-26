import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { ToastProvider } from "@/components/ui/toast";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineStore } from "@/stores/offline.store";
import { useOfflineSync } from "@/hooks/useOfflineSync";

function NetworkMonitor() {
  const isOnline = useNetworkStatus();
  useOfflineStore.getState().setIsOnline(isOnline);
  useOfflineSync();
  return null;
}

export function Providers() {
  return (
    <ToastProvider>
      <NetworkMonitor />
      <RouterProvider router={router} />
    </ToastProvider>
  );
}

