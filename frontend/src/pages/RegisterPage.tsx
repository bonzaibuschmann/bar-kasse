import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { Category, Product, CartItem } from "../types";
import Basket from "../components/Basket";
import ChangeCalculator from "../components/ChangeCalculator";

export default function RegisterPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [register, setRegister] = useState("1");
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const cats = await apiFetch<Category[]>("/categories");
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  }

  const addToCart = useCallback((product: Product) => {
    setCart((prev) => {
      const newCart = [...prev];
      const existingIdx = newCart.findIndex(
        (item) => item.productId === product.id && !item.isDeposit && item.depositFor === null
      );

      if (existingIdx >= 0) {
        newCart[existingIdx] = {
          ...newCart[existingIdx],
          quantity: newCart[existingIdx].quantity + 1,
        };
      } else {
        const cartItem: CartItem = {
          productId: product.id,
          productName: product.name,
          volume: product.volume,
          unitPrice: product.price,
          quantity: 1,
          isDeposit: false,
          depositFor: null,
          depositId: null,
        };
        newCart.push(cartItem);

        // Auto-add deposit if product has one
        if (product.depositId && product.deposit) {
          const parentIdx = newCart.length - 1;
          newCart.push({
            productId: product.deposit.id,
            productName: product.deposit.name,
            volume: null,
            unitPrice: product.deposit.price,
            quantity: 1,
            isDeposit: true,
            depositFor: parentIdx,
            depositId: product.deposit.id,
          });
        }
      }

      return newCart;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];

      if (!item.isDeposit) {
        for (let i = newCart.length - 1; i >= 0; i--) {
          if (newCart[i].depositFor === index) {
            newCart.splice(i, 1);
          }
        }
      }

      newCart.splice(index, 1);

      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].depositFor !== null && newCart[i].depositFor !== undefined) {
          if (newCart[i].depositFor! > index) {
            newCart[i] = { ...newCart[i], depositFor: newCart[i].depositFor! - 1 };
          }
        }
      }

      return newCart;
    });
  }, []);

  const removeDepositOnly = useCallback((index: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      newCart.splice(index, 1);
      for (let i = 0; i < newCart.length; i++) {
        if (newCart[i].depositFor !== null && newCart[i].depositFor !== undefined) {
          if (newCart[i].depositFor! > index) {
            newCart[i] = { ...newCart[i], depositFor: newCart[i].depositFor! - 1 };
          }
        }
      }
      return newCart;
    });
  }, []);

  const changeQuantity = useCallback((index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return newCart.filter((_, i) => i !== index);
      }
      newCart[index] = { ...item, quantity: newQty };
      return newCart;
    });
  }, []);

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  async function submitOrder(cashGiven?: number) {
    try {
      const items = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        isDeposit: item.isDeposit,
        depositFor: item.depositFor,
      }));

      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ items, cashGiven, register }),
      });

      setCart([]);
      setShowCheckout(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Clear entire cart?")) {
      setCart([]);
    }
  }

  function formatVolume(v: number | null): string {
    if (!v) return "";
    return v >= 1 ? `${v}L` : `${(v * 1000).toFixed(0)}ml`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen no-select">
      {orderSuccess && (
        <div className="bg-emerald-600 text-white text-center py-2 text-lg font-bold animate-pulse">
          ✓ Order saved!
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products by category rows */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {categories.map((cat) => (
            <div key={cat.id}>
              <div className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">{cat.name}</div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {cat.products
                  .filter((p) => !p.isDeposit)
                  .map((product) => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="bg-[#111] hover:bg-[#222] border border-gray-800 rounded-xl p-3 text-center touch-button transition-all flex flex-col items-center justify-center min-w-[110px] min-h-[90px] relative shrink-0"
                    >
                      <span className="font-semibold text-sm leading-tight">{product.name}</span>
                      {product.volume && (
                        <span className="text-xs text-gray-500 mt-0.5">{formatVolume(product.volume)}</span>
                      )}
                      <span className="text-emerald-400 font-bold mt-1">
                        {product.price.toFixed(2).replace(".", ",")} €
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Basket + nav */}
        <div className="w-[360px] border-l border-gray-800 flex flex-col bg-[#111]">
          {/* Nav above basket */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-sm">💰 Register</span>
              <select
                value={register}
                onChange={(e) => setRegister(e.target.value)}
                className="bg-black text-white rounded px-2 py-1 text-xs border border-gray-700"
              >
                <option value="1">Register 1</option>
                <option value="2">Register 2</option>
                <option value="3">Register 3</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Link to="/dashboard" className="text-xs text-gray-500 hover:text-white">Dashboard</Link>
              <Link to="/config" className="text-xs text-gray-500 hover:text-white">Config</Link>
            </div>
          </div>

          <Basket
            cart={cart}
            total={total}
            removeItem={removeItem}
            removeDepositOnly={removeDepositOnly}
            changeQuantity={changeQuantity}
            clearCart={clearCart}
          />

          {/* Checkout */}
          <div className="p-3 border-t border-gray-800">
            <button
              onClick={() => cart.length > 0 && setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl text-xl font-bold touch-button transition-all
                disabled:opacity-30 disabled:cursor-not-allowed
                bg-rose-600 hover:bg-rose-500 text-white"
            >
              Checkout · {total.toFixed(2).replace(".", ",")} €
            </button>
          </div>
        </div>
      </div>

      {/* Checkout overlay */}
      {showCheckout && (
        <ChangeCalculator
          total={total}
          onConfirm={(cashGiven) => submitOrder(cashGiven)}
          onCancel={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
