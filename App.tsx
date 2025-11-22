import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Transactions from "./components/Transactions";
import Debts from "./components/Debts";
import Profile from "./components/Profile";
import AddExpenseModal from "./components/AddExpenseModal";
import Spinner from "./components/Spinner";
import {
  DashboardIcon,
  TransactionsIcon,
  DebtsIcon,
  ProfileIcon,
  PlusIcon,
} from "./components/icons";

import { firestore } from "./services/firebaseService";
import { Expense, User } from "./types";
import Register from "./components/Register";

type Page = "dashboard" | "transactions" | "debts" | "profile";

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

const AppContent = () => {
  const { user } = useAuth();

  const [page, setPage] = useState<Page>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [nameMap, setNameMap] = useState<Map<string, string>>(new Map());
  const [authPage, setAuthPage] = useState<"login" | "register">("login");

  /** --------------------------
   * Fetch Expenses + User Names
   ---------------------------*/
  useEffect(() => {
    if (!user?.email) return;

    const fetchAll = async () => {
      setLoadingExpenses(true);

      const userExpenses = await firestore.getExpenses(user.email);
      setExpenses(userExpenses);

      // gather all emails to convert into names
      const emails = new Set<string>();
      userExpenses.forEach((e) => {
        emails.add(e.paidBy);
        e.participants.forEach((p) => emails.add(p));
      });

      if (emails.size > 0) {
        const users = await firestore.getUsersByEmails(Array.from(emails));
        const map = new Map<string, string>();

        users.forEach((u) => {
          if (u.name) map.set(u.email, u.name);
        });

        setNameMap(map);
      }

      setLoadingExpenses(false);
    };

    fetchAll();
  }, [user?.email]);

  /** -------------------------
   * Add New Expense
   --------------------------*/
  const handleAddExpense = (newExpense: Expense) => {
    // Fetch any new users not in nameMap
    const loadNewUsers = async () => {
      const newEmails = new Set<string>([
        newExpense.paidBy,
        ...newExpense.participants,
      ]);

      const missing = Array.from(newEmails).filter((e) => !nameMap.has(e));

      if (missing.length > 0) {
        const newUsers = await firestore.getUsersByEmails(missing);

        setNameMap((prev) => {
          const updated = new Map(prev);
          newUsers.forEach((u) => {
            if (u.name) updated.set(u.email, u.name);
          });
          return updated;
        });
      }
    };

    loadNewUsers();

    setExpenses((prev) =>
      [newExpense, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime())
    );
  };

  /** -------------------------
   * Not Logged In → Show Login
   --------------------------*/
  if (!user) {
    return authPage === "login" ? (
      <Login goRegister={() => setAuthPage("register")} />
    ) : (
      <Register goLogin={() => setAuthPage("login")} />
    );
  }

  /** -------------------------
   * User Logged In but Name Missing → Show Profile Setup
   --------------------------*/
  if (!user.name) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <Profile />
      </div>
    );
  }

  /** -------------------------
   * Render Pages
   --------------------------*/
  const renderPage = () => {
    if (loadingExpenses)
      return (
        <div className="flex justify-center items-center h-full pt-10">
          <Spinner />
        </div>
      );

    switch (page) {
      case "dashboard":
        return <Dashboard expenses={expenses} user={user} nameMap={nameMap} />;
      case "transactions":
        return (
          <Transactions expenses={expenses} user={user} nameMap={nameMap} />
        );
      case "debts":
        return (
          <Debts
            expenses={expenses}
            user={user}
            nameMap={nameMap}
            onAddExpense={handleAddExpense}
          />
        );
      case "profile":
        return <Profile />;
      default:
        return <Dashboard expenses={expenses} user={user} nameMap={nameMap} />;
    }
  };

  /** -------------------------
   * Navigation Button Component
   --------------------------*/
  const NavItem = ({
    pageName,
    label,
    icon,
  }: {
    pageName: Page;
    label: string;
    icon: React.ReactNode;
  }) => (
    <button
      onClick={() => setPage(pageName)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs sm:text-sm transition-colors ${
        page === pageName
          ? "text-primary"
          : "text-gray-500 dark:text-gray-400 hover:text-primary"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  /** -------------------------
   * Return UI
   --------------------------*/
  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-black text-gray-800 dark:text-gray-200">
      <main className="flex-1 overflow-y-auto pb-24">{renderPage()}</main>

      {isModalOpen && (
        <AddExpenseModal
          user={user}
          onClose={() => setIsModalOpen(false)}
          onAddExpense={handleAddExpense}
        />
      )}

      {/* Bottom Nav Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 shadow-lg">
        <div className="flex justify-around items-center h-16 max-w-4xl mx-auto">
          <NavItem
            pageName="dashboard"
            label="Dashboard"
            icon={<DashboardIcon className="w-6 h-6 mb-1" />}
          />
          <NavItem
            pageName="transactions"
            label="History"
            icon={<TransactionsIcon className="w-6 h-6 mb-1" />}
          />

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-16 h-16 -mt-8 rounded-xl 
             bg-primary 
             text-gray-700 dark:text-gray-100
             flex items-center justify-center 
             shadow-xl dark:shadow-white hover:scale-110 
             transition-transform"
          >
            <PlusIcon className="w-8 h-8" />
          </button>

          <NavItem
            pageName="debts"
            label="Debts"
            icon={<DebtsIcon className="w-6 h-6 mb-1" />}
          />
          <NavItem
            pageName="profile"
            label="Profile"
            icon={<ProfileIcon className="w-6 h-6 mb-1" />}
          />
        </div>
      </footer>
    </div>
  );
};

export default App;
