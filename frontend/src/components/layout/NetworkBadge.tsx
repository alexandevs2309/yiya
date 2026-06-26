import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkBadge() {
  const isOnline = useNetworkStatus();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        isOnline
          ? "bg-status-free-bg text-status-free-text"
          : "bg-status-billing-bg text-status-billing-text"
      }`}
    >
      {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {isOnline ? "En línea" : "Sin conexión"}
    </motion.div>
  );
}
