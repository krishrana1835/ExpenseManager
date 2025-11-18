import React, { useState } from "react";
import { auth } from "../services/firebaseService";

const Login = ({ goRegister }: { goRegister: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await auth.signInWithEmail(email, password); // Your service
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    try {
      await auth.signInWithGoogle(); // Your service
    } catch (err) {
      setError("Google sign-in failed.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Welcome Back
        </h2>

        {error && <p className="text-center text-red-500 text-sm">{error}</p>}

        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email Address"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-primary-600 disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="flex items-center">
          <div className="grow border-t dark:border-gray-700"></div>
          <span className="px-3 text-gray-500 dark:text-gray-400 text-sm">
            OR
          </span>
          <div className="grow border-t dark:border-gray-700"></div>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          className="w-full py-2 border rounded-md text-gray-700 dark:text-white dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Continue with Google
        </button>

        {/* No react-router-dom → simple button */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <button
            onClick={goRegister}
            className="text-primary font-medium underline"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
