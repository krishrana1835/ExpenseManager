import React, { useState, useEffect } from 'react';
import { X, Wallet, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Monitor } from 'lucide-react';

// --- Types ---
// Defining simple types for our data
const FriendBalance = {
  id: '',
  name: '',
  balance: 0, // positive = they owe you, negative = you owe them
  avatar: ''
};

// --- Theme Hook ---
// This hook automatically syncs the app theme with the OS system preference
const useSystemTheme = () => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // Check initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      // Apply to document element for Tailwind 'dark:' classes to work effectively
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    // Set initial state
    handleChange(mediaQuery);

    // Listen for changes (e.g., user toggles OS dark mode while on page)
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return theme;
};

// --- Settle Debt Modal Component ---
// This is the enhanced version of the user's requested component
const SettleDebtModal = ({ isOpen, onClose, friend, mode, onSettle }) => {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setError('');
      setIsAnimating(true);
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  if (!isOpen && !isAnimating) return null;

  const totalDebt = Math.abs(friend.balance);
  const isPay = mode === 'pay'; // You pay friend
  
  // Dynamic Text
  const title = isPay ? `Pay ${friend.name}` : `Receive from ${friend.name}`;
  const subtitle = isPay 
    ? `You owe a total of ₹${totalDebt.toFixed(2)}` 
    : `${friend.name} owes you ₹${totalDebt.toFixed(2)}`;

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow digits and one decimal point with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      const numValue = parseFloat(value);
      
      if (numValue > totalDebt) {
        setError(`Amount cannot exceed ₹${totalDebt.toFixed(2)}`);
      } else {
        setError('');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const settlementAmount = parseFloat(amount);
    
    if (isNaN(settlementAmount) || settlementAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    
    // Floating point tolerance
    if (settlementAmount > totalDebt + 0.001) { 
      setError(`Amount cannot exceed ₹${totalDebt.toFixed(2)}`);
      return;
    }
    
    onSettle(settlementAmount);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="modal-title" 
      role="dialog" 
      aria-modal="true"
    >
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`
        relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden 
        transform transition-all duration-300 ease-out border border-gray-100 dark:border-slate-700
        ${isOpen ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}
      `}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center ${isPay ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-full ${isPay ? 'bg-rose-100 text-rose-600 dark:bg-rose-800 dark:text-rose-200' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200'}`}>
               {isPay ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
             </div>
             <h2 id="modal-title" className="text-lg font-bold text-gray-900 dark:text-white">
               {title}
             </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200 transition-colors rounded-full p-1 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 flex items-center gap-2">
            <AlertCircle size={16} />
            {subtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 mb-2">
                Settlement Amount
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-gray-500 dark:text-slate-400 sm:text-lg">₹</span>
                </div>
                <input
                  type="text" // using text for better control over regex validation
                  inputMode="decimal"
                  value={amount}
                  onChange={handleAmountChange}
                  className="block w-full rounded-xl border-gray-200 dark:border-slate-600 pl-8 pr-12 py-3 
                    bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white placeholder-gray-400 
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20
                    transition-all text-xl font-semibold"
                  placeholder="0.00"
                  autoFocus
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 dark:text-slate-500 text-sm">INR</span>
                </div>
              </div>
              {error && (
                <p className="mt-2 text-sm text-rose-600 dark:text-rose-400 flex items-center animate-pulse">
                  <AlertCircle size={14} className="mr-1" /> {error}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!!error || !amount}
                className={`
                  flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg shadow-md
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                  disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95
                  ${isPay 
                    ? 'bg-rose-600 hover:bg-rose-700 dark:bg-rose-600 dark:hover:bg-rose-500' 
                    : 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500'
                  }
                `}
              >
                <CheckCircle2 size={16} />
                {isPay ? 'Confirm Payment' : 'Confirm Receipt'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Main Application Component ---
const App = () => {
  // Using the hook to ensure system theme is respected
  const currentTheme = useSystemTheme();

  // Mock Data
  const [friends, setFriends] = useState([
    { id: '1', name: 'Alice Freeman', balance: -1250.50, avatar: 'AF' }, // You owe Alice
    { id: '2', name: 'Bob Smith', balance: 500.00, avatar: 'BS' },    // Bob owes you
    { id: '3', name: 'Charlie Day', balance: -50.00, avatar: 'CD' },   // You owe Charlie
    { id: '4', name: 'Diana Prince', balance: 2100.75, avatar: 'DP' }, // Diana owes you
  ]);

  const [modalState, setModalState] = useState({
    isOpen: false,
    friend: null,
    mode: 'pay' // 'pay' or 'receive'
  });

  const openSettleModal = (friend) => {
    // Determine mode based on balance
    // If balance is negative, YOU owe THEM -> Mode: Pay
    // If balance is positive, THEY owe YOU -> Mode: Receive
    const mode = friend.balance < 0 ? 'pay' : 'receive';
    setModalState({
      isOpen: true,
      friend,
      mode
    });
  };

  const handleSettle = (amount) => {
    if (!modalState.friend) return;

    const updatedFriends = friends.map(f => {
      if (f.id === modalState.friend.id) {
        // If we are paying (balance was negative), we add the amount (bringing it closer to 0)
        // If we are receiving (balance was positive), we subtract the amount (bringing it closer to 0)
        const newBalance = modalState.mode === 'pay' 
          ? f.balance + amount 
          : f.balance - amount;
          
        // If new balance is extremely close to 0, just make it 0 to avoid -0.00
        return { ...f, balance: Math.abs(newBalance) < 0.01 ? 0 : newBalance };
      }
      return f;
    });

    setFriends(updatedFriends);
    setModalState({ ...modalState, isOpen: false });
  };

  const totalOwedToYou = friends.reduce((acc, curr) => curr.balance > 0 ? acc + curr.balance : acc, 0);
  const totalYouOwe = friends.reduce((acc, curr) => curr.balance < 0 ? acc + Math.abs(curr.balance) : acc, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        
        {/* Header Area */}
        <div className="mb-10 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 flex items-center gap-3">
              <Wallet className="text-indigo-600 dark:text-indigo-400" size={32} />
              SplitMoney
            </h1>
            <p className="text-gray-500 dark:text-slate-400">Manage debts and settle up easily.</p>
          </div>
          
          {/* System Theme Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-slate-800 text-xs font-medium text-gray-600 dark:text-slate-400">
            <Monitor size={14} />
            <span>System Theme: {currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</span>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50">
            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1 uppercase tracking-wide">You are owed</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">₹{totalOwedToYou.toFixed(2)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50">
            <div className="text-sm font-medium text-rose-600 dark:text-rose-400 mb-1 uppercase tracking-wide">You owe</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">₹{totalYouOwe.toFixed(2)}</div>
          </div>
        </div>

        {/* Friend List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white">Friends & Balances</h3>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {friends.map((friend) => {
              const isOwed = friend.balance > 0;
              const isDebt = friend.balance < 0;
              const isSettled = friend.balance === 0;

              return (
                <div key={friend.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-lg">
                      {friend.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white text-lg">{friend.name}</h4>
                      <div className="text-sm">
                        {isSettled && <span className="text-gray-400 dark:text-slate-500">All settled up</span>}
                        {isOwed && <span className="text-emerald-600 dark:text-emerald-400">owes you ₹{Math.abs(friend.balance).toFixed(2)}</span>}
                        {isDebt && <span className="text-rose-600 dark:text-rose-400">you owe ₹{Math.abs(friend.balance).toFixed(2)}</span>}
                      </div>
                    </div>
                  </div>

                  {!isSettled && (
                    <button
                      onClick={() => openSettleModal(friend)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-all"
                    >
                      Settle
                    </button>
                  )}
                  {isSettled && (
                     <div className="text-gray-300 dark:text-slate-600">
                       <CheckCircle2 size={24} />
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Render the Modal */}
      {modalState.friend && (
        <SettleDebtModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState({ ...modalState, isOpen: false })}
          friend={modalState.friend}
          mode={modalState.mode}
          onSettle={handleSettle}
        />
      )}
    </div>
  );
};

export default App;