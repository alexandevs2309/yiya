import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  title: string
  message: string
  time: number
  read: boolean
  type: 'info' | 'success' | 'warning' | 'error'
  targetUserId?: string
  targetRoles?: string[]
}

interface NotificationsState {
  notifications: Notification[]
  addNotification: (notif: Omit<Notification, 'id' | 'time' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearAll: () => void
  unreadCount: () => number
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: 'mock-1',
          title: 'Sistema Iniciado',
          message: 'Bienvenido al sistema D\'Yiya POS.',
          time: Date.now(),
          read: false,
          type: 'info',
          targetRoles: ['admin', 'cashier', 'waiter', 'cook'],
        }
      ],
      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: Math.random().toString(36).substring(2, 9),
              time: Date.now(),
              read: false,
            },
            ...state.notifications,
          ].slice(0, 50), // Keep last 50
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),
      clearAll: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
    }),
    {
      name: 'dyiya-notifications',
    }
  )
)
