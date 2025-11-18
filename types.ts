import { Timestamp } from "firebase/firestore";
export interface User {
  uid: string;
  email: string;
  name?: string;
}

export interface Split {
  email: string;
  amount: number;
}

export interface Expense {
  id: string;
  amount: number;
  reason: string;
  category: string;
  date: Date | Timestamp | string;
  paidBy: string;
  participants: string[];
  splits: Split[];
}

export interface FriendBalance {
    email: string;
    name: string;
    balance: number; // > 0 means they owe user, < 0 means user owes them
}
