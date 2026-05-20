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

  // New product form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");

  // New category form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");

  // Track which cell is being edited
  const [editingCell, setEditingCell] = useState<string | null>(null); // "productId-field"
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
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
    } catch (err: any) {
      if (err.message.includes("401") || err.message.includes("403")) {
        logout();
        navigate("/login");
      }
    }
  }

  function startEdit(productId: number, field: string, currentValue: string) {
    setEditingCell(`${productId}-${field}`);
    setEditValue(currentValue);
  }

  async function commitEdit(productId: number, field: string) {
    const body: Record<string, any> = {};
    if (field === "name") body.name = editValue;
    else if (field === "price") body.price = parseFloat(editValue);
    else if (field === "order") body.order = parseInt(editValue);

    try {
      await apiFetch(`/products/${productId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
    setEditingCell(null);
    loadData();
  }

  async function deleteProduct(id: number) {
    if (!confirm("Produkt wirklich löschen?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  }

  async function saveNewProduct() {
    try {
      await apiFetch("/products", {
        method: "POST",
        body: JSON.stringify({
          name: formName,
          price: parseFloat(formPrice),
          categoryId: categories[0]?.id,
          active: true,
          order: 0,
        }),
      });
      setFormName("");
      setFormPrice("");
      setShowNewProduct(false);
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  }

  async function saveCategory() {
    try {
      await apiFetch("/categories", {
        method: "POST",
        body: JSON.stringify({ name: catName, icon: catIcon || null }),
      });
      setCatName("");
      setCatIcon("");
      setShowNewCategory(false);
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  }

  async function deleteCategory(id: number) {
    if (!confirm("Kategorie und alle Produkte darin löschen?")) return;
    try {
      await apiFetch(`/categories/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  }

  function Cell({ productId, field, value, displayValue, type = "text", width = "auto" }: {
    productId: number; field: string; value: string; displayValue: string; type?: string; width?: string;
  }) {
    const cellKey = `${productId}-${field}`;
    const isEditing = editingCell === cellKey;

    if (isEditing) {
      return (
        <input
          type={type}
          step={type === "number" ? "0.01" : undefined}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => commitEdit(productId, field)}
          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(productId, field); if (e.key === "Escape") setEditingCell(null); }}
          autoFocus
          className="bg-gray-800 border border-blue-500 text-white px-2 py-1 rounded text-sm w-full"
          style={{ width: width }}
        />
      );
    }

    return (
      <span
        onDoubleClick={() => startEdit(productId, field, value)}
        className="cursor-pointer px-2 py-1 rounded hover:bg-gray-700 block"
        title="Doppelklick zum Bearbeiten"
      >
        {displayValue}
      </span>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-5xl mx-auto" style={{ overflow: "auto" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-bar-gold">⚙️ Sortiment konfigurieren</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">← Kasse</Link>
          <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm">Dashboard →</Link>
          <button onClick={() => { logout(); navigate("/login"); }} className="text-red-400 hover:text-red-300 text-sm">Logout</button>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Kategorien</h2>
          <button onClick={() => setShowNewCategory(true)} className="px-4 py-2 bg-bar-accent rounded-lg text-sm font-bold touch-button">
            + Neue Kategorie
          </button>
        </div>

        {showNewCategory && (
          <div className="bg-bar-mid p-4 rounded-xl mb-3 flex gap-3 items-end">
            <input placeholder="Name" value={catName} onChange={(e) => setCatName(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
            <input placeholder="Icon (emoji)" value={catIcon} onChange={(e) => setCatIcon(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white w-32" />
            <button onClick={saveCategory} className="px-4 py-2 bg-bar-green rounded-lg font-bold text-sm touch-button">Speichern</button>
            <button onClick={() => setShowNewCategory(false)} className="px-4 py-2 bg-gray-700 rounded-lg text-sm touch-button">Abbrechen</button>
          </div>
        )}

        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between bg-bar-mid px-4 py-3 rounded-lg">
              <span className="text-lg">{cat.icon} {cat.name} <span className="text-gray-500 text-sm ml-2">({cat.products.length} Produkte)</span></span>
              <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 text-sm">Löschen</button>
            </div>
          ))}
        </div>
      </div>

      {/* Products table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Produkte</h2>
          <button onClick={() => setShowNewProduct(true)} className="px-4 py-2 bg-bar-accent rounded-lg text-sm font-bold touch-button">
            + Neues Produkt
          </button>
        </div>

        {showNewProduct && (
          <div className="bg-bar-mid p-4 rounded-xl mb-4 flex gap-3 items-end">
            <input placeholder="Name" value={formName} onChange={(e) => setFormName(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white" />
            <input placeholder="Preis" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white w-28" />
            <button onClick={saveNewProduct} className="px-4 py-2 bg-bar-green rounded-lg font-bold text-sm touch-button">Erstellen</button>
            <button onClick={() => { setShowNewProduct(false); setFormName(""); setFormPrice(""); }} className="px-4 py-2 bg-gray-700 rounded-lg text-sm touch-button">Abbrechen</button>
          </div>
        )}

        <div className="bg-bar-mid rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium w-24">Preis</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Sort.</th>
                <th className="px-4 py-3 font-medium w-16 text-center">Aktiv</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => (
                <tr key={p.id} className={`border-b border-gray-800 ${!p.active ? "opacity-40" : ""}`}>
                  <td className="px-2 py-2">
                    <Cell productId={p.id} field="name" value={p.name} displayValue={p.name} />
                  </td>
                  <td className="px-2 py-2">
                    <Cell
                      productId={p.id} field="price" value={p.price.toString()}
                      displayValue={`${p.price.toFixed(2).replace(".", ",")} €`}
                      type="number" width="80px"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <Cell productId={p.id} field="order" value={p.order.toString()} displayValue={String(p.order)} type="number" width="50px" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={async () => {
                        await apiFetch(`/products/${p.id}`, { method: "PUT", body: JSON.stringify({ active: !p.active }) });
                        loadData();
                      }}
                      className={`w-5 h-5 rounded border ${p.active ? "bg-bar-green border-bar-green" : "bg-gray-700 border-gray-600"}`}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-600 mt-2">Doppelklick auf eine Zelle zum Bearbeiten</p>
      </div>
    </div>
  );
}
