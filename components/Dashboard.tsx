
import React from 'react';
import { Expense, User, FriendBalance } from '../types';

interface SummaryCardProps {
    title: string;
    amount: number;
    color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, color }) => (
    <div className={`p-6 rounded-xl shadow-md ${color}`}>
        <h3 className="text-lg font-semibold text-white opacity-90">{title}</h3>
        <p className="text-4xl font-bold text-white mt-2">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)}
        </p>
    </div>
);

const Dashboard = ({ expenses, user, nameMap }: { expenses: Expense[], user: User, nameMap: Map<string, string> }) => {
    
    const calculateBalances = () => {
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

        const allBalances: FriendBalance[] = Object.entries(balances)
            .map(([email, balance]) => ({
                email,
                balance,
                name: nameMap.get(email) || email.split('@')[0],
            }))
            .filter(b => Math.abs(b.balance) > 0.01)
            .sort((a,b) => b.balance - a.balance);

        let totalOwedToUser = 0;
        let totalUserOwes = 0;

        allBalances.forEach(friend => {
            if (friend.balance > 0) {
                totalOwedToUser += friend.balance;
            } else {
                totalUserOwes += Math.abs(friend.balance);
            }
        });

        return { totalOwedToUser, totalUserOwes, allBalances };
    };
    
    const { totalOwedToUser, totalUserOwes, allBalances } = calculateBalances();

    const currentMonthExpenses = expenses.filter(exp => {
        const today = new Date();
        return exp.date.getMonth() === today.getMonth() && exp.date.getFullYear() === today.getFullYear();
    });

    const totalSpentThisMonth = currentMonthExpenses.reduce((sum, exp) => {
        const userSplitAmount = exp.splits.find(s => s.email === user.email)?.amount || 0;

        if (exp.category === 'Settlement' && exp.paidBy !== user.email) {
            return sum - userSplitAmount;
        }

        return sum + userSplitAmount;
    }, 0);


    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome back, {user.name}!</h1>
                <p className="text-gray-500 dark:text-gray-400">Here's your financial summary.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="You Owe" amount={totalUserOwes} color="bg-rose-500" />
                <SummaryCard title="You are Owed" amount={totalOwedToUser} color="bg-emerald-500" />
                <SummaryCard title="Spent this Month" amount={totalSpentThisMonth} color="bg-sky-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Recent Transactions</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                       <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {expenses.slice(0, 5).map(exp => {
                                const userSplitAmount = exp.splits.find(s => s.email === user.email)?.amount || 0;
                                const isDebit = (exp.paidBy !== user.email && userSplitAmount > 0 && exp.category !== 'Settlement') || (exp.paidBy === user.email && exp.category === 'Settlement');
                                const isCredit = exp.paidBy !== user.email && exp.category === 'Settlement';
                                const displayAmount = exp.category === 'Settlement' && exp.paidBy === user.email
                                    ? exp.amount
                                    : userSplitAmount;

                                return (
                                    <div key={exp.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">{exp.reason}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{exp.category} &middot; {exp.date.toLocaleDateString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold ${isCredit ? 'text-emerald-500' : isDebit ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {isDebit ? '-' : isCredit ? '+' : ''}
                                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(displayAmount)}
                                            </p>
                                            <p className="text-xs text-gray-400">Paid by {exp.paidBy === user.email ? 'you' : nameMap.get(exp.paidBy) || exp.paidBy.split('@')[0]}</p>
                                        </div>
                                    </div>
                                );
                            })}
                       </div>
                    </div>
                </div>
                 <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Your Balances</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                             {allBalances.length > 0 ? allBalances.slice(0, 5).map(friend => (
                                <div key={friend.email} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-white">{friend.name}</p>
                                        <p className={`text-sm ${friend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {friend.balance > 0 ? 'Owes you' : 'You owe'}
                                        </p>
                                    </div>
                                    <p className={`font-bold text-lg ${friend.balance > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Math.abs(friend.balance))}
                                    </p>
                                </div>
                            )) : (
                                <p className="p-6 text-center text-gray-500 dark:text-gray-400">All settled up!</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;