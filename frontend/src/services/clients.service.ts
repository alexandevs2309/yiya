import api from "./api";

export const clientsService = {
  list: (params?: any) => api.get("/clients/clients/", { params }),
  get: (id: string) => api.get(`/clients/clients/${id}/`),
  create: (data: any) => api.post("/clients/clients/", data),
  update: (id: string, data: any) => api.put(`/clients/clients/${id}/`, data),
  delete: (id: string) => api.delete(`/clients/clients/${id}/`),
  incrementVisit: (id: string) => api.post(`/clients/clients/${id}/increment_visit/`),
};
