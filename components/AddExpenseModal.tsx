import React, { useState, useEffect, useMemo } from "react";
import { Expense, Split, User } from "../types";
import { firestore } from "../services/firebaseService";
import { EXPENSE_CATEGORIES } from "../constants";
import { TrashIcon, UserGroupIcon, CheckCircleIcon } from "./icons";

interface AddExpenseModalProps {
  user: User;
  onClose: () => void;
  onAddExpense: (newExpense: Expense) => void;
}

interface Participant {
  email: string;
  name: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  user,
  onClose,
  onAddExpense,
}) => {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [participants, setParticipants] = useState<Participant[]>([
    { email: user.email, name: user.name || user.email },
  ]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [splitMode, setSplitMode] = useState<"equal" | "manual">("equal");
  const [manualSplits, setManualSplits] = useState<Record<string, string>>({});
  const [splits, setSplits] = useState<Split[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (participantSearch.trim().length > 1) {
        setIsSearching(true);
        const existingEmails = participants.map((p) => p.email);
        const results = await firestore.searchUsersByName(
          participantSearch,
          existingEmails
        );
        setSuggestions(results);
        setIsSearching(false);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [participantSearch, participants]);

  useEffect(() => {
    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0 || participants.length === 0) {
      setSplits([]);
      return;
    }

    if (splitMode === "equal") {
      const amountPerPerson = parseFloat(
        (totalAmount / participants.length).toFixed(2)
      );
      let newSplits = participants.map((p) => ({
        email: p.email,
        amount: amountPerPerson,
      }));

      const totalSplit = newSplits.reduce((sum, s) => sum + s.amount, 0);
      const roundingDiff = totalAmount - totalSplit;
      if (roundingDiff !== 0 && newSplits.length > 0) {
        newSplits[newSplits.length - 1].amount = parseFloat(
          (newSplits[newSplits.length - 1].amount + roundingDiff).toFixed(2)
        );
      }
      setSplits(newSplits);
    } else {
      let newSplits = participants.map((p) => ({
        email: p.email,
        amount: parseFloat(manualSplits[p.email] || "0") || 0,
      }));
      setSplits(newSplits);
    }
    console.log(amount);
  }, [amount, participants, splitMode, manualSplits]);

  const handleAddParticipant = (participant: User) => {
    if (participant.email && participant.name) {
      setParticipants([
        ...participants,
        { email: participant.email, name: participant.name },
      ]);
    }
    setParticipantSearch("");
    setSuggestions([]);
  };

  const handleRemoveParticipant = (email: string) => {
    if (email === user.email) return;
    setParticipants(participants.filter((p) => p.email !== email));
  };

  const handleManualSplitChange = (email: string, value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setManualSplits((prev) => ({ ...prev, [email]: value }));
    }
  };

  const { manualTotal, isManualSplitValid } = useMemo(() => {
    if (splitMode !== "manual")
      return { manualTotal: 0, isManualSplitValid: true };
    const manualTotal = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAmountNum = parseFloat(amount) || 0;
    return {
      manualTotal,
      isManualSplitValid: Math.abs(manualTotal - totalAmountNum) < 0.01,
    };
  }, [splitMode, splits, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (
      !amount ||
      parseFloat(amount) <= 0 ||
      !reason ||
      participants.length === 0
    ) {
      setError("Please fill all required fields.");
      return;
    }
    if (splitMode === "manual" && !isManualSplitValid) {
      setError("The split amounts must add up to the total amount.");
      return;
    }

    setLoading(true);

    try {
      const newExpenseData = {
        amount: parseFloat(amount),
        reason,
        category,
        date: new Date(),
        paidBy: user.email,
        participants: participants.map((p) => p.email),
        splits,
      };
      const addedExpense = await firestore.addExpense(newExpenseData);
      onAddExpense(addedExpense);
      onClose();
    } catch (err) {
      setError("Failed to add expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto transform transition-all sm:scale-100 scale-95">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              New Expense
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-3xl leading-none rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Amount (₹)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white sm:text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-shadow"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Category
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white sm:text-lg transition-shadow"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="reason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Reason
              </label>
              <input
                type="text"
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white sm:text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-shadow"
                placeholder="e.g., Team Lunch"
                required
              />
            </div>

            <div className="relative">
              <label
                htmlFor="participantSearch"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <UserGroupIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                Split with
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  id="participantSearch"
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white sm:text-lg placeholder-gray-400 dark:placeholder-gray-500 transition-shadow"
                  placeholder="Search by username..."
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg
                      className="animate-spin h-5 w-5 text-gray-400"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-600 ring-1 ring-black ring-opacity-5 focus:outline-none">
                  {suggestions.map((s) => (
                    <li
                      key={s.uid}
                      onClick={() => handleAddParticipant(s)}
                      className="px-4 py-3 text-sm text-gray-900 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-600 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium">{s.name}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {s.email}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.email}
                  className="flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primaryjs-100 dark:bg-primaryjs-800 flex items-center justify-center text-primaryjs-600 dark:text-primaryjs-300 font-semibold text-sm">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {p.name}
                        {p.email === user.email && (
                          <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                            (You)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  {p.email !== user.email && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(p.email)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      aria-label={`Remove ${p.name}`}
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {participants.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Split Details
                  </h3>
                  <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full shadow-inner">
                    <button
                      type="button"
                      onClick={() => setSplitMode("equal")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                        splitMode === "equal"
                          ? "bg-white dark:bg-gray-600 shadow-md text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                    >
                      Equal
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode("manual")}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
                        splitMode === "manual"
                          ? "bg-white dark:bg-gray-600 shadow-md text-primary"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800`}
                    >
                      Manual
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {splits.map((s) => (
                    <div
                      key={s.email}
                      className="flex justify-between items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm">
                          {participants
                            .find((p) => p.email === s.email)
                            ?.name.charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {participants.find((p) => p.email === s.email)?.name}
                        </span>
                      </div>
                      {splitMode === "equal" ? (
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                          ₹{s.amount.toFixed(2)}
                        </span>
                      ) : (
                        <div className="flex items-center relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 dark:text-gray-400 sm:text-sm">
                              ₹
                            </span>
                          </div>
                          <input
                            type="text"
                            value={manualSplits[s.email] || ""}
                            onChange={(e) =>
                              handleManualSplitChange(s.email, e.target.value)
                            }
                            className="block w-28 pl-7 pr-3 py-2 text-right bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-gray-900 dark:text-white sm:text-sm transition-shadow"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {splitMode === "manual" && (
                  <div
                    className={`text-right text-sm font-medium mt-2 flex justify-end items-center gap-2 ${
                      isManualSplitValid
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-red-500"
                    }`}
                  >
                    <span>Total:</span>
                    <span
                      className={
                        isManualSplitValid
                          ? "text-gray-900 dark:text-white font-bold"
                          : ""
                      }
                    >
                      ₹{manualTotal.toFixed(2)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">/</span>
                    <span>₹{(parseFloat(amount) || 0).toFixed(2)}</span>
                    {isManualSplitValid && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                <div className="flex">
                  <div className="shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      There were errors with your submission
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading || (splitMode === "manual" && !isManualSplitValid)
                }
                className="flex items-center gap-2 px-6 py-3 text-sm font-medium 
               text-white dark:text-gray-200 
               bg-primary rounded-lg shadow-sm 
               hover:bg-primary-600 
               focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary 
               disabled:bg-gray-400 disabled:cursor-not-allowed 
               transition-colors dark:focus:ring-offset-gray-800"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white dark:text-gray-200"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  <>
                    Add Expense
                    <CheckCircleIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
