// ------------------------------
//  FIREBASE SERVICE
// ------------------------------
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
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
const googleProvider = new GoogleAuthProvider();

// ------------------------------
//  AUTH SERVICE
// ------------------------------
export const auth = {
  signInWithEmail: (email: string, password: string) => {
    return signInWithEmailAndPassword(authInstance, email, password);
  },

  register: async (email: string, password: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(authInstance, email, password);

    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      name: username,
      createdAt: Timestamp.now()
    });

    return cred;
  },

  // ⭐ Improved Google Auth: Creates user entry on first login
  signInWithGoogle: async () => {
    const result = await signInWithPopup(authInstance, googleProvider);
    const user = result.user;

    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      await setDoc(userRef, {
        email: user.email,
        name: user.displayName || "Google User",
        createdAt: Timestamp.now()
      });
    }

    return result;
  },

  signOut: () => firebaseSignOut(authInstance),

  // ⭐ Fixed: Clean mapping + prevents double profile reads
  onAuthStateChanged: (callback: (user: User | null) => void) => {
    return firebaseOnAuthStateChanged(authInstance, async (fbUser: FirebaseUser | null) => {
      if (!fbUser) {
        callback(null);
        return;
      }

      const snap = await getDoc(doc(db, "users", fbUser.uid));
      if (!snap.exists()) {
        callback(null);
        return;
      }

      callback({
        ...(snap.data() as User),
        uid: fbUser.uid
      });
    });
  }
};

// ------------------------------
//  FIRESTORE SERVICE
// ------------------------------
export const firestore = {
  getUserProfile: async (uid: string): Promise<User | null> => {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? { uid: uid, ...(snap.data() as User) } : null;
  },

  checkUsernameExists: async (name: string, currentUid?: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("name", "==", name));
    const snap = await getDocs(q);
    return snap.docs.some(doc => doc.id !== currentUid);
  },

  updateUserProfile: async (uid: string, data: Partial<User>) => {
    if (data.name) {
      const exists = await firestore.checkUsernameExists(data.name, uid);
      if (exists) throw new Error("Username already exists.");
    }
    return updateDoc(doc(db, "users", uid), data);
  },

  addExpense: async (expense: Omit<Expense, "id" | "date"> & { date: Date }): Promise<Expense> => {
    const dateValue = Timestamp.fromDate(expense.date);
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

    return snap.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Expense)
    }));
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
      .map(d => ({ id: d.id, ...(d.data() as User) }))
      .filter(u => !excludeEmails.includes(u.email));
  },

  getUsersByEmails: async (emails: string[]): Promise<User[]> => {
    if (!emails.length) return [];

    const results: User[] = [];

    for (const email of emails) {
      const q = query(collection(db, "users"), where("email", "==", email));
      const snap = await getDocs(q);
      snap.forEach(doc => results.push({ uid: doc.id, ...(doc.data() as User) }));
    }

    return results;
  },

  checkUserExists: async (email: string): Promise<boolean> => {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);
    return !snap.empty;
  }
};