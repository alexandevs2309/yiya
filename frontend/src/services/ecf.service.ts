import api from "./api";

export const ecfService = {
  list: (params?: any) => api.get("/billing/ecf/", { params }),
  get: (id: number) => api.get(`/billing/ecf/${id}/`),
  resendWhatsapp: (id: string) => api.post(`/billing/ecf/${id}/resend_whatsapp/`),
};
