import api from "./api";

export const purchasesService = {
  list: (params?: any) => api.get("/purchases/", { params }),
  get: (id: string) => api.get(`/purchases/${id}/`),
  create: (data: any) => api.post("/purchases/", data),
  update: (id: string, data: any) => api.put(`/purchases/${id}/`, data),
  delete: (id: string) => api.delete(`/purchases/${id}/`),
};
