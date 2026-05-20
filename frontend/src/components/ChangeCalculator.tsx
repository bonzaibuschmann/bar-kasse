import { useState } from "react";

interface Props {
  total: number;
  onConfirm: (cashGiven: number) => void;
  onCancel: () => void;
}

export default function ChangeCalculator({ total, onConfirm, onCancel }: Props) {
  const [cashInput, setCashInput] = useState("");
  const [useQuickCash, setUseQuickCash] = useState(false);

  const cashGiven = cashInput ? parseFloat(cashInput) : 0;
  const change = cashGiven - total;
  const isPositive = change >= 0;

  // Quick cash buttons (common Euro denominations)
  const quickAmounts = [1, 2, 5, 10, 20, 50, 100];

  function handleQuickCash(amount: number) {
    const needed = Math.ceil(total);
    const rounded = Math.max(amount, needed);
    setCashInput(rounded.toString());
    setUseQuickCash(true);
  }

  function handleExactCash() {
    setCashInput(total.toFixed(2));
    setUseQuickCash(true);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 no-select">
      <div className="bg-bar-mid rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-center mb-4 text-bar-gold">
          Kassieren
        </h2>

        <div className="text-center mb-4">
          <div className="text-gray-400 text-sm">Zu zahlen</div>
          <div className="text-4xl font-bold text-white">
            {total.toFixed(2).replace(".", ",")} €
          </div>
        </div>

        {/* Quick cash buttons */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Schnellbetrag:</div>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickCash(amount)}
                className="py-2 bg-bar-dark border border-gray-600 rounded-lg text-sm font-bold touch-button hover:bg-gray-700"
              >
                {amount}€
              </button>
            ))}
            <button
              onClick={handleExactCash}
              className="py-2 bg-bar-green text-bar-dark rounded-lg text-sm font-bold touch-button"
            >
              Passend
            </button>
          </div>
        </div>

        {/* Manual input */}
        <div className="mb-4">
          <div className="text-sm text-gray-400 mb-2">Gegeben vom Kunden:</div>
          <input
            type="number"
            step="0.01"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            placeholder="0,00"
            className="w-full px-4 py-3 bg-bar-dark border border-gray-600 rounded-lg text-white text-2xl text-center font-mono"
            autoFocus
          />
        </div>

        {/* Change display */}
        {cashInput && isPositive && (
          <div className="text-center mb-4 p-3 bg-green-900/30 rounded-xl border border-green-700">
            <div className="text-sm text-green-300">Rückgeld</div>
            <div className="text-3xl font-bold text-bar-green">
              {change.toFixed(2).replace(".", ",")} €
            </div>
          </div>
        )}

        {cashInput && !isPositive && (
          <div className="text-center mb-4 p-3 bg-red-900/30 rounded-xl border border-red-700">
            <div className="text-sm text-red-300">Es fehlen noch</div>
            <div className="text-3xl font-bold text-red-400">
              {Math.abs(change).toFixed(2).replace(".", ",")} €
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-700 rounded-xl font-bold text-lg touch-button"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onConfirm(cashGiven || total)}
            disabled={!cashInput || !isPositive}
            className="flex-1 py-3 bg-bar-green text-bar-dark rounded-xl font-bold text-lg touch-button disabled:opacity-30"
          >
            ✓ Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
