import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { firestore, auth } from "../services/firebaseService";

const Profile = () => {
    const { user } = useAuth();

    // Safe default values
    const userName = user?.name ?? "";
    const userEmail = user?.email ?? "";
    const userId = user?.uid ?? "";

    const [name, setName] = useState(userName);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId || !name.trim()) {
            setError("Invalid profile data.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            // Safe update
            await firestore.updateUserProfile(userId, { name: name.trim() });

            setMessage("Profile updated successfully!");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to update profile."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    // If user not loaded
    if (!user) {
        return (
            <div className="p-6 text-center text-gray-600 dark:text-gray-300">
                Loading profile...
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                Profile
            </h1>

            <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">

                {/* Show required name alert for Google signup users */}
                {!userName && (
                    <div className="mb-6 bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-600 text-blue-800 dark:text-blue-300 p-4 rounded">
                        <p className="font-bold">Welcome!</p>
                        <p>Please set your username to continue.</p>
                    </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    
                    {/* Email Display */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <p className="mt-1 text-gray-500 dark:text-gray-400 break-all">
                            {userEmail}
                        </p>
                    </div>

                    {/* Username Input */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                            Username
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                            required
                        />
                    </div>

                    {/* Success + Error Messages */}
                    {message && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                            {message}
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}

                    {/* Buttons */}
                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="submit"
                            disabled={loading || !name.trim()}
                            className="inline-flex justify-center py-2 px-4 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? "Saving..." : "Save Changes"}
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
                        >
                            Logout
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default Profile;