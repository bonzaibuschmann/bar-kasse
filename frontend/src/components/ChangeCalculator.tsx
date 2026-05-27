import { useState } from "react";
import Modal from "./Modal";

interface Props {
  total: number;
  onConfirm: (cashGiven: number) => void;
  onCancel: () => void;
}

export default function ChangeCalculator({ total, onConfirm, onCancel }: Props) {
  const [cashInput, setCashInput] = useState("");

  const cashGiven = cashInput ? parseFloat(cashInput) : 0;
  const change = cashGiven - total;
  const isPositive = change >= 0;

  const quickAmounts = [1, 2, 5, 10, 20, 50, 100];

  function handleQuickCash(amount: number) {
    const needed = Math.ceil(total);
    const rounded = Math.max(amount, needed);
    setCashInput(rounded.toString());
  }

  function handleExactCash() {
    setCashInput(total.toFixed(2));
  }

  return (
    <Modal onClose={onCancel}>
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h2 className="text-lg font-bold text-center mb-2 text-yellow-400">
          Checkout
        </h2>

        <div className="text-center mb-4">
          <div className="text-gray-500 text-sm">Amount due</div>
          <div className="text-4xl font-bold text-white">
            {total.toFixed(2).replace(".", ",")} €
          </div>
        </div>

        {/* Quick cash buttons */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">Quick amount:</div>
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickCash(amount)}
                className="py-2 bg-black border border-gray-700 rounded-lg text-sm font-bold touch-button hover:bg-gray-900"
              >
                {amount}€
              </button>
            ))}
            <button
              onClick={handleExactCash}
              className="py-2 bg-emerald-700 text-white rounded-lg text-sm font-bold touch-button"
            >
              Exact
            </button>
          </div>
        </div>

        {/* Manual input */}
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">Cash received:</div>
          <input
            type="number"
            step="0.01"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white text-2xl text-center font-mono"
            autoFocus
          />
        </div>

        {/* Change display */}
        {cashInput && isPositive && (
          <div className="text-center mb-4 p-3 bg-emerald-900/30 rounded-xl border border-emerald-800">
            <div className="text-sm text-emerald-400">Change</div>
            <div className="text-3xl font-bold text-emerald-400">
              {change.toFixed(2).replace(".", ",")} €
            </div>
          </div>
        )}

        {cashInput && !isPositive && (
          <div className="text-center mb-4 p-3 bg-red-900/30 rounded-xl border border-red-800">
            <div className="text-sm text-red-400">Still missing</div>
            <div className="text-3xl font-bold text-red-400">
              {Math.abs(change).toFixed(2).replace(".", ",")} €
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-800 rounded-xl font-bold text-lg touch-button"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(cashGiven || total)}
            disabled={!cashInput || !isPositive}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg touch-button disabled:opacity-30"
          >
            ✓ Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
