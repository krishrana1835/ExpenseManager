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

const Dashboard = ({
    expenses,
    user,
    nameMap
}: {
    expenses: Expense[];
    user: User;
    nameMap: Map<string, string>;
}) => {

    // SAFE DEFAULTS for empty / undefined Firebase data
    const safeExpenses: Expense[] = Array.isArray(expenses) ? expenses : [];
    const safeNameMap = nameMap instanceof Map ? nameMap : new Map();

    // -------------------- BALANCE CALCULATION --------------------
    const calculateBalances = () => {
        if (!safeExpenses.length) {
            return { totalOwedToUser: 0, totalUserOwes: 0, allBalances: [] };
        }

        const balances: { [email: string]: number } = {};

        safeExpenses.forEach(expense => {
            const splits = Array.isArray(expense.splits) ? expense.splits : [];
            const participants = Array.isArray(expense.participants) ? expense.participants : [];

            if (expense.paidBy === user.email) {
                splits.forEach(split => {
                    if (split.email !== user.email) {
                        balances[split.email] = (balances[split.email] || 0) + (split.amount || 0);
                    }
                });
            } else if (participants.includes(user.email)) {
                const userSplit = splits.find(s => s.email === user.email);
                if (userSplit) {
                    balances[expense.paidBy] =
                        (balances[expense.paidBy] || 0) - (userSplit.amount || 0);
                }
            }
        });

        const allBalances: FriendBalance[] = Object.entries(balances)
            .map(([email, balance]) => ({
                email,
                balance,
                name: safeNameMap.get(email) || email.split('@')[0],
            }))
            .filter(b => Math.abs(b.balance) > 0.01)
            .sort((a, b) => b.balance - a.balance);

        let totalOwedToUser = 0;
        let totalUserOwes = 0;

        allBalances.forEach(friend => {
            if (friend.balance > 0) totalOwedToUser += friend.balance;
            else totalUserOwes += Math.abs(friend.balance);
        });

        return { totalOwedToUser, totalUserOwes, allBalances };
    };

    const { totalOwedToUser, totalUserOwes, allBalances } = calculateBalances();

    // -------------------- MONTHLY EXPENSES --------------------
    const currentMonthExpenses = safeExpenses.filter(exp => {
        const expDate = exp.date ? new Date(exp.date) : null;
        if (!expDate) return false;

        const today = new Date();
        return (
            expDate.getMonth() === today.getMonth() &&
            expDate.getFullYear() === today.getFullYear()
        );
    });

    const totalSpentThisMonth = currentMonthExpenses.reduce((sum, exp) => {
        const splits = Array.isArray(exp.splits) ? exp.splits : [];
        const userSplitAmount = splits.find(s => s.email === user.email)?.amount || 0;

        if (exp.category === 'Settlement' && exp.paidBy !== user.email) {
            return sum - userSplitAmount;
        }

        return sum + userSplitAmount;
    }, 0);

    // -------------------- RENDER --------------------
    return (
        <div className="p-4 md:p-6 space-y-6">
            <header>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                    Welcome back, {user.name}!
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Here's your financial summary.
                </p>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard title="You Owe" amount={totalUserOwes} color="bg-rose-500" />
                <SummaryCard title="You are Owed" amount={totalOwedToUser} color="bg-emerald-500" />
                <SummaryCard title="Spent this Month" amount={totalSpentThisMonth} color="bg-sky-500" />
            </div>

            {/* Recent Transactions + Balances */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ---------------- Recent Transactions ---------------- */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Recent Transactions
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">

                            {safeExpenses.length === 0 ? (
                                <p className="p-6 text-center text-gray-500 dark:text-gray-400">
                                    No transactions yet
                                </p>
                            ) : (
                                safeExpenses.slice(0, 5).map(exp => {
                                    const splits = Array.isArray(exp.splits) ? exp.splits : [];
                                    const userSplitAmount =
                                        splits.find(s => s.email === user.email)?.amount || 0;

                                    const expDate = exp.date ? new Date(exp.date) : new Date();

                                    const isDebit =
                                        (exp.paidBy !== user.email &&
                                            userSplitAmount > 0 &&
                                            exp.category !== 'Settlement') ||
                                        (exp.paidBy === user.email &&
                                            exp.category === 'Settlement');

                                    const isCredit =
                                        exp.paidBy !== user.email &&
                                        exp.category === 'Settlement';

                                    const displayAmount =
                                        exp.category === 'Settlement' && exp.paidBy === user.email
                                            ? exp.amount
                                            : userSplitAmount;

                                    return (
                                        <div key={exp.id} className="p-4 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-800 dark:text-white">
                                                    {exp.reason || "No description"}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {exp.category || "Other"} &middot;{" "}
                                                    {expDate.toLocaleDateString()}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p
                                                    className={`font-bold ${
                                                        isCredit
                                                            ? "text-emerald-500"
                                                            : isDebit
                                                            ? "text-rose-500"
                                                            : "text-emerald-500"
                                                    }`}
                                                >
                                                    {isDebit ? "-" : isCredit ? "+" : ""}
                                                    {new Intl.NumberFormat("en-IN", {
                                                        style: "currency",
                                                        currency: "INR",
                                                    }).format(displayAmount || 0)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Paid by{" "}
                                                    {exp.paidBy === user.email
                                                        ? "you"
                                                        : safeNameMap.get(exp.paidBy) ||
                                                          exp.paidBy.split("@")[0]}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* ---------------- Balances ---------------- */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Your Balances
                    </h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {allBalances.length > 0 ? (
                                allBalances.slice(0, 5).map(friend => (
                                    <div
                                        key={friend.email}
                                        className="p-4 flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">
                                                {friend.name}
                                            </p>
                                            <p
                                                className={`text-sm ${
                                                    friend.balance > 0
                                                        ? "text-emerald-500"
                                                        : "text-rose-500"
                                                }`}
                                            >
                                                {friend.balance > 0 ? "Owes you" : "You owe"}
                                            </p>
                                        </div>

                                        <p
                                            className={`font-bold text-lg ${
                                                friend.balance > 0
                                                    ? "text-emerald-500"
                                                    : "text-rose-500"
                                            }`}
                                        >
                                            {new Intl.NumberFormat("en-IN", {
                                                style: "currency",
                                                currency: "INR",
                                            }).format(Math.abs(friend.balance))}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="p-6 text-center text-gray-500 dark:text-gray-400">
                                    All settled up!
                                </p>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;