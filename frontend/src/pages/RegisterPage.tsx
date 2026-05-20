import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { Category, Product, CartItem } from "../types";
import ProductGrid from "../components/ProductGrid";
import Basket from "../components/Basket";
import ChangeCalculator from "../components/ChangeCalculator";
import Header from "../components/Header";

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
        // Increase quantity
        newCart[existingIdx] = {
          ...newCart[existingIdx],
          quantity: newCart[existingIdx].quantity + 1,
        };
      } else {
        // Add new item
        const cartItem: CartItem = {
          productId: product.id,
          productName: product.name,
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

      // If removing a non-deposit item, also remove associated deposits
      if (!item.isDeposit) {
        // Remove deposits linked to this item
        for (let i = newCart.length - 1; i >= 0; i--) {
          if (newCart[i].depositFor === index) {
            newCart.splice(i, 1);
          }
        }
      }

      // Re-index depositFor references after splice
      newCart.splice(index, 1);

      // Fix depositFor indices
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
      // Fix depositFor indices
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
        // Remove item and its deposits
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
        body: JSON.stringify({
          items,
          cashGiven: cashGiven,
          register,
        }),
      });

      setCart([]);
      setShowCheckout(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err: any) {
      alert("Fehler: " + err.message);
    }
  }

  function clearCart() {
    if (cart.length === 0) return;
    if (confirm("Wirklich alles löschen?")) {
      setCart([]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl animate-pulse">Laden...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen no-select">
      <Header>
        <div className="flex items-center gap-3">
          <span className="text-bar-gold font-bold text-lg">💰 Bar Kasse</span>
          <select
            value={register}
            onChange={(e) => setRegister(e.target.value)}
            className="bg-bar-mid text-white rounded px-2 py-1 text-sm border border-gray-600"
          >
            <option value="1">Kasse 1</option>
            <option value="2">Kasse 2</option>
            <option value="3">Kasse 3</option>
          </select>
          <Link
            to="/dashboard"
            className="text-xs text-gray-400 hover:text-white ml-auto"
          >
            Dashboard
          </Link>
          <Link
            to="/config"
            className="text-xs text-gray-400 hover:text-white"
          >
            Config
          </Link>
        </div>
      </Header>

      {orderSuccess && (
        <div className="bg-bar-green text-white text-center py-2 text-lg font-bold animate-pulse">
          ✓ Bestellung gespeichert!
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 overflow-y-auto p-3">
          <ProductGrid
            categories={categories}
            addToCart={addToCart}
          />
        </div>

        {/* Right: Basket */}
        <div className="w-[380px] border-l border-gray-700 flex flex-col bg-bar-mid">
          <Basket
            cart={cart}
            total={total}
            removeItem={removeItem}
            removeDepositOnly={removeDepositOnly}
            changeQuantity={changeQuantity}
            clearCart={clearCart}
          />

          {/* Checkout */}
          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => cart.length > 0 && setShowCheckout(true)}
              disabled={cart.length === 0}
              className="w-full py-4 rounded-xl text-xl font-bold touch-button transition-all
                disabled:opacity-30 disabled:cursor-not-allowed
                bg-bar-accent hover:bg-red-500 text-white"
            >
              Kassieren · {total.toFixed(2).replace(".", ",")} €
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
