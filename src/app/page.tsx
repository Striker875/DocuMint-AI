"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase';
import Auth from '@/components/Auth';

const DAILY_LIMIT = 5; // Лимит генераций в день

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [usageCount, setUsageCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        fetchHistory(data.user.id);
        getTodayUsage(data.user.id);
      }
    };
    checkUser();
  }, []);

  const getTodayUsage = async (userId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
    .from('generations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', today.toISOString());

    if (!error) setUsageCount(count || 0);
  };

    const fetchHistory = async (userId: string) => {
      const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);

      if (!error && data) setHistory(data);
    };

      const handleGenerate = async () => {
        if (!user) return alert("Please sign in first!");
        if (usageCount >= DAILY_LIMIT) return alert("Daily limit reached! Support the project to get more.");
        if (!repoUrl) return alert("Enter GitHub URL!");

        setLoading(true);
        setResult("");

        try {
          const response = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repoUrl }),
          });

          const data = await response.json();

          if (data.markdown) {
            setResult(data.markdown);
            const { error } = await supabase.from('generations').insert({
              user_id: user.id,
              repo_url: repoUrl,
              markdown: data.markdown
            });

            if (!error) {
              fetchHistory(user.id);
              setUsageCount(prev => prev + 1);
            }
          } else {
            alert("Error: " + (data.error || "Failed"));
          }
        } catch (err) {
          alert("Request failed");
        } finally {
          setLoading(false);
        }
      };

      return (
        <main className="min-h-screen bg-slate-950 text-slate-50 flex flex-col items-center p-6 pt-12 relative overflow-x-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-4xl">
        <div className="flex justify-between items-center w-full mb-8">
        <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        {user ? `Used: ${usageCount}/${DAILY_LIMIT}` : "Beta Access"}
        </span>
        </div>
        <Auth />
        </div>

        <div className="text-center mb-12">
        <h1 className="text-6xl font-black tracking-tighter mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
        DocuMint AI
        </h1>
        <p className="text-slate-400 text-lg font-light italic">
        "Documentation is a love letter to your future self."
        </p>
        </div>

        {user && history.length > 0 && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-2 duration-700">
          <h3 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Recent Activity</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {history.map((item) => (
            <div key={item.id} onClick={() => { setResult(item.markdown); setRepoUrl(item.repo_url); }}
            className="p-3 bg-slate-900/40 border border-slate-800/50 rounded-lg hover:border-emerald-500/40 transition-all cursor-pointer group active:scale-95">
            <p className="text-[11px] text-slate-500 group-hover:text-emerald-400 truncate font-mono">
            {item.repo_url.replace("https://github.com/", "")}
            </p>
            </div>
          ))}
          </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-12">
        <input type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="https://github.com/username/repo"
        className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white backdrop-blur-sm"
        />
        <button onClick={handleGenerate} disabled={loading || (user && usageCount >= DAILY_LIMIT)}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg active:scale-95 min-w-[160px]">
        {loading ? "..." : (usageCount >= DAILY_LIMIT ? "Limit Reached" : "Generate")}
        </button>
        </div>

        {result && (
          <div className="mt-8 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-500">
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Output</span>
          <button onClick={() => { navigator.clipboard.writeText(result); alert("Copied!"); }}
          className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 px-4 rounded-lg border border-slate-700 transition-all">
          Copy
          </button>
          </div>
          <div className="p-8">
          <article className="prose prose-invert prose-emerald max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </article>
          </div>
          </div>
        )}

        {/* СЕКЦИЯ ДОНАТА */}
        <div className="mt-20 flex flex-col items-center border-t border-slate-900 pt-10">
        <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest">Support the development</p>
        <div className="flex gap-4">
        <a href="https://pay.cloudtips.ru/p/54c035d4" target="_blank" className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-emerald-500/50 px-4 py-2 rounded-full text-xs text-slate-300 transition-all">
        <span>☕ Support with CloudTips / Crypto</span>
        </a>
        </div>
        </div>
        </div>

        <footer className="mt-10 text-slate-800 text-[9px] font-mono pb-10 tracking-[0.5em] uppercase">
        DocuMint AI &copy; 2026 • Built on Arch Linux
        </footer>
        </main>
      );
}
