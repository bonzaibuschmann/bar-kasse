import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { Category, Product } from "../types";

export default function ConfigPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [depositProducts, setDepositProducts] = useState<Product[]>([]);

  // Editing state
  const [editingCell, setEditingCell] = useState<{id: number, field: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");

  // New product form
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formVolume, setFormVolume] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formIsDeposit, setFormIsDeposit] = useState(false);

  // New category form
  const [catName, setCatName] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { navigate("/login"); return; }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [cats, prods] = await Promise.all([
        apiFetch<Category[]>("/categories"),
        apiFetch<Product[]>("/products/all"),
      ]);
      setCategories(cats);
      setAllProducts(prods);
      setDepositProducts(prods.filter((p) => p.isDeposit));
    } catch (err: any) {
      if (err.message.includes("401") || err.message.includes("403")) {
        logout(); navigate("/login");
      }
    }
  }

  // --- Inline edit for product cells ---
  function startEdit(id: number, field: string, value: string) {
    setEditingCell({ id, field });
    setEditValue(value);
  }

  async function saveEdit() {
    if (!editingCell) return;
    try {
      const body: any = {};
      if (editingCell.field === "name") body.name = editValue;
      else if (editingCell.field === "price") body.price = parseFloat(editValue);
      else if (editingCell.field === "volume") body.volume = editValue === "" ? null : parseFloat(editValue);

      await apiFetch(`/products/${editingCell.id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setEditingCell(null);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  // --- Category name inline edit ---
  function startCatEdit(cat: Category) {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
  }

  async function saveCatEdit() {
    if (!editingCatId) return;
    try {
      await apiFetch(`/categories/${editingCatId}`, {
        method: "PUT",
        body: JSON.stringify({ name: editCatName }),
      });
      setEditingCatId(null);
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- Toggle active ---
  async function toggleActive(p: Product) {
    try {
      await apiFetch(`/products/${p.id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !p.active }),
      });
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- Delete ---
  async function deleteProduct(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm("Delete category and all its products?")) return;
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- New product ---
  function resetForm() {
    setFormName(""); setFormPrice(""); setFormCategory("");
    setFormVolume(""); setFormDeposit(""); setFormIsDeposit(false);
    setShowNewProduct(false);
  }

  async function saveProduct() {
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          price: parseFloat(formPrice),
          volume: formVolume ? parseFloat(formVolume) : null,
          categoryId: parseInt(formCategory),
          isDeposit: formIsDeposit,
          depositId: formDeposit ? parseInt(formDeposit) : null,
          active: true,
        }),
      });
      resetForm(); loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  // --- New category ---
  async function saveCategory() {
    try {
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName }),
      });
      setCatName(""); setShowNewCategory(false); loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function getCatName(catId: number): string {
    return categories.find((c) => c.id === catId)?.name || "?";
  }

  return (
    <div className="min-h-screen no-select p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-yellow-400">⚙️ Configuration</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-gray-500 hover:text-white text-sm">← Register</Link>
          <Link to="/dashboard" className="text-gray-500 hover:text-white text-sm">Dashboard →</Link>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-red-400 hover:text-red-300 text-sm">
            Logout
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <button onClick={() => setShowNewCategory(true)} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Category
          </button>
        </div>

        {showNewCategory && (
          <div className="bg-[#111] p-3 rounded-xl mb-3 flex gap-2 items-center">
            <input placeholder="Category name" value={catName} onChange={(e) => setCatName(e.target.value)}
              className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <button onClick={saveCategory} className="px-3 py-2 bg-emerald-700 rounded-lg text-sm font-bold touch-button">Save</button>
            <button onClick={() => { setShowNewCategory(false); setCatName(""); }} className="px-3 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
          </div>
        )}

        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between bg-[#111] px-4 py-2.5 rounded-lg">
              <div className="flex items-center gap-2">
                {editingCatId === cat.id ? (
                  <input value={editCatName} onChange={(e) => setEditCatName(e.target.value)}
                    onBlur={saveCatEdit} onKeyDown={(e) => e.key === "Enter" && saveCatEdit()}
                    className="px-2 py-1 bg-black border border-gray-600 rounded text-white text-sm" autoFocus />
                ) : (
                  <span className="cursor-pointer hover:text-yellow-400" onDoubleClick={() => startCatEdit(cat)}>
                    {cat.name}
                  </span>
                )}
                <span className="text-gray-600 text-xs">({cat.products.length} products)</span>
              </div>
              <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Products</h2>
          <button onClick={() => { resetForm(); setShowNewProduct(true); }} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Product
          </button>
        </div>

        {showNewProduct && (
          <div className="bg-[#111] p-4 rounded-xl mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Name" value={formName} onChange={(e) => setFormName(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder="Price (e.g. 3.50)" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder="Volume (L, optional)" type="number" step="0.01" value={formVolume} onChange={(e) => setFormVolume(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm">
                <option value="">Category...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-400">
                  <input type="checkbox" checked={formIsDeposit} onChange={(e) => setFormIsDeposit(e.target.checked)} />
                  Deposit item
                </label>
              </div>
            </div>
            {!formIsDeposit && depositProducts.length > 0 && (
              <select value={formDeposit} onChange={(e) => setFormDeposit(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm">
                <option value="">No default deposit</option>
                {depositProducts.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)}€)</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <button onClick={saveProduct} className="px-4 py-2 bg-emerald-700 rounded-lg font-bold text-sm touch-button">Create</button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Category</th>
                <th className="px-3 py-2 font-medium">Volume</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium text-center">Active</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => (
                <tr key={p.id} className={`border-b border-gray-800/50 ${!p.active ? "opacity-40" : ""}`}>
                  <td className="px-3 py-2">
                    {editingCell?.id === p.id && editingCell?.field === "name" ? (
                      <input value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="px-2 py-1 bg-black border border-gray-600 rounded text-white w-full" autoFocus />
                    ) : (
                      <span className="cursor-pointer hover:text-yellow-400" onDoubleClick={() => startEdit(p.id, "name", p.name)}>
                        {p.isDeposit && <span className="text-yellow-500 mr-1">♻️</span>}
                        {p.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-400">{getCatName(p.categoryId)}</td>
                  <td className="px-3 py-2">
                    {editingCell?.id === p.id && editingCell?.field === "volume" ? (
                      <input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="px-2 py-1 bg-black border border-gray-600 rounded text-white w-20" autoFocus />
                    ) : (
                      <span className="cursor-pointer hover:text-yellow-400 text-gray-400" onDoubleClick={() => startEdit(p.id, "volume", p.volume?.toString() || "")}>
                        {p.volume ? (p.volume >= 1 ? `${p.volume}L` : `${(p.volume * 1000).toFixed(0)}ml`) : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingCell?.id === p.id && editingCell?.field === "price" ? (
                      <input type="number" step="0.01" value={editValue} onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit} onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                        className="px-2 py-1 bg-black border border-gray-600 rounded text-white w-20" autoFocus />
                    ) : (
                      <span className="cursor-pointer hover:text-yellow-400 font-mono" onDoubleClick={() => startEdit(p.id, "price", p.price.toString())}>
                        {p.price.toFixed(2).replace(".", ",")} €
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => toggleActive(p)}
                      className={`w-5 h-5 rounded border touch-button ${p.active ? "bg-emerald-600 border-emerald-500" : "bg-gray-800 border-gray-600"}`}>
                      {p.active && <span className="text-white text-xs">✓</span>}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-gray-600">
        Double-click any name, price, or volume cell to edit it inline.
      </div>
    </div>
  );
}
