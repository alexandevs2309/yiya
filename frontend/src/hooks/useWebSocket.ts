import { useEffect, useRef, useCallback } from "react";
import { useTablesStore } from "@/stores/tables.store";
import { useKitchenStore } from "@/stores/kitchen.store";
import { WS_RECONNECT_DELAYS } from "@/lib/constants";
import type { WSEvent } from "@/lib/types";

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(440, now); // A4
    osc2.frequency.exponentialRampToValueAtTime(587.33, now + 0.2); // D5
    gain2.gain.setValueAtTime(0.1, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Silence audio failure if context blocked
  }
}

function playWaitressChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.setValueAtTime(1046.50, now + 0.1); // C6
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Silence audio failure if context blocked
  }
}

import { useAuthStore } from "@/stores/auth.store";

export function useWebSocket() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (!user || !accessToken) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const base = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
    
    const path = (user.role === "cook" || user.role === "admin")
      ? "/ws/kitchen/"
      : `/ws/waitress/${user.id}/`;
      
    const host = `${base}${path}?token=${encodeURIComponent(accessToken)}`;

    const ws = new WebSocket(host);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data: any = JSON.parse(event.data);
        const payload = data.data || data;
        
        switch (payload.type) {
          case "table_updated":
            useTablesStore.getState().updateTable(payload.table.id, payload.table);
            break;
          case "new_order":
            useKitchenStore.getState().setOrders(
              [payload.order, ...useKitchenStore.getState().orders],
            );
            playKitchenChime();
            break;
          case "item_ready":
            useKitchenStore.getState().updateItemStatus(payload.itemId, "ready");
            playWaitressChime();
            break;
          case "ecf_approved":
            window.dispatchEvent(new CustomEvent("ecf_approved", { detail: payload }));
            break;
        }
      } catch (err) {
        console.error("Error processing WebSocket message:", err);
      }
    };

    ws.onclose = () => {
      const delay = WS_RECONNECT_DELAYS[Math.min(retriesRef.current, WS_RECONNECT_DELAYS.length - 1)];
      retriesRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };
  }, [user, accessToken]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return wsRef;
}
