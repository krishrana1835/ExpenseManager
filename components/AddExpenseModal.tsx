import React, { useState, useEffect, useMemo } from 'react';
import { Expense, Split, User } from '../types';
import { firestore } from '../services/firebaseService';
import { EXPENSE_CATEGORIES } from '../constants';
import { TrashIcon, UserGroupIcon, CheckCircleIcon } from './icons';

interface AddExpenseModalProps {
  user: User;
  onClose: () => void;
  onAddExpense: (newExpense: Expense) => void;
}

interface Participant {
  email: string;
  name: string;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ user, onClose, onAddExpense }) => {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [participants, setParticipants] = useState<Participant[]>([{ email: user.email, name: user.name || user.email }]);
  const [participantSearch, setParticipantSearch] = useState('');
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [splitMode, setSplitMode] = useState<'equal' | 'manual'>('equal');
  const [manualSplits, setManualSplits] = useState<Record<string, string>>({});
  const [splits, setSplits] = useState<Split[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (participantSearch.trim().length > 1) {
        setIsSearching(true);
        const existingEmails = participants.map(p => p.email);
        const results = await firestore.searchUsersByName(participantSearch, existingEmails);
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

    if (splitMode === 'equal') {
      const amountPerPerson = parseFloat((totalAmount / participants.length).toFixed(2));
      let newSplits = participants.map(p => ({ email: p.email, amount: amountPerPerson }));
      
      const totalSplit = newSplits.reduce((sum, s) => sum + s.amount, 0);
      const roundingDiff = totalAmount - totalSplit;
      if (roundingDiff !== 0 && newSplits.length > 0) {
        newSplits[newSplits.length-1].amount = parseFloat((newSplits[newSplits.length-1].amount + roundingDiff).toFixed(2));
      }
      setSplits(newSplits);
    } else {
      let newSplits = participants.map(p => ({
        email: p.email,
        amount: parseFloat(manualSplits[p.email] || '0') || 0
      }));
      setSplits(newSplits);
    }
  }, [amount, participants, splitMode, manualSplits]);


  const handleAddParticipant = (participant: User) => {
    if (participant.email && participant.name) {
      setParticipants([...participants, { email: participant.email, name: participant.name }]);
    }
    setParticipantSearch('');
    setSuggestions([]);
  };

  const handleRemoveParticipant = (email: string) => {
    if (email === user.email) return;
    setParticipants(participants.filter(p => p.email !== email));
  };

  const handleManualSplitChange = (email: string, value: string) => {
    if (/^\d*\.?\d{0,2}$/.test(value)) {
        setManualSplits(prev => ({...prev, [email]: value}));
    }
  };

  const { manualTotal, isManualSplitValid } = useMemo(() => {
    if (splitMode !== 'manual') return { manualTotal: 0, isManualSplitValid: true };
    const manualTotal = splits.reduce((sum, s) => sum + (s.amount || 0), 0);
    const totalAmountNum = parseFloat(amount) || 0;
    return {
      manualTotal,
      isManualSplitValid: Math.abs(manualTotal - totalAmountNum) < 0.01
    };
  }, [splitMode, splits, amount]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!amount || parseFloat(amount) <= 0 || !reason || participants.length === 0) {
      setError('Please fill all required fields.');
      return;
    }
    if (splitMode === 'manual' && !isManualSplitValid) {
      setError('The split amounts must add up to the total amount.');
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
        participants: participants.map(p => p.email),
        splits,
      };
      const addedExpense = await firestore.addExpense(newExpenseData);
      onAddExpense(addedExpense);
      onClose();
    } catch (err) {
      setError('Failed to add expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Expense</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-3xl leading-none">&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white" placeholder="0.00" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white">
                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white" placeholder="e.g., Team Lunch" required />
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Split with</label>
              <input type="text" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white" placeholder="Search by username..." />
              {isSearching && <div className="p-2 text-sm text-gray-500">Searching...</div>}
              {suggestions.length > 0 && (
                <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {suggestions.map(s => (
                        <li key={s.uid} onClick={() => handleAddParticipant(s)} className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-600 cursor-pointer">
                            {s.name} <span className="text-gray-400">({s.email})</span>
                        </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
                {participants.map(p => (
                    <div key={p.email} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{p.name} {p.email === user.email && <span className="text-xs font-normal text-gray-500">(You)</span>}</span>
                        {p.email !== user.email && (
                            <button type="button" onClick={() => handleRemoveParticipant(p.email)} className="text-red-500 hover:text-red-700">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {participants.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Split Details</h3>
                        <div className="flex items-center p-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <button type="button" onClick={() => setSplitMode('equal')} className={`px-3 py-1 text-sm rounded-full ${splitMode === 'equal' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}>Equal</button>
                            <button type="button" onClick={() => setSplitMode('manual')} className={`px-3 py-1 text-sm rounded-full ${splitMode === 'manual' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}>Manual</button>
                        </div>
                    </div>

                    {splits.map(s => (
                        <div key={s.email} className="flex justify-between items-center gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{participants.find(p=>p.email === s.email)?.name}</span>
                            {splitMode === 'equal' ? (
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-100">₹{s.amount.toFixed(2)}</span>
                            ) : (
                                <div className="flex items-center">
                                    <span className="text-gray-500 mr-1">₹</span>
                                    <input type="text" value={manualSplits[s.email] || ''} onChange={(e) => handleManualSplitChange(s.email, e.target.value)} className="w-24 text-right px-2 py-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md text-gray-900 dark:text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {splitMode === 'manual' && (
                        <div className={`text-right text-sm font-medium mt-2 ${isManualSplitValid ? 'text-gray-500' : 'text-red-500'}`}>
                            Total: ₹{manualTotal.toFixed(2)} / ₹{(parseFloat(amount) || 0).toFixed(2)}
                        </div>
                    )}
                </div>
            )}
            
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            
            <div className="flex justify-end space-x-4 pt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500">Cancel</button>
              <button type="submit" disabled={loading || (splitMode === 'manual' && !isManualSplitValid)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
                {loading ? 'Adding...' : 'Add Expense'}
                {!loading && <CheckCircleIcon className="w-5 h-5" />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;
