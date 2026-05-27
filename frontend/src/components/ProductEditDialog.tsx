import { useEffect, useRef, useState } from "react";
import { Product, Category, Container } from "../types";
import { apiFetch } from "../api";
import Modal from "./Modal";

declare const ColorPicker: any;

interface Props {
  product: Product;
  categories: Category[];
  containers?: Container[];
  onClose: () => void;
  onSaveData?: (data: { productId: number; name: string; price: number; volume: number | null; active: boolean; display: boolean; categoryId: number; color: string; defaultContainerId?: number | null }) => void;
  onChange?: (changes: Partial<Product>) => void;
  specialMode?: boolean;
  containerMode?: boolean;
}

export default function ProductEditDialog({ product, categories, containers, onClose, onSaveData, onChange, specialMode, containerMode }: Props) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [volume, setVolume] = useState(product.volume ? String(product.volume) : "");
  const [active, setActive] = useState(product.active);
  const [display, setDisplay] = useState(product.display !== false);
  const [categoryId, setCategoryId] = useState(String(product.categoryId));
  const [color, setColor] = useState(product.color || "#2b2b2b");
  const [image, setImage] = useState(product.image || "");
  const [defaultContainerId, setDefaultContainerId] = useState(product.defaultContainerId ? String(product.defaultContainerId) : "");
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef<any>(null);
  const colorRef = useRef(color);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Keep color ref in sync
  useEffect(() => { colorRef.current = color; }, [color]);

  useEffect(() => {
    if (!buttonRef.current) return;
    if (typeof ColorPicker === "undefined") return;

    // Set dark theme attribute on the button
    buttonRef.current.setAttribute("data-cp-theme", "dark");

    pickerRef.current = new ColorPicker(buttonRef.current, {
      color: color,
      enableAlpha: false,
      toggleStyle: "button",
      defaultFormat: "hex",
      submitMode: "instant",
    });

    // Listen for pick events to update local state (button preview)
    pickerRef.current.on("pick", (c: any) => {
      const hex = c.toString();
      if (hex) { setColor(hex); }
    });

    // Only notify parent when the picker dialog closes
    pickerRef.current.on("close", (c: any) => {
      const hex = c.toString();
      if (hex) { onChange?.({ color: hex } as any); }
    });

    return () => {
      if (pickerRef.current) {
        try { pickerRef.current.destroy(); } catch {}
        pickerRef.current = null;
      }
    };
  }, []);

  async function handleSave() {
    const data = {
      productId: product.id,
      name,
      price: parseFloat(price),
      volume: specialMode ? (product.volume || null) : (volume || null),
      active: specialMode ? product.active : active,
      display: specialMode ? (product.display !== false) : display,
      categoryId:      specialMode ? product.categoryId : parseInt(categoryId),
      color: color,
      image: image || null,
      defaultContainerId: specialMode ? product.defaultContainerId : (defaultContainerId ? parseInt(defaultContainerId) : null),
    };
    if (onSaveData) {
      // Buffer mode — parent will send on Save button
      onSaveData(data);
      onClose();
    } else {
      // Direct mode
      setSaving(true);
      try {
        await apiFetch(`/products/${product.id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        onClose();
      } catch (err: any) {
        alert("Error: " + err.message);
      }
      setSaving(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-lg font-bold text-center mb-2 text-yellow-400">{specialMode ? "Edit Special" : containerMode ? "Edit Container" : "Edit Product"}</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase">Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); onChange?.({ name: e.target.value } as any); }}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 uppercase">Price (€)</label>
              <input
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => { const v = e.target.value; setPrice(v); const n = parseFloat(v); if (!isNaN(n)) onChange?.({ price: n } as any); }}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              />
            </div>
            {!specialMode && !containerMode && (
            <div className="flex-1">
              <label className="text-xs text-gray-500 uppercase">Volume (L)</label>
              <input
                type="number"
                step="0.01"
                value={volume}
                onChange={(e) => { const v = e.target.value; setVolume(v); const n = parseFloat(v); onChange?.({ volume: isNaN(n) ? null : n } as any); }}
                className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
                placeholder="—"
              />
            </div>
            )}
          </div>

          {!specialMode && !containerMode && (
          <div>
            <label className="text-xs text-gray-500 uppercase">Category</label>
            <select
              value={categoryId}
              onChange={(e) => { const v = e.target.value; setCategoryId(v); onChange?.({ categoryId: parseInt(v) } as any); }}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              style={{ colorScheme: "dark" }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          )}

          {!specialMode && !containerMode && containers && containers.length > 0 && (
          <div>
            <label className="text-xs text-gray-500 uppercase">Default Container</label>
            <select
              value={defaultContainerId}
              onChange={(e) => { const v = e.target.value; setDefaultContainerId(v); onChange?.({ defaultContainerId: v ? parseInt(v) : null } as any); }}
              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-white mt-1"
              style={{ colorScheme: "dark" }}
            >
              <option value="">— None —</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.deposit.toFixed(2).replace(".", ",")}€)</option>
              ))}
            </select>
          </div>
          )}

          {(!specialMode || containerMode) && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 uppercase">{containerMode ? "In Stock" : "Active"}</label>
            <button
              type="button"
              onClick={() => { const next = !active; setActive(next); onChange?.({ active: next } as any); }}
              className={`w-12 h-6 rounded-full transition-all ${active ? "bg-emerald-500" : "bg-gray-700"} relative`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${active ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
          )}

          {!specialMode && !containerMode && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 uppercase">Display</label>
            <button
              type="button"
              onClick={() => { const next = !display; setDisplay(next); onChange?.({ display: next } as any); }}
              className={`w-12 h-6 rounded-full transition-all ${display ? "bg-emerald-500" : "bg-gray-700"} relative`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${display ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
          )}

          <div>
            <label className="text-xs text-gray-500 uppercase">Box Color</label>
            <div className="mt-1 flex items-center gap-2">
              <button
                ref={buttonRef}
                className="py-2 px-4 border border-gray-700 rounded-lg hover:brightness-110"
                style={{ backgroundColor: color, minWidth: "38px", minHeight: "38px" }}
              />
              <button
                type="button"
                onClick={() => { setColor("#2b2b2b"); onChange?.({ color: "#2b2b2b" } as any); pickerRef.current?.setColor("#2b2b2b"); }}
                className="py-2 px-3 flex items-center gap-1 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 text-sm"
                title="Reset to default color"
              >
                ↺ Reset Color
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase">Image</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const dataUrl = reader.result as string;
                    setImage(dataUrl);
                    onChange?.({ image: dataUrl } as any);
                  };
                  reader.readAsDataURL(file);
                }}
                className="text-xs text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-white hover:file:bg-gray-600"
              />
              {image && (
                <button
                  type="button"
                  onClick={() => { setImage(""); onChange?.({ image: null } as any); }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  ✕ Remove
                </button>
              )}
            </div>
            {image && (
              <img src={image} alt="Preview" className="mt-2 max-h-20 rounded border border-gray-700" />
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-800 rounded-xl font-bold text-lg touch-button text-gray-300 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-lg touch-button hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
