import api from "./api";
import { db } from "./db";

export const menuService = {
  listCategories: async () => {
    if (navigator.onLine) {
      try {
        const res = await api.get("/menu/categories/");
        const data = res.data.results || res.data;
        await db.saveCategories(data);
        return res;
      } catch (err) {
        const cached = await db.getCategories();
        if (cached && cached.length > 0) {
          return { data: { results: cached, count: cached.length } } as any;
        }
        throw err;
      }
    } else {
      const cached = await db.getCategories();
      return { data: { results: cached, count: cached.length } } as any;
    }
  },

  listItems: async (params?: any) => {
    if (navigator.onLine) {
      try {
        const res = await api.get("/menu/items/", { params });
        const data = res.data.results || res.data;
        // Cache menu items for future offline use
        if (!params || params.available_today !== undefined) {
          await db.saveMenuItems(data);
        }
        return res;
      } catch (err) {
        const cached = await db.getMenuItems();
        if (cached && cached.length > 0) {
          let filtered = cached;
          if (params?.available_today !== undefined) {
            filtered = cached.filter((i) => i.available_today === params.available_today);
          }
          if (params?.category) {
            filtered = filtered.filter((i) => i.category === params.category);
          }
          return { data: { results: filtered, count: filtered.length } } as any;
        }
        throw err;
      }
    } else {
      const cached = await db.getMenuItems();
      let filtered = cached;
      if (params?.available_today !== undefined) {
        filtered = cached.filter((i) => i.available_today === params.available_today);
      }
      if (params?.category) {
        filtered = filtered.filter((i) => i.category === params.category);
      }
      return { data: { results: filtered, count: filtered.length } } as any;
    }
  },

  updateItem: async (id: string, data: any) => {
    if (navigator.onLine) {
      const res = await api.patch(`/menu/items/${id}/`, data);
      const cached = await db.getMenuItems();
      const idx = cached.findIndex((i) => i.id === id);
      if (idx !== -1) {
        cached[idx] = { ...cached[idx], ...data };
        await db.saveMenuItems(cached);
      }
      return res;
    } else {
      const cached = await db.getMenuItems();
      const idx = cached.findIndex((i) => i.id === id);
      if (idx !== -1) {
        const updated = { ...cached[idx], ...data };
        cached[idx] = updated;
        await db.saveMenuItems(cached);
        return { data: updated } as any;
      }
      throw new Error("No hay conexión a internet para actualizar este plato.");
    }
  },
};
export default menuService;

