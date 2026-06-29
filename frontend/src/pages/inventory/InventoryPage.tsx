import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  X,
  Download,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatRD } from "@/lib/utils";
import { inventoryService } from "@/services/inventory.service";
import { printTicket } from "@/lib/printHelper";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  category_name?: string;
  unit: string;
  cost_price: string;
  sale_price: string;
  stock: number;
  min_stock: number;
  sku: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

type StockStatus = "normal" | "bajo" | "agotado";

const UNITS = [
  { value: "und", label: "Unidad" },
  { value: "lb", label: "Libra" },
  { value: "kg", label: "Kilogramo" },
  { value: "gl", label: "Galón" },
  { value: "lt", label: "Litro" },
  { value: "pz", label: "Pieza" },
];

const fastTransition = { type: "tween", duration: 0.15, ease: [0.16, 1, 0.3, 1] } as const;

function getStatus(item: Product): StockStatus {
  if (item.stock <= 0) return "agotado";
  if (item.stock <= item.min_stock) return "bajo";
  return "normal";
}

export default function InventoryPage() {
  const { addToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [saving, setSaving] = useState(false);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [prodUnit, setProdUnit] = useState("und");
  const [prodCostPrice, setProdCostPrice] = useState("");
  const [prodSalePrice, setProdSalePrice] = useState("");
  const [prodStock, setProdStock] = useState("0");
  const [prodMinStock, setProdMinStock] = useState("5");
  const [prodSku, setProdSku] = useState("");

  // Receive stock modal state
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [recProduct, setRecProduct] = useState("");
  const [recQuantity, setRecQuantity] = useState("1");
  const [recReference, setRecReference] = useState("");
  const [recNotes, setRecNotes] = useState("");

  const fetchProducts = async () => {
    try {
      const res = await inventoryService.products.list();
      const data = res.data.results ?? res.data;

      // Extract unique category names
      const cats = new Set<string>();
      data.forEach((p: Product) => {
        if (p.category_name) cats.add(p.category_name);
      });

      setProducts(data);
      setCategories(["Todas", ...Array.from(cats)]);
    } catch {
      addToast({ title: "Error", description: "No se pudieron cargar los productos", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await inventoryService.categories.list();
      const data = res.data.results ?? res.data;
      setCategoriesList(data);
    } catch {
      // Silently fail — dropdown will just be empty
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const filtered = products.filter(
    (p) =>
      (activeCategory === "Todas" || p.category_name === activeCategory) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const lowStockCount = products.filter((p) => getStatus(p) !== "normal").length;

  const handlePrintStock = () => {
    printTicket({
      title: "REPORTE DE INVENTARIO",
      lines: products.map((p) => ({
        label: p.name,
        value: `${p.stock} ${p.unit}`,
      })),
      footer: `Total productos: ${products.length} · Stock bajo: ${lowStockCount}`,
    });
  };

  // ── Product CRUD ──

  const handleOpenProductModal = (product: Product | null = null) => {
    setEditingProduct(product);
    if (product) {
      setProdName(product.name);
      setProdDescription(product.description || "");
      setProdCategory(product.category);
      setProdUnit(product.unit);
      setProdCostPrice(product.cost_price);
      setProdSalePrice(product.sale_price);
      setProdStock(String(product.stock));
      setProdMinStock(String(product.min_stock));
      setProdSku(product.sku);
    } else {
      setProdName("");
      setProdDescription("");
      setProdCategory(categoriesList[0]?.id || "");
      setProdUnit("und");
      setProdCostPrice("");
      setProdSalePrice("");
      setProdStock("0");
      setProdMinStock("5");
      setProdSku("");
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: prodName,
      description: prodDescription,
      category: prodCategory,
      unit: prodUnit,
      cost_price: parseFloat(prodCostPrice) || 0,
      sale_price: parseFloat(prodSalePrice) || 0,
      stock: parseInt(prodStock) || 0,
      min_stock: parseInt(prodMinStock) || 5,
      sku: prodSku,
      is_active: true,
    };
    try {
      if (editingProduct) {
        await inventoryService.products.update(editingProduct.id, payload);
        addToast({ title: "Producto actualizado", description: "El producto se modificó correctamente" });
      } else {
        await inventoryService.products.create(payload);
        addToast({ title: "Producto creado", description: "El nuevo producto se agregó al inventario" });
      }
      setIsProductModalOpen(false);
      fetchProducts();
    } catch {
      addToast({ title: "Error", description: "No se pudo guardar el producto", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (confirm(`¿Estás seguro de eliminar "${name}" del inventario?`)) {
      try {
        await inventoryService.products.delete(id);
        addToast({ title: "Producto eliminado", description: "Se removió del inventario." });
        fetchProducts();
      } catch {
        addToast({ title: "Error", description: "No se pudo eliminar el producto.", variant: "error" });
      }
    }
  };

  // ── Receive Stock ──

  const handleOpenReceiveModal = () => {
    setRecProduct(products[0]?.id || "");
    setRecQuantity("1");
    setRecReference("");
    setRecNotes("");
    setIsReceiveModalOpen(true);
  };

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(recQuantity);
    if (!recProduct || qty <= 0) {
      addToast({ title: "Error", description: "Selecciona un producto y una cantidad válida", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      await inventoryService.movements.create({
        product: recProduct,
        quantity: qty,
        movement_type: "in",
        reference: recReference,
        notes: recNotes,
      });
      addToast({ title: "Stock recibido", description: `Se agregaron ${qty} unidades al inventario` });
      setIsReceiveModalOpen(false);
      fetchProducts();
    } catch {
      addToast({ title: "Error", description: "No se pudo registrar la entrada de stock", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Inventario</h1>
          <p className="text-sm text-text-secondary">
            {loading ? "Cargando..." : `${products.length} productos`}
            {!loading && lowStockCount > 0 && (
              <span className="text-status-warning ml-2">
                · {lowStockCount} con stock bajo
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-48 h-9 pl-8 pr-3 rounded-lg bg-surface-secondary/50 border border-border text-xs"
            />
          </div>
          <button
            onClick={() => handleOpenProductModal(null)}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo
          </button>
          <button
            onClick={handleOpenReceiveModal}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs hover:bg-surface-secondary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Recibir
          </button>
          <button
            onClick={handlePrintStock}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-xs hover:bg-surface-secondary transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-accent text-white"
                  : "bg-surface-secondary/50 text-text-secondary hover:bg-surface-secondary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grid/List Toggle */}
      <div className="flex items-center justify-end gap-1">
        <button
          onClick={() => setView("grid")}
          className={`h-7 w-7 rounded flex items-center justify-center text-xs ${view === "grid" ? "bg-surface-secondary text-text" : "text-text-tertiary"}`}
        >
          ⊞
        </button>
        <button
          onClick={() => setView("list")}
          className={`h-7 w-7 rounded flex items-center justify-center text-xs ${view === "list" ? "bg-surface-secondary text-text" : "text-text-tertiary"}`}
        >
          ☰
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-surface-secondary/30 animate-pulse" />
          ))}
        </div>
      )}

      {/* Grid View */}
      {!loading && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((item) => {
              const status = getStatus(item);
              const total = parseFloat(item.cost_price || "0") * item.stock;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={fastTransition}
                  onClick={() => handleOpenProductModal(item)}
                  className={`relative rounded-xl border cursor-pointer ${
                    status === "agotado"
                      ? "border-status-danger/20 bg-status-danger/5"
                      : status === "bajo"
                        ? "border-status-warning/20 bg-status-warning/5"
                        : "border-border bg-surface-primary"
                  } p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`w-2 h-2 rounded-full ${
                      status === "normal" ? "bg-status-success" :
                      status === "bajo" ? "bg-status-warning" : "bg-status-danger"
                    }`} />
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        status === "normal" ? "bg-status-success/10 text-status-success" :
                        status === "bajo" ? "bg-status-warning/10 text-status-warning" : "bg-status-danger/10 text-status-danger"
                      }`}>
                        {status === "normal" ? "Normal" : status === "bajo" ? "Bajo" : "Agotado"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(item.id, item.name); }}
                        className="p-1 rounded hover:bg-danger/10 text-text-tertiary hover:text-danger transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">{item.name}</h4>
                  <p className="text-[10px] text-text-tertiary mb-3">{item.category_name || item.category}</p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-bold tracking-tight">{item.stock}</p>
                      <p className="text-[10px] text-text-tertiary">
                        Mín: {item.min_stock} {item.unit}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary">{formatRD(parseFloat(item.cost_price || "0"))}/{item.unit}</p>
                      <p className="text-sm font-semibold">{formatRD(total)}</p>
                    </div>
                  </div>
                  {status === "bajo" && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] text-status-warning">
                      <AlertTriangle className="w-3 h-3" /> Stock por debajo del mínimo
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {!loading && view === "list" && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-secondary/50 text-text-secondary text-xs">
                <th className="text-left p-3 font-medium">Producto</th>
                <th className="text-left p-3 font-medium">Categoría</th>
                <th className="text-right p-3 font-medium">Stock</th>
                <th className="text-right p-3 font-medium">Mínimo</th>
                <th className="text-right p-3 font-medium">Costo</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Estado</th>
                <th className="text-center p-3 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const status = getStatus(item);
                const total = parseFloat(item.cost_price || "0") * item.stock;
                return (
                  <tr
                    key={item.id}
                    onClick={() => handleOpenProductModal(item)}
                    className="border-t border-border hover:bg-surface-secondary/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-text-secondary">{item.category_name || item.category}</td>
                    <td className={`p-3 text-right font-mono ${
                      status === "agotado" ? "text-status-danger" :
                      status === "bajo" ? "text-status-warning" : ""
                    }`}>{item.stock}</td>
                    <td className="p-3 text-right text-text-secondary font-mono">{item.min_stock}</td>
                    <td className="p-3 text-right font-mono">{formatRD(parseFloat(item.cost_price || "0"))}/{item.unit}</td>
                    <td className="p-3 text-right font-mono font-semibold">{formatRD(total)}</td>
                    <td className="p-3 text-center">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        status === "normal" ? "bg-status-success/10 text-status-success" :
                        status === "bajo" ? "bg-status-warning/10 text-status-warning" : "bg-status-danger/10 text-status-danger"
                      }`}>
                        {status === "normal" ? "Normal" : status === "bajo" ? "Bajo" : "Agotado"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteProduct(item.id, item.name); }}
                        className="p-1.5 rounded hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-tertiary">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm font-medium">Sin resultados</p>
          <p className="text-xs">No hay productos que coincidan con tu búsqueda</p>
        </div>
      )}

      {/* ── Product Create/Edit Modal ── */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={fastTransition}
              className="w-full max-w-lg bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-border bg-bg-base/30 shrink-0">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Package className="h-4 w-4 text-sky-400" />
                  {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Nombre <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Ej. Shampoo Profesional"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={prodDescription}
                      onChange={(e) => setProdDescription(e.target.value)}
                      placeholder="Descripción del producto..."
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors resize-none h-16"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Categoría
                    </label>
                    <select
                      value={prodCategory}
                      onChange={(e) => setProdCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary transition-colors cursor-pointer"
                    >
                      <option value="">Sin categoría</option>
                      {categoriesList.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Unidad
                    </label>
                    <select
                      value={prodUnit}
                      onChange={(e) => setProdUnit(e.target.value)}
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary transition-colors cursor-pointer"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Precio de Costo (RD$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodCostPrice}
                      onChange={(e) => setProdCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Precio de Venta (RD$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={prodSalePrice}
                      onChange={(e) => setProdSalePrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Stock Actual
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodStock}
                      onChange={(e) => setProdStock(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={prodMinStock}
                      onChange={(e) => setProdMinStock(e.target.value)}
                      placeholder="5"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      SKU / Código
                    </label>
                    <input
                      type="text"
                      value={prodSku}
                      onChange={(e) => setProdSku(e.target.value)}
                      placeholder="Ej. SHAM-001"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-bg-active text-text-secondary hover:text-text-primary transition-all text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold transition-all text-xs shadow-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : editingProduct ? "Guardar Cambios" : "Crear Producto"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Receive Stock Modal ── */}
      <AnimatePresence>
        {isReceiveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={fastTransition}
              className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-modal overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-center p-5 border-b border-border bg-bg-base/30 shrink-0">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <Download className="h-4 w-4 text-sky-400" />
                  Recibir Stock
                </h3>
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-active text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleReceiveStock} className="p-5 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Producto <span className="text-danger">*</span>
                  </label>
                  <select
                    required
                    value={recProduct}
                    onChange={(e) => setRecProduct(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary transition-colors cursor-pointer"
                  >
                    <option value="">Seleccionar producto...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ""} — Stock: {p.stock}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Cantidad <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={recQuantity}
                      onChange={(e) => setRecQuantity(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                      Referencia
                    </label>
                    <input
                      type="text"
                      value={recReference}
                      onChange={(e) => setRecReference(e.target.value)}
                      placeholder="Factura #123"
                      className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                    Notas
                  </label>
                  <textarea
                    value={recNotes}
                    onChange={(e) => setRecNotes(e.target.value)}
                    placeholder="Notas adicionales sobre esta recepción..."
                    className="w-full px-3 py-2 bg-bg-base border border-border focus:border-sky-500 rounded-lg focus:outline-none text-xs text-text-primary placeholder:text-text-tertiary transition-colors resize-none h-16"
                  />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 pt-3 border-t border-border mt-4">
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-bg-active text-text-secondary hover:text-text-primary transition-all text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold transition-all text-xs shadow-button disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Procesando..." : "Recibir Stock"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
