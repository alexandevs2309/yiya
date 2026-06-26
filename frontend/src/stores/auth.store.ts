import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User, UserPermissions } from "@/lib/types";
import { encryptSession, decryptSession } from "@/lib/crypto";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  permissions: UserPermissions | null;
  setAuth: (user: User, access: string, refresh: string, permissions?: UserPermissions | null) => void;
  setAccessToken: (token: string) => void;
  setPermissions: (permissions: UserPermissions) => void;
  logout: () => void;
}

const encryptedStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const val = localStorage.getItem(name);
    if (!val) return null;
    const decrypted = await decryptSession(val);
    return decrypted || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encryptSession(value);
    localStorage.setItem(name, encrypted);
  },
  removeItem: async (name: string): Promise<void> => {
    localStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      permissions: null,
      setAuth: (user, access, refresh, permissions = null) =>
        set({ user, accessToken: access, refreshToken: refresh, permissions }),
      setAccessToken: (token) => set({ accessToken: token }),
      setPermissions: (permissions) => set({ permissions }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, permissions: null }),
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => encryptedStorage),
    },
  ),
);

