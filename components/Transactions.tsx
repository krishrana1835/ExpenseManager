import React, { useState, useMemo } from 'react';
import { Expense, User } from '../types';
import { CalendarIcon, ChevronDownIcon } from './icons';
import { Timestamp } from "firebase/firestore";

// Fallback for window.Motion (framer-motion optional)
const Motion = (window as any).Motion || {};
const AnimatePresence = Motion.AnimatePresence || (({ children }: any) => <>{children}</>);
const motion = Motion.motion;
const MotionDiv = motion
    ? motion.div
    : ({ children, ...props }: any) => <div {...props}>{children}</div>;

type FilterType = 'all' | 'today' | 'yesterday' | 'month' | 'custom';

const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const Transactions = ({
    expenses,
    user,
    nameMap
}: {
    expenses: Expense[];
    user: User;
    nameMap: Map<string, string>;
}) => {
    const [filter, setFilter] = useState<FilterType>('month');
    const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Ensure every expense has a real Date object
    const cleanExpenses = useMemo(
      () =>
        expenses.map((e) => {
          let convertedDate: Date;

          if (e.date instanceof Date) {
            convertedDate = e.date;
          } else if (e.date instanceof Timestamp) {
            convertedDate = e.date.toDate();
          } else {
            convertedDate = new Date(e.date);
          }

          return {
            ...e,
            date: convertedDate,
          };
        }),
      [expenses]
    );

    const filteredExpenses = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

        switch (filter) {
            case 'today':
                return cleanExpenses.filter((e) => isSameDay(e.date, today));
            case 'yesterday':
                return cleanExpenses.filter((e) => isSameDay(e.date, yesterday));
            case 'month':
                return cleanExpenses.filter(
                    (e) =>
                        e.date.getMonth() === now.getMonth() &&
                        e.date.getFullYear() === now.getFullYear()
                );
            case 'custom':
                const selectedDate = new Date(customDate);
                selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());
                return cleanExpenses.filter((e) => isSameDay(e.date, selectedDate));
            default:
                return cleanExpenses;
        }
    }, [cleanExpenses, filter, customDate]);

    const FilterButton = ({
        type,
        label
    }: {
        type: FilterType;
        label: string;
    }) => (
        <button
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                filter === type
                    ? 'bg-primary text-black dark:text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="p-4 md:p-6 space-y-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Transactions</h1>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <FilterButton type="month" label="This Month" />
                <FilterButton type="today" label="Today" />
                <FilterButton type="yesterday" label="Yesterday" />
                <FilterButton type="all" label="All Time" />

                <div className="relative">
                    <input
                        type="date"
                        value={customDate}
                        onChange={(e) => {
                            setCustomDate(e.target.value);
                            setFilter('custom');
                        }}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full pl-10 pr-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <CalendarIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                </div>
            </div>

            {/* Expense List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredExpenses.length > 0 ? (
                        filteredExpenses.map((exp) => {
                            const userSplit =
                                exp.splits.find((s) => s.email === user.email)?.amount || 0;

                            const isExpanded = expandedId === exp.id;

                            // Handle both "Settlement" and "Transfer"
                            const isTransfer = exp.category === 'Settlement' || exp.category === 'Transfer';

                            const isDebit =
                                (exp.paidBy !== user.email && userSplit > 0 && !isTransfer) ||
                                (exp.paidBy === user.email && isTransfer);

                            const isCredit =
                                exp.paidBy !== user.email && isTransfer;

                            const displayAmount =
                                isTransfer && exp.paidBy === user.email
                                    ? exp.amount
                                    : userSplit;

                            return (
                                <div key={exp.id}>
                                    <div
                                        onClick={() =>
                                            setExpandedId(isExpanded ? null : exp.id)
                                        }
                                        className="p-4 flex justify-between items-center cursor-pointer"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800 dark:text-white">
                                                {exp.reason}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {exp.date.toLocaleDateString()} •{' '}
                                                {exp.category}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                Paid by{' '}
                                                {exp.paidBy === user.email
                                                    ? 'you'
                                                    : nameMap.get(exp.paidBy) ||
                                                    exp.paidBy.split('@')[0]}
                                            </p>
                                        </div>

                                        <div className="text-right flex items-center gap-4">
                                            <div>
                                                <p
                                                    className={`font-bold text-lg ${
                                                        isCredit
                                                            ? 'text-emerald-500'
                                                            : isDebit
                                                                ? 'text-rose-500'
                                                                : "text-gray-500 dark:text-gray-300"
                                                    }`}
                                                >
                                                    {isDebit ? '-' : isCredit ? '+' : ''}
                                                    {new Intl.NumberFormat('en-IN', {
                                                        style: 'currency',
                                                        currency: 'INR'
                                                    }).format(displayAmount || 0)}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Total:{' '}
                                                    {new Intl.NumberFormat('en-IN', {
                                                        style: 'currency',
                                                        currency: 'INR'
                                                    }).format(exp.amount)}
                                                </p>
                                            </div>

                                            <ChevronDownIcon
                                                className={`w-5 h-5 text-gray-400 transition-transform ${
                                                    isExpanded ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded Section */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <MotionDiv
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{
                                                    duration: 0.3,
                                                    ease: 'easeInOut'
                                                }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                                                        Split Details:
                                                    </h4>

                                                    <ul className="space-y-1 text-sm">
                                                        {exp.splits.map((split) => (
                                                            <li
                                                                key={split.email}
                                                                className="flex justify-between text-gray-600 dark:text-gray-400"
                                                            >
                                                                <span>
                                                                    {nameMap.get(
                                                                        split.email
                                                                    ) ||
                                                                        split.email.split('@')[0]}
                                                                    :
                                                                </span>
                                                                <span>
                                                                    {new Intl.NumberFormat(
                                                                        'en-IN',
                                                                        {
                                                                            style: 'currency',
                                                                            currency: 'INR'
                                                                        }
                                                                    ).format(
                                                                        split.amount
                                                                    )}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </MotionDiv>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })
                    ) : (
                        <p className="p-8 text-center text-gray-500 dark:text-gray-400">
                            No transactions found for this period.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Transactions;