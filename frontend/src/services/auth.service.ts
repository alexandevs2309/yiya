import api from "./api";

export const authService = {
  login: (username: string, password: string) =>
    api.post("/auth/login/", { username, password }),
  pinLogin: (pin: string) => api.post("/auth/pin-login/", { pin }),
  me: () => api.get("/auth/me/"),
  logout: (refresh?: string) => api.post("/auth/logout/", { refresh }),

  // User Management CRUD
  listUsers: () => api.get("/auth/users/"),
  createUser: (data: any) => api.post("/auth/users/", data),
  updateUser: (id: string, data: any) => api.put(`/auth/users/${id}/`, data),
  patchUser: (id: string, data: any) => api.patch(`/auth/users/${id}/`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}/`),

  // Security Module
  getMyPermissions: () => api.get("/auth/me/permissions/"),
  invalidateSession: (userId: string, reason = "") =>
    api.post(`/auth/${userId}/invalidate-session/`, { reason }),
  unlockUser: (userId: string) => api.post(`/auth/${userId}/unlock/`),
  changePin: (currentPin: string, newPin: string) =>
    api.post("/auth/me/change-pin/", { current_pin: currentPin, new_pin: newPin }),
  updateSchedule: (
    userId: string,
    schedule: { work_days: number[]; work_start: string; work_end: string } | null,
  ) =>
    api.patch(`/auth/users/${userId}/schedule/`, schedule ?? {}),
};
