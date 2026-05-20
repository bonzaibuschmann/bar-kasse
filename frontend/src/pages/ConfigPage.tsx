import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { Category, Product } from "../types";

interface Register {
  id: number;
  name: string;
  active: boolean;
}

export default function ConfigPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewRegister, setShowNewRegister] = useState(false);
  const [depositProducts, setDepositProducts] = useState<Product[]>([]);

  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formVolume, setFormVolume] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formIsDeposit, setFormIsDeposit] = useState(false);

  const [catName, setCatName] = useState("");

  const [regName, setRegName] = useState("");

  const newCatInputRef = useRef<HTMLInputElement>(null);
  const newProdNameRef = useRef<HTMLInputElement>(null);
  const newRegNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoggedIn()) { navigate("/login"); return; }
    loadData();
  }, []);

  useEffect(() => {
    if (showNewCategory && newCatInputRef.current) newCatInputRef.current.focus();
  }, [showNewCategory]);

  useEffect(() => {
    if (showNewProduct && newProdNameRef.current) newProdNameRef.current.focus();
  }, [showNewProduct]);

  useEffect(() => {
    if (showNewRegister && newRegNameRef.current) newRegNameRef.current.focus();
  }, [showNewRegister]);

  async function loadData() {
    try {
      const [cats, prods, regs] = await Promise.all([
        apiFetch<Category[]>("/categories"),
        apiFetch<Product[]>("/products/all"),
        apiFetch<Register[]>("/registers"),
      ]);
      setCategories(cats);
      setAllProducts(prods);
      setDepositProducts(prods.filter((p) => p.isDeposit));
      setRegisters(regs);
    } catch (err: any) {
      if (err.message?.includes("401") || err.message?.includes("403")) {
        logout(); navigate("/login");
      }
    }
  }

  // --- Product helpers ---
  function patchProductLocally(id: number, field: string, value: any) {
    setAllProducts((prev) =>
      prev.map((p) => p.id === id ? { ...p, [field]: value } : p)
    );
  }

  async function updateProduct(id: number, field: string, value: any) {
    patchProductLocally(id, field, value);
    try {
      await apiFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err: any) {
      alert("Error: " + err.message);
      loadData();
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Delete this product?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

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

  // --- Category helpers ---
  async function updateCategory(id: number, name: string) {
    setCategories((prev) =>
      prev.map((c) => c.id === id ? { ...c, name } : c)
    );
    try {
      await apiFetch(`/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify({ name }),
      });
    } catch (err: any) {
      alert("Error: " + err.message);
      loadData();
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

  async function saveCategory() {
    if (!catName.trim()) return;
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

  // --- Register helpers ---
  function patchRegisterLocally(id: number, field: string, value: any) {
    setRegisters((prev) =>
      prev.map((r) => r.id === id ? { ...r, [field]: value } : r)
    );
  }

  async function updateRegister(id: number, field: string, value: any) {
    patchRegisterLocally(id, field, value);
    try {
      await apiFetch(`/registers/${id}`, {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
    } catch (err: any) {
      alert("Error: " + err.message);
      loadData();
    }
  }

  async function deleteRegister(id: number) {
    if (!confirm("Delete this register?")) return;
    try {
      await apiFetch(`/registers/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  async function saveRegister() {
    if (!regName.trim()) return;
    try {
      await apiFetch("/registers", {
        method: "POST",
        body: JSON.stringify({ name: regName }),
      });
      setRegName(""); setShowNewRegister(false); loadData();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
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

      {/* ===== 1. Products ===== */}
      <div className="mb-6 bg-[#111] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Products</h2>
          <button onClick={() => { resetForm(); setShowNewProduct(true); }} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Product
          </button>
        </div>

        {showNewProduct && (
          <div className="bg-[#111] p-4 rounded-xl mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input ref={newProdNameRef} placeholder="Name" value={formName} onChange={(e) => setFormName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveProduct(); if (e.key === "Escape") resetForm(); }}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder="Price (e.g. 3.50)" type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveProduct(); if (e.key === "Escape") resetForm(); }}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder="Volume in L (optional)" type="number" step="0.01" value={formVolume} onChange={(e) => setFormVolume(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveProduct(); if (e.key === "Escape") resetForm(); }}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                className="px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" style={{ colorScheme: "dark" }}>
                <option value="">Category...</option>
                {categories.map((c) => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}
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
                className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" style={{ colorScheme: "dark" }}>
                <option value="">No default deposit</option>
                {depositProducts.map((d) => <option key={d.id} value={d.id} className="bg-[#111]">{d.name} ({d.price.toFixed(2)}€)</option>)}
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
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium">Category</th>
                <th className="px-2 py-2 font-medium w-24">Volume</th>
                <th className="px-2 py-2 font-medium w-24">Price</th>
                <th className="px-2 py-2 font-medium w-14 text-center">InStock</th>
                <th className="px-2 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((p) => (
                <tr key={p.id} className={`border-b border-gray-800/50 ${!p.active ? "opacity-40" : ""}`}>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      {p.isDeposit && <span className="text-yellow-500 text-xs shrink-0">♻️</span>}
                      <input
                        defaultValue={p.name}
                        onBlur={(e) => { if (e.target.value !== p.name) updateProduct(p.id, "name", e.target.value); }}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                        className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      value={p.categoryId}
                      onChange={(e) => updateProduct(p.id, "categoryId", parseInt(e.target.value))}
                      className="bg-[#111] border border-gray-800 hover:border-gray-600 focus:border-gray-500 rounded px-1.5 py-1 text-gray-400 text-sm outline-none cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    >
                      {categories.map((c) => <option key={c.id} value={c.id} className="bg-[#111] text-white">{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number" step="0.01"
                      defaultValue={p.volume ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        if (val !== p.volume) updateProduct(p.id, "volume", val);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-gray-400 text-sm outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number" step="0.01"
                      defaultValue={p.price}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== p.price) updateProduct(p.id, "price", val);
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm font-mono outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) => updateProduct(p.id, "active", e.target.checked)}
                      className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 2. Categories ===== */}
      <div className="mb-6 bg-[#111] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Categories</h2>
          <button onClick={() => setShowNewCategory(true)} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Category
          </button>
        </div>

        {showNewCategory && (
          <div className="bg-[#111] p-3 rounded-xl mb-3 flex gap-2 items-center">
            <input ref={newCatInputRef} placeholder="Category name" value={catName} onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveCategory(); if (e.key === "Escape") { setShowNewCategory(false); setCatName(""); } }}
              className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <button onClick={saveCategory} className="px-3 py-2 bg-emerald-700 rounded-lg text-sm font-bold touch-button">Save</button>
            <button onClick={() => { setShowNewCategory(false); setCatName(""); }} className="px-3 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium w-24 text-center">Products</th>
                <th className="px-2 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b border-gray-800/50">
                  <td className="px-2 py-1.5">
                    <input
                      value={cat.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCategories((prev) => prev.map((c) => c.id === cat.id ? { ...c, name: val } : c));
                      }}
                      onBlur={() => { updateCategory(cat.id, cat.name); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-600 text-xs">{allProducts.filter((p) => p.categoryId === cat.id).length}</td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 3. Registers ===== */}
      <div className="mb-6 bg-[#111] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Registers</h2>
          <button onClick={() => setShowNewRegister(true)} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Register
          </button>
        </div>

        {showNewRegister && (
          <div className="bg-[#111] p-3 rounded-xl mb-3 flex gap-2 items-center">
            <input ref={newRegNameRef} placeholder="Register name (e.g. Theke 1)" value={regName} onChange={(e) => setRegName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRegister(); if (e.key === "Escape") { setShowNewRegister(false); setRegName(""); } }}
              className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <button onClick={saveRegister} className="px-3 py-2 bg-emerald-700 rounded-lg text-sm font-bold touch-button">Save</button>
            <button onClick={() => { setShowNewRegister(false); setRegName(""); }} className="px-3 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium w-14 text-center">Active</th>
                <th className="px-2 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {registers.map((reg) => (
                <tr key={reg.id} className={`border-b border-gray-800/50 ${!reg.active ? "opacity-40" : ""}`}>
                  <td className="px-2 py-1.5">
                    <input
                      defaultValue={reg.name}
                      onBlur={(e) => { if (e.target.value !== reg.name) updateRegister(reg.id, "name", e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm outline-none"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <input
                      type="checkbox"
                      checked={reg.active}
                      onChange={(e) => updateRegister(reg.id, "active", e.target.checked)}
                      className="w-5 h-5 rounded accent-emerald-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteRegister(reg.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
