"use client";

import { createClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function Auth() {
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);

    const handleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: window.location.origin + '/auth/callback' }
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.reload();
    };

    if (user) {
        return (
            <div className="flex items-center gap-4 mb-8">
            <img src={user.user_metadata.avatar_url} className="w-8 h-8 rounded-full border border-emerald-500" />
            <span className="text-sm text-slate-300">{user.user_metadata.full_name}</span>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white underline">Exit</button>
            </div>
        );
    }

    return (
        <button
        onClick={handleLogin}
        className="mb-8 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg border border-slate-700 transition-all flex items-center gap-2"
        >
        <img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 invert" />
        Sign in with GitHub to save history
        </button>
    );
}
