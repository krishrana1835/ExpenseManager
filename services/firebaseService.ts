// ------------------------------
//  REAL FIREBASE CONFIG
// ------------------------------
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    query,
    where,
    getDocs,
    collection,
    addDoc,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ------------------------------
//  INITIALIZE FIREBASE APP
// ------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCkYyGPUV-o35jvU3Xd0beu6unazO5IEZI",
  authDomain: "expensemanager-8e584.firebaseapp.com",
  projectId: "expensemanager-8e584",
  storageBucket: "expensemanager-8e584.firebasestorage.app",
  messagingSenderId: "168251130052",
  appId: "1:168251130052:web:67fd17425254796964c991",
  measurementId: "G-XXD15Q4E6B"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ------------------------------
//  AUTH SERVICE
// ------------------------------
export const authService = {
    // login with email + password
    signInWithEmail(email: string, password: string) {
        return signInWithEmailAndPassword(auth, email, password);
    },

    signOut() {
        return signOut(auth);
    },

    onAuthStateChanged(callback: (user: any | null) => void) {
        return onAuthStateChanged(auth, callback);
    }
};

// ------------------------------
//  USER PROFILE SERVICE
// ------------------------------
export const userService = {
    async getUserProfile(uid: string) {
        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        return snap.exists() ? snap.data() : null;
    },

    // Check if name already exists
    async checkUsernameExists(name: string, currentUid?: string) {
        const q = query(
            collection(db, "users"),
            where("name", "==", name)
        );
        const snap = await getDocs(q);
        return snap.docs.some(d => d.id !== currentUid);
    },

    async updateUserProfile(uid: string, data: any) {
        const ref = doc(db, "users", uid);
        return updateDoc(ref, data);
    }
};

// ------------------------------
//  EXPENSES SERVICE
// ------------------------------
export const expenseService = {

    // Add expense
    async addExpense(expense: any) {
        const ref = await addDoc(collection(db, "expenses"), {
            ...expense,
            date: Timestamp.fromDate(new Date(expense.date))
        });
        return { id: ref.id, ...expense };
    },

    // Get all expenses where user is a participant
    async getExpenses(userEmail: string) {
        const q = query(
            collection(db, "expenses"),
            where("participants", "array-contains", userEmail),
            orderBy("date", "desc")
        );

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};

// ------------------------------
//  USER SEARCH (NAME SEARCH)
// ------------------------------
export const searchService = {
    async searchUsersByName(queryStr: string, excludeEmails: string[]) {
        if (!queryStr) return [];

        const q = query(
            collection(db, "users"),
            where("name", ">=", queryStr),
            where("name", "<=", queryStr + "\uf8ff")
        );

        const snap = await getDocs(q);

        return snap.docs
            .map(d => d.data())
            .filter(u => !excludeEmails.includes(u.email));
    },

    async getUsersByEmails(emails: string[]) {
        if (!emails.length) return [];

        const users: any[] = [];
        for (let email of emails) {
            const q = query(collection(db, "users"), where("email", "==", email));
            const snap = await getDocs(q);
            snap.forEach(doc => users.push(doc.data()));
        }

        return users;
    }
};

