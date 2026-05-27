import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout } from "../api";
import { Category, Product, Container } from "../types";

interface Register {
  id: number;
  name: string;
  active: boolean;
}

interface StaffGroup {
  id: number;
  name: string;
  order: number;
  members: StaffMember[];
}

interface StaffMember {
  id: number;
  name: string;
  order: number;
  groupId: number;
}

export default function ConfigPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [showNewRegister, setShowNewRegister] = useState(false);
  const [showNewContainer, setShowNewContainer] = useState(false);
  const [depositProducts, setDepositProducts] = useState<Product[]>([]);

  const [formName, setFormName] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formVolume, setFormVolume] = useState("");
  const [formDeposit, setFormDeposit] = useState("");
  const [formIsDeposit, setFormIsDeposit] = useState(false);

  const [catName, setCatName] = useState("");
  const [regName, setRegName] = useState("");
  const [containerName, setContainerName] = useState("");
  const [containerDeposit, setContainerDeposit] = useState("");
  const [containerImage, setContainerImage] = useState("");
  const [staffGroups, setStaffGroups] = useState<StaffGroup[]>([]);
  const [showNewStaffGroup, setShowNewStaffGroup] = useState(false);
  const [showNewStaffMemberFor, setShowNewStaffMemberFor] = useState<number | null>(null);
  const [staffGroupName, setStaffGroupName] = useState("");
  const [staffMemberName, setStaffMemberName] = useState("");

  const newCatInputRef = useRef<HTMLInputElement>(null);
  const newProdNameRef = useRef<HTMLInputElement>(null);
  const newRegNameRef = useRef<HTMLInputElement>(null);
  const newContainerInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (showNewContainer && newContainerInputRef.current) newContainerInputRef.current.focus();
  }, [showNewContainer]);

  async function loadData() {
    try {
      const [cats, prods, regs, conts, staff] = await Promise.all([
        apiFetch<Category[]>("/categories"),
        apiFetch<Product[]>("/products/all"),
        apiFetch<Register[]>("/registers"),
        apiFetch<Container[]>("/containers"),
        apiFetch<StaffGroup[]>("/staff"),
      ]);
      setCategories(cats);
      setAllProducts(prods);
      setDepositProducts(prods.filter((p) => p.isDeposit));
      setRegisters(regs);
      setContainers(conts);
      setStaffGroups(staff);
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

  // --- Container helpers ---
  async function saveContainer() {
    if (!containerName.trim()) return;
    try {
      await apiFetch("/containers", {
        method: "POST",
        body: JSON.stringify({ name: containerName, deposit: containerDeposit ? parseFloat(containerDeposit) : 0, image: containerImage || null }),
      });
      setContainerName(""); setContainerDeposit(""); setContainerImage(""); setShowNewContainer(false); loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function updateContainer(id: number, field: string, value: any) {
    try {
      await apiFetch(`/containers/${id}`, { method: "PUT", body: JSON.stringify({ [field]: value }) });
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function deleteContainer(id: number) {
    if (!confirm("Delete container? Products will lose default.")) return;
    try {
      await apiFetch(`/containers/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  }

  // --- Staff helpers ---
  async function saveStaffGroup() {
    if (!staffGroupName.trim()) return;
    try {
      await apiFetch("/staff/groups", { method: "POST", body: JSON.stringify({ name: staffGroupName }) });
      setStaffGroupName(""); setShowNewStaffGroup(false); loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function updateStaffGroup(id: number, name: string) {
    try {
      await apiFetch(`/staff/groups/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function deleteStaffGroup(id: number) {
    if (!confirm("Delete staff group and all its members?")) return;
    try {
      await apiFetch(`/staff/groups/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function saveStaffMember(groupId: number) {
    if (!staffMemberName.trim()) return;
    try {
      await apiFetch("/staff/members", { method: "POST", body: JSON.stringify({ name: staffMemberName, groupId }) });
      setStaffMemberName(""); setShowNewStaffMemberFor(null); loadData();
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function updateStaffMember(id: number, name: string) {
    try {
      await apiFetch(`/staff/members/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
    } catch (err: any) { alert("Error: " + err.message); }
  }

  async function deleteStaffMember(id: number) {
    if (!confirm("Delete staff member?")) return;
    try {
      await apiFetch(`/staff/members/${id}`, { method: "DELETE" });
      loadData();
    } catch (err: any) { alert("Error: " + err.message); }
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
                <th className="px-2 py-2 font-medium w-16">Image</th>
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
                    <div className="flex items-center gap-1">
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateProduct(p.id, "image", reader.result as string);
                        reader.readAsDataURL(file);
                      }} className="hidden" id={`prod-img-${p.id}`} />
                      <button onClick={() => document.getElementById(`prod-img-${p.id}`)?.click()}
                        className="text-xs text-gray-500 hover:text-white" title="Upload image">📷</button>
                      {p.image && (
                        <>
                          <img src={p.image} className="h-6 w-6 object-cover rounded" alt="" />
                          <button onClick={() => updateProduct(p.id, "image", null)}
                            className="text-xs text-red-400 hover:text-red-300">✕</button>
                        </>
                      )}
                    </div>
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

      {/* ===== 4. Containers ===== */}
      <div className="mb-6 bg-[#111] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Containers</h2>
          <button onClick={() => setShowNewContainer(true)} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Container
          </button>
        </div>

        {showNewContainer && (
          <div className="bg-[#111] p-3 rounded-xl mb-3 flex gap-2 items-center">
            <input ref={newContainerInputRef} placeholder="Name (e.g. Glas)" value={containerName} onChange={(e) => setContainerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveContainer(); if (e.key === "Escape") { setShowNewContainer(false); setContainerName(""); setContainerDeposit(""); } }}
              className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <input type="number" step="0.01" placeholder="Deposit (€)" value={containerDeposit} onChange={(e) => setContainerDeposit(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveContainer(); if (e.key === "Escape") { setShowNewContainer(false); setContainerName(""); setContainerDeposit(""); setContainerImage(""); } }}
              className="w-28 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0]; if (!file) return;
              const reader = new FileReader();
              reader.onload = () => setContainerImage(reader.result as string);
              reader.readAsDataURL(file);
            }} className="text-xs text-gray-400 file:mr-1 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white" />
            <button onClick={saveContainer} className="px-3 py-2 bg-emerald-700 rounded-lg text-sm font-bold touch-button">Save</button>
            <button onClick={() => { setShowNewContainer(false); setContainerName(""); setContainerDeposit(""); }} className="px-3 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-left">
                <th className="px-2 py-2 font-medium">Name</th>
                <th className="px-2 py-2 font-medium w-32">Deposit (€)</th>
                <th className="px-2 py-2 font-medium w-24 text-center">Products</th>
                <th className="px-2 py-2 font-medium w-16">Image</th>
                <th className="px-2 py-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {containers.length === 0 && (
                <tr><td colSpan={5} className="px-2 py-4 text-center text-gray-600 text-sm">No containers yet</td></tr>
              )}
              {containers.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50">
                  <td className="px-2 py-1.5">
                    <input defaultValue={c.name}
                      onBlur={(e) => { if (e.target.value !== c.name) updateContainer(c.id, "name", e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm outline-none" />
                  </td>
                  <td className="px-2 py-1.5">
                    <input type="number" step="0.01" defaultValue={c.deposit}
                      onBlur={(e) => { const val = parseFloat(e.target.value); if (val !== c.deposit) updateContainer(c.id, "deposit", val); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="w-full bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm font-mono outline-none" />
                  </td>
                  <td className="px-2 py-1.5 text-center text-gray-600 text-xs">
                    {allProducts.filter((p) => p.defaultContainerId === c.id).length}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => updateContainer(c.id, "image", reader.result as string);
                        reader.readAsDataURL(file);
                      }} className="hidden" id={`container-img-${c.id}`} />
                      <button onClick={() => document.getElementById(`container-img-${c.id}`)?.click()}
                        className="text-xs text-gray-500 hover:text-white" title="Upload image">📷</button>
                      {c.image && (
                        <>
                          <img src={c.image} className="h-6 w-6 object-cover rounded" alt="" />
                          <button onClick={() => updateContainer(c.id, "image", null)}
                            className="text-xs text-red-400 hover:text-red-300">✕</button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => deleteContainer(c.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== 5. Staff ===== */}
      <div className="mb-6 bg-[#111] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Staff</h2>
          <button onClick={() => setShowNewStaffGroup(true)} className="px-3 py-1.5 bg-rose-600 rounded-lg text-xs font-bold touch-button">
            + New Group
          </button>
        </div>

        {showNewStaffGroup && (
          <div className="bg-[#111] p-3 rounded-xl mb-3 flex gap-2 items-center">
            <input placeholder="Group name (e.g. Bar)" value={staffGroupName} onChange={(e) => setStaffGroupName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveStaffGroup(); if (e.key === "Escape") { setShowNewStaffGroup(false); setStaffGroupName(""); } }}
              className="flex-1 px-3 py-2 bg-black border border-gray-700 rounded-lg text-white text-sm" />
            <button onClick={saveStaffGroup} className="px-3 py-2 bg-emerald-700 rounded-lg text-sm font-bold touch-button">Save</button>
            <button onClick={() => { setShowNewStaffGroup(false); setStaffGroupName(""); }} className="px-3 py-2 bg-gray-800 rounded-lg text-sm touch-button">Cancel</button>
          </div>
        )}

        {staffGroups.length === 0 && (
          <div className="text-center text-gray-600 text-sm py-4">No staff groups yet</div>
        )}

        {staffGroups.map((group) => (
          <div key={group.id} className="mb-3 bg-[#0a0a0a] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <input defaultValue={group.name}
                onBlur={(e) => { if (e.target.value !== group.name) updateStaffGroup(group.id, e.target.value); }}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-white text-sm font-semibold outline-none" />
              <div className="flex gap-2">
                <button onClick={() => { setShowNewStaffMemberFor(group.id); setStaffMemberName(""); }}
                  className="px-2 py-1 bg-emerald-700 rounded text-xs font-bold touch-button">+ Member</button>
                <button onClick={() => deleteStaffGroup(group.id)} className="text-red-400 hover:text-red-300 text-xs touch-button">🗑️</button>
              </div>
            </div>

            {showNewStaffMemberFor === group.id && (
              <div className="bg-[#111] p-2 rounded-lg mb-2 flex gap-2 items-center">
                <input placeholder="Member name" value={staffMemberName} onChange={(e) => setStaffMemberName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveStaffMember(group.id); if (e.key === "Escape") { setShowNewStaffMemberFor(null); setStaffMemberName(""); } }}
                  className="flex-1 px-2 py-1.5 bg-black border border-gray-700 rounded text-white text-xs" />
                <button onClick={() => saveStaffMember(group.id)} className="px-2 py-1.5 bg-emerald-700 rounded text-xs font-bold touch-button">Save</button>
                <button onClick={() => { setShowNewStaffMemberFor(null); setStaffMemberName(""); }} className="px-2 py-1.5 bg-gray-800 rounded text-xs touch-button">Cancel</button>
              </div>
            )}

            {group.members.length === 0 ? (
              <div className="text-gray-600 text-xs pl-2">No members</div>
            ) : (
              <div className="space-y-1 pl-2">
                {group.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2">
                    <input defaultValue={m.name}
                      onBlur={(e) => { if (e.target.value !== m.name) updateStaffMember(m.id, e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      className="flex-1 bg-transparent border border-transparent hover:border-gray-700 focus:border-gray-500 rounded px-1.5 py-0.5 text-gray-300 text-xs outline-none" />
                    <button onClick={() => deleteStaffMember(m.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
