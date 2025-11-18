import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { firestore, auth } from '../services/firebaseService';

const Profile = () => {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name) return;
        setLoading(true);
        setMessage('');
        setError('');
        try {
            await firestore.updateUserProfile(user.uid, { name });
            setMessage('Profile updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await auth.signOut();
    };

    if (!user) return null;

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Profile</h1>
            <div className="max-w-md bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md">
                {!user.name && (
                    <div className="mb-6 bg-primary-100 dark:bg-primary-900/50 border-l-4 border-primary text-primary-800 dark:text-primary-200 p-4" role="alert">
                    <p className="font-bold">Welcome!</p>
                    <p>Please set your unique username to continue.</p>
                    </div>
                )}
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                        <p className="mt-1 text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary text-gray-900 dark:text-white"
                            required
                        />
                    </div>
                    {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="flex items-center justify-between pt-2">
                         <button
                            type="submit"
                            disabled={loading || !name}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
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
