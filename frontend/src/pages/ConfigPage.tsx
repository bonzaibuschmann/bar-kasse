import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { Category, Product } from "../types";

export default function ConfigPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [depositProducts, setDepositProducts] = useState<Product[]>([]);

  // New product form state
  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formIsDeposit, setFormIsDeposit] = useState(false);
  const [formOrder, setFormOrder] = useState("0");

  // New category form state
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("");

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
      setDepositProducts(prods.filter((p) => p.isDeposit));
    } catch (err: any) {
      if (err.message.includes("401") || err.message.includes("403")) {
        logout();
        navigate("/login");
      }
    }
  }

  function resetForm() {
    setFormName("");
    setFormPrice("");
    setFormCategory("");
    setFormDeposit("");
    setFormIsDeposit(false);
    setFormOrder("0");
    setEditingProduct(null);
    setShowNewProduct(false);
  }

  function editProduct(p: Product) {
    setEditingProduct(p);
    setFormName(p.name);
    setFormPrice(p.price.toString());
    setFormCategory(p.categoryId.toString());
    setFormDeposit(p.depositId?.toString() || "");
    setFormIsDeposit(p.isDeposit);
    setFormOrder(p.order.toString());
    setShowNewProduct(true);
  }

  async function saveProduct() {
    try {
      const body = {
        name: formName,
        price: parseFloat(formPrice),
        categoryId: parseInt(formCategory),
        isDeposit: formIsDeposit,
        order: parseInt(formOrder),
        depositId: formDeposit ? parseInt(formDeposit) : null,
      };

      if (editingProduct) {
        await apiFetch(`/products/${editingProduct.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify({ ...body, active: true }),
        });
      }

      resetForm();
      loadData();
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
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

  return (
    <div className="min-h-screen no-select p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-bar-gold">⚙️ Sortiment konfigurieren</h1>
        <div className="flex gap-3">
          <Link to="/" className="text-gray-400 hover:text-white text-sm">
            ← Kasse
          </Link>
          <Link to="/dashboard" className="text-gray-400 hover:text-white text-sm">
            Dashboard →
          </Link>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="text-red-400 hover:text-red-300 text-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Kategorien</h2>
          <button
            onClick={() => setShowNewCategory(true)}
            className="px-4 py-2 bg-bar-accent rounded-lg text-sm font-bold touch-button"
          >
            + Neue Kategorie
          </button>
        </div>

        {showNewCategory && (
          <div className="bg-bar-mid p-4 rounded-xl mb-3 space-y-3">
            <input
              placeholder="Name"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="w-full px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
            />
            <input
              placeholder="Icon (emoji, optional)"
              value={catIcon}
              onChange={(e) => setCatIcon(e.target.value)}
              className="w-full px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
            />
            <div className="flex gap-2">
              <button onClick={saveCategory} className="px-4 py-2 bg-bar-green rounded-lg font-bold text-sm touch-button">
                Speichern
              </button>
              <button onClick={() => setShowNewCategory(false)} className="px-4 py-2 bg-gray-700 rounded-lg text-sm touch-button">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between bg-bar-mid px-4 py-3 rounded-lg">
              <span className="text-lg">
                {cat.icon} {cat.name}
                <span className="text-gray-500 text-sm ml-2">({cat.products.length} Produkte)</span>
              </span>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Löschen
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Produkte</h2>
          <button
            onClick={() => { resetForm(); setShowNewProduct(true); }}
            className="px-4 py-2 bg-bar-accent rounded-lg text-sm font-bold touch-button"
          >
            + Neues Produkt
          </button>
        </div>

        {showNewProduct && (
          <div className="bg-bar-mid p-4 rounded-xl mb-4 space-y-3">
            <h3 className="font-semibold">
              {editingProduct ? "Produkt bearbeiten" : "Neues Produkt"}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
              />
              <input
                placeholder="Preis (z.B. 3.50)"
                type="number"
                step="0.01"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
              />
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
              >
                <option value="">Kategorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
              <input
                placeholder="Sortierung (0, 1, 2...)"
                type="number"
                value={formOrder}
                onChange={(e) => setFormOrder(e.target.value)}
                className="px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formIsDeposit}
                  onChange={(e) => setFormIsDeposit(e.target.checked)}
                />
                Pfand-Artikel
              </label>
            </div>

            {!formIsDeposit && depositProducts.length > 0 && (
              <select
                value={formDeposit}
                onChange={(e) => setFormDeposit(e.target.value)}
                className="w-full px-3 py-2 bg-bar-dark border border-gray-600 rounded-lg text-white"
              >
                <option value="">Kein Standard-Pfand</option>
                {depositProducts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.price.toFixed(2)}€)</option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <button onClick={saveProduct} className="px-4 py-2 bg-bar-green rounded-lg font-bold text-sm touch-button">
                {editingProduct ? "Aktualisieren" : "Erstellen"}
              </button>
              <button onClick={resetForm} className="px-4 py-2 bg-gray-700 rounded-lg text-sm touch-button">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {allProducts.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-2 rounded-lg ${
                p.active ? "bg-bar-mid" : "bg-bar-mid opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                {p.isDeposit && <span className="text-yellow-400 text-xs">♻️ Pfand</span>}
                <span className={p.active ? "" : "line-through text-gray-500"}>
                  {p.name}
                </span>
                <span className="text-bar-green font-mono">
                  {p.price.toFixed(2).replace(".", ",")} €
                </span>
                {p.deposit && (
                  <span className="text-xs text-gray-400">
                    + {p.deposit.name}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editProduct(p)}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  ✏️
                </button>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
