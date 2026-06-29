import api from "./api";

export const inventoryService = {
  categories: {
    list: (params?: any) => api.get("/inventory/categories/", { params }),
    create: (data: any) => api.post("/inventory/categories/", data),
    update: (id: string, data: any) => api.put(`/inventory/categories/${id}/`, data),
    delete: (id: string) => api.delete(`/inventory/categories/${id}/`),
  },
  products: {
    list: (params?: any) => api.get("/inventory/products/", { params }),
    get: (id: string) => api.get(`/inventory/products/${id}/`),
    create: (data: any) => api.post("/inventory/products/", data),
    update: (id: string, data: any) => api.put(`/inventory/products/${id}/`, data),
    delete: (id: string) => api.delete(`/inventory/products/${id}/`),
  },
  movements: {
    list: (params?: any) => api.get("/inventory/movements/", { params }),
    create: (data: any) => api.post("/inventory/movements/", data),
  },
};
