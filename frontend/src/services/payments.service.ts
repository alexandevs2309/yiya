import api from "./api";

export const paymentsService = {
  pay: (data: any) => api.post("/payments/", data),
};
