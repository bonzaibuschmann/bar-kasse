import { CartItem } from "../types";

interface Props {
  cart: CartItem[];
  total: number;
  removeItem: (index: number) => void;
  removeDepositOnly: (index: number) => void;
  changeQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
}

function formatVolume(v: number | null): string {
  if (!v) return "";
  return v >= 1 ? `${v}L` : `${(v * 1000).toFixed(0)}ml`;
}

export default function Basket({ cart, total, removeItem, removeDepositOnly, changeQuantity, clearCart }: Props) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="font-bold text-yellow-400 text-sm">Cart</span>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-400 hover:text-red-300 touch-button"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 && (
          <div className="text-gray-600 text-center mt-8">
            Cart is empty
          </div>
        )}

        {cart.map((item, index) => (
          <div
            key={`${item.productId}-${item.depositFor}-${index}`}
            className={`mb-1 ${
              item.isDeposit ? "pl-3 border-l-2 border-yellow-700" : ""
            }`}
          >
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.isDeposit && (
                  <span className="text-yellow-500 text-xs">♻️</span>
                )}
                <span className={`text-sm truncate ${item.isDeposit ? "text-gray-500" : ""}`}>
                  {item.productName}
                </span>
                {!item.isDeposit && item.volume && (
                  <span className="text-xs text-gray-600">{formatVolume(item.volume)}</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.isDeposit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQuantity(index, -1)}
                      className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                    <button
                      onClick={() => changeQuantity(index, 1)}
                      className="w-6 h-6 bg-gray-800 rounded text-xs touch-button flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}

                <span className={`text-sm font-mono w-14 text-right ${
                  item.isDeposit ? "text-yellow-500" : "text-emerald-400"
                }`}>
                  {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}€
                </span>

                {item.isDeposit ? (
                  <button
                    onClick={() => removeDepositOnly(index)}
                    className="text-yellow-500 hover:text-yellow-400 text-xs touch-button"
                    title="Remove deposit"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300 text-xs touch-button"
                    title="Remove"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="px-3 py-3 border-t border-gray-800">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-sm">Total:</span>
          <span className="text-2xl font-bold text-emerald-400">
            {total.toFixed(2).replace(".", ",")} €
          </span>
        </div>
      </div>
    </div>
  );
}
