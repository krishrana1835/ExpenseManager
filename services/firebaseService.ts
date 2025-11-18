// ------------------------------
//  FIREBASE SERVICE (Real)
// ------------------------------
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { User, Expense } from "../types";

// ------------------------------
//  FIREBASE CONFIG
// ------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ------------------------------
//  INITIALIZE APP
// ------------------------------
const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);
const db = getFirestore(app);

// ------------------------------
//  AUTH SERVICE
// ------------------------------
export const auth = {
  signInWithEmail: (email: string, password: string) => {
    return signInWithEmailAndPassword(authInstance, email, password);
  },

  register: async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(authInstance, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      name: "",
      createdAt: Timestamp.now()
    });
    return cred;
  },

  signOut: () => firebaseSignOut(authInstance),

  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(authInstance, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        const userProfile = await firestore.getUserProfile(fbUser.uid);
        callback(userProfile);
      } else {
        callback(null);
      }
    });
  }
};

// ------------------------------
//  FIRESTORE SERVICE
// ------------------------------
export const firestore = {
  getUserProfile: async (uid: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as User) : null;
  },

  checkUsernameExists: async (name: string, currentUid?: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("name", "==", name));
    const snap = await getDocs(q);
    return snap.docs.some(d => d.id !== currentUid);
  },

  updateUserProfile: async (uid: string, data: Partial<User>) => {
    const usernameExists = data.name ? await firestore.checkUsernameExists(data.name, uid) : false;
    if (usernameExists) throw new Error("Username already exists.");
    return updateDoc(doc(db, "users", uid), data);
  },

  addExpense: async (expense: Omit<Expense, "id" | "date"> & { date: Date }): Promise<Expense> => {
    const dateValue = expense.date instanceof Date ? Timestamp.fromDate(expense.date) : Timestamp.fromDate(new Date(expense.date));
    const ref = await addDoc(collection(db, "expenses"), { ...expense, date: dateValue });
    return { id: ref.id, ...expense };
  },

  getExpenses: async (userEmail: string): Promise<Expense[]> => {
    const q = query(
      collection(db, "expenses"),
      where("participants", "array-contains", userEmail),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Expense) }));
  },

  searchUsersByName: async (text: string, excludeEmails: string[]): Promise<User[]> => {
    if (!text) return [];
    const q = query(
      collection(db, "users"),
      where("name", ">=", text),
      where("name", "<=", text + "\uf8ff")
    );
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data() as User)
      .filter(u => !excludeEmails.includes(u.email));
  },

  getUsersByEmails: async (emails: string[]): Promise<User[]> => {
    if (!emails.length) return [];
    const results: User[] = [];
    for (const email of emails) {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      snap.forEach(doc => results.push(doc.data() as User));
    }
    return results;
  },

  checkUserExists: async (email: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    return !snap.empty;
  }
};