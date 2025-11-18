
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
  date: Date;
  paidBy: string; // user email
  participants: string[]; // array of user emails
  splits: Split[];
}

export interface FriendBalance {
    email: string;
    name: string;
    balance: number; // > 0 means they owe user, < 0 means user owes them
}
