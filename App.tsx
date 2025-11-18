import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Debts from './components/Debts';
import Profile from './components/Profile';
import AddExpenseModal from './components/AddExpenseModal';
import Spinner from './components/Spinner';
import { DashboardIcon, TransactionsIcon, DebtsIcon, ProfileIcon, PlusIcon } from './components/icons';
import { firestore } from './services/firebaseService';
import { Expense, User } from './types';

type Page = 'dashboard' | 'transactions' | 'debts' | 'profile';

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());


  useEffect(() => {
    if (!user?.email) return;

    const fetchExpensesAndUsers = async () => {
        setLoadingExpenses(true);
        const userExpenses = await firestore.getExpenses(user.email);
        setExpenses(userExpenses);

        if (userExpenses.length > 0) {
            const allEmails = new Set<string>();
            userExpenses.forEach(exp => {
                allEmails.add(exp.paidBy);
                exp.participants.forEach(p => allEmails.add(p));
            });
            const users = await firestore.getUsersByEmails(Array.from(allEmails));
            const newNameMap = new Map<string, string>();
            users.forEach(u => {
                if(u.name) newNameMap.set(u.email, u.name);
            });
            setNameMap(newNameMap);
        }
        setLoadingExpenses(false);
    };
    
    fetchExpensesAndUsers();
    
  }, [user?.email]);

  const handleAddExpense = (newExpense: Expense) => {
    // A bit inefficient to re-fetch all users, but fine for this mock app
    const fetchNewUsers = async () => {
        const newEmails = new Set<string>([newExpense.paidBy, ...newExpense.participants]);
        const emailsToFetch = Array.from(newEmails).filter(email => !nameMap.has(email));
        if (emailsToFetch.length > 0) {
            const newUsers = await firestore.getUsersByEmails(emailsToFetch);
            setNameMap(prevMap => {
                const updatedMap = new Map(prevMap);
                newUsers.forEach(u => {
                    if (u.name) updatedMap.set(u.email, u.name);
                });
                return updatedMap;
            });
        }
    }
    fetchNewUsers();
    setExpenses(prev => [newExpense, ...prev].sort((a,b) => b.date.getTime() - a.date.getTime()));
  };

  if (!user) {
    return <Login />;
  }

  if (!user.name) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Profile />
      </div>
    );
  }

  const renderPage = () => {
    if (loadingExpenses) {
        return <div className="flex justify-center items-center h-full pt-10"><Spinner/></div>
    }
    switch (page) {
      case 'dashboard':
        return <Dashboard expenses={expenses} user={user} nameMap={nameMap} />;
      case 'transactions':
        return <Transactions expenses={expenses} user={user} nameMap={nameMap} />;
      case 'debts':
        return <Debts expenses={expenses} user={user} nameMap={nameMap} onAddExpense={handleAddExpense} />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard expenses={expenses} user={user} nameMap={nameMap}/>;
    }
  };

  const NavItem = ({ pageName, label, icon }: { pageName: Page, label: string, icon: React.ReactNode }) => (
    <button onClick={() => setPage(pageName)} className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs sm:text-sm transition-colors duration-200 ${page === pageName ? 'text-primary' : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary-300'}`}>
        {icon}
        <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <main className="flex-1 overflow-y-auto pb-24">
        {renderPage()}
      </main>
      
      {/* Fix: Corrected typo from setIsModalОpen to setIsModalOpen */}
      {isModalOpen && <AddExpenseModal user={user} onClose={() => setIsModalOpen(false)} onAddExpense={handleAddExpense} />}

      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
            <NavItem pageName="dashboard" label="Dashboard" icon={<DashboardIcon className="w-6 h-6 mb-1"/>} />
            <NavItem pageName="transactions" label="History" icon={<TransactionsIcon className="w-6 h-6 mb-1"/>} />
            
            <button onClick={() => setIsModalOpen(true)} className="w-16 h-16 -mt-8 bg-primary rounded-full text-white flex items-center justify-center shadow-lg hover:bg-primary-600 transition-transform transform hover:scale-110">
                <PlusIcon className="w-8 h-8"/>
            </button>
            
            <NavItem pageName="debts" label="Debts" icon={<DebtsIcon className="w-6 h-6 mb-1"/>} />
            <NavItem pageName="profile" label="Profile" icon={<ProfileIcon className="w-6 h-6 mb-1"/>} />
        </div>
      </footer>
    </div>
  );
};


export default App;