import React, { useState } from "react";
import { auth, firestore } from "../services/firebaseService";

const Register = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const exists = await firestore.checkUserExists(email);
      if (exists) {
        setError("Email already exists.");
        setLoading(false);
        return;
      }

      await auth.register(email, password, username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      setError("Google login failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg space-y-6">

        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Create an Account
        </h2>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <form className="space-y-4" onSubmit={handleRegister}>

          <input
            type="text"
            placeholder="Username"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email address"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            className="w-full px-3 py-2 rounded-md border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-600 disabled:bg-gray-400"
          >
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <div className="flex items-center justify-center">
          <button
            className="w-full mt-2 py-2 border rounded-md text-gray-700 dark:text-white dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={handleGoogle}
          >
            Continue with Google
          </button>
        </div>

      </div>
    </div>
  );
};

export default Register;