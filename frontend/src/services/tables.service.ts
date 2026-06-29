import api from "./api";
import { db } from "./db";

export const tablesService = {
  list: async (params?: any) => {
    if (navigator.onLine) {
      try {
        const res = await api.get("/tables/", { params });
        const data = res.data.results || res.data;
        await db.saveTables(data);
        return res;
      } catch (err) {
        const cached = await db.getTables();
        if (cached && cached.length > 0) {
          return { data: { results: cached, count: cached.length } } as any;
        }
        throw err;
      }
    } else {
      const cached = await db.getTables();
      return { data: { results: cached, count: cached.length } } as any;
    }
  },

  get: async (id: string) => {
    if (navigator.onLine) {
      try {
        const res = await api.get(`/tables/${id}/`);
        await db.saveTable(res.data);
        return res;
      } catch (err) {
        const cached = await db.getTables();
        const found = cached.find((t) => t.id === id);
        if (found) {
          return { data: found } as any;
        }
        throw err;
      }
    } else {
      const cached = await db.getTables();
      const found = cached.find((t) => t.id === id);
      if (found) {
        return { data: found } as any;
      }
      throw new Error("No hay conexión a internet para recuperar esta mesa.");
    }
  },

  updateStatus: async (id: string, status: string) => {
    if (navigator.onLine) {
      const res = await api.patch(`/tables/${id}/status/`, { status });
      const cached = await db.getTables();
      const found = cached.find((t) => t.id === id);
      if (found) {
        found.status = status as any;
        await db.saveTable(found);
      }
      return res;
    } else {
      const cached = await db.getTables();
      const found = cached.find((t) => t.id === id);
      if (found) {
        found.status = status as any;
        await db.saveTable(found);
        return { data: found } as any;
      }
      throw new Error("No hay conexión a internet para actualizar la mesa.");
    }
  },

  createTable: async (data: any) => {
    const res = await api.post("/tables/", data);
    if (navigator.onLine) {
      const allTablesRes = await api.get("/tables/");
      await db.saveTables(allTablesRes.data.results || allTablesRes.data);
    }
    return res;
  },

  updateTable: async (id: string, data: any) => {
    const res = await api.patch(`/tables/${id}/`, data);
    if (navigator.onLine) {
      const allTablesRes = await api.get("/tables/");
      await db.saveTables(allTablesRes.data.results || allTablesRes.data);
    }
    return res;
  },

  deleteTable: async (id: string) => {
    const res = await api.delete(`/tables/${id}/`);
    if (navigator.onLine) {
      const allTablesRes = await api.get("/tables/");
      await db.saveTables(allTablesRes.data.results || allTablesRes.data);
    }
    return res;
  },

  listZones: async () => {
    const res = await api.get("/tables/zones/");
    return res;
  },

  createZone: async (data: any) => {
    const res = await api.post("/tables/zones/", data);
    return res;
  },

  updateZone: async (id: string, data: any) => {
    const res = await api.patch(`/tables/zones/${id}/`, data);
    return res;
  },

  deleteZone: async (id: string) => {
    const res = await api.delete(`/tables/zones/${id}/`);
    return res;
  },
};
export default tablesService;

