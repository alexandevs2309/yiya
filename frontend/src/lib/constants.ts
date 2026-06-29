import { useSettingsStore } from "@/stores/settings.store";

export const ECF_TYPES = {
  CONSUMER: "01" as const,
  CREDIT: "02" as const,
  DEBIT_NOTE: "04" as const,
};

export const ORDER_STATUS = {
  OPEN: "open" as const,
  BILLING: "billing" as const,
  PAID: "paid" as const,
  VOID: "void" as const,
};

export const ITEM_STATUS = {
  PENDING: "pending" as const,
  PREPARING: "preparing" as const,
  READY: "ready" as const,
  DELIVERED: "delivered" as const,
};

export const TABLE_STATUS = {
  FREE: "free" as const,
  OCCUPIED: "occupied" as const,
  BILLING: "billing" as const,
};

export const PAYMENT_METHODS = {
  CASH: "cash" as const,
  CARD: "card" as const,
  TRANSFER: "transfer" as const,
  MIXED: "mixed" as const,
};

/** @deprecated Use useSettingsStore for configurable rate */
export const ITBIS_RATE = 0.18;

export const ALERT_MINUTES = 15;

export const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

export const RNC_REGEX = /^\d{9}$/;
