
import React, { useMemo, useState } from 'react';
import { Expense, User, FriendBalance } from '../types';
import { firestore } from '../services/firebaseService';
import SettleDebtModal from './SettleDebtModal';

interface DebtItemProps {
    friend: FriendBalance;
    onSelect: (f: FriendBalance) => void;
    onSettle: (f: FriendBalance) => void;
    settlingEmail: string | null;
}

const DebtItem: React.FC<DebtItemProps> = ({ friend, onSelect, onSettle, settlingEmail }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex justify-between items-center">
        <div onClick={() => onSelect(friend)} className="flex-1 cursor-pointer">
            <p className="font-semibold text-gray-800 dark:text-white">{friend.name}</p>
            <p className={`text-sm ${friend.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {friend.balance > 0 ? "Owes you" : "You owe"}
            </p>
        </div>
        <div className="flex items-center gap-4">
            <p className={`font-bold text-lg ${friend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(friend.balance))}
            </p>
            {friend.balance < 0 && (
                <button
                    onClick={() => onSettle(friend)}
                    disabled={settlingEmail === friend.email}
                    className="px-3 py-1 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-600 disabled:bg-gray-400"
                >
                    {settlingEmail === friend.email ? 'Paying...' : 'Pay Debt'}
                </button>
            )}
            {friend.balance > 0 && (
                <button
                    onClick={() => onSettle(friend)}
                    disabled={settlingEmail === friend.email}
                    className="px-3 py-1 text-sm font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 disabled:bg-gray-400"
                >
                    {settlingEmail === friend.email ? 'Recording...' : 'Receive Payment'}
                </button>
            )}
        </div>
    </div>
);


const Debts = ({ expenses, user, nameMap, onAddExpense }: { expenses: Expense[]; user: User; nameMap: Map<string, string>; onAddExpense: (expense: Expense) => void; }) => {
    const [selectedFriend, setSelectedFriend] = useState<FriendBalance | null>(null);
    const [settling, setSettling] = useState<string | null>(null);
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [settlementFriend, setSettlementFriend] = useState<FriendBalance | null>(null);
    const [debtView, setDebtView] = useState<'owe' | 'owed'>('owe');

    const { peopleUserOwes, peopleWhoOweUser } = useMemo(() => {
        const balances: { [email: string]: number } = {};

        expenses.forEach(expense => {
            if (expense.paidBy === user.email) {
                expense.splits.forEach(split => {
                    if (split.email !== user.email) {
                        balances[split.email] = (balances[split.email] || 0) + split.amount;
                    }
                });
            } 
            else if (expense.participants.includes(user.email)) {
                const userSplit = expense.splits.find(s => s.email === user.email);
                if (userSplit) {
                    balances[expense.paidBy] = (balances[expense.paidBy] || 0) - userSplit.amount;
                }
            }
        });
        
        const allBalances = Object.entries(balances)
            .map(([email, balance]) => ({ 
                email, 
                balance, 
                name: nameMap.get(email) || email.split('@')[0] 
            }))
            .filter(b => Math.abs(b.balance) > 0.01);

        const peopleUserOwes = allBalances.filter(f => f.balance < 0).sort((a,b) => a.balance - b.balance);
        const peopleWhoOweUser = allBalances.filter(f => f.balance > 0).sort((a,b) => b.balance - a.balance);

        return { peopleUserOwes, peopleWhoOweUser };
    }, [expenses, user.email, nameMap]);


    const handleOpenSettleModal = (friend: FriendBalance) => {
        setSettlementFriend(friend);
        setIsSettleModalOpen(true);
    };

    const handleSettleDebt = async (settlementAmount: number) => {
        if (!settlementFriend) return;

        const { name, email, balance } = settlementFriend;
        const mode = balance < 0 ? 'pay' : 'receive';

        setSettling(email);

        const settlementExpenseData = {
            amount: settlementAmount,
            reason: mode === 'pay' ? `Settlement to ${name}` : `Settlement from ${name}`,
            category: 'Settlement' as const,
            date: new Date(),
            paidBy: mode === 'pay' ? user.email : email,
            participants: [user.email, email],
            splits: mode === 'pay' 
                ? [{ email: email, amount: settlementAmount }, { email: user.email, amount: 0 }]
                : [{ email: user.email, amount: settlementAmount }, { email: email, amount: 0 }]
        };

        try {
            const newExpense = await firestore.addExpense(settlementExpenseData);
            onAddExpense(newExpense);
        } catch (error) {
            console.error("Failed to settle debt:", error);
        } finally {
            setSettling(null);
            setIsSettleModalOpen(false);
            setSettlementFriend(null);
            setSelectedFriend(null);
        }
    };

    const selectedFriendTransactions = useMemo(() => {
        if (!selectedFriend) return [];
        return expenses.filter(exp => 
            exp.participants.includes(selectedFriend.email) && exp.participants.includes(user.email) &&
            (exp.paidBy === selectedFriend.email || exp.paidBy === user.email)
        ).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [expenses, selectedFriend, user.email]);

    return (
        <>
            <div className="p-4 md:p-6 space-y-4">
                {selectedFriend ? (
                     <div>
                        <button onClick={() => setSelectedFriend(null)} className="text-primary hover:underline mb-4">&larr; Back to Debts</button>
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedFriend.name}</h1>
                                <p className={`font-semibold ${selectedFriend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {selectedFriend.balance > 0 ? `Owes you ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(selectedFriend.balance)}` : `You owe ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(selectedFriend.balance))}`}
                                </p>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-6 mb-2">Transaction History</h3>
                        <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl shadow-md">
                            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {selectedFriendTransactions.length > 0 ? selectedFriendTransactions.map(exp => (
                                <div key={exp.id} className="p-4">
                                    <p className="font-semibold text-gray-800 dark:text-white">{exp.reason}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{exp.date.toLocaleDateString()}</p>
                                    <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                                        {(() => {
                                            const userShare = exp.splits.find(s => s.email === user.email)?.amount || 0;
                                            const friendShare = exp.splits.find(s => s.email === selectedFriend.email)?.amount || 0;
                                            const total = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(exp.amount);
                                            
                                            if (exp.category === 'Settlement') {
                                                if (exp.paidBy === user.email) {
                                                    return `You paid back ${total}.`;
                                                }
                                                return `${selectedFriend.name} paid you back ${total}.`;
                                            }

                                            if (exp.paidBy === user.email) {
                                                return `You paid ${total}. Their share was ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(friendShare)}.`;
                                            }

                                            return `${selectedFriend.name} paid ${total}. Your share was ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(userShare)}.`;
                                        })()}
                                    </p>
                                </div>
                            )) : (
                                <p className="p-8 text-center text-gray-500 dark:text-gray-400">No transactions with {selectedFriend.name}.</p>
                            )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Debts</h1>
                        
                        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                            <button
                                onClick={() => setDebtView('owe')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    debtView === 'owe'
                                        ? 'border-b-2 border-primary text-primary'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                You Owe ({peopleUserOwes.length})
                            </button>
                            <button
                                onClick={() => setDebtView('owed')}
                                className={`px-4 py-2 text-sm font-medium transition-colors ${
                                    debtView === 'owed'
                                        ? 'border-b-2 border-primary text-primary'
                                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                }`}
                            >
                                You Are Owed ({peopleWhoOweUser.length})
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {debtView === 'owe' && (
                                <>
                                    {peopleUserOwes.length > 0 ? peopleUserOwes.map(friend => (
                                        <DebtItem key={friend.email} friend={friend} onSelect={setSelectedFriend} onSettle={handleOpenSettleModal} settlingEmail={settling} />
                                    )) : (
                                        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg">
                                            <p className="text-gray-500 dark:text-gray-400">You don't owe anyone. Great job!</p>
                                        </div>
                                    )}
                                </>
                            )}
                             {debtView === 'owed' && (
                                <>
                                     {peopleWhoOweUser.length > 0 ? peopleWhoOweUser.map(friend => (
                                        <DebtItem key={friend.email} friend={friend} onSelect={setSelectedFriend} onSettle={handleOpenSettleModal} settlingEmail={settling} />
                                    )) : (
                                        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg">
                                            <p className="text-gray-500 dark:text-gray-400">No one owes you money right now.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {isSettleModalOpen && settlementFriend && (
                <SettleDebtModal
                    isOpen={isSettleModalOpen}
                    onClose={() => setIsSettleModalOpen(false)}
                    friend={settlementFriend}
                    mode={settlementFriend.balance < 0 ? 'pay' : 'receive'}
                    onSettle={handleSettleDebt}
                />
            )}
        </>
    );
};

export default Debts;
