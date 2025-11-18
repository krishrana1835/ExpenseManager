import { User, Expense, Split } from '../types';

// --- MOCK DATABASE ---
let mockUsers: User[] = [
    { uid: '1', email: 'test@example.com', name: 'Test User' },
    { uid: '2', email: 'friend1@example.com', name: 'Friend One' },
    { uid: '3', email: 'friend2@example.com', name: 'Friend Two' },
    { uid: '4', email: 'charlie@example.com', name: 'Charlie Day' },
    { uid: '5', email: 'dennis@example.com', name: 'Dennis Reynolds' },
    { uid: '6', email: 'dee@example.com', name: 'Dee Reynolds' },
];

let mockExpenses: Expense[] = [
    {
        id: 'exp2', amount: 150, reason: 'Coffee', category: 'Food', date: new Date(), paidBy: 'friend1@example.com', participants: ['test@example.com', 'friend1@example.com'], splits: [{ email: 'test@example.com', amount: 75 }, { email: 'friend1@example.com', amount: 75 }]
    },
    {
        id: 'exp1', amount: 1000, reason: 'Dinner', category: 'Food', date: new Date(new Date().setDate(new Date().getDate() - 1)), paidBy: 'test@example.com', participants: ['test@example.com', 'friend1@example.com'], splits: [{ email: 'test@example.com', amount: 500 }, { email: 'friend1@example.com', amount: 500 }]
    },
    {
        id: 'exp5',
        amount: 200,
        reason: 'Settlement to Friend Two',
        category: 'Settlement',
        date: new Date(new Date().setDate(new Date().getDate() - 2)),
        paidBy: 'test@example.com',
        participants: ['test@example.com', 'friend2@example.com'],
        splits: [{ email: 'friend2@example.com', amount: 200 }, { email: 'test@example.com', amount: 0 }]
    },
    {
        id: 'exp4',
        amount: 1200,
        reason: 'Utility Bill',
        category: 'Bills',
        date: new Date(new Date().setDate(new Date().getDate() - 3)),
        paidBy: 'friend2@example.com',
        participants: ['test@example.com', 'friend2@example.com'],
        splits: [{ email: 'test@example.com', amount: 600 }, { email: 'friend2@example.com', amount: 600 }]
    },
    {
        id: 'exp3', amount: 3000, reason: 'Movie Tickets', category: 'Entertainment', date: new Date(new Date().setMonth(new Date().getMonth() - 1)), paidBy: 'test@example.com', participants: ['test@example.com', 'friend1@example.com', 'friend2@example.com'], splits: [{ email: 'test@example.com', amount: 1000 }, { email: 'friend1@example.com', amount: 1000 }, { email: 'friend2@example.com', amount: 1000 }]
    },
];

let currentUser: User | null = null;
let authListeners: ((user: User | null) => void)[] = [];

const findUserByEmail = (email: string) => mockUsers.find(u => u.email === email);

// --- MOCK AUTH SERVICE ---
export const auth = {
    signInWithEmail: (email: string): Promise<{ user: User }> => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = findUserByEmail(email);
                if (user) {
                    currentUser = user;
                    authListeners.forEach(listener => listener(currentUser));
                    resolve({ user });
                } else {
                    // Create a new user if they don't exist in the mock DB for login flexibility
                    const newUser = { uid: `${Date.now()}`, email, name: '' };
                    mockUsers.push(newUser);
                    currentUser = newUser;
                    authListeners.forEach(listener => listener(currentUser));
                    resolve({ user: newUser });
                }
            }, 500);
        });
    },
    signOut: (): Promise<void> => {
        return new Promise(resolve => {
            setTimeout(() => {
                currentUser = null;
                authListeners.forEach(listener => listener(null));
                resolve();
            }, 300);
        });
    },
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        authListeners.push(callback);
        // Immediately call with current state
        callback(currentUser);
        // Return an unsubscribe function
        return () => {
            authListeners = authListeners.filter(listener => listener !== callback);
        };
    }
};

// --- MOCK FIRESTORE SERVICE ---
export const firestore = {
    getUserProfile: (uid: string): Promise<User | null> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const user = mockUsers.find(u => u.uid === uid);
                resolve(user || null);
            }, 300);
        });
    },
    checkUsernameExists: (name: string, currentUid?: string): Promise<boolean> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const user = mockUsers.find(u => u.name?.toLowerCase() === name.toLowerCase() && u.uid !== currentUid);
                resolve(!!user);
            }, 200);
        });
    },
    updateUserProfile: async (uid: string, data: { name: string }): Promise<void> => {
        const nameExists = await firestore.checkUsernameExists(data.name, uid);
        if (nameExists) {
            return Promise.reject(new Error('Username is already taken.'));
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                mockUsers = mockUsers.map(u => u.uid === uid ? { ...u, ...data } : u);
                if (currentUser?.uid === uid) {
                    currentUser = { ...currentUser, ...data };
                    authListeners.forEach(listener => listener(currentUser));
                }
                resolve();
            }, 300);
        });
    },
    addExpense: (expenseData: Omit<Expense, 'id' | 'date'> & {date: Date}): Promise<Expense> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const newExpense: Expense = {
                    ...expenseData,
                    id: `exp${Date.now()}`,
                    date: expenseData.date,
                };
                mockExpenses.unshift(newExpense);
                resolve(newExpense);
            }, 500);
        });
    },
    getExpenses: (userEmail: string): Promise<Expense[]> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const userExpenses = mockExpenses
                    .filter(exp => exp.participants.includes(userEmail))
                    .sort((a, b) => b.date.getTime() - a.date.getTime());
                resolve(userExpenses);
            }, 700);
        });
    },
    checkUserExists: (email: string): Promise<boolean> => {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(mockUsers.some(u => u.email === email));
            }, 200);
        });
    },
    searchUsersByName: (query: string, excludeEmails: string[]): Promise<User[]> => {
        return new Promise(resolve => {
            setTimeout(() => {
                if (!query) {
                    resolve([]);
                    return;
                }
                const lowerCaseQuery = query.toLowerCase();
                const results = mockUsers.filter(u => 
                    u.name &&
                    !excludeEmails.includes(u.email) && 
                    u.name.toLowerCase().includes(lowerCaseQuery)
                );
                resolve(results);
            }, 250);
        });
    },
    getUsersByEmails: (emails: string[]): Promise<User[]> => {
        return new Promise(resolve => {
            setTimeout(() => {
                const emailSet = new Set(emails);
                const users = mockUsers.filter(u => emailSet.has(u.email));
                resolve(users);
            }, 300);
        });
    },
};