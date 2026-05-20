import { CartItem } from "../types";

interface Props {
  cart: CartItem[];
  total: number;
  removeItem: (index: number) => void;
  removeDepositOnly: (index: number) => void;
  changeQuantity: (index: number, delta: number) => void;
  clearCart: () => void;
}

export default function Basket({ cart, total, removeItem, removeDepositOnly, changeQuantity, clearCart }: Props) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <span className="font-bold text-bar-gold">Warenkorb</span>
        {cart.length > 0 && (
          <button
            onClick={clearCart}
            className="text-xs text-red-400 hover:text-red-300 touch-button"
          >
            Alles löschen
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {cart.length === 0 && (
          <div className="text-gray-500 text-center mt-8">
            Noch keine Artikel...
          </div>
        )}

        {cart.map((item, index) => (
          <div
            key={`${item.productId}-${item.depositFor}-${index}`}
            className={`mb-1 ${
              item.isDeposit ? "pl-4 border-l-2 border-yellow-600" : ""
            }`}
          >
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {item.isDeposit && (
                  <span className="text-yellow-400 text-xs">♻️</span>
                )}
                <span className={`text-sm truncate ${item.isDeposit ? "text-gray-400" : ""}`}>
                  {item.productName}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.isDeposit && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQuantity(index, -1)}
                      className="w-7 h-7 bg-gray-700 rounded text-sm touch-button flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => changeQuantity(index, 1)}
                      className="w-7 h-7 bg-gray-700 rounded text-sm touch-button flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                )}

                <span className={`text-sm font-mono w-16 text-right ${
                  item.isDeposit ? "text-yellow-400" : "text-bar-green"
                }`}>
                  {(item.unitPrice * item.quantity).toFixed(2).replace(".", ",")}€
                </span>

                {item.isDeposit ? (
                  <button
                    onClick={() => removeDepositOnly(index)}
                    className="text-yellow-400 hover:text-yellow-300 text-sm touch-button"
                    title="Pfand entfernen"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-400 hover:text-red-300 text-sm touch-button"
                    title="Entfernen"
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
      <div className="px-3 py-3 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Summe:</span>
          <span className="text-2xl font-bold text-bar-green">
            {total.toFixed(2).replace(".", ",")} €
          </span>
        </div>
      </div>
    </div>
  );
}
