import React, { useState, useEffect } from "react";
import { FriendBalance } from "../types";

interface SettleDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: FriendBalance;
  mode: "pay" | "receive";
  onSettle: (amount: number) => void;
}

const SettleDebtModal: React.FC<SettleDebtModalProps> = ({
  isOpen,
  onClose,
  friend,
  mode,
  onSettle,
}) => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalDebt = Math.abs(friend.balance);
  const title =
    mode === "pay" ? `Pay ${friend.name}` : `Receive from ${friend.name}`;
  const promptText =
    mode === "pay"
      ? `You owe a total of ₹${totalDebt.toFixed(2)}`
      : `${friend.name} owes you a total of ₹${totalDebt.toFixed(2)}`;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      const numValue = parseFloat(value);
      if (numValue > totalDebt) {
        setError(`Amount cannot exceed ₹${totalDebt.toFixed(2)}`);
      } else {
        setError("");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const settlementAmount = parseFloat(amount);
    if (isNaN(settlementAmount) || settlementAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (settlementAmount > totalDebt + 0.001) {
      // Add tolerance for float issues
      setError(`Amount cannot exceed ₹${totalDebt.toFixed(2)}`);
      return;
    }
    setError("");
    onSettle(settlementAmount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-3xl leading-none"
            >
              &times;
            </button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {promptText}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Amount to Settle (₹)
              </label>

              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
                placeholder="0.00"
                autoFocus
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!!error || !amount}
                className="px-4 py-2 text-sm font-medium 
                       text-gray-700 dark:text-gray-200
                       bg-primary rounded-md outline-1
                       hover:bg-primary-600
                       disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {mode === "pay" ? "Pay Amount" : "Receive Amount"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettleDebtModal;
