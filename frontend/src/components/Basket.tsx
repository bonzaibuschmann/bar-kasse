import { useState, useEffect, useRef, useCallback } from "react";
import { CartItem } from "../types";

interface Props {
  cart: CartItem[];
  total: number;
  removeItem: (index: number) => void;
  removeDepositOnly: (index: number) => void;
  changeQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
  undo: () => void;
  canUndo: boolean;
  onHistory: () => void;
}

function formatVolume(v: number | null): string {
  if (!v) return "";
  return `${v}L`;
}

export default function Basket({ cart, total, removeItem, removeDepositOnly, changeQuantity, clearCart, undo, canUndo, onHistory }: Props) {
  const [flashKeys, setFlashKeys] = useState<Map<number, number>>(new Map());
  const [flashingIds, setFlashingIds] = useState<Set<number>>(new Set());
  const [removingKeys, setRemovingKeys] = useState<Set<string>>(new Set());
  const prevCartMapRef = useRef<Map<number, { qty: number }>>(new Map());
  const isInitialMount = useRef(true);

  // Seed the ref with the cart on mount / remount so existing items don't flash
  useEffect(() => {
    const map = new Map<number, { qty: number }>();
    cart.forEach((item) => map.set(item.productId, { qty: item.quantity }));
    prevCartMapRef.current = map;
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Generate a unique key for a cart item at a given index
  const itemKey = (index: number, item: CartItem): string =>
    `${item.productId}-${item.depositFor}-${index}`;

  useEffect(() => {
    const prevMap = prevCartMapRef.current;
    const changed = new Set<number>();

    cart.forEach((item, _i) => {
      const prev = prevMap.get(item.productId);
      if (!prev || prev.qty !== item.quantity) {
        changed.add(item.productId);
      }
    });

    const newMap = new Map<number, { qty: number }>();
    cart.forEach((item) => {
      newMap.set(item.productId, { qty: item.quantity });
    });
    prevCartMapRef.current = newMap;

    if (changed.size > 0) {
      // Per-product flash keys: only newly-changed products get key bumps,
      // so rows already flashing continue their animation uninterrupted.
      setFlashKeys((prev) => {
        const next = new Map(prev);
        changed.forEach((id) => {
          next.set(id, (prev.get(id) || 0) + 1);
        });
        return next;
      });
      // Union: add new flashing IDs without canceling already-flashing rows
      setFlashingIds((prev) => new Set([...prev, ...changed]));
      const timer = setTimeout(() => setFlashingIds(new Set()), 600);
      return () => clearTimeout(timer);
    }
  }, [cart]);

  const handleRemove = useCallback((index: number) => {
    const item = cart[index];
    if (!item) return;

    // Collect keys for this item and any associated deposit/container
    const keys = new Set([itemKey(index, item)]);
    if (!item.isDeposit) {
      // Also animate out the deposit row and container row if present
      cart.forEach((ci, i) => {
        if (ci.depositFor === index || ci.containerFor === index) {
          keys.add(itemKey(i, ci));
        }
      });
    }

    setRemovingKeys(keys);
    setTimeout(() => {
      setRemovingKeys(new Set());
      removeItem(index);
    }, 100);
  }, [cart, removeItem]);

  const handleRemoveDepositOnly = useCallback((index: number) => {
    const item = cart[index];
    if (!item) return;

    setRemovingKeys(new Set([itemKey(index, item)]));
    setTimeout(() => {
      setRemovingKeys(new Set());
      removeDepositOnly(index);
    }, 100);
  }, [cart, removeDepositOnly]);

  const handleChangeQuantity = useCallback((index: number, delta: number) => {
    const item = cart[index];
    if (!item) return;

    // If decreasing and quantity would hit 0, animate removal
    if (item.quantity + delta <= 0) {
      const keys = new Set([itemKey(index, item)]);
      // Check for associated deposit to animate out too
      cart.forEach((ci, i) => {
        if (ci.depositFor === index) {
          keys.add(itemKey(i, ci));
        }
      });
      setRemovingKeys(keys);
      setTimeout(() => {
        setRemovingKeys(new Set());
        changeQuantity(index, delta);
      }, 100);
    } else {
      changeQuantity(index, delta);
    }
  }, [cart, changeQuantity]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <button
          onClick={onHistory}
          className="text-xs px-2.5 py-1 rounded touch-button text-gray-400 hover:text-white bg-gray-800"
        >
          History
        </button>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`text-xs px-2.5 py-1 rounded touch-button ${
              canUndo ? "text-amber-400 hover:text-amber-300 bg-gray-800" : "text-gray-700 bg-gray-800/50"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <span style={{ fontSize: "15px", lineHeight: 1 }}>⟲</span>
              Undo
            </span>
          </button>
          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className={`text-xs px-2.5 py-1 rounded touch-button ${
              cart.length > 0 ? "text-red-400 hover:text-red-300 bg-gray-800" : "text-gray-700 bg-gray-800/50"
            }`}
          >
            Clear
          </button>
        </div>
      </div>

      <div id="basket-scroll" className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 && (
          <div className="text-gray-600 text-center mt-8">
            Order is empty
          </div>
        )}

        {cart.map((item, index) => {
          const isContainer = item.containerFor !== undefined;
          const isFlashing = flashingIds.has(item.productId);
          const key = itemKey(index, item);
          const isRemoving = removingKeys.has(key);
          const domKey = isFlashing ? `${key}-f${flashKeys.get(item.productId) ?? 0}` : key;
          return (
            <div
              key={domKey}
              className={`mb-1 rounded ${isRemoving ? "basket-row-removing" : isFlashing ? "basket-row-flash" : ""} ${
                isContainer ? "pl-5 border-l-2 border-blue-800" : item.isDeposit ? "pl-3 border-l-2 border-yellow-700" : ""
              }`}
            >
              <div className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {item.isDeposit && (
                    <span className="text-yellow-500 text-xs">♻️</span>
                  )}
                  <span className={`text-sm truncate ${isContainer ? "text-gray-500 text-xs" : item.isDeposit ? "text-gray-500" : ""}`}>
                    {item.productName}
                  </span>
                  {!item.isDeposit && !isContainer && item.volume && (
                    <span className="text-xs text-gray-600">{formatVolume(item.volume)}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {!item.isDeposit && !isContainer && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleChangeQuantity(index, 1)}
                        className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center"
                      >
                        +
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() => handleChangeQuantity(index, -1)}
                        className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center"
                      >
                        −
                      </button>
                    </div>
                  )}

                  <span className={`text-sm font-mono w-14 text-right ${
                    isContainer ? "text-blue-400" : item.isDeposit ? "text-yellow-500" : "text-emerald-400"
                  }`}>
                    {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}€
                  </span>

                  {isContainer ? (
                    <button
                      onClick={() => handleRemove(index)}
                      className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center text-red-400 hover:text-red-300"
                      title="Remove container"
                    >
                      ✕
                    </button>
                  ) : item.isDeposit ? (
                    <button
                      onClick={() => handleRemoveDepositOnly(index)}
                      className="text-yellow-500 hover:text-yellow-400 text-xs touch-button"
                      title="Remove deposit"
                    >
                      ✕
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRemove(index)}
                      className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center text-red-400 hover:text-red-300"
                      title="Remove"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
